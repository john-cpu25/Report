import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Clock, Zap, Calendar, Filter, CheckCircle2, AlertTriangle, Users, FileText, 
  CalendarRange, Edit3, Save, PlusSquare, LayoutGrid, List
} from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, startOfWeek, isWithinInterval } from 'date-fns';
import { supabase } from '../supabaseClient';
import { calculateWorkingMinutes, formatMinutes, calculateTaskMetrics } from '../utils/performanceEngine';
import { processDate, formatDateTime } from '../utils/csvHelpers';

const PerformanceReview = () => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [dateRange, setDateRange] = useState({
    start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [viewMode, setViewMode] = useState('raw'); // 'raw' | 'weekly' | 'summary'
  const [activeMetric, setActiveMetric] = useState('t2b'); // 't1' | 't2b' | 't4b'
  const [manualData, setManualData] = useState(() => {
    const saved = localStorage.getItem('perfManualData');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('perfManualData', JSON.stringify(manualData));
  }, [manualData]);

  function fmtDate(val) {
    const d = processDate(val);
    if (!d) return '';
    return format(d, 'dd/MM HH:mm');
  }

  function calcHours(endVal, startVal) {
    const e = processDate(endVal);
    const s = processDate(startVal);
    if (!e || !s) return null;
    return calculateWorkingMinutes(s, e) / 60;
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
      const metrics = calculateTaskMetrics(t);
      const creator = userMap[t.create_by];
      const user = userMap[t.user_id];
      if (selectedTeam !== 'ALL') {
        if (creator?.team !== selectedTeam && user?.team !== selectedTeam) return null;
      }

      // Calculate "Check Duration" for leaders: checked - complete
      const dateComplete = processDate(t.date_complete);
      const dateChecked = processDate(t.date_checked);
      const checkTime = (dateComplete && dateChecked) ? (calculateWorkingMinutes(dateComplete, dateChecked) / 60) : 0;

      return {
        ...t,
        creatorName: creator?.displayName || t.create_by || '-',
        userName: user?.displayName || t.user_id || '-',
        ...metrics,
        t1: metrics.t1 / 60,
        t2: metrics.t2 / 60,
        t3: metrics.t3 / 60,
        t4: metrics.t4 / 60,
        t5: metrics.t5 / 60,
        checkTime: checkTime
      };
    }).filter(Boolean);
  }, [tasks, userMap, selectedTeam]);

  // --- WEEKLY VIEW DATA ---
  const weeklyData = useMemo(() => {
    const userGroups = {};
    const DOW_MAP = { 1: 'Mo', 2: 'Tu', 3: 'We', 4: 'Th', 5: 'Fr' };

    tableData.forEach(t => {
      const uName = t.userName;
      if (!userGroups[uName]) {
        userGroups[uName] = { 
          name: uName, 
          team: t.team || userMap[t.user_id]?.team || '-', 
          tasks: {} 
        };
      }
      
      const taskKey = t.task_name || 'No Title';
      if (!userGroups[uName].tasks[taskKey]) {
        userGroups[uName].tasks[taskKey] = { 
          name: taskKey, 
          project: t.project || '-',
          days: { Mo: [], Tu: [], We: [], Th: [], Fr: [] } 
        };
      }

      const date = processDate(t.created_at || t.date_start);
      if (date) {
        const dow = DOW_MAP[date.getDay()];
        if (dow) {
          userGroups[uName].tasks[taskKey].days[dow].push(t);
        }
      }
    });
    return userGroups;
  }, [tableData, userMap]);

  // --- SUMMARY / EFFICIENCY DATA ---
  const efficiencyData = useMemo(() => {
    const summary = {};
    
    // Initialize with all visible users
    users.forEach(u => {
      const name = u.name || u.email;
      if (selectedTeam !== 'ALL' && u.team !== selectedTeam) return;
      
      // Fetch leave from localStorage
      const leaveEntries = JSON.parse(localStorage.getItem(`leaveEntries_${name}`) || '[]');
      const rangeStart = startOfDay(parseISO(dateRange.start));
      const rangeEnd = endOfDay(parseISO(dateRange.end));
      
      const leaveDays = leaveEntries.filter(e => {
        const d = parseISO(e.date);
        return isWithinInterval(d, { start: rangeStart, end: rangeEnd }) && e.type !== 'HOLIDAY';
      }).reduce((sum, e) => sum + Number(e.amount), 0);

      summary[name] = {
        id: u.id,
        name,
        team: u.team || '-',
        projectTime: 0,
        checkTime: 0,
        otTime: manualData[name]?.ot || 0,
        manualCheck: manualData[name]?.check || 0,
        leaveDays: leaveDays,
      };
    });

    // Accumulate from tasks
    tableData.forEach(t => {
      // User project time (T2 is Actual Completion: start -> complete)
      if (summary[t.userName]) {
        summary[t.userName].projectTime += t.t2 || 0;
      }
      // Leader check time
      if (summary[t.creatorName]) {
        summary[t.creatorName].checkTime += t.checkTime || 0;
      }
    });

    return Object.values(summary).map(s => {
      const totalWork = s.projectTime + s.checkTime + s.otTime + s.manualCheck;
      const leaveHours = s.leaveDays * 8;
      const capacity = 40; 
      
      // Calculate efficiency: Total Plan Time / Total Actual Time for the user's tasks
      const userTasks = tableData.filter(t => t.userName === s.name);
      const totalPlan = userTasks.reduce((sum, t) => sum + (t.t1 || 0), 0);
      const totalActual = userTasks.reduce((sum, t) => sum + (t.t2 || 0), 0);
      const efficiency = totalActual > 0 ? (totalPlan / totalActual) * 100 : 100;

      return {
        ...s,
        totalWork,
        totalPlan,
        efficiency,
        free: Math.max(0, capacity - totalWork - leaveHours),
        performance: (totalWork / capacity) * 100
      };
    }).sort((a, b) => b.totalWork - a.totalWork);
  }, [tableData, users, manualData, dateRange]);

  // --- STATS ---
  const stats = useMemo(() => {
    const total = tableData.length;
    const withT1 = tableData.filter(t => t.t1 !== null);
    const withT2 = tableData.filter(t => t.t2 !== null);
    const withT4 = tableData.filter(t => t.t4 !== null);
    const avgT1 = withT1.length ? (withT1.reduce((s, t) => s + t.t1, 0) / withT1.length) : 0;
    const avgT2 = withT2.length ? (withT2.reduce((s, t) => s + t.t2, 0) / withT2.length) : 0;
    const avgT4 = withT4.length ? (withT4.reduce((s, t) => s + t.t4, 0) / withT4.length) : 0;
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
    <div className="max-w-full mx-auto space-y-[10px] pb-20 px-[10px]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-[10px] ocd-card">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
            <h1 className="text-[30px] font-black text-[var(--text-contrast)] uppercase tracking-tight">
              Performance <span className="text-emerald-500">Review</span>
            </h1>
          </div>
          <p className="text-[var(--text-muted)] font-bold text-[10px] uppercase tracking-[0.3em] ml-5">Unified Task Analytics — Raw Data View</p>
        </div>

        <div className="flex flex-wrap items-center gap-[10px]">
          {/* View Switcher */}
          <div className="flex items-center gap-[10px] p-[10px] bg-[var(--bg-surface)] rounded-[8px] border border-[var(--border)] shadow-sm">
            <button onClick={() => setViewMode('raw')}
              className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'raw' ? 'bg-indigo-500 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
              <List size={14} /> Raw
            </button>
            <button onClick={() => setViewMode('weekly')}
              className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'weekly' ? 'bg-indigo-500 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
              <CalendarRange size={14} /> Weekly
            </button>
            <button onClick={() => setViewMode('summary')}
              className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'summary' ? 'bg-indigo-500 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
              <TrendingUp size={14} /> Summary
            </button>
          </div>

          <div className="flex items-center gap-[10px] bg-[var(--bg-surface)] p-[10px] rounded-[8px] border border-[var(--border)] shadow-sm">
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
          <div className="bg-[var(--bg-surface)] p-[10px] rounded-[8px] border border-[var(--border)] flex items-center gap-[10px] shadow-sm">
            <Filter size={14} className="text-[var(--text-muted)] ml-2" />
            <select className="bg-transparent text-[11px] font-black text-emerald-500 outline-none cursor-pointer uppercase pr-4"
              value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}>
              {teamOptions.map(t => <option key={t} value={t} className="bg-[var(--bg-dark)]">{t === 'ALL' ? 'ALL TEAMS' : t}</option>)}
            </select>
          </div>
          <div className="px-4 py-2 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-black text-[var(--text-muted)] uppercase tracking-widest shadow-sm">
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
        <div className="space-y-[10px]">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-[10px]">
            {[
              { label: 'Total Tasks', value: stats.total, icon: FileText, color: 'text-slate-500', bg: 'bg-slate-500/10' },
              { label: 'Avg Plan [t1]', value: `${stats.avgT1.toFixed(1)}h`, icon: Clock, color: 'text-sky-500', bg: 'bg-sky-500/10' },
              { label: 'Avg User [t2]', value: `${stats.avgT2.toFixed(1)}h`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'Avg Check [t4]', value: `${stats.avgT4.toFixed(1)}h`, icon: CheckCircle2, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { label: 'Completed', value: stats.completed, icon: Zap, color: 'text-rose-500', bg: 'bg-rose-500/10' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="ocd-card bg-[var(--bg-card)] relative overflow-hidden group">
                <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full ${stat.bg} opacity-20 group-hover:scale-125 transition-transform duration-500`} />
                <div className="relative space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-[8px] ${stat.bg} ${stat.color}`}><stat.icon size={14} /></div>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{stat.label}</p>
                  </div>
                  <p className="text-2xl font-black text-[var(--text-contrast)] tracking-tight">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {viewMode === 'raw' && (
            <div className="ocd-card overflow-hidden bg-[var(--bg-surface)] shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" style={{ minWidth: '1600px' }}>
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest border-b border-[var(--border)]">
                      <th rowSpan={2} className="px-3 py-3 text-amber-500 border-r border-b border-[var(--border)] sticky left-0 z-10 min-w-[180px] backdrop-blur-md" style={{ backgroundColor: 'var(--table-sticky)', borderBottomColor: 'rgba(0,0,0,0.15)', borderRightColor: 'rgba(0,0,0,0.15)' }}>NAME</th>
                      <th colSpan={4} className="px-3 py-3 bg-indigo-500/10 text-indigo-500 text-center border-r border-b border-[var(--border)]">MANAGER / LEADER</th>
                      <th colSpan={5} className="px-3 py-3 bg-sky-500/10 text-sky-500 text-center border-r border-b border-[var(--border)]">USER</th>
                      <th rowSpan={2} className="px-3 py-3 bg-[var(--bg-surface)] text-[var(--text-muted)] text-center border-r border-b border-[var(--border)] min-w-[80px]">area</th>
                      <th className="px-3 py-3 bg-emerald-500/10 text-emerald-500 text-center border-r border-b border-[var(--border)]">T1</th>
                      <th className="px-3 py-3 bg-sky-500/10 text-sky-500 text-center border-r border-b border-[var(--border)]">T2</th>
                      <th className="px-3 py-3 bg-violet-500/10 text-violet-500 text-center border-r border-b border-[var(--border)]">T3</th>
                      <th className="px-3 py-3 bg-amber-500/10 text-amber-500 text-center border-r border-b border-[var(--border)]">T4</th>
                      <th className="px-3 py-3 bg-rose-500/10 text-rose-500 text-center border-b border-[var(--border)]">T5</th>
                    </tr>
                    <tr className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--bg-header)]">
                      <th className="px-3 py-2 bg-indigo-500/5 border-r border-b border-[var(--border)]">create_by</th>
                      <th className="px-3 py-2 bg-indigo-500/5 border-r border-b border-[var(--border)]">created_at</th>
                      <th className="px-3 py-2 bg-indigo-500/5 border-r border-b border-[var(--border)]">date_start</th>
                      <th className="px-3 py-2 bg-indigo-500/5 border-r border-b border-[var(--border)]">date_end</th>
                      <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)]">user_id</th>
                      <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)]">date_accepted</th>
                      <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)]">date_started</th>
                      <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)]">date_complete</th>
                      <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)]">date_checked</th>
                      <th className="px-3 py-2 bg-emerald-500/5 border-r border-b border-[var(--border)] text-center min-w-[70px]">T1</th>
                      <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)] text-center min-w-[70px]">T2</th>
                      <th className="px-3 py-2 bg-violet-500/5 border-r border-b border-[var(--border)] text-center min-w-[70px]">T3</th>
                      <th className="px-3 py-2 bg-amber-500/5 border-r border-b border-[var(--border)] text-center min-w-[70px]">T4</th>
                      <th className="px-3 py-2 bg-rose-500/5 border-b border-[var(--border)] text-center min-w-[70px]">T5</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {tableData.length === 0 ? (
                      <tr><td colSpan={16} className="px-8 py-16 text-center text-[var(--text-muted)] font-bold uppercase tracking-widest text-sm">No tasks found</td></tr>
                    ) : tableData.map((t, i) => (
                      <tr key={t.id || i} className="group hover:bg-[var(--bg-header)] transition-all text-[11px]" style={{ backgroundColor: i % 2 === 0 ? 'var(--row-odd)' : 'var(--row-even)' }}>
                        <td className="px-3 py-2.5 sticky left-0 z-10 border-r border-b border-[var(--border)] backdrop-blur-md" style={{ backgroundColor: 'var(--table-sticky)' }}>
                          <span className="font-bold text-[var(--text-contrast)] line-clamp-2">{t.task_name || '-'}</span>
                        </td>
                        <td className="px-3 py-2.5 text-indigo-500/80 font-semibold border-r border-b border-[var(--border)]">{t.creatorName}</td>
                        <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{fmtDate(t.created_at)}</td>
                        <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{fmtDate(t.date_start)}</td>
                        <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{fmtDate(t.date_end)}</td>
                        <td className="px-3 py-2.5 text-sky-500/80 font-semibold border-r border-b border-[var(--border)]">{t.userName}</td>
                        <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{fmtDate(t.date_accepted)}</td>
                        <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{fmtDate(t.date_started)}</td>
                        <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{fmtDate(t.date_complete)}</td>
                        <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{fmtDate(t.date_checked)}</td>
                        <td className="px-3 py-2.5 text-[var(--text-muted)] text-center border-r border-b border-[var(--border)] font-semibold">{t.area || '-'}</td>
                        <td className={`px-3 py-2.5 text-center font-black border-r border-b border-[var(--border)] ${timeColor(t.t1)}`}>{fh(t.t1)}</td>
                        <td className={`px-3 py-2.5 text-center font-black border-r border-b border-[var(--border)] ${timeColor(t.t2)}`}>{fh(t.t2)}</td>
                        <td className={`px-3 py-2.5 text-center font-black border-r border-b border-[var(--border)] ${timeColor(t.t3)}`}>{fh(t.t3)}</td>
                        <td className={`px-3 py-2.5 text-center font-black border-r border-b border-[var(--border)] ${timeColor(t.t4)}`}>{fh(t.t4)}</td>
                        <td className={`px-3 py-2.5 text-center font-black border-b border-[var(--border)] ${timeColor(t.t5)}`}>{fh(t.t5)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {viewMode === 'weekly' && (
            <div className="space-y-[10px]">
              <div className="flex items-center justify-between ocd-card">
                <h3 className="text-sm font-black text-[var(--text-contrast)] uppercase tracking-widest">Weekly Distribution</h3>
                <div className="flex gap-[10px] p-[10px] bg-[var(--bg-surface)] rounded-[8px] border border-[var(--border)]">
                  {['t1', 't2', 't4'].map(m => (
                    <button key={m} onClick={() => setActiveMetric(m)}
                      className={`px-3 py-1.5 rounded-[8px] text-[9px] font-black uppercase transition-all ${activeMetric === m ? 'bg-indigo-500 text-white' : 'text-[var(--text-muted)]'}`}>
                      {m === 't1' ? 'Plan' : m === 't2' ? 'User' : 'Task'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ocd-card overflow-hidden bg-[var(--bg-surface)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-widest border-b border-[var(--border)] bg-[var(--bg-header)]">
                        <th className="px-4 py-4 border-r border-[var(--border)] min-w-[200px]">Project & User</th>
                        {['Mo', 'Tu', 'We', 'Th', 'Fr'].map(d => <th key={d} className="px-4 py-4 text-center border-r border-[var(--border)]">{d}</th>)}
                        <th className="px-4 py-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {Object.values(weeklyData).map((user, ui) => (
                        <React.Fragment key={ui}>
                          <tr className="bg-indigo-500/5">
                            <td colSpan={7} className="px-4 py-2 font-black text-indigo-400 text-[10px] uppercase tracking-[0.2em]">{user.name} ({user.team})</td>
                          </tr>
                          {Object.values(user.tasks).map((task, ti) => {
                            const daySum = (dow) => task.days[dow].reduce((s, t) => s + (t[activeMetric] || 0), 0);
                            const total = ['Mo', 'Tu', 'We', 'Th', 'Fr'].reduce((s, d) => s + daySum(d), 0);
                            return (
                              <tr key={ti} className="text-[11px] hover:bg-[var(--bg-header)]">
                                <td className="px-4 py-3 border-r border-[var(--border)]">
                                  <div className="font-bold text-[var(--text-contrast)]">{task.project}</div>
                                  <div className="text-[9px] text-[var(--text-muted)] font-black uppercase mt-0.5 truncate max-w-[250px]">{task.name}</div>
                                </td>
                                {['Mo', 'Tu', 'We', 'Th', 'Fr'].map(d => {
                                  const val = daySum(d);
                                  return (
                                    <td key={d} className={`px-4 py-3 text-center border-r border-[var(--border)] font-black ${timeColor(val > 0 ? val : null)}`}>
                                      {val > 0 ? val.toFixed(1) : '-'}
                                    </td>
                                  );
                                })}
                                <td className="px-4 py-3 text-right font-black text-indigo-500">{total.toFixed(1)}h</td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'summary' && (
            <div className="space-y-[10px]">
              <div className="ocd-card bg-indigo-500/5">
                <h3 className="text-sm font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={16} /> Efficiency Summary Table
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] font-bold mt-1 uppercase tracking-widest ml-6">
                  Weekly performance calculated based on 40h standard week
                </p>
              </div>
              <div className="ocd-card overflow-hidden bg-[var(--bg-surface)]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest border-b border-[var(--border)] bg-[var(--bg-header)]">
                      <th className="px-6 py-4">Full Name</th>
                      <th className="px-4 py-4 text-center">Project Time</th>
                      <th className="px-4 py-4 text-center">Check Time</th>
                      <th className="px-4 py-4 text-center bg-indigo-500/5">OT Time</th>
                      <th className="px-4 py-4 text-center bg-amber-500/5">Leave (D)</th>
                      <th className="px-4 py-4 text-center">Free Time</th>
                      <th className="px-4 py-4 text-center text-emerald-500">Efficiency</th>
                      <th className="px-6 py-4 text-right">Performance (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {efficiencyData.map((s, i) => (
                      <tr key={i} className="text-[11px] group hover:bg-[var(--bg-header)] transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-black text-[var(--text-contrast)] uppercase tracking-tight">{s.name}</div>
                          <div className="text-[9px] text-[var(--text-muted)] font-bold uppercase">{s.team}</div>
                        </td>
                        <td className="px-4 py-4 text-center font-mono font-bold text-sky-400">{s.projectTime.toFixed(1)}h</td>
                        <td className="px-4 py-4 text-center font-mono font-bold text-amber-400">
                          <div className="flex flex-col items-center">
                            <span>{s.checkTime.toFixed(1)}h</span>
                            {s.manualCheck > 0 && <span className="text-[8px] opacity-60">+{s.manualCheck}h manual</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center bg-indigo-500/5">
                          <input type="number" step="0.5" className="bg-transparent w-16 text-center font-black text-indigo-400 outline-none border-b border-indigo-500/20 focus:border-indigo-500 transition-colors"
                            value={s.otTime} onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setManualData(prev => ({ ...prev, [s.name]: { ...prev[s.name], ot: val } }));
                            }} />
                        </td>
                        <td className="px-4 py-4 text-center bg-amber-500/5 font-black text-amber-500">{s.leaveDays}d</td>
                        <td className="px-4 py-4 text-center font-black text-[var(--text-muted)]">{s.free.toFixed(1)}h</td>
                        <td className="px-4 py-4 text-center font-black text-emerald-500">{s.efficiency.toFixed(0)}%</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-sm font-black ${s.performance >= 90 ? 'text-emerald-500' : s.performance >= 70 ? 'text-sky-500' : 'text-rose-500'}`}>
                              {s.performance.toFixed(1)}%
                            </span>
                            <div className="w-24 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-1000 ${s.performance >= 90 ? 'bg-emerald-500' : s.performance >= 70 ? 'bg-sky-500' : 'bg-rose-500'}`}
                                style={{ width: `${Math.min(100, s.performance)}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceReview;
