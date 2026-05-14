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
  FolderKanban,
  Search
} from 'lucide-react';
import { supabase } from '../supabaseClient';
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
      activeAgents: new Set(tasks.map(t => t.user)).size,
      systemPulse: "188.3%"
    };
  }, [projects, tasks]);

  const teamPulse = useMemo(() => {
    const teams = ['STR MODELING TEAM', 'PT & REO TEAM'];
    return teams.map(teamName => {
      const teamUsers = users.filter(u => (u.team || '').toUpperCase().includes(teamName.split(' ')[0]));
      const activeCount = Math.floor(teamUsers.length * 0.7); // Mock for visual
      return {
        name: teamName,
        members: teamUsers.length,
        active: activeCount,
        available: teamUsers.length - activeCount,
        projects: ['RIVER TERRACE', 'FGW5', 'BALMAIN', 'SURF PARADE'].slice(0, 4),
        capacity: 75
      };
    });
  }, [users]);

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="bg-[#0B0F1A] min-h-screen text-white p-4 font-['Inter']">
      {/* Header Area */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Command Center</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Operational Intelligence System • Real-time Stream
          </p>
        </div>
        <div className="flex items-center gap-4">
           <div className="relative group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
             <input type="text" placeholder="Global Intelligence Search..." className="bg-slate-900/50 border border-white/5 rounded-full pl-10 pr-4 py-1.5 text-[12px] w-64 outline-none focus:border-indigo-500/50 transition-all" />
           </div>
           <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-widest transition-all">
             + Create Task
           </button>
           <div className="flex items-center gap-3 border-l border-white/10 pl-4">
              <div className="text-right">
                <p className="text-[11px] font-black">Nguyen Ly</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase">Modelling Expert</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-[10px]">NL</div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left Column: Vertical Stats */}
        <div className="col-span-1 space-y-4">
          {[
            { label: 'Active Projects', value: stats.activeProjects, trend: '+12.5%', color: 'text-emerald-500' },
            { label: 'Intelligence Tasks', value: stats.intelligenceTasks, trend: '-4.2%', color: 'text-rose-500' },
            { label: 'Active Agents', value: stats.activeAgents, trend: 'Stable', color: 'text-slate-500' },
            { label: 'System Pulse', value: stats.systemPulse, trend: '+5.4%', color: 'text-emerald-500' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-900/40 border border-white/5 rounded-xl p-4 h-[120px] flex flex-col justify-between">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">{item.label}</p>
              <div>
                <h3 className="text-2xl font-black tracking-tighter">{item.value}</h3>
                <p className={`text-[9px] font-bold ${item.color}`}>{item.trend}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Center: Team Pulse & Efficiency */}
        <div className="col-span-9 space-y-4">
          {/* Team Pulse Row */}
          <div className="grid grid-cols-2 gap-4">
            {teamPulse.map((team, i) => (
              <div key={i} className="bg-slate-900/40 border border-white/5 rounded-xl p-5 relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-[14px] font-black uppercase tracking-tight">{team.name}</h2>
                    <p className="text-[10px] text-slate-500 font-bold">{team.members} Members</p>
                    <div className="flex items-center gap-3 mt-2">
                       <span className="flex items-center gap-1.5 text-[10px] font-black text-indigo-400">
                         <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> {team.active} Active
                       </span>
                       <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {team.available} Available
                       </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Top Active Projects</p>
                    <div className="space-y-1">
                      {team.projects.map((p, j) => (
                        <div key={j} className="flex items-center justify-end gap-2 text-[9px] font-bold uppercase">
                          <span className="text-slate-400">{p}</span>
                          <span className="text-white w-4 text-right">{Math.floor(Math.random() * 5) + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-1.5 text-[9px] font-black uppercase tracking-widest">
                    <span className="text-slate-500">Capacity Utilization</span>
                    <span className="text-white">{team.capacity}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full" style={{ width: `${team.capacity}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Efficiency & Analysis Row */}
          <div className="bg-slate-900/40 border border-white/5 rounded-xl p-8 h-[400px] flex items-center justify-center">
            <div className="flex items-center gap-20">
               <div className="relative w-48 h-48">
                  <Doughnut 
                    data={{
                      datasets: [{
                        data: [53, 47],
                        backgroundColor: ['#10b981', 'rgba(255,255,255,0.03)'],
                        borderWidth: 0,
                        circumference: 360,
                        rotation: 0,
                        cutout: '85%'
                      }]
                    }}
                    options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <h4 className="text-4xl font-black">53%</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Efficiency</p>
                  </div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-indigo-500 rounded-full border-4 border-[#0B0F1A]" />
               </div>

               <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase">Total Tasks</p>
                      <h4 className="text-xl font-black">1,240</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase">Completed</p>
                      <h4 className="text-xl font-black">842</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase">Active WIP</p>
                      <h4 className="text-xl font-black">10</h4>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Activity & Calendar */}
        <div className="col-span-2 space-y-4">
          <div className="bg-slate-900/40 border border-white/5 rounded-xl p-5 h-[300px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[12px] font-black uppercase tracking-tight">Activity</h2>
              <div className="flex gap-2 text-[8px] font-black uppercase text-slate-500">
                <span className="text-indigo-400">Week</span>
                <span>Month</span>
                <span>Year</span>
              </div>
            </div>
            <div className="flex-grow">
              <Bar 
                data={{
                  labels: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
                  datasets: [{
                    data: [40, 60, 80, 50, 90, 30, 20],
                    backgroundColor: '#6366f1',
                    borderRadius: 2,
                    barThickness: 8
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { 
                    x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 8 } } },
                    y: { display: false }
                  }
                }}
              />
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-xl p-5">
             <div className="flex justify-between items-center mb-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
               <button>{"<"}</button>
               <span>August 2026</span>
               <button>{">"}</button>
             </div>
             <div className="grid grid-cols-7 gap-1 text-center mb-2">
               {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                 <span key={d} className="text-[8px] font-black text-slate-600">{d}</span>
               ))}
             </div>
             <div className="grid grid-cols-7 gap-1 text-center">
                {Array.from({ length: 31 }).map((_, i) => (
                  <span key={i} className={`text-[10px] font-bold p-1.5 rounded-lg ${i + 1 === 12 ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-white/5'}`}>
                    {i + 1}
                  </span>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
