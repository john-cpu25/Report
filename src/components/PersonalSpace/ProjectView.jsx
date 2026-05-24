import React from 'react';
import { format, isSameDay } from 'date-fns';
import { CalendarDays } from 'lucide-react';

const ProjectView = ({ projectTimesheetData, getProjectColor }) => {
  return (
    <div className="personal-table-wrapper">
        <div className="max-h-[calc(100vh-335px)] overflow-y-auto overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse table-fixed" style={{ minWidth: '1020px' }}>
            <colgroup>
              <col style={{ width: '140px' }} />
              <col style={{ width: '200px' }} />
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
                <th className="th-primary sticky z-[35] text-left border-b border-r border-[var(--border)]" style={{ top: '0px', paddingLeft: '12px', paddingRight: '12px' }}>Team</th>
                <th className="th-primary sticky z-[35] text-left border-b border-r border-[var(--border)]" style={{ top: '0px', paddingLeft: '12px', paddingRight: '12px' }}>Project</th>
                <th className="th-primary sticky z-[35] text-left border-b border-r border-[var(--border)]" style={{ top: '0px', paddingLeft: '12px', paddingRight: '12px' }}>USER</th>
                {projectTimesheetData.weekDates.map((date, i) => {
                  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                  const isToday = isSameDay(date, new Date());
                  const dateColor = isToday ? 'text-emerald-500' : 'text-black';
                  const labelColor = isToday ? 'text-emerald-500' : 'text-black';
                  return (
                    <th key={i} className={`sticky z-[35] text-center sys-px py-[12px] border-b border-r border-[var(--border)] ${isToday ? 'bg-indigo-500/10' : 'bg-[var(--bg-card)]'}`} style={{ top: '0px' }}>
                      <div className={`text-[14px] font-black uppercase tracking-wider ${labelColor}`}>{dayLabels[i].toUpperCase()}</div>
                      <div className={`text-[12px] font-normal ${dateColor}`}>{format(date, 'dd/MM')}</div>
                    </th>
                  );
                })}
                <th className="th-primary sticky z-[35] text-center sys-px border-b border-[var(--border)]" style={{ top: '0px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {projectTimesheetData.teams.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-[40px]">
                    <CalendarDays size={28} className="text-[var(--text-muted)] opacity-30 mx-auto mb-2" />
                    <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.2em]">No project data for Week {projectTimesheetData.weekNumber}</p>
                  </td>
                </tr>
              )}
              {projectTimesheetData.teams.map((team, ti) => (
                <React.Fragment key={ti}>
                  {team.projects.map((project, pi) => (
                    project.members.map((member, mi) => {
                      const isEvenMember = mi % 2 === 0;
                      const rowBg = isEvenMember ? 'bg-[var(--bg-surface)]/30' : 'bg-transparent';
                      
                      return (
                        <tr 
                          key={`${ti}-${pi}-${mi}`} 
                          className={`hover:bg-indigo-500/10 transition-colors ${rowBg}`}
                        >
                          {/* Team Column */}
                          {pi === 0 && mi === 0 && (
                            <td
                              rowSpan={team.totalRows}
                              className="py-3 text-[14px] text-indigo-500 uppercase tracking-tight border-r border-b border-[var(--border)] bg-indigo-500/[0.05] min-w-[140px]"
                              style={{ paddingLeft: '12px', paddingRight: '12px' }}
                            >
                              {team.name}
                            </td>
                          )}
                          {/* Project Column */}
                          {mi === 0 && (
                            <td
                              rowSpan={project.totalRows}
                              className="py-3 text-[14px] uppercase border-r border-b border-[var(--border)] bg-emerald-500/[0.02]"
                              style={{ color: getProjectColor(project.name), paddingLeft: '12px', paddingRight: '12px' }}
                            >
                              {project.name}
                            </td>
                          )}
                          {/* Member Column */}
                          <td 
                            className="py-3 text-[14px] text-[var(--c-cyan)] font-medium border-r border-b border-[var(--border)] min-w-[200px]"
                            style={{ paddingLeft: '12px', paddingRight: '12px' }}
                          >
                            {member.name}
                          </td>
                          {member.hours.map((hours, di) => {
                            const cellColor = hours === 0 ? 'text-[var(--text-muted)] opacity-30'
                              : hours < 4 ? 'text-rose-400'
                              : hours < 7 ? 'text-amber-400'
                              : hours < 9 ? 'text-emerald-400'
                              : 'text-blue-400';
                            return (
                              <td key={di} className={`text-center px-[12px] py-3 text-[14px] border-r border-b border-[var(--border)] ${cellColor}`}>
                                {hours > 0 ? hours.toFixed(2) : ''}
                              </td>
                            );
                          })}
                          <td className="text-center px-[12px] py-3 text-[14px] text-[var(--text-contrast)] border-b border-[var(--border)]">
                            {member.totalHours > 0 ? member.totalHours.toFixed(2) : ''}
                          </td>
                        </tr>
                      );
                    })
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
  );
};

export default ProjectView;
