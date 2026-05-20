import React from 'react';
import { format, isSameDay, addDays, differenceInHours, differenceInCalendarMonths, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, TrendingUp } from 'lucide-react';

const GanttView = ({
  projectGroups,
  ganttTimeline,
  selectedTimeMetric,
  timeRange,
  expandedProjects,
  setExpandedProjects,
  getProjectColor,
  workloadData
}) => {
  return (
    <div className="ocd-card p-0 overflow-hidden bg-[var(--bg-card)] border border-[var(--border)] rounded-[12px] shadow-2xl">
      <div className="overflow-x-auto custom-scrollbar">
        <div className="w-full min-w-[900px]">
          {/* Gantt Header: Dates */}
          <div className="flex border-b border-[var(--border)] bg-white/5 sticky z-[45] backdrop-blur-md" style={{ top: '0px' }}>
            <div className="w-[200px] md:w-[250px] border-r border-[var(--border)] p-[15px] text-[10px] font-black uppercase text-indigo-400 shrink-0 bg-[var(--bg-card)] sticky left-0 z-30">Task Intelligence</div>
            <div className="flex-1 flex min-w-0">
              {ganttTimeline.map((date, i) => {
                const isToday = isSameDay(date, new Date());
                return (
                  <div key={i} className={`flex-1 min-w-[28px] border-r border-[var(--border)] py-[10px] px-0 text-center flex flex-col items-center justify-center ${isToday ? 'bg-indigo-500/20' : 'bg-[var(--bg-card)]'}`}>
                    <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-tighter">
                      {timeRange === 'day' ? format(date, 'HH:mm') : 
                       timeRange === 'year' ? format(date, 'yyyy') : 
                       format(date, 'EEE')}
                    </div>
                    <div className={`text-[10px] md:text-[11px] font-black tracking-tighter ${isToday ? 'text-indigo-400' : 'text-[var(--text-main)]'}`}>
                      {timeRange === 'day' ? format(date, 'dd/MM') :
                       timeRange === 'year' ? format(date, 'MMM') :
                       timeRange === 'month' ? format(date, 'dd') :
                       format(date, 'dd/MM')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gantt Rows */}
          <div className="max-h-[calc(100vh-320px)] min-h-[400px] overflow-y-auto">
            <AnimatePresence initial={false}>
              {projectGroups.map(group => {
                const chartStart = ganttTimeline[0];
                const totalDays = ganttTimeline.length;
                
                // Pre-calculate visibility
                const visibleTasks = group.tasks.map(task => {
                  let rStart = task.date_start;
                  let rEnd = task.date_end;
                  if (selectedTimeMetric === 't2') rEnd = task.date_complete;
                  if (selectedTimeMetric === 't3') rEnd = task.date_checked;
                  if (selectedTimeMetric === 't4') { rStart = task.date_started; rEnd = task.date_checked; }
                  if (selectedTimeMetric === 't5') { rStart = task.created_at; rEnd = task.date_checked; }
                  
                  let startDate = rStart && rStart !== '-' ? new Date(rStart) : null;
                  let endDate = rEnd && rEnd !== '-' ? new Date(rEnd) : null;
                  
                  if (!startDate || isNaN(startDate.getTime())) startDate = task.dateObj || new Date(task.created_at || Date.now());
                  if (!endDate || isNaN(endDate.getTime())) endDate = addDays(startDate, 1);
                  if (endDate < startDate) endDate = addDays(startDate, 1);
                  
                  const startOffsetRaw = timeRange === 'day' ? differenceInHours(startDate, chartStart) : 
                                         timeRange === 'year' ? differenceInCalendarMonths(startDate, chartStart) : 
                                         differenceInDays(startDate, chartStart);
                  const durationRaw = timeRange === 'day' ? differenceInHours(endDate, startDate) : 
                                      timeRange === 'year' ? differenceInCalendarMonths(endDate, startDate) + 1 : 
                                      differenceInDays(endDate, startDate) + 1;
                  
                  const renderOffset = Math.max(0, startOffsetRaw);
                  const overflowLeft = startOffsetRaw < 0 ? Math.abs(startOffsetRaw) : 0;
                  let renderDuration = durationRaw - overflowLeft;
                  
                  if (renderOffset + renderDuration > totalDays) {
                    renderDuration = totalDays - renderOffset;
                  }
                  
                  if (renderDuration <= 0 || renderOffset >= totalDays || startOffsetRaw + durationRaw <= 0) return null;
                  
                  return { ...task, renderOffset, renderDuration };
                }).filter(Boolean);

                if (visibleTasks.length === 0) return null;

                const minOffset = Math.min(...visibleTasks.map(t => t.renderOffset));
                const maxEnd = Math.max(...visibleTasks.map(t => t.renderOffset + t.renderDuration));
                const projectDuration = maxEnd - minOffset;

                return (
                  <motion.div 
                    key={group.name} 
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="flex flex-col border-b border-[var(--border)]"
                  >
                    <div 
                      onClick={() => {
                        if (expandedProjects.includes(group.name)) {
                          setExpandedProjects(expandedProjects.filter(name => name !== group.name));
                        } else {
                          setExpandedProjects([...expandedProjects, group.name]);
                        }
                      }}
                      className="flex h-[48px] hover:bg-white/[0.02] group transition-colors cursor-pointer"
                    >
                      <div className="w-[200px] md:w-[250px] border-r border-[var(--border)] p-[10px] flex items-center justify-between shrink-0 bg-[var(--bg-card)] sticky left-0 z-20">
                        <div className="flex items-center gap-2 truncate">
                          <ChevronRight 
                            size={14} 
                            className={`text-indigo-400 transition-transform duration-200 ${expandedProjects.includes(group.name) ? 'rotate-90' : ''}`} 
                          />
                          <span className="text-[10px] font-black uppercase truncate transition-colors" style={{ color: getProjectColor(group.name) }}>{group.name}</span>
                        </div>
                        <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md whitespace-nowrap">{visibleTasks.length} tasks</span>
                      </div>
                      <div className="flex-1 relative flex items-center px-0 h-full">
                        {/* Weekend Shading Overlay */}
                        <div className="absolute inset-0 flex pointer-events-none z-10">
                          {ganttTimeline.map((date, idx) => {
                            const day = date.getDay();
                            const isWeekend = (timeRange === 'week' || timeRange === 'month') && (day === 0 || day === 6);
                            return (
                              <div 
                                key={idx} 
                                className={`flex-1 border-r border-[var(--border)]/30 ${isWeekend ? 'bg-[var(--bg-main)]/40' : ''}`}
                              />
                            );
                          })}
                        </div>

                        {/* Project Aggregated Bar */}
                        <motion.div 
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: `${(projectDuration / totalDays) * 100}%` }}
                          style={{ 
                            marginLeft: `${(minOffset / totalDays) * 100}%`,
                            backgroundColor: `${getProjectColor(group.name)}20`,
                            border: `1.5px solid ${getProjectColor(group.name)}`,
                            boxShadow: `0 0 12px ${getProjectColor(group.name)}30`,
                            background: `linear-gradient(to right, ${getProjectColor(group.name)}40, ${getProjectColor(group.name)}10)`,
                            zIndex: 5
                          }}
                          className="h-6 rounded-[6px] relative overflow-hidden group/bar flex items-center px-2"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent pointer-events-none" />
                        </motion.div>
                      </div>
                    </div>

                    {/* Expanded Tasks */}
                    {expandedProjects.includes(group.name) && (
                      <div className="flex flex-col bg-black/5">
                        {visibleTasks.map((task, idx) => (
                          <div key={idx} className="flex h-[32px] border-b border-[var(--border)]/50 hover:bg-white/[0.01] transition-colors">
                            <div className="w-[200px] md:w-[250px] border-r border-[var(--border)] pl-[35px] pr-[10px] flex items-center shrink-0 bg-[var(--bg-card)] sticky left-0 z-20">
                              <span className="text-[9px] font-medium text-[var(--text-muted)] truncate uppercase tracking-tight">
                                {task.taskName || task.title || 'Untitled Task'}
                              </span>
                            </div>
                            <div className="flex-1 relative flex items-center px-0 h-full">
                              {/* Weekend Shading Overlay for sub-tasks */}
                              <div className="absolute inset-0 flex pointer-events-none z-10">
                                {ganttTimeline.map((_, sIdx) => {
                                  const day = ganttTimeline[sIdx].getDay();
                                  const isWeekend = (timeRange === 'week' || timeRange === 'month') && (day === 0 || day === 6);
                                  return (
                                    <div key={sIdx} className={`flex-1 border-r border-[var(--border)]/10 ${isWeekend ? 'bg-[var(--bg-main)]/60' : ''}`} />
                                  );
                                })}
                              </div>
                              
                              <motion.div 
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: `${(task.renderDuration / totalDays) * 100}%` }}
                                style={{ 
                                  marginLeft: `${(task.renderOffset / totalDays) * 100}%`,
                                  backgroundColor: `${getProjectColor(group.name)}15`,
                                  border: `1px solid ${getProjectColor(group.name)}60`,
                                  zIndex: 5
                                }}
                                className="h-4 rounded-[4px] relative"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Workload Intelligence HTML Chart */}
          <div className="flex border-t border-[var(--border)] bg-[var(--bg-card)] h-[150px] sticky bottom-0 z-10">
            <div className="w-[200px] md:w-[250px] border-r border-[var(--border)] p-[15px] flex flex-col justify-center shrink-0 bg-[var(--bg-card)] sticky left-0 z-20">
              <div className="flex items-center gap-[10px]">
                <TrendingUp size={16} className="text-emerald-400 shrink-0" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-tight">Workload<br/>(Tasks / Day)</span>
              </div>
            </div>
            <div className="flex-1 flex min-w-0 items-end">
              {ganttTimeline.map((date, i) => {
                const count = workloadData[i];
                const maxCount = Math.max(...workloadData, 1);
                const heightPct = (count / maxCount) * 100;
                const isToday = isSameDay(date, new Date());
                
                return (
                  <div key={i} className={`flex-1 min-w-[28px] border-r border-[var(--border)] h-full flex flex-col justify-end px-[4px] pb-[1px] group relative ${isToday ? 'bg-indigo-500/10' : ''}`}>
                    {count > 0 && (
                      <div className="w-full relative flex flex-col items-center justify-end h-full">
                        <span className="text-[9px] font-black text-emerald-500 mb-1 opacity-50 group-hover:opacity-100 transition-opacity">{count}</span>
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${heightPct * 0.8}%` }}
                          className="bg-emerald-500/60 hover:bg-emerald-400 border border-emerald-500 rounded-t-[4px] w-full max-w-[32px] transition-colors"
                          style={{ minHeight: '4px' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttView;
