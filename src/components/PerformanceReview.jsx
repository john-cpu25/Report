import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Search, 
  TrendingUp, 
  Clock, 
  Coffee, 
  Zap, 
  Users, 
  Calendar,
  Filter,
  ChevronRight,
  Edit3,
  Save,
  AlertTriangle,
  FileText,
  Table
} from 'lucide-react';
import { format, parseISO, isAfter, startOfDay, endOfDay, isWithinInterval, addHours, startOfWeek } from 'date-fns';
import { supabase } from '../supabaseClient';

const PerformanceReview = () => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [viewMode, setViewMode] = useState('summary'); // 'summary' or 'daily'
  const [reviewMode, setReviewMode] = useState('user'); // 'leader' or 'user'
  const [dateRange, setDateRange] = useState({
    start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const DAY_LABELS = ['MO', 'TU', 'WE', 'TH', 'FR'];

  // Local overrides for Leader/Manager time
  const [overrides, setOverrides] = useState(() => {
    const saved = localStorage.getItem('performance_overrides');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('performance_overrides', JSON.stringify(overrides));
  }, [overrides]);

  // --- REPLICATED LOGIC FROM CSVPROCESSOR ---
  function processDate(val) {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'number') return new Date((val - 25569) * 86400 * 1000);
    let str = val.toString().trim();
    if (/^\d{5}(\.\d+)?$/.test(str)) {
      const num = parseFloat(str);
      return new Date((num - 25569) * 86400 * 1000);
    }
    if (str.startsWith('0001')) return null;
    try {
      let s = str.replace(' ', 'T');
      if (s.match(/[+-]\d{2}$/)) s += ':00';
      let date = new Date(s);
      if (isNaN(date.getTime())) {
        if (!s.includes('Z') && !s.match(/[+-]\d{2}/)) date = new Date(s + 'Z');
      }
      if (isNaN(date.getTime())) {
        let sNoMs = s.replace(/\.\d+(?=[+-Z]|$)/, '');
        date = new Date(sNoMs);
      }
      if (isNaN(date.getTime())) return new Date(str);
      if (isNaN(date.getTime())) return null;
      return new Date(date.getTime() + 7 * 60 * 60 * 1000); // Vietnam Time
    } catch (e) { return null; }
  }

  function getEffectiveDuration(start, end) {
    if (!start || !end || end <= start) return 0;
    let duration = end.getTime() - start.getTime();
    const lunchStart = new Date(start);
    lunchStart.setUTCHours(12, 30, 0, 0);
    const lunchEnd = new Date(start);
    lunchEnd.setUTCHours(13, 30, 0, 0);
    const overlapStart = Math.max(start.getTime(), lunchStart.getTime());
    const overlapEnd = Math.min(end.getTime(), lunchEnd.getTime());
    if (overlapEnd > overlapStart) duration -= (overlapEnd - overlapStart);
    return duration > 0 ? duration : 0;
  }

  function msToHours(ms) {
    return ms / (1000 * 60 * 60);
  }
  // ------------------------------------------

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const startStr = startOfDay(parseISO(dateRange.start)).toISOString();
        const endStr = endOfDay(parseISO(dateRange.end)).toISOString();

        const [tasksRes, usersRes] = await Promise.all([
          supabase.from('NMK_Task')
            .select('*')
            .gte('created_at', startStr)
            .lte('created_at', endStr)
            .order('created_at', { ascending: false }),
          supabase.from('NMK_User').select('id, name, email, team, location')
        ]);
        
        if (tasksRes.error) throw tasksRes.error;
        if (usersRes.error) throw usersRes.error;

        const vnUsers = (usersRes.data || []).filter(u => u.location?.toUpperCase() === 'VIETNAM');
        setUsers(vnUsers);
        setTasks(tasksRes.data || []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange]);

  const userMap = useMemo(() => {
    const map = {};
    users.forEach(u => { 
      const name = u.name || u.email || u.id;
      map[u.id] = { ...u, displayName: name }; 
      if (u.email) map[u.email] = { ...u, displayName: name }; 
    });
    return map;
  }, [users]);

  // Process data for the Review mode
  const processedData = useMemo(() => {
    return tasks.map(t => {
      // Fields based on Mode
      let userId, dateStartVal, dateEndVal, baseDate;
      
      if (reviewMode === 'leader') {
        userId = t.create_by;
        dateStartVal = processDate(t.date_start);
        dateEndVal = processDate(t.date_end || t.date_complete);
        baseDate = processDate(t.created_at || t.date_start);
      } else {
        userId = t.user_id;
        dateStartVal = processDate(t.date_started || t.date_start);
        dateEndVal = processDate(t.date_checked);
        baseDate = processDate(t.created_at);
      }
      
      const user = userMap[userId];
      if (!user) return null; // Skip if user not in VN list or wrong ID for mode

      const durationMs = getEffectiveDuration(dateStartVal, dateEndVal);
      const duration = msToHours(durationMs);
      
      const taskHour = baseDate ? baseDate.getHours() : 0;
      const isAfter6PM = taskHour >= 18;
      const hasOTKeyword = t.task_name?.toUpperCase().includes('OT') || t.task_name?.toUpperCase().includes('OVER TIME');
      
      return {
        ...t,
        userName: user.displayName,
        team: user.team || '-',
        duration,
        isOT: isAfter6PM || hasOTKeyword,
        dateObj: baseDate,
        dayName: baseDate ? format(baseDate, 'EEEE') : ''
      };
    }).filter(t => t !== null && t.dateObj);
  }, [tasks, userMap, reviewMode]);

  // Team aggregation
  const teamStats = useMemo(() => {
    const stats = {};
    processedData.forEach(t => {
      if (!stats[t.team]) stats[t.team] = { project: 0, ot: 0, users: new Set() };
      stats[t.team].project += t.duration;
      if (t.isOT) stats[t.team].ot += t.duration;
      stats[t.team].users.add(t.userName);
    });
    return stats;
  }, [processedData]);

  // User breakdown with daily distribution
  const userBreakdown = useMemo(() => {
    const breakdown = {};
    
    // Initialize with all users to show capacity even with 0 tasks
    users.forEach(u => {
      const name = u.name || u.email || u.id;
      breakdown[name] = {
        project: 0,
        ot: 0,
        team: u.team || '-',
        tasks: [],
        days: new Set(),
        daily: { 'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0, 'Friday': 0 }
      };
    });

    processedData.forEach(t => {
      if (!breakdown[t.userName]) {
        breakdown[t.userName] = { project: 0, ot: 0, team: t.team, tasks: [], days: new Set(), daily: { 'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0, 'Friday': 0 } };
      }
      breakdown[t.userName].project += t.duration;
      if (t.isOT) breakdown[t.userName].ot += t.duration;
      breakdown[t.userName].tasks.push(t);
      breakdown[t.userName].days.add(format(t.dateObj, 'yyyy-MM-dd'));
      
      if (t.dayName && breakdown[t.userName].daily[t.dayName] !== undefined) {
        breakdown[t.userName].daily[t.dayName] += t.duration;
      }
    });

    // Apply Overrides and calculate Free Time
    return Object.entries(breakdown).map(([name, data]) => {
      const numDays = data.days.size || 1;
      const capacity = numDays * 8; // 8h per day
      
      // Override logic
      const overrideVal = overrides[name];
      const projectTime = overrideVal !== undefined ? Number(overrideVal) : data.project;
      
      return {
        name,
        team: data.team,
        project: projectTime,
        ot: data.ot,
        free: Math.max(0, capacity - projectTime),
        tasks: data.tasks,
        numDays,
        daily: data.daily
      };
    }).filter(u => selectedTeam === 'ALL' || u.team === selectedTeam);
  }, [processedData, selectedTeam, overrides, users]);

  const handleOverrideChange = (userName, value) => {
    setOverrides(prev => ({ ...prev, [userName]: value }));
  };

  const teamOptions = ['ALL', ...Array.from(new Set(users.map(u => u.team).filter(Boolean))).sort()];

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.6)]" />
            <h1 className="text-4xl font-black italic text-white uppercase tracking-tight">
              Performance <span className="text-emerald-400">Review</span>
            </h1>
          </div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em] ml-5">Smart Efficiency & Capacity Analytics</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Review Mode Toggle (Leader/User) */}
          <div className="flex gap-1 p-1 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl mr-2">
            <button 
              onClick={() => setReviewMode('leader')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reviewMode === 'leader' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <FileText size={14} /> Leader Mode
            </button>
            <button 
              onClick={() => setReviewMode('user')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reviewMode === 'user' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Users size={14} /> User Mode
            </button>
          </div>

          {/* View Mode Toggle (Summary/Daily) */}
          <div className="flex gap-1 p-1 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl mr-4">
            <button 
              onClick={() => setViewMode('summary')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'summary' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Summary
            </button>
            <button 
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'daily' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Daily Detail
            </button>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/40 p-2 rounded-2xl border border-white/5 shadow-2xl">
            <div className="flex items-center gap-2 px-3">
              <Calendar size={14} className="text-slate-500" />
              <input 
                type="date" 
                className="bg-transparent text-[11px] font-black text-white outline-none cursor-pointer uppercase"
                value={dateRange.start}
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2 px-3">
              <input 
                type="date" 
                className="bg-transparent text-[11px] font-black text-white outline-none cursor-pointer uppercase"
                value={dateRange.end}
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-slate-900/40 p-2 rounded-2xl border border-white/5 flex items-center gap-3">
            <Filter size={14} className="text-slate-500 ml-2" />
            <select 
              className="bg-transparent text-[11px] font-black text-emerald-400 outline-none cursor-pointer uppercase pr-4"
              value={selectedTeam}
              onChange={e => setSelectedTeam(e.target.value)}
            >
              {teamOptions.map(t => <option key={t} value={t}>{t === 'ALL' ? 'ALL TEAMS' : t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[50vh] flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Analyzing Performance Data...</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Top Level Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Total Capacity', value: `${userBreakdown.reduce((s, u) => s + u.numDays * 8, 0)}H`, icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/10' },
              { label: 'Project Work', value: `${userBreakdown.reduce((s, u) => s + u.project, 0).toFixed(1)}H`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Free Capacity', value: `${userBreakdown.reduce((s, u) => s + u.free, 0).toFixed(1)}H`, icon: Coffee, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Overtime Detected', value: `${userBreakdown.reduce((s, u) => s + u.ot, 0).toFixed(1)}H`, icon: Zap, color: 'text-rose-400', bg: 'bg-rose-500/10' },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-panel p-6 border-white/5 bg-slate-900/40 relative overflow-hidden group"
              >
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${stat.bg} opacity-20 group-hover:scale-125 transition-transform duration-500`} />
                <div className="relative space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                      <stat.icon size={18} />
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                  </div>
                  <p className="text-3xl font-black text-white italic tracking-tight">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* User Breakdown Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-3">
                User <span className="text-emerald-400">Intelligence Breakdown</span>
              </h2>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-500">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Normal</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" /> Overtime</div>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  {userBreakdown.length} Users Tracked
                </div>
              </div>
            </div>

            <div className="glass-panel overflow-hidden border-white/5 bg-slate-900/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/[0.03] text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/10">
                      <th className="px-8 py-5">User</th>
                      <th className="px-8 py-5">Team</th>
                      
                      {viewMode === 'summary' ? (
                        <>
                          <th className="px-8 py-5 text-center">Project (H)</th>
                          <th className="px-8 py-5 text-center">Free (H)</th>
                        </>
                      ) : (
                        DAY_LABELS.map(day => (
                          <th key={day} className="px-4 py-5 text-center">{day}</th>
                        ))
                      )}
                      
                      <th className="px-8 py-5 text-center">OT (H)</th>
                      <th className="px-8 py-5 text-right">Status / Capacity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {userBreakdown.map((u, i) => (
                      <tr key={u.name} className="group hover:bg-white/[0.01] transition-all">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 font-black border border-white/5">
                              {u.name[0]}
                            </div>
                            <div>
                              <p className="font-black text-slate-200 group-hover:text-white transition-colors">{u.name}</p>
                              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{u.numDays} Days in range</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-3 py-1 rounded-lg bg-slate-950 border border-white/5 text-[9px] font-black text-slate-600 uppercase tracking-widest">{u.team}</span>
                        </td>
                        
                        {viewMode === 'summary' ? (
                          <>
                            <td className="px-8 py-5 text-center">
                              <div className="flex items-center justify-center gap-2 group/edit">
                                <span className="text-sm font-black text-white italic">{u.project.toFixed(1)}</span>
                                <button 
                                  className="opacity-0 group-hover/edit:opacity-100 p-1 hover:text-emerald-400 transition-all"
                                  onClick={() => {
                                    const newVal = prompt(`Adjust Project Time for ${u.name} (Current: ${u.project})`, u.project);
                                    if (newVal !== null) handleOverrideChange(u.name, newVal);
                                  }}
                                >
                                  <Edit3 size={12} />
                                </button>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <span className="text-sm font-black text-amber-500/60 italic">{u.free.toFixed(1)}</span>
                            </td>
                          </>
                        ) : (
                          DAYS.map(day => {
                            const val = u.daily[day] || 0;
                            return (
                              <td key={day} className="px-4 py-5 text-center">
                                <span className={`text-xs font-black italic ${val > 0 ? 'text-emerald-400' : 'text-slate-700'}`}>
                                  {val > 0 ? val.toFixed(1) : '-'}
                                </span>
                              </td>
                            );
                          })
                        )}
                        
                        <td className="px-8 py-5 text-center">
                          <span className={`text-sm font-black italic ${u.ot > 0 ? 'text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : 'text-slate-600'}`}>
                            {u.ot.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center justify-end gap-4">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                                {Math.round((u.project / (u.numDays * 8)) * 100)}% Usage
                              </span>
                              <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-1000 ${u.project > u.numDays * 8 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                  style={{ width: `${Math.min(100, (u.project / (u.numDays * 8)) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Smart Alerts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-panel p-6 border-rose-500/10 bg-rose-500/5 space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <AlertTriangle size={20} />
                <h3 className="text-xs font-black uppercase tracking-widest italic">Overtime Intelligence Alert</h3>
              </div>
              <div className="space-y-3">
                {userBreakdown.filter(u => u.ot > 0).map(u => (
                  <div key={u.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-rose-500/10">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-[11px] font-black text-slate-300">{u.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-rose-400 uppercase italic">{u.ot.toFixed(1)}H Extra</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel p-6 border-indigo-500/10 bg-indigo-500/5 space-y-4">
              <div className="flex items-center gap-3 text-indigo-400">
                <Zap size={20} />
                <h3 className="text-xs font-black uppercase tracking-widest italic">Capacity Optimization</h3>
              </div>
              <div className="space-y-3">
                {userBreakdown.filter(u => u.free > 2).map(u => (
                  <div key={u.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-indigo-500/10">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span className="text-[11px] font-black text-slate-300">{u.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase italic">{u.free.toFixed(1)}H Available</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceReview;
