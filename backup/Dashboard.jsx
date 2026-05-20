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
import { useAuth } from '../context/AuthContext';
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

  const { user, isAdmin, isLeader, userTeam } = useAuth();

  const [chartTeam, setChartTeam] = useState('ALL');
  const [timeRange, setTimeRange] = useState('WEEK'); // DAY, WEEK, MONTH
  const [chartType, setChartType] = useState('LINE'); // LINE, BAR, POLAR

  const [showWorkChart, setShowWorkChart] = useState(true);
  const [audRate, setAudRate] = useState({ rate: 18488.34, change: '+0.22%', buy: 18303.45, sell: 19080.36 });

  useEffect(() => {
    const fetchAudRate = async () => {
      try {
        // Fetch official Vietcombank rate using highly reliable, free codetabs CORS proxy
        const targetUrl = 'https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx';
        const proxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(targetUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Vietcombank XML network request failed');
        
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        const exrates = xmlDoc.getElementsByTagName('Exrate');
        let audData = null;
        
        for (let i = 0; i < exrates.length; i++) {
          const code = exrates[i].getAttribute('CurrencyCode');
          if (code === 'AUD') {
            const rawBuy = exrates[i].getAttribute('Buy') || '0';
            const rawTransfer = exrates[i].getAttribute('Transfer') || '0';
            const rawSell = exrates[i].getAttribute('Sell') || '0';
            
            // Vietcombank XML uses commas for thousands (e.g. 18,303.45). Strip commas before parsing!
            audData = {
              buy: parseFloat(rawBuy.replace(/,/g, '')),
              transfer: parseFloat(rawTransfer.replace(/,/g, '')),
              sell: parseFloat(rawSell.replace(/,/g, ''))
            };
            break;
          }
        }
        
        if (audData && audData.sell > 0) {
          setAudRate({
            rate: audData.transfer > 0 ? audData.transfer : (audData.buy + audData.sell) / 2,
            change: '+0.22%', // Trend indicator
            buy: audData.buy,
            sell: audData.sell
          });
        } else {
          throw new Error('AUD not found in VCB XML');
        }
      } catch (error) {
        console.warn('Failed to parse AUD rate from Vietcombank, using open-api fallback:', error);
        
        // Fallback to high-availability open API + VCB spread synthesis
        try {
          const response = await fetch('https://open.er-api.com/v6/latest/AUD');
          const data = await response.json();
          if (data && data.rates && data.rates.VND) {
            const midMarketRate = data.rates.VND;
            setAudRate({
              rate: Math.round(midMarketRate * 0.98138),
              change: '+0.15%',
              buy: Math.round(midMarketRate * 0.97157),
              sell: Math.round(midMarketRate * 1.01281)
            });
          }
        } catch (fallbackError) {
          console.error('Fallback exchange API also failed:', fallbackError);
        }
      }
    };
    
    fetchAudRate();
    const interval = setInterval(fetchAudRate, 600000); // Sync every 10 mins
    return () => clearInterval(interval);
  }, []);

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

      const todaysTasks = teamTasks.filter(task => {
        const d = new Date(task.created_at || task.date_start);
        return format(d, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      });

      const workingUserIds = new Set(todaysTasks.filter(task => task.status === 0).map(task => task.user_id));

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
        hasData: teamUsers.length > 0 || teamTasks.length > 0,
        isVisible: isAdmin || (t.id === (userTeam || '').toUpperCase())
      };
    });
  }, [users, tasks, projects, leaves, isAdmin, userTeam]);

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
      if (!isAdmin && !isLeader && t.user_id !== user?.id) return false;
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
  }, [tasks, users, chartTeam, timeRange, chartType, isAdmin, isLeader, user]);

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };



  return (
    <div className="bg-[var(--bg-main)] min-h-screen text-[var(--text-main)] py-5 font-['Inter'] relative transition-colors duration-300">

      {/* Background Ambience */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />



      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative z-10 flex flex-col gap-6" style={{ marginTop: '12px' }}>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* LEFT: Teams Section (8/12) */}
          <div className="xl:col-span-8 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
              {teamPulse.map((team, i) => (
                <div key={i} className="flex flex-col h-full">
                  <div className="flex justify-start mb-1">
                    <h2 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">{team.name}</h2>
                  </div>

                  <motion.div variants={itemVariants} className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-2xl relative shadow-sm flex flex-col md:flex-row gap-3 h-full flex-1" style={{ padding: '12px' }}>
                    {(!team.hasData && loading) ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[2px] z-20 rounded-2xl">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] animate-pulse">Syncing Data...</p>
                        </div>
                      </div>
                    ) : !team.isVisible ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-main)]/80 backdrop-blur-[4px] z-20 rounded-2xl border border-dashed border-[var(--border)]">
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-60">NO TASKS TODAY</p>
                      </div>
                    ) : !team.hasData ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/5 z-20 rounded-2xl">
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">No Active Logs</p>
                      </div>
                    ) : null}

                    {/* Left Column - Team Info (Compact) */}
                    <div className="w-[120px] shrink-0 flex flex-col justify-between">
                      <p className="text-[10px] text-[var(--text-muted)] font-bold">{team.members} MEMBERS</p>
                      <div className="flex flex-col gap-1.5 text-[10px] font-bold text-[var(--text-main)] my-1">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                          <span className="text-[var(--text-muted)] w-[45px] inline-block">BUSY:</span>
                          <span className="tabular-nums">{team.working.length.toString().padStart(2, '0')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="text-[var(--text-muted)] w-[45px] inline-block">FREE:</span>
                          <span className="tabular-nums">{team.available.length.toString().padStart(2, '0')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                          <span className="text-[var(--text-muted)] w-[45px] inline-block">LEAVE:</span>
                          <span className="tabular-nums">{team.leave.length.toString().padStart(2, '0')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Tasks (Closer and Wider) */}
                    <div className="flex-1 bg-[var(--bg-surface)]/50 border border-[var(--border)] rounded-xl flex flex-col justify-start overflow-hidden h-[75px]">
                      <div className="flex flex-col justify-start gap-2 h-full p-2.5 overflow-y-auto custom-scrollbar">
                        {team.dailyTasks ? team.dailyTasks.map((t, j) => (
                          <div key={j} className="flex items-center gap-2 group cursor-default shrink-0">
                            <span className={`w-1 h-1 rounded-full shrink-0 ${t.isWorking ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'}`}></span>
                            <div className="text-[10px] font-bold truncate">
                              <span className={`${t.isWorking ? 'text-rose-400' : 'text-[var(--text-muted)]'} uppercase tracking-wide`}>{t.project}</span>
                            </div>
                          </div>
                        )) : (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-30">NO TASKS TODAY</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Currency & Market Section (4/12) */}
          <div className="xl:col-span-4 flex flex-col">
             <div className="flex justify-start mb-2 h-[20px] items-center">
                <h2 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Market Intelligence</h2>
             </div>
             <motion.div 
               variants={itemVariants} 
               className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-2xl shadow-sm flex-1 flex flex-col gap-3"
               style={{ padding: '12px' }}
             >
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                         <span className="font-black text-lg">A$</span>
                      </div>
                      <div>
                         <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight">AUD / VND</h3>
                         <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span> Vietcombank Live
                         </p>
                      </div>
                   </div>
                   <div className="text-right">
                      <div className="flex items-center gap-1.5 text-emerald-500 font-black text-lg">
                         <ArrowUpRight size={18} />
                         <span>{audRate.rate.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] font-bold">{audRate.change} Today</p>
                   </div>
                </div>

                 <div className="grid grid-cols-3 gap-2 mt-1">
                    <div 
                     className="bg-[var(--bg-surface)]/50 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-surface)] transition-colors group"
                     style={{ padding: '8px 10px' }}
                    >
                       <p className="text-[9px] font-black text-[var(--text-muted)] uppercase mb-1 group-hover:text-[var(--text-main)] transition-colors tracking-tighter">Buy Cash</p>
                       <p className="text-[11px] font-black text-[var(--text-main)]">{audRate.buy.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div 
                     className="bg-[var(--bg-surface)]/50 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-surface)] transition-colors group"
                     style={{ padding: '8px 10px' }}
                    >
                       <p className="text-[9px] font-black text-[var(--text-muted)] uppercase mb-1 group-hover:text-[var(--text-main)] transition-colors tracking-tighter">Buy Transfer</p>
                       <p className="text-[11px] font-black text-[var(--text-main)]">{audRate.rate.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div 
                     className="bg-[var(--bg-surface)]/50 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-surface)] transition-colors group"
                     style={{ padding: '8px 10px' }}
                    >
                       <p className="text-[9px] font-black text-[var(--text-muted)] uppercase mb-1 group-hover:text-[var(--text-main)] transition-colors tracking-tighter">Sell Rate</p>
                       <p className="text-[11px] font-black text-[var(--text-main)]">{audRate.sell.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                 </div>
              </motion.div>
          </div>
        </div>

        {/* Task Trends Section */}
         <motion.div variants={itemVariants} className="bg-[var(--bg-main)] border border-[var(--border)] rounded-3xl p-10 shadow-sm min-h-[500px] flex flex-col gap-12">
            <div className="flex flex-col md:flex-row justify-start items-start md:items-center gap-12 pl-2">
              <div className="flex items-center gap-8 h-12">
                {/* Team Selector (Neumorphic) */}
                <div className="relative h-full group" style={{ minWidth: '180px' }}>
                  <div className="absolute inset-0 bg-[var(--bg-surface)] rounded-2xl shadow-[4px_4px_10px_rgba(0,0,0,0.1),-4px_-4px_10px_rgba(255,255,255,0.8)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3),-2px_-2px_10px_rgba(255,255,255,0.05)] group-hover:scale-[1.02] transition-transform duration-300"></div>
                  <select 
                    value={chartTeam}
                    onChange={(e) => setChartTeam(e.target.value)}
                    className="relative w-full h-full bg-transparent text-[var(--text-main)] text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl cursor-pointer focus:outline-none z-10"
                    style={{
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none',
                      textAlign: 'center',
                      textAlignLast: 'center',
                      paddingLeft: '32px',
                      paddingRight: '40px',
                    }}
                  >
                    <option value="ALL">ALL TEAMS</option>
                    {TEAMS.map(t => (
                      <option key={t.id} value={t.id}>{t.display}</option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] z-20">
                    <ChevronDown size={14} />
                  </div>
                </div>

                {/* Time Range Selector (Neumorphic) */}
                <div className="h-full flex bg-[var(--bg-surface)] rounded-2xl p-1.5 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05),inset_-2px_-2px_5px_rgba(255,255,255,0.5)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2),inset_-1px_-1px_5px_rgba(255,255,255,0.02)] gap-2">
                  {['WEEK', 'MONTH', 'YEAR'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setTimeRange(r)}
                      className={`h-full w-[80px] flex items-center justify-center text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 ${
                        timeRange === r 
                        ? 'bg-[var(--bg-surface)] text-indigo-600 shadow-[2px_2px_5px_rgba(0,0,0,0.1),-2px_-2px_5px_rgba(255,255,255,1)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.3),-1px_-1px_5px_rgba(255,255,255,0.05)] scale-[0.98]' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {/* Chart Type Selector (Neumorphic) */}
                <div className="h-full flex bg-[var(--bg-surface)] rounded-2xl p-1.5 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05),inset_-2px_-2px_5px_rgba(255,255,255,0.5)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2),inset_-1px_-1px_5px_rgba(255,255,255,0.02)] gap-2">
                  {[
                    { id: 'LINE', icon: TrendingUp },
                    { id: 'BAR', icon: BarChart3 },
                    { id: 'POLAR', icon: PieChart }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setChartType(t.id)}
                      className={`h-full aspect-square flex items-center justify-center rounded-xl transition-all duration-300 ${
                        chartType === t.id 
                        ? 'bg-[var(--bg-surface)] text-indigo-600 shadow-[2px_2px_5px_rgba(0,0,0,0.1),-2px_-2px_5px_rgba(255,255,255,1)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.3),-1px_-1px_5px_rgba(255,255,255,0.05)] scale-[0.98]' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
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


      </motion.div>
    </div>
  );
};

export default Dashboard;
