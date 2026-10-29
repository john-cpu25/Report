import { getISOWeek, subDays, startOfDay, endOfDay, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export function calculateHologramMetrics({
  timeRange = 'WEEK',
  selectedTeam = 'ALL',
  users = [],
  tasks = [],
  projects = [],
  leaves = [],
  timesheetRecords = []
}) {
  const now = new Date();

  // Determine date boundaries & capacity multiplier based on timeRange
  let rangeStart;
  let rangeEnd = now;
  let capacityMultiplier = 1;

  if (timeRange === 'WEEK') {
    rangeStart = startOfWeek(now, { weekStartsOn: 1 });
    rangeEnd = endOfWeek(now, { weekStartsOn: 1 });
    capacityMultiplier = 1;
  } else if (timeRange === 'MONTH') {
    rangeStart = startOfMonth(now);
    rangeEnd = endOfMonth(now);
    capacityMultiplier = 4.33;
  } else if (timeRange === 'YEAR') {
    rangeStart = new Date(now.getFullYear(), 0, 1);
    rangeEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    capacityMultiplier = 52;
  } else {
    rangeStart = subDays(now, 7);
    capacityMultiplier = 1;
  }

  // Map users to normalized team key
  const getMappedTeam = (rawTeam) => {
    const t = (rawTeam || '').toUpperCase();
    if (t.includes('MODEL')) return 'MODELLING';
    if (t.includes('PT') || t.includes('REO')) return 'PT&REO';
    if (t.includes('SLAB') || t.includes('ENGINEER')) return 'ENGINEER';
    if (t.includes('ETABS') || t.includes('LATERAL')) return 'ETABS';
    return 'ALL';
  };

  const userMap = new Map();
  users.forEach(u => {
    userMap.set(u.id, {
      id: u.id,
      name: u.name,
      team: getMappedTeam(u.team),
      rawTeam: u.team
    });
  });

  // Project map
  const projMap = new Map();
  projects.forEach(p => {
    const key = (p.key || p.code || p.name || '').trim();
    const pObj = {
      id: p.id,
      name: p.name || key,
      key: key.toUpperCase(),
      color: p.color || '#6366f1'
    };
    if (p.id) projMap.set(p.id, pObj);
    if (p.key) projMap.set(p.key.toUpperCase().trim(), pObj);
    if (p.name) projMap.set(p.name.toUpperCase().trim(), pObj);
  });

  // Target team members
  const isAustralia = (u) => {
    const loc = (u?.location || '').toString().toLowerCase();
    return loc.includes('aus') || loc.includes('australia');
  };

  const isManager = (u) => {
    const t = (u?.team || '').toString().toUpperCase();
    return t.includes('MANAGER') || t.includes('MANAGEMENT');
  };

  const targetTeamNorm = selectedTeam === 'ALL' ? 'ALL' : getMappedTeam(selectedTeam);

  const activeStaff = users.filter(u => {
    if (isAustralia(u)) return false;
    if (isManager(u)) return false;
    const staffTeam = getMappedTeam(u.team);
    if (targetTeamNorm !== 'ALL' && staffTeam !== targetTeamNorm) return false;
    return true;
  });

  const activeStaffIds = new Set(activeStaff.map(u => u.id));
  const totalCap = Math.max(1, activeStaff.length * capacityMultiplier * 40);

  // Helper to get or create project entry for breakdown
  const projectStatsMap = new Map();
  const getOrCreateProject = (projId, fallbackName = 'Unknown') => {
    const pObj = projMap.get(projId) || 
                 (fallbackName ? projMap.get(String(fallbackName).toUpperCase().trim()) : null) || 
                 (projId ? projMap.get(String(projId).toUpperCase().trim()) : null);
    const finalId = pObj?.id || projId;
    if (!projectStatsMap.has(finalId)) {
      const name = pObj?.name || fallbackName || 'Unknown Project';
      const key = pObj?.key || String(fallbackName || name).toUpperCase().trim();
      const color = pObj?.color || '#6366f1';
      projectStatsMap.set(finalId, {
        id: finalId,
        name,
        key,
        color,
        listHours: 0,
        timesheetHours: 0
      });
    }
    return projectStatsMap.get(finalId);
  };

  // ─────────────────────────────────────────────────────────────
  // 1. COMPUTE HOURS FROM PERSONAL \ TIME SHEET (APEX_TimeSheet)
  // ─────────────────────────────────────────────────────────────
  let timesheetProjectHours = 0;
  let avgTimesheetFin = 0;
  let avgTimesheetWf = 0;
  let hasTimesheetData = false;

  const tsUserHours = {};
  activeStaff.forEach(u => {
    tsUserHours[u.id] = { projectHoursOnly: 0, apexHours: 0, leaveHours: 0 };
  });

  if (timesheetRecords && timesheetRecords.length > 0) {
    const targetWk = getISOWeek(now);
    const targetYr = now.getFullYear();

    const filteredRecords = timesheetRecords.filter(r => {
      const w = Number(r.week);
      const y = Number(r.year);
      if (y && y !== targetYr) return false;
      if (timeRange === 'WEEK') return w === targetWk;
      if (timeRange === 'MONTH') {
        const m = Math.floor((w - 1) / 4.33);
        return m === now.getMonth();
      }
      return true; // YEAR
    });

    filteredRecords.forEach(r => {
      if (!activeStaffIds.has(r.user_id)) return;
      const sum = (Number(r.mon) || 0) + (Number(r.tue) || 0) + (Number(r.wed) || 0) +
                  (Number(r.thu) || 0) + (Number(r.fri) || 0) + (Number(r.sat) || 0) + (Number(r.sun) || 0);
      if (sum <= 0) return;

      const pKey = projMap.get(r.project_id)?.key || '';
      if (!tsUserHours[r.user_id]) {
        tsUserHours[r.user_id] = { projectHoursOnly: 0, apexHours: 0, leaveHours: 0 };
      }

      // Record for Project breakdown
      const pEntry = getOrCreateProject(r.project_id, projMap.get(r.project_id)?.name);
      pEntry.timesheetHours += sum;

      if (pKey === 'APEX' || pKey.includes('APEX MANAGEMENT')) {
        tsUserHours[r.user_id].apexHours += sum;
      } else if (pKey.includes('ANNUAL LEAVE') || pKey.includes('LEAVE')) {
        tsUserHours[r.user_id].leaveHours += sum;
      } else {
        tsUserHours[r.user_id].projectHoursOnly += sum;
        timesheetProjectHours += sum;
      }
    });

    if (filteredRecords.length > 0 && timesheetProjectHours > 0) {
      hasTimesheetData = true;
      const financialList = [];
      const workforceList = [];

      Object.values(tsUserHours).forEach(u => {
        const workingDays = Math.max(0, (5 * capacityMultiplier) - (u.leaveHours / 8));
        const finCap = workingDays * 8;
        const fin = finCap > 0 ? (u.projectHoursOnly / finCap) * 100 : 0;
        financialList.push(fin);

        const wfHours = u.projectHoursOnly + u.apexHours + u.leaveHours;
        const wfCap = capacityMultiplier * 40;
        const wf = wfCap > 0 ? (wfHours / wfCap) * 100 : 0;
        workforceList.push(wf);
      });

      avgTimesheetFin = financialList.length > 0 ? financialList.reduce((a, b) => a + b, 0) / financialList.length : 0;
      avgTimesheetWf = workforceList.length > 0 ? workforceList.reduce((a, b) => a + b, 0) / workforceList.length : 0;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. COMPUTE HOURS FROM PERSONAL \ LIST (APEX_Task)
  // ─────────────────────────────────────────────────────────────
  let intervalTasks = tasks.filter(t => {
    if (!activeStaffIds.has(t.user_id || t.assigned_to_id)) return false;
    const d = new Date(t.planned_start || t.date_start || t.created_at);
    if (isNaN(d.getTime())) return false;
    return isWithinInterval(d, { start: rangeStart, end: rangeEnd });
  });

  // If in a future test period without tasks, adapt to latest active tasks in the year
  if (intervalTasks.length === 0 && tasks.length > 0) {
    const staffTasks = tasks.filter(t => activeStaffIds.has(t.user_id || t.assigned_to_id));
    if (staffTasks.length > 0) {
      const dates = staffTasks.map(t => new Date(t.planned_start || t.date_start || t.created_at).getTime()).filter(t => !isNaN(t)).sort((a,b) => b - a);
      const latestTime = dates[0] || now.getTime();
      const latestDate = new Date(latestTime);

      let altStart;
      let altEnd = latestDate;
      if (timeRange === 'WEEK') {
        altStart = subDays(latestDate, 7);
      } else if (timeRange === 'MONTH') {
        altStart = subDays(latestDate, 30);
      } else {
        altStart = new Date(latestDate.getFullYear(), 0, 1);
      }

      intervalTasks = staffTasks.filter(t => {
        const d = new Date(t.planned_start || t.date_start || t.created_at);
        return isWithinInterval(d, { start: altStart, end: altEnd });
      });
    }
  }

  const listUserHours = {};
  activeStaff.forEach(u => {
    listUserHours[u.id] = { projectHoursOnly: 0, apexHours: 0, leaveHours: 0 };
  });

  let listProjectHours = 0;
  intervalTasks.forEach(t => {
    const uId = t.user_id || t.assigned_to_id;
    if (!listUserHours[uId]) listUserHours[uId] = { projectHoursOnly: 0, apexHours: 0, leaveHours: 0 };

    const h = Number(t.hours_complete) || Number(t.hours_planned) || 0;
    const pKey = projMap.get(t.project_id)?.key || '';

    // Record for Project breakdown
    if (h > 0) {
      const projId = t.project_id || t.name?.split(':')[0]?.trim() || 'UNASSIGNED';
      const fallbackName = t.project_name || t.name?.split(':')[0]?.trim() || 'Unassigned';
      const pEntry = getOrCreateProject(projId, fallbackName);
      pEntry.listHours += h;
    }

    if (pKey === 'APEX' || pKey.includes('APEX MANAGEMENT')) {
      listUserHours[uId].apexHours += h;
    } else if (pKey.includes('ANNUAL LEAVE') || pKey.includes('LEAVE')) {
      listUserHours[uId].leaveHours += h;
    } else {
      listUserHours[uId].projectHoursOnly += h;
      listProjectHours += h;
    }
  });

  // Add leaves from leaves table if available
  leaves.forEach(l => {
    const uId = l.create_by || l.user_id;
    if (!listUserHours[uId]) return;
    try {
      const leaveList = JSON.parse(l.leave_list || '[]');
      leaveList.forEach(range => {
        const s = new Date(range.LeaveStart);
        const e = new Date(range.LeaveEnd);
        if (s <= rangeEnd && e >= rangeStart) {
          listUserHours[uId].leaveHours += 8; // 1 day leave
          if (tsUserHours[uId]) tsUserHours[uId].leaveHours += 8;
        }
      });
    } catch (e) {}
  });

  const listFinancialList = [];
  const listWorkforceList = [];

  Object.values(listUserHours).forEach(u => {
    const workingDays = Math.max(0, (5 * capacityMultiplier) - (u.leaveHours / 8));
    const finCap = workingDays * 8;
    const fin = finCap > 0 ? (u.projectHoursOnly / finCap) * 100 : 0;
    listFinancialList.push(fin);

    const wfHours = u.projectHoursOnly + u.apexHours + u.leaveHours;
    const wfCap = capacityMultiplier * 40;
    const wf = wfCap > 0 ? (wfHours / wfCap) * 100 : 0;
    listWorkforceList.push(wf);
  });

  const avgListFin = listFinancialList.length > 0 ? listFinancialList.reduce((a, b) => a + b, 0) / listFinancialList.length : 0;
  const avgListWf = listWorkforceList.length > 0 ? listWorkforceList.reduce((a, b) => a + b, 0) / listWorkforceList.length : 0;

  const timesheetProgress = Math.min(100, (timesheetProjectHours / totalCap) * 100);
  const listProgress = Math.min(100, (listProjectHours / totalCap) * 100);

  // Financial & Workforce utilization prefer Timesheet data if recorded, otherwise Task List data
  const finalFinancial = hasTimesheetData ? avgTimesheetFin : avgListFin;
  const finalWorkforceUtil = hasTimesheetData ? avgTimesheetWf : avgListWf;

  // ─────────────────────────────────────────────────────────────
  // 3. PROJECT BREAKDOWN (KHUNG MÀU ĐỎ: PERSONAL\ list vs PERSONAL\ time sheet)
  // ─────────────────────────────────────────────────────────────
  const projectBreakdown = Array.from(projectStatsMap.values())
    .map(p => ({
      ...p,
      totalHours: p.listHours + p.timesheetHours
    }))
    .filter(p => p.totalHours > 0 || p.listHours > 0 || p.timesheetHours > 0)
    .sort((a, b) => (b.listHours + b.timesheetHours) - (a.listHours + a.timesheetHours));

  // ─────────────────────────────────────────────────────────────
  // 4. STAFF BREAKDOWN (KHUNG MÀU XANH LÁ: PERSONAL\ Time sheet (+))
  // ─────────────────────────────────────────────────────────────
  const staffBreakdown = activeStaff.map(u => {
    const listH = listUserHours[u.id] || { projectHoursOnly: 0, apexHours: 0, leaveHours: 0 };
    const tsH = tsUserHours[u.id] || { projectHoursOnly: 0, apexHours: 0, leaveHours: 0 };

    const activeSource = hasTimesheetData && tsH.projectHoursOnly > 0 ? tsH : listH;

    const workingDays = Math.max(0, (5 * capacityMultiplier) - (activeSource.leaveHours / 8));
    const finCap = workingDays * 8;
    const fin = finCap > 0 ? (activeSource.projectHoursOnly / finCap) * 100 : 0;

    const wfHours = activeSource.projectHoursOnly + activeSource.apexHours + activeSource.leaveHours;
    const wfCap = capacityMultiplier * 40;
    const wf = wfCap > 0 ? (wfHours / wfCap) * 100 : 0;

    return {
      id: u.id,
      name: u.name,
      team: getMappedTeam(u.team),
      rawTeam: u.team,
      image: u.image || null,
      financial: fin,
      workforceUtil: wf,
      listHours: listH.projectHoursOnly,
      timesheetHours: tsH.projectHoursOnly,
      leaveHours: activeSource.leaveHours,
      workingDays
    };
  }).sort((a, b) => b.financial - a.financial || b.workforceUtil - a.workforceUtil || a.name.localeCompare(b.name));

  return {
    financial: finalFinancial,
    workforceUtil: finalWorkforceUtil,
    timesheetHours: timesheetProjectHours,
    timesheetProgress,
    listHours: listProjectHours,
    listProgress,
    projectHours: listProjectHours > 0 ? listProjectHours : timesheetProjectHours,
    projectHoursProgress: listProgress > 0 ? listProgress : timesheetProgress,
    // Breakdowns for the two new widgets
    projectBreakdown,
    staffBreakdown
  };
}
