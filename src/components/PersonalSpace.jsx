import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import UnifiedTable from './CSVProcessor/UnifiedTable';
import { User, Target, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchPersonalSpaceData, fetchUsers } from '../services/supabaseService';
import { processTaskData } from '../utils/dataProcessor';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Filter, List, LayoutGrid, ChevronRight, ChevronDown } from 'lucide-react';
import LoadingCat from './LoadingCat';

const PersonalSpace = () => {
  const { analystUserMap, analystUserTeamMap, setColumnFilters, columnFilters, sortConfig, handleSort } = useApp();
  const { user } = useAuth();
  const [personalTasks, setPersonalTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'weekly'
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [localMaps, setLocalMaps] = useState({ userMap: {}, teamMap: {} });
  
  // Local Filter States
  const [localFilters, setLocalFilters] = useState({
    team: '',
    user: '',
    project: ''
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        // 1. Ensure we have user mapping data
        let uMap = analystUserMap || {};
        let tMap = analystUserTeamMap || {};
        
        if (Object.keys(uMap).length === 0) {
          const usersList = await fetchUsers();
          uMap = {};
          tMap = {};
          usersList.forEach(u => {
            uMap[u.id] = u.name;
            uMap[u.id?.toLowerCase()] = u.name;
            uMap[u.email?.toLowerCase()] = u.name;
            tMap[u.id] = u.team;
            tMap[u.id?.toLowerCase()] = u.team;
          });
          setLocalMaps({ userMap: uMap, teamMap: tMap });
        }

        // 2. Fetch Tasks
        const rawTasks = await fetchPersonalSpaceData(user);
        const processed = processTaskData(rawTasks, uMap, tMap);
        setPersonalTasks(processed);
      } catch (err) {
        console.error('Failed to load personal space data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, analystUserMap, analystUserTeamMap]);

  // Dynamic Options for Filters
  const filterOptions = useMemo(() => {
    const projects = [...new Set(personalTasks.map(t => t.project))].sort();
    const users = [...new Set(personalTasks.map(t => t.userName))].sort();
    const teams = [...new Set(personalTasks.map(t => t.team))].sort();
    return { projects, users, teams };
  }, [personalTasks]);

  // Apply Filters to Data
  const filteredData = useMemo(() => {
    return personalTasks.filter(t => {
      const matchTeam = !localFilters.team || t.team === localFilters.team;
      const matchUser = !localFilters.user || t.userName === localFilters.user;
      const matchProject = !localFilters.project || t.project === localFilters.project;
      return matchTeam && matchUser && matchProject;
    });
  }, [personalTasks, localFilters]);

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

  const toggleWeek = (key) => {
    setExpandedWeeks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const scopeLabel = useMemo(() => {
    if (user?.isAdmin) return { label: 'Global Intelligence', sub: 'Admin Oversight Mode', color: 'text-rose-500', bg: 'bg-rose-500/10' };
    if (user?.isLeader) return { label: 'Team Intelligence', sub: `${user.team || 'Team'} Leadership Mode`, color: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { label: 'Personal Intelligence', sub: 'Individual Performance Mode', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
  }, [user]);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <LoadingCat message="Syncing Secure Intelligence..." />
      </div>
    );
  }

  return (
    <div className="space-y-[10px] animate-in fade-in duration-700 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-[15px] bg-[var(--bg-card)] p-[20px] rounded-[12px] border border-[var(--border)] shadow-xl">
        <div>
          <h2 className="text-[30px] font-black text-[var(--text-contrast)] uppercase italic tracking-tighter flex items-center gap-[10px]">
            <User size={32} className={scopeLabel.color} />
            <span className={scopeLabel.color}>PERSONAL</span> SPACE
          </h2>
          <div className="flex items-center gap-3 mt-1">
             <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${scopeLabel.bg} ${scopeLabel.color}`}>
                {scopeLabel.label}
             </span>
             <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{scopeLabel.sub}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-[10px]">
          {/* View Toggle */}
          <div className="flex bg-[var(--bg-surface)] p-1 rounded-[8px] border border-[var(--border)]">
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-[10px] font-black uppercase transition-all ${viewMode === 'list' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:text-white'}`}
            >
              <List size={14} /> List
            </button>
            <button 
              onClick={() => setViewMode('weekly')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-[10px] font-black uppercase transition-all ${viewMode === 'weekly' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:text-white'}`}
            >
              <LayoutGrid size={14} /> Weekly
            </button>
          </div>
        </div>
      </div>

      {/* Smart Filters Bar */}
      <div className="grid grid-cols-1 md:flex items-center gap-[10px] bg-[var(--bg-card)] p-[10px] rounded-[12px] border border-[var(--border)]">
        <div className="flex items-center gap-2 px-3 text-[var(--text-muted)]">
          <Filter size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Filters</span>
        </div>

        {user?.isAdmin && (
          <select 
            className="flex-1 min-w-[150px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-3 py-2 text-[11px] font-bold text-[var(--text-main)] outline-none focus:border-indigo-500 transition-colors"
            value={localFilters.team}
            onChange={e => setLocalFilters(prev => ({ ...prev, team: e.target.value }))}
          >
            <option value="">All Teams</option>
            {filterOptions.teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        {(user?.isAdmin || user?.isLeader) && (
          <select 
            className="flex-1 min-w-[150px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-3 py-2 text-[11px] font-bold text-[var(--text-main)] outline-none focus:border-indigo-500 transition-colors"
            value={localFilters.user}
            onChange={e => setLocalFilters(prev => ({ ...prev, user: e.target.value }))}
          >
            <option value="">All Members</option>
            {filterOptions.users.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        )}

        <select 
          className="flex-1 min-w-[150px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-3 py-2 text-[11px] font-bold text-[var(--text-main)] outline-none focus:border-indigo-500 transition-colors"
          value={localFilters.project}
          onChange={e => setLocalFilters(prev => ({ ...prev, project: e.target.value }))}
        >
          <option value="">All Projects</option>
          {filterOptions.projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <button 
          onClick={() => setLocalFilters({ team: '', user: '', project: '' })}
          className="px-4 py-2 text-[10px] font-black uppercase text-rose-500 hover:bg-rose-500/10 rounded-[8px] transition-all"
        >
          Clear
        </button>
      </div>

      {/* Content Area */}
      {viewMode === 'list' ? (
        <div className="ocd-card p-0 overflow-hidden shadow-2xl shadow-black/20">
          <div className="max-h-[700px] overflow-y-auto custom-scrollbar">
            <UnifiedTable 
              data={filteredData}
              columnFilters={columnFilters}
              setColumnFilters={setColumnFilters}
              sortConfig={sortConfig}
              handleSort={handleSort}
              columnOptions={filterOptions}
            />
          </div>
        </div>
      ) : (
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
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PersonalSpace;
