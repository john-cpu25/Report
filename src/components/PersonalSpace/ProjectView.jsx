import React from 'react';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';

const ProjectView = ({ projectTimesheetData, getProjectColor }) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="ocd-card p-0 shadow-2xl shadow-black/20 border border-[var(--border)] bg-[var(--bg-card)]">
        <div className="max-h-[calc(100vh-320px)] overflow-y-auto overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse table-fixed" style={{ minWidth: '1120px' }}>
            <colgroup>
              <col style={{ width: '140px' }} />
              <col style={{ width: '200px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '80px' }} />
            </colgroup>
            <thead>
              <tr className="bg-[var(--bg-card)]">
                <th className="sticky z-[35] text-left px-[16px] py-[14px] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-r border-[var(--border)] bg-[var(--bg-card)]" style={{ top: '0px' }}>Team</th>
                <th className="sticky z-[35] text-left px-[16px] py-[14px] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-r border-[var(--border)] bg-[var(--bg-card)]" style={{ top: '0px' }}>Project</th>
                <th className="sticky z-[35] text-left px-[16px] py-[14px] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-r border-[var(--border)] bg-[var(--bg-card)]" style={{ top: '0px' }}>Member</th>
                {projectTimesheetData.weekDates.map((date, i) => {
                  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                  const dayColors = ['text-blue-400', 'text-violet-400', 'text-amber-400', 'text-emerald-400', 'text-rose-400', 'text-orange-400', 'text-pink-400'];
                  return (
                    <th key={i} className="sticky z-[35] text-center px-[10px] py-[12px] border-b border-r border-[var(--border)] bg-[var(--bg-card)]" style={{ top: '0px' }}>
                      <div className={`text-[12px] font-black ${dayColors[i]}`}>{format(date, 'dd/MM')}</div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">[{dayLabels[i]}]</div>
                    </th>
                  );
                })}
                <th className="sticky z-[35] text-center px-[10px] py-[14px] border-b border-[var(--border)] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest bg-[var(--bg-card)]" style={{ top: '0px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {projectTimesheetData.teams.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-[40px]">
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
                          className={`hover:bg-indigo-500/10 transition-colors border-b border-[var(--border)] ${rowBg}`}
                        >
                          {/* Team Column */}
                          {pi === 0 && mi === 0 && (
                            <td
                              rowSpan={team.totalRows}
                              className="px-[20px] py-[15px] text-[12px] font-black text-indigo-500 uppercase tracking-tight border-r border-[var(--border)] align-top bg-indigo-500/[0.05] min-w-[140px]"
                            >
                              {team.name}
                            </td>
                          )}
                          {/* Project Column */}
                          {mi === 0 && (
                            <td
                              rowSpan={project.totalRows}
                              className="px-[12px] py-[15px] text-[10px] font-black border-r border-[var(--border)] uppercase align-top bg-emerald-500/[0.02]"
                              style={{ color: getProjectColor(project.name) }}
                            >
                              {project.name}
                            </td>
                          )}
                          {/* Member Column */}
                          <td className="px-[20px] py-[15px] text-[12px] font-black text-sky-500 uppercase tracking-tight border-r border-[var(--border)] min-w-[140px]">
                            {member.name}
                          </td>
                          {member.hours.map((hours, di) => {
                            const cellColor = hours === 0 ? 'text-[var(--text-muted)] opacity-30'
                              : hours < 4 ? 'text-rose-400 font-black'
                              : hours < 7 ? 'text-amber-400 font-black'
                              : hours < 9 ? 'text-emerald-400 font-black'
                              : 'text-blue-400 font-black';
                            return (
                              <td key={di} className={`text-center px-[12px] py-[15px] text-[13px] border-r border-[var(--border)] ${cellColor}`}>
                                {hours > 0 ? hours.toFixed(2) : ''}
                              </td>
                            );
                          })}
                          <td className="text-center px-[12px] py-[15px] text-[13px] font-black text-[var(--text-contrast)]">
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
    </div>
  );
};

export default ProjectView;
