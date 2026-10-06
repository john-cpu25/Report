import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, getISOWeek, addDays } from 'date-fns';
import { supabase } from '../../supabaseClient';
import { Edit2, Check, RotateCcw } from 'lucide-react';
import { calculateDailyWorkingMinutes } from '../../utils/performanceEngine';
import { getCachedApexTimesheetData, subscribeApexTimesheetData, fetchApexTimesheetData } from '../../services/apexTimesheetCache';

// Master list of all registered active staff across APEX teams
// Canonical Full Names matching the USER column in TimeSheet exactly
const CANONICAL_STAFF_NAMES = {
  'TAM PHAN': 'Tâm Phan',
  'TÂM PHAN': 'Tâm Phan',
  'LINH HUYNH': 'Linh Huynh',
  'TRUNG THE NGUYEN': 'TrungTheNguyen',
  'TRUNGTHENGUYEN': 'TrungTheNguyen',
  'TRUNG THẾ NGUYỄN': 'TrungTheNguyen',
  'KY PHAN': 'Kỳ Phan',
  'KỲ PHAN': 'Kỳ Phan',
  'NHAN NGUYEN': 'Nhân Nguyễn',
  'NHÂN NGUYỄN': 'Nhân Nguyễn',
  'JOHNNY': 'Nhân Nguyễn',
  'NGAN TRAN': 'Ngân Trần',
  'NGÂN TRẦN': 'Ngân Trần',
  'KHIEM NGUYEN': 'Khiêm Nguyễn',
  'KHIÊM NGUYỄN': 'Khiêm Nguyễn',
  'CUONG PHAM': 'Cường Phạm',
  'CƯỜNG PHẠM': 'Cường Phạm',
  'LOC PHAM': 'Loc Pham',
  'LỘC PHẠM': 'Loc Pham',
  'NAM LE': 'Nam Le',
  'NAM LÊ': 'Nam Le',
  'KHANG TRINH': 'Khang Trinh',
  'TRUNG NGUYEN': 'Trung Nguyễn',
  'TRUNG NGUYỄN': 'Trung Nguyễn',
  'HOANG PHAM': 'Hoàng Phạm',
  'HOÀNG PHẠM': 'Hoàng Phạm',
  'NHAN PHAM': 'Nhân Phạm',
  'NHÂN PHẠM': 'Nhân Phạm',
  'DUC PHAM': 'Đức Phạm',
  'ĐỨC PHẠM': 'Đức Phạm',
  'TIEN TRAN': 'Tiến Trần',
  'TIẾN TRẦN': 'Tiến Trần',
  'KHANH NGUYEN': 'Khánh Nguyễn',
  'KHÁNH NGUYỄN': 'Khánh Nguyễn',
  'NGUYEN LY': 'Nguyên Lý',
  'NGUYÊN LÝ': 'Nguyên Lý',
  'NEIL': 'Nguyên Lý',
  'QUAN NGUYEN': 'Quân Nguyễn',
  'QUÂN NGUYỄN': 'Quân Nguyễn',
  'ANH NGUYEN': 'Ánh Nguyễn',
  'ÁNH NGUYỄN': 'Ánh Nguyễn',
  'SON LAM': 'Sơn Lâm',
  'SƠN LÂM': 'Sơn Lâm',
  'BAO PHAM': 'Bảo Phạm',
  'BẢO PHẠM': 'Bảo Phạm',
  'DUNG DO': 'Dũng Đỗ',
  'DŨNG ĐỖ': 'Dũng Đỗ',

  // Short and uppercase variants mapping to canonical full names
  'NHÂN': 'Nhân Nguyễn',
  'NHAN': 'Nhân Nguyễn',
  'NHÂN P.': 'Nhân Phạm',
  'NHÂN P': 'Nhân Phạm',
  'NHAN P.': 'Nhân Phạm',
  'NHAN P': 'Nhân Phạm',
  'ĐỨC': 'Đức Phạm',
  'DUC': 'Đức Phạm',
  'NGUYÊN': 'Nguyên Lý',
  'NGUYEN': 'Nguyên Lý',
  'KHÁNH': 'Khánh Nguyễn',
  'KHANH': 'Khánh Nguyễn',
  'KHIÊM': 'Khiêm Nguyễn',
  'KHIEM': 'Khiêm Nguyễn',
  'KHANG': 'Khang Trinh',
  'TÂM': 'Tâm Phan',
  'TAM': 'Tâm Phan',
  'ÁNH': 'Ánh Nguyễn',
  'ANH': 'Ánh Nguyễn',
  'NAM': 'Nam Le',
  'LỘC': 'Loc Pham',
  'LOC': 'Loc Pham',
  'HOÀNG': 'Hoàng Phạm',
  'HOANG': 'Hoàng Phạm',
  'CƯỜNG': 'Cường Phạm',
  'CUONG': 'Cường Phạm',
  'TIẾN': 'Tiến Trần',
  'TIEN': 'Tiến Trần',
  'TRUNG': 'Trung Nguyễn',
  'NGÂN': 'Ngân Trần',
  'NGAN': 'Ngân Trần',
  'KỲ': 'Kỳ Phan',
  'KY': 'Kỳ Phan',
  'LINH': 'Linh Huynh',
  'SƠN': 'Sơn Lâm',
  'SON': 'Sơn Lâm',
  'BẢO': 'Bảo Phạm',
  'BAO': 'Bảo Phạm',
  'DŨNG': 'Dũng Đỗ',
  'DUNG': 'Dũng Đỗ',
  'QUÂN': 'Quân Nguyễn',
  'QUAN': 'Quân Nguyễn',
  'JASON LE': 'Jason Le',
  'JASON': 'Jason Le',
  'VŨ ĐỖ': 'Vũ Đỗ',
  'VU DO': 'Vũ Đỗ',
  'VŨ': 'Vũ Đỗ',
  'VU': 'Vũ Đỗ',
  'KAMALA TRAN': 'Kamala Tran',
  'KAMALA': 'Kamala Tran'
};

const getCanonicalStaffName = (rawName) => {
  if (!rawName) return 'Unknown';
  const clean = rawName.trim();
  const upper = clean.toUpperCase();
  if (CANONICAL_STAFF_NAMES[upper]) return CANONICAL_STAFF_NAMES[upper];
  return clean;
};

// Master list of all registered active staff across APEX teams with full names
const KNOWN_APEX_USERS = [
  // MODELLING
  { name: 'Nhân Nguyễn', team: 'MODELLING', isLeader: true, isAdmin: true },
  { name: 'Nguyên Lý', team: 'MODELLING', isLeader: true },
  { name: 'Khánh Nguyễn', team: 'MODELLING', isLeader: true },
  { name: 'Quân Nguyễn', team: 'MODELLING' },
  { name: 'Khiêm Nguyễn', team: 'MODELLING' },
  { name: 'Khang Trinh', team: 'MODELLING' },
  { name: 'Tâm Phan', team: 'MODELLING' },

  // PT&REO
  { name: 'Hoàng Phạm', team: 'PT&REO', isLeader: true },
  { name: 'Tiến Trần', team: 'PT&REO', isLeader: true },
  { name: 'Cường Phạm', team: 'PT&REO', isLeader: true },
  { name: 'Ánh Nguyễn', team: 'PT&REO' },
  { name: 'Nam Le', team: 'PT&REO' },
  { name: 'Loc Pham', team: 'PT&REO' },
  { name: 'Trung Nguyễn', team: 'PT&REO' },

  // ENGINEER
  { name: 'Đức Phạm', team: 'ENGINEER', isLeader: true },
  { name: 'Nhân Phạm', team: 'ENGINEER', isLeader: true },
  { name: 'Kỳ Phan', team: 'ENGINEER' },
  { name: 'Dũng Đỗ', team: 'ENGINEER' },
  { name: 'Ngân Trần', team: 'ENGINEER' },
  { name: 'Bảo Phạm', team: 'ENGINEER' },
  { name: 'Trung Thế Nguyễn', team: 'ENGINEER' },

  // ETABS
  { name: 'Sơn Lâm', team: 'ETABS', isLeader: true },
  { name: 'Linh Huynh', team: 'ETABS' }
];

const DEFAULT_ADMIN_MANAGERS = [];
const DEFAULT_ADMINS = ['NHÂN NGUYỄN', 'NHAN NGUYEN', 'VŨ ĐỖ', 'VU DO', 'VU DO NGUYEN', 'VŨ', 'VU'];
const DEFAULT_LEADERS = [
  // MODELLING
  'NGUYÊN LÝ', 'NGUYEN LY',
  'KHÁNH NGUYỄN', 'KHANH NGUYEN',
  // PT&REO
  'HOÀNG PHẠM', 'HOANG PHAM',
  'TIẾN TRẦN', 'TIEN TRAN',
  'CƯỜNG PHẠM', 'CUONG PHAM',
  // ENGINEER
  'ĐỨC PHẠM', 'DUC PHAM',
  'NHÂN PHẠM', 'NHAN PHAM', 'NHÂN P.', 'NHAN P.', 'NHÂN P', 'NHAN P',
  // ETABS
  'SƠN LÂM', 'SON LAM'
];

const getStaffRole = (name, allUsers = []) => {
  if (!name) return 'USER';
  const canonical = getCanonicalStaffName(name);
  const norm = canonical.toUpperCase().trim();
  const rawNorm = (name || '').toUpperCase().trim();

  // 1. Nhân Nguyễn: Admin (BIM Manager)
  if (
    norm === 'NHÂN NGUYỄN' || norm === 'NHAN NGUYEN' ||
    rawNorm === 'NHÂN NGUYỄN' || rawNorm === 'NHAN NGUYEN' ||
    rawNorm === 'NHÂN' || rawNorm === 'NHAN' || rawNorm === 'JOHNNY'
  ) {
    return 'ADMIN';
  }

  // 2. Vũ Đỗ: Admin (Manager)
  if (
    norm === 'VŨ ĐỖ' || norm === 'VU DO' ||
    rawNorm === 'VŨ ĐỖ' || rawNorm === 'VU DO' || rawNorm === 'VU DO NGUYEN' ||
    rawNorm === 'VŨ' || rawNorm === 'VU'
  ) {
    return 'ADMIN';
  }

  // 3. Leaders theo danh sách chuẩn hoá chính xác
  if (
    DEFAULT_LEADERS.some(l => norm === l || norm === l.replace(/\s+/g, '') || rawNorm === l || rawNorm === l.replace(/\s+/g, ''))
  ) {
    return 'LEADER';
  }

  // 4. Find user in allUsers to inspect DB roles and positions
  let dbUser = null;
  if (Array.isArray(allUsers) && allUsers.length > 0) {
    dbUser = allUsers.find(u => {
      const uName = (u?.name || u?.full_name || '').toUpperCase().trim();
      return uName && (uName === norm || getCanonicalStaffName(uName).toUpperCase() === norm || uName === rawNorm);
    });
  }

  const dbRole = (dbUser?.user_role || dbUser?.role || '').toLowerCase();
  const dbPos = (dbUser?.position || '').toLowerCase();
  const isDbAdmin = dbRole === 'admin' || dbRole === 'adminapp';

  if (isDbAdmin) {
    return 'ADMIN';
  }

  if (dbRole.includes('leader') || dbPos.includes('leader')) {
    return 'LEADER';
  }

  return 'USER';
};

const isLeaderStaff = (name, allUsers = []) => {
  const r = getStaffRole(name, allUsers);
  return r === 'ADMIN' || r === 'LEADER' || r === 'MANAGER';
};

const checkStaffInTeam = (staffName, targetTeam, allUsers = [], userTeamByName = {}) => {
  if (!staffName || !targetTeam) return true;
  const target = targetTeam.trim().toLowerCase();
  const canonical = getCanonicalStaffName(staffName);
  const norm = canonical.toUpperCase().trim();
  const rawNorm = (staffName || '').toUpperCase().trim();

  // Exclude Jason Le completely
  if (norm === 'JASON LE' || norm === 'JASON' || rawNorm === 'JASON LE' || rawNorm === 'JASON' || norm.includes('JASON') || rawNorm.includes('JASON')) {
    return false;
  }

  // Special case: Nhân Nguyễn belongs to MODELLING team, not MANAGER team
  if (norm === 'NHÂN NGUYỄN' || norm === 'NHAN NGUYEN' || rawNorm === 'NHÂN NGUYỄN' || rawNorm === 'NHAN NGUYEN') {
    if (target === 'manager' || target === 'management') return false;
    if (target === 'modelling') return true;
  }

  // 1. Check registered known apex users list
  const known = KNOWN_APEX_USERS.find(k => {
    const kn = getCanonicalStaffName(k.name).toUpperCase().trim();
    return kn === norm || kn === rawNorm;
  });
  const knownTeam = (known?.team || '').trim().toLowerCase();

  // 2. Check allUsers list from database
  let dbUser = null;
  if (Array.isArray(allUsers) && allUsers.length > 0) {
    dbUser = allUsers.find(u => {
      const uName = (u?.name || u?.full_name || '').toUpperCase().trim();
      return uName && (uName === norm || getCanonicalStaffName(uName).toUpperCase() === norm || uName === rawNorm);
    });
  }
  const dbTeam = (dbUser?.team || '').trim().toLowerCase();
  const dbRole = (dbUser?.user_role || dbUser?.role || '').toLowerCase();
  const dbPos = (dbUser?.position || '').toLowerCase();

  // 3. Check userTeamByName map
  const mapTeam = (
    userTeamByName[canonical.toLowerCase()] ||
    userTeamByName[staffName.toLowerCase()] ||
    userTeamByName[norm.toLowerCase()] ||
    ''
  ).trim().toLowerCase();

  const userTeam = dbTeam || mapTeam || knownTeam;
  const role = getStaffRole(canonical, allUsers);

  // If filtering by MANAGER:
  if (target === 'manager' || target === 'management') {
    return (
      userTeam === 'manager' ||
      userTeam === 'management' ||
      role === 'MANAGER' ||
      role === 'ADMIN' ||
      dbPos.includes('manager') ||
      dbRole.includes('manager') ||
      DEFAULT_ADMINS.some(a => norm === a || rawNorm === a)
    );
  }

  // Standard production team filtering
  return userTeam === target;
};

const PerformanceTimesheetView = ({
  filteredData = [],
  analystTasks = [],
  dashboardProjects = [],
  dashboardUsers = [],
  dashboardLeave = [],
  getProjectColor = () => '#6366f1',
  selectedTimeMetric = 't2',
  currentDate = new Date(),
  selectedTeam = '',
  selectedProject = '',
  selectedUser = '',
  searchQuery = '',
  rawUsers = [],
  userTeamByName = {}
}) => {
  // Current active week boundaries
  const today = currentDate || new Date();
  const weekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today]);
  const weekEnd = useMemo(() => endOfWeek(today, { weekStartsOn: 1 }), [today]);
  const currentWeek = useMemo(() => getISOWeek(today), [today]);
  const currentYear = useMemo(() => today.getFullYear(), [today]);

  // Persistent user overrides for % Target and Rate Factor
  const [customTargets, setCustomTargets] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_perf_targets');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [customRates, setCustomRates] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_perf_rates');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [customPlanTimes, setCustomPlanTimes] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_perf_plan_times');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [tempValue, setTempValue] = useState('');
  const [editingPlanStaff, setEditingPlanStaff] = useState(null);
  const [tempPlanValue, setTempPlanValue] = useState('');
  const [editingRateStaff, setEditingRateStaff] = useState(null);
  const [tempRateValue, setTempRateValue] = useState('');

  useEffect(() => {
    localStorage.setItem('apex_perf_targets', JSON.stringify(customTargets));
  }, [customTargets]);

  useEffect(() => {
    localStorage.setItem('apex_perf_rates', JSON.stringify(customRates));
  }, [customRates]);

  useEffect(() => {
    localStorage.setItem('apex_perf_plan_times', JSON.stringify(customPlanTimes));
  }, [customPlanTimes]);

  // Timesheet & Supabase state (cached)
  const cached = getCachedApexTimesheetData();
  const [timesheetRecords, setTimesheetRecords] = useState(cached?.timesheetRecords || []);
  const [timesheetTypes, setTimesheetTypes] = useState(cached?.timesheetTypes || []);
  const [apexTasks, setApexTasks] = useState(cached?.apexTasks || []);
  const [apexUsers, setApexUsers] = useState(cached?.apexUsers || []);
  const [apexProjects, setApexProjects] = useState(cached?.apexProjects || []);
  const [apexLeaveSpans, setApexLeaveSpans] = useState(cached?.apexLeaveSpans || []);
  const [apexLeaves, setApexLeaves] = useState(cached?.apexLeaves || []);

  useEffect(() => {
    // If not cached yet, fetch once
    if (!getCachedApexTimesheetData()?.timesheetRecords?.length) {
      fetchApexTimesheetData().then(data => {
        if (data) {
          setTimesheetRecords(data.timesheetRecords || []);
          setTimesheetTypes(data.timesheetTypes || []);
          setApexTasks(data.apexTasks || []);
          setApexUsers(data.apexUsers || []);
          setApexProjects(data.apexProjects || []);
          setApexLeaveSpans(data.apexLeaveSpans || []);
          setApexLeaves(data.apexLeaves || []);
        }
      });
    }

    // Subscribe to cache updates (when user clicks Sync button)
    const unsub = subscribeApexTimesheetData(data => {
      if (data) {
        setTimesheetRecords(data.timesheetRecords || []);
        setTimesheetTypes(data.timesheetTypes || []);
        setApexTasks(data.apexTasks || []);
        setApexUsers(data.apexUsers || []);
        setApexProjects(data.apexProjects || []);
        setApexLeaveSpans(data.apexLeaveSpans || []);
        setApexLeaves(data.apexLeaves || []);
      }
    });

    return () => unsub();
  }, []);

  // Lookup maps
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

  // TimeSheet Type map
  const timeSheetTypeMap = useMemo(() => {
    const map = {};
    (timesheetTypes || []).forEach(t => {
      if (t.id) map[t.id] = t.type;
    });
    return map;
  }, [timesheetTypes]);

  // Shared active non-Australia, non-admin users list
  const allUsersList = useMemo(() => {
    const isAustralia = (u) => {
      const loc = (u?.location || '').toString().toLowerCase();
      return loc.includes('aus') || loc.includes('australia');
    };
    const isAdminUser = (u) => {
      const name = (u?.name || u?.full_name || '').toString().trim().toLowerCase();
      const email = (u?.email || '').toString().trim().toLowerCase();
      return name === 'admin' || name.includes('admin') || email.startsWith('admin') || name.includes('jason') || email.includes('jason');
    };
    return [...(rawUsers || []), ...(dashboardUsers || []), ...(apexUsers || [])].filter(u => !isAustralia(u) && !isAdminUser(u));
  }, [rawUsers, dashboardUsers, apexUsers]);

  // 1. LEAVE ENTRIES FOR THE CURRENT WEEK (From APEX_Leave_Span / APEX_Leave)
  const weeklyLeaveMap = useMemo(() => {
    const lMap = {};
    const userIdToName = {};
    (rawUsers || []).forEach(u => { if (u.id && u.name) userIdToName[u.id] = u.name; });
    (dashboardUsers || []).forEach(u => { if (u.id && u.name) userIdToName[u.id] = u.name; });
    (apexUsers || []).forEach(u => { if (u.id && u.name) userIdToName[u.id] = u.name; });

    if (apexLeaveSpans.length > 0 && apexLeaves.length > 0) {
      const leaveById = {};
      apexLeaves.forEach(l => { leaveById[l.id] = l; });

      apexLeaveSpans.forEach(span => {
        const parentLeave = leaveById[span.leave_id];
        if (!parentLeave || parentLeave.status === 'rejected') return;

        const rawUserName = userIdToName[parentLeave.user_id] || parentLeave.user_id;
        const uName = getCanonicalStaffName(rawUserName);

        try {
          const dStart = parseISO(span.start_at);
          const dEnd = span.end_at ? parseISO(span.end_at) : null;

          if (isWithinInterval(dStart, { start: weekStart, end: weekEnd })) {
            let h = 8;
            if (dEnd) {
              const diffH = Math.abs(dEnd - dStart) / (1000 * 60 * 60);
              h = diffH >= 7 ? 8 : (diffH >= 3 ? 4 : Math.round(diffH));
            }
            lMap[uName] = (lMap[uName] || 0) + h;
          }
        } catch {
          // ignore date parse error
        }
      });
    }

    // Fallback from dashboardLeave
    dashboardLeave.forEach(entry => {
      try {
        if (entry._isApexSpan) {
          const rawUserName = userIdToName[entry.user_id] || entry.user_id;
          const uName = getCanonicalStaffName(rawUserName);
          if (lMap[uName] > 0) return;

          const dStart = parseISO(entry.start_at);
          const dEnd = entry.end_at ? parseISO(entry.end_at) : null;

          if (isWithinInterval(dStart, { start: weekStart, end: weekEnd })) {
            let h = 8;
            if (dEnd) {
              const diffH = Math.abs(dEnd - dStart) / (1000 * 60 * 60);
              h = diffH >= 7 ? 8 : (diffH >= 3 ? 4 : Math.round(diffH));
            }
            lMap[uName] = (lMap[uName] || 0) + h;
          }
          return;
        }

        const uName = getCanonicalStaffName(entry.user_name || entry.name || '');
        if (lMap[uName] > 0) return;

        let leaveHours = 0;
        if (entry.date) {
          const entryDate = parseISO(entry.date);
          if (isWithinInterval(entryDate, { start: weekStart, end: weekEnd })) {
            leaveHours += Number(entry.hours) || (Number(entry.days) ? Number(entry.days) * 8 : 8);
          }
        }
        if (leaveHours > 0) {
          lMap[uName] = (lMap[uName] || 0) + leaveHours;
        }
      } catch {
        // ignore format issues
      }
    });

    return lMap;
  }, [apexLeaveSpans, apexLeaves, dashboardLeave, rawUsers, dashboardUsers, apexUsers, weekStart, weekEnd]);

  // 1b. PLAN TIME & TASK OT FROM Supabase Tasks (Tasks assigned by Leader/Manager in this week)
  const apexTaskStats = useMemo(() => {
    const leaderPlanMap = {};
    const taskOtMap = {};
    const weekEndTime = addDays(weekEnd, 1);

    // Nguồn task: ưu tiên filteredData (đã lọc đúng tuần từ PersonalSpace), sau đó đến analystTasks, fallback sang apexTasks
    const taskPool = (filteredData && filteredData.length > 0)
      ? filteredData
      : (analystTasks && analystTasks.length > 0)
      ? analystTasks
      : (apexTasks || []);

    taskPool.forEach(t => {
      // 1. Kiểm tra ngày thuộc tuần hiện tại (khi dùng analystTasks hoặc apexTasks)
      let isInWeek = true;
      if (t.dateObj) {
        isInWeek = isWithinInterval(t.dateObj, { start: weekStart, end: weekEnd });
      } else {
        const rangeStart = t.planned_start || t.date_start || t.created_at;
        const rangeEnd = t.planned_end || t.date_end || rangeStart;
        if (rangeStart) {
          const sDate = new Date(rangeStart);
          const eDate = rangeEnd ? new Date(rangeEnd) : sDate;
          isInWeek = !(isNaN(sDate.getTime()) || sDate >= weekEndTime || eDate < weekStart);
        }
      }
      if (!isInWeek) return;

      // 2. Xác định Người thực hiện (Assignee)
      const rawAssignee = t.userName || (userMap[t.assigned_to_id]?.name || t.assigned_to || '');
      if (!rawAssignee) return;
      const staffName = getCanonicalStaffName(rawAssignee);
      if (staffName.toLowerCase() === 'admin' || staffName.toLowerCase().includes('admin') || staffName.toUpperCase() === 'UNKNOWN') return;

      // 3. Xác định Người giao việc (Leader / Manager)
      const rawCreator = t.createdBy || (userMap[t.create_by_id]?.name || t.create_by || '');
      const creatorName = getCanonicalStaffName(rawCreator);
      const creatorRole = getStaffRole(creatorName, allUsersList);
      // Giao task bởi Leader, Manager, Admin hoặc người giao khác người nhận
      const isLeaderOrManager = creatorRole === 'LEADER' || 
                                creatorRole === 'MANAGER' || 
                                creatorRole === 'ADMIN' || 
                                (creatorName && staffName && creatorName.toLowerCase() !== staffName.toLowerCase());

      // 4. Lấy số giờ PLAN TIME: chuẩn xác theo hours_planned hoặc t1/3600 (giống hệt tab LIST)
      let taskPlannedHours = 0;
      if (t.hours_planned !== null && t.hours_planned !== undefined && t.hours_planned !== '' && !isNaN(Number(t.hours_planned)) && Number(t.hours_planned) > 0) {
        taskPlannedHours = Number(t.hours_planned);
      } else if (t.t1 && Number(t.t1) > 0) {
        taskPlannedHours = Number(t.t1) / 3600;
      } else if (t.planned_start && t.planned_end) {
        const breakdown = calculateDailyWorkingMinutes(t.planned_start, t.planned_end);
        let weekMins = 0;
        Object.entries(breakdown).forEach(([dateStr, mins]) => {
          const d = new Date(dateStr);
          if (d >= weekStart && d < weekEndTime) {
            weekMins += mins;
          }
        });
        taskPlannedHours = weekMins > 0 ? (weekMins / 60) : 0;
      }

      if (isLeaderOrManager && taskPlannedHours > 0) {
        leaderPlanMap[staffName] = (leaderPlanMap[staffName] || 0) + taskPlannedHours;
      }

      const taskOt = Number(t.hours_ot) || 0;
      if (taskOt > 0) {
        taskOtMap[staffName] = (taskOtMap[staffName] || 0) + taskOt;
      }
    });

    return { leaderPlanMap, taskOtMap };
  }, [filteredData, analystTasks, apexTasks, userMap, weekStart, weekEnd, allUsersList]);

  // 2. PARSE TIMESHEET DATA: PROJECT TIME & STAFF HOURS directly from APEX_TimeSheet & APEX_TimeSheetType
  const timesheetAggregated = useMemo(() => {
    const staffHoursMap = {};
    const staffProjectMap = {};
    const staffApexMap = {};
    const staffLearningMap = {};
    const staffApexTimeMap = {};   // APEX TIME: project=APEX, type=MANAGEMENT/R&D/TRAINING
    const staffLeaveTimesheetMap = {}; // LEAVE from timesheet: project=APEX, type=ANNUAL LEAVE
    const staffOtMap = {};
    const staffWeekendMap = {};
    const projectHoursMap = {};

    const weekRecords = timesheetRecords.filter(r => 
      Number(r.week) === currentWeek && 
      (Number(r.year) === currentYear || !r.year)
    );

    const weekEndTime = addDays(weekEnd, 1);

    if (weekRecords.length > 0) {
      weekRecords.forEach(record => {
        const mon = Number(record.mon) || 0;
        const tue = Number(record.tue) || 0;
        const wed = Number(record.wed) || 0;
        const thu = Number(record.thu) || 0;
        const fri = Number(record.fri) || 0;
        const sat = Number(record.sat) || 0;
        const sun = Number(record.sun) || 0;
        const rowHours = mon + tue + wed + thu + fri + sat + sun;
        if (rowHours <= 0) return;

        const userObj = userMap[record.user_id];
        const projObj = projectMap[record.project_id];

        const userLoc = (userObj?.location || '').toString().toLowerCase();
        // Bỏ location bên Úc (Australia)
        if (userLoc.includes('aus') || userLoc.includes('australia')) return;

        const userName = (userObj?.name || userObj?.full_name || record.user_id || 'Unknown').toString().trim();
        const userTeam = (userObj?.team || userTeamByName[userName] || '').toString().trim().toUpperCase();
        const staffName = getCanonicalStaffName(userName);
        if (userName.toLowerCase() === 'admin' || staffName.toLowerCase() === 'admin' || userName.toLowerCase().includes('admin') || staffName.toLowerCase().includes('admin')) return;
        const projectKey = (projObj?.key || projObj?.code || projObj?.name || 'UNASSIGNED').toString().trim().toUpperCase();
        const projectFullName = (projObj?.name || projectKey).toString().trim().toUpperCase();
        const taskTypeName = (timeSheetTypeMap[record.kind] || '').toString().trim().toUpperCase();

        // 1. Team filter
        if (selectedTeam) {
          if (!checkStaffInTeam(staffName, selectedTeam, allUsersList, userTeamByName)) return;
        }

        // 2. Project filter
        if (selectedProject) {
          const selP = selectedProject.trim().toLowerCase();
          const matchProj = projectKey.toLowerCase() === selP ||
                            projectFullName.toLowerCase() === selP ||
                            projectFullName.toLowerCase().includes(selP) ||
                            projectKey.toLowerCase().includes(selP);
          if (!matchProj) return;
        }

        // 3. User / Member filter
        if (selectedUser) {
          const selU = selectedUser.trim().toLowerCase();
          if (userName.toLowerCase() !== selU && staffName.toLowerCase() !== selU) return;
        }

        // 4. Search text filter
        if (searchQuery) {
          const q = searchQuery.trim().toLowerCase();
          const matchSearch = userName.toLowerCase().includes(q) ||
                              staffName.toLowerCase().includes(q) ||
                              projectKey.toLowerCase().includes(q) ||
                              projectFullName.toLowerCase().includes(q) ||
                              taskTypeName.toLowerCase().includes(q) ||
                              userTeam.toLowerCase().includes(q);
          if (!matchSearch) return;
        }

        const isApex = projectKey === 'APEX' || projectFullName === 'APEX' || projectKey.startsWith('APEX');
        const cleanType = taskTypeName.replace(/\s+/g, '');
        const isLeave = cleanType === 'ANNUALLEAVE' || cleanType === 'LEAVE' || cleanType === 'SICKLEAVE' || taskTypeName.includes('ANNUAL LEAVE');
        const isLearning = cleanType === 'LEARNING' || taskTypeName.includes('LEARNING');
        const isApexTime = isApex && (
          cleanType === 'MANAGEMENT' || 
          cleanType === 'R&D' || 
          cleanType === 'TRAINING' || 
          cleanType.includes('RESEARCH') || 
          taskTypeName.includes('MANAGEMENT') || 
          taskTypeName.includes('TRAINING') ||
          (!isLeave && !isLearning)
        );

        staffHoursMap[staffName] = (staffHoursMap[staffName] || 0) + rowHours;
        projectHoursMap[projectKey] = (projectHoursMap[projectKey] || 0) + rowHours;

        const weekendHours = sat + sun;
        if (weekendHours > 0) {
          staffWeekendMap[staffName] = (staffWeekendMap[staffName] || 0) + weekendHours;
        }

        if (isApex && !isLeave) {
          // All APEX non-leave hours (for backwards compat aggregation)
          staffApexMap[staffName] = (staffApexMap[staffName] || 0) + rowHours;
        } else if (!isApex && !isLeave) {
          // WORK TIME: Lấy hết time từ project ngoại trừ APEX
          staffProjectMap[staffName] = (staffProjectMap[staffName] || 0) + rowHours;
        }

        // FREE TIME: project=APEX, type=LEARNING
        if (isApex && isLearning) {
          staffLearningMap[staffName] = (staffLearningMap[staffName] || 0) + rowHours;
        }

        // APEX TIME: project=APEX, type=MANAGEMENT/R&D/TRAINING
        if (isApex && isApexTime && !isLearning && !isLeave) {
          staffApexTimeMap[staffName] = (staffApexTimeMap[staffName] || 0) + rowHours;
        }

        // LEAVE from timesheet: project=APEX, type=ANNUAL LEAVE
        if (isApex && isLeave) {
          staffLeaveTimesheetMap[staffName] = (staffLeaveTimesheetMap[staffName] || 0) + rowHours;
        }
      });
    } else {
      // Fallback: If APEX_TimeSheet has not been populated yet, read directly from APEX_Task for this week
      apexTasks.forEach(t => {
        let rangeStart = t.planned_start;
        let rangeEnd = t.planned_end;
        if (selectedTimeMetric === 't2') {
          rangeEnd = t.checked_at || t.completed_at || t.planned_end;
        } else if (selectedTimeMetric === 't4') {
          rangeStart = t.started_at || t.planned_start;
          rangeEnd = t.checked_at || t.completed_at || t.planned_end;
        } else if (selectedTimeMetric === 't5') {
          rangeStart = t.completed_at || t.planned_start;
          rangeEnd = t.checked_at || t.completed_at || t.planned_end;
        }

        if (!rangeStart) return;
        const sDate = new Date(rangeStart);
        const eDate = rangeEnd ? new Date(rangeEnd) : sDate;
        if (isNaN(sDate.getTime()) || sDate >= weekEndTime || eDate < weekStart) return;

        const projObj = projectMap[t.project_id];
        const projectKey = (projObj?.key || projObj?.code || projObj?.name || 'UNASSIGNED').toString().trim().toUpperCase();
        const projectFullName = (projObj?.name || projectKey).toString().trim().toUpperCase();
        const isApex = projectKey === 'APEX' || projectFullName === 'APEX' || projectKey.startsWith('APEX');

        const uId = t.assigned_to_id || t.create_by_id;
        const userObj = userMap[uId];
        const userLoc = (userObj?.location || '').toString().toLowerCase();
        if (userLoc.includes('aus') || userLoc.includes('australia')) return;

        const userName = (userObj?.name || userObj?.full_name || 'Unknown').toString().trim();
        const userTeam = (userObj?.team || userTeamByName[userName] || t.team || '').toString().trim().toUpperCase();
        const staffName = getCanonicalStaffName(userName);
        if (userName.toLowerCase() === 'admin' || staffName.toLowerCase() === 'admin' || userName.toLowerCase().includes('admin') || staffName.toLowerCase().includes('admin')) return;

        if (selectedTeam && !checkStaffInTeam(staffName, selectedTeam, allUsersList, userTeamByName)) return;
        if (selectedUser && userName.toLowerCase() !== selectedUser.trim().toLowerCase() && staffName.toLowerCase() !== selectedUser.trim().toLowerCase()) return;
        if (selectedProject) {
          const selP = selectedProject.trim().toLowerCase();
          if (projectKey.toLowerCase() !== selP && projectFullName.toLowerCase() !== selP && !projectFullName.toLowerCase().includes(selP) && !projectKey.toLowerCase().includes(selP)) return;
        }
        if (searchQuery) {
          const q = searchQuery.trim().toLowerCase();
          if (!userName.toLowerCase().includes(q) && !staffName.toLowerCase().includes(q) && !projectKey.toLowerCase().includes(q)) return;
        }

        const breakdown = calculateDailyWorkingMinutes(rangeStart, rangeEnd);
        let taskWeekMinutes = 0;
        Object.entries(breakdown).forEach(([dateStr, mins]) => {
          const d = new Date(dateStr);
          if (d >= weekStart && d < weekEndTime) {
            taskWeekMinutes += mins;
          }
        });

        const taskHours = taskWeekMinutes > 0 ? (taskWeekMinutes / 60) : 0;
        const taskOt = Number(t.hours_ot) || 0;

        const taskTypeStr = (t.type || t.kind || t.task_type || t.name || '').toString().trim().toUpperCase();
        const cleanType = taskTypeStr.replace(/\s+/g, '');
        const isLeave = cleanType === 'ANNUALLEAVE' || taskTypeStr.includes('ANNUAL LEAVE') || cleanType === 'LEAVE';
        const isLearning = cleanType === 'LEARNING' || taskTypeStr.includes('LEARNING') || projectKey === 'LEARNING' || projectKey.includes('LEARNING');
        const isApexTime = isApex && (
          cleanType === 'MANAGEMENT' || 
          cleanType === 'R&D' || 
          cleanType === 'TRAINING' || 
          cleanType.includes('RESEARCH') || 
          taskTypeStr.includes('MANAGEMENT') || 
          taskTypeStr.includes('TRAINING') ||
          (!isLeave && !isLearning)
        );

        if (taskHours > 0) {
          staffHoursMap[staffName] = (staffHoursMap[staffName] || 0) + taskHours;
          staffOtMap[staffName] = (staffOtMap[staffName] || 0) + taskOt;
          projectHoursMap[projectKey] = (projectHoursMap[projectKey] || 0) + taskHours;

          if (isApex && !isLeave) {
            staffApexMap[staffName] = (staffApexMap[staffName] || 0) + taskHours;
          } else if (!isLeave) {
            staffProjectMap[staffName] = (staffProjectMap[staffName] || 0) + taskHours;
          }

          if (isApex && isApexTime && !isLearning && !isLeave) {
            staffApexTimeMap[staffName] = (staffApexTimeMap[staffName] || 0) + taskHours;
          }

          if (isApex && isLearning) {
            staffLearningMap[staffName] = (staffLearningMap[staffName] || 0) + taskHours;
          }

          if (isApex && isLeave) {
            staffLeaveTimesheetMap[staffName] = (staffLeaveTimesheetMap[staffName] || 0) + taskHours;
          }
        }
      });
    }

    return { staffHoursMap, staffProjectMap, staffApexMap, staffLearningMap, staffApexTimeMap, staffLeaveTimesheetMap, staffOtMap, staffWeekendMap, projectHoursMap };
  }, [timesheetRecords, timesheetTypes, timeSheetTypeMap, apexTasks, userMap, projectMap, currentWeek, currentYear, weekStart, weekEnd, selectedTimeMetric, selectedTeam, selectedProject, selectedUser, searchQuery, allUsersList, userTeamByName]);

  // 3. PROJECT TIME TABLE DATA
  const projectTimeData = useMemo(() => {
    const { projectHoursMap } = timesheetAggregated;
    let totalAllHours = 0;

    let rows = Object.entries(projectHoursMap).map(([pKey, hours]) => {
      return {
        key: pKey,
        hours,
        color: getProjectColor(pKey)
      };
    });

    if (selectedProject) {
      const selP = selectedProject.trim().toLowerCase();
      rows = rows.filter(r => r.key.toLowerCase() === selP || r.key.toLowerCase().includes(selP));
    }

    if (searchQuery) {
      const q = searchQuery.trim().toLowerCase();
      rows = rows.filter(r => r.key.toLowerCase().includes(q));
    }

    rows.sort((a, b) => b.hours - a.hours);
    rows.forEach(r => {
      // Vẫn show đủ APEX time, nhưng chỗ total sẽ không có giờ APEX
      if ((r.key || '').trim().toUpperCase() !== 'APEX') {
        totalAllHours += r.hours;
      }
    });

    return { rows, totalHours: totalAllHours };
  }, [timesheetAggregated, getProjectColor, selectedProject, searchQuery]);

  // 4. TEAM CAPACITY & PERFORMANCE DATA
  const teamPerformanceData = useMemo(() => {
    const { staffHoursMap, staffProjectMap, staffApexMap, staffLearningMap, staffApexTimeMap, staffLeaveTimesheetMap, staffOtMap, staffWeekendMap } = timesheetAggregated;

    const selTeamNorm = (selectedTeam || '').trim().toLowerCase();

    const staffSet = new Set();
    const staffOrdered = [];

    const addStaff = (staffName) => {
      if (!staffName) return;
      const canonical = getCanonicalStaffName(staffName);
      const cleanUpper = canonical.trim().toUpperCase();
      if (
        cleanUpper === 'UNKNOWN' ||
        cleanUpper === 'ADMIN' ||
        cleanUpper.includes('ADMIN') ||
        cleanUpper === 'JASON LE' ||
        cleanUpper === 'JASON' ||
        cleanUpper.includes('JASON')
      ) return;
      if (!staffSet.has(cleanUpper)) {
        staffSet.add(cleanUpper);
        staffOrdered.push(canonical);
      }
    };

    if (selTeamNorm) {
      // 1. Registered known apex users belonging to this team
      KNOWN_APEX_USERS.forEach(u => {
        if (checkStaffInTeam(u.name, selTeamNorm, allUsersList, userTeamByName)) {
          addStaff(getCanonicalStaffName(u.name));
        }
      });

      // 2. Active database users belonging to this team
      allUsersList.forEach(u => {
        if (u.name && checkStaffInTeam(u.name, selTeamNorm, allUsersList, userTeamByName)) {
          addStaff(getCanonicalStaffName(u.name));
        }
      });

      // 3. User team mapping table
      Object.keys(userTeamByName || {}).forEach(uName => {
        if (checkStaffInTeam(uName, selTeamNorm, allUsersList, userTeamByName)) {
          addStaff(getCanonicalStaffName(uName));
        }
      });

      // 4. Default admin/managers if filtering by manager
      DEFAULT_ADMINS.forEach(adm => {
        const cName = getCanonicalStaffName(adm);
        if (checkStaffInTeam(cName, selTeamNorm, allUsersList, userTeamByName)) {
          addStaff(cName);
        }
      });

      // 5. Staff with logged hours ONLY if they belong to this filtered team
      Object.keys(staffHoursMap).forEach(dName => {
        if (staffHoursMap[dName] > 0 && checkStaffInTeam(dName, selTeamNorm, allUsersList, userTeamByName)) {
          addStaff(getCanonicalStaffName(dName));
        }
      });

      // 6. Staff with plan time ONLY if they belong to this filtered team
      Object.keys(apexTaskStats.leaderPlanMap || {}).forEach(dName => {
        if (apexTaskStats.leaderPlanMap[dName] > 0 && checkStaffInTeam(dName, selTeamNorm, allUsersList, userTeamByName)) {
          addStaff(getCanonicalStaffName(dName));
        }
      });
    } else {
      KNOWN_APEX_USERS.forEach(u => {
        addStaff(getCanonicalStaffName(u.name));
      });
      allUsersList.forEach(u => {
        const uTeam = (u.team || '').trim();
        if (u.name && uTeam && uTeam.toUpperCase() !== 'MANAGER') {
          addStaff(getCanonicalStaffName(u.name));
        }
      });
      Object.keys(staffHoursMap).forEach(dName => {
        if (staffHoursMap[dName] > 0) addStaff(getCanonicalStaffName(dName));
      });
      Object.keys(apexTaskStats.leaderPlanMap || {}).forEach(dName => {
        if (apexTaskStats.leaderPlanMap[dName] > 0) addStaff(getCanonicalStaffName(dName));
      });
    }

    const rows = staffOrdered.map(staffName => {
      const role = getStaffRole(staffName, allUsersList);
      const isAdminRole = role === 'ADMIN' || role === 'MANAGER';
      const defaultRatio = isAdminRole ? 50 : 85;
      const targetPercent = customTargets[staffName] !== undefined ? customTargets[staffName] : defaultRatio;

      // Leave hours from Supabase database + timesheet APEX ANNUAL LEAVE entries
      const leaveFromDB = weeklyLeaveMap[staffName] || 0;
      const leaveFromTimesheet = staffLeaveTimesheetMap[staffName] || 0;
      // Use whichever is greater to avoid double counting
      const leaveHours = Math.max(leaveFromDB, leaveFromTimesheet);

      // Available capacity: 40h standard minus leave
      const weekCapacity = Math.max(0, 40 - leaveHours);

      // Total target billable hours
      const targetTotalHours = (weekCapacity * targetPercent) / 100;

      // PLAN TIME: Leader / Manager giao task trong tuần/ngày đó, lấy từ Supabase (APEX_Task)
      const leaderPlanHours = apexTaskStats.leaderPlanMap[staffName] || 0;
      const customPlan = customPlanTimes[staffName];
      const hasCustomPlan = customPlan !== undefined && customPlan !== '' && !isNaN(Number(customPlan));
      const planTime = hasCustomPlan ? Number(customPlan) : (leaderPlanHours > 0 ? leaderPlanHours : 0);

      // WORK TIME: Lấy hết time từ các dự án (ngoại trừ APEX)
      const workTime = staffProjectMap[staffName] || 0;
      const projectTime = workTime;

      // APEX TIME: project=APEX, type=MANAGEMENT/R&D/TRAINING
      const apexTime = staffApexTimeMap[staffName] || 0;

      // FREE TIME: project=APEX, type=LEARNING only
      const freeTime = staffLearningMap[staffName] || 0;

      // Legacy learningTime (kept for compat)
      const learningTime = freeTime;

      // Overtime:
      // 1) Giờ OT từ cột hours_ot trong APEX_Task (Supabase)
      // 2) Giờ làm việc Thứ 7 & Chủ Nhật (sat + sun) từ APEX_TimeSheet
      // 3) Phần giờ làm việc vượt quá 40h/tuần
      const taskOt = apexTaskStats.taskOtMap[staffName] || (staffOtMap[staffName] || 0);
      const weekendOt = staffWeekendMap?.[staffName] || 0;
      const excessOt = Math.max(0, workTime - 40);
      const overTime = Math.max(taskOt, weekendOt + excessOt);

      // 1. UTILIZATION RATE = ( WORK TIME + APEX TIME + OVER TIME ) / WEEK
      const utilizationRate = weekCapacity > 0
        ? ((workTime + apexTime + overTime) / weekCapacity) * 100
        : 0;

      // 2. EFFICIENCY = ( WORK TIME + OVER TIME ) / PLAN TIME
      const efficiency = planTime > 0
        ? ((workTime + overTime) / planTime) * 100
        : 0;

      return {
        staff: staffName,
        role,
        weekCapacity,
        targetPercent,
        targetTotalHours,
        planTime,
        workTime,
        projectTime,
        apexTime,
        learningTime,
        freeTime,
        leaveHours,
        overTime,
        utilizationRate,
        rateVal: null,
        efficiency
      };
    });

    const PREFERRED_PRIORITY = [
      'Nhân Nguyễn', 'Nguyên Lý', 'Khánh Nguyễn', 'Quân Nguyễn', 'Khiêm Nguyễn',
      'Khang Trinh', 'Tâm Phan', 'Ánh Nguyễn', 'Nam Le', 'Loc Pham',
      'Hoàng Phạm', 'Cường Phạm', 'Tiến Trần', 'Trung Nguyễn', 'Trung Thế Nguyễn',
      'Đức Phạm', 'Bảo Phạm', 'Sơn Lâm', 'Dũng Đỗ', 'Kỳ Phan', 'Ngân Trần', 'Nhân Phạm', 'Linh Huynh'
    ];

    // Sort: MANAGER first (Ruby Lấp Lánh), then ADMIN (Vàng Hoàng Kim), then LEADER (Bạch Kim), then active hours descending, then priority list
    rows.sort((a, b) => {
      const roleRank = { 'MANAGER': 1, 'ADMIN': 2, 'LEADER': 3, 'USER': 4 };
      const rankA = roleRank[a.role] || 4;
      const rankB = roleRank[b.role] || 4;
      if (rankA !== rankB) return rankA - rankB;

      const aActive = a.workTime + a.apexTime + a.freeTime;
      const bActive = b.workTime + b.apexTime + b.freeTime;
      if (aActive > 0 && bActive === 0) return -1;
      if (aActive === 0 && bActive > 0) return 1;
      if (aActive > 0 && bActive > 0 && Math.abs(bActive - aActive) > 0.01) {
        return bActive - aActive;
      }

      const idxA = PREFERRED_PRIORITY.indexOf(a.staff);
      const idxB = PREFERRED_PRIORITY.indexOf(b.staff);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.staff.localeCompare(b.staff);
    });

    // Filter rows based on selectedTeam, selectedUser, searchQuery, and selectedProject (never show admin, jason le)
    let filteredRows = rows.filter(r => {
      const u = r.staff.trim().toUpperCase();
      return (
        u !== 'ADMIN' &&
        !u.includes('ADMIN') &&
        u !== 'UNKNOWN' &&
        u !== 'JASON LE' &&
        u !== 'JASON' &&
        !u.includes('JASON')
      );
    });

    if (selectedTeam) {
      filteredRows = filteredRows.filter(r => checkStaffInTeam(r.staff, selectedTeam, allUsersList, userTeamByName));
    }
    if (selectedUser) {
      const selU = selectedUser.trim().toLowerCase();
      const selDName = getCanonicalStaffName(selectedUser).trim().toLowerCase();
      filteredRows = filteredRows.filter(r => {
        const staffNorm = r.staff.trim().toLowerCase();
        return staffNorm === selU || staffNorm === selDName || staffNorm.includes(selU) || selU.includes(staffNorm);
      });
    }

    if (searchQuery) {
      const q = searchQuery.trim().toLowerCase();
      filteredRows = filteredRows.filter(r => r.staff.toLowerCase().includes(q));
    }

    if (selectedProject) {
      const isSelApex = selectedProject.trim().toUpperCase() === 'APEX';
      if (isSelApex) {
        filteredRows = filteredRows.filter(r => (r.apexTime > 0 || r.freeTime > 0));
      } else {
        filteredRows = filteredRows.filter(r => r.workTime > 0);
      }
    }

    // Grand totals
    const totals = filteredRows.reduce((acc, curr) => ({
      weekCapacity: acc.weekCapacity + curr.weekCapacity,
      targetTotalHours: acc.targetTotalHours + curr.targetTotalHours,
      planTime: acc.planTime + curr.planTime,
      workTime: acc.workTime + curr.workTime,
      projectTime: acc.projectTime + curr.projectTime,
      apexTime: acc.apexTime + curr.apexTime,
      learningTime: acc.learningTime + curr.learningTime,
      freeTime: acc.freeTime + curr.freeTime,
      leaveHours: acc.leaveHours + curr.leaveHours,
      overTime: acc.overTime + curr.overTime,
      totalAttendanceHours: acc.totalAttendanceHours + (curr.workTime + curr.apexTime + curr.freeTime + curr.overTime + curr.leaveHours)
    }), { weekCapacity: 0, targetTotalHours: 0, planTime: 0, workTime: 0, projectTime: 0, apexTime: 0, learningTime: 0, freeTime: 0, leaveHours: 0, overTime: 0, totalAttendanceHours: 0 });

    const totalUtilizationRate = totals.weekCapacity > 0
      ? ((totals.workTime + totals.apexTime + totals.overTime) / totals.weekCapacity) * 100
      : 0;

    const totalEfficiency = totals.planTime > 0
      ? ((totals.workTime + totals.overTime) / totals.planTime) * 100
      : 0;

    return { rows: filteredRows, totals, totalUtilizationRate, totalEfficiency };
  }, [timesheetAggregated, apexTaskStats, customTargets, customRates, customPlanTimes, weeklyLeaveMap, selectedTeam, selectedProject, selectedUser, searchQuery, allUsersList, userTeamByName]);

  // 5. LEAVE BREAKDOWN TABLE (Staff with leave > 0)
  const leaveTableData = useMemo(() => {
    return teamPerformanceData.rows
      .filter(r => r.leaveHours > 0)
      .map(r => ({
        staff: r.staff,
        leaveHours: r.leaveHours,
        targetPercent: r.targetPercent,
        lostCapacity: (r.leaveHours * r.targetPercent) / 100
      }));
  }, [teamPerformanceData]);

  // Export CSV matching Excel layout
  const handleExportCSV = () => {
    const lines = [];
    lines.push(`APEX TIME SHEET PERFORMANCE & CAPACITY REPORT`);
    lines.push(`Week: ${format(weekStart, 'dd/MM/yyyy')} - ${format(weekEnd, 'dd/MM/yyyy')}`);
    lines.push('');

    lines.push('PROJECT TIME,,,TEAM CAPACITY,,,,PLAN TIME,WORK TIME,APEX TIME,FREE TIME,LEAVE,OVER TIME,UTILIZATION RATE,EFFICIENCY');
    lines.push('PROJECT,HOURS,,STAFF,WEEK,%,TOTAL,HOURS,HOURS,HOURS,HOURS,HOURS,HOURS,%,%');

    const maxRows = Math.max(projectTimeData.rows.length, teamPerformanceData.rows.length);
    for (let i = 0; i < maxRows; i++) {
      const p = projectTimeData.rows[i];
      const t = teamPerformanceData.rows[i];

      const pCol = p ? `"${p.key}",${p.hours.toFixed(2)}` : ',';
      const tCol = t 
        ? `,"${t.staff}",${t.weekCapacity.toFixed(1)},${t.targetPercent}%,${t.targetTotalHours.toFixed(1)},${t.planTime.toFixed(1)},${t.workTime.toFixed(1)},${t.apexTime > 0 ? t.apexTime.toFixed(1) : ''},${t.freeTime > 0 ? t.freeTime.toFixed(1) : ''},${t.leaveHours > 0 ? t.leaveHours.toFixed(1) : ''},${t.overTime > 0 ? t.overTime.toFixed(1) : ''},${t.utilizationRate.toFixed(1)}%,${t.efficiency.toFixed(1)}%`
        : ',,,,,,,,,,,';

      lines.push(`${pCol},${tCol}`);
    }

    lines.push(`TOTAL,${projectTimeData.totalHours.toFixed(2)},,TOTAL,${teamPerformanceData.totals.weekCapacity.toFixed(1)},-,${teamPerformanceData.totals.targetTotalHours.toFixed(1)},${teamPerformanceData.totals.planTime.toFixed(1)},${teamPerformanceData.totals.workTime.toFixed(1)},${teamPerformanceData.totals.apexTime > 0 ? teamPerformanceData.totals.apexTime.toFixed(1) : '-'},${teamPerformanceData.totals.freeTime.toFixed(1)},${teamPerformanceData.totals.leaveHours.toFixed(1)},${teamPerformanceData.totals.overTime.toFixed(1)},${teamPerformanceData.totalUtilizationRate.toFixed(1)}%,${teamPerformanceData.totalEfficiency.toFixed(1)}%`);

    if (leaveTableData.length > 0) {
      lines.push('');
      lines.push('LEAVE');
      lines.push('STAFF,HOURS,%,LOST CAPACITY');
      leaveTableData.forEach(l => {
        lines.push(`"${l.staff}",${l.leaveHours.toFixed(1)},${l.targetPercent}%,${l.lostCapacity.toFixed(1)}`);
      });
    }

    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `APEX_Performance_Timesheet_${format(weekStart, 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-in fade-in duration-300 h-full flex flex-col min-h-0 overflow-hidden">
      {/* ── MAIN TABLES: 2-COLUMN LAYOUT MATCHING EXCEL (Identical form to PerformanceView) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)] gap-[10px] items-stretch flex-1 min-h-0 h-full overflow-hidden">
        
        {/* ── LEFT COLUMN: PROJECT TIME TABLE (Compact ~290px width) ── */}
        <div className="personal-table-wrapper rounded-2xl border border-[var(--border)] overflow-hidden shadow-md bg-[var(--bg-card)] flex flex-col h-full min-h-0">
          <div className="overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 min-h-0">
            <table className="w-full text-left border-separate border-spacing-0">
              <colgroup>
                <col style={{ width: '62%' }} />
                <col style={{ width: '38%' }} />
              </colgroup>

              {/* Header 1: PROJECT TIME */}
              <thead>
                <tr className="th-primary dark:text-white">
                  <th 
                    colSpan={2} 
                    className="sticky top-0 z-20 h-[48px] text-center text-[14px] font-black uppercase tracking-widest text-[var(--text-contrast)] dark:text-white border-b border-[var(--border)] bg-[var(--bg-card)] align-middle relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-slate-500/10 pointer-events-none" />
                    <span className="relative z-10">PROJECT TIME</span>
                  </th>
                </tr>
                {/* Header 2: Sub-headers */}
                <tr className="th-secondary dark:text-white border-b border-[var(--border)]">
                  <th 
                    className="sticky top-[48px] z-20 h-[36px] text-left border-r border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-[var(--text-contrast)] dark:text-white bg-[var(--bg-card)] align-middle" 
                    style={{ paddingLeft: '16px', paddingRight: '12px' }}
                  >
                    PROJECT
                  </th>
                  <th 
                    className="sticky top-[48px] z-20 h-[36px] text-right border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-[var(--text-contrast)] dark:text-white bg-[var(--bg-card)] align-middle" 
                    style={{ paddingRight: '16px', paddingLeft: '12px' }}
                  >
                    HOURS
                  </th>
                </tr>
              </thead>

              {/* Data rows */}
              <tbody className="divide-y divide-[var(--border)]">
                {projectTimeData.rows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="sys-py text-center text-sm text-[var(--text-muted)] font-medium border-b border-[var(--border)] py-8">
                      No project hours logged in TimeSheet for this week
                    </td>
                  </tr>
                ) : (
                  projectTimeData.rows.map((p, idx) => (
                    <tr 
                      key={idx} 
                      className="transition-all duration-200 text-[14px] align-middle hover:bg-[var(--bg-surface)] group cursor-default"
                    >
                      {/* Project Name */}
                      <td 
                        className="sys-py text-left border-r border-b border-[var(--border)] truncate max-w-[170px]"
                        style={{ paddingLeft: '16px', paddingRight: '12px', verticalAlign: 'middle' }}
                      >
                        <span 
                          className="text-[13px] font-semibold tracking-wide uppercase line-clamp-1"
                          style={{ color: p.color }}
                        >
                          {p.key}
                        </span>
                      </td>
                      {/* Hours in bold red font as per Excel */}
                      <td 
                        className="sys-py text-right font-mono font-bold text-rose-600 dark:text-rose-400 border-b border-[var(--border)]"
                        style={{ paddingRight: '16px', paddingLeft: '12px', verticalAlign: 'middle' }}
                      >
                        {p.hours.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Footer Total */}
              <tfoot>
                <tr className="bg-[var(--bg-surface)] font-black text-[14px] border-t-2 border-[var(--border)] sticky bottom-0 z-10">
                  <td 
                    className="sys-py text-left uppercase tracking-wider border-r border-[var(--border)] text-[var(--text-contrast)]"
                    style={{ paddingLeft: '16px', paddingRight: '12px', verticalAlign: 'middle' }}
                  >
                    TOTAL
                  </td>
                  <td 
                    className="sys-py text-right font-mono font-black text-rose-600 dark:text-rose-400 text-[14px]"
                    style={{ paddingRight: '16px', paddingLeft: '12px', verticalAlign: 'middle' }}
                  >
                    {projectTimeData.totalHours.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── RIGHT COLUMN: TEAM CAPACITY, PERFORMANCE & LEAVE TABLES ── */}
        <div className="min-w-0 flex flex-col gap-6 h-full min-h-0">
          
          {/* 1. Main TEAM CAPACITY & METRICS TABLE */}
          <div className="personal-table-wrapper rounded-2xl border border-[var(--border)] overflow-hidden shadow-md bg-[var(--bg-card)] flex flex-col h-full min-h-0">
            <div className="overflow-y-auto overflow-x-auto custom-scrollbar flex-1 min-h-0">
              <table className="w-full text-left border-separate border-spacing-0" style={{ minWidth: '1180px' }}>
                <colgroup>
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '9%' }} />
                </colgroup>

                <thead>
                  {/* Top Level Grouped Headers */}
                  <tr className="th-primary dark:text-white border-b border-[var(--border)]">
                    {/* TEAM CAPACITY Group (4 cols) */}
                    <th 
                      colSpan={4} 
                      className="sticky top-0 z-20 h-[48px] text-center text-[14px] font-black uppercase tracking-widest border-r border-b border-[var(--border)] bg-[var(--bg-card)] text-indigo-700 dark:text-indigo-400 align-middle relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-indigo-500/15 pointer-events-none" />
                      <span className="relative z-10">TEAM CAPACITY</span>
                    </th>
                    {/* PLAN TIME */}
                    <th 
                      title="PLAN TIME: Giờ do Leader / Manager giao trong tuần (lấy từ Supabase APEX_Task)"
                      className="sticky top-0 z-20 h-[48px] text-center text-[13px] font-black uppercase tracking-widest border-r border-b border-[var(--border)] bg-[var(--bg-card)] text-emerald-700 dark:text-emerald-400 align-middle relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-emerald-500/15 pointer-events-none" />
                      <span className="relative z-10">PLAN TIME</span>
                    </th>
                    {/* WORK TIME */}
                    <th 
                      title="WORK TIME: Giờ làm việc dự án - Lấy toàn bộ giờ từ tất cả Project ngoại trừ APEX"
                      className="sticky top-0 z-20 h-[48px] text-center text-[13px] font-black uppercase tracking-widest border-r border-b border-[var(--border)] bg-[var(--bg-card)] text-sky-700 dark:text-sky-400 align-middle relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-sky-500/15 pointer-events-none" />
                      <span className="relative z-10">WORK TIME</span>
                    </th>
                    {/* APEX TIME */}
                    <th 
                      title="APEX TIME: Giờ chấm TimeSheet dự án APEX (Task TYPE: MANAGEMENT, R&D, TRAINING)"
                      className="sticky top-0 z-20 h-[48px] text-center text-[13px] font-black uppercase tracking-widest border-r border-b border-[var(--border)] bg-[var(--bg-card)] text-orange-700 dark:text-orange-400 align-middle relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-orange-500/15 pointer-events-none" />
                      <span className="relative z-10">APEX TIME</span>
                    </th>
                    {/* FREE TIME */}
                    <th 
                      title="FREE TIME: Giờ chấm TimeSheet dự án APEX (Task TYPE: LEARNING)"
                      className="sticky top-0 z-20 h-[48px] text-center text-[13px] font-black uppercase tracking-widest border-r border-b border-[var(--border)] bg-[var(--bg-card)] text-slate-700 dark:text-slate-300 align-middle relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-slate-500/15 pointer-events-none" />
                      <span className="relative z-10">FREE TIME</span>
                    </th>
                    {/* LEAVE */}
                    <th 
                      title="LEAVE: Giờ nghỉ phép (Dự án APEX Task ANNUAL LEAVE + Đơn nghỉ phép Supabase)"
                      className="sticky top-0 z-20 h-[48px] text-center text-[13px] font-black uppercase tracking-widest border-r border-b border-[var(--border)] bg-[var(--bg-card)] text-amber-700 dark:text-amber-400 align-middle relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-amber-500/15 pointer-events-none" />
                      <span className="relative z-10">LEAVE</span>
                    </th>
                    {/* OVER TIME */}
                    <th 
                      title="OVER TIME: Giờ OT từ cột hours_ot (APEX_Task) + Giờ làm ngoài giờ (Thứ 7, CN, >40h)"
                      className="sticky top-0 z-20 h-[48px] text-center text-[13px] font-black uppercase tracking-widest border-r border-b border-[var(--border)] bg-[var(--bg-card)] text-rose-700 dark:text-rose-400 align-middle relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-rose-500/15 pointer-events-none" />
                      <span className="relative z-10">OVER TIME</span>
                    </th>
                    {/* UTILIZATION RATE */}
                    <th 
                      title="UTILIZATION RATE = (WORK TIME + APEX TIME + OVER TIME) / WEEK"
                      className="sticky top-0 z-20 h-[48px] text-center text-[12px] font-black uppercase tracking-widest border-r border-b border-[var(--border)] bg-[var(--bg-card)] text-purple-700 dark:text-purple-400 align-middle relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-purple-500/15 pointer-events-none" />
                      <span className="relative z-10">UTILIZATION RATE</span>
                    </th>
                    {/* EFFICIENCY */}
                    <th 
                      title="EFFICIENCY = (WORK TIME + OVER TIME) / PLAN TIME"
                      className="sticky top-0 z-20 h-[48px] text-center text-[13px] font-black uppercase tracking-widest border-b border-[var(--border)] bg-[var(--bg-card)] text-emerald-700 dark:text-emerald-400 align-middle relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-emerald-500/15 pointer-events-none" />
                      <span className="relative z-10">EFFICIENCY</span>
                    </th>
                  </tr>

                  {/* Sub-headers */}
                  <tr className="th-secondary dark:text-white border-b border-[var(--border)]">
                    <th className="sticky top-[48px] z-20 h-[36px] text-left border-r border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-[var(--text-contrast)] dark:text-white bg-[var(--bg-card)] align-middle" style={{ paddingLeft: '20px', paddingRight: '16px' }}>STAFF</th>
                    <th className="sticky top-[48px] z-20 h-[36px] px-[10px] text-center border-r border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-[var(--text-contrast)] dark:text-white bg-[var(--bg-card)] align-middle">WEEK</th>
                    <th className="sticky top-[48px] z-20 h-[36px] px-[10px] text-center border-r border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-[var(--text-contrast)] dark:text-white bg-[var(--bg-card)] align-middle">
                      <div className="inline-flex items-center justify-center gap-1">
                        <span>%</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingTargets(prev => !prev);
                            setEditingStaff(null);
                          }}
                          title={isEditingTargets ? "Hoàn tất chỉnh sửa %" : "Chế độ chỉnh sửa %"}
                          className={`p-1 rounded cursor-pointer transition-colors ${
                            isEditingTargets 
                              ? 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50' 
                              : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {isEditingTargets ? <Check size={12} className="stroke-[2.5]" /> : <Edit2 size={11} />}
                        </button>
                        {Object.keys(customTargets).length > 0 && isEditingTargets && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Đặt lại tất cả tỷ lệ % về mặc định?')) {
                                setCustomTargets({});
                              }
                            }}
                            title="Đặt lại tất cả về mặc định"
                            className="p-1 rounded text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                          >
                            <RotateCcw size={11} />
                          </button>
                        )}
                      </div>
                    </th>
                    <th className="sticky top-[48px] z-20 h-[36px] px-[10px] text-center border-r border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-[var(--text-contrast)] dark:text-white bg-[var(--bg-card)] align-middle">TOTAL</th>
                    <th className="sticky top-[48px] z-20 h-[36px] px-[10px] text-center border-r border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-[var(--bg-card)] align-middle">
                      <div className="inline-flex items-center justify-center gap-1">
                        <span>HOURS</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingTargets(prev => !prev);
                            setEditingPlanStaff(null);
                          }}
                          title={isEditingTargets ? "Hoàn tất chỉnh sửa Plan Time" : "Chỉnh sửa Plan Time"}
                          className={`p-1 rounded cursor-pointer transition-colors ${
                            isEditingTargets 
                              ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50' 
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {isEditingTargets ? <Check size={12} className="stroke-[2.5]" /> : <Edit2 size={11} />}
                        </button>
                        {Object.keys(customPlanTimes).length > 0 && isEditingTargets && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Đặt lại tất cả PLAN TIME về mặc định (= TOTAL)?')) {
                                setCustomPlanTimes({});
                              }
                            }}
                            title="Đặt lại tất cả PLAN TIME về mặc định"
                            className="p-1 rounded text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                          >
                            <RotateCcw size={11} />
                          </button>
                        )}
                      </div>
                    </th>
                    <th className="sticky top-[48px] z-20 h-[36px] px-[10px] text-center border-r border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 bg-[var(--bg-card)] align-middle">HOURS</th>
                    <th className="sticky top-[48px] z-20 h-[36px] px-[10px] text-center border-r border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 bg-[var(--bg-card)] align-middle">HOURS</th>
                    <th className="sticky top-[48px] z-20 h-[36px] px-[10px] text-center border-r border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)] bg-[var(--bg-card)] align-middle">HOURS</th>
                    <th className="sticky top-[48px] z-20 h-[36px] px-[10px] text-center border-r border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-[var(--bg-card)] align-middle">HOURS</th>
                    <th className="sticky top-[48px] z-20 h-[36px] px-[10px] text-center border-r border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 bg-[var(--bg-card)] align-middle">HOURS</th>
                    <th className="sticky top-[48px] z-20 h-[36px] px-[10px] text-center border-r border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 bg-[var(--bg-card)] align-middle">%</th>
                    <th className="sticky top-[48px] z-20 h-[36px] text-center border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-[var(--bg-card)] align-middle" style={{ paddingRight: '20px', paddingLeft: '10px' }}>%</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--border)]">
                  {teamPerformanceData.rows.map((row, idx) => {
                    const isManager = row.role === 'MANAGER';
                    const isAdmin = row.role === 'ADMIN';
                    const isLeader = row.role === 'LEADER';

                    return (
                    <tr 
                      key={idx} 
                      className={`transition-all duration-200 text-[14px] align-middle group cursor-default ${
                        isManager
                          ? 'role-row-manager hover:bg-rose-100/50 dark:hover:bg-rose-950/40'
                          : isAdmin 
                          ? 'role-row-admin hover:bg-amber-100/50 dark:hover:bg-amber-950/40' 
                          : isLeader 
                          ? 'role-row-leader hover:bg-slate-200/60 dark:hover:bg-slate-800/60' 
                          : 'hover:bg-[var(--bg-surface)]'
                      }`}
                    >
                      {/* 1. STAFF */}
                      <td 
                        className={`sys-py text-left font-medium tracking-wide border-r border-b border-[var(--border)] relative ${
                          isManager
                            ? 'bg-gradient-to-r from-rose-500/20 via-pink-400/10 to-transparent'
                            : isAdmin 
                            ? 'bg-gradient-to-r from-amber-400/20 via-amber-300/10 to-transparent' 
                            : isLeader 
                            ? 'bg-gradient-to-r from-slate-300/40 via-white/20 to-transparent dark:from-slate-700/30 dark:via-slate-800/10' 
                            : ''
                        }`}
                        style={{ paddingLeft: '20px', paddingRight: '16px', verticalAlign: 'middle' }}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold ${
                            isManager
                              ? 'text-rose-950 dark:text-rose-200 font-black'
                              : isAdmin 
                              ? 'text-amber-950 dark:text-amber-300 font-black' 
                              : isLeader 
                              ? 'text-slate-900 dark:text-slate-100 font-black' 
                              : 'text-[var(--text-contrast)]'
                          }`}>
                            {row.staff}
                          </span>

                          {/* Role Badges */}
                          {isManager && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-black role-badge-manager shadow-md" title="Admin & Manager">
                              <span>👑</span>
                              <span>MANAGER</span>
                            </span>
                          )}

                          {isAdmin && !isManager && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-black role-badge-admin shadow-sm">
                              <span>👑</span>
                              <span>ADMIN</span>
                            </span>
                          )}

                          {isLeader && !isAdmin && !isManager && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-black role-badge-leader shadow-sm">
                              <span>✨</span>
                              <span>LEADER</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. WEEK (Available Capacity = 40 - Leave) */}
                      <td className={`px-[10px] sys-py align-middle text-center font-mono font-bold border-r border-b border-[var(--border)] ${
                        row.weekCapacity < 40 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-[var(--text-contrast)]'
                      }`}>
                        {row.weekCapacity.toFixed(1)}
                      </td>

                      {/* 3. % (Target Ratio) */}
                      <td 
                        className="px-[10px] sys-py align-middle text-center font-mono border-r border-b border-[var(--border)] group cursor-pointer select-none"
                        title="Click để điều chỉnh % (xóa trống để quay lại mặc định)"
                        onClick={() => {
                          if (!isEditingTargets && editingStaff !== row.staff) {
                            setEditingStaff(row.staff);
                            setTempValue(String(row.targetPercent));
                          }
                        }}
                      >
                        {(isEditingTargets || editingStaff === row.staff) ? (
                          <div className="inline-flex items-center justify-center gap-0.5" onClick={e => e.stopPropagation()}>
                            <input 
                              type="number"
                              min="0"
                              max="100"
                              autoFocus={editingStaff === row.staff}
                              value={editingStaff === row.staff ? tempValue : (customTargets[row.staff] ?? row.targetPercent)}
                              onChange={(e) => {
                                if (editingStaff === row.staff) {
                                  setTempValue(e.target.value);
                                } else {
                                  const raw = e.target.value;
                                  if (raw === '') {
                                    setCustomTargets(prev => {
                                      const next = { ...prev };
                                      delete next[row.staff];
                                      return next;
                                    });
                                  } else {
                                    setCustomTargets(prev => ({ ...prev, [row.staff]: Number(raw) }));
                                  }
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (editingStaff === row.staff) {
                                    if (tempValue === '' || isNaN(Number(tempValue))) {
                                      setCustomTargets(prev => {
                                        const next = { ...prev };
                                        delete next[row.staff];
                                        return next;
                                      });
                                    } else {
                                      setCustomTargets(prev => ({ ...prev, [row.staff]: Number(tempValue) }));
                                    }
                                    setEditingStaff(null);
                                  }
                                } else if (e.key === 'Escape') {
                                  setEditingStaff(null);
                                }
                              }}
                              onBlur={() => {
                                if (editingStaff === row.staff) {
                                  if (tempValue === '' || isNaN(Number(tempValue))) {
                                    setCustomTargets(prev => {
                                      const next = { ...prev };
                                      delete next[row.staff];
                                      return next;
                                    });
                                  } else {
                                    setCustomTargets(prev => ({ ...prev, [row.staff]: Number(tempValue) }));
                                  }
                                  setEditingStaff(null);
                                }
                              }}
                              className="w-12 text-center text-xs font-mono font-bold bg-[var(--bg-surface)] border border-indigo-400 rounded py-0.5 outline-none shadow-sm"
                            />
                            <span className="text-[11px] font-mono font-semibold text-slate-400">%</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded group-hover:bg-slate-200/50 dark:group-hover:bg-slate-700/50 transition-colors">
                            <span className={`font-bold ${
                              customTargets[row.staff] !== undefined 
                                ? 'text-indigo-600 dark:text-indigo-400 font-black underline decoration-dotted decoration-indigo-400/60 underline-offset-2' 
                                : 'text-[var(--text-muted)]'
                            }`}>
                              {row.targetPercent}%
                            </span>
                            <Edit2 size={10} className="text-slate-400 opacity-0 group-hover:opacity-60 transition-opacity" />
                          </div>
                        )}
                      </td>

                      {/* 4. TOTAL (Target Capacity = WEEK * %) */}
                      <td className="px-[10px] sys-py align-middle text-center font-mono font-bold text-[var(--text-contrast)] border-r border-b border-[var(--border)] bg-indigo-500/5">
                        {row.targetTotalHours.toFixed(1)}
                      </td>

                      {/* 5. PLAN TIME (HOURS) - Manager/Leader assigned */}
                      <td 
                        className="px-[10px] sys-py align-middle text-center font-mono font-bold border-r border-b border-[var(--border)] group cursor-pointer select-none"
                        title="Click để điều chỉnh PLAN TIME do Manager/Leader giao (mặc định = TOTAL)"
                        onClick={() => {
                          if (!isEditingTargets && editingPlanStaff !== row.staff) {
                            setEditingPlanStaff(row.staff);
                            setTempPlanValue(customPlanTimes[row.staff] !== undefined ? String(customPlanTimes[row.staff]) : '');
                          }
                        }}
                      >
                        {(isEditingTargets || editingPlanStaff === row.staff) ? (
                          <div className="inline-flex items-center justify-center gap-0.5" onClick={e => e.stopPropagation()}>
                            <input 
                              type="number"
                              min="0"
                              max="80"
                              step="0.5"
                              autoFocus={editingPlanStaff === row.staff}
                              value={editingPlanStaff === row.staff ? tempPlanValue : (customPlanTimes[row.staff] ?? '')}
                              placeholder={row.targetTotalHours.toFixed(1)}
                              onChange={(e) => {
                                if (editingPlanStaff === row.staff) {
                                  setTempPlanValue(e.target.value);
                                } else {
                                  const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                  if (val === '') {
                                    setCustomPlanTimes(prev => {
                                      const next = { ...prev };
                                      delete next[row.staff];
                                      return next;
                                    });
                                  } else if (!isNaN(val)) {
                                    setCustomPlanTimes(prev => ({ ...prev, [row.staff]: val }));
                                  }
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (editingPlanStaff === row.staff) {
                                    if (tempPlanValue === '' || isNaN(Number(tempPlanValue))) {
                                      setCustomPlanTimes(prev => {
                                        const next = { ...prev };
                                        delete next[row.staff];
                                        return next;
                                      });
                                    } else {
                                      setCustomPlanTimes(prev => ({ ...prev, [row.staff]: Number(tempPlanValue) }));
                                    }
                                    setEditingPlanStaff(null);
                                  }
                                } else if (e.key === 'Escape') {
                                  setEditingPlanStaff(null);
                                }
                              }}
                              onBlur={() => {
                                if (editingPlanStaff === row.staff) {
                                  if (tempPlanValue === '' || isNaN(Number(tempPlanValue))) {
                                    setCustomPlanTimes(prev => {
                                      const next = { ...prev };
                                      delete next[row.staff];
                                      return next;
                                    });
                                  } else {
                                    setCustomPlanTimes(prev => ({ ...prev, [row.staff]: Number(tempPlanValue) }));
                                  }
                                  setEditingPlanStaff(null);
                                }
                              }}
                              className="w-14 text-center text-xs font-mono font-bold bg-[var(--bg-surface)] border border-emerald-400 rounded py-0.5 outline-none shadow-sm text-emerald-600 dark:text-emerald-400"
                            />
                            <span className="text-[10px] font-mono text-slate-400">h</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded group-hover:bg-slate-200/50 dark:group-hover:bg-slate-700/50 transition-colors">
                            {row.planTime > 0 ? (
                              <span className={`font-bold ${
                                customPlanTimes[row.staff] !== undefined 
                                  ? 'text-emerald-600 dark:text-emerald-400 font-black underline decoration-dotted decoration-emerald-400/60 underline-offset-2' 
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}>
                                {row.planTime.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)] opacity-30">-</span>
                            )}
                            <Edit2 size={10} className="text-emerald-500 opacity-0 group-hover:opacity-60 transition-opacity" />
                          </div>
                        )}
                      </td>

                      {/* 6. WORK TIME (HOURS) */}
                      <td className={`px-[10px] sys-py align-middle text-center font-mono font-bold border-r border-b border-[var(--border)] ${
                        row.workTime > 40 
                          ? 'text-rose-600 dark:text-rose-400' 
                          : 'text-[var(--text-contrast)]'
                      }`}>
                        {row.workTime.toFixed(1)}
                      </td>

                      {/* 7. APEX TIME (HOURS) - APEX project: MANAGEMENT/R&D/TRAINING */}
                      <td className="px-[10px] sys-py align-middle text-center font-mono font-bold border-r border-b border-[var(--border)]">
                        {row.apexTime > 0 ? (
                          <span className="text-orange-600 dark:text-orange-400 font-bold">
                            {row.apexTime.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] opacity-30">-</span>
                        )}
                      </td>

                      {/* 8. FREE TIME (HOURS) - APEX project: LEARNING only */}
                      <td className="px-[10px] sys-py align-middle text-center font-mono text-[var(--text-muted)] border-r border-b border-[var(--border)]">
                        {row.freeTime > 0 ? row.freeTime.toFixed(1) : '-'}
                      </td>

                      {/* 7. LEAVE (HOURS) - Lấy hoàn toàn từ Database */}
                      <td className="px-[10px] sys-py align-middle text-center font-mono font-bold border-r border-b border-[var(--border)]">
                        {row.leaveHours > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">
                            {row.leaveHours.toFixed(0)}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] opacity-30">-</span>
                        )}
                      </td>

                      {/* 8. OVER TIME (HOURS) */}
                      <td className="px-[10px] sys-py align-middle text-center font-mono font-bold border-r border-b border-[var(--border)]">
                        {row.overTime > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-bold">
                            {row.overTime.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] opacity-30">-</span>
                        )}
                      </td>

                      {/* 9. UTILIZATION RATE (%) */}
                      <td className="px-[10px] sys-py align-middle text-center font-mono border-r border-b border-[var(--border)]">
                        <span className={`font-bold ${
                          row.utilizationRate >= 100
                            ? 'text-purple-700 dark:text-purple-400'
                            : row.utilizationRate >= 70
                            ? 'text-indigo-700 dark:text-indigo-400'
                            : 'text-[var(--text-contrast)]'
                        }`}>
                          {row.utilizationRate.toFixed(1)}%
                        </span>
                      </td>


                      {/* 11. EFFICIENCY (%) */}
                      <td className="sys-py align-middle text-center font-mono font-bold border-b border-[var(--border)]" style={{ paddingRight: '20px', paddingLeft: '10px' }}>
                        <span className={`font-bold ${
                          row.efficiency >= 85
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : row.efficiency >= 60
                            ? 'text-sky-700 dark:text-sky-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}>
                          {row.efficiency.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>

                {/* Table Footer: GRAND TOTAL ROW */}
                <tfoot>
                  <tr className="bg-[var(--bg-surface)] font-black text-[14px] border-t-2 border-[var(--border)] sticky bottom-0 z-10">
                    <td 
                      className="sys-py text-left uppercase tracking-wider border-r border-[var(--border)] text-[var(--text-contrast)]"
                      style={{ paddingLeft: '20px', paddingRight: '16px', verticalAlign: 'middle' }}
                    >
                      TOTAL
                    </td>
                    <td className="px-[10px] sys-py align-middle text-center font-mono text-[var(--text-contrast)] border-r border-[var(--border)]">
                      {teamPerformanceData.totals.weekCapacity.toFixed(1)}
                    </td>
                    <td className="px-[10px] sys-py align-middle text-center font-mono text-[var(--text-muted)] border-r border-[var(--border)]">
                      -
                    </td>
                    <td className="px-[10px] sys-py align-middle text-center font-mono text-indigo-600 dark:text-indigo-400 border-r border-[var(--border)] bg-indigo-500/10 text-[14px]">
                      {teamPerformanceData.totals.targetTotalHours.toFixed(1)}
                    </td>
                    <td className="px-[10px] sys-py align-middle text-center font-mono text-emerald-600 dark:text-emerald-400 border-r border-[var(--border)] font-bold text-[14px]">
                      {teamPerformanceData.totals.planTime.toFixed(1)}
                    </td>
                    <td className="px-[10px] sys-py align-middle text-center font-mono text-[var(--text-contrast)] border-r border-[var(--border)] font-bold text-[14px]">
                      {teamPerformanceData.totals.workTime.toFixed(1)}
                    </td>
                    <td className="px-[10px] sys-py align-middle text-center font-mono text-orange-600 dark:text-orange-400 border-r border-[var(--border)] font-bold text-[14px]">
                      {teamPerformanceData.totals.apexTime > 0 ? teamPerformanceData.totals.apexTime.toFixed(1) : '-'}
                    </td>
                    <td className="px-[10px] sys-py align-middle text-center font-mono text-[var(--text-muted)] border-r border-[var(--border)]">
                      {teamPerformanceData.totals.freeTime.toFixed(1)}
                    </td>
                    <td className="px-[10px] sys-py align-middle text-center font-mono text-amber-600 dark:text-amber-400 border-r border-[var(--border)]">
                      {teamPerformanceData.totals.leaveHours > 0 ? teamPerformanceData.totals.leaveHours.toFixed(0) : '-'}
                    </td>
                    <td className="px-[10px] sys-py align-middle text-center font-mono text-rose-600 dark:text-rose-400 border-r border-[var(--border)] font-bold text-[14px]">
                      {teamPerformanceData.totals.overTime > 0 ? teamPerformanceData.totals.overTime.toFixed(1) : '-'}
                    </td>
                    <td className="px-[10px] sys-py align-middle text-center font-mono text-purple-700 dark:text-purple-400 border-r border-[var(--border)] text-[14px] font-bold">
                      {teamPerformanceData.totalUtilizationRate.toFixed(1)}%
                    </td>
                    <td className="sys-py align-middle text-center font-mono text-emerald-700 dark:text-emerald-400 text-[14px] font-bold" style={{ paddingRight: '20px', paddingLeft: '10px' }}>
                      {teamPerformanceData.totalEfficiency.toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* EXPORT CSV ACTION */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-sm transition-all duration-200 hover:scale-[1.02] cursor-pointer"
            >
              Export CSV
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PerformanceTimesheetView;
