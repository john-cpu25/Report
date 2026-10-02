import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, isSameDay, addDays, startOfWeek, getISOWeek } from 'date-fns';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { getCachedApexTimesheetData, subscribeApexTimesheetData, fetchApexTimesheetData } from '../../services/apexTimesheetCache';

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

const ApexTimesheetView = ({
  currentDate = new Date(),
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
}) => {
  const cached = getCachedApexTimesheetData();
  const [timesheetRecords, setTimesheetRecords] = useState(cached?.timesheetRecords || []);
  const [timesheetTypes, setTimesheetTypes] = useState(cached?.timesheetTypes || []);
  const [apexUsers, setApexUsers] = useState(cached?.apexUsers || []);
  const [apexProjects, setApexProjects] = useState(cached?.apexProjects || []);
  const [isLoading, setIsLoading] = useState(!cached || !cached.timesheetRecords?.length);

  // Week calculation from currentDate
  const today = currentDate || new Date();
  const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
  const weekDates = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map(i => addDays(currentMonday, i)), [currentMonday]);
  const currentWeek = getISOWeek(today);
  const currentYear = today.getFullYear();

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
      const w = Number(r.week);
      const y = Number(r.year);
      return w === currentWeek && (!y || y === currentYear);
    });

    if (weekRecords.length === 0) {
      return {
        weekNumber: currentWeek,
        monday: currentMonday,
        weekDates,
        teams: [],
        totalPerDay: [0, 0, 0, 0, 0, 0, 0],
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

      const userName = (userObj?.name || userObj?.full_name || record.user_id || 'Unknown').toString().trim();
      const teamName = (userObj?.team || userTeamByName[userName] || 'APEX').toString().trim().toUpperCase();
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
        const selU = selectedUser.trim().toLowerCase();
        const uNorm = userName.toLowerCase();
        if (uNorm !== selU && !uNorm.includes(selU) && !selU.includes(uNorm)) return;
      }

      // 4. Search text filter
      if (searchQuery) {
        const q = searchQuery.trim().toLowerCase();
        const matchSearch = userName.toLowerCase().includes(q) ||
                            projectCode.toLowerCase().includes(q) ||
                            projectFullName.toLowerCase().includes(q) ||
                            taskType.toLowerCase().includes(q) ||
                            teamName.toLowerCase().includes(q);
        if (!matchSearch) return;
      }

      const hours = [
        Number(record.mon) || 0,
        Number(record.tue) || 0,
        Number(record.wed) || 0,
        Number(record.thu) || 0,
        Number(record.fri) || 0,
        Number(record.sat) || 0,
        Number(record.sun) || 0
      ];

      const rowTotal = hours.reduce((a, b) => a + b, 0);

      if (!teamMap[teamName]) teamMap[teamName] = {};
      if (!teamMap[teamName][projectCode]) teamMap[teamName][projectCode] = {};

      const itemKey = `${taskType}|||${userName}`;
      if (!teamMap[teamName][projectCode][itemKey]) {
        teamMap[teamName][projectCode][itemKey] = {
          taskName: taskType,
          userName,
          hours: [...hours],
          totalHours: rowTotal,
          projectCode,
          projectFullName
        };
      } else {
        // Accumulate hours if multiple records exist
        for (let i = 0; i < 7; i++) {
          teamMap[teamName][projectCode][itemKey].hours[i] += hours[i];
        }
        teamMap[teamName][projectCode][itemKey].totalHours += rowTotal;
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

    const totalPerDay = [0, 0, 0, 0, 0, 0, 0];
    teams.forEach(team => {
      team.projects.forEach(project => {
        project.tasks.forEach(task => {
          task.hours.forEach((val, i) => { totalPerDay[i] += val; });
        });
      });
    });

    return {
      weekNumber: currentWeek,
      monday: currentMonday,
      weekDates,
      teams,
      totalPerDay,
      grandTotalHours: totalPerDay.reduce((a, b) => a + b, 0)
    };
  }, [timesheetRecords, timesheetTypes, timeSheetTypeMap, userMap, projectMap, currentWeek, currentYear, currentMonday, weekDates, userTeamByName, selectedTeam, selectedProject, selectedUser, searchQuery]);

  return (
    <div className="personal-table-wrapper">
      <div className="max-h-[calc(100vh-335px)] overflow-y-auto overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse table-fixed" style={{ minWidth: '1360px' }}>
          <colgroup>
            <col style={{ width: '130px' }} />
            <col style={{ width: '150px' }} />
            <col style={{ width: '160px' }} />
            <col style={{ width: '150px' }} />
            <col style={{ width: '75px' }} />
            <col style={{ width: '75px' }} />
            <col style={{ width: '75px' }} />
            <col style={{ width: '75px' }} />
            <col style={{ width: '75px' }} />
            <col style={{ width: '75px' }} />
            <col style={{ width: '75px' }} />
            <col style={{ width: '90px' }} />
          </colgroup>
          <thead>
            <tr className="bg-[var(--bg-card)]">
              <th className="th-primary sticky z-[35] text-left border-b border-r border-[var(--border)] text-[var(--text-main)] dark:text-white" style={{ top: '0px', paddingLeft: '12px', paddingRight: '12px' }}>Team</th>
              <th className="th-primary sticky z-[35] text-left border-b border-r border-[var(--border)] text-[var(--text-main)] dark:text-white" style={{ top: '0px', paddingLeft: '12px', paddingRight: '12px' }}>Project Code</th>
              <th className="th-primary sticky z-[35] text-left border-b border-r border-[var(--border)] text-[var(--text-main)] dark:text-white" style={{ top: '0px', paddingLeft: '12px', paddingRight: '12px' }}>Task Type</th>
              <th className="th-primary sticky z-[35] text-left border-b border-r border-[var(--border)] text-[var(--text-main)] dark:text-white" style={{ top: '0px', paddingLeft: '12px', paddingRight: '12px' }}>User</th>
              {timesheetData.weekDates.map((date, i) => {
                const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const isToday = isSameDay(date, new Date());
                const isWeekendDay = i >= 5;
                const dateColor = isToday ? 'text-emerald-500' : (isWeekendDay ? 'text-rose-500/80 dark:text-rose-400/80' : 'text-[var(--text-muted)] dark:text-slate-300');
                const labelColor = isToday ? 'text-emerald-500' : (isWeekendDay ? 'text-rose-500 dark:text-rose-400' : 'text-[var(--text-main)] dark:text-white');
                return (
                  <th 
                    key={i} 
                    className={`sticky z-[35] text-center sys-px py-[12px] border-b border-r border-[var(--border)] ${
                      isToday ? 'bg-indigo-500/10' : (isWeekendDay ? 'bg-rose-500/[0.03]' : 'bg-[var(--bg-card)]')
                    }`} 
                    style={{ top: '0px' }}
                  >
                    <div className={`text-[14px] font-black uppercase tracking-wider ${labelColor}`}>{dayLabels[i]?.toUpperCase() || ''}</div>
                    <div className={`text-[12px] font-normal ${dateColor}`}>{format(date, 'dd/MM')}</div>
                  </th>
                );
              })}
              <th className="th-primary sticky z-[35] text-center border-b border-[var(--border)] text-indigo-600 dark:text-indigo-400" style={{ top: '0px', paddingLeft: '8px', paddingRight: '8px' }}>
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={12} className="text-center py-[50px]">
                  <RefreshCw size={28} className="animate-spin text-indigo-500 mx-auto mb-2" />
                  <p className="text-[13px] font-bold text-[var(--text-muted)]">Đang tải dữ liệu từ APEX_TimeSheet...</p>
                </td>
              </tr>
            ) : (!timesheetData?.teams || timesheetData.teams.length === 0) ? (
              <tr>
                <td colSpan={12} className="text-center py-[50px]">
                  <CalendarDays size={32} className="text-[var(--text-muted)] opacity-30 mx-auto mb-2" />
                  <p className="text-[13px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em]">
                    Chưa có dữ liệu trong APEX_TimeSheet cho Tuần {timesheetData?.weekNumber || currentWeek} ({currentYear})
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
                          {/* Mon - Sun columns */}
                          {task.hours.map((hours, di) => {
                            const isToday = isSameDay(timesheetData.weekDates[di], new Date());
                            const isWeekendDay = di >= 5;
                            const cellColor = hours === 0 
                              ? 'text-[var(--text-muted)] opacity-30 font-medium' 
                              : hours > 8 
                              ? 'text-rose-500 dark:text-rose-400 font-bold' 
                              : 'text-[var(--text-contrast)] font-medium';
                            return (
                              <td
                                key={di}
                                className={`text-center py-[10px] text-[13px] leading-[20px] font-mono border-r border-[var(--border)] align-middle ${
                                  isToday ? 'bg-indigo-500/5' : (isWeekendDay ? 'bg-rose-500/[0.02]' : '')
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
                <td colSpan={4} className="px-[16px] py-[14px] text-[14px] font-black text-[var(--text-muted)] uppercase tracking-widest border-r border-[var(--border)]">Total</td>
                {timesheetData.totalPerDay.map((total, i) => {
                  const isToday = isSameDay(timesheetData.weekDates[i], new Date());
                  const isWeekendDay = i >= 5;
                  const totalColor = total > 8 ? 'text-rose-500 dark:text-rose-400 font-bold' : 'text-[var(--text-contrast)]';
                  return (
                    <td key={i} className={`text-center py-[14px] text-[14px] font-mono font-bold ${totalColor} border-r border-[var(--border)] ${
                      isToday ? 'bg-indigo-500/10' : (isWeekendDay ? 'bg-rose-500/[0.03]' : '')
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
};

export default ApexTimesheetView;
