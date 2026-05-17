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

import { Filter, List, LayoutGrid, Layers, ChevronRight, ChevronLeft, ChevronDown, BarChart2, Users, ArrowUpDown, Search, PieChart } from 'lucide-react';
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
    dashboardProjects 
  } = useApp();

  const projectColorMap = useMemo(() => {
    const map = {};
    if (dashboardProjects) {
      dashboardProjects.forEach(p => {
        if (p.name && p.color) {
          map[p.name.toUpperCase()] = p.color;
        }
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
  const [weekOffset, setWeekOffset] = useState(0);
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
    if (!force && analystTasks && analystTasks.length > 0) return;
    
    setIsLoading(true);
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

  // Dynamic Options for Filters
  const filterOptions = useMemo(() => {
    // We use all tasks to populate the base options
    const data = analystTasks || [];
    const projects = [...new Set(data.map(t => t.project))].sort();
    const users = [...new Set(data.map(t => t.userName))].sort();
    const teams = [...new Set(data.map(t => t.team))].sort().filter(Boolean);
    return { projects, users, teams };
  }, [analystTasks]);

  const filteredData = useMemo(() => {
    const tasks = analystTasks || [];
    if (tasks.length === 0) return [];
    
    const now = new Date();
    const targetDate = addDays(now, weekOffset * 7);
    const startOfCurrentWeek = startOfWeek(targetDate, { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(targetDate, { weekStartsOn: 1 });
    const startOfCurrentMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfCurrentMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

    const filtered = tasks.filter(t => {
      // 1. Date Range Filter
      let dateMatch = true;
      if (t.dateObj && viewMode !== 'project' && viewMode !== 'daily' && viewMode !== 'gantt') {
        if (timeRange === 'day') {
          dateMatch = isSameDay(t.dateObj, targetDate);
        } else if (timeRange === 'week') {
          dateMatch = isWithinInterval(t.dateObj, { start: startOfCurrentWeek, end: endOfCurrentWeek });
        } else if (timeRange === 'month') {
          dateMatch = isWithinInterval(t.dateObj, { start: startOfCurrentMonth, end: endOfCurrentMonth });
        } else if (timeRange === 'year') {
          dateMatch = t.dateObj.getFullYear() === targetDate.getFullYear();
        }
      }

      if (!dateMatch) return false;

      // 1.5 Role-Based Self-Data Filter
      if (!user?.isAdmin && !user?.isLeader) {
        if (t.userName && t.userName.toString().trim().toLowerCase() !== user?.name?.trim().toLowerCase()) {
          return false;
        }
      }

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
  }, [analystTasks, localFilters, timeRange, localSort, user]);

  const { projectGroups, teamGroups, ganttTimeline, workloadData, weeklyData, timesheetData, projectTimesheetData, deepAnalysisData, efficiencyData } = usePersonalSpaceEngine({ filteredData, analystTasks, filterOptions, weekOffset, timeRange, selectedTimeMetric, manualData });

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
        {/* Show header even while loading */}
        <div className="bg-[var(--bg-card)] p-[20px] rounded-[12px] border border-[var(--border)] shadow-xl">
          <h2 className="text-[28px] font-black text-[var(--text-contrast)] uppercase tracking-tighter flex items-center gap-[10px]">
            <span 
              className="text-slate-900 dark:text-white"
              style={{ 
                textShadow: '0.5px 0.5px 1px rgba(255,255,255,0.2), -0.5px -0.5px 1px rgba(0,0,0,0.5)',
                opacity: 0.95,
                letterSpacing: '-0.05em'
              }}
            >
              PERSONAL
            </span>
          </h2>
        </div>
        <div className="h-[50vh] flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-400">Syncing Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-[10px] animate-in fade-in duration-700 pb-20">
      {/* Sticky Header + Filter Wrapper */}
      <div className="sticky top-[64px] z-[40] w-full space-y-[10px] pb-[10px] pt-[10px] mt-[-10px]" style={{ background: 'var(--bg-main, #0f172a)' }}>
      {/* Header */}
      <div className="bg-[var(--bg-card)] px-[20px] py-[16px] rounded-[12px] border border-[var(--border)] shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-[12px]">
          <div>
            <h2 className="text-[28px] font-black text-[var(--text-contrast)] uppercase tracking-tighter flex items-center gap-[10px]">
              <span 
                className="text-slate-900 dark:text-white"
                style={{ 
                  textShadow: '0.5px 0.5px 1px rgba(255,255,255,0.2), -0.5px -0.5px 1px rgba(0,0,0,0.5)',
                  opacity: 0.95,
                  letterSpacing: '-0.05em'
                }}
              >
                PERSONAL
              </span>
            </h2>
          </div>
        </div>

        {/* Windows 11 Fluent Toolbar - REDESIGNED */}
        <div className="mt-[12px] flex items-center gap-[12px] overflow-x-auto custom-scrollbar py-[4px]">
          
          {/* Unified Navigation: Basic, Project, Analysis Groups */}
          <div className="flex items-center gap-[12px] p-[3px] bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded-xl border border-white/20 shadow-inner shrink-0">
            {/* Group 1: Basic Modes */}
            <div className="flex items-center border-r border-slate-300/30 pr-2 mr-2">
              {[
                { id: 'list', label: 'List', icon: <List size={14} />, color: 'text-orange-500' },
                { id: 'daily', label: 'Daily', icon: <CalendarDays size={14} />, color: 'text-orange-500' }
              ].map(v => (
                <button
                  key={v.id}
                  onClick={() => setViewMode(v.id)}
                  className={`relative flex items-center gap-3 h-[32px] px-5 text-[11px] font-black uppercase tracking-wider transition-all duration-300 z-10 ${
                    viewMode === v.id ? v.color : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {v.icon} <span className="ml-1">{v.label}</span>
                  {viewMode === v.id && (
                    <motion.div
                      layoutId="activeViewMode"
                      className="absolute inset-0 bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.12)] z-[-1]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Group 2: Entity Modes */}
            <div className="flex items-center border-r border-slate-300/30 pr-2 mr-2">
              {[
                { id: 'project', label: 'Project', icon: <LayoutGrid size={14} />, color: 'text-emerald-500' }
              ].map(v => (
                <button
                  key={v.id}
                  onClick={() => setViewMode(v.id)}
                  className={`relative flex items-center gap-3 h-[32px] px-5 text-[11px] font-black uppercase tracking-wider transition-all duration-300 z-10 ${
                    viewMode === v.id ? v.color : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {v.icon} <span className="ml-1">{v.label}</span>
                  {viewMode === v.id && (
                    <motion.div
                      layoutId="activeViewMode"
                      className="absolute inset-0 bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.12)] z-[-1]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Group 3: Analysis Modes */}
            <div className="flex items-center">
              {[
                { id: 'gantt', label: 'Gantt', icon: <BarChart2 size={14} />, color: 'text-indigo-600' },
                { id: 'deep-analysis', label: 'Deep Analysis', icon: <Target size={14} />, color: 'text-indigo-600' },
                { id: 'performance', label: 'Performance', icon: <TrendingUp size={14} />, color: 'text-indigo-600' }
              ].map(v => (
                <button
                  key={v.id}
                  onClick={() => setViewMode(v.id)}
                  className={`relative flex items-center gap-3 h-[32px] px-5 text-[11px] font-black uppercase tracking-wider transition-all duration-300 z-10 ${
                    viewMode === v.id ? v.color : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {v.icon} <span className="ml-1">{v.label}</span>
                  {viewMode === v.id && (
                    <motion.div
                      layoutId="activeViewMode"
                      className="absolute inset-0 bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.12)] z-[-1]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1" /> {/* Spacer */}

            {/* Time Segmented Control (New Design) */}
            {['list', 'daily', 'project'].includes(viewMode) && (
              <div className="flex items-center gap-1 p-[3px] bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded-xl border border-white/20 shadow-inner relative shrink-0">
                {['week', 'month', 'year'].map((id) => {
                  const isActive = timeRange === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setTimeRange(id)}
                      className={`relative px-6 h-[28px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 z-10 ${
                        isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {id}
                      {isActive && (
                        <motion.div
                          layoutId="activeRange"
                          className="absolute inset-0 bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.12)] z-[-1]"
                          transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

          {/* Action Group: Sync */}
          <div className="flex items-center p-[3px] bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded-xl border border-white/20 shadow-inner shrink-0 ml-auto">
            <button
              onClick={() => loadData(true)}
              className="flex items-center gap-3 h-[28px] px-5 text-[10px] font-black uppercase tracking-widest text-violet-500 hover:text-violet-700 transition-colors"
              title="Force Sync with Supabase"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span className="ml-1">Sync</span>
            </button>
          </div>
        </div>
      </div>

      {/* Smart Filters Bar */}
      <div className="flex items-center gap-[10px] bg-[var(--bg-card)] px-[16px] py-[10px] rounded-[10px] border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-2 text-[var(--text-muted)] shrink-0">
          <Filter size={16} />
          <span className="text-[11px] font-semibold uppercase tracking-wider">Filters</span>
        </div>

        <input 
          type="text"
          placeholder="Search projects or tasks..."
          className="flex-1 min-w-[180px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-md h-[36px] px-3 text-[13px] font-medium text-[var(--text-main)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-300/30 transition-all"
          value={localFilters.search}
          onChange={e => setLocalFilters(prev => ({ ...prev, search: e.target.value }))}
        />

        {user?.isAdmin && (
          <select 
            className="min-w-[160px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-md h-[36px] px-3 text-[13px] font-medium text-[var(--text-main)] outline-none focus:border-blue-500 transition-all"
            value={localFilters.team}
            onChange={e => setLocalFilters(prev => ({ ...prev, team: e.target.value }))}
          >
            <option value="">All Teams</option>
            {filterOptions.teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        <select 
          className="min-w-[160px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-md h-[36px] px-3 text-[13px] font-medium text-[var(--text-main)] outline-none focus:border-emerald-500 transition-all"
          value={localFilters.project}
          onChange={e => setLocalFilters(prev => ({ ...prev, project: e.target.value }))}
        >
          <option value="">All Projects</option>
          {filterOptions.projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select 
          className="min-w-[160px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-md h-[36px] px-3 text-[13px] font-medium text-[var(--text-main)] outline-none focus:border-indigo-500 transition-all"
          value={localFilters.user}
          onChange={e => setLocalFilters(prev => ({ ...prev, user: e.target.value }))}
        >
          <option value="">All Members</option>
          {filterOptions.users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        <button 
          onClick={() => setLocalFilters({ team: '', user: '', project: '', search: '' })}
          className="h-[36px] px-4 text-[12px] font-semibold text-rose-500 hover:bg-rose-500/10 rounded-md transition-all shrink-0"
        >
          Clear
        </button>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 shrink-0 border-l border-[var(--border)] pl-3">
          <ArrowUpDown size={14} className="text-[var(--text-muted)]" />
          <select
            className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-md h-[36px] px-3 text-[13px] font-medium text-[var(--text-main)] outline-none focus:border-blue-500 transition-all"
            value={localSort}
            onChange={e => setLocalSort(e.target.value)}
          >
            <option value="date-desc">Date ↓ Newest</option>
            <option value="date-asc">Date ↑ Oldest</option>
            <option value="project-asc">Project A→Z</option>
            <option value="project-desc">Project Z→A</option>
            <option value="user-asc">User A→Z</option>
            <option value="user-desc">User Z→A</option>
            <option value="team-asc">Team A→Z</option>
          </select>
        </div>
      </div>
      </div>{/* End Sticky Wrapper */}

      {/* Content Area */}
      {/* Timesheet Summary & Navigation Header (Visible for Daily, Project, and Gantt) */}
      <div className="px-[20px] space-y-[10px]">
      {/* --- CONTENT AREA: STATS & TIME NAVIGATION --- */}
      <div className="ocd-card p-0 overflow-hidden mb-[10px] shadow-xl border border-indigo-500/20 bg-[var(--bg-card)]">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between px-[12px] py-[12px] bg-indigo-500/5 border-b border-[var(--border)] gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Hours:</span>
              <span className="text-[15px] font-black text-indigo-400">
                {((viewMode === 'daily' || viewMode === 'list') ? timesheetData?.grandTotalHours : projectTimesheetData?.grandTotalHours || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Tasks:</span>
              <span className="text-[15px] font-black text-emerald-400">
                {(viewMode === 'daily' || viewMode === 'list') ? timesheetData?.grandTotalTasks : projectTimesheetData?.grandTotalTasks || 0}
              </span>
            </div>

            <div className="w-[1px] h-8 bg-[var(--border)] mx-2 hidden xl:block" />

            {/* Time Metric Selector */}
            {['list', 'daily', 'project'].includes(viewMode) && (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-inner">
                {[
                  { id: 't1', label: 'T1', color: 'emerald', tooltip: 'DATE_START → DATE_END' },
                  { id: 't2', label: 'T2', color: 'sky', tooltip: 'DATE_START → DATE_COMPLETE' },
                  { id: 't3', label: 'T3', color: 'indigo', tooltip: 'DATE_START → DATE_CHECKED' },
                  { id: 't4', label: 'T4', color: 'orange', tooltip: 'DATE_STARTED → DATE_CHECKED' },
                  { id: 't5', label: 'T5', color: 'rose', tooltip: 'CREATED_AT → DATE_CHECKED' }
                ].map((m) => {
                  const isActive = selectedTimeMetric === m.id;
                  const colorClass = 
                    m.color === 'emerald' ? (isActive ? 'bg-emerald-500 text-white' : 'text-emerald-500 hover:bg-emerald-500/10') :
                    m.color === 'sky' ? (isActive ? 'bg-sky-500 text-white' : 'text-sky-500 hover:bg-sky-500/10') :
                    m.color === 'indigo' ? (isActive ? 'bg-indigo-500 text-white' : 'text-indigo-500 hover:bg-indigo-500/10') :
                    m.color === 'orange' ? (isActive ? 'bg-orange-500 text-white' : 'text-orange-500 hover:bg-orange-500/10') :
                    (isActive ? 'bg-rose-500 text-white' : 'text-rose-500 hover:bg-rose-500/10');

                  return (
                    <div key={m.id} className="relative group/time">
                      <div className="absolute -top-[34px] left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-[#0f172a] border border-white/10 rounded-md shadow-2xl opacity-0 group-hover/time:opacity-100 transition-all pointer-events-none whitespace-nowrap z-[60]">
                        <span className="text-[9px] font-black text-white tracking-tighter uppercase">{m.tooltip}</span>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0f172a] border-r border-b border-white/10 rotate-45" />
                      </div>

                      <button
                        onClick={() => setSelectedTimeMetric(m.id)}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${colorClass} ${isActive ? 'shadow-md' : ''}`}
                      >
                        {m.label}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Enhanced Year/Week Picker + Navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-indigo-500/10 p-1.5 rounded-xl border border-indigo-500/30 shadow-sm">
              <select 
                className="bg-[var(--bg-surface)] border border-indigo-500/20 rounded-lg h-[32px] px-2 text-[12px] font-black text-indigo-400 outline-none cursor-pointer hover:border-indigo-500 transition-all"
                value={format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7), 'yyyy')}
                onChange={(e) => {
                  const targetYear = parseInt(e.target.value);
                  const targetMonday = new Date(targetYear, 0, 4);
                  const currentMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
                  const diffWeeks = Math.round((targetMonday - currentMonday) / (7 * 24 * 60 * 60 * 1000));
                  setWeekOffset(diffWeeks);
                  if (timeRange === 'custom') setTimeRange('week');
                }}
              >
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              
              <div className="w-[1px] h-4 bg-indigo-500/20" />
              
              <div className="flex items-center gap-1.5 px-1">
                <span className="text-[10px] font-black text-indigo-500/60">W</span>
                <select 
                  className="bg-[var(--bg-surface)] border border-emerald-500/20 rounded-lg h-[32px] px-2 text-[12px] font-black text-emerald-500 outline-none cursor-pointer hover:border-emerald-500 transition-all"
                  value={format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7), 'I')}
                  onChange={(e) => {
                    const targetWeek = parseInt(e.target.value);
                    const date = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7);
                    const currentWeek = parseInt(format(date, 'I'));
                    setWeekOffset(prev => prev + (targetWeek - currentWeek));
                    if (timeRange === 'custom') setTimeRange('week');
                  }}
                >
                  {[...Array(53)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekOffset(o => o - 1)}
                className="w-[32px] h-[32px] rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setWeekOffset(o => o + 1)}
                className="w-[32px] h-[32px] rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider px-3 py-1.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
              >
                Current Week
              </button>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'list' && (
        <div className="ocd-card p-0 overflow-hidden shadow-2xl shadow-black/20">
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar sticky-header-container">
            <UnifiedTable 
              data={filteredData}
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
        <TimesheetView timesheetData={timesheetData} />
      )}

      {viewMode === 'deep-analysis' && (
        <DeepAnalysisView deepAnalysisData={deepAnalysisData} selectedTimeMetric={selectedTimeMetric} />
      )}

      {viewMode === 'performance' && (
        <div className="ocd-card p-0 shadow-2xl shadow-black/20 border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest border-b border-[var(--border)] bg-indigo-500/5 h-[40px]">
                  <th className="pr-6 py-0 vertical-align-middle" style={{ paddingLeft: '12px' }}>Full Name</th>
                  <th className="px-4 py-0 text-center vertical-align-middle">Project Time</th>
                  <th className="px-4 py-0 text-center vertical-align-middle">Check Time</th>
                  <th className="px-4 py-0 text-center bg-indigo-500/5 vertical-align-middle">OT Time</th>
                  <th className="px-4 py-0 text-center bg-orange-500/5 vertical-align-middle">Leave (D)</th>
                  <th className="px-4 py-0 text-center vertical-align-middle">Free Time</th>
                  <th className="px-4 py-0 text-center text-emerald-500 vertical-align-middle">Efficiency</th>
                  <th className="px-4 py-0 text-right vertical-align-middle pr-4">Performance (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {efficiencyData?.map((s, i) => (
                  <tr key={i} className="text-[11px] group hover:bg-[var(--bg-header)] transition-colors">
                    <td className="pr-6 py-4" style={{ paddingLeft: '12px' }}>
                      <div className="font-black text-[var(--text-contrast)] uppercase tracking-tight">{s.name}</div>
                    </td>
                    <td className="px-4 py-4 text-center font-mono font-bold text-sky-400">{s.projectTime.toFixed(1)}h</td>
                    <td className="px-4 py-4 text-center font-mono font-bold text-amber-500">{s.checkTime.toFixed(1)}h</td>
                    <td className="px-4 py-4 text-center bg-indigo-500/5">
                      <input 
                        type="number" 
                        value={s.otTime || ''}
                        onChange={(e) => setManualData(prev => ({ ...prev, [s.name]: { ...prev[s.name], ot: parseFloat(e.target.value) || 0 } }))}
                        className="w-12 bg-transparent border-none text-center font-bold text-indigo-400 outline-none p-0 h-auto"
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
      </div>
    </div>
  );
};

export default PersonalSpace; // updated
