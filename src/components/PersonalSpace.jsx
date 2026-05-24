import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import UnifiedTable from './CSVProcessor/UnifiedTable';
import { User, Target, TrendingUp, Calendar, CalendarDays, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchPersonalSpaceData, fetchUsers } from '../services/supabaseService';
import { processTaskData } from '../utils/dataProcessor';
import { format, startOfWeek, endOfWeek, getISOWeek } from 'date-fns';
import { usePersonalSpaceEngine } from '../utils/PersonalSpaceEngine';
import TimesheetView from './PersonalSpace/TimesheetView';
import ProjectView from './PersonalSpace/ProjectView';
import GanttView from './PersonalSpace/GanttView';
import DeepAnalysisView from './PersonalSpace/DeepAnalysisView';
import NeuralBrain from './NeuralBrain';
import NeumorphicPersonalSwitcher from './buttons/NeumorphicPersonalSwitcher';
import NeumorphicSearch from './buttons/NeumorphicSearch';
import NeumorphicDropdown from './buttons/NeumorphicDropdown';

import { Filter, ChevronRight, ChevronLeft, ArrowUpDown } from 'lucide-react';
import { differenceInDays, startOfDay, addDays, isSameDay, isWithinInterval, eachMonthOfInterval, subDays } from 'date-fns';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { 
  calculateTaskMetrics, 
  formatMinutes, 
  calculateDailyWorkingMinutes 
} from '../utils/performanceEngine';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PersonalSpace = () => {
  const { 
    analystUserMap, 
    analystUserTeamMap, 
    analystTasks, 
    setAnalystTasks,
    setColumnFilters, 
    columnFilters, 
    sortConfig, 
    handleSort,
    dashboardProjects,
    theme
  } = useApp();

  const isDark = theme === 'DARK' || theme === 'GALAXY';

  const projectColorMap = useMemo(() => {
    const map = {};
    if (dashboardProjects) {
      dashboardProjects.forEach(p => {
        const key = (p.key || '').toUpperCase();
        const name = (p.name || '').toUpperCase();
        if (key && p.color) map[key] = p.color;
        if (name && p.color) map[name] = p.color;
      });
    }
    return map;
  }, [dashboardProjects]);

  const getProjectColor = (projectName) => {
    const name = (projectName || '').toUpperCase();
    if (projectColorMap[name]) return projectColorMap[name];
    const colors = [
      '#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#3b82f6', 
      '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316',
      '#ef4444', '#22c55e', '#a855f7', '#eab308', '#0ea5e9',
      '#d946ef', '#f43f5e', '#84cc16', '#06b6d4', '#64748b'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'daily' | 'project' | 'team' | 'gantt' | 'deep-analysis' | 'performance'
  const [manualData, setManualData] = useState(() => {
    const saved = localStorage.getItem('personal_manual_data');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('personal_manual_data', JSON.stringify(manualData));
  }, [manualData]);
  const [localSort, setLocalSort] = useState('date-desc');
  const [expandedProjects, setExpandedProjects] = useState([]);
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [expandedTeams, setExpandedTeams] = useState({});
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const weekOffset = useMemo(() => {
    const currentMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
    const targetMonday = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Math.round((targetMonday - currentMonday) / (7 * 24 * 60 * 60 * 1000));
  }, [currentDate]);

  const [localMaps, setLocalMaps] = useState({ userMap: {}, teamMap: {} });
  const [selectedTimeMetric, setSelectedTimeMetric] = useState('t4'); // Default to T4 (Processing Time)
  
  // Optimization: Date Filtering
  const [timeRange, setTimeRange] = useState('week'); // 'day' | 'week' | 'month' | 'year'
  
  // Local Filter States
  const [localFilters, setLocalFilters] = useState({
    team: '',
    user: '',
    project: '',
    search: ''
  });

  // Local Filter States

  const loadData = async (force = false) => {
    if (!user) return;
    
    const hasCache = analystTasks && analystTasks.length > 0;
    if (!force && hasCache) {
      // Stale-while-revalidate: fetch silently in the background
    } else {
      setIsLoading(true);
    }
    try {
      // 1. Always fetch ALL users for complete name/team mapping
      const usersList = await fetchUsers();
      const uMap = {};
      const tMap = {};
      usersList.forEach(u => {
        uMap[u.id] = u.name;
        uMap[u.id?.toLowerCase()] = u.name;
        uMap[u.email?.toLowerCase()] = u.name;
        tMap[u.id] = u.team;
        tMap[u.id?.toLowerCase()] = u.team;
      });
      setLocalMaps({ userMap: uMap, teamMap: tMap });

      // 2. Fetch tasks - Admin gets ALL data (no team filter applied in supabaseService)
      const rawTasks = await fetchPersonalSpaceData(user, 50000);
      const processed = processTaskData(rawTasks, uMap, tMap);
      setAnalystTasks(processed);
    } catch (err) {
      console.error('Failed to load personal space data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Ensure daily view only uses weekly range
  useEffect(() => {
    if (viewMode === 'daily' && timeRange !== 'week') {
      setTimeRange('week');
    }
  }, [viewMode]);

  const rbacBaseTasks = useMemo(() => {
    const tasks = analystTasks || [];
    if (user?.isAdmin) return tasks;
    
    const uTeam = (user?.team || '').toString().trim().toLowerCase();
    const uName = (user?.name || '').toLowerCase();
    
    return tasks.filter(t => {
      const tTeam = (t.team || '').toString().trim().toLowerCase();
      const isMyTask = (t.createdBy || '').toLowerCase() === uName || 
                       (t.userName || '').toLowerCase() === uName;
      return tTeam === uTeam || isMyTask;
    });
  }, [analystTasks, user]);

  // Dynamic Options for Filters
  const filterOptions = useMemo(() => {
    const data = rbacBaseTasks;
    const projects = [...new Set(data.map(t => t.project))].sort();
    const users = [...new Set(data.map(t => t.userName))].sort();
    // Include teams from both tasks AND the full user/team map so teams always appear
    const taskTeams = data.map(t => t.team);
    const mapTeams = Object.values(localMaps.teamMap || {});
    const teams = [...new Set([...taskTeams, ...mapTeams])].sort().filter(Boolean);
    return { projects, users, teams };
  }, [rbacBaseTasks, localMaps.teamMap]);

  const filteredData = useMemo(() => {
    const tasks = rbacBaseTasks;
    if (tasks.length === 0) return [];
    
    const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(currentDate, { weekStartsOn: 1 });
    const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const filtered = tasks.filter(t => {
      // 1. Date Range Filter
      let dateMatch = true;
      if (t.dateObj && viewMode !== 'project' && viewMode !== 'daily' && viewMode !== 'gantt') {
        if (timeRange === 'day') {
          dateMatch = isSameDay(t.dateObj, currentDate);
        } else if (timeRange === 'week') {
          dateMatch = isWithinInterval(t.dateObj, { start: startOfCurrentWeek, end: endOfCurrentWeek });
        } else if (timeRange === 'month') {
          dateMatch = isWithinInterval(t.dateObj, { start: startOfCurrentMonth, end: endOfCurrentMonth });
        } else if (timeRange === 'year') {
          dateMatch = t.dateObj.getFullYear() === currentDate.getFullYear();
        }
      }

      if (!dateMatch) return false;

      // 2. Team Filter
      const matchTeam = !localFilters.team || 
        (t.team && t.team.toString().trim().toLowerCase() === localFilters.team.trim().toLowerCase());
      
      // 3. User Filter
      const matchUser = !localFilters.user || 
        (t.userName && t.userName.toString().trim().toLowerCase() === localFilters.user.trim().toLowerCase());
      
      // 4. Project Filter
      const matchProject = !localFilters.project || 
        (t.project && t.project.toString().trim().toLowerCase() === localFilters.project.trim().toLowerCase());
      
      // 5. Search Filter
      const searchTerm = localFilters.search?.trim().toLowerCase();
      const matchSearch = !searchTerm || 
        t.taskName?.toLowerCase().includes(searchTerm) ||
        t.project?.toLowerCase().includes(searchTerm) ||
        t.userName?.toLowerCase().includes(searchTerm);
      
      return matchTeam && matchUser && matchProject && matchSearch;
    });

    // 6. Apply local sort
    const sorted = [...filtered];
    switch (localSort) {
      case 'date-desc': sorted.sort((a, b) => (b.dateObj || 0) - (a.dateObj || 0)); break;
      case 'date-asc': sorted.sort((a, b) => (a.dateObj || 0) - (b.dateObj || 0)); break;
      case 'project-asc': sorted.sort((a, b) => (a.project || '').localeCompare(b.project || '')); break;
      case 'project-desc': sorted.sort((a, b) => (b.project || '').localeCompare(a.project || '')); break;
      case 'user-asc': sorted.sort((a, b) => (a.userName || '').localeCompare(b.userName || '')); break;
      case 'user-desc': sorted.sort((a, b) => (b.userName || '').localeCompare(a.userName || '')); break;
      case 'team-asc': sorted.sort((a, b) => (a.team || '').localeCompare(b.team || '')); break;
      default: break;
    }
    return sorted;
  }, [rbacBaseTasks, localFilters, timeRange, localSort, user, currentDate, viewMode]);

  const strictlyFilteredData = useMemo(() => {
    if (user?.isAdmin) return filteredData;
    const uName = (user?.name || '').toLowerCase();
    
    if (user?.isLeader) {
      return filteredData.filter(t => 
        (t.createdBy || '').toLowerCase() === uName ||
        (t.userName || '').toLowerCase() === uName
      );
    }
    return filteredData.filter(t => 
      (t.userName || '').toLowerCase() === uName
    );
  }, [filteredData, user]);

  const { projectGroups, teamGroups, ganttTimeline, workloadData, weeklyData, timesheetData, projectTimesheetData, deepAnalysisData, efficiencyData } = usePersonalSpaceEngine({ filteredData, strictlyFilteredData, analystTasks, filterOptions, weekOffset, timeRange, selectedTimeMetric, manualData });

  const toggleWeek = (key) => {
    setExpandedWeeks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const scopeLabel = useMemo(() => {
    if (user?.isAdmin) return { label: 'Global Intelligence', sub: 'Admin Oversight Mode', color: 'text-rose-500', bg: 'bg-rose-500/10' };
    if (user?.team) return { label: 'Team Intelligence', sub: `${user.team} Collaboration Mode`, color: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { label: 'Personal Intelligence', sub: 'Individual Performance Mode', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
  }, [user]);

  if (isLoading && (!analystTasks || analystTasks.length === 0)) {
    return (
      <div className="space-y-[10px] pb-20">
        <div className="h-[50vh] flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-400">Syncing Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-personal w-full flex flex-col gap-[10px] animate-in fade-in duration-700 pb-[10px]">
      {/* Sticky Header + Filter Wrapper */}
      <div className="sticky top-[64px] z-[40] w-full flex flex-col gap-[10px] pb-[10px] pt-[10px]" style={{ background: 'var(--bg-main, #0f172a)' }}>
      {/* Header */}
      <div className="personal-header-card">

        {/* Windows 11 Fluent Toolbar - REDESIGNED */}
        <div className="flex items-center gap-[12px] overflow-x-auto custom-scrollbar py-[4px] flex-nowrap">
          
          <NeumorphicPersonalSwitcher viewMode={viewMode} setViewMode={setViewMode} />

          {/* Search Input in Top Toolbar (Stretched) */}
          <div className="flex-1 min-w-[200px] px-2">
            <NeumorphicSearch 
              value={localFilters.search} 
              onChange={(e) => setLocalFilters(prev => ({ ...prev, search: e.target.value }))} 
              placeholder="Search ..." 
            />
          </div>

          <div className="flex items-center justify-center shrink-0 w-[46px] h-[46px] group cursor-pointer transition-all duration-300 hover:scale-110">
            <Filter size={24} className="text-[#4f46e5] fill-[#4f46e5] drop-shadow-[0_0_8px_rgba(79,70,229,0.4)]" />
          </div>

          {user?.isAdmin && (
            <NeumorphicDropdown
              value={localFilters.team}
              onChange={e => setLocalFilters(prev => ({ ...prev, team: e.target.value }))}
              options={filterOptions.teams}
              defaultLabel="TEAMS"
              className="min-w-[140px] shrink-0"
            />
          )}

          <NeumorphicDropdown
            value={localFilters.project}
            onChange={e => setLocalFilters(prev => ({ ...prev, project: e.target.value }))}
            options={filterOptions.projects}
            defaultLabel="PROJECTS"
            className="min-w-[140px] shrink-0"
          />

          <NeumorphicDropdown
            value={localFilters.user}
            onChange={e => setLocalFilters(prev => ({ ...prev, user: e.target.value }))}
            options={filterOptions.users}
            defaultLabel="MEMBERS"
            className="min-w-[140px] shrink-0"
          />

          <button 
            onClick={() => setLocalFilters({ team: '', user: '', project: '', search: '' })}
            className="w-[60px] h-[46px] flex items-center justify-center text-[14px] font-bold rounded-xl transition-all shrink-0 text-[#4f46e5] bg-white hover:bg-slate-50 border border-white/50 shadow-[4px_4px_10px_rgba(163,177,198,0.4),-4px_-4px_10px_rgba(255,255,255,1)] active:shadow-[inset_3px_3px_8px_rgba(163,177,198,0.4),inset_-3px_-3px_8px_rgba(255,255,255,1)]"
          >
            Clear
          </button>

          {/* Sort Dropdown */}
          {viewMode !== 'neural-brain' && (
            <div className="flex items-center shrink-0 border-l border-r border-[var(--border)] px-3 mx-1">
              <NeumorphicDropdown
                icon={ArrowUpDown}
                value={localSort}
                onChange={e => setLocalSort(e.target.value)}
                options={[
                  { value: 'date-desc', label: 'Date ↓ Newest' },
                  { value: 'date-asc', label: 'Date ↑ Oldest' },
                  { value: 'project-asc', label: 'Project A→Z' },
                  { value: 'project-desc', label: 'Project Z→A' },
                  { value: 'user-asc', label: 'User A→Z' },
                  { value: 'user-desc', label: 'User Z→A' },
                  { value: 'team-asc', label: 'Team A→Z' }
                ]}
                defaultLabel="Sort By..."
                className="min-w-[170px]"
              />
            </div>
          )}

            {/* Time Segmented Control (New Design) */}
            {['list', 'daily', 'project', 'gantt', 'performance', 'neural-brain'].includes(viewMode) && (
              <div className={`flex items-center gap-1 p-[3px] backdrop-blur-md rounded-xl shadow-inner relative shrink-0 ${
                isDark 
                  ? 'bg-slate-950/80 border border-slate-800' 
                  : 'bg-slate-200/50 border border-white/20'
              }`}>
                {['week', 'month', 'year'].map((id) => {
                  const isActive = timeRange === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setTimeRange(id)}
                      className={`relative w-[46px] h-[46px] text-[14px] font-black uppercase transition-all duration-300 z-10 time-range-btn flex items-center justify-center ${
                        isActive ? 'active' : ''
                      }`}
                    >
                      {{ week: 'W', month: 'M', year: 'Y' }[id]}
                      {isActive && (
                        <motion.div
                          layoutId="activeRange"
                          className="absolute inset-0 rounded-lg z-[-1] toolbar-active-bg"
                          transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

          {/* Action Group: Sync */}
          <div className={`flex items-center p-[3px] backdrop-blur-md rounded-xl shadow-inner shrink-0 ml-auto ${
            isDark 
              ? 'bg-slate-950/80 border border-slate-800' 
              : 'bg-slate-200/50 border border-white/20'
          }`}>
            <button
              onClick={() => loadData(true)}
              className="flex items-center gap-3 h-[28px] px-5 text-[14px] font-black uppercase tracking-widest transition-colors sync-btn"
              title="Force Sync with Supabase"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span className="ml-1">Sync</span>
            </button>
          </div>
        </div>
      </div>


      </div>{/* End Sticky Wrapper */}

      {/* Content Area */}
      {/* Timesheet Summary & Navigation Header (Visible for Daily, Project, and Gantt) */}
      <div className="px-[10px] flex flex-col gap-[10px]">
      {/* --- CONTENT AREA: STATS & TIME NAVIGATION --- */}
      {viewMode !== 'deep-analysis' && (
        <div className="personal-stats-bar relative z-[38]">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between stats-summary-bar gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
                <span className="text-[14px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Hours:</span>
                <span className="text-[14px] font-black stat-val-hours">
                  {((viewMode === 'daily' || viewMode === 'list' || viewMode === 'neural-brain') ? timesheetData?.grandTotalHours : projectTimesheetData?.grandTotalHours || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
                <span className="text-[14px] font-black text-[var(--text-muted)] uppercase tracking-widest">Tasks:</span>
                <span className="text-[14px] font-black stat-val-tasks">
                  {(viewMode === 'daily' || viewMode === 'list' || viewMode === 'neural-brain') ? timesheetData?.grandTotalTasks : projectTimesheetData?.grandTotalTasks || 0}
                </span>
              </div>

              <div className="w-[1px] h-8 bg-[var(--border)] mx-2 hidden xl:block" />

              {/* Time Metric Selector */}
              {['daily', 'project'].includes(viewMode) && (
                <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-inner">
                  {[
                    { id: 't1', label: 'T1', color: 'emerald', tooltip: 'T1: DATE_START → DATE_END (Planned)' },
                    { id: 't2', label: 'T2', color: 'sky', tooltip: 'T2: DATE_START → DATE_COMPLETE (Actual Complete)' },
                    { id: 't3', label: 'T3', color: 'indigo', tooltip: 'T3: DATE_START → DATE_CHECKED (Up to Checked)' },
                    { id: 't4', label: 'T4', color: 'orange', tooltip: 'T4: DATE_STARTED → DATE_CHECKED (Processing Time)' },
                    { id: 't5', label: 'T5', color: 'rose', tooltip: 'T5: CREATED_AT → DATE_CHECKED (Complete Lifecycle)' }
                  ].map((m) => {
                    const isActive = selectedTimeMetric === m.id;

                    return (
                      <div key={m.id} className="relative group/time">
                        <button
                          onClick={() => setSelectedTimeMetric(m.id)}
                          className={`px-3 py-1.5 text-[14px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 metric-${m.id} ${isActive ? 'active shadow-md' : ''}`}
                        >
                          {m.label}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Enhanced Year/Week/Month Picker + Navigation */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 p-1.5 rounded-xl shadow-sm date-picker-wrapper">
                <select 
                  className="bg-[var(--bg-surface)] rounded-lg h-[32px] px-2 text-[14px] font-black outline-none cursor-pointer transition-all border date-picker-year"
                  value={currentDate.getFullYear()}
                  onChange={(e) => {
                    const targetYear = parseInt(e.target.value);
                    const newDate = new Date(currentDate);
                    newDate.setFullYear(targetYear);
                    setCurrentDate(newDate);
                  }}
                >
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                
                {timeRange !== 'year' && (
                  <>
                    <div className="w-[1px] h-4 bg-indigo-500/20" />
                    
                    <div className="flex items-center gap-1.5 px-1">
                      <span className="text-[14px] font-black text-indigo-500/60">
                        {timeRange === 'week' ? 'W' : 'M'}
                      </span>
                      {timeRange === 'week' ? (
                        <select 
                          className="bg-[var(--bg-surface)] rounded-lg h-[32px] px-2 text-[14px] font-black outline-none cursor-pointer transition-all border date-picker-sub"
                          value={getISOWeek(currentDate)}
                          onChange={(e) => {
                            const targetWeek = parseInt(e.target.value);
                            const currentWeek = getISOWeek(currentDate);
                            setCurrentDate(addDays(currentDate, (targetWeek - currentWeek) * 7));
                          }}
                        >
                          {[...Array(53)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                        </select>
                      ) : (
                        <select 
                          className="bg-[var(--bg-surface)] rounded-lg h-[32px] px-2 text-[14px] font-black outline-none cursor-pointer transition-all border date-picker-sub"
                          value={currentDate.getMonth() + 1}
                          onChange={(e) => {
                            const targetMonth = parseInt(e.target.value) - 1;
                            const newDate = new Date(currentDate);
                            newDate.setMonth(targetMonth);
                            setCurrentDate(newDate);
                          }}
                        >
                          {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                        </select>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (timeRange === 'week') {
                      setCurrentDate(addDays(currentDate, -7));
                    } else if (timeRange === 'month') {
                      const newDate = new Date(currentDate);
                      newDate.setMonth(currentDate.getMonth() - 1);
                      setCurrentDate(newDate);
                    } else if (timeRange === 'year') {
                      const newDate = new Date(currentDate);
                      newDate.setFullYear(currentDate.getFullYear() - 1);
                      setCurrentDate(newDate);
                    } else {
                      setCurrentDate(addDays(currentDate, -1));
                    }
                  }}
                  className="w-[32px] h-[32px] rounded-lg flex items-center justify-center transition-all date-nav-btn"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => {
                    if (timeRange === 'week') {
                      setCurrentDate(addDays(currentDate, 7));
                    } else if (timeRange === 'month') {
                      const newDate = new Date(currentDate);
                      newDate.setMonth(currentDate.getMonth() + 1);
                      setCurrentDate(newDate);
                    } else if (timeRange === 'year') {
                      const newDate = new Date(currentDate);
                      newDate.setFullYear(currentDate.getFullYear() + 1);
                      setCurrentDate(newDate);
                    } else {
                      setCurrentDate(addDays(currentDate, 1));
                    }
                  }}
                  className="w-[32px] h-[32px] rounded-lg flex items-center justify-center transition-all date-nav-btn"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {weekOffset !== 0 && (
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded transition-all date-today-btn"
                >
                  {timeRange === 'week' ? 'Current Week' : timeRange === 'month' ? 'Current Month' : timeRange === 'year' ? 'Current Year' : 'Today'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="personal-table-wrapper">
          <div className="max-h-[calc(100vh-335px)] overflow-auto custom-scrollbar sticky-header-container">
            <UnifiedTable 
              data={strictlyFilteredData}
              columnFilters={columnFilters}
              setColumnFilters={setColumnFilters}
              sortConfig={sortConfig}
              handleSort={handleSort}
              columnOptions={filterOptions}
              stickyOffset="0px"
            />
          </div>
        </div>
      )}

      {viewMode === 'project' && (
        <ProjectView projectTimesheetData={projectTimesheetData} getProjectColor={getProjectColor} />
      )}

      {viewMode === 'gantt' && (
        <GanttView 
          projectGroups={projectGroups} 
          ganttTimeline={ganttTimeline} 
          selectedTimeMetric={selectedTimeMetric} 
          timeRange={timeRange} 
          expandedProjects={expandedProjects} 
          setExpandedProjects={setExpandedProjects} 
          getProjectColor={getProjectColor} 
          workloadData={workloadData} 
        />
      )}




      {viewMode === 'daily' && (
        <TimesheetView timesheetData={timesheetData} getProjectColor={getProjectColor} />
      )}

      {viewMode === 'deep-analysis' && (
        <div className="max-h-[calc(100vh-335px)] overflow-y-auto custom-scrollbar pr-1">
          <DeepAnalysisView deepAnalysisData={deepAnalysisData} selectedTimeMetric={selectedTimeMetric} />
        </div>
      )}

      {viewMode === 'performance' && (
        <div className="personal-table-wrapper">
          <div className="max-h-[calc(100vh-335px)] overflow-y-auto overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="th-primary border-b border-[var(--border)]">
                  <th className="pr-6 text-left" style={{ paddingLeft: '12px' }}>Full Name</th>
                  <th className="px-4 text-center">Project Time</th>
                  <th className="px-4 text-center">Check Time</th>
                  <th className="px-4 text-center bg-indigo-500/5">OT Time</th>
                  <th className="px-4 text-center bg-orange-500/5">Leave (D)</th>
                  <th className="px-4 text-center">Free Time</th>
                  <th className="px-4 text-center text-emerald-500">Efficiency</th>
                  <th className="px-4 text-right pr-4">Performance (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {efficiencyData?.map((s, i) => (
                  <tr key={i} className="text-[14px] group hover:bg-[var(--bg-header)] transition-colors">
                    <td className="pr-6 py-4" style={{ paddingLeft: '12px' }}>
                      <div className="text-[var(--text-contrast)] uppercase tracking-tight">{s.name}</div>
                    </td>
                    <td className="px-4 py-4 text-center font-mono font-bold text-sky-400">{s.projectTime.toFixed(1)}h</td>
                    <td className="px-4 py-4 text-center font-mono font-bold text-amber-500">{s.checkTime.toFixed(1)}h</td>
                    <td className="px-4 py-4 text-center bg-indigo-500/5">
                      <input 
                        type="number" 
                        value={s.otTime || ''}
                        onChange={(e) => setManualData(prev => ({ ...prev, [s.name]: { ...prev[s.name], ot: parseFloat(e.target.value) || 0 } }))}
                        className="w-12 bg-transparent border-none text-center font-bold text-indigo-400 outline-none p-0 h-auto text-[14px]"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-4 text-center bg-orange-500/5 font-mono font-bold text-orange-400">
                      {s.leaveDays}d
                    </td>
                    <td className="px-4 py-4 text-center font-mono font-bold text-[var(--text-main)]">
                      {s.freeTime.toFixed(1)}h
                    </td>
                    <td className="px-4 py-4 text-center font-mono font-black text-emerald-500">{s.efficiency.toFixed(0)}%</td>
                    <td className="px-4 py-4 text-right pr-4 min-w-[140px]">
                      <div className="font-mono font-black text-red-500 mb-1">{s.performance.toFixed(1)}%</div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${Math.min(s.performance, 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'neural-brain' && (
        <NeuralBrain 
          filteredTasks={filteredData} 
          timeRange={timeRange} 
          setTimeRange={setTimeRange} 
        />
      )}
      </div>
    </div>
  );
};

export default PersonalSpace; // updated
