import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Clock, Zap, Calendar, Filter, CheckCircle2, AlertTriangle, Users, FileText
} from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, startOfWeek } from 'date-fns';
import { supabase } from '../supabaseClient';

const PerformanceReview = () => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [dateRange, setDateRange] = useState({
    start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  // --- DATE PROCESSING ---
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
      return new Date(date.getTime() + 7 * 60 * 60 * 1000);
    } catch (e) { return null; }
  }

  function fmtDate(val) {
    const d = processDate(val);
    if (!d) return '';
    return format(d, 'dd/MM HH:mm');
  }

  function calcHours(endVal, startVal) {
    const e = processDate(endVal);
    const s = processDate(startVal);
    if (!e || !s) return null;
    const ms = e.getTime() - s.getTime();
    return ms > 0 ? ms / 3600000 : null;
  }

  // --- FETCH ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const startStr = startOfDay(parseISO(dateRange.start)).toISOString();
        const endStr = endOfDay(parseISO(dateRange.end)).toISOString();
        const [tasksRes, usersRes] = await Promise.all([
          supabase.from('NMK_Task').select('*')
            .gte('created_at', startStr).lte('created_at', endStr)
            .order('created_at', { ascending: false }),
          supabase.from('NMK_User').select('id, name, email, team, location')
        ]);
        if (tasksRes.error) throw tasksRes.error;
        if (usersRes.error) throw usersRes.error;
        const vnUsers = (usersRes.data || []).filter(u => u.location?.toUpperCase() === 'VIETNAM');
        setUsers(vnUsers);
        setTasks(tasksRes.data || []);
      } catch (err) { console.error('Failed to fetch data:', err); }
      finally { setLoading(false); }
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

  // --- TABLE DATA ---
  const tableData = useMemo(() => {
    return tasks.map(t => {
      const creator = userMap[t.create_by];
      const user = userMap[t.user_id];
      if (selectedTeam !== 'ALL') {
        if (creator?.team !== selectedTeam && user?.team !== selectedTeam) return null;
      }
      return {
        ...t,
        creatorName: creator?.displayName || t.create_by || '-',
        userName: user?.displayName || t.user_id || '-',
        t1: calcHours(t.date_end, t.date_start),
        t2a: calcHours(t.date_complete, t.date_accepted),
        t2b: calcHours(t.date_complete, t.date_started),
        t4a: calcHours(t.date_checked, t.date_accepted),
        t4b: calcHours(t.date_checked, t.date_started),
      };
    }).filter(Boolean);
  }, [tasks, userMap, selectedTeam]);

  // --- STATS ---
  const stats = useMemo(() => {
    const total = tableData.length;
    const withT1 = tableData.filter(t => t.t1 !== null);
    const withT2 = tableData.filter(t => t.t2b !== null);
    const withT4 = tableData.filter(t => t.t4b !== null);
    const avgT1 = withT1.length ? (withT1.reduce((s, t) => s + t.t1, 0) / withT1.length) : 0;
    const avgT2 = withT2.length ? (withT2.reduce((s, t) => s + t.t2b, 0) / withT2.length) : 0;
    const avgT4 = withT4.length ? (withT4.reduce((s, t) => s + t.t4b, 0) / withT4.length) : 0;
    return { total, avgT1, avgT2, avgT4, completed: withT4.length };
  }, [tableData]);

  const teamOptions = ['ALL', ...Array.from(new Set(users.map(u => u.team).filter(Boolean))).sort()];

  // --- HELPER: format hours ---
  const fh = (v) => v !== null && v !== undefined ? v.toFixed(1) : '';

  // --- Color class for time values ---
  const timeColor = (v) => {
    const isLight = document.body.classList.contains('theme-news');
    if (v === null || v === undefined) return isLight ? 'text-slate-400' : 'text-slate-600';
    
    if (v < 1) return isLight ? 'text-emerald-600' : 'text-emerald-400';
    if (v < 4) return isLight ? 'text-sky-600' : 'text-sky-400';
    if (v < 8) return isLight ? 'text-amber-600' : 'text-amber-400';
    return isLight ? 'text-rose-600' : 'text-rose-400';
  };

  return (
    <div className="max-w-full mx-auto space-y-8 pb-20 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 glass-panel p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
            <h1 className="text-3xl font-black text-[var(--text-contrast)] uppercase tracking-tight">
              Performance <span className="text-emerald-500">Review</span>
            </h1>
          </div>
          <p className="text-[var(--text-muted)] font-bold text-[10px] uppercase tracking-[0.3em] ml-5">Unified Task Analytics — Raw Data View</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 bg-[var(--bg-surface)] p-2 rounded-2xl border border-[var(--border)] shadow-sm">
            <div className="flex items-center gap-2 px-3">
              <Calendar size={14} className="text-[var(--text-muted)]" />
              <input type="date" className="bg-transparent text-[11px] font-black text-[var(--text-main)] outline-none cursor-pointer uppercase"
                value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
            </div>
            <div className="w-px h-4 bg-[var(--border)]" />
            <div className="flex items-center gap-2 px-3">
              <input type="date" className="bg-transparent text-[11px] font-black text-[var(--text-main)] outline-none cursor-pointer uppercase"
                value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
            </div>
          </div>
          <div className="bg-[var(--bg-surface)] p-2 rounded-2xl border border-[var(--border)] flex items-center gap-3 shadow-sm">
            <Filter size={14} className="text-[var(--text-muted)] ml-2" />
            <select className="bg-transparent text-[11px] font-black text-emerald-500 outline-none cursor-pointer uppercase pr-4"
              value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}>
              {teamOptions.map(t => <option key={t} value={t} className="bg-[var(--bg-dark)]">{t === 'ALL' ? 'ALL TEAMS' : t}</option>)}
            </select>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-black text-[var(--text-muted)] uppercase tracking-widest shadow-sm">
            {tableData.length} Tasks
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[50vh] flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm font-black text-slate-500 uppercase tracking-widest animate-pulse">Analyzing Performance Data...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Tasks', value: stats.total, icon: FileText, color: 'text-slate-500', bg: 'bg-slate-500/10' },
              { label: 'Avg Plan [t1]', value: `${stats.avgT1.toFixed(1)}h`, icon: Clock, color: 'text-sky-500', bg: 'bg-sky-500/10' },
              { label: 'Avg User [t2]', value: `${stats.avgT2.toFixed(1)}h`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'Avg Check [t4]', value: `${stats.avgT4.toFixed(1)}h`, icon: CheckCircle2, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { label: 'Completed', value: stats.completed, icon: Zap, color: 'text-rose-500', bg: 'bg-rose-500/10' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="glass-panel p-4 border-[var(--border)] bg-[var(--bg-card)] relative overflow-hidden group">
                <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full ${stat.bg} opacity-20 group-hover:scale-125 transition-transform duration-500`} />
                <div className="relative space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}><stat.icon size={14} /></div>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{stat.label}</p>
                  </div>
                  <p className="text-2xl font-black text-[var(--text-contrast)] tracking-tight">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Unified Raw Task Table */}
          <div className="glass-panel overflow-hidden border border-[var(--border)] bg-[var(--bg-surface)] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" style={{ minWidth: '1600px' }}>
                <thead>
                  {/* Row 1: Group Headers */}
                  <tr className="text-[10px] font-black uppercase tracking-widest border-b border-[var(--border)]">
                    <th rowSpan={2} className="px-3 py-3 text-amber-500 border-r border-b border-[var(--border)] sticky left-0 z-10 min-w-[180px] backdrop-blur-md" style={{ backgroundColor: 'var(--table-sticky)', borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>NAME</th>
                    <th colSpan={4} className="px-3 py-3 bg-indigo-500/10 text-indigo-500 text-center border-r border-b border-[var(--border)]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>MANAGER / LEADER</th>
                    <th colSpan={5} className="px-3 py-3 bg-sky-500/10 text-sky-500 text-center border-r border-b border-[var(--border)]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>USER</th>
                    <th rowSpan={2} className="px-3 py-3 bg-[var(--bg-surface)] text-[var(--text-muted)] text-center border-r border-b border-[var(--border)] min-w-[80px]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>area</th>
                    <th className="px-3 py-3 bg-emerald-500/10 text-emerald-500 text-center border-r border-b border-[var(--border)]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>PLAN TIME</th>
                    <th colSpan={2} className="px-3 py-3 bg-emerald-500/15 text-emerald-500 text-center border-r border-b border-[var(--border)]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>USER COMPLETE</th>
                    <th colSpan={2} className="px-3 py-3 bg-lime-500/10 text-lime-500 text-center border-b border-[var(--border)]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)' }}>TASK COMPLETE</th>
                  </tr>
                  {/* Row 2: Sub Headers */}
                  <tr className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--bg-header)]">
                    {/* MANAGER/LEADER sub-cols */}
                    <th className="px-3 py-2 bg-indigo-500/5 border-r border-b border-[var(--border)] min-w-[100px]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>create_by</th>
                    <th className="px-3 py-2 bg-indigo-500/5 border-r border-b border-[var(--border)] min-w-[95px]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>created_at</th>
                    <th className="px-3 py-2 bg-indigo-500/5 border-r border-b border-[var(--border)] min-w-[95px]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>date_start</th>
                    <th className="px-3 py-2 bg-indigo-500/5 border-r border-b border-[var(--border)] min-w-[95px]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>date_end</th>
                    {/* USER sub-cols */}
                    <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)] min-w-[100px]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>user_id</th>
                    <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)] min-w-[95px]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>date_accepted</th>
                    <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)] min-w-[95px]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>date_started</th>
                    <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)] min-w-[95px]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>date_complete</th>
                    <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)] min-w-[95px]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>date_checked</th>
                    {/* PLAN TIME */}
                    <th className="px-3 py-2 bg-emerald-500/5 border-r border-b border-[var(--border)] text-center min-w-[70px]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>
                      <span className="text-emerald-500">[t1]</span>
                      <br /><span className="text-[8px] text-[var(--text-muted)] normal-case">end − start</span>
                    </th>
                    {/* USER COMPLETE */}
                    <th className="px-3 py-2 bg-emerald-500/8 border-r border-b border-[var(--border)] text-center min-w-[70px]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>
                      <span className="text-emerald-500">[t2]</span>
                      <br /><span className="text-[8px] text-[var(--text-muted)] normal-case">complete − accepted</span>
                    </th>
                    <th className="px-3 py-2 bg-emerald-500/8 border-r border-b border-[var(--border)] text-center min-w-[70px]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>
                      <span className="text-emerald-500">[t2]</span>
                      <br /><span className="text-[8px] text-[var(--text-muted)] normal-case">complete − started</span>
                    </th>
                    {/* TASK COMPLETE */}
                    <th className="px-3 py-2 bg-lime-500/5 border-r border-b border-[var(--border)] text-center min-w-[70px]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>
                      <span className="text-lime-500">[t4]</span>
                      <br /><span className="text-[8px] text-[var(--text-muted)] normal-case">checked − accepted</span>
                    </th>
                    <th className="px-3 py-2 bg-lime-500/5 border-b border-[var(--border)] text-center min-w-[70px]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)' }}>
                      <span className="text-lime-500">[t4]</span>
                      <br /><span className="text-[8px] text-[var(--text-muted)] normal-case">checked − started</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {tableData.length === 0 ? (
                    <tr><td colSpan={16} className="px-8 py-16 text-center text-[var(--text-muted)] font-bold uppercase tracking-widest text-sm">No tasks found in selected range</td></tr>
                  ) : tableData.map((t, i) => (
                    <tr key={t.id || i} className="group hover:bg-[var(--bg-header)] transition-all text-[11px]" style={{ backgroundColor: i % 2 === 0 ? 'var(--row-odd)' : 'var(--row-even)' }}>
                      {/* NAME */}
                      <td className="px-3 py-2.5 sticky left-0 z-10 border-r border-b border-[var(--border)] backdrop-blur-md" style={{ backgroundColor: 'var(--table-sticky)', borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>
                        <span className="font-bold text-[var(--text-contrast)] group-hover:text-emerald-500 transition-colors line-clamp-2">{t.task_name || '-'}</span>
                      </td>
                      {/* MANAGER/LEADER */}
                      <td className="px-3 py-2.5 text-indigo-500/80 font-semibold border-r border-b border-[var(--border)] truncate max-w-[120px]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>{t.creatorName}</td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>{fmtDate(t.created_at)}</td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>{fmtDate(t.date_start)}</td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>{fmtDate(t.date_end)}</td>
                      {/* USER */}
                      <td className="px-3 py-2.5 text-sky-500/80 font-semibold border-r border-b border-[var(--border)] truncate max-w-[120px]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>{t.userName}</td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>{fmtDate(t.date_accepted)}</td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>{fmtDate(t.date_started)}</td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>{fmtDate(t.date_complete)}</td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-[var(--border)] border-b border-[var(--border)]" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>{fmtDate(t.date_checked)}</td>
                      {/* area */}
                      <td className="px-3 py-2.5 text-[var(--text-muted)] text-center border-r border-b border-[var(--border)] font-semibold" style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>{t.area || '-'}</td>
                      {/* PLAN TIME [t1] */}
                      <td className={`px-3 py-2.5 text-center font-black border-r border-b border-[var(--border)] ${timeColor(t.t1)}`} style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>{fh(t.t1)}</td>
                      {/* USER COMPLETE [t2] */}
                      <td className={`px-3 py-2.5 text-center font-black border-r border-b border-[var(--border)] ${timeColor(t.t2a)}`} style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>{fh(t.t2a)}</td>
                      <td className={`px-3 py-2.5 text-center font-black border-r border-b border-[var(--border)] ${timeColor(t.t2b)}`} style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>{fh(t.t2b)}</td>
                      {/* TASK COMPLETE [t4] */}
                      <td className={`px-3 py-2.5 text-center font-black border-r border-b border-[var(--border)] ${timeColor(t.t4a)}`} style={{ borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>{fh(t.t4a)}</td>
                      <td className={`px-3 py-2.5 text-center font-black border-b border-[var(--border)] ${timeColor(t.t4b)}`} style={{ borderBottomColor: 'rgba(0,0,0,0.15)' }}>{fh(t.t4b)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceReview;
