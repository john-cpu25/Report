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
  const [timeRange, setTimeRange] = useState('MONTH');

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: projData, error: projError } = await supabase
        .from('NMK_Project')
        .select('*');
      
      const now = new Date();
      let startDate = new Date();
      if (timeRange === 'WEEK') startDate.setDate(now.getDate() - 7);
      else if (timeRange === 'MONTH') startDate.setMonth(now.getMonth() - 1);
      else if (timeRange === 'YEAR') startDate.setFullYear(now.getFullYear() - 1);

      const { data: taskData, error: taskError } = await supabase
        .from('NMK_Task')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (projError || taskError) throw projError || taskError;
      
      setProjects(projData || []);
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
        grid: { color: 'rgba(255,255,255,0.05)' }, 
        ticks: { color: '#64748b', font: { size: 9, weight: 'bold' } } 
      },
      x: { 
        grid: { display: false }, 
        ticks: { color: '#64748b', font: { size: 9, weight: 'bold' } } 
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
    <div className="space-y-8 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">{stat.label}</p>
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

      <div className="grid grid-cols-1 lg:col-span-12 xl:grid-cols-3 gap-8">
        {/* Project Pulse Chart */}
        <div className="xl:col-span-2 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">Project Activity Distribution</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Task Volume per Core Project</p>
              </div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white cursor-pointer transition-colors">
              <ArrowUpRight size={20} />
            </div>
          </div>
          
          <div className="h-[400px] w-full flex items-center justify-center">
            {tasks.length > 0 ? (
              <Bar data={chartData} options={barOptions} />
            ) : (
              <p className="text-slate-500 font-bold italic">No data available for this range.</p>
            )}
          </div>
        </div>

        {/* Team Leaderboard */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 flex flex-col">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Elite Agents</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Top Performers by Task Volume</p>
            </div>
          </div>

          <div className="space-y-4 flex-grow">
            {leaderboard.length > 0 ? leaderboard.map((user, idx) => (
              <motion.div 
                key={user.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group hover:bg-indigo-500/10 hover:border-indigo-500/20 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                    idx === 0 ? 'bg-yellow-400/20 text-yellow-400' :
                    idx === 1 ? 'bg-slate-300/20 text-slate-300' :
                    idx === 2 ? 'bg-orange-400/20 text-orange-400' :
                    'bg-white/5 text-slate-500'
                  }`}>
                    {idx === 0 ? <Award size={18} /> : idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white uppercase">{user.name}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active Operative</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">{user.count}</p>
                  <p className="text-[9px] font-bold text-emerald-400 uppercase">Tasks</p>
                </div>
              </motion.div>
            )) : (
              <p className="text-slate-500 font-bold italic text-center py-10">No active agents found.</p>
            )}
          </div>

          <button className="mt-8 w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all border border-white/5">
            View Full Analysis
          </button>
        </div>
      </div>

      {/* Activity Heatmap & Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Mock Activity Heatmap */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1.5 h-6 bg-yellow-400 rounded-full" />
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Intelligence Heatmap</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">System Load over Time</p>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.01 }}
                className={`aspect-square rounded-md border border-white/5 ${
                  Math.random() > 0.8 ? 'bg-indigo-500/60 shadow-[0_0_10px_rgba(99,102,241,0.3)]' :
                  Math.random() > 0.5 ? 'bg-indigo-500/30' :
                  Math.random() > 0.2 ? 'bg-indigo-500/10' :
                  'bg-white/5'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[8px] font-black text-slate-600 uppercase tracking-widest">
            <span>Low Intensity</span>
            <span>Critical Load</span>
          </div>
        </div>

        {/* Live Feed Ticker */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 overflow-hidden relative">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Direct Intelligence Stream</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Live System Updates</p>
            </div>
          </div>

          <div className="space-y-4">
            {tasks.slice(0, 4).map((task, idx) => (
              <div key={task.id} className="flex gap-4 items-start pb-4 border-b border-white/5 last:border-0">
                <div className="p-2 bg-white/5 rounded-lg text-slate-500">
                  <Clock size={14} />
                </div>
                <div>
                  <p className="text-[11px] text-white font-bold leading-tight">
                    <span className="text-indigo-400 font-black">@{task.user}</span> committed new task to <span className="text-yellow-400 font-black">#{task.project}</span>
                  </p>
                  <p className="text-[9px] text-slate-500 font-black uppercase mt-1">2 MINUTES AGO</p>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
