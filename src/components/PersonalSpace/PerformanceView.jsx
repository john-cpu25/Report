import React, { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabaseClient';
import { getThreeMonthsAgoISO } from '../../utils/timeUtils';
import { Edit2, Check, RotateCcw, Download } from 'lucide-react';

// Master list of all registered active staff across APEX teams
const CANONICAL_STAFF_NAMES = {
  // Direct clean mapping
  'TRUNGTHENGUYEN': 'Trung Thế Nguyễn',
  'TRUNG THẾ NGUYỄN': 'Trung Thế Nguyễn',
  'TRUNG THE NGUYEN': 'Trung Thế Nguyễn',
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
  'TRUNG THẾ': 'Trung Thế Nguyễn',
  'TRUNG THE': 'Trung Thế Nguyễn',
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

// Backwards compatibility alias
const getStaffDisplayName = (rawName) => getCanonicalStaffName(rawName);

// Master list of all registered active staff across APEX teams with full names
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

const PerformanceView = forwardRef(({
  filteredData = [],
  dashboardProjects = [],
  dashboardUsers = [],
  dashboardLeave = [],
  getProjectColor = () => '#6366f1',
  selectedTimeMetric = 't2',
  currentDate = new Date(),
  selectedTeam = '',
  rawUsers = [],
  userTeamByName = {}
}, ref) => {
  // Current active week boundaries
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

  // Persistent user overrides for % Target, Manual Leave, or Manual Hours
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

  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [tempValue, setTempValue] = useState('');
  const [editingRateStaff, setEditingRateStaff] = useState(null);
  const [tempRateValue, setTempRateValue] = useState('');

  // Clear legacy customLeaves if any existed
  useEffect(() => {
    try {
      localStorage.removeItem('apex_perf_leaves');
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('apex_perf_targets', JSON.stringify(customTargets));
  }, [customTargets]);

  useEffect(() => {
    localStorage.setItem('apex_perf_rates', JSON.stringify(customRates));
  }, [customRates]);

  // Real-time APEX_Leave_Span state
  const [apexLeaveSpans, setApexLeaveSpans] = useState([]);
  const [apexLeaves, setApexLeaves] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchApexLeave = async () => {
      try {
        const threeMonthsAgoIso = getThreeMonthsAgoISO(3);
        const [spanRes, leaveRes] = await Promise.all([
          supabase.from('APEX_Leave_Span').select('*').gte('start_at', threeMonthsAgoIso),
          supabase.from('APEX_Leave').select('*').gte('created_at', threeMonthsAgoIso)
        ]);
        if (isMounted) {
          if (spanRes.data) setApexLeaveSpans(spanRes.data);
          if (leaveRes.data) setApexLeaves(leaveRes.data);
        }
      } catch (err) {
        console.error('Error fetching APEX_Leave_Span in PerformanceView:', err);
      }
    };
    fetchApexLeave();
    return () => { isMounted = false; };
  }, []);

  // 1. PROJECT TIME TABLE DATA
  const projectTimeData = useMemo(() => {
    const pMap = {};
    let totalAllHours = 0;

    filteredData.forEach(task => {
      const pKey = (task.project || (task.name || '').split(':')[0] || 'UNASSIGNED').trim().toUpperCase();
      let hours = 0;
      if (selectedTimeMetric === 't1') {
        hours = Number(task.hours_planned) || (Number(task.t1) ? task.t1 / 3600 : 0);
      } else {
        hours = Number(task.hours_complete) || Number(task.hours_planned) || (Number(task.t2) ? task.t2 / 3600 : 0);
      }

      if (!pMap[pKey]) {
        pMap[pKey] = {
          key: pKey,
          name: task.projectName || pKey,
          color: getProjectColor(pKey),
          hours: 0
        };
      }
      pMap[pKey].hours += hours;
      totalAllHours += hours;
    });

    const rows = Object.values(pMap).sort((a, b) => b.hours - a.hours);
    return { rows, totalHours: totalAllHours };
  }, [filteredData, selectedTimeMetric, getProjectColor]);

  // 2. PARSE LEAVE ENTRIES FOR THE CURRENT WEEK (Dựa vào APEX_Leave_Span)
  const weeklyLeaveMap = useMemo(() => {
    const lMap = {};

    // Map user id to name from dashboardUsers, rawUsers, KNOWN_APEX_USERS
    const userIdToName = {};
    (rawUsers || []).forEach(u => { if (u.id && u.name) userIdToName[u.id] = u.name; });
    (dashboardUsers || []).forEach(u => { if (u.id && u.name) userIdToName[u.id] = u.name; });

    // 1. Parse trực tiếp từ bảng APEX_Leave_Span (Primary)
    if (apexLeaveSpans.length > 0 && apexLeaves.length > 0) {
      const leaveById = {};
      apexLeaves.forEach(l => { leaveById[l.id] = l; });

      apexLeaveSpans.forEach(span => {
        const parentLeave = leaveById[span.leave_id];
        if (!parentLeave || parentLeave.status === 'rejected') return;

        const rawUserName = userIdToName[parentLeave.user_id] || parentLeave.user_id;
        const uName = getStaffDisplayName(rawUserName);

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
        } catch (e) {
          // ignore date parse error
        }
      });
    }

    // 2. Fallback / Bổ sung từ dashboardLeave
    dashboardLeave.forEach(entry => {
      try {
        // Nếu entry là APEX_Leave_Span từ AppContext
        if (entry._isApexSpan) {
          const rawUserName = userIdToName[entry.user_id] || entry.user_id;
          const uName = getStaffDisplayName(rawUserName);
          if (lMap[uName] > 0) return; // Đã tính từ apexLeaveSpans

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

        const uName = getStaffDisplayName(entry.user_name || entry.name || '');
        if (lMap[uName] > 0) return; // Ưu tiên APEX_Leave_Span

        let leaveHours = 0;
        if (entry.date) {
          const entryDate = parseISO(entry.date);
          if (isWithinInterval(entryDate, { start: weekStart, end: weekEnd })) {
            leaveHours += Number(entry.hours) || (Number(entry.days) ? Number(entry.days) * 8 : 8);
          }
        } else if (entry.leave_list) {
          const list = typeof entry.leave_list === 'string' ? JSON.parse(entry.leave_list) : entry.leave_list;
          list.forEach(segment => {
            const dStart = parseISO(segment.LeaveStart || segment.Start || segment.date);
            if (isWithinInterval(dStart, { start: weekStart, end: weekEnd })) {
              const dEnd = segment.LeaveEnd || segment.End ? parseISO(segment.LeaveEnd || segment.End) : null;
              if (dEnd) {
                const diffH = Math.abs(dEnd - dStart) / (1000 * 60 * 60);
                leaveHours += diffH >= 8 ? 8 : (diffH >= 3 ? 4 : diffH);
              } else {
                leaveHours += 8;
              }
            }
          });
        }

        if (leaveHours > 0) {
          lMap[uName] = (lMap[uName] || 0) + leaveHours;
        }
      } catch (e) {
        // ignore format issues
      }
    });

    return lMap;
  }, [apexLeaveSpans, apexLeaves, dashboardLeave, rawUsers, dashboardUsers, weekStart, weekEnd]);

  // 3. TEAM CAPACITY & PERFORMANCE DATA
  const teamPerformanceData = useMemo(() => {
    // Collect all unique staff from filtered tasks and calculate work hours
    const staffHoursMap = {};
    const staffProjectMap = {};
    const staffApexMap = {};
    const staffLearningMap = {};
    const staffOtMap = {};

    filteredData.forEach(task => {
      const rawUser = task.userName || task.createdBy || 'Unknown';
      const staffName = getStaffDisplayName(rawUser);
      if (staffName.toLowerCase() === 'admin' || staffName.toLowerCase().includes('admin')) return;
      let hours = 0;
      if (selectedTimeMetric === 't1') {
        hours = Number(task.hours_planned) || (Number(task.t1) ? task.t1 / 3600 : 0);
      } else {
        hours = Number(task.hours_complete) || Number(task.hours_planned) || (Number(task.t2) ? task.t2 / 3600 : 0);
      }

      // Overtime hours directly from APEX_Task.hours_ot
      const taskOt = Number(task.hours_ot) || 0;

      const pKey = (task.project || (task.name || '').split(':')[0] || '').trim().toUpperCase();
      const isApex = pKey === 'APEX' || pKey.startsWith('APEX');
      const isLearning = pKey === 'TRAINING' || pKey === 'LEARNING' || pKey.includes('TRAINING') || pKey.includes('LEARNING');

      staffHoursMap[staffName] = (staffHoursMap[staffName] || 0) + hours;
      staffOtMap[staffName] = (staffOtMap[staffName] || 0) + taskOt;

      if (isApex || isLearning) {
        staffApexMap[staffName] = (staffApexMap[staffName] || 0) + hours;
      } else {
        staffProjectMap[staffName] = (staffProjectMap[staffName] || 0) + hours;
      }

      if (isLearning) {
        staffLearningMap[staffName] = (staffLearningMap[staffName] || 0) + hours;
      }
    });

    const selTeamNorm = (selectedTeam || '').trim().toLowerCase();
    const allUsersList = [...(rawUsers || []), ...(dashboardUsers || [])].filter(u => {
      const n = (u?.name || u?.full_name || '').toLowerCase();
      const em = (u?.email || '').toLowerCase();
      return n !== 'admin' && !n.includes('admin') && !n.includes('jason') && !em.includes('jason');
    });

    const staffSet = new Set();
    const staffOrdered = [];

    const addStaff = (staffName) => {
      if (!staffName) return;
      const cleanUpper = staffName.trim().toUpperCase();
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
        staffOrdered.push(getCanonicalStaffName(staffName));
      }
    };

    if (selTeamNorm) {
      // ── WHEN A SPECIFIC TEAM IS FILTERED (e.g. PT&REO) ──
      // 1. Include registered members of this team from KNOWN_APEX_USERS
      KNOWN_APEX_USERS.forEach(u => {
        if (u.team && u.team.trim().toLowerCase() === selTeamNorm) {
          addStaff(getCanonicalStaffName(u.name));
        }
      });

      // 2. Include registered members from database
      allUsersList.forEach(u => {
        if (u.name && u.team && u.team.trim().toLowerCase() === selTeamNorm) {
          addStaff(getCanonicalStaffName(u.name));
        }
      });

      // Also check userTeamByName map
      Object.entries(userTeamByName || {}).forEach(([uName, uTeam]) => {
        if (uTeam && uTeam.trim().toLowerCase() === selTeamNorm) {
          addStaff(getCanonicalStaffName(uName));
        }
      });

      // 3. Plus any staff who logged hours on tasks for this selected team in filteredData
      Object.keys(staffHoursMap).forEach(dName => {
        if (staffHoursMap[dName] > 0) {
          addStaff(getCanonicalStaffName(dName));
        }
      });
    } else {
      // ── WHEN NO TEAM FILTER IS APPLIED (ALL TEAMS) ──
      // 1. Show all registered active staff from KNOWN_APEX_USERS
      KNOWN_APEX_USERS.forEach(u => {
        addStaff(getCanonicalStaffName(u.name));
      });

      // 2. Plus any dynamic staff from allUsersList
      allUsersList.forEach(u => {
        const uTeam = (u.team || '').trim();
        if (u.name && uTeam && uTeam.toUpperCase() !== 'MANAGER') {
          addStaff(getCanonicalStaffName(u.name));
        }
      });

      // 3. Plus any staff who logged hours in filteredData
      Object.keys(staffHoursMap).forEach(dName => {
        if (staffHoursMap[dName] > 0) {
          addStaff(getCanonicalStaffName(dName));
        }
      });
    }

    const targetStaffList = staffOrdered;

    const rows = targetStaffList.map(staffName => {
      const role = getStaffRole(staffName, allUsersList);
      const isAdminRole = role === 'ADMIN' || role === 'MANAGER';
      const defaultRatio = isAdminRole ? 50 : 85;
      const targetPercent = customTargets[staffName] !== undefined ? customTargets[staffName] : defaultRatio;

      // Leave hours strictly from Supabase database
      const leaveHours = weeklyLeaveMap[staffName] || 0;

      // Available capacity: 40h standard minus leave
      const weekCapacity = Math.max(0, 40 - leaveHours);

      // Total target billable hours
      const targetTotalHours = (weekCapacity * targetPercent) / 100;

      // Actual work time (Client projects, i.e. non-APEX)
      const rawWorkTime = staffProjectMap[staffName] || 0;
      const excessOt = Math.max(0, rawWorkTime - 40);
      const workTime = Math.min(rawWorkTime, 40);
      const projectTime = workTime;
      const learningTime = staffLearningMap[staffName] || 0;

      // FREE TIME = APEX TIME
      const freeTime = staffApexMap[staffName] || 0;

      // Overtime: Lấy từ cột hours_ot trong APEX_Task cộng thêm phần vượt quá 40h của Work Time
      const overTime = (staffOtMap[staffName] || 0) + excessOt;

      // 1. UTILIZATION RATE = (worktime + free time + overtime) / week
      const utilizationRate = weekCapacity > 0
        ? ((workTime + freeTime + overTime) / weekCapacity) * 100
        : 0;

      // 2. EFFICIENCY = ( WORK TIME + OVER TIME ) / PLAN TIME
      const efficiency = targetTotalHours > 0
        ? ((workTime + overTime) / targetTotalHours) * 100
        : 0;

      return {
        staff: staffName,
        role,
        weekCapacity,
        targetPercent,
        targetTotalHours,
        workTime,
        projectTime,
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

      const aActive = a.workTime + a.freeTime;
      const bActive = b.workTime + b.freeTime;
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

    // Filter rows (never show admin, jason le)
    const filteredRows = rows.filter(r => {
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

    // Grand totals
    const totals = filteredRows.reduce((acc, curr) => ({
      weekCapacity: acc.weekCapacity + curr.weekCapacity,
      targetTotalHours: acc.targetTotalHours + curr.targetTotalHours,
      workTime: acc.workTime + curr.workTime,
      projectTime: acc.projectTime + curr.projectTime,
      learningTime: acc.learningTime + curr.learningTime,
      freeTime: acc.freeTime + curr.freeTime,
      leaveHours: acc.leaveHours + curr.leaveHours,
      overTime: acc.overTime + curr.overTime,
      totalAttendanceHours: acc.totalAttendanceHours + (curr.workTime + curr.freeTime + curr.overTime + curr.leaveHours)
    }), { weekCapacity: 0, targetTotalHours: 0, workTime: 0, projectTime: 0, learningTime: 0, freeTime: 0, leaveHours: 0, overTime: 0, totalAttendanceHours: 0 });

    const totalUtilizationRate = totals.weekCapacity > 0
      ? ((totals.workTime + totals.freeTime + totals.overTime) / totals.weekCapacity) * 100
      : 0;

    const totalEfficiency = totals.targetTotalHours > 0
      ? ((totals.workTime + totals.overTime) / totals.targetTotalHours) * 100
      : 0;

    return { rows: filteredRows, totals, totalUtilizationRate, totalEfficiency };
  }, [filteredData, selectedTimeMetric, customTargets, customRates, weeklyLeaveMap, selectedTeam, rawUsers, dashboardUsers, userTeamByName]);

  // 4. LEAVE BREAKDOWN TABLE (Staff with leave > 0)
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

  // Export to CSV matching Excel layout
  const handleExportCSV = () => {
    const lines = [];
    lines.push(`APEX TEAM CAPACITY & PERFORMANCE REPORT`);
    lines.push(`Week: ${format(weekStart, 'dd/MM/yyyy')} - ${format(weekEnd, 'dd/MM/yyyy')}`);
    lines.push('');

    // Table 1 Header
    lines.push('PROJECT TIME,,,TEAM CAPACITY,,,,WORK TIME,FREE TIME,LEAVE,OVER TIME,UTILIZATION RATE,EFFICIENCY');
    lines.push('PROJECT,HOURS,,STAFF,WEEK,%,TOTAL,HOURS,HOURS,HOURS,HOURS,%,%');

    const maxRows = Math.max(projectTimeData.rows.length, teamPerformanceData.rows.length);
    for (let i = 0; i < maxRows; i++) {
      const p = projectTimeData.rows[i];
      const t = teamPerformanceData.rows[i];

      const pCol = p ? `"${p.key}",${p.hours.toFixed(2)}` : ',';
      const tCol = t 
        ? `,"${t.staff}",${t.weekCapacity.toFixed(1)},${t.targetPercent}%,${t.targetTotalHours.toFixed(1)},${t.workTime.toFixed(1)},${t.freeTime.toFixed(1)},${t.leaveHours > 0 ? t.leaveHours.toFixed(1) : ''},${t.overTime > 0 ? t.overTime.toFixed(1) : ''},${t.utilizationRate.toFixed(1)}%,${t.efficiency.toFixed(1)}%`
        : ',,,,,,,,,,';

      lines.push(`${pCol},${tCol}`);
    }

    // Totals line
    lines.push(`TOTAL,${projectTimeData.totalHours.toFixed(2)},,TOTAL,${teamPerformanceData.totals.weekCapacity.toFixed(1)},-,${teamPerformanceData.totals.targetTotalHours.toFixed(1)},${teamPerformanceData.totals.workTime.toFixed(1)},${teamPerformanceData.totals.freeTime.toFixed(1)},${teamPerformanceData.totals.leaveHours.toFixed(1)},${teamPerformanceData.totals.overTime.toFixed(1)},${teamPerformanceData.totalUtilizationRate.toFixed(1)}%,${teamPerformanceData.totalEfficiency.toFixed(1)}%`);

    // Leave Table
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
    link.setAttribute('download', `APEX_Performance_Capacity_${format(weekStart, 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Team Performance & Capacity
      const perfRows = [
        ['APEX TEAM CAPACITY & PERFORMANCE REPORT'],
        [`Week: ${format(weekStart, 'dd/MM/yyyy')} - ${format(weekEnd, 'dd/MM/yyyy')}`],
        [],
        [
          'Staff',
          'Role',
          'Capacity (hrs)',
          'Target %',
          'Target Total (hrs)',
          'Work Time (hrs)',
          'Free Time (hrs)',
          'Leave (hrs)',
          'Overtime (hrs)',
          'Utilization Rate (%)',
          'Efficiency (%)'
        ]
      ];

      teamPerformanceData.rows.forEach(t => {
        perfRows.push([
          t.staff,
          t.role || 'USER',
          Number(t.weekCapacity.toFixed(1)),
          `${t.targetPercent}%`,
          Number(t.targetTotalHours.toFixed(1)),
          Number(t.workTime.toFixed(1)),
          Number(t.freeTime.toFixed(1)),
          t.leaveHours > 0 ? Number(t.leaveHours.toFixed(1)) : 0,
          t.overTime > 0 ? Number(t.overTime.toFixed(1)) : 0,
          `${t.utilizationRate.toFixed(1)}%`,
          `${t.efficiency.toFixed(1)}%`
        ]);
      });

      perfRows.push([
        'TOTAL',
        '',
        Number(teamPerformanceData.totals.weekCapacity.toFixed(1)),
        '-',
        Number(teamPerformanceData.totals.targetTotalHours.toFixed(1)),
        Number(teamPerformanceData.totals.workTime.toFixed(1)),
        Number(teamPerformanceData.totals.freeTime.toFixed(1)),
        Number(teamPerformanceData.totals.leaveHours.toFixed(1)),
        Number(teamPerformanceData.totals.overTime.toFixed(1)),
        `${teamPerformanceData.totalUtilizationRate.toFixed(1)}%`,
        `${teamPerformanceData.totalEfficiency.toFixed(1)}%`
      ]);

      const wsPerf = XLSX.utils.aoa_to_sheet(perfRows);
      wsPerf['!cols'] = [
        { wch: 22 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 18 },
        { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 15 }, { wch: 20 }, { wch: 16 }
      ];
      XLSX.utils.book_append_sheet(wb, wsPerf, 'Team Performance');

      // Sheet 2: Project Time
      const projRows = [
        ['PROJECT TIME BREAKDOWN'],
        [`Week: ${format(weekStart, 'dd/MM/yyyy')} - ${format(weekEnd, 'dd/MM/yyyy')}`],
        [],
        ['Project Code', 'Hours (hrs)']
      ];
      projectTimeData.rows.forEach(p => {
        projRows.push([p.key, Number(p.hours.toFixed(2))]);
      });
      projRows.push(['TOTAL', Number(projectTimeData.totalHours.toFixed(2))]);
      const wsProj = XLSX.utils.aoa_to_sheet(projRows);
      wsProj['!cols'] = [{ wch: 30 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, wsProj, 'Project Time');

      // Sheet 3: Leave Breakdown (if any)
      if (leaveTableData.length > 0) {
        const leaveRows = [
          ['LEAVE BREAKDOWN'],
          [],
          ['Staff', 'Leave Hours', 'Target %', 'Lost Capacity (hrs)']
        ];
        leaveTableData.forEach(l => {
          leaveRows.push([l.staff, Number(l.leaveHours.toFixed(1)), `${l.targetPercent}%`, Number(l.lostCapacity.toFixed(1))]);
        });
        const wsLeave = XLSX.utils.aoa_to_sheet(leaveRows);
        wsLeave['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsLeave, 'Leave Breakdown');
      }

      XLSX.writeFile(wb, `APEX_Performance_Capacity_${format(weekStart, 'yyyyMMdd')}.xlsx`);
    } catch (e) {
      console.error('Error exporting Performance to Excel:', e);
      handleExportCSV();
    }
  };

  useImperativeHandle(ref, () => ({
    exportExcel: handleExportExcel,
    exportCSV: handleExportCSV
  }), [handleExportCSV, teamPerformanceData, projectTimeData, leaveTableData]);

  return (
    <div className="animate-in fade-in duration-300 h-full flex flex-col min-h-0 overflow-hidden">
      {/* ── MAIN TABLES: 2-COLUMN LAYOUT MATCHING EXCEL ── */}
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
                      No project hours logged in this week
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

        {/* ── RIGHT COLUMN: TEAM CAPACITY, PERFORMANCE & LEAVE TABLES (Expanded ~100% of remaining width) ── */}
        <div className="min-w-0 flex flex-col gap-6 h-full min-h-0">
          
          {/* 1. Main TEAM CAPACITY & METRICS TABLE */}
          <div className="personal-table-wrapper rounded-2xl border border-[var(--border)] overflow-hidden shadow-md bg-[var(--bg-card)] flex flex-col h-full min-h-0">
            <div className="overflow-y-auto overflow-x-auto custom-scrollbar flex-1 min-h-0">
              <table className="w-full text-left border-separate border-spacing-0" style={{ minWidth: '980px' }}>
                <colgroup>
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '11%' }} />
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
                    {/* WORK TIME */}
                    <th className="sticky top-0 z-20 h-[48px] text-center text-[14px] font-black uppercase tracking-widest border-r border-b border-[var(--border)] bg-[var(--bg-card)] text-sky-700 dark:text-sky-400 align-middle relative overflow-hidden">
                      <div className="absolute inset-0 bg-sky-500/15 pointer-events-none" />
                      <span className="relative z-10">WORK TIME</span>
                    </th>
                    {/* FREE TIME */}
                    <th className="sticky top-0 z-20 h-[48px] text-center text-[14px] font-black uppercase tracking-widest border-r border-b border-[var(--border)] bg-[var(--bg-card)] text-slate-700 dark:text-slate-300 align-middle relative overflow-hidden">
                      <div className="absolute inset-0 bg-slate-500/15 pointer-events-none" />
                      <span className="relative z-10">FREE TIME</span>
                    </th>
                    {/* LEAVE */}
                    <th className="sticky top-0 z-20 h-[48px] text-center text-[14px] font-black uppercase tracking-widest border-r border-b border-[var(--border)] bg-[var(--bg-card)] text-amber-700 dark:text-amber-400 align-middle relative overflow-hidden">
                      <div className="absolute inset-0 bg-amber-500/15 pointer-events-none" />
                      <span className="relative z-10">LEAVE</span>
                    </th>
                    {/* OVER TIME */}
                    <th className="sticky top-0 z-20 h-[48px] text-center text-[14px] font-black uppercase tracking-widest border-r border-b border-[var(--border)] bg-[var(--bg-card)] text-rose-700 dark:text-rose-400 align-middle relative overflow-hidden">
                      <div className="absolute inset-0 bg-rose-500/15 pointer-events-none" />
                      <span className="relative z-10">OVER TIME</span>
                    </th>
                    {/* UTILIZATION RATE */}
                    <th className="sticky top-0 z-20 h-[48px] text-center text-[14px] font-black uppercase tracking-widest border-r border-b border-[var(--border)] bg-[var(--bg-card)] text-purple-700 dark:text-purple-400 align-middle relative overflow-hidden">
                      <div className="absolute inset-0 bg-purple-500/15 pointer-events-none" />
                      <span className="relative z-10">UTILIZATION RATE</span>
                    </th>
                    {/* EFFICIENCY */}
                    <th className="sticky top-0 z-20 h-[48px] text-center text-[14px] font-black uppercase tracking-widest border-b border-[var(--border)] bg-[var(--bg-card)] text-emerald-700 dark:text-emerald-400 align-middle relative overflow-hidden">
                      <div className="absolute inset-0 bg-emerald-500/15 pointer-events-none" />
                      <span className="relative z-10">EFFICIENCY</span>
                    </th>
                  </tr>

                  {/* Sub-headers matching Excel row 2 */}
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
                    <th className="sticky top-[48px] z-20 h-[36px] px-[10px] text-center border-r border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 bg-[var(--bg-card)] align-middle">HOURS</th>
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
                          {row.weekCapacity.toFixed(0)}
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

                        {/* 5. WORK TIME (HOURS) */}
                        <td className="px-[10px] sys-py align-middle text-center font-mono font-bold text-sky-600 dark:text-sky-400 border-r border-b border-[var(--border)]">
                          {row.workTime.toFixed(1)}
                        </td>

                        {/* 6. FREE TIME (HOURS) */}
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
                          <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
                            row.utilizationRate >= 100
                              ? 'text-purple-700 dark:text-purple-300 bg-purple-500/15'
                              : row.utilizationRate >= 70
                              ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-500/15'
                              : 'text-slate-600 dark:text-slate-400 bg-slate-500/15'
                          }`}>
                            {row.utilizationRate.toFixed(1)}%
                          </span>
                        </td>


                        {/* 11. EFFICIENCY (%) */}
                        <td className="sys-py align-middle text-center font-mono font-bold border-b border-[var(--border)]" style={{ paddingRight: '20px', paddingLeft: '10px' }}>
                          <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
                            row.efficiency >= 85
                              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15'
                              : row.efficiency >= 60
                              ? 'text-sky-700 dark:text-sky-300 bg-sky-500/15'
                              : 'text-amber-700 dark:text-amber-300 bg-amber-500/15'
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
                      <div className="flex items-center justify-between pr-2">
                        <span>TOTAL</span>
                        <button
                          onClick={handleExportExcel}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-lg shadow-sm transition-all duration-200 hover:scale-[1.03] cursor-pointer tracking-wider"
                          title="Export Performance Report to Excel (.xlsx)"
                        >
                          <Download size={12} />
                          <span>EXPORT EXCEL</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-[10px] sys-py align-middle text-center font-mono text-[var(--text-contrast)] border-r border-[var(--border)]">
                      {teamPerformanceData.totals.weekCapacity.toFixed(0)}
                    </td>
                    <td className="px-[10px] sys-py align-middle text-center font-mono text-[var(--text-muted)] border-r border-[var(--border)]">
                      -
                    </td>
                    <td className="px-[10px] sys-py align-middle text-center font-mono text-indigo-600 dark:text-indigo-400 border-r border-[var(--border)] bg-indigo-500/10 text-[14px]">
                      {teamPerformanceData.totals.targetTotalHours.toFixed(1)}
                    </td>
                    <td className="px-[10px] sys-py align-middle text-center font-mono text-sky-600 dark:text-sky-400 border-r border-[var(--border)] text-[14px]">
                      {teamPerformanceData.totals.workTime.toFixed(1)}
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
                    <td className="px-[10px] sys-py align-middle text-center font-mono text-purple-600 dark:text-purple-400 border-r border-[var(--border)] text-[14px] bg-purple-500/10 font-bold">
                      {teamPerformanceData.totalUtilizationRate.toFixed(1)}%
                    </td>
                    <td className="sys-py align-middle text-center font-mono text-emerald-600 dark:text-emerald-400 text-[14px] bg-emerald-500/10" style={{ paddingRight: '20px', paddingLeft: '10px' }}>
                      {teamPerformanceData.totalEfficiency.toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PerformanceView;
