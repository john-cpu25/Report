import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Zap, Target, Users, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight,
  Activity, Layers, Award, Clock, FolderKanban, Search, CheckCircle2, AlertCircle,
  BarChart3, PieChart, Eye, EyeOff, ChevronDown
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, Filler,
  PointElement, LineElement, RadialLinearScale
} from 'chart.js';
import { Bar, Doughnut, Line, PolarArea } from 'react-chartjs-2';
import { useApp } from '../context/AppContext';
import {
  format, subDays, startOfDay, endOfDay, eachDayOfInterval,
  startOfWeek, endOfWeek, eachWeekOfInterval,
  startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval
} from 'date-fns';
import { calculateTaskMetrics } from '../utils/performanceEngine';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, Filler, PointElement, LineElement, RadialLinearScale);

const dataLabelsPlugin = {
  id: 'dataLabels',
  afterDatasetsDraw(chart) {
    const { ctx, data } = chart;
    if (!data || !data.datasets) return;
    ctx.save();
    data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      if (!meta || !meta.data) return;
      meta.data.forEach((point, index) => {
        const value = dataset.data[index];
        if (value === 0 || value === undefined || value === null) return;
        
        const { x, y } = point.tooltipPosition();
        const offset = chart.config.type === 'line' ? -15 : 0;
        
        const text = value.toString();
        ctx.font = 'bold 12px sans-serif';
        const textWidth = ctx.measureText(text).width;
        const padding = 6;
        
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        const px = x - (textWidth/2 + padding);
        const py = y + offset - (7 + padding/2);
        const pw = textWidth + padding * 2;
        const ph = 14 + padding;
        
        ctx.beginPath();
        ctx.rect(px, py, pw, ph);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y + offset);
      });
    });
    ctx.restore();
  }
};

const polar3DPlugin = {
  id: 'polar3D',
  beforeDatasetsDraw(chart) {
    if (chart.config.type !== 'polarArea') return;
    const { ctx, data } = chart;
    if (!data || !data.datasets || data.datasets.length === 0) return;
    
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data) return;
    
    ctx.save();
    const depth = 10;
    
    meta.data.forEach((element, i) => {
      if (!element) return;
      const { startAngle, endAngle, outerRadius, innerRadius, x, y } = element;
      const bgColors = data.datasets[0].backgroundColor;
      if (!bgColors) return;
      
      const color = Array.isArray(bgColors) ? bgColors[i] : bgColors;
      if (!color || typeof color !== 'string') return;

      // Draw depth layers
      for (let d = 1; d <= depth; d++) {
        ctx.beginPath();
        ctx.arc(x, y + d, outerRadius, startAngle, endAngle);
        ctx.arc(x, y + d, innerRadius, endAngle, startAngle, true);
        ctx.closePath();
        
        ctx.fillStyle = color;
        ctx.fill();
        
        // Manual darkening overlay instead of ctx.filter
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
      }
      
      // Bottom stroke
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y + depth, outerRadius, startAngle, endAngle);
      ctx.stroke();
    });
    ctx.restore();
  }
};

const TEAMS = [
  { id: 'MODELLING', display: 'STR MODELING' },
  { id: 'PT&REO', display: 'PT & REO' },
  { id: 'ENGINEER', display: 'ENGINEER' },
  { id: 'ETABS', display: 'ETABS' }
];

const TEAM_COLORS = {
  'ALL': '#6366f1',
  'MODELLING': '#3b82f6',
  'PT&REO': '#10b981',
  'ENGINEER': '#f43f5e',
  'ETABS': '#f59e0b'
};

const PALETTE = [
  'rgba(99, 102, 241, 0.8)',   // Indigo
  'rgba(16, 185, 129, 0.8)',   // Emerald
  'rgba(244, 63, 94, 0.8)',    // Rose
  'rgba(245, 158, 11, 0.8)',   // Amber
  'rgba(59, 130, 246, 0.8)',   // Blue
  'rgba(139, 92, 246, 0.8)',   // Violet
  'rgba(236, 72, 153, 0.8)',   // Pink
  'rgba(6, 182, 212, 0.8)',    // Cyan
  'rgba(20, 184, 166, 0.8)',   // Teal
  'rgba(249, 115, 22, 0.8)'    // Orange
];

const Dashboard = () => {
  const {
    dashboardProjects: projects,
    dashboardUsers: users,
    dashboardTasks: tasks,
    dashboardLeave: leaves,
    isDashboardLoading: loading,
    dashboardStats: headerStats
  } = useApp();

  const [chartTeam, setChartTeam] = useState('ALL');
  const [timeRange, setTimeRange] = useState('WEEK'); // DAY, WEEK, MONTH
  const [chartType, setChartType] = useState('LINE'); // LINE, BAR, POLAR

  const [showWorkChart, setShowWorkChart] = useState(true);

  const stats = useMemo(() => {
    return {
      activeProjects: headerStats.activeProjects,
      intelligenceTasks: headerStats.totalTasks,
      activeAgents: new Set(tasks.map(t => t.user_id)).size,
      systemPulse: "188.3%"
    };
  }, [headerStats, tasks]);

  const teamPulse = useMemo(() => {
    const teams = [
      { id: 'MODELLING', display: 'STR MODELING' },
      { id: 'PT&REO', display: 'PT & REO' },
      { id: 'ENGINEER', display: 'ENGINEER' },
      { id: 'ETABS', display: 'ETABS' }
    ];

    const now = new Date();

    return teams.map((t) => {
      const teamUsers = users.filter(u => (u.team || '').toUpperCase() === t.id);
      const userIds = new Set(teamUsers.map(u => u.id));

      const teamTasks = tasks.filter(task => userIds.has(task.user_id));
      const workingUserIds = new Set(teamTasks.filter(task => task.status === 0).map(task => task.user_id));

      const leaveUserIds = new Set();
      leaves.forEach(l => {
        try {
          const leaveList = JSON.parse(l.leave_list || '[]');
          const isOnLeave = leaveList.some(range => {
            const start = new Date(range.LeaveStart);
            const end = new Date(range.LeaveEnd);
            return now >= start && now <= end;
          });
          if (isOnLeave) leaveUserIds.add(l.create_by);
        } catch (e) { }
      });

      const workingList = teamUsers.filter(u => workingUserIds.has(u.id) && !leaveUserIds.has(u.id)).map(u => u.name);
      const leaveListNames = teamUsers.filter(u => leaveUserIds.has(u.id)).map(u => u.name);
      const availableList = teamUsers.filter(u => !workingUserIds.has(u.id) && !leaveUserIds.has(u.id)).map(u => u.name);

      const teamProjectMap = new Map(projects.map(p => [p.id, p.name]));

      const todaysTasks = teamTasks.filter(task => {
        const d = new Date(task.created_at || task.date_start);
        return format(d, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      });

      // Get unique project names that have tasks today
      const dailyTasks = Array.from(new Set(todaysTasks.map(task => 
        teamProjectMap.get(task.project_id) || 'Unknown'
      ))).map(projName => ({
        project: projName,
        isWorking: todaysTasks.some(t => (teamProjectMap.get(t.project_id) || 'Unknown') === projName && t.status === 0)
      }));

      return {
        name: t.display,
        members: teamUsers.length,
        working: workingList,
        available: availableList,
        leave: leaveListNames,
        dailyTasks: dailyTasks.length > 0 ? dailyTasks : null,
        capacity: teamUsers.length > 0 ? Math.round((workingList.length / teamUsers.length) * 100) : 0,
        hasData: teamUsers.length > 0 || teamTasks.length > 0
      };
    });
  }, [users, tasks, projects, leaves]);

  const trendData = useMemo(() => {
    const now = new Date();
    let intervals = [];
    let formatStr = 'MMM dd';
    
    if (timeRange === 'DAY') {
      intervals = eachDayOfInterval({ start: subDays(now, 6), end: now });
      formatStr = 'EEE dd';
    } else if (timeRange === 'WEEK') {
      intervals = eachWeekOfInterval({ start: subDays(now, 50), end: now });
      formatStr = "'W'w MM/dd";
    } else if (timeRange === 'MONTH') {
      intervals = eachMonthOfInterval({ start: subDays(now, 180), end: now });
      formatStr = 'MMM yyyy';
    } else if (timeRange === 'YEAR') {
      intervals = eachMonthOfInterval({ start: startOfMonth(subDays(now, 365)), end: now });
      formatStr = 'MMM yyyy';
    }

    const userTeamMap = new Map(users.map(u => [u.id, (u.team || '').toUpperCase()]));
    const filteredTasks = tasks.filter(t => {
      if (chartTeam !== 'ALL' && userTeamMap.get(t.user_id) !== chartTeam) return false;
      return true;
    });

    const counts = intervals.map(start => {
      let end;
      if (timeRange === 'DAY') end = endOfDay(start);
      else if (timeRange === 'WEEK') end = endOfWeek(start);
      else if (timeRange === 'MONTH' || timeRange === 'YEAR') end = endOfMonth(start);

      const count = filteredTasks.filter(t => {
        const d = new Date(t.created_at);
        return isWithinInterval(d, { start: startOfDay(start), end });
      }).length;

      return {
        label: format(start, formatStr),
        count
      };
    });

    const currentColor = TEAM_COLORS[chartTeam] || TEAM_COLORS['ALL'];
    const isMultiColor = chartType === 'BAR' || chartType === 'POLAR';

    return {
      labels: counts.map(c => c.label),
      datasets: [{
        label: 'Tasks Created',
        data: counts.map(c => c.count),
        borderColor: isMultiColor ? '#fff' : currentColor,
        backgroundColor: isMultiColor ? counts.map((_, idx) => PALETTE[idx % PALETTE.length]) : `${currentColor}15`,
        borderWidth: isMultiColor ? 1 : 2,
        borderRadius: 0,
        hoverOffset: isMultiColor ? 15 : 0,
        tension: 0.45,
        fill: true,
        pointBackgroundColor: currentColor,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: currentColor,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
      }]
    };
  }, [tasks, users, chartTeam, timeRange, chartType]);

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };



  return (
    <div className="bg-[var(--bg-main)] min-h-screen text-[var(--text-main)] p-5 px-4 lg:px-8 font-['Inter'] relative transition-colors duration-300">

      {/* Background Ambience */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />



      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative z-10 flex flex-col xl:flex-row gap-6" style={{ marginTop: '12px' }}>



        {/* MIDDLE COLUMN: Team Pulse & Doughnut */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">

          {/* Team Pulse Section */}
          {/* Teams Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4 auto-rows-fr">
            {teamPulse.map((team, i) => (
              <div key={i} className="flex flex-col h-full">

                {/* Team Name Outside - Top Left */}
                <div className="flex justify-start mb-1">
                  <h2 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">{team.name}</h2>
                </div>

                <motion.div variants={itemVariants} className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-2xl relative shadow-sm flex flex-col md:flex-row gap-4 h-full flex-1" style={{ padding: '14px' }}>

                  {(!team.hasData && loading) ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[2px] z-20 rounded-2xl">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] animate-pulse">Syncing Data...</p>
                      </div>
                    </div>
                  ) : !team.hasData ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 z-20 rounded-2xl">
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">No Active Logs</p>
                    </div>
                  ) : null}

                  {/* Left Column - Team Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-[var(--text-muted)] font-medium">{team.members} Members</p>
                    </div>

                    <div className="flex flex-col gap-2 text-[11px] font-bold text-[var(--text-main)] my-2">
                      {/* Working */}
                      <div className="group/tooltip relative flex items-center gap-2 cursor-help w-fit">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                        <span className="text-[var(--text-muted)] w-16">Working:</span>
                        <span>{team.working.length}</span>
                        {team.working.length > 0 && (
                          <div className={`absolute ${i % 2 === 0 ? 'left-full ml-4' : 'right-full mr-4'} top-1/2 -translate-y-1/2 hidden group-hover/tooltip:block z-[100]`}>
                            <div className="bg-[var(--bg-card)]/95 backdrop-blur-md border border-[var(--glass-border)] rounded-lg p-3 shadow-xl min-w-[180px]">
                              {team.working.map((name, idx) => (
                                <div key={idx} className="text-xs font-semibold text-[var(--text-main)] py-1 whitespace-nowrap opacity-95">{name}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Available */}
                      <div className="group/tooltip relative flex items-center gap-2 cursor-help w-fit">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                        <span className="text-[var(--text-muted)] w-16">Available:</span>
                        <span>{team.available.length}</span>
                        {team.available.length > 0 && (
                          <div className={`absolute ${i % 2 === 0 ? 'left-full ml-4' : 'right-full mr-4'} top-1/2 -translate-y-1/2 hidden group-hover/tooltip:block z-[100]`}>
                            <div className="bg-[var(--bg-card)]/95 backdrop-blur-md border border-[var(--glass-border)] rounded-lg p-3 shadow-xl min-w-[180px]">
                              {team.available.map((name, idx) => (
                                <div key={idx} className="text-xs font-semibold text-[var(--text-main)] py-1 whitespace-nowrap opacity-95">{name}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Leave */}
                      <div className="group/tooltip relative flex items-center gap-2 cursor-help w-fit">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                        <span className="text-[var(--text-muted)] w-16">Leave:</span>
                        <span>{team.leave.length}</span>
                        {team.leave.length > 0 && (
                          <div className={`absolute ${i % 2 === 0 ? 'left-full ml-4' : 'right-full mr-4'} top-1/2 -translate-y-1/2 hidden group-hover/tooltip:block z-[100]`}>
                            <div className="bg-[var(--bg-card)]/95 backdrop-blur-md border border-[var(--glass-border)] rounded-lg p-3 shadow-xl min-w-[180px]">
                              {team.leave.map((name, idx) => (
                                <div key={idx} className="text-xs font-semibold text-[var(--text-main)] py-1 whitespace-nowrap opacity-95">{name}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Tasks */}
                  <div className="w-full md:w-[45%] bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl flex flex-col justify-start overflow-hidden h-[80px]">
                    <div className="flex flex-col justify-start gap-2 h-full p-3 overflow-y-auto custom-scrollbar">
                      {team.dailyTasks ? team.dailyTasks.map((t, j) => (
                        <div key={j} className="flex items-center gap-2 group cursor-default shrink-0">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.isWorking ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'}`}></span>
                          <div className="text-[11px] font-bold truncate transition-colors">
                            <span className={`${t.isWorking ? 'text-rose-400' : 'text-[var(--text-muted)]'} uppercase tracking-wide`}>{t.project}</span>
                          </div>
                        </div>
                      )) : (
                        <div className="flex items-center justify-center h-full">
                          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">No Tasks Today</span>
                        </div>
                      )}
                    </div>
                  </div>

                </motion.div>
              </div>
            ))}
          </div>

          {/* Task Trends Section */}
          <motion.div variants={itemVariants} className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-2xl p-8 shadow-sm min-h-[600px] flex flex-col gap-10">
            <div className="flex flex-col md:flex-row justify-start items-start md:items-center gap-10 pl-4">
              <div className="flex items-center gap-6 h-10">
                {/* Team Selector */}
                <div className="relative group h-full">
                  <select 
                    value={chartTeam}
                    onChange={(e) => setChartTeam(e.target.value)}
                    className="h-full appearance-none bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-main)] text-[11px] font-black uppercase tracking-widest px-6 pr-10 rounded-xl cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500/50 hover:bg-[var(--glass-border)] transition-all"
                  >
                    <option value="ALL">ALL TEAMS</option>
                    {TEAMS.map(t => (
                      <option key={t.id} value={t.id}>{t.display}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                    <ChevronDown size={14} />
                  </div>
                </div>

                {/* Time Range Selector */}
                <div className="h-full flex bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-1 gap-1">
                  {['DAY', 'WEEK', 'MONTH', 'YEAR'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setTimeRange(r)}
                      className={`h-full px-6 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${
                        timeRange === r 
                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--glass-border)]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {/* Chart Type Selector */}
                <div className="h-full flex bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-1 gap-1">
                  {[
                    { id: 'LINE', icon: TrendingUp },
                    { id: 'BAR', icon: BarChart3 },
                    { id: 'POLAR', icon: PieChart }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setChartType(t.id)}
                      className={`h-full aspect-square flex items-center justify-center rounded-lg transition-all ${
                        chartType === t.id 
                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--glass-border)]'
                      }`}
                      title={`${t.id} Chart`}
                    >
                      <t.icon size={16} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-[400px] w-full relative flex items-center justify-center">
              {chartType === 'LINE' && (
                <Line 
                  data={trendData}
                  plugins={[dataLabelsPlugin]}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleFont: { family: 'Inter', size: 12, weight: 'bold' },
                        bodyFont: { family: 'Inter', size: 11 },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false
                      }
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: {
                          color: 'rgba(148, 163, 184, 0.8)',
                          font: { family: 'Inter', size: 10, weight: 'bold' }
                        }
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(148, 163, 184, 0.08)' },
                        ticks: {
                          color: 'rgba(148, 163, 184, 0.8)',
                          font: { family: 'Inter', size: 10, weight: 'bold' },
                          stepSize: 5
                        }
                      }
                    }
                  }}
                />
              )}

              {chartType === 'BAR' && (
                <Bar 
                  data={trendData}
                  plugins={[dataLabelsPlugin]}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleFont: { family: 'Inter', size: 12, weight: 'bold' },
                        bodyFont: { family: 'Inter', size: 11 },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false
                      }
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: {
                          color: 'rgba(148, 163, 184, 0.8)',
                          font: { family: 'Inter', size: 10, weight: 'bold' }
                        }
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(148, 163, 184, 0.08)' },
                        ticks: {
                          color: 'rgba(148, 163, 184, 0.8)',
                          font: { family: 'Inter', size: 10, weight: 'bold' },
                          stepSize: 5
                        }
                      }
                    }
                  }}
                />
              )}

              {chartType === 'POLAR' && (
                <div className="w-full h-full max-h-[500px] flex items-center justify-center p-4">
                  <PolarArea 
                    data={trendData}
                    plugins={[dataLabelsPlugin, polar3DPlugin]}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'left',
                          labels: {
                            color: 'rgba(148, 163, 184, 0.8)',
                            font: { family: 'Inter', size: 10, weight: 'bold' },
                            padding: 20
                          }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(15, 23, 42, 0.9)',
                          titleFont: { family: 'Inter', size: 12, weight: 'bold' },
                          bodyFont: { family: 'Inter', size: 11 },
                          padding: 12,
                          cornerRadius: 8
                        }
                      },
                      scales: {
                        r: {
                          grid: { color: 'rgba(148, 163, 184, 0.1)' },
                          angleLines: { color: 'rgba(148, 163, 184, 0.1)' },
                          ticks: {
                            display: false,
                            backdropColor: 'transparent'
                          }
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </div>



      </motion.div>
    </div>
  );
};

export default Dashboard;
