import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import UnifiedTable from './CSVProcessor/UnifiedTable';
import { User, Target, TrendingUp, Calendar, CalendarDays, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchPersonalSpaceData, fetchUsers } from '../services/supabaseService';
import { processTaskData } from '../utils/dataProcessor';
import { format, startOfWeek, endOfWeek, getISOWeek } from 'date-fns';
import { Filter, List, LayoutGrid, ChevronRight, ChevronLeft, ChevronDown, BarChart2, Users, ArrowUpDown } from 'lucide-react';
import { differenceInDays, startOfDay, addDays, isSameDay, isWithinInterval } from 'date-fns';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
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
    handleSort 
  } = useApp();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'weekly' | 'project' | 'gantt' | 'team'
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedTeams, setExpandedTeams] = useState({});
  const [weekOffset, setWeekOffset] = useState(0);
  const [localMaps, setLocalMaps] = useState({ userMap: {}, teamMap: {} });
  
  // Optimization: Date Filtering
  const [timeRange, setTimeRange] = useState('month'); // 'week' | 'month' | 'year' | 'all'
  
  // Local Filter States
  const [localFilters, setLocalFilters] = useState({
    team: '',
    user: '',
    project: '',
    search: ''
  });

  // Local Sort State
  const [localSort, setLocalSort] = useState('date-desc'); // 'date-desc' | 'date-asc' | 'project-asc' | 'project-desc' | 'user-asc' | 'user-desc' | 'team-asc'

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
      const rawTasks = await fetchPersonalSpaceData(user, 3000);
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

  // Dynamic Options for Filters
  const filterOptions = useMemo(() => {
    const data = analystTasks || [];
    const projects = [...new Set(data.map(t => t.project))].sort();
    const users = [...new Set(data.map(t => t.userName))].sort();
    const teams = [...new Set(data.map(t => t.team))].sort();
    return { projects, users, teams };
  }, [analystTasks]);

  const filteredData = useMemo(() => {
    const now = new Date();
    const filtered = (analystTasks || []).filter(t => {
      // Date Range Filter (Local)
      if (timeRange !== 'all' && t.dateObj) {
        const diffDays = Math.abs((now - t.dateObj) / (1000 * 60 * 60 * 24));
        if (timeRange === 'week' && diffDays > 7) return false;
        if (timeRange === 'month' && diffDays > 30) return false;
      }

      const matchTeam = !localFilters.team || t.team === localFilters.team;
      const matchUser = !localFilters.user || t.userName === localFilters.user;
      const matchProject = !localFilters.project || t.project === localFilters.project;
      const matchSearch = !localFilters.search || 
        t.taskName?.toLowerCase().includes(localFilters.search.toLowerCase()) ||
        t.project?.toLowerCase().includes(localFilters.search.toLowerCase());
      return matchTeam && matchUser && matchProject && matchSearch;
    });

    // Apply local sort
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
  }, [analystTasks, localFilters, timeRange, localSort]);

  // Project Grouping View
  const projectGroups = useMemo(() => {
    const groups = {};
    filteredData.forEach(t => {
      const key = t.project || 'Unassigned';
      if (!groups[key]) groups[key] = { name: key, tasks: [], totalTime: 0 };
      groups[key].tasks.push(t);
      groups[key].totalTime += (t.score || 0);
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredData]);

  const teamGroups = useMemo(() => {
    const groups = {};
    filteredData.forEach(t => {
      const key = t.team || 'Unknown Team';
      if (!groups[key]) groups[key] = { name: key, tasks: [], totalTime: 0 };
      groups[key].tasks.push(t);
      groups[key].totalTime += (t.score || 0);
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredData]);

  const ganttTimeline = useMemo(() => {
    return [...Array(14)].map((_, i) => addDays(startOfDay(new Date()), i - 7));
  }, []);

  const workloadData = useMemo(() => {
    return ganttTimeline.map(day => {
      const activeTasks = filteredData.filter(t => {
        const start = t.dateObj || new Date();
        const end = t.dateEnd ? new Date(t.dateEnd) : addDays(start, 1);
        return isWithinInterval(day, { start: startOfDay(start), end: startOfDay(end) });
      });
      return activeTasks.length;
    });
  }, [filteredData, ganttTimeline]);

  // Grouping for Weekly View
  const weeklyData = useMemo(() => {
    const groups = {};
    filteredData.forEach(task => {
      const date = task.dateObj || new Date();
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-ww');
      const weekLabel = `Week ${format(weekStart, 'ww')} (${format(weekStart, 'dd/MM')} - ${format(endOfWeek(date, { weekStartsOn: 1 }), 'dd/MM')})`;
      
      if (!groups[weekKey]) {
        groups[weekKey] = { label: weekLabel, tasks: [], count: 0, completed: 0 };
      }
      groups[weekKey].tasks.push(task);
      groups[weekKey].count++;
      if (task.dateCompleteStr !== '-') groups[weekKey].completed++;
    });
    
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, data]) => ({ key, ...data }));
  }, [filteredData]);

  // Timesheet View Data (Mo-Fr pivot table)
  const timesheetData = useMemo(() => {
    const today = new Date();
    const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
    const targetMonday = addDays(currentMonday, weekOffset * 7);
    const weekDates = [0, 1, 2, 3, 4].map(i => addDays(targetMonday, i));
    const weekNum = getISOWeek(targetMonday);

    // Filter tasks that fall within this week's Mon-Fri
    const weekTasks = filteredData.filter(t => {
      if (!t.dateObj) return false;
      return weekDates.some(wd => isSameDay(t.dateObj, wd));
    });

    // Group by team → user → day, summing hours (t4 = pure processing minutes)
    const teamMap = {};
    weekTasks.forEach(t => {
      const team = t.team || 'Unknown';
      const user = t.userName || 'Unknown';
      const dayIndex = weekDates.findIndex(wd => isSameDay(t.dateObj, wd));
      if (dayIndex === -1) return;
      if (!teamMap[team]) teamMap[team] = {};
      if (!teamMap[team][user]) teamMap[team][user] = { hours: [0, 0, 0, 0, 0], tasks: [0, 0, 0, 0, 0] };
      teamMap[team][user].hours[dayIndex] += ((t.t4 || 0) / 60);
      teamMap[team][user].tasks[dayIndex] += 1;
    });

    // Convert to structured array
    const teams = Object.entries(teamMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([teamName, members]) => ({
        name: teamName,
        members: Object.entries(members)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([userName, data]) => ({
            name: userName,
            hours: data.hours,
            tasks: data.tasks,
            totalHours: data.hours.reduce((a, b) => a + b, 0),
            totalTasks: data.tasks.reduce((a, b) => a + b, 0)
          }))
      }));

    const totalPerDay = [0, 0, 0, 0, 0];
    const tasksPerDay = [0, 0, 0, 0, 0];
    teams.forEach(team => {
      team.members.forEach(member => {
        member.hours.forEach((val, i) => { totalPerDay[i] += val; });
        member.tasks.forEach((val, i) => { tasksPerDay[i] += val; });
      });
    });

    return {
      weekNumber: weekNum,
      monday: targetMonday,
      weekDates,
      teams,
      totalPerDay,
      tasksPerDay,
      grandTotalHours: totalPerDay.reduce((a, b) => a + b, 0),
      grandTotalTasks: tasksPerDay.reduce((a, b) => a + b, 0)
    };
  }, [filteredData, weekOffset]);

  const toggleWeek = (key) => {
    setExpandedWeeks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const scopeLabel = useMemo(() => {
    if (user?.isAdmin) return { label: 'Global Intelligence', sub: 'Admin Oversight Mode', color: 'text-rose-500', bg: 'bg-rose-500/10' };
    if (user?.isLeader) return { label: 'Team Intelligence', sub: `${user.team || 'Team'} Leadership Mode`, color: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { label: 'Personal Intelligence', sub: 'Individual Performance Mode', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
  }, [user]);

  if (isLoading && (!analystTasks || analystTasks.length === 0)) {
    return (
      <div className="space-y-[10px] pb-20">
        {/* Show header even while loading */}
        <div className="bg-[var(--bg-card)] p-[20px] rounded-[12px] border border-[var(--border)] shadow-xl">
          <h2 className="text-[28px] font-black text-[var(--text-contrast)] uppercase tracking-tighter flex items-center gap-[10px]">
            <User size={28} className={scopeLabel.color} />
            <span className={scopeLabel.color}>PERSONAL</span> SPACE
          </h2>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${scopeLabel.bg} ${scopeLabel.color}`}>{scopeLabel.label}</span>
          </div>
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
      <div className="sticky top-[80px] z-30 w-full space-y-[10px] pb-[10px]" style={{ background: 'var(--bg-main, #0f172a)' }}>
      {/* Header */}
      <div className="bg-[var(--bg-card)] px-[20px] py-[16px] rounded-[12px] border border-[var(--border)] shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-[12px]">
          <div>
            <h2 className="text-[28px] font-black text-[var(--text-contrast)] uppercase tracking-tighter flex items-center gap-[10px]">
              <User size={28} className={scopeLabel.color} />
              <span className={scopeLabel.color}>PERSONAL</span> SPACE
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${scopeLabel.bg} ${scopeLabel.color}`}>{scopeLabel.label}</span>
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{scopeLabel.sub}</span>
              {filteredData.length > 0 && (
                <span className="text-[9px] font-bold text-slate-500 uppercase">{filteredData.length} records</span>
              )}
            </div>
          </div>
        </div>

        {/* Windows 11 Fluent Toolbar */}
        <div className="mt-[12px] flex items-center gap-[12px] overflow-x-auto custom-scrollbar py-[4px]">
          {/* Time Range Buttons */}
          <div className="flex items-center gap-[8px] shrink-0">
            {[
              { id: 'week', label: 'Week', icon: <Calendar size={16} /> },
              { id: 'month', label: 'Month', icon: <Calendar size={16} /> },
              { id: 'all', label: 'All Data', icon: <Target size={16} /> }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setTimeRange(r.id)}
                className={`flex items-center gap-2 h-[40px] min-w-[90px] px-5 rounded-xl text-[13px] font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 border ${
                  timeRange === r.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border-blue-600'
                    : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-main)] hover:border-blue-400/40 hover:shadow-md'
                }`}
              >
                {r.icon} {r.label}
              </button>
            ))}
          </div>

          {/* Sync Button */}
          <button
            onClick={() => loadData(true)}
            className="flex items-center gap-2 h-[40px] min-w-[90px] px-5 rounded-xl text-[13px] font-semibold bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-main)] hover:border-blue-400/40 hover:shadow-md transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 shrink-0"
            title="Force Sync with Supabase"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Sync
          </button>

          {/* Divider */}
          <div className="w-px h-[28px] bg-[var(--border)] shrink-0" />

          {/* View Mode Buttons */}
          <div className="flex items-center gap-[8px] shrink-0">
            {[
              { id: 'list', label: 'List', icon: <List size={16} /> },
              { id: 'project', label: 'Project', icon: <LayoutGrid size={16} /> },
              { id: 'team', label: 'Team', icon: <Users size={16} /> },
              { id: 'gantt', label: 'Gantt', icon: <BarChart2 size={16} /> },
              { id: 'weekly', label: 'Weekly', icon: <Calendar size={16} /> },
              { id: 'daily', label: 'Daily', icon: <CalendarDays size={16} /> }
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`flex items-center gap-2 h-[40px] min-w-[90px] px-5 rounded-xl text-[13px] font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 border ${
                  viewMode === v.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border-blue-600'
                    : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-main)] hover:border-blue-400/40 hover:shadow-md'
                }`}
              >
                {v.icon} {v.label}
              </button>
            ))}
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
        <div className="space-y-[10px]">
          {projectGroups.map(group => (
            <div key={group.name} className="ocd-card p-0 overflow-hidden">
              <div 
                onClick={() => setExpandedProjects(prev => ({ ...prev, [group.name]: !prev[group.name] }))}
                className="flex items-center justify-between p-[15px] bg-white/5 cursor-pointer hover:bg-white/10 transition-all border-l-4 border-indigo-500"
              >
                <div className="flex items-center gap-4">
                  {expandedProjects[group.name] ? <ChevronDown size={18} className="text-indigo-500" /> : <ChevronRight size={18} className="text-[var(--text-muted)]" />}
                  <div>
                    <h3 className="text-[18px] font-black text-indigo-400 uppercase tracking-tight">{group.name}</h3>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Dataset: {group.tasks.length} tasks synced</span>
                  </div>
                </div>
              </div>
              
              {expandedProjects[group.name] && (
                <div className="border-t border-[var(--border)] max-h-[500px] overflow-y-auto custom-scrollbar">
                  <UnifiedTable 
                    data={group.tasks}
                    columnFilters={columnFilters}
                    setColumnFilters={setColumnFilters}
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                    columnOptions={filterOptions}
                    stickyOffset="0px"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {viewMode === 'gantt' && (
        <div className="ocd-card p-0 overflow-hidden bg-[var(--bg-card)] border border-[var(--border)] rounded-[12px] shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[1200px]">
              {/* Gantt Header: Dates */}
              <div className="flex border-b border-[var(--border)] bg-white/5 sticky top-0 z-20 backdrop-blur-md">
                <div className="w-[250px] border-r border-[var(--border)] p-[15px] text-[10px] font-black uppercase text-indigo-400">Task Intelligence</div>
                <div className="flex-1 flex">
                  {ganttTimeline.map((date, i) => {
                    const isToday = isSameDay(date, new Date());
                    return (
                      <div key={i} className={`flex-1 border-r border-[var(--border)] p-[10px] text-center ${isToday ? 'bg-indigo-500/10' : ''}`}>
                        <div className="text-[9px] font-black text-[var(--text-muted)] uppercase">{format(date, 'EEE')}</div>
                        <div className={`text-[12px] font-black ${isToday ? 'text-indigo-400' : 'text-[var(--text-main)]'}`}>{format(date, 'dd/MM')}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gantt Rows */}
              <div className="max-h-[600px] overflow-y-auto">
                {projectGroups.map(group => (
                  <div key={group.name} className="border-b border-[var(--border)]">
                    <div className="bg-indigo-500/5 px-[15px] py-[8px] text-[11px] font-black text-indigo-300 uppercase tracking-widest border-b border-[var(--border)] flex justify-between">
                      <span>{group.name}</span>
                      <span className="text-[9px] opacity-50">{group.tasks.length} Phases</span>
                    </div>
                    {group.tasks.slice(0, 20).map(task => {
                      const startDate = task.dateObj || new Date();
                      const endDate = task.dateEnd ? new Date(task.dateEnd) : addDays(startDate, 1);
                      const chartStart = addDays(startOfDay(new Date()), -7);
                      
                      const startOffset = Math.max(0, differenceInDays(startDate, chartStart));
                      const duration = Math.max(0.5, differenceInDays(endDate, startDate));
                      
                      if (startOffset > 14) return null;

                      return (
                        <div key={task.id} className="flex h-12 hover:bg-white/[0.02] group border-b border-white/[0.02]">
                          <div className="w-[250px] border-r border-[var(--border)] p-[10px] flex items-center">
                            <span className="text-[10px] font-bold text-[var(--text-main)] truncate group-hover:text-indigo-400 transition-colors uppercase italic">{task.taskName}</span>
                          </div>
                          <div className="flex-1 relative flex items-center px-2">
                            {/* Bar Positioning Logic: Simplified for standard 14-day grid */}
                            <motion.div 
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: `${(duration / 14) * 100}%` }}
                              style={{ 
                                marginLeft: `${(startOffset / 14) * 100}%`,
                                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                                boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)'
                              }}
                              className="h-6 rounded-[4px] relative overflow-hidden group/bar"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
                              <div className="absolute inset-0 flex items-center justify-center px-2">
                                <span className="text-[8px] font-black text-white uppercase whitespace-nowrap overflow-hidden opacity-0 group-hover/bar:opacity-100 transition-opacity">
                                  {task.userName}
                                </span>
                              </div>
                            </motion.div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Workload Intelligence Chart (Below Gantt) */}
          <div className="p-[20px] bg-white/5 border-t border-[var(--border)]">
            <div className="flex items-center gap-[10px] mb-[15px]">
              <TrendingUp size={16} className="text-emerald-400" />
              <h3 className="text-[12px] font-black text-emerald-400 uppercase tracking-widest">Workload Intelligence (Active Tasks / Day)</h3>
            </div>
            <div className="h-[150px]">
              <Bar 
                data={{
                  labels: ganttTimeline.map(d => format(d, 'dd/MM')),
                  datasets: [{
                    label: 'Active Tasks',
                    data: workloadData,
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 4
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 9, weight: 'bold' } } },
                    y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { precision: 0, color: '#94A3B8' } }
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {viewMode === 'team' && (
        <div className="space-y-[10px]">
          {teamGroups.map(group => (
            <div key={group.name} className="ocd-card p-0 overflow-hidden">
              <div 
                onClick={() => setExpandedTeams(prev => ({ ...prev, [group.name]: !prev[group.name] }))}
                className="flex items-center justify-between p-[15px] bg-white/5 cursor-pointer hover:bg-white/10 transition-all border-l-4 border-emerald-500"
              >
                <div className="flex items-center gap-4">
                  {expandedTeams[group.name] ? <ChevronDown size={18} className="text-emerald-500" /> : <ChevronRight size={18} className="text-[var(--text-muted)]" />}
                  <div>
                    <h3 className="text-[16px] font-black text-emerald-400 uppercase tracking-tight">{group.name}</h3>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Active Operatives: {[...new Set(group.tasks.map(t => t.userName))].length}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-emerald-500 uppercase">Load: {group.tasks.length} Tasks</span>
                </div>
              </div>
              
              {expandedTeams[group.name] && (
                <div className="border-t border-[var(--border)] max-h-[500px] overflow-y-auto custom-scrollbar">
                  <UnifiedTable 
                    data={group.tasks}
                    columnFilters={columnFilters}
                    setColumnFilters={setColumnFilters}
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                    columnOptions={filterOptions}
                    stickyOffset="0px"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {viewMode === 'weekly' && (
        <div className="space-y-[10px]">
          {weeklyData.map(week => (
            <div key={week.key} className="ocd-card p-0 overflow-hidden border-indigo-500/20">
              <div 
                onClick={() => toggleWeek(week.key)}
                className="flex items-center justify-between p-[15px] bg-white/5 cursor-pointer hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-4">
                  {expandedWeeks[week.key] ? <ChevronDown size={18} className="text-indigo-500" /> : <ChevronRight size={18} className="text-[var(--text-muted)]" />}
                  <div>
                    <h3 className="text-[12px] font-black text-[var(--text-contrast)] uppercase tracking-widest">{week.label}</h3>
                    <div className="flex gap-4 mt-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Tasks: {week.count}</span>
                      <span className="text-[9px] font-bold text-emerald-500 uppercase">Completed: {week.completed}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-indigo-500 uppercase">Week Efficiency</div>
                  <div className="text-lg font-black text-[var(--text-contrast)] tracking-tighter">
                    {week.tasks.length > 0 ? (week.tasks.reduce((acc, t) => acc + (t.score || 0), 0) / week.tasks.length).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
              
              {expandedWeeks[week.key] && (
                <div className="border-t border-[var(--border)] overflow-x-auto custom-scrollbar">
                  <UnifiedTable 
                    data={week.tasks}
                    columnFilters={columnFilters}
                    setColumnFilters={setColumnFilters}
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                    columnOptions={filterOptions}
                    stickyOffset="215px"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {viewMode === 'daily' && (
        <div className="ocd-card p-0 overflow-hidden shadow-2xl shadow-black/20">
          {/* Timesheet Header */}
          <div className="flex items-center justify-between px-[20px] py-[14px] bg-white/5 border-b border-[var(--border)]">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Total hours:</span>
                <span className="text-[14px] font-black text-[var(--text-contrast)]">{timesheetData.grandTotalHours.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Tasks:</span>
                <span className="text-[14px] font-black text-indigo-400">{timesheetData.grandTotalTasks}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setWeekOffset(o => o - 1)}
                className="w-[32px] h-[32px] rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-center min-w-[120px]">
                <span className="text-[15px] font-black text-[var(--text-contrast)] tracking-tight">Week : {timesheetData.weekNumber}</span>
              </div>
              <button
                onClick={() => setWeekOffset(o => o + 1)}
                className="w-[32px] h-[32px] rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <ChevronRight size={16} />
              </button>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 transition-all"
                >
                  Today
                </button>
              )}
            </div>
          </div>

          {/* Timesheet Table */}
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
              <thead>
                <tr className="bg-[var(--bg-card)]">
                  <th className="sticky z-20 text-left px-[16px] py-[12px] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-r border-[var(--border)] w-[120px] bg-[var(--bg-card)]" style={{ top: '0px' }}>Team</th>
                  <th className="sticky z-20 text-left px-[16px] py-[12px] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-r border-[var(--border)] w-[160px] bg-[var(--bg-card)]" style={{ top: '0px' }}>Member</th>
                  {timesheetData.weekDates.map((date, i) => {
                    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                    const dayColors = ['text-blue-400', 'text-violet-400', 'text-amber-400', 'text-emerald-400', 'text-rose-400'];
                    const isToday = isSameDay(date, new Date());
                    return (
                      <th key={i} className={`sticky z-20 text-center px-[10px] py-[12px] border-b border-r border-[var(--border)] ${isToday ? 'bg-indigo-500/10' : 'bg-[var(--bg-card)]'}`} style={{ top: '0px' }}>
                        <div className={`text-[12px] font-black ${dayColors[i]}`}>{format(date, 'dd/MM')}</div>
                        <div className={`text-[9px] font-bold uppercase tracking-wider ${isToday ? 'text-indigo-400' : 'text-[var(--text-muted)]'}`}>[{dayLabels[i]}]</div>
                      </th>
                    );
                  })}
                  <th className="sticky z-20 text-center px-[10px] py-[12px] border-b border-[var(--border)] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest w-[80px] bg-[var(--bg-card)]" style={{ top: '0px' }}>Total</th>
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
                {timesheetData.teams.map(team => (
                  team.members.map((member, mi) => (
                    <tr key={`${team.name}-${member.name}`} className="hover:bg-white/[0.02] transition-colors border-b border-white/[0.03]">
                      {mi === 0 && (
                        <td
                          rowSpan={team.members.length}
                          className="px-[16px] py-[10px] text-[12px] font-black text-indigo-400 uppercase tracking-tight border-r border-[var(--border)] align-top bg-white/[0.02]"
                        >
                          {team.name}
                        </td>
                      )}
                      <td className="px-[16px] py-[10px] text-[12px] font-semibold text-[var(--text-main)] border-r border-[var(--border)]">
                        {member.name}
                      </td>
                      {member.hours.map((hours, di) => {
                        const isToday = isSameDay(timesheetData.weekDates[di], new Date());
                        const cellColor = hours === 0 ? 'text-[var(--text-muted)] opacity-30'
                          : hours < 4 ? 'text-rose-400 font-black'
                          : hours < 7 ? 'text-amber-400 font-black'
                          : hours < 9 ? 'text-emerald-400 font-black'
                          : 'text-blue-400 font-black';
                        return (
                          <td
                            key={di}
                            className={`text-center px-[10px] py-[10px] text-[13px] border-r border-[var(--border)] ${isToday ? 'bg-indigo-500/5' : ''} ${cellColor}`}
                            title={`${member.tasks[di]} task(s)`}
                          >
                            {hours > 0 ? hours.toFixed(2) : ''}
                          </td>
                        );
                      })}
                      <td className="text-center px-[10px] py-[10px] text-[13px] font-black text-[var(--text-contrast)]">
                        {member.totalHours > 0 ? member.totalHours.toFixed(2) : ''}
                      </td>
                    </tr>
                  ))
                ))}
              </tbody>
              {timesheetData.teams.length > 0 && (
                <tfoot>
                  <tr className="bg-white/[0.05] border-t-2 border-[var(--border)]">
                    <td colSpan={2} className="px-[16px] py-[12px] text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest border-r border-[var(--border)]">Total</td>
                    {timesheetData.totalPerDay.map((total, i) => {
                      const isToday = isSameDay(timesheetData.weekDates[i], new Date());
                      return (
                        <td key={i} className={`text-center px-[10px] py-[12px] text-[13px] font-black text-[var(--text-contrast)] border-r border-[var(--border)] ${isToday ? 'bg-indigo-500/10' : ''}`}>
                          {total > 0 ? total.toFixed(2) : ''}
                        </td>
                      );
                    })}
                    <td className="text-center px-[10px] py-[12px] text-[14px] font-black text-indigo-400">
                      {timesheetData.grandTotalHours.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalSpace;
