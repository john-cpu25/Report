import React, { useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { format, addDays, startOfWeek, getISOWeek } from 'date-fns';
import { ChevronRight, ChevronDown, RefreshCw, ArrowUpDown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabaseClient';
import { calculateDailyWorkingMinutes } from '../../utils/performanceEngine';
import { getCachedApexTimesheetData, subscribeApexTimesheetData, fetchApexTimesheetData } from '../../services/apexTimesheetCache';
import { getCanonicalName, isSameUser } from '../../utils/userUtils';

const TEAM_COLUMNS = [
  {
    id: 'slab',
    title: 'Slab Design',
    sub: 'Number of hours',
    headerBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    headerStyle: { backgroundColor: '#E2EFDA' },
    badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    color: '#10b981'
  },
  {
    id: 'pt',
    title: 'PT&Reo',
    sub: 'Number of hours',
    headerBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    headerStyle: { backgroundColor: '#FCE4D6' },
    badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    color: '#f59e0b'
  },
  {
    id: 'modelling',
    title: 'Modelling',
    sub: 'Number of hours',
    headerBg: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
    headerStyle: { backgroundColor: '#DDEBF7' },
    badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
    color: '#0284c7'
  },
  {
    id: 'lateral',
    title: 'Lateral Design',
    sub: 'Number of hours',
    headerBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
    headerStyle: { backgroundColor: '#E8D7F1' },
    badgeBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
    color: '#8b5cf6'
  }
];

function classifyTaskTeam(rawTeam, taskName) {
  const t = (rawTeam || '').toUpperCase().trim();
  const n = (taskName || '').toUpperCase().trim();

  if (n === 'DESIGN' || n.includes('DESIGN') || n.includes('SLAB') || t.includes('SLAB') || t === 'ENGINEER') return 'slab';
  if (n === 'MTO' || n.includes('PT') || n.includes('REO') || t.includes('PT') || t.includes('REO')) return 'pt';
  if (n === 'DRAFTING' || n.includes('MODEL') || n.includes('REVIT') || t.includes('MODEL') || t.includes('BIM')) return 'modelling';
  if (n === 'QA CHECK' || n.includes('LATERAL') || n.includes('ETABS') || t.includes('LATERAL') || t === 'ETABS') return 'lateral';

  return 'other';
}

const getTaskTextStyle = (taskName) => {
  const t = (taskName || '').toUpperCase().trim();
  if (t === 'DESIGN') return 'text-emerald-600 dark:text-emerald-400';
  if (t === 'DRAFTING') return 'text-sky-600 dark:text-sky-400';
  if (t === 'QA CHECK') return 'text-purple-600 dark:text-purple-400';
  if (t === 'MTO') return 'text-amber-600 dark:text-amber-400';
  if (t === 'MANAGEMENT') return 'text-indigo-600 dark:text-indigo-400';
  if (t === 'LEARNING' || t === 'TRAINING') return 'text-cyan-600 dark:text-cyan-400';
  if (t === 'ANNUAL LEAVE') return 'text-rose-600 dark:text-rose-400';
  if (t === 'R&D') return 'text-fuchsia-600 dark:text-fuchsia-400';
  return 'text-slate-600 dark:text-slate-400';
};

const TotalTimesheetView = forwardRef(({
  currentDate = new Date(),
  getProjectColor = () => '#6366f1',
  selectedTimeMetric = 't1',
  rawUsers = [],
  userTeamByName = {},
  dashboardProjects = [],
  dashboardUsers = [],
  selectedTeam = '',
  selectedProject = '',
  selectedUser = '',
  searchQuery: externalSearchQuery = ''
}, ref) => {
  const cached = getCachedApexTimesheetData();
  const [timesheetRecords, setTimesheetRecords] = useState(cached?.timesheetRecords || []);
  const [timesheetTypes, setTimesheetTypes] = useState(cached?.timesheetTypes || []);
  const [apexTasks, setApexTasks] = useState(cached?.apexTasks || []);
  const [apexUsers, setApexUsers] = useState(cached?.apexUsers || []);
  const [apexProjects, setApexProjects] = useState(cached?.apexProjects || []);
  const [isLoading, setIsLoading] = useState(!cached || !cached.timesheetRecords?.length);

  const [expandedRow, setExpandedRow] = useState(null);
  const [localSearch, setLocalSearch] = useState('');
  const [sortKey, setSortKey] = useState('no');
  const [sortDir, setSortDir] = useState('asc');

  const activeSearch = (externalSearchQuery || localSearch).trim().toLowerCase();

  // Week calculation from currentDate
  const today = currentDate || new Date();
  const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
  const weekDates = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map(i => addDays(currentMonday, i)), [currentMonday]);
  const currentWeek = getISOWeek(today);
  const currentYear = today.getFullYear();

  useEffect(() => {
    // If cache not present, fetch once
    if (!getCachedApexTimesheetData()?.timesheetRecords?.length) {
      setIsLoading(true);
      fetchApexTimesheetData().then(data => {
        if (data) {
          setTimesheetRecords(data.timesheetRecords || []);
          setTimesheetTypes(data.timesheetTypes || []);
          setApexTasks(data.apexTasks || []);
          setApexUsers(data.apexUsers || []);
          setApexProjects(data.apexProjects || []);
        }
        setIsLoading(false);
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
        setIsLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Maps for quick resolution
  const timeSheetTypeMap = useMemo(() => {
    const map = {};
    (timesheetTypes || []).forEach(t => {
      if (t.id) map[t.id] = t.type;
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

  const projectFullNameMap = useMemo(() => {
    const map = {};
    (dashboardProjects || []).forEach(p => {
      const c = (p.key || p.code || p.name || '').trim().toUpperCase();
      if (c && p.name) map[c] = p.name;
    });
    (apexProjects || []).forEach(p => {
      const c = (p.key || p.code || p.name || '').trim().toUpperCase();
      if (c && p.name && !map[c]) map[c] = p.name;
    });
    return map;
  }, [dashboardProjects, apexProjects]);

  // Build Project Summary Data from APEX_TimeSheet & APEX_TimeSheetType
  const projectSummaryData = useMemo(() => {
    const weekStart = weekDates[0];
    const weekEnd = addDays(weekDates[6], 1);

    const weekRecords = timesheetRecords.filter(r => {
      const w = Number(r.week);
      const y = Number(r.year);
      return w === currentWeek && (!y || y === currentYear);
    });

    const summaryMap = {};

    const getProjectEntry = (pCode) => {
      const cleanKey = (pCode || 'UNASSIGNED').trim().toUpperCase();
      if (!summaryMap[cleanKey]) {
        const fullName = projectFullNameMap[cleanKey] || cleanKey;
        summaryMap[cleanKey] = {
          key: cleanKey,
          name: fullName,
          color: getProjectColor(cleanKey),
          slabHours: 0,
          ptHours: 0,
          modellingHours: 0,
          lateralHours: 0,
          totalHours: 0,
          tasks: []
        };
      }
      return summaryMap[cleanKey];
    };

    if (weekRecords.length > 0) {
      weekRecords.forEach(record => {
        const rowHours = (Number(record.mon) || 0) + (Number(record.tue) || 0) + (Number(record.wed) || 0) +
                         (Number(record.thu) || 0) + (Number(record.fri) || 0) + (Number(record.sat) || 0) + (Number(record.sun) || 0);
        if (rowHours <= 0) return;

        const userObj = userMap[record.user_id];
        const projObj = projectMap[record.project_id];

        const userLoc = (userObj?.location || '').toString().toLowerCase();
        // Bỏ location bên Úc (Australia)
        if (userLoc.includes('aus') || userLoc.includes('australia')) return;

        const rawUserName = (userObj?.name || userObj?.full_name || record.user_id || 'Unknown').toString().trim();
        const userName = getCanonicalName(rawUserName);
        const userTeam = (userObj?.team || userTeamByName[rawUserName] || userTeamByName[userName] || 'APEX').toString().trim().toUpperCase();
        const projectKey = (projObj?.key || projObj?.name || 'UNASSIGNED').toString().trim().toUpperCase();
        const projectFullName = projObj?.name || projectKey;
        const taskTypeName = (timeSheetTypeMap[record.kind] || 'GENERAL').toString().trim().toUpperCase();

        // 1. Team filter
        if (selectedTeam) {
          const selT = selectedTeam.trim().toLowerCase();
          if (userTeam.toLowerCase() !== selT) return;
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

        // 3. User filter
        if (selectedUser) {
          if (!isSameUser(rawUserName, selectedUser) && !isSameUser(userName, selectedUser)) return;
        }

        const pEntry = getProjectEntry(projectKey);
        const teamId = classifyTaskTeam(userTeam, taskTypeName);

        if (teamId === 'slab') pEntry.slabHours += rowHours;
        else if (teamId === 'pt') pEntry.ptHours += rowHours;
        else if (teamId === 'modelling') pEntry.modellingHours += rowHours;
        else if (teamId === 'lateral') pEntry.lateralHours += rowHours;

        pEntry.totalHours += rowHours;
        pEntry.tasks.push({
          id: record.id,
          name: taskTypeName,
          user: userName,
          team: userTeam,
          teamId,
          hours: rowHours,
          daily: [
            Number(record.mon) || 0,
            Number(record.tue) || 0,
            Number(record.wed) || 0,
            Number(record.thu) || 0,
            Number(record.fri) || 0,
            Number(record.sat) || 0,
            Number(record.sun) || 0
          ]
        });
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
        if (isNaN(sDate.getTime()) || sDate >= weekEnd || eDate < weekStart) return;

        const projObj = projectMap[t.project_id];
        const projectKey = (projObj?.key || projObj?.name || 'UNASSIGNED').toString().trim().toUpperCase();
        const projectFullName = projObj?.name || projectKey;

        const uId = t.assigned_to_id || t.create_by_id;
        const userObj = userMap[uId];
        const userLoc = (userObj?.location || '').toString().toLowerCase();
        if (userLoc.includes('aus') || userLoc.includes('australia')) return;

        const rawUserName = (userObj?.name || userObj?.full_name || 'Unknown').toString().trim();
        const userName = getCanonicalName(rawUserName);
        const userTeam = (userObj?.team || userTeamByName[rawUserName] || userTeamByName[userName] || t.team || 'APEX').toString().trim().toUpperCase();

        if (selectedTeam && userTeam.toLowerCase() !== selectedTeam.trim().toLowerCase()) return;
        if (selectedUser) {
          if (!isSameUser(rawUserName, selectedUser) && !isSameUser(userName, selectedUser)) return;
        }
        if (selectedProject) {
          const selP = selectedProject.trim().toLowerCase();
          if (projectKey.toLowerCase() !== selP && projectFullName.toLowerCase() !== selP && !projectFullName.toLowerCase().includes(selP) && !projectKey.toLowerCase().includes(selP)) return;
        }

        const taskName = (t.name || t.detail || '(no detail)').toString().trim();
        const teamId = classifyTaskTeam(t.team || userTeam, taskName);

        const breakdown = calculateDailyWorkingMinutes(rangeStart, rangeEnd);
        let taskWeekMinutes = 0;
        Object.entries(breakdown).forEach(([dateStr, mins]) => {
          const d = new Date(dateStr);
          if (d >= weekStart && d < weekEnd) {
            taskWeekMinutes += mins;
          }
        });

        const taskHours = taskWeekMinutes > 0 ? (taskWeekMinutes / 60) : 0;
        if (taskHours > 0) {
          const pEntry = getProjectEntry(projectKey);
          if (teamId === 'slab') pEntry.slabHours += taskHours;
          else if (teamId === 'pt') pEntry.ptHours += taskHours;
          else if (teamId === 'modelling') pEntry.modellingHours += taskHours;
          else if (teamId === 'lateral') pEntry.lateralHours += taskHours;

          pEntry.totalHours += taskHours;
          pEntry.tasks.push({
            id: t.id,
            name: taskName,
            user: userName,
            team: t.team || userTeam,
            teamId,
            hours: taskHours
          });
        }
      });
    }

    let rows = Object.values(summaryMap);

    const totals = {
      slab: 0,
      pt: 0,
      modelling: 0,
      lateral: 0,
      grandTotal: 0
    };

    rows.forEach(r => {
      // Vẫn show đủ APEX time, nhưng chỗ total sẽ không có giờ APEX
      const isApex = (r.key || '').trim().toUpperCase() === 'APEX' || 
                     ((r.name || '').trim().toUpperCase() === 'APEX');
      if (isApex) return;

      totals.slab += r.slabHours;
      totals.pt += r.ptHours;
      totals.modelling += r.modellingHours;
      totals.lateral += r.lateralHours;
      totals.grandTotal += r.totalHours;
    });

    return { rows, totals };
  }, [timesheetRecords, timesheetTypes, timeSheetTypeMap, apexTasks, userMap, projectMap, projectFullNameMap, currentWeek, currentYear, weekDates, selectedTimeMetric, userTeamByName, getProjectColor, selectedTeam, selectedProject, selectedUser]);

  // Filtering & Sorting
  const filteredAndSortedRows = useMemo(() => {
    let list = [...projectSummaryData.rows];

    if (activeSearch) {
      list = list.filter(r => {
        const matchKey = r.key.toLowerCase().includes(activeSearch);
        const matchName = r.name.toLowerCase().includes(activeSearch);
        const matchTask = r.tasks.some(t => 
          t.name.toLowerCase().includes(activeSearch) || 
          t.user.toLowerCase().includes(activeSearch)
        );
        return matchKey || matchName || matchTask;
      });
    }

    list.sort((a, b) => {
      let valA = a.totalHours;
      let valB = b.totalHours;

      if (sortKey === 'key') {
        valA = a.key;
        valB = b.key;
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortKey === 'name') {
        valA = a.name;
        valB = b.name;
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortKey === 'slab') {
        valA = a.slabHours;
        valB = b.slabHours;
      } else if (sortKey === 'pt') {
        valA = a.ptHours;
        valB = b.ptHours;
      } else if (sortKey === 'modelling') {
        valA = a.modellingHours;
        valB = b.modellingHours;
      } else if (sortKey === 'lateral') {
        valA = a.lateralHours;
        valB = b.lateralHours;
      } else if (sortKey === 'total' || sortKey === 'no') {
        valA = a.totalHours;
        valB = b.totalHours;
      }

      return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [projectSummaryData.rows, activeSearch, sortKey, sortDir]);

  const tableTotals = useMemo(() => {
    const totals = { slab: 0, pt: 0, modelling: 0, lateral: 0, grandTotal: 0 };
    filteredAndSortedRows.forEach(r => {
      totals.slab += r.slabHours;
      totals.pt += r.ptHours;
      totals.modelling += r.modellingHours;
      totals.lateral += r.lateralHours;
      totals.grandTotal += r.totalHours;
    });
    return totals;
  }, [filteredAndSortedRows]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const formatHours = (h) => {
    return h > 0 ? h.toFixed(2) : '';
  };

  const handleExportExcel = useCallback(() => {
    try {
      const wb = XLSX.utils.book_new();

      // ── SHEET 1: PROJECT SUMMARY ──
      const summaryRows = [
        [`APEX SOUTHERN CROSS ENGINEERING - TOTAL TIMESHEET SUMMARY`],
        [`Week: W${currentWeek} (${format(weekDates[0], 'dd/MM/yyyy')} - ${format(weekDates[6], 'dd/MM/yyyy')}) | Year: ${currentYear}`],
        [],
        [
          'No.',
          'Project Code',
          'Project Name',
          'Slab Design (hrs)',
          'PT&Reo (hrs)',
          'Modelling (hrs)',
          'Lateral Design (hrs)',
          'Total Hours (hrs)'
        ]
      ];

      filteredAndSortedRows.forEach((r, idx) => {
        summaryRows.push([
          idx + 1,
          r.key || 'UNASSIGNED',
          r.name || r.key || '',
          r.slabHours > 0 ? Number(r.slabHours.toFixed(2)) : '',
          r.ptHours > 0 ? Number(r.ptHours.toFixed(2)) : '',
          r.modellingHours > 0 ? Number(r.modellingHours.toFixed(2)) : '',
          r.lateralHours > 0 ? Number(r.lateralHours.toFixed(2)) : '',
          r.totalHours > 0 ? Number(r.totalHours.toFixed(2)) : 0
        ]);
      });

      // Total row
      summaryRows.push([
        'TOTAL',
        '',
        '',
        tableTotals.slab > 0 ? Number(tableTotals.slab.toFixed(2)) : '',
        tableTotals.pt > 0 ? Number(tableTotals.pt.toFixed(2)) : '',
        tableTotals.modelling > 0 ? Number(tableTotals.modelling.toFixed(2)) : '',
        tableTotals.lateral > 0 ? Number(tableTotals.lateral.toFixed(2)) : '',
        tableTotals.grandTotal > 0 ? Number(tableTotals.grandTotal.toFixed(2)) : 0
      ]);

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary['!cols'] = [
        { wch: 8 },  // No.
        { wch: 25 }, // Project Code
        { wch: 45 }, // Project Name
        { wch: 18 }, // Slab Design
        { wch: 18 }, // PT&Reo
        { wch: 18 }, // Modelling
        { wch: 22 }, // Lateral Design
        { wch: 18 }  // Total Hours
      ];

      XLSX.utils.book_append_sheet(wb, wsSummary, `W${currentWeek} Summary`);

      // ── SHEET 2: DETAILED TASKS BREAKDOWN ──
      const detailRows = [
        [`APEX SOUTHERN CROSS ENGINEERING - TIMESHEET TASKS BREAKDOWN`],
        [`Week: W${currentWeek} (${format(weekDates[0], 'dd/MM/yyyy')} - ${format(weekDates[6], 'dd/MM/yyyy')}) | Year: ${currentYear}`],
        [],
        [
          'No.',
          'Project Code',
          'Project Name',
          'Member',
          'Team',
          'Discipline / Category',
          'Task Type / Name',
          `Mon (${format(weekDates[0], 'dd/MM')})`,
          `Tue (${format(weekDates[1], 'dd/MM')})`,
          `Wed (${format(weekDates[2], 'dd/MM')})`,
          `Thu (${format(weekDates[3], 'dd/MM')})`,
          `Fri (${format(weekDates[4], 'dd/MM')})`,
          `Sat (${format(weekDates[5], 'dd/MM')})`,
          `Sun (${format(weekDates[6], 'dd/MM')})`,
          'Total Hours (hrs)'
        ]
      ];

      let taskIdx = 1;
      filteredAndSortedRows.forEach(r => {
        (r.tasks || []).forEach(t => {
          const teamLabel = t.teamId === 'slab' ? 'Slab Design' :
                            t.teamId === 'pt' ? 'PT&Reo' :
                            t.teamId === 'modelling' ? 'Modelling' :
                            t.teamId === 'lateral' ? 'Lateral Design' : (t.team || 'Other');
          const daily = t.daily || [0, 0, 0, 0, 0, 0, 0];
          detailRows.push([
            taskIdx++,
            r.key,
            r.name,
            t.user || 'Unknown',
            t.team || '',
            teamLabel,
            t.name || '',
            daily[0] > 0 ? Number(daily[0].toFixed(2)) : '',
            daily[1] > 0 ? Number(daily[1].toFixed(2)) : '',
            daily[2] > 0 ? Number(daily[2].toFixed(2)) : '',
            daily[3] > 0 ? Number(daily[3].toFixed(2)) : '',
            daily[4] > 0 ? Number(daily[4].toFixed(2)) : '',
            daily[5] > 0 ? Number(daily[5].toFixed(2)) : '',
            daily[6] > 0 ? Number(daily[6].toFixed(2)) : '',
            t.hours > 0 ? Number(t.hours.toFixed(2)) : 0
          ]);
        });
      });

      if (detailRows.length > 4) {
        const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
        wsDetail['!cols'] = [
          { wch: 8 },  // No.
          { wch: 22 }, // Project Code
          { wch: 35 }, // Project Name
          { wch: 22 }, // Member
          { wch: 16 }, // Team
          { wch: 20 }, // Discipline
          { wch: 28 }, // Task Type / Name
          { wch: 12 }, // Mon
          { wch: 12 }, // Tue
          { wch: 12 }, // Wed
          { wch: 12 }, // Thu
          { wch: 12 }, // Fri
          { wch: 12 }, // Sat
          { wch: 12 }, // Sun
          { wch: 16 }  // Total Hours
        ];
        XLSX.utils.book_append_sheet(wb, wsDetail, `Tasks Detail`);
      }

      const fileName = `APEX_Total_Timesheet_W${currentWeek}_${currentYear}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Error exporting Total Timesheet to Excel:', err);
    }
  }, [filteredAndSortedRows, tableTotals, currentWeek, currentYear, weekDates]);

  useImperativeHandle(ref, () => ({
    refresh: fetchApexTimesheetData,
    exportExcel: handleExportExcel,
    exportCSV: handleExportExcel
  }), [handleExportExcel]);

  return (
    <div className="personal-table-wrapper rounded-2xl border border-[var(--border)] overflow-hidden shadow-md bg-[var(--bg-card)] animate-in fade-in duration-300">
      <div className="max-h-[calc(100vh-335px)] overflow-y-auto overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-separate border-spacing-0" style={{ minWidth: '1220px' }}>
          <colgroup>
            <col style={{ width: '65px' }} />
            <col style={{ width: '280px' }} />
            <col style={{ width: '25%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>

          <thead>
            {/* Top Level Grouped Headers */}
            <tr className="th-primary dark:text-white">
              {/* 1. No. */}
              <th 
                onClick={() => handleSort('no')}
                className="sticky top-0 z-20 h-[48px] text-center border-r border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-[var(--text-contrast)] dark:text-white bg-[var(--bg-card)] align-middle cursor-pointer hover:bg-slate-500/10 transition-colors"
                style={{ paddingLeft: '16px', paddingRight: '12px' }}
              >
                No.
              </th>

              {/* 2. Project Code Name */}
              <th 
                onClick={() => handleSort('key')}
                className="sticky top-0 z-20 h-[48px] text-left border-r border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-[var(--text-contrast)] dark:text-white bg-[var(--bg-card)] align-middle cursor-pointer hover:bg-slate-500/10 transition-colors min-w-[260px]"
                style={{ paddingLeft: '20px', paddingRight: '16px' }}
              >
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span>PROJECT</span>
                  <ArrowUpDown size={12} className="opacity-50" />
                </div>
              </th>

              {/* 3. Project Name (Full Name) */}
              <th 
                onClick={() => handleSort('name')}
                className="sticky top-0 z-20 h-[48px] text-left border-r border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-[var(--text-contrast)] dark:text-white bg-[var(--bg-card)] align-middle cursor-pointer hover:bg-slate-500/10 transition-colors"
                style={{ paddingLeft: '20px', paddingRight: '16px' }}
              >
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span>PROJECT NAME</span>
                  <ArrowUpDown size={12} className="opacity-50" />
                </div>
              </th>

              {/* 4. Slab Design */}
              <th 
                onClick={() => handleSort('slab')}
                className="sticky top-0 z-20 h-[48px] px-[10px] text-center text-[13px] font-black uppercase tracking-widest border-r border-b border-[var(--border)] align-middle cursor-pointer hover:opacity-90 transition-opacity bg-[var(--bg-card)] text-emerald-800 dark:text-emerald-300 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-emerald-500/15 pointer-events-none" />
                <span className="relative z-10">Slab Design</span>
              </th>

              {/* 5. PT&Reo */}
              <th 
                onClick={() => handleSort('pt')}
                className="sticky top-0 z-20 h-[48px] px-[10px] text-center text-[13px] font-black uppercase tracking-widest border-r border-b border-[var(--border)] align-middle cursor-pointer hover:opacity-90 transition-opacity bg-[var(--bg-card)] text-amber-800 dark:text-amber-300 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-amber-500/15 pointer-events-none" />
                <span className="relative z-10">PT&Reo</span>
              </th>

              {/* 6. Modelling */}
              <th 
                onClick={() => handleSort('modelling')}
                className="sticky top-0 z-20 h-[48px] px-[10px] text-center text-[13px] font-black uppercase tracking-widest border-r border-b border-[var(--border)] align-middle cursor-pointer hover:opacity-90 transition-opacity bg-[var(--bg-card)] text-sky-800 dark:text-sky-300 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-sky-500/15 pointer-events-none" />
                <span className="relative z-10">Modelling</span>
              </th>

              {/* 7. Lateral Design */}
              <th 
                onClick={() => handleSort('lateral')}
                className="sticky top-0 z-20 h-[48px] px-[10px] text-center text-[13px] font-black uppercase tracking-widest border-r border-b border-[var(--border)] align-middle cursor-pointer hover:opacity-90 transition-opacity bg-[var(--bg-card)] text-purple-800 dark:text-purple-300 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-purple-500/15 pointer-events-none" />
                <span className="relative z-10">Lateral Design</span>
              </th>

              {/* 8. Total Number of Hours */}
              <th 
                onClick={() => handleSort('total')}
                className="sticky top-0 z-20 h-[48px] text-center border-b border-[var(--border)] text-[12px] font-black uppercase tracking-widest text-[var(--text-contrast)] dark:text-white bg-[var(--bg-card)] align-middle cursor-pointer hover:bg-slate-500/10 transition-colors"
                style={{ paddingRight: '20px', paddingLeft: '10px' }}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>TOTAL</span>
                  <ArrowUpDown size={12} className="opacity-50" />
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border)]">
            {(isLoading && !timesheetRecords.length) ? (
              <tr>
                <td colSpan={8} className="sys-py text-center text-sm text-[var(--text-muted)] font-medium border-b border-[var(--border)] py-12">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw size={16} className="animate-spin text-teal-500" />
                    <span>Đang tải dữ liệu tổng hợp APEX_TimeSheet...</span>
                  </div>
                </td>
              </tr>
            ) : filteredAndSortedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="sys-py text-center text-sm text-[var(--text-muted)] font-medium border-b border-[var(--border)] py-12">
                  Chưa có dữ liệu TimeSheet cho tuần {currentWeek} ({currentYear}).
                </td>
              </tr>
            ) : (
              filteredAndSortedRows.map((r, idx) => {
                const isExpanded = expandedRow === r.key;
                return (
                  <React.Fragment key={r.key}>
                    <tr 
                      onClick={() => setExpandedRow(prev => prev === r.key ? null : r.key)}
                      className={`hover:bg-[var(--bg-surface)] transition-colors text-[14px] align-middle cursor-pointer group ${
                        isExpanded ? 'bg-indigo-500/[0.04]' : idx % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-surface)]/25'
                      }`}
                    >
                      {/* 1. No. */}
                      <td 
                        className="sys-py text-center font-mono font-bold text-[var(--text-muted)] border-r border-b border-[var(--border)]"
                        style={{ paddingLeft: '16px', paddingRight: '12px', verticalAlign: 'middle' }}
                      >
                        {idx + 1}
                      </td>

                      {/* 2. Project Code Name */}
                      <td 
                        className="sys-py border-r border-b border-[var(--border)]"
                        style={{ paddingLeft: '20px', paddingRight: '16px', verticalAlign: 'middle' }}
                      >
                        <div className="flex items-center gap-2.5">
                          <button 
                            type="button" 
                            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700/60 transition-colors text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                          >
                            {isExpanded ? <ChevronDown size={14} className="text-teal-500" /> : <ChevronRight size={14} />}
                          </button>
                          <span 
                            className="font-bold text-[13px] tracking-wide uppercase line-clamp-1"
                            style={{ color: r.color }}
                          >
                            {r.key}
                          </span>
                        </div>
                      </td>

                      {/* 3. Project Name (Full Name) */}
                      <td 
                        className="sys-py font-medium text-[var(--text-contrast)] border-r border-b border-[var(--border)]"
                        style={{ paddingLeft: '20px', paddingRight: '16px', verticalAlign: 'middle' }}
                      >
                        <div className="line-clamp-1 text-[13px]" title={r.name}>
                          {r.name}
                        </div>
                      </td>

                      {/* Slab Design Hours */}
                      <td className="sys-py px-[10px] text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 border-r border-b border-[var(--border)]" style={{ verticalAlign: 'middle' }}>
                        {formatHours(r.slabHours)}
                      </td>

                      {/* PT&Reo Hours */}
                      <td className="sys-py px-[10px] text-center font-mono font-bold text-amber-600 dark:text-amber-400 border-r border-b border-[var(--border)]" style={{ verticalAlign: 'middle' }}>
                        {formatHours(r.ptHours)}
                      </td>

                      {/* Modelling Hours */}
                      <td className="sys-py px-[10px] text-center font-mono font-bold text-sky-600 dark:text-sky-400 border-r border-b border-[var(--border)]" style={{ verticalAlign: 'middle' }}>
                        {formatHours(r.modellingHours)}
                      </td>

                      {/* Lateral Design Hours */}
                      <td className="sys-py px-[10px] text-center font-mono font-bold text-purple-600 dark:text-purple-400 border-r border-b border-[var(--border)]" style={{ verticalAlign: 'middle' }}>
                        {formatHours(r.lateralHours)}
                      </td>

                      {/* Total number of hours */}
                      <td 
                        className="sys-py text-center font-mono font-black text-[var(--text-contrast)] text-[14px] border-b border-[var(--border)]"
                        style={{ paddingRight: '20px', paddingLeft: '10px', verticalAlign: 'middle' }}
                      >
                        {r.totalHours.toFixed(1)}
                      </td>
                    </tr>

                    {/* Drill-down Detail: Header Row */}
                    {isExpanded && (
                      <tr className="bg-slate-200/90 dark:bg-slate-800 animate-in fade-in duration-150">
                        <td className="border-r border-b border-white dark:border-slate-700/80" />
                        <td 
                          colSpan={7} 
                          className="sys-py text-[12px] font-bold uppercase text-slate-600 dark:text-slate-300 tracking-wider border-b border-white dark:border-slate-700/80"
                          style={{ paddingLeft: '20px' }}
                        >
                          Tasks / Types for [{r.key}] ({r.tasks.length} entries)
                        </td>
                      </tr>
                    )}

                    {/* Drill-down Detail: Direct Task Rows sharing the table columns */}
                    {isExpanded && r.tasks.map((t, ti) => {
                      const isLastTask = ti === r.tasks.length - 1;
                      const horizontalBorder = isLastTask 
                        ? 'border-b-2 border-slate-300 dark:border-slate-700' 
                        : 'border-b border-white dark:border-slate-800/80';

                      return (
                        <tr 
                          key={ti} 
                          className="bg-slate-100/95 dark:bg-slate-900/75 hover:bg-slate-200/80 dark:hover:bg-slate-800/80 transition-colors text-[13px] animate-in fade-in duration-150"
                        >
                          {/* 1. No. (Empty) */}
                          <td className={`border-r border-white dark:border-slate-800/80 ${horizontalBorder} text-center font-medium`} />

                          {/* 2 & 3. Task Type + User */}
                          <td 
                            colSpan={2} 
                            className={`sys-py pr-4 truncate text-left border-r border-white dark:border-slate-800/80 ${horizontalBorder}`}
                            style={{ paddingLeft: '20px', verticalAlign: 'middle' }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`font-bold uppercase text-[12px] tracking-wide ${getTaskTextStyle(t.name)}`}>
                                {t.name}
                              </span>
                              <span className="font-semibold text-slate-600 dark:text-slate-400 truncate text-[12px]">
                                ({t.user})
                              </span>
                            </div>
                          </td>

                          {/* 4. Slab Design */}
                          <td className={`sys-py px-[10px] text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 border-r border-white dark:border-slate-800/80 ${horizontalBorder}`} style={{ verticalAlign: 'middle' }}>
                            {t.teamId === 'slab' && t.hours > 0 ? `${t.hours.toFixed(1)}h` : ''}
                          </td>

                          {/* 5. PT&Reo */}
                          <td className={`sys-py px-[10px] text-center font-mono font-bold text-amber-600 dark:text-amber-400 border-r border-white dark:border-slate-800/80 ${horizontalBorder}`} style={{ verticalAlign: 'middle' }}>
                            {t.teamId === 'pt' && t.hours > 0 ? `${t.hours.toFixed(1)}h` : ''}
                          </td>

                          {/* 6. Modelling */}
                          <td className={`sys-py px-[10px] text-center font-mono font-bold text-sky-600 dark:text-sky-400 border-r border-white dark:border-slate-800/80 ${horizontalBorder}`} style={{ verticalAlign: 'middle' }}>
                            {t.teamId === 'modelling' && t.hours > 0 ? `${t.hours.toFixed(1)}h` : ''}
                          </td>

                          {/* 7. Lateral Design */}
                          <td className={`sys-py px-[10px] text-center font-mono font-bold text-purple-600 dark:text-purple-400 border-r border-white dark:border-slate-800/80 ${horizontalBorder}`} style={{ verticalAlign: 'middle' }}>
                            {t.teamId === 'lateral' && t.hours > 0 ? `${t.hours.toFixed(1)}h` : ''}
                          </td>

                          {/* 8. Total Number of Hours */}
                          <td className={`sys-py text-center font-mono font-bold text-slate-700 dark:text-slate-300 ${horizontalBorder}`} style={{ paddingRight: '20px', paddingLeft: '10px' }}>
                            {t.hours > 0 ? `${t.hours.toFixed(1)}h` : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>

          {/* Table Footer: TOTAL Row */}
          <tfoot>
            <tr className="bg-[var(--bg-surface)] font-black text-[14px] border-t-2 border-[var(--border)] shadow-md sticky bottom-0 z-20">
              <td 
                colSpan={3} 
                className="sys-py text-left uppercase tracking-wider border-r border-[var(--border)] text-[var(--text-contrast)]"
                style={{ paddingLeft: '20px', verticalAlign: 'middle' }}
              >
                <div className="flex items-center justify-between pr-4">
                  <span>TOTAL</span>
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-black rounded-lg shadow-sm transition-all duration-200 hover:scale-[1.03] cursor-pointer tracking-wider"
                    title="Export this table to Excel (.xlsx)"
                  >
                    <Download size={13} />
                    <span>EXPORT EXCEL</span>
                  </button>
                </div>
              </td>

              {/* Total Slab Design */}
              <td className="sys-py px-[10px] text-center font-mono text-emerald-600 dark:text-emerald-400 border-r border-[var(--border)]" style={{ verticalAlign: 'middle' }}>
                {tableTotals.slab > 0 ? tableTotals.slab.toFixed(2) : '-'}
              </td>

              {/* Total PT&Reo */}
              <td className="sys-py px-[10px] text-center font-mono text-amber-600 dark:text-amber-400 border-r border-[var(--border)]" style={{ verticalAlign: 'middle' }}>
                {tableTotals.pt > 0 ? tableTotals.pt.toFixed(2) : '-'}
              </td>

              {/* Total Modelling */}
              <td className="sys-py px-[10px] text-center font-mono text-sky-600 dark:text-sky-400 border-r border-[var(--border)]" style={{ verticalAlign: 'middle' }}>
                {tableTotals.modelling > 0 ? tableTotals.modelling.toFixed(2) : '-'}
              </td>

              {/* Total Lateral Design */}
              <td className="sys-py px-[10px] text-center font-mono text-purple-600 dark:text-purple-400 border-r border-[var(--border)]" style={{ verticalAlign: 'middle' }}>
                {tableTotals.lateral > 0 ? tableTotals.lateral.toFixed(2) : '-'}
              </td>

              {/* Grand Total */}
              <td 
                className="sys-py text-center font-mono text-[var(--text-contrast)]"
                style={{ paddingRight: '20px', paddingLeft: '10px', verticalAlign: 'middle' }}
              >
                {tableTotals.grandTotal > 0 ? tableTotals.grandTotal.toFixed(1) : '-'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
});

export default TotalTimesheetView;
