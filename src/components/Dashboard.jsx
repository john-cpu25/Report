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
  Clock,
  FolderKanban
} from 'lucide-react';
import WorkflowAnimation from '../WorkflowAnimation';
import { supabase } from '../supabaseClient';
import { processDate } from '../utils/csvHelpers';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend 
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement,
  ArcElement,
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
    
    return {
      activeProjects: totalProjects,
      intelligenceTasks: weeklyTasks,
      activeAgents: activeMembers,
      systemPulse: `${performance}%`
    };
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

  // Daily Operational Metrics (Updated per User Request)
  const dailyMetrics = useMemo(() => {
    const now = new Date();
    const todayY = now.getFullYear();
    const todayM = now.getMonth();
    const todayD = now.getDate();

    const tasksToday = tasks.filter(t => {
      const d = processDate(t.created_at || t.date_start);
      return d && d.getFullYear() === todayY && d.getMonth() === todayM && d.getDate() === todayD;
    });

    const completedToday = tasks.filter(t => {
      const d = processDate(t.date_complete || t.date_checked);
      return d && d.getFullYear() === todayY && d.getMonth() === todayM && d.getDate() === todayD;
    });

    const issues = tasksToday.filter(t => t.status === 'ISSUE').length;
    const wip = tasksToday.filter(t => t.status === 'WIP' || !t.status).length;
    const others = tasksToday.length - issues - wip;
    
    const efficiency = tasksToday.length > 0 ? Math.round((completedToday.length / tasksToday.length) * 100) : 0;

    return {
      total: tasksToday.length,
      completed: completedToday.length,
      issues,
      wip,
      others,
      efficiency,
      list: [
        { label: 'Total Tasks', value: tasksToday.length, trend: `+${tasksToday.length}`, sub: 'Today\'s Throughput', color: 'bg-indigo-500' },
        { label: 'Completed', value: completedToday.length, trend: 'Daily Goal', sub: 'Verified & Logged', color: 'bg-emerald-500' },
        { label: 'Active WIP', value: wip, trend: 'In Progress', sub: 'Live Operational Flow', color: 'bg-amber-500' },
        { label: 'Critical Issues', value: issues, trend: 'High Priority', sub: 'Needs Immediate Action', color: 'bg-rose-500', negative: issues > 0 },
        { label: 'Team Efficiency', value: `${efficiency}%`, trend: 'Performance', sub: 'Completion vs Intake', color: 'bg-violet-500' },
      ]
    };
  }, [tasks]);

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

      {/* Top Grid - 3 Column Layout (Reference Image) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[10px] w-full p-[10px]">
        
        {/* Column 1: Vertical Stats Rail */}
        <div className="lg:col-span-3 flex flex-col gap-[10px]">
          {[
            { label: 'Active Projects', value: stats.activeProjects, icon: <FolderKanban size={18} />, trend: '+12.5%', color: 'indigo' },
            { label: 'Intelligence Tasks', value: stats.intelligenceTasks, icon: <Zap size={18} />, trend: '+12.5%', color: 'yellow' },
            { label: 'Active Agents', value: stats.activeAgents, icon: <Users size={18} />, trend: '+12.5%', color: 'emerald' },
            { label: 'System Pulse', value: stats.systemPulse, icon: <Activity size={18} />, trend: '+12.5%', color: 'rose' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] p-[12px] flex flex-col justify-between shadow-sm relative overflow-hidden h-[110px] group hover:border-indigo-500/30 transition-all"
            >
               <div className="flex justify-between items-start">
                  <div className={`p-1.5 rounded-[6px] bg-indigo-500/10 text-indigo-500`}>
                    {item.icon}
                  </div>
                  <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {item.trend}
                  </span>
               </div>
               <div className="mt-1">
                 <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{item.label}</p>
                 <div className="flex items-baseline gap-2">
                   <h3 className="text-[24px] font-black text-[var(--text-main)] tracking-tighter leading-tight">{item.value}</h3>
                   <span className="text-[10px] text-[var(--text-muted)] italic font-medium">this month</span>
                 </div>
               </div>
            </motion.div>
          ))}
        </div>
        {/* Column 2: Team Pulse (Middle) */}
        <div className="lg:col-span-5 flex flex-col gap-[10px]">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] p-[10px] shadow-sm flex-grow">
            <div className="flex items-center justify-between mb-[10px] p-[10px]">
              <div className="flex items-center gap-[10px]">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                <div>
                  <h2 className="text-[16px] font-black text-[var(--text-main)] uppercase tracking-tight">Team Pulse</h2>
                  <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Real-time Deployment</p>
                </div>
              </div>
              <div className="flex gap-1">
                {teamList.map(t => (
                  <button 
                    key={t}
                    onClick={() => setSelectedCapacityTeam(t)}
                    className={`px-2 py-1 text-[8px] font-black rounded-[4px] transition-all border ${
                      selectedCapacityTeam === t ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-white/5 text-[var(--text-muted)] border-transparent hover:border-white/10'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-[10px] p-[10px]">
              {filteredCapacity.map((team, idx) => (
                <div key={idx} className="bg-[var(--bg-surface)]/50 border border-[var(--border)] rounded-[8px] p-[12px] group hover:border-indigo-500/30 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[6px] bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Users size={16} />
                      </div>
                      <div>
                        <h3 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-tight">{team.name}</h3>
                        <p className="text-[10px] font-bold text-[var(--text-muted)]">{team.total} MEMBERS</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-[10px] mb-3">
                    <div className="bg-orange-500/5 border border-orange-500/10 rounded-[8px] p-[10px]">
                      <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">Active</p>
                      <p className="text-2xl font-black text-[var(--text-main)]">{team.active}</p>
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[8px] p-[10px]">
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Available</p>
                      <p className="text-2xl font-black text-[var(--text-main)]">{team.free}</p>
                    </div>
                  </div>

                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="text-indigo-400">Current Load</span>
                      <span className="text-[var(--text-main)]">{Math.round((team.active / team.total) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(team.active / team.total) * 100}%` }}
                        className="h-full bg-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Top Active Projects Section (from Image) */}
                  <div className="pt-2 border-t border-[var(--border)]">
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Top Active Projects</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {Object.entries(team.projectBreakdown || {}).slice(0, 4).map(([proj, data]) => (
                        <div key={proj} className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span className="text-[10px] font-bold text-[var(--text-main)] uppercase">{proj}</span>
                          <span className="text-[10px] font-bold text-[var(--text-muted)]">({data.total})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Activity Chart (Right) */}
        <div className="lg:col-span-4 flex flex-col gap-[10px]">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] p-[10px] flex flex-col h-full shadow-sm">
            <div className="flex items-center gap-[10px] mb-[10px] p-[10px]">
              <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
              <div>
                <h2 className="text-[16px] font-black text-[var(--text-main)] uppercase tracking-tight">Activity</h2>
                <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Distribution</p>
              </div>
            </div>
            
            <div className="flex-grow flex items-center justify-center min-h-[350px] p-[10px]">
              {tasks.length > 0 ? (
                <Bar 
                  data={chartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { size: 10, weight: 'bold' },
                        bodyFont: { size: 12, weight: 'black' },
                        padding: 10,
                        cornerRadius: 8,
                        displayColors: false
                      }
                    },
                    scales: {
                      x: { 
                        grid: { display: false },
                        ticks: { color: '#64748b', font: { size: 8, weight: 'bold' }, maxRotation: 45, minRotation: 45 }
                      },
                      y: { 
                        grid: { color: 'rgba(255,255,255,0.03)' },
                        ticks: { color: '#64748b', font: { size: 8, weight: 'bold' } }
                      }
                    }
                  }} 
                />
              ) : (
                <div className="flex flex-col items-center gap-[10px] text-[var(--text-muted)] opacity-50">
                  <Activity size={48} strokeWidth={1} />
                  <p className="text-[12px] font-medium italic">No active data streams.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Analytics Engine - High Density Overview (Updated per Image 3) */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] p-[10px] shadow-sm m-[10px]">
        {/* Top Filter Bar */}
        <div className="flex flex-wrap items-center gap-[10px] mb-[20px] p-[10px] bg-[var(--bg-surface)]/30 rounded-[8px] border border-[var(--border)]">
          <select className="bg-indigo-600 text-white rounded-full px-4 py-2 text-[12px] font-bold outline-none cursor-pointer hover:bg-indigo-500 transition-all appearance-none pr-8 relative">
            <option>Data analysis</option>
          </select>
          <select className="bg-indigo-600 text-white rounded-full px-4 py-2 text-[12px] font-bold outline-none cursor-pointer hover:bg-indigo-500 transition-all">
            <option>2026</option>
          </select>
          <select className="bg-indigo-600 text-white rounded-full px-4 py-2 text-[12px] font-bold outline-none cursor-pointer hover:bg-indigo-500 transition-all">
            <option>Monthly</option>
          </select>
          <select className="bg-indigo-600 text-white rounded-full px-4 py-2 text-[12px] font-bold outline-none cursor-pointer hover:bg-indigo-500 transition-all">
            <option>Day</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[20px] p-[10px]">
          {/* Left: Donut Chart */}
          <div className="lg:col-span-3 flex flex-col items-center justify-center border-r border-[var(--border)] pr-[10px]">
            <div className="relative w-full h-[200px]">
              <Doughnut 
                data={{
                  labels: ['Completed', 'WIP', 'Issues', 'Others'],
                  datasets: [{
                    data: [dailyMetrics.completed, dailyMetrics.wip, dailyMetrics.issues, dailyMetrics.others],
                    backgroundColor: ['#10b981', '#6366f1', '#f43f5e', '#94a3b8'],
                    borderWidth: 0,
                    hoverOffset: 10
                  }]
                }}
                options={{
                  cutout: '75%',
                  plugins: { legend: { display: false } },
                  maintainAspectRatio: false
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[24px] font-black text-[var(--text-main)]">{dailyMetrics.efficiency}%</span>
                <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Efficiency</span>
              </div>
            </div>
            <div className="mt-[10px] grid grid-cols-2 gap-[10px] w-full">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-indigo-500" />
                 <span className="text-[10px] font-bold text-[var(--text-muted)]">WIP: {dailyMetrics.wip}</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500" />
                 <span className="text-[10px] font-bold text-[var(--text-muted)]">DONE: {dailyMetrics.completed}</span>
               </div>
            </div>
          </div>

          {/* Middle: Activity List */}
          <div className="lg:col-span-5 flex flex-col gap-[10px] border-r border-[var(--border)] pr-[10px]">
            {dailyMetrics.list.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-[10px] hover:bg-white/5 rounded-[8px] transition-all group">
                <div className="flex items-center gap-[10px]">
                  <div className={`w-3 h-3 rounded-full ${item.color} shadow-lg`} />
                  <div>
                    <p className="text-[14px] font-bold text-[var(--text-main)]">{item.label}</p>
                    <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">{item.sub}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-black text-[var(--text-main)]">{item.value}</p>
                  <p className={`text-[10px] font-bold ${item.negative ? 'text-rose-500' : 'text-emerald-500'}`}>{item.trend}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Calendar View */}
          <div className="lg:col-span-4 pl-[10px]">
            <div className="bg-[var(--bg-surface)]/50 rounded-[8px] p-[10px] border border-[var(--border)] h-full">
              <div className="flex items-center justify-between mb-[10px]">
                <button className="p-1 hover:text-indigo-400"><Calendar size={14} /></button>
                <h4 className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">AUGUST 2026</h4>
                <button className="p-1 hover:text-indigo-400"><Activity size={14} /></button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].map(d => (
                  <div key={d} className="text-[9px] font-black text-indigo-400/60 pb-1">{d}</div>
                ))}
                {Array.from({ length: 31 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`aspect-square flex items-center justify-center text-[10px] font-bold rounded-[4px] transition-all cursor-pointer ${
                      i + 1 === 12 ? 'bg-indigo-500 text-white shadow-lg' : 
                      Math.random() > 0.7 ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-500 hover:bg-white/5'
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>
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
