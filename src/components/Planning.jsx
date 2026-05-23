import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  ListTodo, 
  Layers, 
  Clock, 
  Filter,
  Maximize2,
  Minimize2,
  Settings2,
  Zap,
  Activity
} from 'lucide-react';
import { 
  format, 
  addWeeks, 
  subWeeks, 
  addMonths, 
  subMonths, 
  addYears, 
  subYears, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  startOfMonth, 
  endOfMonth,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  isSameMonth
} from 'date-fns';

const projectColorMap = {
  '373 CROWN': '#f43f5e',
  'CW2': '#0ea5e9',
  'CW3': '#0284c7',
  'DLD': '#334155',
  'FGWB': '#3b82f6',
  'LEEDS': '#10b981',
  'MAC': '#b45309',
  'MEL02': '#1e3a8a',
  'MEL03': '#e11d48',
  'MORAY': '#2563eb',
  'RIVER TERRACE': '#8b5cf6',
  'SURF PARADE': '#0d9488',
  'SYD01': '#16a34a',
  'WICKHAM': '#84cc16',
};

const getProjectColor = (projectName) => {
  const name = (projectName || '').toUpperCase();
  if (projectColorMap[name]) return projectColorMap[name];
  const colors = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const Planning = ({ reportData = [], weekDates = [] }) => {
  const [viewMode, setViewMode] = useState('WEEK'); // WEEK, MONTH, YEAR
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState({});

  const toggleProject = (projectName) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectName]: !prev[projectName]
    }));
  };

  // Time Navigation
  const handleNavigate = (direction) => {
    if (viewMode === 'WEEK') {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else if (viewMode === 'MONTH') {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addYears(currentDate, 1) : subYears(currentDate, 1));
    }
  };

  // Generate Grid Columns based on viewMode
  const columns = useMemo(() => {
    if (viewMode === 'WEEK') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end })
        .filter(date => date.getDay() !== 0 && date.getDay() !== 6)
        .map(date => ({
        label: format(date, 'EEE'),
        subLabel: format(date, 'dd/MM'),
        date
      }));
    } else if (viewMode === 'MONTH') {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      // For Month, we show days but simplified
      return eachDayOfInterval({ start, end }).map(date => ({
        label: format(date, 'd'),
        subLabel: format(date, 'MMM'),
        date,
        isWeekend: [0, 6].includes(date.getDay())
      }));
    } else {
      const start = startOfYear(currentDate);
      const end = endOfYear(currentDate);
      return eachMonthOfInterval({ start, end }).map(date => ({
        label: format(date, 'MMM'),
        subLabel: format(date, 'yyyy'),
        date
      }));
    }
  }, [viewMode, currentDate]);

  // Group tasks by Project
  const projectGroups = useMemo(() => {
    const groups = {};
    reportData.forEach(task => {
      if (!groups[task.project]) {
        groups[task.project] = {
          name: task.project,
          tasks: []
        };
      }
      groups[task.project].tasks.push(task);
    });
    return Object.values(groups);
  }, [reportData]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'DONE': return 'bar-status-done';
      case 'WIP': return 'bar-status-wip';
      case 'URGENT': return 'bar-status-urgent';
      case 'ISSUE': return 'bar-status-issue';
      case 'PLANNING': return 'bar-status-planning';
      default: return 'bar-status-default';
    }
  };

  return (
    <div className="tab-planning w-full mx-auto pb-20 transition-all duration-500">

      {/* Gantt Container */}
      <div className="ocd-card overflow-hidden relative group">
        {/* Horizontal Lines Accent */}
        <div className="plan-separator" />
        
        {/* Scrollable Area */}
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-[1200px]">
            {/* Grid Header */}
            <div className="grid grid-cols-[280px_1fr] plan-grid-header">
              <div className="sys-p flex items-center sys-gap border-r border-[var(--glass-border)]">
                <Layers size={14} className="text-slate-500" />
                <span className="text-[14px] font-black text-slate-400 uppercase tracking-widest">Project / Workflows</span>
              </div>
              <div className="flex">
                {columns.map((col, i) => {
                  const isToday = col.date ? isSameDay(col.date, new Date()) : false;
                  return (
                  <div 
                    key={i} 
                    className={`flex-1 min-w-[80px] sys-p flex flex-col items-center justify-center border-r border-[var(--glass-border)] last:border-0 ${isToday ? 'plan-col-today' : (col.isWeekend ? 'plan-weekend-col' : '')}`}
                  >
                    <span className={`text-[14px] font-black uppercase tracking-tighter day-label ${!isToday ? 'text-[var(--text-contrast)]' : ''}`}>{col.label}</span>
                    <span className={`text-[12px] font-black mt-0.5 day-sublabel ${!isToday ? 'text-[var(--text-muted)]' : ''}`}>{col.subLabel}</span>
                  </div>
                )})}
              </div>
            </div>

            {/* Grid Body */}
            <div className="divide-y divide-[var(--glass-border)]">
              {projectGroups.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <div className="no-data-icon">
                    <Clock size={30} />
                  </div>
                  <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">No Temporal Data Detected</p>
                </div>
              ) : (
                projectGroups.map((group, groupIdx) => {
                  const isProjExpanded = expandedProjects[group.name];
                  return (
                  <div key={groupIdx} className="group/row">
                    <div className="grid grid-cols-[280px_1fr]">
                      {/* Left: Project Info */}
                      <div 
                        className="sys-p flex items-center plan-row-header relative cursor-pointer hover:bg-white/[0.02] transition-colors"
                        onClick={() => toggleProject(group.name)}
                      >
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full opacity-0 group-hover/row:opacity-100 transition-opacity" style={{ backgroundColor: getProjectColor(group.name) }} />
                        <div className="flex items-center gap-2 w-full">
                          <ChevronRight 
                            size={16} 
                            className={`text-slate-400 transition-transform duration-300 ${isProjExpanded ? 'rotate-90' : ''}`}
                          />
                          <h3 className="text-[14px] font-black uppercase tracking-tight truncate flex-1" style={{ color: getProjectColor(group.name) }}>
                            {group.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border" style={{ color: getProjectColor(group.name), borderColor: getProjectColor(group.name) + '40', backgroundColor: getProjectColor(group.name) + '15' }}>
                            {group.tasks.length} {group.tasks.length > 1 ? 'tasks' : 'task'}
                          </span>
                        </div>
                      </div>

                      {/* Right: Gantt Bars Container */}
                      <div 
                        className="relative flex items-center overflow-hidden transition-all duration-300"
                        style={{ height: isProjExpanded ? `${Math.max(46, group.tasks.length * 40 + 16)}px` : '46px' }}
                      >
                        {/* Background Grid Lines */}
                        <div className="absolute inset-0 flex">
                          {columns.map((_, i) => (
                            <div key={i} className="flex-1 border-r border-white/[0.03] last:border-0" />
                          ))}
                        </div>

                        {/* Bars for this project */}
                        <div className="absolute top-0 left-0 w-full h-full">
                          {(() => {
                            if (viewMode !== 'WEEK') return null;
                            const daysMap = { 'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4 };
                            
                            if (!isProjExpanded) {
                              // SUMMARY BAR (Collapsed State) - Multiple Segments
                              const activeIndices = new Set();
                              group.tasks.forEach(t => {
                                const activeDays = Object.keys(t.days).filter(d => t.days[d]);
                                activeDays.forEach(d => {
                                  const idx = daysMap[d];
                                  if (idx !== undefined) activeIndices.add(idx);
                                });
                              });
                              
                              if (activeIndices.size === 0) return null;
                              
                              const sortedIndices = Array.from(activeIndices).sort((a, b) => a - b);
                              const segments = [];
                              let currentSegment = null;

                              sortedIndices.forEach(idx => {
                                if (!currentSegment) {
                                  currentSegment = { start: idx, end: idx };
                                } else if (idx === currentSegment.end + 1) {
                                  currentSegment.end = idx;
                                } else {
                                  segments.push(currentSegment);
                                  currentSegment = { start: idx, end: idx };
                                }
                              });
                              if (currentSegment) segments.push(currentSegment);
                              
                              return segments.map((seg, i) => {
                                const duration = seg.end - seg.start + 1;
                                const widthPct = (duration / columns.length) * 100;
                                const leftPct = (seg.start / columns.length) * 100;
                                return (
                                  <motion.div
                                    key={i}
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: `${widthPct}%`, opacity: 0.3 }}
                                    transition={{ duration: 0.5 }}
                                    style={{ left: `${leftPct}%`, top: '15px', zIndex: 5, height: '16px', paddingRight: '4px', paddingLeft: '4px' }}
                                    className="absolute flex"
                                  >
                                    <div className="w-full h-full rounded-full" style={{ backgroundColor: getProjectColor(group.name) }} />
                                  </motion.div>
                                );
                              });
                            }

                            // EXPANDED STATE: Individual Tasks
                            return group.tasks.map((task, taskIdx) => {
                              const activeDays = Object.keys(task.days).filter(d => task.days[d]);
                              if (activeDays.length === 0) return null;

                              const startIdx = Math.min(...activeDays.map(d => daysMap[d] ?? 99));
                              const endIdx = Math.max(...activeDays.map(d => daysMap[d] ?? -1));

                              if (startIdx === 99 || endIdx === -1) return null;

                              const width = ((endIdx - startIdx + 1) / columns.length) * 100;
                              const left = (startIdx / columns.length) * 100;

                              return (
                                <motion.div
                                  key={task.id}
                                  initial={{ width: 0, opacity: 0 }}
                                  animate={{ width: `${width}%`, opacity: 1 }}
                                  transition={{ duration: 0.4, delay: taskIdx * 0.05 }}
                                  style={{ 
                                    left: `${left}%`, 
                                    top: `${8 + taskIdx * 40}px`, 
                                    zIndex: 10 
                                  }}
                                  className="absolute"
                                >
                                  <div className={`gantt-bar ${getStatusColor(task.status)} group/bar`} style={{ width: '100%' }}>
                                    <div className="gantt-bar-overlay" />
                                    <span className="text-[12px] font-black text-white uppercase truncate relative z-10">
                                      {task.task}
                                    </span>

                                    {/* Tooltip on Hover */}
                                    <div className="gantt-tooltip">
                                      <p className="text-[9px] font-black text-[var(--text-main)] uppercase">{task.task}</p>
                                      <p className="text-[8px] font-bold text-[var(--text-muted)] mt-0.5">{task.status} // {group.name}</p>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )})
              )}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default Planning;
