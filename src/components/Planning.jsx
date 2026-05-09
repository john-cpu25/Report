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

const Planning = ({ reportData = [], weekDates = [] }) => {
  const [viewMode, setViewMode] = useState('WEEK'); // WEEK, MONTH, YEAR
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

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
      return eachDayOfInterval({ start, end }).map(date => ({
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
      case 'DONE': return 'bg-emerald-500';
      case 'WIP': return 'bg-indigo-500';
      case 'URGENT': return 'bg-rose-500';
      case 'ISSUE': return 'bg-red-500';
      case 'PLANNING': return 'bg-amber-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className={`w-full mx-auto pb-20 transition-all duration-500 ${isExpanded ? 'px-0' : 'px-4 md:px-6'}`}>
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--glass-border)] shadow-2xl backdrop-blur-xl mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
            <ListTodo size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">
              Strategic <span className="text-indigo-400">Planning</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Temporal Alignment Active</p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex bg-[var(--bg-surface)] p-1 rounded-2xl border border-[var(--glass-border)] shadow-inner">
          {['WEEK', 'MONTH', 'YEAR'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                viewMode === mode 
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleNavigate('prev')}
            className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="px-6 py-2.5 bg-[var(--bg-surface)] border border-[var(--glass-border)] rounded-xl text-center min-w-[200px]">
            <span className="text-xs font-black text-[var(--text-main)] uppercase tracking-[0.2em]">
              {viewMode === 'WEEK' && `Week of ${format(columns[0].date, 'MMM dd')}`}
              {viewMode === 'MONTH' && format(currentDate, 'MMMM yyyy')}
              {viewMode === 'YEAR' && format(currentDate, 'yyyy')}
            </span>
          </div>

          <button 
            onClick={() => handleNavigate('next')}
            className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Gantt Container */}
      <div className="glass-panel border-white/5 shadow-2xl overflow-hidden relative group">
        {/* Horizontal Lines Accent */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
        
        {/* Scrollable Area */}
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-[1200px]">
            {/* Grid Header */}
            <div className="grid grid-cols-[280px_1fr] border-b border-[var(--glass-border)] bg-[var(--bg-surface)]">
              <div className="p-6 flex items-center gap-3 border-r border-[var(--glass-border)]">
                <Layers size={14} className="text-slate-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project / Workflows</span>
              </div>
              <div className="flex">
                {columns.map((col, i) => (
                  <div 
                    key={i} 
                    className={`flex-1 min-w-[80px] p-4 flex flex-col items-center justify-center border-r border-[var(--glass-border)] last:border-0 ${col.isWeekend ? 'bg-[var(--bg-surface)]' : ''}`}
                  >
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{col.label}</span>
                    <span className={`text-[11px] font-black mt-0.5 ${viewMode === 'WEEK' ? 'text-indigo-400' : 'text-white'}`}>{col.subLabel}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid Body */}
            <div className="divide-y divide-white/5">
              {projectGroups.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[var(--bg-surface)] mx-auto flex items-center justify-center border border-[var(--glass-border)]">
                    <Clock size={30} className="text-slate-700" />
                  </div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">No Temporal Data Detected</p>
                </div>
              ) : (
                projectGroups.map((group, groupIdx) => (
                  <div key={groupIdx} className="group/row">
                    <div className="grid grid-cols-[280px_1fr]">
                      {/* Left: Project Info */}
                      <div className="p-6 bg-[var(--bg-surface)] border-r border-[var(--glass-border)] relative">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-full opacity-0 group-hover/row:opacity-100 transition-opacity" />
                        <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight truncate">{group.name}</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">{group.tasks.length} Active Workflows</p>
                      </div>

                      {/* Right: Gantt Bars Container */}
                      <div className="relative h-20 flex items-center">
                        {/* Background Grid Lines */}
                        <div className="absolute inset-0 flex">
                          {columns.map((_, i) => (
                            <div key={i} className="flex-1 border-r border-white/[0.03] last:border-0" />
                          ))}
                        </div>

                        {/* Bars for this project */}
                        <div className="relative w-full h-12">
                          {group.tasks.map((task, taskIdx) => {
                            // Calculate bar position
                            // For WEEK view, we map Monday-Friday to col indices 0-4
                            // For simplicity in this demo, if the task has data for a day, we show it
                            
                            if (viewMode === 'WEEK') {
                              const daysMap = { 'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4 };
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
                                  transition={{ duration: 0.8, delay: groupIdx * 0.1 + taskIdx * 0.05 }}
                                  style={{ 
                                    left: `${left}%`, 
                                    top: `${(taskIdx % 3) * 12}px`, // Slight offset if multiple tasks
                                    zIndex: 10 
                                  }}
                                  className={`absolute h-6 rounded-lg ${getStatusColor(task.status)} border border-white/20 shadow-lg cursor-pointer group/bar flex items-center px-3 overflow-hidden`}
                                >
                                  {/* Bar Content */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
                                  <span className="text-[8px] font-black text-white uppercase truncate relative z-10">
                                    {task.task}
                                  </span>

                                  {/* Tooltip on Hover */}
                                  <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 bg-[var(--bg-dark)] border border-[var(--glass-border)] p-2 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-all whitespace-nowrap z-[100] shadow-2xl pointer-events-none">
                                    <p className="text-[9px] font-black text-[var(--text-main)] uppercase">{task.task}</p>
                                    <p className="text-[8px] font-bold text-slate-400 mt-0.5">{task.status} // {group.name}</p>
                                  </div>
                                </motion.div>
                              );
                            }
                            
                            // Month and Year views would require actual date_start/date_end in the task object
                            // For now, we'll placeholder them or map based on created_at
                            return null;
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

        {/* Footer Intelligence */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Temporal Density', value: '85%', icon: Zap, color: 'text-yellow-400' },
            { label: 'Critical Path', value: '4 Assets', icon: Activity, color: 'text-rose-400' },
            { label: 'Sync Status', value: 'Real-time', icon: Settings2, color: 'text-emerald-400' }
          ].map((stat, i) => (
            <div key={i} className="glass-panel p-6 border-[var(--glass-border)] bg-[var(--bg-card)] flex items-center justify-between group hover:border-indigo-500/20 transition-all">
              <div>
                <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">{stat.label}</p>
                <p className={`text-xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
              <stat.icon size={20} className="text-[var(--text-muted)] group-hover:text-indigo-500 transition-colors" />
            </div>
          ))}
        </div>
    </div>
  );
};

export default Planning;
