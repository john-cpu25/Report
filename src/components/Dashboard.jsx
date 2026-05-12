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
    <div className="space-y-10 pb-12 w-full">
      {/* Header & Controls - Optimized for Clarity */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-[10px] w-full border-b border-[var(--border)] pb-[10px] mb-[10px]">
        <div className="flex flex-col gap-[10px]">
          <h1 className="text-[30px] font-black text-[var(--text-main)] tracking-tight flex items-center gap-[10px]">
            <div className="p-[10px] bg-indigo-500/10 rounded-[8px] text-indigo-500">
              <LayoutDashboard size={28} />
            </div>
            Command Center
          </h1>
          <p className="text-[14px] text-[var(--text-muted)] font-medium flex items-center gap-[10px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Operational Intelligence System • Real-time Data Stream
          </p>
        </div>

        <div className="flex bg-[var(--bg-surface)] p-[10px] rounded-[8px] border border-[var(--border)] shadow-sm gap-[10px]">
          {['WEEK', 'MONTH', 'YEAR'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-[10px] py-[10px] text-[14px] font-bold uppercase tracking-wider rounded-[8px] transition-all duration-300 ${
                timeRange === range 
                ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-md border border-[var(--border)]' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Stats - Clean SaaS Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[10px] w-full">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-[var(--bg-card)] border border-[var(--border)] p-[10px] rounded-[8px] relative overflow-hidden group hover:border-indigo-500/40 hover:shadow-2xl transition-all duration-500 shadow-sm flex flex-col gap-[10px] m-[10px]"
          >
            <div className="flex items-center justify-between p-[10px]">
              <div className={`p-[10px] ${stat.bg} ${stat.color} rounded-[8px] border border-white/5`}>
                <stat.icon size={22} />
              </div>
              <div className="flex items-center gap-1.5 px-[10px] py-[5px] bg-emerald-500/10 text-emerald-500 rounded-[8px] text-[14px] font-bold">
                <TrendingUp size={12} />
                +12.5%
              </div>
            </div>
            
            <div className="p-[10px]">
              <p className="text-[14px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">{stat.label}</p>
              <div className="flex items-baseline gap-2 mt-[10px]">
                <motion.p 
                  className="text-[30px] font-black text-[var(--text-main)] tracking-tight"
                >
                  {stat.value}
                </motion.p>
                <span className="text-[var(--text-dim)] text-[14px] font-medium italic">this {timeRange.toLowerCase()}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* UNIFIED OPERATIONAL GRID: Team Capacity & Project Pulse */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[10px] w-full">
        
        {/* Left/Center Area: Team Capacity (8 Columns) */}
        <div className="lg:col-span-8 space-y-[10px]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-[10px] m-[10px]">
            <div className="flex items-center gap-[10px]">
              <div className="w-1.5 h-8 bg-emerald-500 rounded-full" />
              <div>
                <h2 className="text-[24px] font-bold text-[var(--text-main)] tracking-tight">Team Pulse</h2>
                <p className="text-[14px] text-[var(--text-muted)] font-medium">Real-time Operative Deployment</p>
              </div>
            </div>

            <div className="flex items-center gap-[10px] bg-[var(--bg-surface)] p-[10px] rounded-[8px] border border-[var(--border)]">
              {teamList.map(team => (
                <button
                  key={team}
                  onClick={() => setSelectedCapacityTeam(team)}
                  className={`px-[10px] py-[10px] text-[14px] font-bold uppercase tracking-wider rounded-[8px] transition-all ${
                    selectedCapacityTeam === team 
                    ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm border border-[var(--border)]' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {team}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
            {filteredCapacity.map((team, idx) => (
              <motion.div
                key={team.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] p-[10px] hover:shadow-xl transition-all duration-300 flex flex-col gap-[10px] shadow-sm group m-[10px]"
              >
                {/* Team Info Header */}
                <div className="flex items-center gap-[10px] p-[10px]">
                  <div className="w-12 h-12 bg-indigo-500/10 flex items-center justify-center text-indigo-500 rounded-[8px] border border-indigo-500/20">
                    <Users size={22} />
                  </div>
                  <div>
                    <h3 className="text-[24px] font-extrabold text-[var(--text-main)] tracking-tight">{team.name}</h3>
                    <p className="text-[14px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">{team.total} Members</p>
                  </div>
                </div>

                {/* Status Badges - Row Layout */}
                <div className="grid grid-cols-2 gap-[10px] p-[10px]">
                  <div 
                    onClick={() => setDetailView({ type: 'busy', team: team.name, users: team.busyMembers })}
                    className="flex flex-col gap-[10px] p-[10px] bg-orange-500/5 border border-orange-500/10 rounded-[8px] cursor-pointer hover:bg-orange-500/10 transition-all"
                  >
                    <span className="text-[14px] font-bold text-orange-500 uppercase tracking-widest">Active</span>
                    <span className="text-[30px] font-black text-[var(--text-main)]">{team.active}</span>
                  </div>

                  <div 
                    onClick={() => setDetailView({ type: 'free', team: team.name, users: team.freeMembers })}
                    className="flex flex-col gap-[10px] p-[10px] bg-emerald-500/5 border border-emerald-500/10 rounded-[8px] cursor-pointer hover:bg-emerald-500/10 transition-all"
                  >
                    <span className="text-[14px] font-bold text-emerald-500 uppercase tracking-widest">Available</span>
                    <span className="text-[30px] font-black text-[var(--text-main)]">{team.free}</span>
                  </div>
                </div>

                {/* Utilization Progress */}
                <div className="space-y-[10px] p-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Current Load</span>
                    <span className="text-[14px] font-black text-[var(--text-main)] bg-[var(--bg-surface)] px-[10px] py-[5px] rounded-[4px]">
                      {Math.round((team.active / team.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(team.active / team.total) * 100}%` }}
                      className="h-full bg-indigo-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Project Tags - Clean View */}
                <div className="p-[10px] pt-0">
                  <p className="text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-[10px]">Top Active Projects</p>
                  <div className="flex flex-wrap gap-[10px]">
                    {Object.entries(team.projectBreakdown).slice(0, 4).map(([proj, data]) => (
                      <div key={proj} className="px-[10px] py-[10px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] text-[14px] font-bold text-[var(--text-main)] flex items-center gap-[10px] hover:border-indigo-500/30 transition-all">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        {proj}
                        <span className="opacity-40 ml-1">({data.total})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Area: Project Distribution Chart (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col gap-[10px]">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] p-[10px] flex flex-col h-full shadow-sm m-[10px]">
            <div className="flex items-center gap-[10px] mb-[10px] p-[10px]">
              <div className="w-1.5 h-8 bg-indigo-500 rounded-full" />
              <div>
                <h2 className="text-[24px] font-bold text-[var(--text-main)] tracking-tight">Activity</h2>
                <p className="text-[14px] text-[var(--text-muted)] font-medium">Task Volume Distribution</p>
              </div>
            </div>
            
            <div className="flex-grow flex items-center justify-center min-h-[350px] p-[10px]">
              {tasks.length > 0 ? (
                <Bar data={chartData} options={{
                  ...barOptions, 
                  maintainAspectRatio: false,
                  scales: {
                    ...barOptions.scales,
                    y: { ...barOptions.scales.y, grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false } }
                  }
                }} />
              ) : (
                <div className="flex flex-col items-center gap-[10px] text-[var(--text-muted)] opacity-50">
                  <Activity size={48} strokeWidth={1} />
                  <p className="text-[14px] font-medium italic">No active data streams.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Heatmap & Process Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[10px] w-full">
        {/* Mock Activity Heatmap */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] p-[10px] shadow-sm m-[10px]">
          <div className="flex items-center gap-[10px] mb-[10px] p-[10px]">
            <div className="w-1.5 h-8 bg-yellow-400 rounded-full" />
            <div>
              <h2 className="text-[24px] font-bold text-[var(--text-main)] tracking-tight">System Pulse</h2>
              <p className="text-[14px] text-[var(--text-muted)] font-medium">Activity Density over 30 Days</p>
            </div>
          </div>
          
          <div className="grid grid-cols-10 sm:grid-cols-12 gap-2 p-[10px]">
            {Array.from({ length: 60 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.005 }}
                className={`aspect-square rounded-[4px] border border-white/5 ${
                  Math.random() > 0.8 ? 'bg-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.2)]' :
                  Math.random() > 0.5 ? 'bg-indigo-500/30' :
                  Math.random() > 0.2 ? 'bg-indigo-500/10' :
                  'bg-[var(--bg-surface)]'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-[10px] p-[10px] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">
            <span>Low Intensity</span>
            <span>Peak Activity</span>
          </div>
        </div>

        {/* Process Flow */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] p-[10px] flex flex-col shadow-sm m-[10px]">
          <div className="flex items-center gap-[10px] mb-[10px] p-[10px]">
            <div className="w-1.5 h-8 bg-rose-500 rounded-full" />
            <div>
              <h2 className="text-[24px] font-bold text-[var(--text-main)] tracking-tight">Automation Engine</h2>
              <p className="text-[14px] text-[var(--text-muted)] font-medium">Live Intelligence Flow</p>
            </div>
          </div>

          <div className="flex-grow flex items-center justify-center min-h-[300px] bg-[var(--bg-surface)]/30 rounded-[8px] border border-[var(--border)] m-[10px]">
            <WorkflowAnimation />
          </div>

          <button className="mt-[10px] w-full py-[10px] bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white rounded-[8px] text-[14px] font-bold uppercase tracking-widest transition-all duration-300 border border-indigo-500/20">
            Configure Automation Engine
          </button>
        </div>
      </div>

      {/* Detail Modal - High Clarity UX */}
      <AnimatePresence>
        {detailView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailView(null)}
              className="absolute inset-0 bg-[#0B0F1A]/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] p-[10px] shadow-2xl overflow-hidden m-[10px]"
            >
              <div className="flex items-center justify-between mb-[10px] p-[10px]">
                <div>
                  <h2 className="text-[30px] font-extrabold text-[var(--text-main)] tracking-tight">
                    {detailView.type === 'free' ? 'Available Ops' : 'Busy Ops'}
                  </h2>
                  <p className="text-[14px] text-[var(--text-muted)] font-medium mt-[5px]">{detailView.team} Sector Analysis</p>
                </div>
                <button 
                  onClick={() => setDetailView(null)}
                  className="w-10 h-10 flex items-center justify-center bg-[var(--bg-surface)] hover:bg-rose-500/10 hover:text-rose-500 rounded-[8px] text-[var(--text-muted)] transition-all duration-300"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-[5px] p-[10px]">
                <div className="grid grid-cols-1 gap-[10px]">
                  {detailView.users.map((userName, i) => {
                    const teamData = filteredCapacity.find(t => t.name === detailView.team);
                    const member = teamData?.members.find(m => m.name === userName);
                    
                    return (
                      <div key={i} className="flex items-center justify-between p-[10px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] group hover:border-indigo-500/30 transition-all">
                        <div className="flex items-center gap-[10px]">
                          <div className={`w-3 h-3 rounded-full ${
                            member?.isActive ? 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.4)] animate-pulse' : 'bg-emerald-500'
                          }`} />
                          <div>
                            <p className="text-[14px] font-bold text-[var(--text-main)]">{userName}</p>
                            <p className="text-[14px] text-[var(--text-muted)] font-medium">
                              {member?.taskCount || 0} active tasks assigned
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-[10px] py-[5px] rounded-[8px] text-[10px] font-bold uppercase tracking-widest ${
                            member?.isActive ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            {member?.isActive ? 'Deployment' : 'On Standby'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button 
                onClick={() => setDetailView(null)}
                className="mt-[10px] w-full py-[10px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-[8px] text-[14px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
              >
                Return to Command Center
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
