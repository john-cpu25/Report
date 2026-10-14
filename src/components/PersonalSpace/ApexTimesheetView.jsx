import React, { useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { format, isSameDay, addDays, startOfWeek, getISOWeek } from 'date-fns';
import { CalendarDays, RefreshCw, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabaseClient';
import { getCachedApexTimesheetData, subscribeApexTimesheetData, fetchApexTimesheetData } from '../../services/apexTimesheetCache';
import { getCanonicalName, isSameUser } from '../../utils/userUtils';
import { getWeeksForMonth, getMonthFromISOWeek, isRecordInTimeRange } from '../../utils/timeUtils';

const formatHoursAndMinutes = (hoursDecimal) => {
  if (!hoursDecimal || hoursDecimal <= 0) return '';
  const totalMinutes = Math.round(hoursDecimal * 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${mins}m`;
};

const getTaskTypeTextStyle = (typeStr) => {
  const t = (typeStr || '').toUpperCase().trim();
  if (t === 'DESIGN') return 'text-emerald-600 dark:text-emerald-400';
  if (t === 'DRAFTING') return 'text-sky-600 dark:text-sky-400';
  if (t === 'QA CHECK') return 'text-purple-600 dark:text-purple-400';
  if (t === 'MTO') return 'text-amber-600 dark:text-amber-400';
  if (t === 'MANAGEMENT') return 'text-indigo-600 dark:text-indigo-400';
  if (t === 'LEARNING' || t === 'TRAINING') return 'text-cyan-600 dark:text-cyan-400';
  if (t === 'ANNUAL LEAVE') return 'text-rose-600 dark:text-rose-400';
  if (t === 'R&D') return 'text-fuchsia-600 dark:text-fuchsia-400';
  return 'text-[var(--text-contrast)]';
};

const ApexTimesheetView = forwardRef(({
  currentDate = new Date(),
  timeRange = 'week',
  selectedWeeks = [],
  getProjectColor = () => 'var(--text-contrast)',
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

  // Date / Range calculation from currentDate
  const today = currentDate || new Date();
  const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
  const weekDates = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map(i => addDays(currentMonday, i)), [currentMonday]);
  const currentWeek = getISOWeek(today);
  const currentYear = today.getFullYear();

  const monthWeeks = useMemo(() => {
    return getWeeksForMonth(currentYear, today.getMonth());
  }, [currentYear, today]);

  // Dynamic table columns based on timeRange
  const columns = useMemo(() => {
    if (timeRange === 'year') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthNames.map((name, i) => ({
        id: `m_${i}`,
        index: i,
        label: name,
        sub: `Tháng ${i + 1}`,
        width: '65px'
      }));
    }
    if (timeRange === 'month') {
      return monthWeeks.map((wk, i) => ({
        id: `w_${wk}`,
        weekNum: wk,
        index: i,
        label: `W${wk}`,
        sub: `Tuần ${wk}`,
        width: '85px'
      }));
    }
    if (timeRange === 'custom') {
      const sortedWk = [...selectedWeeks].sort((a, b) => a - b);
      return sortedWk.map((wk, i) => ({
        id: `w_${wk}`,
        weekNum: wk,
        index: i,
        label: `W${wk}`,
        sub: `Tuần ${wk}`,
        width: '85px'
      }));
    }
    // Default 'week'
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return weekDates.map((date, i) => {
      const isToday = isSameDay(date, new Date());
      const isWeekendDay = i >= 5;
      return {
        id: `d_${i}`,
        index: i,
        date,
        label: dayLabels[i],
        sub: format(date, 'dd/MM'),
        isToday,
        isWeekendDay,
        width: '75px'
      };
    });
  }, [timeRange, monthWeeks, weekDates, selectedWeeks]);

  useEffect(() => {
    // If not cached yet, fetch once
    if (!getCachedApexTimesheetData()?.timesheetRecords?.length) {
      setIsLoading(true);
      fetchApexTimesheetData().then(data => {
        if (data) {
          setTimesheetRecords(data.timesheetRecords || []);
          setTimesheetTypes(data.timesheetTypes || []);
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
        setApexUsers(data.apexUsers || []);
        setApexProjects(data.apexProjects || []);
        setIsLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Map for APEX_TimeSheetType resolution
  const timeSheetTypeMap = useMemo(() => {
    const map = {};
    (timesheetTypes || []).forEach(t => {
      if (t.id) map[t.id] = t.type;
    });
    return map;
  }, [timesheetTypes]);

  // Maps for quick resolution
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

  // Build Timesheet Data structure directly from APEX_TimeSheet & APEX_TimeSheetType
  const timesheetData = useMemo(() => {
    const weekRecords = timesheetRecords.filter(r => {
      return isRecordInTimeRange(r.week, r.year, today, timeRange, monthWeeks, selectedWeeks);
    });

    const numCols = columns.length;

    if (weekRecords.length === 0) {
      return {
        weekNumber: currentWeek,
        monday: currentMonday,
        weekDates,
        columns,
        teams: [],
        totalPerCol: new Array(numCols).fill(0),
        grandTotalHours: 0
      };
    }

    // Grouping by Team -> Project -> Task/User
    const teamMap = {};

    weekRecords.forEach(record => {
      const userObj = userMap[record.user_id];
      const projObj = projectMap[record.project_id];

      const userLoc = (userObj?.location || '').toString().toLowerCase();
      // Bỏ location bên Úc (Australia)
      if (userLoc.includes('aus') || userLoc.includes('australia')) return;

      const rawUserName = (userObj?.name || userObj?.full_name || record.user_id || 'Unknown').toString().trim();
      const userName = getCanonicalName(rawUserName);
      const teamName = (userObj?.team || userTeamByName[rawUserName] || userTeamByName[userName] || 'APEX').toString().trim().toUpperCase();
      // CHỈ LẤY PROJECT CODE (key hoặc code, nếu không có mới fallback về name)
      const projectCode = (projObj?.key || projObj?.code || projObj?.name || 'UNASSIGNED').toString().trim().toUpperCase();
      const projectFullName = projObj?.name || projectCode;
      const taskType = (timeSheetTypeMap[record.kind] || 'GENERAL').toString().trim().toUpperCase();

      // 1. Team filter
      if (selectedTeam) {
        const selT = selectedTeam.trim().toLowerCase();
        if (teamName.toLowerCase() !== selT) return;
      }

      // 2. Project filter
      if (selectedProject) {
        const selP = selectedProject.trim().toLowerCase();
        const matchProj = projectCode.toLowerCase() === selP ||
                          projectFullName.toLowerCase() === selP ||
                          projectFullName.toLowerCase().includes(selP) ||
                          projectCode.toLowerCase().includes(selP);
        if (!matchProj) return;
      }

      // 3. User / Member filter
      if (selectedUser) {
        if (!isSameUser(rawUserName, selectedUser) && !isSameUser(userName, selectedUser)) return;
      }

      // 4. Search text filter
      if (searchQuery) {
        const q = searchQuery.trim().toLowerCase();
        const matchSearch = userName.toLowerCase().includes(q) ||
                            rawUserName.toLowerCase().includes(q) ||
                            projectCode.toLowerCase().includes(q) ||
                            projectFullName.toLowerCase().includes(q) ||
                            taskType.toLowerCase().includes(q) ||
                            teamName.toLowerCase().includes(q);
        if (!matchSearch) return;
      }

      const rowSum = (Number(record.mon) || 0) + (Number(record.tue) || 0) + (Number(record.wed) || 0) +
                     (Number(record.thu) || 0) + (Number(record.fri) || 0) + (Number(record.sat) || 0) + (Number(record.sun) || 0);

      const recordColHours = new Array(numCols).fill(0);

      if (timeRange === 'year') {
        const mIdx = getMonthFromISOWeek(Number(record.week), currentYear);
        if (mIdx >= 0 && mIdx < numCols) {
          recordColHours[mIdx] = rowSum;
        }
      } else if (timeRange === 'month') {
        const wIdx = monthWeeks.indexOf(Number(record.week));
        if (wIdx >= 0 && wIdx < numCols) {
          recordColHours[wIdx] = rowSum;
        }
      } else if (timeRange === 'custom') {
        const sortedWk = [...selectedWeeks].sort((a, b) => a - b);
        const wIdx = sortedWk.indexOf(Number(record.week));
        if (wIdx >= 0 && wIdx < numCols) {
          recordColHours[wIdx] = rowSum;
        }
      } else {
        // week
        recordColHours[0] = Number(record.mon) || 0;
        recordColHours[1] = Number(record.tue) || 0;
        recordColHours[2] = Number(record.wed) || 0;
        recordColHours[3] = Number(record.thu) || 0;
        recordColHours[4] = Number(record.fri) || 0;
        recordColHours[5] = Number(record.sat) || 0;
        recordColHours[6] = Number(record.sun) || 0;
      }

      if (!teamMap[teamName]) teamMap[teamName] = {};
      if (!teamMap[teamName][projectCode]) teamMap[teamName][projectCode] = {};

      const itemKey = `${taskType}|||${userName}`;
      if (!teamMap[teamName][projectCode][itemKey]) {
        teamMap[teamName][projectCode][itemKey] = {
          taskName: taskType,
          userName,
          hours: [...recordColHours],
          totalHours: rowSum,
          projectCode,
          projectFullName
        };
      } else {
        for (let i = 0; i < numCols; i++) {
          teamMap[teamName][projectCode][itemKey].hours[i] += recordColHours[i];
        }
        teamMap[teamName][projectCode][itemKey].totalHours += rowSum;
      }
    });

    const teams = Object.entries(teamMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([teamName, projects]) => {
        const teamProjects = Object.entries(projects)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([projectCode, taskItems]) => {
            const projectTasks = Object.values(taskItems)
              .sort((a, b) => a.userName.localeCompare(b.userName) || a.taskName.localeCompare(b.taskName));

            return {
              name: projectCode,
              fullName: projectTasks[0]?.projectFullName || projectCode,
              tasks: projectTasks,
              totalRows: projectTasks.length
            };
          });

        return {
          name: teamName,
          projects: teamProjects,
          totalRows: teamProjects.reduce((acc, p) => acc + p.totalRows, 0)
        };
      });

    const totalPerCol = new Array(numCols).fill(0);
    teams.forEach(team => {
      team.projects.forEach(project => {
        project.tasks.forEach(task => {
          task.hours.forEach((val, i) => { if (i < totalPerCol.length) totalPerCol[i] += val; });
        });
      });
    });

    return {
      weekNumber: currentWeek,
      monday: currentMonday,
      weekDates,
      columns,
      teams,
      totalPerCol,
      grandTotalHours: totalPerCol.reduce((a, b) => a + b, 0)
    };
  }, [timesheetRecords, timesheetTypes, timeSheetTypeMap, userMap, projectMap, currentWeek, currentYear, currentMonday, weekDates, today, timeRange, monthWeeks, selectedWeeks, columns, userTeamByName, selectedTeam, selectedProject, selectedUser, searchQuery]);

  const handleExportExcel = useCallback(() => {
    try {
      const wb = XLSX.utils.book_new();
      const periodLabel = timeRange === 'week'
        ? `Week: W${currentWeek} (${format(weekDates[0], 'dd/MM/yyyy')} - ${format(weekDates[6], 'dd/MM/yyyy')}) | Year: ${currentYear}`
        : timeRange === 'month'
        ? `Month: ${format(today, 'MM/yyyy')} | Year: ${currentYear}`
        : timeRange === 'custom'
        ? `Custom Weeks: ${[...selectedWeeks].sort((a,b)=>a-b).map(w=>'W'+w).join(', ')} | Year: ${currentYear}`
        : `Year: ${currentYear}`;

      const colHeaders = columns.map(c => `${c.label} (${c.sub})`);

      const rows = [
        [`APEX SOUTHERN CROSS ENGINEERING - TIMESHEET`],
        [periodLabel],
        [],
        [
          'No.',
          'Team',
          'Project Code',
          'Project Name',
          'Task Type',
          'User',
          ...colHeaders,
          'Total Hours'
        ]
      ];

      let rowIdx = 1;
      (timesheetData.teams || []).forEach(team => {
        (team.projects || []).forEach(project => {
          (project.tasks || []).forEach(task => {
            const hourVals = (task.hours || []).map(h => (h > 0 ? Number(h.toFixed(2)) : ''));
            rows.push([
              rowIdx++,
              team.name,
              project.name,
              project.fullName || project.name,
              task.taskName,
              task.userName,
              ...hourVals,
              task.totalHours > 0 ? Number(task.totalHours.toFixed(2)) : 0
            ]);
          });
        });
      });

      const colTotals = (timesheetData.totalPerCol || []).map(t => (t > 0 ? Number(t.toFixed(2)) : ''));
      rows.push([
        'TOTAL',
        '',
        '',
        '',
        '',
        '',
        ...colTotals,
        Number(timesheetData.grandTotalHours?.toFixed(2) || 0)
      ]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 8 },  // No.
        { wch: 16 }, // Team
        { wch: 20 }, // Project Code
        { wch: 35 }, // Project Name
        { wch: 22 }, // Task Type
        { wch: 22 }, // User
        ...columns.map(() => ({ wch: 12 })),
        { wch: 16 }  // Total
      ];
      
      const fileSuffix = timeRange === 'week' 
        ? `W${currentWeek}_${currentYear}` 
        : timeRange === 'month' 
        ? `Thang_${today.getMonth() + 1}_${currentYear}` 
        : `Nam_${currentYear}`;

      XLSX.utils.book_append_sheet(wb, ws, `Timesheet`);
      XLSX.writeFile(wb, `APEX_Timesheet_${fileSuffix}.xlsx`);
    } catch (e) {
      console.error('Error exporting Apex Timesheet to Excel:', e);
    }
  }, [timesheetData, currentWeek, currentYear, weekDates, timeRange, today, columns]);

  useImperativeHandle(ref, () => ({
    exportExcel: handleExportExcel
  }), [handleExportExcel]);

  return (
    <div className="personal-table-wrapper">
      <div className="max-h-[calc(100vh-335px)] overflow-y-auto overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse table-fixed" style={{ minWidth: '1360px' }}>
          <colgroup>
            <col style={{ width: '130px' }} />
            <col style={{ width: '150px' }} />
            <col style={{ width: '160px' }} />
            <col style={{ width: '150px' }} />
            {columns.map(c => (
              <col key={c.id} style={{ width: c.width || '75px' }} />
            ))}
            <col style={{ width: '90px' }} />
          </colgroup>
          <thead>
            <tr className="bg-[var(--bg-card)]">
              <th className="th-primary sticky z-[35] text-left border-b border-r border-[var(--border)] text-[var(--text-main)] dark:text-white" style={{ top: '0px', paddingLeft: '12px', paddingRight: '12px' }}>Team</th>
              <th className="th-primary sticky z-[35] text-left border-b border-r border-[var(--border)] text-[var(--text-main)] dark:text-white" style={{ top: '0px', paddingLeft: '12px', paddingRight: '12px' }}>Project Code</th>
              <th className="th-primary sticky z-[35] text-left border-b border-r border-[var(--border)] text-[var(--text-main)] dark:text-white" style={{ top: '0px', paddingLeft: '12px', paddingRight: '12px' }}>Task Type</th>
              <th className="th-primary sticky z-[35] text-left border-b border-r border-[var(--border)] text-[var(--text-main)] dark:text-white" style={{ top: '0px', paddingLeft: '12px', paddingRight: '12px' }}>User</th>
              {columns.map((col) => (
                <th 
                  key={col.id} 
                  className={`sticky z-[35] text-center sys-px py-[12px] border-b border-r border-[var(--border)] ${
                    col.isToday ? 'bg-indigo-500/10' : (col.isWeekendDay ? 'bg-rose-500/[0.03]' : 'bg-[var(--bg-card)]')
                  }`} 
                  style={{ top: '0px' }}
                >
                  <div className={`text-[14px] font-black uppercase tracking-wider ${col.isToday ? 'text-emerald-500' : (col.isWeekendDay ? 'text-rose-500 dark:text-rose-400' : 'text-[var(--text-main)] dark:text-white')}`}>{col.label}</div>
                  <div className={`text-[12px] font-normal ${col.isToday ? 'text-emerald-500' : (col.isWeekendDay ? 'text-rose-500/80 dark:text-rose-400/80' : 'text-[var(--text-muted)] dark:text-slate-300')}`}>{col.sub}</div>
                </th>
              ))}
              <th className="th-primary sticky z-[35] text-center border-b border-[var(--border)] text-indigo-600 dark:text-indigo-400" style={{ top: '0px', paddingLeft: '8px', paddingRight: '8px' }}>
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5 + columns.length} className="text-center py-[50px]">
                  <RefreshCw size={28} className="animate-spin text-indigo-500 mx-auto mb-2" />
                  <p className="text-[13px] font-bold text-[var(--text-muted)]">Đang tải dữ liệu từ APEX_TimeSheet...</p>
                </td>
              </tr>
            ) : (!timesheetData?.teams || timesheetData.teams.length === 0) ? (
              <tr>
                <td colSpan={5 + columns.length} className="text-center py-[50px]">
                  <CalendarDays size={32} className="text-[var(--text-muted)] opacity-30 mx-auto mb-2" />
                  <p className="text-[13px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em]">
                    Chưa có dữ liệu trong APEX_TimeSheet cho {timeRange === 'week' ? `Tuần ${timesheetData?.weekNumber || currentWeek}` : timeRange === 'month' ? `Tháng ${today.getMonth() + 1}` : timeRange === 'custom' ? `các tuần đã chọn (${[...selectedWeeks].sort((a,b)=>a-b).map(w=>'W'+w).join(', ')})` : 'Năm'} ({currentYear})
                  </p>
                </td>
              </tr>
            ) : (
              timesheetData?.teams?.map((team, ti) => (
                <React.Fragment key={ti}>
                  {team.projects?.map((project, pi) => {
                    return project.tasks?.map((task, ki) => {
                      const isEvenRow = ki % 2 === 0;
                      const rowBg = isEvenRow ? 'bg-[var(--bg-surface)]/30' : 'bg-transparent';
                      
                      return (
                        <tr 
                          key={`${ti}-${pi}-${ki}`} 
                          className={`hover:bg-indigo-500/10 transition-colors border-b border-[var(--border)] ${rowBg}`}
                        >
                          {/* Team Column */}
                          {pi === 0 && ki === 0 && (
                            <td
                              rowSpan={team.totalRows}
                              className="py-[10px] text-[13px] leading-[20px] font-bold text-indigo-500 uppercase tracking-normal border-r border-[var(--border)] bg-indigo-500/[0.04] min-w-[130px] align-middle"
                              style={{ paddingLeft: '12px', paddingRight: '12px' }}
                            >
                              {team.name}
                            </td>
                          )}
                          {/* Project Column - SHOW ONLY PROJECT CODE */}
                          {ki === 0 && (
                            <td 
                              rowSpan={project.totalRows}
                              className="py-[10px] text-[13px] leading-[20px] font-bold border-r border-[var(--border)] uppercase min-w-[140px] bg-[var(--bg-surface)]/10 align-middle"
                              style={{ color: getProjectColor(project.name), paddingLeft: '12px', paddingRight: '12px' }}
                              title={project.fullName}
                            >
                              <div className="line-clamp-1 tracking-normal" title={project.fullName}>
                                {project.name}
                              </div>
                            </td>
                          )}
                          {/* Task Type / Name Column */}
                          <td 
                            className="py-[10px] text-[13px] leading-[20px] border-r border-[var(--border)] min-w-[150px] align-middle"
                            style={{ paddingLeft: '12px', paddingRight: '12px' }}
                          >
                            <span className={`font-bold tracking-normal uppercase ${getTaskTypeTextStyle(task.taskName)}`}>
                              {task.taskName}
                            </span>
                          </td>
                          {/* User Column */}
                          <td
                            className="py-[10px] text-[13px] leading-[20px] text-[var(--c-cyan)] font-semibold border-r border-[var(--border)] min-w-[150px] align-middle"
                            style={{ paddingLeft: '12px', paddingRight: '12px' }}
                          >
                            <div className="line-clamp-1" title={task.userName}>
                              {task.userName}
                            </div>
                          </td>
                          {/* Period Columns (Days / Weeks / Months) */}
                          {task.hours.map((hours, di) => {
                            const col = columns[di];
                            const cellColor = hours === 0 
                              ? 'text-[var(--text-muted)] opacity-30 font-medium' 
                              : hours > (timeRange === 'week' ? 8 : 40) 
                              ? 'text-rose-500 dark:text-rose-400 font-bold' 
                              : 'text-[var(--text-contrast)] font-medium';
                            return (
                              <td
                                key={di}
                                className={`text-center py-[10px] text-[13px] leading-[20px] font-mono border-r border-[var(--border)] align-middle ${
                                  col?.isToday ? 'bg-indigo-500/5' : (col?.isWeekendDay ? 'bg-rose-500/[0.02]' : '')
                                } ${cellColor}`}
                              >
                                {hours > 0 ? (
                                  <div title={`${hours.toFixed(2)}h (${formatHoursAndMinutes(hours)})`}>
                                    {hours.toFixed(1)}
                                  </div>
                                ) : '-'}
                              </td>
                            );
                          })}
                          {/* Row Total Column */}
                          <td className="text-center py-[10px] text-[13px] leading-[20px] font-mono font-bold border-b border-[var(--border)] text-[var(--text-contrast)] bg-slate-500/[0.03] align-middle">
                            {task.totalHours > 0 ? task.totalHours.toFixed(1) : '-'}
                          </td>
                        </tr>
                      );
                    });
                  })}
                </React.Fragment>
              ))
            )}
          </tbody>
          {timesheetData.teams.length > 0 && (
            <tfoot>
              <tr className="bg-[var(--bg-card)] border-t-2 border-[var(--border)]">
                <td colSpan={4} className="px-[16px] py-[14px] text-[14px] font-black text-[var(--text-muted)] uppercase tracking-widest border-r border-[var(--border)]">
                  <div className="flex items-center justify-between pr-4">
                    <span>Total</span>
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-black rounded-lg shadow-sm transition-all duration-200 hover:scale-[1.03] cursor-pointer tracking-wider"
                      title="Export Timesheet to Excel (.xlsx)"
                    >
                      <Download size={13} />
                      <span>EXPORT EXCEL</span>
                    </button>
                  </div>
                </td>
                {(timesheetData.totalPerCol || []).map((total, i) => {
                  const col = columns[i];
                  const totalColor = total > (timeRange === 'week' ? 8 : 40) ? 'text-rose-500 dark:text-rose-400 font-bold' : 'text-[var(--text-contrast)]';
                  return (
                    <td key={i} className={`text-center py-[14px] text-[14px] font-mono font-bold ${totalColor} border-r border-[var(--border)] ${
                      col?.isToday ? 'bg-indigo-500/10' : (col?.isWeekendDay ? 'bg-rose-500/[0.03]' : '')
                    }`}>
                      {total > 0 ? (
                        <div title={`${total.toFixed(2)}h (${formatHoursAndMinutes(total)})`}>
                          {total.toFixed(1)}
                        </div>
                      ) : '-'}
                    </td>
                  );
                })}
                <td className="text-center py-[14px] text-[14px] font-mono font-bold text-[var(--text-contrast)] bg-slate-500/10">
                  {timesheetData.grandTotalHours > 0 ? timesheetData.grandTotalHours.toFixed(1) : '-'}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
});

export default ApexTimesheetView;
