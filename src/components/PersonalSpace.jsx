import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import UnifiedTable from './CSVProcessor/UnifiedTable';
import { User, Target, TrendingUp, Calendar, CalendarDays, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchPersonalSpaceData, fetchUsers, updateApexTaskReview } from '../services/supabaseService';
import { fetchApexTimesheetData, getCachedApexTimesheetData, subscribeApexTimesheetData } from '../services/apexTimesheetCache';
import { processTaskData } from '../utils/dataProcessor';
import { format, startOfWeek, endOfWeek, getISOWeek } from 'date-fns';
import { usePersonalSpaceEngine } from '../utils/PersonalSpaceEngine';
import TimesheetView from './PersonalSpace/TimesheetView';
import ApexTimesheetView from './PersonalSpace/ApexTimesheetView';
import TotalTimesheetView from './PersonalSpace/TotalTimesheetView';
import PerformanceTimesheetView from './PersonalSpace/PerformanceTimesheetView';
import ProjectView from './PersonalSpace/ProjectView';
import GanttView from './PersonalSpace/GanttView';
import PerformanceView from './PersonalSpace/PerformanceView';
import NeumorphicPersonalSwitcher from './buttons/NeumorphicPersonalSwitcher';
import NeumorphicSearch from './buttons/NeumorphicSearch';
import NeumorphicDropdown from './buttons/NeumorphicDropdown';

import { Filter, ChevronRight, ChevronLeft, ArrowUpDown, ChevronDown, Download } from 'lucide-react';
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

const TIME_METRICS = [
  { value: 't2', label: 'USER TIME', color: 'text-sky-500 dark:text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30', dot: 'bg-sky-500 dark:bg-sky-400' },
  { value: 't1', label: 'PLAN TIME', color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-500 dark:bg-emerald-400' },
  { value: 't5', label: 'REVIEW', color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', dot: 'bg-rose-500 dark:bg-rose-400' }
];

import { CANONICAL_STAFF_NAMES, getCanonicalName, isSameUser } from '../utils/userUtils';

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
    dashboardUsers,
    dashboardLeave,
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
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'daily' | 'project' | 'timesheet' | 'gantt' | 'performance'
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
  const [selectedTimeMetric, setSelectedTimeMetric] = useState('t2'); // Default to T2 (USER TIME)
  const projectViewRef = useRef(null);
  
  // Optimization: Date Filtering
  const [timeRange, setTimeRange] = useState('week'); // 'day' | 'week' | 'month' | 'year'
  
  // Local Filter States
  const [localFilters, setLocalFilters] = useState({
    team: '',
    user: '',
    project: '',
    search: ''
  });

  const [apexTimesheetCache, setApexTimesheetCache] = useState(() => getCachedApexTimesheetData());

  useEffect(() => {
    const unsub = subscribeApexTimesheetData(data => {
      setApexTimesheetCache(data);
    });
    return () => unsub();
  }, []);

  const timesheetWeeklyStats = useMemo(() => {
    const records = apexTimesheetCache?.timesheetRecords || [];
    const projs = apexTimesheetCache?.apexProjects || [];
    const projMap = {};
    projs.forEach(p => { if (p.id) projMap[p.id] = (p.key || p.name || '').trim().toUpperCase(); });

    const currentWk = getISOWeek(currentDate);
    const currentYr = currentDate.getFullYear();
    const isAustralia = (u) => {
      const loc = (u?.location || '').toString().toLowerCase();
      return loc.includes('aus') || loc.includes('australia');
    };
    const userMap = {};
    (localMaps.rawUsers || []).forEach(u => { if (u.id) userMap[u.id] = u; });
    (apexTimesheetCache?.apexUsers || []).forEach(u => { if (u.id && !userMap[u.id]) userMap[u.id] = u; });

    let total = 0;
    let count = 0;
    records.forEach(r => {
      if (Number(r.week) === currentWk && (Number(r.year) === currentYr || !r.year)) {
        const uObj = userMap[r.user_id];
        if (isAustralia(uObj)) return;
        const pKey = projMap[r.project_id] || '';
        // Ở tab TOTAL TIME SHEET thì không cộng dồn APEX vào ô TOTAL
        if (viewMode === 'total_timesheet' && pKey === 'APEX') return;

        // Apply filters
        const userName = (uObj?.name || uObj?.full_name || '').toString().trim();
        const userTeam = (uObj?.team || localMaps.userTeamByName?.[userName.toLowerCase()] || '').toString().trim().toUpperCase();

        if (localFilters.team && userTeam.toLowerCase() !== localFilters.team.trim().toLowerCase()) return;
        if (localFilters.project && pKey.toLowerCase() !== localFilters.project.trim().toLowerCase()) return;
        if (localFilters.user && !isSameUser(userName, localFilters.user)) return;

        const rowHours = (Number(r.mon) || 0) + (Number(r.tue) || 0) + (Number(r.wed) || 0) +
                         (Number(r.thu) || 0) + (Number(r.fri) || 0) + (Number(r.sat) || 0) + (Number(r.sun) || 0);
        if (rowHours > 0) {
          total += rowHours;
          count++;
        }
      }
    });
    return { totalHours: total, count };
  }, [apexTimesheetCache, currentDate, localMaps, localFilters]);

  const loadData = async (force = false) => {
    if (!user) return;
    
    const hasCache = analystTasks && analystTasks.length > 0;
    if (!force && hasCache) {
      // Stale-while-revalidate: fetch silently in the background
    } else {
      setIsLoading(true);
    }
    try {
      // 1. Fetch Vietnam users for mapping, tasks, and timesheet data in parallel
      const [usersList, rawTasks] = await Promise.all([
        fetchUsers(true),
        fetchPersonalSpaceData(user, 50000),
        fetchApexTimesheetData(force)
      ]);

      const uMap = {};
      const tMap = {};
      const userTeamByName = {};
      usersList.forEach(u => {
        if (u.id) {
          uMap[u.id] = u.name;
          uMap[u.id.toLowerCase()] = u.name;
          tMap[u.id] = u.team;
          tMap[u.id.toLowerCase()] = u.team;
        }
        if (u.email) {
          uMap[u.email.toLowerCase()] = u.name;
          tMap[u.email.toLowerCase()] = u.team;
        }
        if (u.name && u.team) {
          userTeamByName[u.name.toLowerCase().trim()] = u.team.toUpperCase().trim();
        }
      });
      setLocalMaps({ userMap: uMap, teamMap: tMap, userTeamByName, rawUsers: usersList });

      // 2. Process tasks - Admin gets ALL data
      const processed = processTaskData(rawTasks, uMap, tMap);
      setAnalystTasks(processed);
    } catch (err) {
      console.error('Failed to load personal space data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateReview = async (taskId, newReview) => {
    try {
      setAnalystTasks(prev => (prev || []).map(t => t.id === taskId ? { ...t, reviewTime: newReview, time5Str: newReview } : t));
      await updateApexTaskReview(taskId, newReview);
    } catch (err) {
      console.error('Lỗi khi cập nhật Review time:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    // Completely disable page-level scrolling so wheeling outside table never scrolls the page
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  // Ensure daily, timesheet, total_timesheet & performance_timesheet views only use weekly range
  useEffect(() => {
    if ((viewMode === 'daily' || viewMode === 'timesheet' || viewMode === 'total_timesheet' || viewMode === 'performance_timesheet') && timeRange !== 'week') {
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
    const selectedTeam = (localFilters.team || '').trim().toLowerCase();
    const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    // 1. Teams: All distinct valid teams
    const taskTeams = data.map(t => t.team);
    const mapTeams = Object.values(localMaps.teamMap || {});
    const rawUserTeams = (localMaps.rawUsers || []).map(u => u.team);
    const teams = [...new Set([...taskTeams, ...mapTeams, ...rawUserTeams])]
      .filter(t => t && typeof t === 'string' && t.trim() !== '' && t !== 'UNASSIGNED TEAM' && t !== 'null' && !isUUID(t))
      .map(t => t.trim().toUpperCase())
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();

    // 2. Filter tasks based on selected Team
    const teamTasks = selectedTeam 
      ? data.filter(t => {
          const tTeam = (t.team || '').toString().trim().toLowerCase();
          const fallbackTeam = (localMaps.userTeamByName?.[(t.userName || '').toLowerCase().trim()] || '').toLowerCase();
          return tTeam === selectedTeam || fallbackTeam === selectedTeam;
        })
      : data;

    // 3. Projects:
    // Show projects from tasks as well as APEX projects (from dashboardProjects)
    const taskProjects = teamTasks.map(t => t.project);
    const dbProjects = (dashboardProjects || []).map(p => (p.key || p.name || '').trim().toUpperCase());
    const projects = [...new Set([...taskProjects, ...dbProjects])]
      .filter(p => p && p !== 'UNASSIGNED' && p.trim() !== '')
      .map(p => p.trim())
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();

    // 4. Users:
    // If team is selected: ONLY show users belonging to this team! (Exclude Australia)
    let candidateUsers = [];
    const isAustralia = (u) => {
      const loc = (u?.location || '').toString().toLowerCase();
      return loc.includes('aus') || loc.includes('australia');
    };
    const allKnownUsers = [
      ...(localMaps.rawUsers || []),
      ...(dashboardUsers || [])
    ].filter(u => !isAustralia(u));
    if (selectedTeam) {
      const fromUsers = allKnownUsers
        .filter(u => (u.team || '').toString().trim().toLowerCase() === selectedTeam)
        .map(u => u.name);

      const fromTasks = teamTasks.map(t => t.userName);

      candidateUsers = [...fromUsers, ...fromTasks];
    } else {
      const fromUsers = allKnownUsers.map(u => u.name);
      const fromTasks = data.map(t => t.userName);
      candidateUsers = [...fromUsers, ...fromTasks];
    }

    const users = [...new Set(candidateUsers.map(u => getCanonicalName(u)))]
      .filter(u => u && typeof u === 'string' && u.trim() !== '' && u !== 'UNKNOWN' && !isUUID(u.trim()) && !u.toUpperCase().includes('JASON'))
      .map(u => u.trim())
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));

    return { projects, users, teams };
  }, [rbacBaseTasks, localMaps.teamMap, localMaps.rawUsers, localMaps.userTeamByName, localFilters.team, dashboardProjects, dashboardUsers]);

  // Auto-reset user or project if no longer valid under current team
  useEffect(() => {
    if (localFilters.user && filterOptions.users.length > 0 && !filterOptions.users.includes(localFilters.user)) {
      setLocalFilters(prev => ({ ...prev, user: '' }));
    }
  }, [filterOptions.users, localFilters.user]);

  useEffect(() => {
    if (localFilters.project && filterOptions.projects.length > 0 && !filterOptions.projects.includes(localFilters.project)) {
      setLocalFilters(prev => ({ ...prev, project: '' }));
    }
  }, [filterOptions.projects, localFilters.project]);

  const filteredData = useMemo(() => {
    const tasks = rbacBaseTasks;
    if (tasks.length === 0) return [];
    
    const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(currentDate, { weekStartsOn: 1 });
    const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0);
    const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const filtered = tasks.filter(t => {
      // 1. Date Range Filter
      let dateMatch = true;
      if (t.dateObj && viewMode !== 'daily' && viewMode !== 'gantt' && viewMode !== 'timesheet') {
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
      const selTeam = localFilters.team?.trim().toLowerCase();
      const matchTeam = !selTeam || 
        (t.team && t.team.toString().trim().toLowerCase() === selTeam) ||
        (localMaps.userTeamByName?.[(t.userName || '').toLowerCase().trim()]?.toLowerCase() === selTeam);
      
      // 3. User Filter
      const matchUser = !localFilters.user || isSameUser(t.userName, localFilters.user) || isSameUser(t.user, localFilters.user);
      
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
    <div className="tab-personal w-full h-full flex flex-col gap-[6px] animate-in fade-in duration-700 overflow-hidden">
      {/* Sticky Header + Filter Wrapper */}
      <div className="shrink-0 z-[40] w-full flex flex-col gap-[6px] pb-1 pt-0" style={{ background: 'var(--bg-main, #0f172a)' }}>
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
              onChange={e => {
                const newTeam = e.target.value;
                setLocalFilters(prev => ({
                  ...prev,
                  team: newTeam,
                  user: '',
                  project: ''
                }));
              }}
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
            className={`w-[60px] h-[46px] flex items-center justify-center text-[14px] font-bold rounded-xl transition-all shrink-0 border ${isDark ? 'bg-slate-800 text-indigo-400 hover:bg-slate-700 border-slate-700 shadow-[4px_4px_10px_#0f172a,-4px_-4px_10px_#334155] active:shadow-[inset_3px_3px_8px_#0f172a,inset_-3px_-3px_8px_#334155]' : 'bg-white text-[#4f46e5] hover:bg-slate-50 border-white/50 shadow-[4px_4px_10px_rgba(163,177,198,0.4),-4px_-4px_10px_rgba(255,255,255,1)] active:shadow-[inset_3px_3px_8px_rgba(163,177,198,0.4),inset_-3px_-3px_8px_rgba(255,255,255,1)]'}`}
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
            {['list', 'daily', 'project', 'timesheet', 'gantt', 'performance'].includes(viewMode) && (
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
      <div className="px-[10px] flex-1 min-h-0 flex flex-col gap-[6px] overflow-hidden">
      {/* --- CONTENT AREA: STATS & TIME NAVIGATION --- */}
      <div className="personal-stats-bar relative z-[38] shrink-0">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between stats-summary-bar gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
              <span className="text-[14px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Hours:</span>
              <span className="text-[14px] font-black stat-val-hours">
                {['timesheet', 'total_timesheet', 'performance_timesheet'].includes(viewMode)
                  ? (timesheetWeeklyStats.totalHours || 0).toFixed(1)
                  : ((viewMode === 'daily' || viewMode === 'list') ? timesheetData?.grandTotalHours : projectTimesheetData?.grandTotalHours || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
              <span className="text-[14px] font-black text-[var(--text-muted)] uppercase tracking-widest">Tasks:</span>
              <span className="text-[14px] font-black stat-val-tasks">
                {['timesheet', 'total_timesheet', 'performance_timesheet'].includes(viewMode)
                  ? timesheetWeeklyStats.count
                  : ((viewMode === 'daily' || viewMode === 'list') ? timesheetData?.grandTotalTasks : projectTimesheetData?.grandTotalTasks || 0)}
              </span>
            </div>

              <div className="w-[1px] h-8 bg-[var(--border)] mx-2 hidden xl:block" />

              {/* Drop List for Time Metric (Available for Daily, Project, and Timesheet views) */}
              {['daily', 'project', 'timesheet'].includes(viewMode) && (() => {
                const currentMetric = TIME_METRICS.find(m => m.value === selectedTimeMetric) || TIME_METRICS[0];
                return (
                  <div className="relative inline-flex items-center group">
                    <select
                      value={selectedTimeMetric}
                      onChange={(e) => setSelectedTimeMetric(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                      title="Select Time Metric"
                    >
                      {TIME_METRICS.map(m => (
                        <option key={m.value} value={m.value} className="bg-[var(--bg-card)] text-[var(--text-main)] py-1 font-bold">
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${currentMetric.bg} ${currentMetric.color} text-[13px] font-black tracking-wider uppercase shadow-sm transition-all duration-300 group-hover:scale-[1.02] cursor-pointer`}>
                      <span className={`w-2 h-2 rounded-full ${currentMetric.dot} animate-pulse`} />
                      <span>{currentMetric.label}</span>
                      <ChevronDown size={14} className="opacity-70 ml-0.5 transition-transform duration-200 group-hover:translate-y-0.5" />
                    </div>
                  </div>
                );
              })()}

              {/* Export Excel Button (Available for Project View) */}
              {viewMode === 'project' && (
                <button
                  onClick={() => projectViewRef.current?.exportCSV()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-black rounded-xl shadow-sm transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                  title="Export this table to Excel (.csv)"
                >
                  <Download size={14} />
                  <span>EXPORT EXCEL</span>
                </button>
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
              onUpdateReview={handleUpdateReview}
            />
          </div>
        </div>
      )}

      {viewMode === 'project' && (
        <ProjectView 
          ref={projectViewRef}
          filteredData={filteredData}
          analystTasks={analystTasks}
          dashboardProjects={dashboardProjects}
          getProjectColor={getProjectColor}
          selectedTimeMetric={selectedTimeMetric}
          timeRange={timeRange}
          currentDate={currentDate}
          searchQuery={localFilters.search || ''}
        />
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

      {viewMode === 'timesheet' && (
        <ApexTimesheetView 
          currentDate={currentDate}
          getProjectColor={getProjectColor}
          selectedTimeMetric={selectedTimeMetric}
          rawUsers={localMaps.rawUsers}
          userTeamByName={localMaps.userTeamByName}
          dashboardProjects={dashboardProjects}
          dashboardUsers={dashboardUsers}
          selectedTeam={localFilters.team}
          selectedProject={localFilters.project}
          selectedUser={localFilters.user}
          searchQuery={localFilters.search || ''}
        />
      )}

      {viewMode === 'total_timesheet' && (
        <TotalTimesheetView 
          currentDate={currentDate}
          getProjectColor={getProjectColor}
          selectedTimeMetric={selectedTimeMetric}
          rawUsers={localMaps.rawUsers}
          userTeamByName={localMaps.userTeamByName}
          dashboardProjects={dashboardProjects}
          dashboardUsers={dashboardUsers}
          selectedTeam={localFilters.team}
          selectedProject={localFilters.project}
          selectedUser={localFilters.user}
          searchQuery={localFilters.search || ''}
        />
      )}

      {viewMode === 'performance' && (
        <div className="flex-1 min-h-0 h-full overflow-hidden">
          <PerformanceView 
            filteredData={filteredData}
            dashboardProjects={dashboardProjects}
            dashboardUsers={dashboardUsers}
            dashboardLeave={dashboardLeave}
            getProjectColor={getProjectColor}
            selectedTimeMetric={selectedTimeMetric}
            currentDate={currentDate}
            selectedTeam={localFilters.team}
            rawUsers={localMaps.rawUsers}
            userTeamByName={localMaps.userTeamByName}
          />
        </div>
      )}

      {viewMode === 'performance_timesheet' && (
        <div className="flex-1 min-h-0 h-full overflow-hidden">
          <PerformanceTimesheetView 
            filteredData={filteredData}
            analystTasks={analystTasks}
            dashboardProjects={dashboardProjects}
            dashboardUsers={dashboardUsers}
            dashboardLeave={dashboardLeave}
            getProjectColor={getProjectColor}
            selectedTimeMetric={selectedTimeMetric}
            currentDate={currentDate}
            selectedTeam={localFilters.team}
            selectedProject={localFilters.project}
            selectedUser={localFilters.user}
            searchQuery={localFilters.search || ''}
            rawUsers={localMaps.rawUsers}
            userTeamByName={localMaps.userTeamByName}
          />
        </div>
      )}

      </div>
    </div>
  );
};

export default PersonalSpace; // updated
