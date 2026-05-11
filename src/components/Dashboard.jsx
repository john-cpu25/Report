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
    // Project activity distribution
    const counts = {};
    tasks.forEach(t => {
      counts[t.project] = (counts[t.project] || 0) + 1;
    });

    const topProjects = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7);

    return {
      labels: topProjects.map(p => p[0]),
      datasets: [
        {
          label: 'Task Volume',
          data: topProjects.map(p => p[1]),
          backgroundColor: 'rgba(99, 102, 241, 0.5)',
          borderColor: '#6366f1',
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: 'rgba(99, 102, 241, 0.8)',
        }
      ]
    };
  }, [tasks]);

  const leaderboard = useMemo(() => {
    const userCounts = {};
    tasks.forEach(t => {
      if (t.user) {
        userCounts[t.user] = (userCounts[t.user] || 0) + 1;
      }
    });

    return Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [tasks]);

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
          busyMembers: [], freeMembers: []
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

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 10, weight: 'bold' },
        bodyFont: { size: 10 },
        padding: 12,
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
      }
    },
    scales: {
      y: { 
        beginAtZero: true,
        grid: { color: 'var(--border)' }, 
        ticks: { color: 'var(--text-muted)', font: { size: 9, weight: 'bold' } } 
      },
      x: { 
        grid: { display: false }, 
        ticks: { color: 'var(--text-muted)', font: { size: 9, weight: 'bold' } } 
      }
    }
  };

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

        <div className="flex bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--glass-border)] backdrop-blur-xl">
          {['WEEK', 'MONTH', 'YEAR'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
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
            className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--glass-border)] p-6 rounded-[2rem] relative overflow-hidden group hover:border-indigo-500/30 transition-all shadow-lg"
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
              <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl border border-[var(--glass-border)] shadow-inner`}>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 w-full">
        {/* Project Pulse Chart */}
        <div className="xl:col-span-2 bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[2.5rem] p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
              <div>
                <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight">Project Activity Distribution</h2>
                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Task Volume per Core Project</p>
              </div>
            </div>
            <div className="p-3 bg-[var(--bg-surface)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer transition-colors">
              <ArrowUpRight size={20} />
            </div>
          </div>
          
          <div className="h-[400px] w-full flex items-center justify-center">
            {tasks.length > 0 ? (
              <Bar data={chartData} options={barOptions} />
            ) : (
              <p className="text-[var(--text-muted)] font-bold italic">No data available for this range.</p>
            )}
          </div>
        </div>

        {/* Team Leaderboard */}
        <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[2.5rem] p-8 flex flex-col">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
            <div>
              <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight">Elite Agents</h2>
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Top Performers by Task Volume</p>
            </div>
          </div>

          <div className="space-y-4 flex-grow">
            {leaderboard.length > 0 ? leaderboard.map((user, idx) => (
              <motion.div 
                key={user.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center justify-between p-4 bg-white/5 border border-[var(--glass-border)] rounded-2xl group hover:bg-indigo-500/10 hover:border-indigo-500/20 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                    idx === 0 ? 'bg-yellow-400/20 text-yellow-400' :
                    idx === 1 ? 'bg-[var(--bg-header)] text-[var(--text-contrast)]' :
                    idx === 2 ? 'bg-orange-400/20 text-orange-400' :
                    'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                  }`}>
                    {idx === 0 ? <Award size={18} /> : idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-black text-[var(--text-main)] uppercase">{user.name}</p>
                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Active Operative</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-[var(--text-main)]">{user.count}</p>
                  <p className="text-[9px] font-bold text-emerald-400 uppercase">Tasks</p>
                </div>
              </motion.div>
            )) : (
              <p className="text-[var(--text-muted)] font-bold italic text-center py-10">No active agents found.</p>
            )}
          </div>

          <button className="mt-8 w-full py-4 bg-[var(--bg-surface)] hover:bg-indigo-500/10 rounded-2xl text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest transition-all border border-[var(--glass-border)]">
            View Full Analysis
          </button>
        </div>
      </div>

      {/* Activity Heatmap & Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        {/* Mock Activity Heatmap */}
        <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[2.5rem] p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1.5 h-6 bg-yellow-400 rounded-full" />
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
                className={`aspect-square rounded-md border border-[var(--glass-border)] ${
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

        {/* Live Feed Ticker */}
        <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[2.5rem] p-8 overflow-hidden relative">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
            <div>
              <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight">Direct Intelligence Stream</h2>
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Live System Updates</p>
            </div>
          </div>

          <div className="space-y-4">
            {tasks.slice(0, 4).map((task, idx) => (
              <div key={task.id} className="flex gap-4 items-start pb-4 border-b border-[var(--glass-border)] last:border-0">
                <div className="p-2 bg-[var(--bg-surface)] rounded-lg text-[var(--text-muted)]">
                  <Clock size={14} />
                </div>
                <div>
                  <p className="text-[11px] text-[var(--text-main)] font-bold leading-tight">
                    <span className="text-indigo-400 font-black">@{task.user}</span> committed new task to <span className="text-yellow-400 font-black">#{task.project}</span>
                  </p>
                  <p className="text-[9px] text-[var(--text-muted)] font-black uppercase mt-1">2 MINUTES AGO</p>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-[var(--bg-dark)] to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Team Capacity Section */}
      <div className="w-full space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
            <div>
              <h2 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tight">Team Capacity & Pulse</h2>
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Real-time Operative Deployment</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--glass-border)]">
            <span className="text-[9px] font-black text-[var(--text-muted)] uppercase px-2">Filter:</span>
            {teamList.map(team => (
              <button
                key={team}
                onClick={() => setSelectedCapacityTeam(team)}
                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${
                  selectedCapacityTeam === team 
                  ? 'bg-indigo-500 text-white' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {team}
              </button>
            ))}
          </div>
        </div>

        {/* Global/Filtered Capacity Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
              {selectedCapacityTeam === 'ALL' ? 'Total Operatives' : 'Team Members'}
            </p>
            <p className="text-2xl font-black text-white mt-1">{filteredCapacity.reduce((acc, t) => acc + t.total, 0)}</p>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Daily Capacity</p>
            <p className="text-2xl font-black text-white mt-1">{filteredCapacity.reduce((acc, t) => acc + t.total, 0) * 8}h</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Availability</p>
            <p className="text-2xl font-black text-white mt-1">{filteredCapacity.reduce((acc, t) => acc + t.free, 0)}</p>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl">
            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Active Deployments</p>
            <p className="text-2xl font-black text-white mt-1">{filteredCapacity.reduce((acc, t) => acc + t.active, 0)}</p>
          </div>
        </div>

        {/* Live Operative Roster Table */}
        <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[2.5rem] overflow-hidden">
          <div className="p-8 border-b border-[var(--glass-border)]">
            <h3 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight">Live Operative Roster</h3>
            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Status: <span className="text-orange-500">Orange (Any Task Status &gt; 3)</span> | <span className="text-emerald-500">Green (Normal)</span></p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-8 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-r border-[var(--glass-border)] w-48">Team</th>
                  <th className="px-8 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Name</th>
                  <th className="px-8 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCapacity.map((team) => (
                  <React.Fragment key={team.name}>
                    {team.members.map((member, mIdx) => (
                      <tr key={`${team.name}-${member.name}`} className="border-b border-[var(--glass-border)] hover:bg-white/[0.02] transition-colors">
                        {mIdx === 0 && (
                          <td 
                            rowSpan={team.members.length} 
                            className="px-8 py-6 align-top border-r border-[var(--glass-border)]"
                          >
                            <p className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight">{team.name}</p>
                            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mt-1">[{team.total}] Members</p>
                          </td>
                        )}
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${
                              member.isActive 
                                ? 'bg-orange-500 shadow-orange-500/40 animate-pulse' 
                                : 'bg-emerald-500 shadow-emerald-500/40'
                            }`} />
                            <span className="text-sm font-bold text-[var(--text-main)]">{member.name}</span>
                            {member.taskCount > 0 && (
                              <span className="text-[10px] font-black bg-white/5 px-2 py-0.5 rounded-md text-[var(--text-muted)] border border-white/5">
                                {member.taskCount} Tasks
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${member.isActive ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            {member.isActive ? `BUSY: ${member.projectName}` : 'FREE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredCapacity.map((team, idx) => (
            <motion.div
              key={team.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--glass-border)] rounded-3xl p-6 hover:border-indigo-500/30 transition-all group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Team Info */}
                <div className="flex items-center gap-4 min-w-[200px]">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[var(--text-main)] uppercase">{team.name}</h3>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{team.total} Members Total</p>
                  </div>
                </div>

                {/* Projects Stats */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Total & Hours Info */}
                  <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-indigo-400 uppercase">Daily Capacity</span>
                      <span className="text-xs font-black text-white bg-indigo-500 px-2 py-0.5 rounded-lg">{team.total * 8}h</span>
                    </div>
                    <p className="text-[9px] font-bold text-indigo-400/70 uppercase mt-1">{team.total} Members × 8h</p>
                  </div>

                  {Object.entries(team.projects).map(([proj, users]) => (
                    <div 
                      key={proj}
                      onClick={() => setDetailView({ type: 'project', team: team.name, projectName: proj, users })}
                      className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-2xl cursor-pointer hover:bg-rose-500/10 transition-all"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-rose-500 uppercase truncate max-w-[100px]">{proj}</span>
                        <span className="text-xs font-black text-white bg-rose-500 px-2 py-0.5 rounded-lg">{users.length}</span>
                      </div>
                      <p className="text-[9px] font-bold text-rose-500/70 uppercase mt-1">Active</p>
                    </div>
                  ))}

                  
                  {/* BUSY Status */}
                  <div 
                    onClick={() => setDetailView({ type: 'busy', team: team.name, users: team.busyMembers })}
                    className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-2xl cursor-pointer hover:bg-orange-500/10 transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-orange-500 uppercase">ACTIVE / BUSY</span>
                      <span className="text-xs font-black text-white bg-orange-500 px-2 py-0.5 rounded-lg">{team.active}</span>
                    </div>
                    <p className="text-[9px] font-bold text-orange-500/70 uppercase mt-1">High Workload</p>
                  </div>

                  {/* FREE Status */}
                  <div 
                    onClick={() => setDetailView({ type: 'free', team: team.name, users: team.freeMembers })}
                    className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl cursor-pointer hover:bg-emerald-500/10 transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-emerald-400 uppercase">Available / FREE</span>
                      <span className="text-xs font-black text-white bg-emerald-500 px-2 py-0.5 rounded-lg">{team.free}</span>
                    </div>
                    <p className="text-[9px] font-bold text-emerald-500/70 uppercase mt-1">System Capacity</p>
                  </div>
                </div>

                {/* Capacity Meter */}
                <div className="lg:w-48 space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black text-[var(--text-muted)] uppercase">Utilization</span>
                    <span className="text-sm font-black text-[var(--text-main)]">{Math.round((team.active / team.total) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(team.active / team.total) * 100}%` }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
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
              className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
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
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[var(--text-muted)] transition-all"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {detailView.users.map((user, i) => (
                  <motion.div 
                    key={user}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 p-4 bg-white/5 border border-[var(--glass-border)] rounded-2xl"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                      detailView.type === 'free' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {user.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-black text-[var(--text-main)] uppercase">{user}</p>
                      <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        {detailView.type === 'free' ? 'Status: READY' : 'Status: ACTIVE'}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <button 
                onClick={() => setDetailView(null)}
                className="mt-8 w-full py-4 bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-all"
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
