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

const TimesheetView = ({ timesheetData }) => {
  return (
    <div className="ocd-card p-0 shadow-2xl shadow-black/20 border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="max-h-[calc(100vh-320px)] overflow-y-auto overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse table-fixed" style={{ minWidth: '960px' }}>
          <colgroup>
            <col style={{ width: '140px' }} />
            <col style={{ width: '140px' }} />
            <col style={{ width: '200px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '80px' }} />
          </colgroup>
          <thead>
            <tr className="bg-[var(--bg-card)]">
              <th className="sticky z-[35] text-left px-[16px] py-[14px] text-[14px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-r border-[var(--border)] bg-[var(--bg-card)]" style={{ top: '0px' }}>Team</th>
              <th className="sticky z-[35] text-left px-[16px] py-[14px] text-[14px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-r border-[var(--border)] bg-[var(--bg-card)]" style={{ top: '0px' }}>Member</th>
              <th className="sticky z-[35] text-left px-[16px] py-[14px] text-[14px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-r border-[var(--border)] bg-[var(--bg-card)]" style={{ top: '0px' }}>Project</th>
              {timesheetData.weekDates.map((date, i) => {
                const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                const isToday = isSameDay(date, new Date());
                const dateColor = isToday ? 'text-emerald-500' : 'text-[var(--text-contrast)]';
                const labelColor = isToday ? 'text-emerald-400' : 'text-[var(--text-muted)]';
                return (
                  <th key={i} className={`sticky z-[35] text-center px-[10px] py-[12px] border-b border-r border-[var(--border)] ${isToday ? 'bg-indigo-500/10' : 'bg-[var(--bg-card)]'}`} style={{ top: '0px' }}>
                    <div className={`text-[14px] font-bold uppercase tracking-wider ${labelColor}`}>{dayLabels[i].toUpperCase()}</div>
                    <div className={`text-[14px] font-black ${dateColor}`}>{format(date, 'dd/MM')}</div>
                  </th>
                );
              })}
              <th className="sticky z-[35] text-center px-[10px] py-[14px] border-b border-[var(--border)] text-[14px] font-black text-[var(--text-muted)] uppercase tracking-widest bg-[var(--bg-card)]" style={{ top: '0px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {timesheetData.teams.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-[40px]">
                  <CalendarDays size={28} className="text-[var(--text-muted)] opacity-30 mx-auto mb-2" />
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.2em]">No data for Week {timesheetData.weekNumber}</p>
                </td>
              </tr>
            )}
            {timesheetData.teams.map((team, ti) => (
              <React.Fragment key={ti}>
                {team.users.map((user, ui) => {
                  const isEvenUser = ui % 2 === 0;
                  const rowBg = isEvenUser ? 'bg-[var(--bg-surface)]/30' : 'bg-transparent';
                  
                  return user.projects.map((project, pi) => (
                    <tr 
                      key={`${ti}-${ui}-${pi}`} 
                      className={`hover:bg-indigo-500/10 transition-colors border-b border-[var(--border)] ${rowBg}`}
                    >
                      {/* Team Column */}
                      {ui === 0 && pi === 0 && (
                        <td
                          rowSpan={team.totalRows}
                          className="px-[20px] py-[15px] text-[14px] font-black text-indigo-500 uppercase tracking-tight border-r border-[var(--border)] align-top bg-indigo-500/[0.05] min-w-[140px]"
                        >
                          {team.name}
                        </td>
                      )}
                      {/* Member Column */}
                      {pi === 0 && (
                        <td
                          rowSpan={user.projects.length}
                          className="px-[20px] py-[15px] text-[14px] font-black text-sky-500 uppercase tracking-tight border-r border-[var(--border)] align-top bg-[var(--bg-surface)]/10 min-w-[140px]"
                        >
                          {user.name}
                        </td>
                      )}
                      {/* Project Column */}
                      <td className="px-[20px] py-[15px] text-[14px] font-bold text-emerald-500 border-r border-[var(--border)] uppercase min-w-[180px]">
                        {project.name}
                      </td>
                      {project.hours.map((hours, di) => {
                        const isToday = isSameDay(timesheetData.weekDates[di], new Date());
                        const cellColor = hours === 0 ? 'text-[var(--text-muted)] opacity-30'
                          : hours < 4 ? 'text-rose-400 font-black'
                          : hours < 7 ? 'text-amber-400 font-black'
                          : hours < 9 ? 'text-emerald-400 font-black'
                          : 'text-blue-400 font-black';
                        return (
                          <td
                            key={di}
                            className={`text-center py-[15px] text-[14px] border-r border-[var(--border)] ${isToday ? 'bg-indigo-500/5' : ''} ${cellColor}`}
                          >
                            {hours > 0 ? (
                              <div title={`${hours.toFixed(2)} hours (${formatHoursAndMinutes(hours)})`}>
                                {hours.toFixed(2)}
                              </div>
                            ) : ''}
                          </td>
                        );
                      })}
                      <td className="text-center py-[15px] text-[14px] font-black text-[var(--text-contrast)]">
                        {project.totalHours > 0 ? (
                          <div title={`${project.totalHours.toFixed(2)} hours (${formatHoursAndMinutes(project.totalHours)})`}>
                            {project.totalHours.toFixed(2)}
                          </div>
                        ) : ''}
                      </td>
                    </tr>
                  ));
                })}
              </React.Fragment>
            ))}
          </tbody>
          {timesheetData.teams.length > 0 && (
            <tfoot>
              <tr className="bg-white/[0.05] border-t-2 border-[var(--border)]">
                <td colSpan={3} className="px-[16px] py-[12px] text-[14px] font-black text-[var(--text-muted)] uppercase tracking-widest border-r border-[var(--border)]">Total</td>
                {timesheetData.totalPerDay.map((total, i) => {
                  const isToday = isSameDay(timesheetData.weekDates[i], new Date());
                  return (
                    <td key={i} className={`text-center py-[12px] text-[14px] font-black text-[var(--text-contrast)] border-r border-[var(--border)] ${isToday ? 'bg-indigo-500/10' : ''}`}>
                      {total > 0 ? (
                        <div title={`${total.toFixed(2)} hours (${formatHoursAndMinutes(total)})`}>
                          {total.toFixed(2)}
                        </div>
                      ) : ''}
                    </td>
                  );
                })}
                <td className="text-center py-[12px] text-[14px] font-black text-indigo-400">
                  <div title={`${timesheetData.grandTotalHours.toFixed(2)} hours (${formatHoursAndMinutes(timesheetData.grandTotalHours)})`}>
                    {timesheetData.grandTotalHours.toFixed(2)}
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default TimesheetView;
