import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Zap, 
  Target, 
  Users, 
  TrendingUp, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  Layers,
  Award,
  Clock
} from 'lucide-react';
import WorkflowAnimation from '../WorkflowAnimation';
import { supabase } from '../supabaseClient';
import { processDate } from '../utils/csvHelpers';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [timeRange, setTimeRange] = useState('MONTH');
  const [selectedCapacityTeam, setSelectedCapacityTeam] = useState('ALL');
  const [detailView, setDetailView] = useState(null); // { type: 'project' | 'free', team: string, projectName?: string }

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, userRes] = await Promise.all([
        supabase.from('NMK_Project').select('*'),
        supabase.from('NMK_User').select('*')
      ]);

      if (projRes.error) throw projRes.error;
      if (userRes.error) throw userRes.error;
      
      const now = new Date();
      let startDate = new Date();
      if (timeRange === 'WEEK') startDate.setDate(now.getDate() - 7);
      else if (timeRange === 'MONTH') startDate.setMonth(now.getMonth() - 1);
      else if (timeRange === 'YEAR') startDate.setFullYear(now.getFullYear() - 1);

      // Fetch tasks - get all tasks that are not complete to ensure accurate capacity
      // We remove the created_at filter to catch long-running tasks
      const { data: taskData, error: taskError } = await supabase
        .from('NMK_Task')
        .select('*')
        .order('created_at', { ascending: false });

      if (taskError) throw taskError;
      
      setProjects(projRes.data || []);
      setUsers(userRes.data || []);
      setTasks(taskData || []);
    } catch (err) {
      console.error('Dashboard Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Analytics Logic
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const weeklyTasks = tasks.length;
    const activeMembers = new Set(tasks.map(t => t.user)).size;
    
    // Performance (mock calculation based on task density)
    const performance = totalProjects > 0 ? (weeklyTasks / totalProjects * 10).toFixed(1) : 0;
    
    return [
      { label: 'Active Projects', value: totalProjects, icon: Layers, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
      { label: 'Intelligence Tasks', value: weeklyTasks, icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
      { label: 'Active Agents', value: activeMembers, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
      { label: 'System Pulse', value: `${performance}%`, icon: Activity, color: 'text-rose-400', bg: 'bg-rose-400/10' },
    ];
  }, [projects, tasks]);

  const chartData = useMemo(() => {
    const now = new Date();
    const todayY = now.getFullYear();
    const todayM = now.getMonth();
    const todayD = now.getDate();

    const counts = {};
    tasks.forEach(t => {
      // Filter for tasks of the day
      const dateVal = t.created_at || t.date_start;
      const taskDate = processDate(dateVal);
      if (!taskDate) return;

      const isToday = taskDate.getFullYear() === todayY && 
                      taskDate.getMonth() === todayM && 
                      taskDate.getDate() === todayD;
      
      if (!isToday) return;

      // Extract project name from task name (e.g., "Project A: Task 1")
      const rawName = t.name || t.NAME || t.task || '';
      const projectName = rawName.split(':')[0]?.trim();
      
      if (projectName) {
        counts[projectName] = (counts[projectName] || 0) + 1;
      }
    });

    const topProjects = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7);

    return {
      labels: topProjects.map(p => p[0]),
      datasets: [
        {
          label: 'Tasks Today',
          data: topProjects.map(p => p[1]),
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderColor: '#818cf8',
          borderWidth: 2,
          borderRadius: 0,
          hoverBackgroundColor: '#6366f1',
          barThickness: 40,
        }
      ]
    };
  }, [tasks]);

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e1b4b',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 11 },
        padding: 12,
        cornerRadius: 0,
        displayColors: false,
      }
    },
    scales: {
      y: { 
        beginAtZero: true,
        title: { display: true, text: 'NUMBER OF TASKS', color: '#6366f1', font: { size: 9, weight: '900' } },
        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, 
        ticks: { color: '#94a3b8', font: { size: 10, weight: 'bold' } } 
      },
      x: { 
        title: { display: true, text: 'CORE PROJECTS', color: '#6366f1', font: { size: 9, weight: '900' } },
        grid: { display: false }, 
        ticks: { color: '#94a3b8', font: { size: 10, weight: 'bold' }, maxRotation: 45, minRotation: 45 } 
      }
    }
  };

  const capacityStats = useMemo(() => {
    if (!users.length) return [];

    const slugify = (str) => (str || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    const now = new Date();
    const todayY = now.getFullYear();
    const todayM = now.getMonth();
    const todayD = now.getDate();

    const userActiveTasks = {};
    const userIsBusyMap = {}; // userId -> boolean (has status > 3)
    const userProjectsMap = {}; // userId -> Set of projects
    
    tasks.forEach(t => {
      // Filter for tasks of the day using standard processDate
      const dateVal = t.created_at || t.date_start;
      const taskDate = processDate(dateVal);
      if (!taskDate) return;

      const isToday = taskDate.getFullYear() === todayY && 
                      taskDate.getMonth() === todayM && 
                      taskDate.getDate() === todayD;
      
      if (!isToday) return;

      const rawUserId = t.user_id || t.USER_ID || t.user || t.USER || '';
      const userIdSlug = slugify(rawUserId);
      if (!userIdSlug) return;

      // Check if this specific task has status > 3
      const taskStatus = parseInt(t.status || t.STATUS || 0);
      if (taskStatus > 3) {
        userIsBusyMap[userIdSlug] = true;
      }

      // Count tasks that are not complete
      const isComplete = (t.date_complete && t.date_complete.toString().trim() !== '') || 
                         (t.date_checked && t.date_checked.toString().trim() !== '');
      const isActiveTask = !isComplete;
      
      if (isActiveTask) {
        userActiveTasks[userIdSlug] = (userActiveTasks[userIdSlug] || 0) + 1;
        
        const rawName = t.name || t.NAME || t.task || '';
        const projectName = rawName.split(':')[0]?.trim() || 'General';
        if (!userProjectsMap[userIdSlug]) userProjectsMap[userIdSlug] = new Set();
        userProjectsMap[userIdSlug].add(projectName);
      }
    });

    const teamData = {};
    users.forEach(u => {
      const team = (u.team || 'Unassigned').toUpperCase();
      
      const isPtReo = team.includes('PT') && (team.includes('REO') || team.includes('&'));
      const isModeling = team.includes('MODELING') || team.includes('MODELLING') || team.includes('STR');
      if (!isPtReo && !isModeling) return;
      
      const normalizedTeam = isPtReo ? 'PT & REO TEAM' : 'STR MODELING TEAM';

      if (!teamData[normalizedTeam]) {
        teamData[normalizedTeam] = {
          name: normalizedTeam, total: 0, active: 0, free: 0, projects: {}, members: [],
          busyMembers: [], freeMembers: [],
          projectBreakdown: {} // { projectName: { total: 0, statuses: { [status]: count } } }
        };
      }
      
      const teamObj = teamData[normalizedTeam];
      teamObj.total++;
      
      const uIdSlug = slugify(u.id);
      const uNameSlug = slugify(u.name);
      const uEmailSlug = slugify(u.email);
      
      // A user is BUSY if they have ANY task with status > 3
      const isBusy = userIsBusyMap[uIdSlug] || userIsBusyMap[uNameSlug] || userIsBusyMap[uEmailSlug] || false;
      
      const activeCount = userActiveTasks[uIdSlug] || userActiveTasks[uNameSlug] || userActiveTasks[uEmailSlug] || 0;
      
      const userProjects = userProjectsMap[uIdSlug] || userProjectsMap[uNameSlug] || userProjectsMap[uEmailSlug] || new Set();

      const memberName = u.name || u.email;
      const memberInfo = {
        name: memberName,
        isActive: isBusy,
        taskCount: activeCount,
        projectName: Array.from(userProjects).join(', ') || null
      };

      teamObj.members.push(memberInfo);

      if (isBusy) {
        teamObj.active++;
        teamObj.busyMembers.push(memberName);
        userProjects.forEach(proj => {
          if (!teamObj.projects[proj]) teamObj.projects[proj] = [];
          teamObj.projects[proj].push(memberName);
        });
      } else {
        teamObj.free++;
        teamObj.freeMembers.push(memberName);
      }
    });

    // Populate projectBreakdown
    tasks.forEach(t => {
      const dateVal = t.created_at || t.date_start;
      const taskDate = processDate(dateVal);
      if (!taskDate) return;
      const isToday = taskDate.getFullYear() === todayY && taskDate.getMonth() === todayM && taskDate.getDate() === todayD;
      if (!isToday) return;

      const rawUserId = t.user_id || t.USER_ID || t.user || t.USER || '';
      const userIdSlug = slugify(rawUserId);
      const user = users.find(u => slugify(u.id) === userIdSlug || slugify(u.name) === userIdSlug || slugify(u.email) === userIdSlug);
      if (!user) return;

      const team = (user.team || 'Unassigned').toUpperCase();
      const isPtReo = team.includes('PT') && (team.includes('REO') || team.includes('&'));
      const isModeling = team.includes('MODELING') || team.includes('MODELLING') || team.includes('STR');
      if (!isPtReo && !isModeling) return;
      const normalizedTeam = isPtReo ? 'PT & REO TEAM' : 'STR MODELING TEAM';
      const teamObj = teamData[normalizedTeam];

      const rawName = t.name || t.NAME || t.task || '';
      const projectName = rawName.split(':')[0]?.trim() || 'General';
      const status = parseInt(t.status || t.STATUS || 0);

      if (!teamObj.projectBreakdown[projectName]) {
        teamObj.projectBreakdown[projectName] = { total: 0, statuses: {} };
      }
      teamObj.projectBreakdown[projectName].total++;
      teamObj.projectBreakdown[projectName].statuses[status] = (teamObj.projectBreakdown[projectName].statuses[status] || 0) + 1;
    });

    // Sort members within each team
    Object.values(teamData).forEach(team => {
      team.members.sort((a, b) => a.name.localeCompare(b.name));
    });

    return Object.values(teamData).sort((a, b) => b.total - a.total);
  }, [users, tasks]);

  const filteredCapacity = useMemo(() => {
    if (selectedCapacityTeam === 'ALL') return capacityStats;
    return capacityStats.filter(t => t.name === selectedCapacityTeam);
  }, [capacityStats, selectedCapacityTeam]);

  const teamList = useMemo(() => {
    return ['ALL', 'PT & REO TEAM', 'STR MODELING TEAM'];
  }, []);

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"
      />
    </div>
  );

  return (
    <div className="space-y-8 pb-12 w-full">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-main)] uppercase tracking-tighter flex items-center gap-3">
            <LayoutDashboard className="text-indigo-500" size={32} />
            Command Center
          </h1>
          <p className="text-[var(--text-muted)] font-bold text-xs uppercase tracking-[0.3em] mt-2">Operational Intelligence System v2.1</p>
        </div>

        <div className="flex bg-[var(--bg-card)] p-1.5 rounded-none border border-[var(--glass-border)] backdrop-blur-xl">
          {['WEEK', 'MONTH', 'YEAR'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-none transition-all ${
                timeRange === range 
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--glass-border)] p-6 rounded-none relative overflow-hidden group hover:border-indigo-500/30 transition-all shadow-lg"
          >
            {/* Pulsing Background Glow */}
            <motion.div 
              animate={{ 
                opacity: [0.05, 0.15, 0.05],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute -top-10 -right-10 w-40 h-40 ${stat.bg} rounded-full blur-3xl pointer-events-none`}
            />

            <div className="flex justify-between items-start relative z-10">
              <div className={`p-4 ${stat.bg} ${stat.color} rounded-none border border-[var(--glass-border)] shadow-inner`}>
                <stat.icon size={24} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-80">{stat.label}</p>
                <motion.p 
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="text-3xl font-black text-[var(--text-main)] mt-1"
                >
                  {stat.value}
                </motion.p>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest relative z-10">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>System Nominal</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* UNIFIED OPERATIONAL GRID: Team Capacity & Project Pulse */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        
        {/* Left/Center Area: Team Capacity (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-none" />
              <div>
                <h2 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tight">Team Capacity & Pulse</h2>
                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Real-time Operative Deployment</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[var(--bg-card)] p-1 rounded-none border border-[var(--glass-border)]">
              <span className="text-[9px] font-black text-[var(--text-muted)] uppercase px-2">Filter:</span>
              {teamList.map(team => (
                <button
                  key={team}
                  onClick={() => setSelectedCapacityTeam(team)}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-none transition-all ${
                    selectedCapacityTeam === team 
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {team}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCapacity.map((team, idx) => (
              <motion.div
                key={team.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--glass-border)] rounded-none p-6 hover:border-indigo-500/30 transition-all group flex flex-col gap-6"
              >
                {/* Team Info Header */}
                <div className="flex items-center gap-4 w-full bg-indigo-500/5 border border-indigo-500/10 p-4">
                  <div className="w-10 h-10 bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[var(--text-main)] uppercase tracking-tight">{team.name}</h3>
                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{team.total} Members Total</p>
                  </div>
                </div>

                {/* Stat Blocks - Vertical Stack */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-indigo-500/5 border border-indigo-500/10">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Daily Capacity</span>
                    <motion.div 
                      animate={{ rotateY: [0, 360] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="perspective-1000"
                    >
                      <span className="text-xs font-black text-white bg-indigo-600 px-2 py-0.5 shadow-[2px_2px_0px_rgba(0,0,0,0.5)] inline-block">
                        {team.total * 8}h
                      </span>
                    </motion.div>
                  </div>

                  <div 
                    onClick={() => setDetailView({ type: 'busy', team: team.name, users: team.busyMembers })}
                    className="flex justify-between items-center p-3 bg-orange-500/5 border border-orange-500/10 cursor-pointer hover:bg-orange-500/10 transition-all"
                  >
                    <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Active / Busy</span>
                    <span className="text-xs font-black text-white bg-orange-700 px-2 py-0.5 shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
                      {team.active}
                    </span>
                  </div>

                  <div 
                    onClick={() => setDetailView({ type: 'free', team: team.name, users: team.freeMembers })}
                    className="flex justify-between items-center p-3 bg-emerald-500/5 border border-emerald-500/10 cursor-pointer hover:bg-emerald-500/10 transition-all"
                  >
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Available / Free</span>
                    <span className="text-xs font-black text-white bg-emerald-700 px-2 py-0.5 shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
                      {team.free}
                    </span>
                  </div>
                </div>

                {/* Utilization */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Utilization</span>
                    <span className="text-sm font-black text-[var(--text-main)]">{Math.round((team.active / team.total) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 border border-white/5 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(team.active / team.total) * 100}%` }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                    />
                  </div>
                </div>

                {/* Active Project Analysis - Below Stats */}
                <div className="pt-4 border-t border-[var(--glass-border)]">
                  <div className="flex items-center gap-3 mb-4 bg-white/5 p-2 border-l-2 border-indigo-500">
                    <span className="text-[9px] font-black text-[var(--text-main)] uppercase tracking-widest">Active Project Analysis:</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 overflow-y-auto custom-scrollbar pr-1" style={{ maxHeight: '250px' }}>
                    {Object.entries(team.projectBreakdown).map(([proj, data]) => (
                      <div key={proj} className="bg-white/5 border border-white/5 p-3 hover:border-indigo-500/20 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-indigo-400 uppercase truncate" title={proj}>{proj}</span>
                          <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[9px] font-black border border-indigo-500/20">{data.total}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { s: 3, label: 'NEW', color: 'bg-indigo-500/10 text-indigo-400' },
                            { s: 6, label: 'START', color: 'bg-blue-500/10 text-blue-400' },
                            { s: 4, label: 'CHECKED', color: 'bg-emerald-500/10 text-emerald-400' },
                          ].map(status => {
                            const count = data.statuses[status.s] || 0;
                            if (count === 0) return null;
                            return (
                              <div key={status.s} className={`px-1.5 py-0.5 ${status.color} text-[7px] font-black uppercase border border-current`}>
                                {status.label} {count}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Area: Project Distribution Chart (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--glass-border)] rounded-none p-6 flex flex-col h-full shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-none" />
                <div>
                  <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight">Project Activity</h2>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Task Volume Distribution</p>
                </div>
              </div>
            </div>
            
            <div className="flex-grow flex items-center justify-center min-h-[300px]">
              {tasks.length > 0 ? (
                <Bar data={chartData} options={{...barOptions, maintainAspectRatio: false}} />
              ) : (
                <p className="text-[var(--text-muted)] font-bold italic">No data available.</p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Activity Heatmap & Process Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        {/* Mock Activity Heatmap */}
        <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--glass-border)] rounded-none p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1.5 h-6 bg-yellow-400 rounded-none" />
            <div>
              <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight">Intelligence Heatmap</h2>
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">System Load over Time</p>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.01 }}
                className={`aspect-square rounded-none border border-[var(--glass-border)] ${
                  Math.random() > 0.8 ? 'bg-indigo-500/60 shadow-[0_0_10px_rgba(99,102,241,0.3)]' :
                  Math.random() > 0.5 ? 'bg-indigo-500/30' :
                  Math.random() > 0.2 ? 'bg-indigo-500/10' :
                  'bg-[var(--bg-surface)]'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">
            <span>Low Intensity</span>
            <span>Critical Load</span>
          </div>
        </div>

        {/* Process Flow (Moved here) */}
        <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--glass-border)] rounded-none p-8 flex flex-col shadow-xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1.5 h-6 bg-rose-500 rounded-none" />
            <div>
              <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight">Process Flow</h2>
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Live System Automation</p>
            </div>
          </div>

          <div className="flex-grow flex items-center justify-center min-h-[300px]">
            <WorkflowAnimation />
          </div>

          <button className="mt-6 w-full py-3 bg-white/5 hover:bg-indigo-500/10 rounded-none text-[9px] font-black text-[var(--text-main)] uppercase tracking-widest transition-all border border-white/5">
            Configure Automation Engine
          </button>
        </div>
      </div>


      {/* Detail Modal */}
      <AnimatePresence>
        {detailView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailView(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-none p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">
                    {detailView.type === 'free' ? 'Available Operatives' : `Project: ${detailView.projectName}`}
                  </h2>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">{detailView.team} Team</p>
                </div>
                <button 
                  onClick={() => setDetailView(null)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-none text-[var(--text-muted)] transition-all"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-4 py-3 text-[10px] font-black text-white/50 uppercase tracking-widest">Member</th>
                      <th className="px-4 py-3 text-[10px] font-black text-white/50 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailView.users.map((userName, i) => {
                      // Find member info from filteredCapacity
                      const teamData = filteredCapacity.find(t => t.name === detailView.team);
                      const member = teamData?.members.find(m => m.name === userName);
                      
                      return (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                member?.isActive ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)] animate-pulse' : 'bg-emerald-500'
                              }`} />
                              <span className="text-sm font-bold text-white">{userName}</span>
                              {member?.taskCount > 0 && (
                                <span className="text-[10px] font-black text-white/30 ml-2">
                                  {member.taskCount} Tasks
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-none ${
                              member?.isActive ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'
                            }`}>
                              {member?.isActive ? 'Busy' : 'Free'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button 
                onClick={() => setDetailView(null)}
                className="mt-8 w-full py-4 bg-indigo-500 text-white rounded-none text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-all"
              >
                Close Intelligence View
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
