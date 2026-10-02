import React from 'react';
import { format, isSameDay } from 'date-fns';
import { CalendarDays } from 'lucide-react';

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

const TimesheetView = ({ timesheetData, getProjectColor }) => {
  return (
    <div className="personal-table-wrapper">
      <div className="max-h-[calc(100vh-335px)] overflow-y-auto overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse table-fixed" style={{ minWidth: '1280px' }}>
          <colgroup>
            <col style={{ width: '140px' }} />
            <col style={{ width: '180px' }} />
            <col style={{ width: '260px' }} />
            <col style={{ width: '160px' }} />
            <col style={{ width: '75px' }} />
            <col style={{ width: '75px' }} />
            <col style={{ width: '75px' }} />
            <col style={{ width: '75px' }} />
            <col style={{ width: '75px' }} />
            <col style={{ width: '75px' }} />
            <col style={{ width: '75px' }} />
          </colgroup>
          <thead>
            <tr className="bg-[var(--bg-card)]">
              <th className="th-primary sticky z-[35] text-left border-b border-r border-[var(--border)]" style={{ top: '0px', paddingLeft: '12px', paddingRight: '12px' }}>Team</th>
              <th className="th-primary sticky z-[35] text-left border-b border-r border-[var(--border)]" style={{ top: '0px', paddingLeft: '12px', paddingRight: '12px' }}>Project</th>
              <th className="th-primary sticky z-[35] text-left border-b border-r border-[var(--border)]" style={{ top: '0px', paddingLeft: '12px', paddingRight: '12px' }}>Task Name</th>
              <th className="th-primary sticky z-[35] text-left border-b border-r border-[var(--border)]" style={{ top: '0px', paddingLeft: '12px', paddingRight: '12px' }}>User</th>
              {timesheetData.weekDates.map((date, i) => {
                const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const isToday = isSameDay(date, new Date());
                const isWeekendDay = i >= 5;
                const dateColor = isToday ? 'text-emerald-500' : (isWeekendDay ? 'text-rose-500/80 dark:text-rose-400/80' : 'text-black dark:text-slate-200');
                const labelColor = isToday ? 'text-emerald-500' : (isWeekendDay ? 'text-rose-500 dark:text-rose-400' : 'text-black dark:text-slate-100');
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
            </tr>
          </thead>
          <tbody>
            {(!timesheetData?.teams || timesheetData.teams.length === 0) && (
              <tr>
                <td colSpan={11} className="text-center py-[40px]">
                  <CalendarDays size={28} className="text-[var(--text-muted)] opacity-30 mx-auto mb-2" />
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.2em]">No data for Week {timesheetData?.weekNumber || ''}</p>
                </td>
              </tr>
            )}
            {timesheetData?.teams?.map((team, ti) => (
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
                            className="py-[15px] text-[14px] text-indigo-500 uppercase tracking-tight border-r border-[var(--border)] bg-indigo-500/[0.05] min-w-[140px]"
                            style={{ paddingLeft: '12px', paddingRight: '12px' }}
                          >
                            {team.name}
                          </td>
                        )}
                        {/* Project Column */}
                        {ki === 0 && (
                          <td 
                            rowSpan={project.totalRows}
                            className="py-[15px] text-[14px] border-r border-[var(--border)] uppercase min-w-[180px] bg-[var(--bg-surface)]/10"
                            style={{ color: getProjectColor(project.name), paddingLeft: '12px', paddingRight: '12px' }}
                          >
                            {project.name}
                          </td>
                        )}
                        {/* Task Name Column */}
                        <td 
                          className="py-[15px] text-[14px] text-[var(--text-contrast)] font-medium border-r border-[var(--border)] min-w-[240px]"
                          style={{ paddingLeft: '12px', paddingRight: '12px' }}
                        >
                          <div className="line-clamp-1" title={task.taskName}>
                            {task.taskName}
                          </div>
                        </td>
                        {/* User Column */}
                        <td
                          className="py-[15px] text-[14px] text-[var(--c-cyan)] font-medium border-r border-[var(--border)] min-w-[160px]"
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
                            ? 'text-[var(--text-muted)] opacity-30' 
                            : hours > 8 
                            ? 'text-rose-500 dark:text-rose-400 font-bold' 
                            : 'text-[var(--text-contrast)]';
                          return (
                            <td
                              key={di}
                              className={`text-center py-[15px] text-[14px] font-mono font-bold border-r border-[var(--border)] ${
                                isToday ? 'bg-indigo-500/5' : (isWeekendDay ? 'bg-rose-500/[0.02]' : '')
                              } ${cellColor}`}
                            >
                              {hours > 0 ? (
                                <div title={`${hours.toFixed(2)} hours (${formatHoursAndMinutes(hours)})`}>
                                  {hours.toFixed(1)}
                                </div>
                              ) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })}
              </React.Fragment>
            ))}
          </tbody>
          {timesheetData.teams.length > 0 && (
            <tfoot>
              <tr className="bg-white/[0.05] border-t-2 border-[var(--border)]">
                <td colSpan={4} className="px-[16px] py-[12px] text-[14px] font-black text-[var(--text-muted)] uppercase tracking-widest border-r border-[var(--border)]">Total</td>
                {timesheetData.totalPerDay.map((total, i) => {
                  const isToday = isSameDay(timesheetData.weekDates[i], new Date());
                  const isWeekendDay = i >= 5;
                  const totalColor = total > 8 ? 'text-rose-500 dark:text-rose-400 font-bold' : 'text-[var(--text-contrast)]';
                  return (
                    <td key={i} className={`text-center py-[12px] text-[14px] font-mono font-bold ${totalColor} border-r border-[var(--border)] ${
                      isToday ? 'bg-indigo-500/10' : (isWeekendDay ? 'bg-rose-500/[0.03]' : '')
                    }`}>
                      {total > 0 ? (
                        <div title={`${total.toFixed(2)} hours (${formatHoursAndMinutes(total)})`}>
                          {total.toFixed(1)}
                        </div>
                      ) : '-'}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default TimesheetView;
