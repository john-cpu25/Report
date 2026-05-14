import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Zap, Target, Users, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight,
  Activity, Layers, Award, Clock, FolderKanban, Search, CheckCircle2, AlertCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [timeRange, setTimeRange] = useState('WEEK');

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, userRes, taskRes] = await Promise.all([
        supabase.from('NMK_Project').select('*'),
        supabase.from('NMK_User').select('*'),
        supabase.from('NMK_Task').select('*').order('created_at', { ascending: false })
      ]);
      setProjects(projRes.data || []);
      setUsers(userRes.data || []);
      setTasks(taskRes.data || []);
    } catch (err) {
      console.error('Dashboard Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    return {
      activeProjects: projects.length,
      intelligenceTasks: tasks.length,
      activeAgents: new Set(tasks.map(t => t.user_id)).size,
      systemPulse: "188.3%"
    };
  }, [projects, tasks]);

  const teamPulse = useMemo(() => {
    const teams = ['STR MODELING TEAM', 'PT & REO TEAM', 'ENGINEER TEAM', 'ETABS TEAM'];
    return teams.map((teamName, idx) => {
      const teamUsers = users.filter(u => (u.team || '').toUpperCase().includes(teamName.split(' ')[0]));
      const members = teamUsers.length || (idx === 0 ? 8 : idx === 1 ? 7 : idx === 2 ? 5 : 6);
      const activeCount = Math.floor(teamUsers.length * 0.7) || (idx === 0 ? 2 : idx === 1 ? 4 : idx === 2 ? 3 : 5);
      return {
        name: teamName,
        members: members,
        active: activeCount,
        available: members - activeCount,
        projects: ['RIVER TERRACE', 'FGW5', 'BALMAIN', 'SURF PARADE'].slice(0, idx === 0 ? 4 : idx === 1 ? 2 : 3),
        capacity: idx === 0 ? 89 : idx === 1 ? 78 : idx === 2 ? 92 : 65
      };
    });
  }, [users]);

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  if (loading) return (
    <div className="h-screen w-full bg-[var(--bg-main)] flex items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );

  return (
    <div className="bg-[var(--bg-main)] min-h-screen text-[var(--text-main)] p-5 font-['Inter'] relative overflow-x-hidden transition-colors duration-300">

      {/* Background Ambience */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between mb-8 relative z-10 gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-main)]">
            Command Center
          </h1>
          <p className="text-[10px] text-[var(--text-muted)] font-medium mt-1 flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Operational Intelligence System - Real-time Stream
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-focus-within:text-indigo-500" size={14} />
            <input type="text" placeholder="Global Intelligence Search..." className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-md pl-8 pr-3 py-1.5 text-xs w-64 outline-none focus:border-indigo-500/50 transition-all text-[var(--text-main)] placeholder-[var(--text-dim)]" />
          </div>

          <button className="relative flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm">
            <Zap size={14} /> Create Task
          </button>

          <div className="hidden md:flex items-center gap-3 border-l border-[var(--border)] pl-4 cursor-pointer group">
            <div className="text-right">
              <p className="text-xs font-bold text-[var(--text-main)] group-hover:text-indigo-500 transition-colors leading-tight">Nguyen Ly</p>
              <p className="text-[10px] text-[var(--text-dim)]">Modelling Expert</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-main)] font-bold text-[10px]">NL</div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative z-10 flex flex-col xl:flex-row gap-6">

        {/* LEFT COLUMN: Vertical Stats Cards */}
        <div className="flex flex-col gap-4 w-full xl:w-44 shrink-0">
          {[
            { label: 'Active Projects', value: stats.activeProjects, trend: '+12.5%', isUp: true, color: 'text-emerald-500' },
            { label: 'Intelligence Tasks', value: stats.intelligenceTasks, trend: '-4.2%', isUp: false, color: 'text-rose-500' },
            { label: 'Active Agents', value: stats.activeAgents, trend: 'Stable', isUp: true, color: 'text-[var(--text-muted)]' },
            { label: 'System Pulse', value: stats.systemPulse, trend: '+5.4%', isUp: true, color: 'text-emerald-500' },
          ].map((item, i) => (
            <motion.div key={i} variants={itemVariants} className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-xl shadow-sm flex flex-col justify-center gap-2 h-[110px]" style={{ padding: '20px' }}>
              <p className="text-[11px] font-medium text-[var(--text-muted)]">{item.label}</p>
              <h3 className="text-3xl font-bold text-[var(--text-main)] leading-none">{item.value}</h3>
              <p className={`text-[11px] font-semibold ${item.color}`}>{item.trend}</p>
            </motion.div>
          ))}
        </div>

        {/* MIDDLE COLUMN: Team Pulse & Doughnut */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">

          {/* Team Pulse Section */}
          {/* Teams Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-8">
            {teamPulse.map((team, i) => (
              <div key={i} className="flex flex-col">

                {/* Team Name Outside - Top Right */}
                <div className="flex justify-end mb-2">
                  <h2 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">{team.name}</h2>
                </div>

                <motion.div variants={itemVariants} className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-2xl relative overflow-hidden shadow-sm flex flex-col md:flex-row gap-6 h-full" style={{ padding: '24px' }}>

                  {/* Left Column - Team Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-[var(--text-muted)] font-medium">{team.members} Members</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium text-[var(--text-main)] my-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                        {team.active} Active
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                        {team.available} Available
                      </div>
                    </div>

                    <div className="w-full">
                      <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2">
                        <span>Capacity</span>
                        <span className="text-[var(--text-main)]">{team.capacity}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--bg-surface)] rounded-full overflow-hidden border border-[var(--glass-border)]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${team.capacity}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full rounded-full ${i === 0 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-rose-400 to-rose-600'}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Projects */}
                  <div className="w-full md:w-[45%] bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl flex flex-col justify-start" style={{ padding: '16px' }}>
                    <div className="flex flex-col justify-start gap-3.5 h-full">
                      {team.projects.map((p, j) => (
                        <div key={j} className="flex items-center gap-2.5 group cursor-default">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-dim)] group-hover:bg-blue-500 transition-colors shrink-0"></span>
                          <span className="text-xs font-semibold text-[var(--text-main)] group-hover:text-blue-400 transition-colors truncate">{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </motion.div>
              </div>
            ))}
          </div>

          {/* Efficiency Doughnut */}
          <motion.div variants={itemVariants} className="flex-1 bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-xl flex flex-col md:flex-row items-center justify-center gap-16 shadow-sm min-h-[300px]" style={{ padding: '32px' }}>

            <div className="relative w-48 h-48">
              <Doughnut
                data={{
                  labels: ['Efficient', 'Idle'],
                  datasets: [{
                    data: [53, 47],
                    backgroundColor: ['#10b981', '#1e40af'],
                    borderWidth: 0,
                    cutout: '80%'
                  }]
                }}
                options={{
                  plugins: { legend: { display: false }, tooltip: { enabled: false } },
                  maintainAspectRatio: false
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <h4 className="text-3xl font-bold text-[var(--text-main)]">53%</h4>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Efficiency</p>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <div>
                  <p className="text-[11px] text-[var(--text-muted)]">Total Tasks</p>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">1,240</h4>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <div>
                  <p className="text-[11px] text-[var(--text-muted)]">Completed</p>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">842</h4>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <div>
                  <p className="text-[11px] text-[var(--text-muted)]">Active WIP</p>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">10</h4>
                </div>
              </div>
            </div>

          </motion.div>
        </div>

        {/* RIGHT COLUMN: Activity Chart & Calendar */}
        <div className="flex flex-col gap-6 w-full xl:w-72 shrink-0">

          {/* Activity Chart */}
          <motion.div variants={itemVariants} className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-2xl shadow-sm" style={{ padding: '28px' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-bold text-[var(--text-main)]">Activity</h2>
              <div className="flex gap-3">
                <span className="text-[11px] text-blue-500 font-medium">Week</span>
                <span className="text-[11px] text-[var(--text-muted)] font-medium">Month</span>
                <span className="text-[11px] text-[var(--text-muted)] font-medium">Year</span>
              </div>
            </div>
            <div className="w-full h-32">
              <Bar
                data={{
                  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                  datasets: [{
                    data: [40, 60, 80, 50, 90, 30, 20],
                    backgroundColor: '#3b82f6',
                    borderRadius: 2,
                    barThickness: 8,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9 } } },
                    y: { display: false, min: 0 }
                  }
                }}
              />
            </div>
          </motion.div>

          {/* Calendar */}
          <motion.div variants={itemVariants} className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-2xl shadow-sm flex-1" style={{ padding: '28px' }}>
            <div className="flex justify-between items-center mb-6">
              <button className="text-[var(--text-muted)] hover:text-blue-500 font-bold">{"<"}</button>
              <span className="text-sm font-bold text-[var(--text-main)]">August 2026</span>
              <button className="text-[var(--text-muted)] hover:text-blue-500 font-bold">{">"}</button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-3">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                <span key={d} className="text-[11px] font-medium text-[var(--text-muted)]">{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center">
              <span className="p-1"></span>
              <span className="p-1"></span>
              {Array.from({ length: 31 }).map((_, i) => {
                const isToday = i + 1 === 13;
                return (
                  <div key={i} className="flex justify-center">
                    <button
                      className={`
                          w-6 h-6 flex items-center justify-center text-[10px] font-medium rounded transition-all
                          ${isToday
                          ? 'bg-blue-600 text-white'
                          : 'text-[var(--text-main)] hover:bg-[var(--bg-surface)]'
                        }
                        `}
                    >
                      {i + 1}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>

        </div>

      </motion.div>
    </div>
  );
};

export default Dashboard;
