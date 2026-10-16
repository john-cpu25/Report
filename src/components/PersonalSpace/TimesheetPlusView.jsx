import React, { useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { format, startOfWeek, getISOWeek, addDays } from 'date-fns';
import { Plus, Trash2, RefreshCw, Download, Search, Check, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getCachedApexTimesheetData, subscribeApexTimesheetData, fetchApexTimesheetData } from '../../services/apexTimesheetCache';
import { getCanonicalName, isSameUser } from '../../utils/userUtils';
import { getWeeksForMonth, isRecordInTimeRange } from '../../utils/timeUtils';

const getUtilizationBadge = (rate) => {
  const r = Number(rate) || 0;
  if (r >= 100) {
    return {
      label: 'EXCELLENT',
      bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      barColor: 'bg-emerald-500'
    };
  }
  if (r >= 85) {
    return {
      label: 'GOOD',
      bg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
      barColor: 'bg-sky-500'
    };
  }
  if (r >= 70) {
    return {
      label: 'STANDARD',
      bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      barColor: 'bg-amber-500'
    };
  }
  return {
    label: 'LOW',
    bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    barColor: 'bg-rose-500'
  };
};

const getTeamColor = (teamName) => {
  const t = (teamName || '').toUpperCase();
  if (t.includes('SLAB')) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  if (t.includes('PT') || t.includes('REO')) return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
  if (t.includes('MODEL') || t.includes('BIM')) return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30';
  if (t.includes('LATERAL') || t.includes('ETABS')) return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
  if (t.includes('CHECK')) return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
  return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
};

const TimesheetPlusView = forwardRef(({
  currentDate = new Date(),
  timeRange = 'week',
  selectedWeeks = [],
  getProjectColor = () => '#6366f1',
  selectedTimeMetric = 't1',
  rawUsers = [],
  userTeamByName = {},
  dashboardProjects = [],
  dashboardUsers = [],
  selectedTeam = '',
  selectedProject = '',
  selectedUser = '',
  searchQuery = ''
}, ref) => {
  const cached = getCachedApexTimesheetData();
  const [timesheetRecords, setTimesheetRecords] = useState(cached?.timesheetRecords || []);
  const [timesheetTypes, setTimesheetTypes] = useState(cached?.timesheetTypes || []);
  const [apexUsers, setApexUsers] = useState(cached?.apexUsers || []);
  const [apexProjects, setApexProjects] = useState(cached?.apexProjects || []);
  const [isLoading, setIsLoading] = useState(!cached || !cached.timesheetRecords?.length);

  // Date / Range calculation
  const today = currentDate || new Date();
  const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
  const weekDates = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map(i => addDays(currentMonday, i)), [currentMonday]);
  const currentWeek = getISOWeek(today);
  const currentYear = today.getFullYear();

  const monthWeeks = useMemo(() => {
    return getWeeksForMonth(currentYear, today.getMonth());
  }, [currentYear, today]);

  // Weeks list for the "WEEKLY NUMBER OF HOUR" section (show W39, W40, W41... theo week tổng của năm)
  const weekCols = useMemo(() => {
    if (timeRange === 'year') {
      const monthNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
      return monthNames.map((m, idx) => ({
        index: idx + 1,
        label: `T${idx + 1}`,
        fullLabel: `Tháng ${idx + 1}`,
        monthIndex: idx
      }));
    }
    if (timeRange === 'custom' && selectedWeeks && selectedWeeks.length > 0) {
      const sorted = [...selectedWeeks].sort((a, b) => a - b);
      return sorted.map((wk, idx) => ({
        index: idx + 1,
        label: `W${wk}`,
        fullLabel: `Tuần ${wk}`,
        weekNum: wk,
        isCurrent: wk === currentWeek
      }));
    }
    // Xem 1 tuần: Chỉ hiển thị 1 cột tuần được chọn
    if (timeRange === 'week') {
      return [{
        index: 1,
        label: `W${currentWeek}`,
        fullLabel: `Tuần ${currentWeek}`,
        weekNum: currentWeek,
        isCurrent: true
      }];
    }
    // Default or 'month': Show ISO weeks of the month in the year (ví dụ W39, W40, W41, W42, W43)
    const baseWeeks = (monthWeeks && monthWeeks.length > 0) ? monthWeeks : [currentWeek];
    return baseWeeks.map((wk, idx) => ({
      index: idx + 1,
      label: `W${wk}`,
      fullLabel: `Tuần ${wk}`,
      weekNum: wk,
      isCurrent: wk === currentWeek
    }));
  }, [timeRange, monthWeeks, selectedWeeks, currentWeek]);

  // Capacity calculation (40h standard per week)
  const capacityMultiplier = useMemo(() => {
    if (timeRange === 'year') return 52;
    if (timeRange === 'week') return 1;
    if (timeRange === 'custom') return Math.max(1, selectedWeeks?.length || 1);
    if (timeRange === 'month') return Math.max(1, monthWeeks?.length || 4);
    return Math.max(1, weekCols.length);
  }, [timeRange, selectedWeeks, monthWeeks, weekCols]);

  const baseStandardCapacity = capacityMultiplier * 40;

  // Subscribe to timesheet cache
  useEffect(() => {
    const unsub = subscribeApexTimesheetData(data => {
      if (data) {
        if (data.timesheetRecords) setTimesheetRecords(data.timesheetRecords);
        if (data.timesheetTypes) setTimesheetTypes(data.timesheetTypes);
        if (data.apexUsers) setApexUsers(data.apexUsers);
        if (data.apexProjects) setApexProjects(data.apexProjects);
        setIsLoading(false);
      }
    });

    if (!cached || !cached.timesheetRecords?.length) {
      setIsLoading(true);
      fetchApexTimesheetData().then(data => {
        if (data) {
          if (data.timesheetRecords) setTimesheetRecords(data.timesheetRecords);
          if (data.timesheetTypes) setTimesheetTypes(data.timesheetTypes);
          if (data.apexUsers) setApexUsers(data.apexUsers);
          if (data.apexProjects) setApexProjects(data.apexProjects);
        }
        setIsLoading(false);
      });
    }

    return () => unsub();
  }, []);

  // Quick lookup maps
  const timeSheetTypeMap = useMemo(() => {
    const map = {};
    (timesheetTypes || []).forEach(t => {
      if (t.id) map[t.id] = (t.type || '').trim().toUpperCase();
    });
    return map;
  }, [timesheetTypes]);

  const userMap = useMemo(() => {
    const map = {};
    (rawUsers || []).forEach(u => { if (u.id) map[u.id] = u; });
    (dashboardUsers || []).forEach(u => { if (u.id && !map[u.id]) map[u.id] = u; });
    (apexUsers || []).forEach(u => { if (u.id && !map[u.id]) map[u.id] = u; });
    return map;
  }, [rawUsers, dashboardUsers, apexUsers]);

  const projectMap = useMemo(() => {
    const map = {};
    (dashboardProjects || []).forEach(p => { if (p.id) map[p.id] = p; });
    (apexProjects || []).forEach(p => { if (p.id && !map[p.id]) map[p.id] = p; });
    return map;
  }, [dashboardProjects, apexProjects]);

  // Map project code/key/id to full project name from Supabase
  const projectFullNameMap = useMemo(() => {
    const map = {};
    const registerName = (p) => {
      if (!p) return;
      const fullName = (p.name || p.full_name || p.key || '').trim();
      if (!fullName) return;
      if (p.id) map[String(p.id).trim().toUpperCase()] = fullName;
      if (p.key) map[String(p.key).trim().toUpperCase()] = fullName;
      if (p.code) map[String(p.code).trim().toUpperCase()] = fullName;
      if (p.name) map[String(p.name).trim().toUpperCase()] = fullName;
    };
    (dashboardProjects || []).forEach(registerName);
    (apexProjects || []).forEach(registerName);
    map['APEX'] = 'APEX (Management, R&D, Training, Annual Leave)';
    map['APEX FREE'] = 'APEX FREE (Learning)';
    return map;
  }, [dashboardProjects, apexProjects]);

  // Map project code/key/name/id to Supabase color
  const projectColorMap = useMemo(() => {
    const map = {};
    const registerColor = (p) => {
      if (!p || !p.color) return;
      const col = p.color;
      if (p.id) map[String(p.id).trim().toUpperCase()] = col;
      if (p.key) map[String(p.key).trim().toUpperCase()] = col;
      if (p.code) map[String(p.code).trim().toUpperCase()] = col;
      if (p.name) map[String(p.name).trim().toUpperCase()] = col;
      if (p.full_name) map[String(p.full_name).trim().toUpperCase()] = col;
    };
    (dashboardProjects || []).forEach(registerColor);
    (apexProjects || []).forEach(registerColor);

    // Color for APEX and APEX FREE
    const apexCol = map['APEX'] || '#f43f5e';
    map['APEX'] = apexCol;
    map['APEX FREE'] = map['APEX FREE'] || '#06b6d4'; // Cyan for Learning
    return map;
  }, [dashboardProjects, apexProjects]);

  const resolveProjectColor = useCallback((pCode) => {
    if (!pCode) return '#6366f1';
    const cleanKey = String(pCode).trim().toUpperCase();
    if (projectColorMap[cleanKey]) return projectColorMap[cleanKey];

    // Check partial key matches
    for (const [k, c] of Object.entries(projectColorMap)) {
      if (k === cleanKey || k.startsWith(cleanKey) || cleanKey.startsWith(k)) {
        return c;
      }
    }

    if (typeof getProjectColor === 'function') {
      const col = getProjectColor(pCode);
      if (col) return col;
    }

    const fallbackPalette = [
      '#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#3b82f6', 
      '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316',
      '#ef4444', '#22c55e', '#a855f7', '#eab308', '#0ea5e9',
      '#d946ef', '#84cc16'
    ];
    let hash = 0;
    for (let i = 0; i < cleanKey.length; i++) {
      hash = cleanKey.charCodeAt(i) + ((hash << 5) - hash);
    }
    return fallbackPalette[Math.abs(hash) % fallbackPalette.length];
  }, [projectColorMap, getProjectColor]);

  // Aggregate Data into Matrix: Users x Projects + Weekly sum
  const matrixData = useMemo(() => {
    const weekRecords = timesheetRecords.filter(r => {
      return isRecordInTimeRange(r.week, r.year, today, timeRange, monthWeeks, selectedWeeks);
    });

    // 1. Identify all active Project Codes in this period
    const projectCodesSet = new Set();
    const usersMap = {}; // { [userName]: { name, team, projectHours: { [projectCode]: number }, weeklyHours: { [colKey]: number } } }
    const teamsMap = {}; // { [teamName]: Set of userNames }

    weekRecords.forEach(record => {
      const userObj = userMap[record.user_id];
      const projObj = projectMap[record.project_id];

      const userLoc = (userObj?.location || '').toString().toLowerCase();
      if (userLoc.includes('aus') || userLoc.includes('australia')) return;

      const rawUserName = (userObj?.name || userObj?.full_name || record.user_id || 'Unknown').toString().trim();
      const userName = getCanonicalName(rawUserName);
      const teamName = (userObj?.team || userTeamByName[rawUserName] || userTeamByName[userName] || 'APEX').toString().trim().toUpperCase();
      
      // Không hiển thị Team MANAGER / MANAGEMENT
      if (teamName.includes('MANAGER') || teamName.includes('MANAGEMENT')) return;

      const baseProjectCode = (projObj?.key || projObj?.code || projObj?.name || 'UNASSIGNED').toString().trim().toUpperCase();
      const taskType = (timeSheetTypeMap[record.kind] || '').toString().trim().toUpperCase();

      // Phân tách cột APEX:
      // + APEX FREE : LEARNING
      // + APEX : MANAGEMENT, R&D, TRAINING, ANNUAL LEAVE và các loại task khác
      let projectCode = baseProjectCode;
      if (baseProjectCode === 'APEX') {
        if (taskType.includes('LEARNING')) {
          projectCode = 'APEX FREE';
        } else {
          projectCode = 'APEX';
        }
      }

      // Filter: Team
      if (selectedTeam && teamName.toLowerCase() !== selectedTeam.trim().toLowerCase()) return;

      // Filter: Project
      if (selectedProject) {
        const selP = selectedProject.trim().toLowerCase();
        if (projectCode.toLowerCase() !== selP && baseProjectCode.toLowerCase() !== selP) return;
      }

      // Filter: User
      if (selectedUser) {
        if (!isSameUser(rawUserName, selectedUser) && !isSameUser(userName, selectedUser)) return;
      }

      // Filter: Search
      if (searchQuery) {
        const q = searchQuery.trim().toLowerCase();
        const matchSearch = userName.toLowerCase().includes(q) ||
                            rawUserName.toLowerCase().includes(q) ||
                            projectCode.toLowerCase().includes(q) ||
                            baseProjectCode.toLowerCase().includes(q) ||
                            taskType.toLowerCase().includes(q) ||
                            teamName.toLowerCase().includes(q);
        if (!matchSearch) return;
      }

      const rowSum = (Number(record.mon) || 0) + (Number(record.tue) || 0) + (Number(record.wed) || 0) +
                     (Number(record.thu) || 0) + (Number(record.fri) || 0) + (Number(record.sat) || 0) + (Number(record.sun) || 0);

      projectCodesSet.add(projectCode);

      if (!usersMap[userName]) {
        usersMap[userName] = {
          name: userName,
          rawName: rawUserName,
          team: teamName,
          projectHours: {},
          weeklyHours: {}
        };
      }

      if (!teamsMap[teamName]) {
        teamsMap[teamName] = new Set();
      }
      teamsMap[teamName].add(userName);

      // Add to project hours
      usersMap[userName].projectHours[projectCode] = (usersMap[userName].projectHours[projectCode] || 0) + rowSum;

      // Add to week column hours (mapping to ISO week of year like W39, W40, ...)
      const recWk = Number(record.week);
      const foundWeek = weekCols.find(w => w.weekNum === recWk);
      const colKey = foundWeek ? foundWeek.label : (recWk ? `W${recWk}` : '');
      if (colKey) {
        usersMap[userName].weeklyHours[colKey] = (usersMap[userName].weeklyHours[colKey] || 0) + rowSum;
      }
    });

    // Luôn đảm bảo nếu có cột APEX hoặc APEX FREE thì xuất hiện cả cặp liền kề
    if (projectCodesSet.has('APEX') || projectCodesSet.has('APEX FREE')) {
      projectCodesSet.add('APEX');
      projectCodesSet.add('APEX FREE');
    }

    // Also include all active users in rawUsers / dashboardUsers / apexUsers if no records yet, so the matrix is comprehensive
    const candidateUsers = [];
    const seenStaffIds = new Set();
    [...(rawUsers || []), ...(dashboardUsers || []), ...(apexUsers || [])].forEach(u => {
      if (!u) return;
      const key = (u.id || u.name || '').toString().toLowerCase();
      if (key && !seenStaffIds.has(key)) {
        seenStaffIds.add(key);
        candidateUsers.push(u);
      }
    });

    if (candidateUsers.length > 0 && !selectedUser && !searchQuery) {
      candidateUsers.forEach(u => {
        const userLoc = (u?.location || '').toString().toLowerCase();
        if (userLoc.includes('aus') || userLoc.includes('australia')) return;
        const userName = getCanonicalName(u.name || u.full_name || '');
        if (!userName || userName === 'Unknown') return;
        const teamName = (u?.team || userTeamByName[userName] || 'APEX').toString().trim().toUpperCase();

        // Không hiển thị Team MANAGER / MANAGEMENT
        if (teamName.includes('MANAGER') || teamName.includes('MANAGEMENT')) return;

        if (selectedTeam && teamName.toLowerCase() !== selectedTeam.trim().toLowerCase()) return;

        if (!usersMap[userName]) {
          usersMap[userName] = {
            name: userName,
            rawName: u.name,
            team: teamName,
            projectHours: {},
            weeklyHours: {}
          };
          if (!teamsMap[teamName]) teamsMap[teamName] = new Set();
          teamsMap[teamName].add(userName);
        }
      });
    }

    // Default sample project codes if empty (e.g. FGWB, MEL03, CW2, CW3 from user's screenshot)
    if (projectCodesSet.size === 0) {
      ['FGWB', 'MEL03', 'CW2', 'CW3'].forEach(c => projectCodesSet.add(c));
    }

    const projectColumns = Array.from(projectCodesSet).sort((a, b) => a.localeCompare(b));

    // Calculate final numbers directly from APEX_TimeSheet
    const rows = Object.values(usersMap).map(user => {
      // 1. Projects row values (lấy trực tiếp từ timesheet, không chỉnh sửa)
      const projectVals = {};
      let userTotalProjectHours = 0;

      projectColumns.forEach(pCode => {
        const raw = user.projectHours[pCode] || 0;
        projectVals[pCode] = raw;
        userTotalProjectHours += raw;
      });

      // 2. Weekly number of hour values (lấy trực tiếp từ timesheet)
      const weeklyVals = {};
      let userTotalWeeklyHours = 0;

      weekCols.forEach(col => {
        const rawWeek = user.weeklyHours[col.label] || 0;
        weeklyVals[col.label] = rawWeek;
        userTotalWeeklyHours += rawWeek;
      });

      const wnoh = userTotalWeeklyHours > 0 ? userTotalWeeklyHours : userTotalProjectHours;

      // WUZ (Weekly utilization) = (work time + apex time + over time) * 100 / 40h = (WNOH / 40h) * 100%
      const wuz = baseStandardCapacity > 0 ? (wnoh / baseStandardCapacity) * 100 : 0;

      return {
        name: user.name,
        team: user.team,
        projectVals,
        weeklyVals,
        wnoh,
        wuz
      };
    });

    // Group by TEAM (loại bỏ team MANAGER / MANAGEMENT)
    const teamsList = Object.keys(teamsMap)
      .filter(t => !t.includes('MANAGER') && !t.includes('MANAGEMENT'))
      .sort()
      .map(teamName => {
      const teamUsers = rows.filter(r => r.team === teamName);
      teamUsers.sort((a, b) => a.name.localeCompare(b.name));

      const teamTotalHours = teamUsers.reduce((acc, u) => acc + u.wnoh, 0);
      const teamCapacity = teamUsers.length * baseStandardCapacity;
      const teamWuz = teamCapacity > 0 ? (teamTotalHours / teamCapacity) * 100 : 0;

      return {
        name: teamName,
        users: teamUsers,
        totalHours: teamTotalHours,
        teamWuz
      };
    });

    // Grand Totals
    const grandTotalHours = rows.reduce((acc, r) => acc + r.wnoh, 0);
    const totalCapacity = rows.length * baseStandardCapacity;
    const grandAvgWuz = totalCapacity > 0 ? (grandTotalHours / totalCapacity) * 100 : 0;

    // Project Column Totals
    const projectColTotals = {};
    projectColumns.forEach(pCode => {
      projectColTotals[pCode] = rows.reduce((acc, r) => acc + (r.projectVals[pCode] || 0), 0);
    });

    // Week Column Totals
    const weekColTotals = {};
    weekCols.forEach(col => {
      weekColTotals[col.label] = rows.reduce((acc, r) => acc + (r.weeklyVals[col.label] || 0), 0);
    });

    return {
      projectColumns,
      weekCols,
      teams: teamsList,
      allRows: rows,
      projectColTotals,
      weekColTotals,
      grandTotalHours,
      grandAvgWuz,
      totalUsersCount: rows.length
    };
  }, [timesheetRecords, today, timeRange, monthWeeks, selectedWeeks, userMap, projectMap, timeSheetTypeMap, selectedTeam, selectedProject, selectedUser, searchQuery, userTeamByName, weekCols, baseStandardCapacity, rawUsers, dashboardUsers, apexUsers]);

  // Excel Export Handler (Matching Hình 1 & Hình 2 layout)
  const handleExportExcel = useCallback(() => {
    try {
      const wb = XLSX.utils.book_new();
      const periodLabel = timeRange === 'week'
        ? `Week ${currentWeek}, ${currentYear}`
        : timeRange === 'custom'
        ? `Custom Weeks: W${selectedWeeks.join(', W')}`
        : timeRange === 'month'
        ? `Month: ${today.getMonth() + 1}/${currentYear}`
        : `Year: ${currentYear}`;

      const { projectColumns, weekCols, teams, grandTotalHours, grandAvgWuz, projectColTotals, weekColTotals, totalUsersCount } = matrixData;

      // Row 1: Title
      const headerRow1 = [
        'TEAM',
        'Name',
        ...new Array(projectColumns.length).fill(''),
        ...new Array(weekCols.length).fill(''),
        'WUZ (%)',
        'General Utilization',
        'Team Utilization'
      ];
      headerRow1[2] = 'Project'; // Group label across project columns
      headerRow1[2 + projectColumns.length] = 'Weekly number of hour'; // Group label across week columns

      // Row 2: Sub-headers
      const headerRow2 = [
        '',
        '',
        ...projectColumns,
        ...weekCols.map(w => w.label),
        '',
        '',
        ''
      ];

      const rows = [
        [`APEX SOUTHERN CROSS ENGINEERING - TIME SHEET (+)`],
        [`Period: ${periodLabel}`],
        [],
        headerRow1,
        headerRow2
      ];

      // Data rows
      teams.forEach(team => {
        team.users.forEach(user => {
          const projCells = projectColumns.map(p => user.projectVals[p] > 0 ? Number(user.projectVals[p].toFixed(1)) : '');
          const weekCells = weekCols.map(w => user.weeklyVals[w.label] > 0 ? Number(user.weeklyVals[w.label].toFixed(1)) : '');
          const genRating = getUtilizationBadge(user.wuz).label;

          rows.push([
            user.team,
            user.name,
            ...projCells,
            ...weekCells,
            `${user.wuz.toFixed(1)}%`,
            `${genRating} (${user.wuz.toFixed(0)}%)`,
            `${team.teamWuz.toFixed(1)}%`
          ]);
        });
      });

      // Total row
      const totalProjCells = projectColumns.map(p => projectColTotals[p] > 0 ? Number(projectColTotals[p].toFixed(1)) : '');
      const totalWeekCells = weekCols.map(w => weekColTotals[w.label] > 0 ? Number(weekColTotals[w.label].toFixed(1)) : '');

      rows.push([
        'TOTAL',
        `${totalUsersCount} Nhân sự`,
        ...totalProjCells,
        ...totalWeekCells,
        `${grandAvgWuz.toFixed(1)}%`,
        'AVG',
        `${grandAvgWuz.toFixed(1)}%`
      ]);

      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Merge cells for 'Project', 'WEEKLY NUMBER OF HOUR', and TEAM column
      const excelMerges = [
        // Merge "Project" header across projectColumns: row index 3 (4th row)
        { s: { r: 3, c: 2 }, e: { r: 3, c: 2 + projectColumns.length - 1 } },
        // Merge "WEEKLY NUMBER OF HOUR" across weekCols:
        { s: { r: 3, c: 2 + projectColumns.length }, e: { r: 3, c: 2 + projectColumns.length + weekCols.length - 1 } }
      ];

      // Add team merges in column A (c: 0)
      let currentDataRow = 5; // row index after headers
      teams.forEach(team => {
        if (team.users.length > 1) {
          excelMerges.push({
            s: { r: currentDataRow, c: 0 },
            e: { r: currentDataRow + team.users.length - 1, c: 0 }
          });
        }
        currentDataRow += team.users.length;
      });

      ws['!merges'] = excelMerges;

      const fileSuffix = timeRange === 'week' 
        ? `W${currentWeek}_${currentYear}` 
        : timeRange === 'custom' 
        ? `Custom_Weeks` 
        : `Report_${currentYear}`;

      XLSX.utils.book_append_sheet(wb, ws, `Timesheet_Plus`);
      XLSX.writeFile(wb, `APEX_Timesheet_Plus_Matrix_${fileSuffix}.xlsx`);
    } catch (e) {
      console.error('Error exporting Timesheet(+) matrix to Excel:', e);
    }
  }, [matrixData, timeRange, currentWeek, currentYear, selectedWeeks, today]);

  useImperativeHandle(ref, () => ({
    exportExcel: handleExportExcel
  }), [handleExportExcel]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <RefreshCw size={28} className="animate-spin text-indigo-500" />
        <span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Đang tổng hợp ma trận TIME SHEET(+)...</span>
      </div>
    );
  }

  const { projectColumns, teams, projectColTotals, weekColTotals, grandTotalHours, grandAvgWuz, totalUsersCount } = matrixData;

  return (
    <div className="personal-table-wrapper w-full h-full flex flex-col">
      {/* Top Bar Summary & Controls */}
      <div className="flex items-center justify-between pb-2 px-1 text-[12px] font-bold">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Tổng nhân sự:</span>
            <span className="text-indigo-400 font-mono font-black">{totalUsersCount}</span>
          </div>
          <div className="w-[1px] h-3.5 bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Tổng giờ:</span>
            <span className="text-emerald-500 font-mono font-black">{grandTotalHours.toFixed(1)}h</span>
          </div>
          <div className="w-[1px] h-3.5 bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Hiệu suất TB:</span>
            <span className="text-sky-400 font-mono font-black">{grandAvgWuz.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Main Table adhering to standard form of other tabs */}
      <div className="personal-table-wrapper rounded-2xl border border-slate-300 dark:border-slate-600 overflow-hidden shadow-md bg-[var(--bg-card)]">
        <div className="max-h-[calc(100vh-335px)] overflow-y-auto overflow-x-auto custom-scrollbar">
          <table 
            className="w-full border-separate border-spacing-0 table-fixed text-[12px]"
            style={{ minWidth: `${120 + 150 + projectColumns.length * 85 + weekCols.length * 65 + 370}px` }}
          >
            {/* Column Width Definitions */}
            <colgroup>
              <col style={{ width: '120px' }} />
              <col style={{ width: '150px' }} />
              {projectColumns.map((pCode) => (
                <col key={pCode} style={{ width: '85px' }} />
              ))}
              {weekCols.map((col) => (
                <col key={col.label} style={{ width: '65px' }} />
              ))}
              <col style={{ width: '100px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '130px' }} />
            </colgroup>

            {/* Header 1: Main Group Headers */}
            <thead>
              <tr className="bg-[var(--bg-card)] text-[var(--text-main)] dark:text-white h-[36px]">
                {/* Header 1: TEAM */}
                <th 
                  rowSpan={2}
                  className="sticky top-0 left-0 z-40 bg-[var(--bg-card)] border-r border-b border-slate-300 dark:border-slate-600 text-left px-[10px] py-2 text-[12px] font-black uppercase tracking-wider text-[var(--text-main)] dark:text-white align-middle"
                  style={{ left: 0, paddingLeft: '10px', paddingRight: '10px' }}
                >
                  TEAM
                </th>

                {/* Header 1: Name / USER */}
                <th 
                  rowSpan={2}
                  className="sticky top-0 z-40 bg-[var(--bg-card)] border-r border-b border-slate-300 dark:border-slate-600 text-left px-[10px] py-2 text-[12px] font-black uppercase tracking-wider text-[var(--text-main)] dark:text-white align-middle"
                  style={{ left: '120px', paddingLeft: '10px', paddingRight: '10px' }}
                >
                  Name
                </th>

                {/* Group Header 1: Project */}
                <th 
                  colSpan={projectColumns.length}
                  className="sticky top-0 z-30 bg-[var(--bg-card)] border-r border-b border-slate-300 dark:border-slate-600 text-center py-2 text-[12px] font-black uppercase tracking-wider text-[var(--text-main)] dark:text-white h-[36px]"
                  style={{ top: 0 }}
                >
                  Project
                </th>

                {/* Group Header 2: WEEKLY NUMBER OF HOUR */}
                <th 
                  colSpan={weekCols.length}
                  className="sticky top-0 z-30 bg-[var(--bg-card)] border-r border-b border-slate-300 dark:border-slate-600 text-center py-2 text-[12px] font-black uppercase tracking-wider text-[var(--text-main)] dark:text-white h-[36px]"
                  style={{ top: 0 }}
                >
                  WEEKLY NUMBER OF HOUR
                </th>

                {/* Utilization Headers */}
                <th 
                  rowSpan={2}
                  title="WUZ: (work time + apex time + over time) * 100 / 40h"
                  className="sticky top-0 z-30 bg-[var(--bg-card)] border-r border-b border-slate-300 dark:border-slate-600 text-center px-2 py-2 text-[12px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400 align-middle"
                  style={{ top: 0 }}
                >
                  WUZ (%)
                </th>

                <th 
                  rowSpan={2}
                  title="General Utilization: Đánh giá hiệu suất cá nhân"
                  className="sticky top-0 z-30 bg-[var(--bg-card)] border-r border-b border-slate-300 dark:border-slate-600 text-center px-2 py-2 text-[12px] font-black uppercase tracking-wider text-[var(--text-main)] dark:text-white align-middle"
                  style={{ top: 0 }}
                >
                  General Utilization
                </th>

                <th 
                  rowSpan={2}
                  title="Team Utilization: Đánh giá hiệu suất team"
                  className="sticky top-0 z-30 bg-[var(--bg-card)] border-r border-b border-slate-300 dark:border-slate-600 text-center px-2 py-2 text-[12px] font-black uppercase tracking-wider text-[var(--text-main)] dark:text-white align-middle"
                  style={{ top: 0 }}
                >
                  Team Utilization
                </th>
              </tr>

              {/* Header 2: Sub-headers for Projects & Weeks */}
              <tr className="bg-[var(--bg-card)] text-[var(--text-contrast)] dark:text-white h-[32px]">
                {/* Sub-headers for Projects: FGWB | MEL03 | CW2 | CW3 ... - Đồng bộ màu theo Supabase */}
                {projectColumns.map((pCode) => {
                  const pColor = resolveProjectColor(pCode);
                  const fullName = projectFullNameMap[pCode] || pCode;
                  return (
                    <th
                      key={pCode}
                      className="sticky z-30 bg-[var(--bg-card)] border-r border-b border-slate-300 dark:border-slate-600 text-center py-1.5 px-1 font-mono font-black text-[12px] uppercase truncate transition-colors hover:brightness-110 cursor-default"
                      style={{ top: '36px', color: pColor }}
                      title={`Project: ${fullName}`}
                    >
                      <span className="truncate block font-black" style={{ color: pColor }}>
                        {pCode}
                      </span>
                    </th>
                  );
                })}

                {/* Sub-headers for Weekly number of hour: W39 | W40 | W41 ... */}
                {weekCols.map((col) => (
                  <th
                    key={col.label}
                    className="sticky z-30 bg-[var(--bg-card)] border-r border-b border-slate-300 dark:border-slate-600 text-center py-1.5 px-1 font-mono font-bold text-[12px] text-[var(--text-contrast)] dark:text-white uppercase"
                    style={{ top: '36px' }}
                    title={col.fullLabel}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={2 + projectColumns.length + weekCols.length + 3} className="py-12 text-center text-slate-400 font-bold border-b border-slate-300 dark:border-slate-600">
                    Không tìm thấy dữ liệu phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                teams.map((team) => {
                  return (
                    <React.Fragment key={team.name}>
                      {team.users.map((user, ui) => {
                        const userUtilBadge = getUtilizationBadge(user.wuz);

                        return (
                          <tr 
                            key={user.name} 
                            className="hover:bg-indigo-500/10 transition-colors group"
                          >
                            {/* 1. TEAM Column - Show dạng Group (gộp chung các hàng của team) */}
                            {ui === 0 && (
                              <td 
                                rowSpan={team.users.length}
                                className="sticky left-0 z-20 bg-[var(--bg-card)] border-r border-b border-slate-300 dark:border-slate-600 px-[10px] py-2 text-left font-bold text-[12px] text-indigo-500 uppercase tracking-normal align-middle min-w-[120px]"
                                style={{ left: 0, paddingLeft: '10px', paddingRight: '10px' }}
                              >
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-black text-[12px] tracking-wide text-indigo-500">{team.name}</span>
                                  <span className="text-[10px] font-normal text-[var(--text-muted)] lowercase">({team.users.length} ns)</span>
                                </div>
                              </td>
                            )}

                            {/* 2. Name / USER */}
                            <td 
                              className="sticky z-20 bg-[var(--bg-card)] group-hover:bg-indigo-500/15 border-r border-b border-slate-300 dark:border-slate-600 px-[10px] py-2 text-left font-bold text-[12px] text-[var(--text-main)] dark:text-white truncate transition-colors" 
                              style={{ left: '120px', paddingLeft: '10px', paddingRight: '10px' }}
                              title={user.name}
                            >
                              {user.name}
                            </td>

                            {/* 3. Project Columns */}
                            {projectColumns.map((pCode) => {
                              const val = user.projectVals[pCode];
                              const hasVal = val > 0;

                              return (
                                <td 
                                  key={pCode} 
                                  className="border-r border-b border-slate-300 dark:border-slate-600 text-center font-mono text-[12px] py-2 px-1"
                                >
                                  <span className={hasVal ? 'font-bold text-[var(--text-contrast)] dark:text-white' : 'text-slate-300 dark:text-slate-700'}>
                                    {hasVal ? val.toFixed(1) : ''}
                                  </span>
                                </td>
                              );
                            })}

                            {/* 4. Weekly number of hour columns */}
                            {weekCols.map((col) => {
                              const wVal = user.weeklyVals[col.label];
                              const hasWVal = wVal > 0;

                              return (
                                <td 
                                  key={col.label} 
                                  className="border-r border-b border-slate-300 dark:border-slate-600 text-center font-mono text-[12px] py-2 px-1"
                                >
                                  <span className={hasWVal ? 'font-bold text-[var(--text-contrast)] dark:text-white' : 'text-slate-300 dark:text-slate-700'}>
                                    {hasWVal ? wVal.toFixed(1) : ''}
                                  </span>
                                </td>
                              );
                            })}

                            {/* 5. WUZ (%) */}
                            <td className="border-r border-b border-slate-300 dark:border-slate-600 text-center font-mono font-bold text-[12px] py-2 px-1 text-indigo-500 dark:text-indigo-400">
                              {user.wuz.toFixed(1)}%
                            </td>

                            {/* 6. General Utilization (Personal Rating) */}
                            <td className="border-r border-b border-slate-300 dark:border-slate-600 text-center py-2 px-1.5 font-bold text-[12px]">
                              <span className={user.wuz >= 100 ? 'text-emerald-500' : user.wuz >= 85 ? 'text-sky-500' : user.wuz >= 70 ? 'text-amber-500' : 'text-rose-500'}>
                                {userUtilBadge.label} ({user.wuz.toFixed(0)}%)
                              </span>
                            </td>

                            {/* 7. Team Utilization */}
                            <td className="border-r border-b border-slate-300 dark:border-slate-600 text-center py-2 px-1.5 font-bold text-[12px] text-purple-600 dark:text-purple-400">
                              {team.teamWuz.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}

                      {/* Team Subtotal Row */}
                      <tr className="bg-[var(--bg-surface)] font-bold text-[12px]">
                        <td 
                          colSpan={2} 
                          className="sticky left-0 z-20 bg-[var(--bg-surface)] border-r border-b border-slate-400 dark:border-slate-500 px-[10px] py-2 text-left font-black text-[12px] text-slate-700 dark:text-slate-200 uppercase tracking-wider"
                          style={{ left: 0, paddingLeft: '10px', paddingRight: '10px' }}
                        >
                          TOTAL
                        </td>

                        {/* Project Col Subtotals for Team */}
                        {projectColumns.map((pCode) => {
                          const teamProjSum = team.users.reduce((acc, u) => acc + (u.projectVals[pCode] || 0), 0);
                          return (
                            <td key={pCode} className="border-r border-b border-slate-400 dark:border-slate-500 text-center font-mono font-bold text-[11px] text-[var(--text-muted)] dark:text-slate-300 py-1.5">
                              {teamProjSum > 0 ? teamProjSum.toFixed(1) : ''}
                            </td>
                          );
                        })}

                        {/* Week Col Subtotals for Team */}
                        {weekCols.map((col) => {
                          const teamWeekSum = team.users.reduce((acc, u) => acc + (u.weeklyVals[col.label] || 0), 0);
                          return (
                            <td 
                              key={col.label} 
                              className="border-r border-b border-slate-400 dark:border-slate-500 text-center font-mono font-bold text-[11px] text-[var(--text-muted)] dark:text-slate-300 py-1.5"
                            >
                              {teamWeekSum > 0 ? teamWeekSum.toFixed(1) : ''}
                            </td>
                          );
                        })}

                        <td className="border-r border-b border-slate-400 dark:border-slate-500 text-center font-mono font-bold text-[12px] text-indigo-500 dark:text-indigo-400 py-1.5">
                          {team.teamWuz.toFixed(1)}%
                        </td>

                        <td className="border-r border-b border-slate-400 dark:border-slate-500 text-center py-1.5" />

                        <td className="border-r border-b border-slate-400 dark:border-slate-500 text-center py-1.5 font-bold text-[11px] text-purple-500">
                          {team.teamWuz.toFixed(1)}%
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* Grand Totals Footer */}
            {teams.length > 0 && (
              <tfoot>
                <tr className="bg-[var(--bg-card)] font-black text-[12px] text-[var(--text-contrast)] dark:text-white">
                  <td 
                    colSpan={2} 
                    className="sticky left-0 z-20 bg-[var(--bg-card)] border-r border-b-2 border-slate-400 dark:border-slate-500 px-[10px] py-2.5 text-left font-black uppercase text-[var(--text-contrast)] dark:text-white"
                    style={{ left: 0, paddingLeft: '10px', paddingRight: '10px' }}
                  >
                    TOTAL ({totalUsersCount} Nhân sự)
                  </td>

                  {/* Grand Project Column Totals */}
                  {projectColumns.map((pCode) => {
                    const pTot = projectColTotals[pCode];
                    return (
                      <td key={pCode} className="border-r border-b-2 border-slate-400 dark:border-slate-500 text-center font-mono font-black text-[12px] text-[var(--text-contrast)] dark:text-white py-2.5">
                        {pTot > 0 ? pTot.toFixed(1) : ''}
                      </td>
                    );
                  })}

                  {/* Grand Week Column Totals */}
                  {weekCols.map((col) => {
                    const wTot = weekColTotals[col.label];
                    return (
                      <td 
                        key={col.label} 
                        className="border-r border-b-2 border-slate-400 dark:border-slate-500 text-center font-mono font-black text-[12px] text-[var(--text-contrast)] dark:text-white py-2.5"
                      >
                        {wTot > 0 ? wTot.toFixed(1) : ''}
                      </td>
                    );
                  })}

                  <td className="border-r border-b-2 border-slate-400 dark:border-slate-500 text-center font-mono font-black text-[12px] text-indigo-500 dark:text-indigo-400 py-2.5">
                    {grandAvgWuz.toFixed(1)}%
                  </td>

                  <td className="border-r border-b-2 border-slate-400 dark:border-slate-500 text-center py-2.5 font-black text-[12px] text-emerald-500 dark:text-emerald-400">
                    AVG: {getUtilizationBadge(grandAvgWuz).label}
                  </td>

                  <td className="border-r border-b-2 border-slate-400 dark:border-slate-500 text-center py-2.5 font-black text-[12px] text-purple-600 dark:text-purple-400">
                    {grandAvgWuz.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
});

export default TimesheetPlusView;
