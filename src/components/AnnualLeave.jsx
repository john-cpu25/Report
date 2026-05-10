import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Trash2, Plus, Clock, Award, Info, AlertCircle, Users, User, LayoutGrid, List, Landmark, TrendingUp } from 'lucide-react';
import { format, differenceInYears, parseISO, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import EnergyBar from './EnergyBar';
import { supabase } from '../supabaseClient';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  PointElement,
  LineElement
);

const VN_HOLIDAYS_2026 = [
  { date: '2026-01-01', note: 'New Year Day' },
  { date: '2026-02-16', note: 'Lunar New Year (Tet)' },
  { date: '2026-02-17', note: 'Lunar New Year (Tet)' },
  { date: '2026-02-18', note: 'Lunar New Year (Tet)' },
  { date: '2026-02-19', note: 'Lunar New Year (Tet)' },
  { date: '2026-02-20', note: 'Lunar New Year (Tet)' },
  { date: '2026-03-27', note: 'Hung Kings Commemoration' },
  { date: '2026-04-30', note: 'Liberation Day' },
  { date: '2026-05-01', note: 'International Workers Day' },
  { date: '2026-09-02', note: 'National Day' },
  { date: '2026-09-03', note: 'National Day Holiday' }
];

const AnnualLeave = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('ADMIN');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [viewMode, setViewMode] = useState('individual'); // 'individual' | 'summary' | 'analytics'
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Settings & Data State (indexed by selectedUser)
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [leaveEntries, setLeaveEntries] = useState([]);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: 1, // 1 or 0.5
    note: ''
  });

  // Fetch Users from Supabase
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const { data, error } = await supabase.from('NMK_User').select('id, name, email, team, location');
        if (error) throw error;
        // Filter only Vietnam users
        const vnUsers = (data || []).filter(u => u.location?.toUpperCase() === 'VIETNAM' || !u.location);
        setUsers(vnUsers);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  // Filtered users by team
  const filteredUsersByTeam = useMemo(() => {
    if (selectedTeam === 'ALL') return users;
    return users.filter(u => u.team === selectedTeam);
  }, [users, selectedTeam]);

  const teamOptions = useMemo(() => {
    const teams = new Set();
    users.forEach(u => { if (u.team) teams.add(u.team) });
    return ['ALL', ...Array.from(teams).sort()];
  }, [users]);

  // Load User Data when selectedUser changes
  useEffect(() => {
    const savedStart = localStorage.getItem(`leaveStartDate_${selectedUser}`);
    const savedEntries = localStorage.getItem(`leaveEntries_${selectedUser}`);
    
    setStartDate(savedStart || format(new Date(), 'yyyy-MM-dd'));
    setLeaveEntries(savedEntries ? JSON.parse(savedEntries) : []);
  }, [selectedUser]);

  // Persist Data for selectedUser
  useEffect(() => {
    localStorage.setItem(`leaveStartDate_${selectedUser}`, startDate);
  }, [startDate, selectedUser]);

  useEffect(() => {
    localStorage.setItem(`leaveEntries_${selectedUser}`, JSON.stringify(leaveEntries));
  }, [leaveEntries, selectedUser]);

  // Calculations
  const seniority = useMemo(() => {
    try {
      return differenceInYears(new Date(), parseISO(startDate));
    } catch (e) {
      return 0;
    }
  }, [startDate]);

  const totalAllowance = seniority >= 1 ? 15 : 12;

  const currentYearEntries = useMemo(() => {
    const start = startOfYear(new Date());
    const end = endOfYear(new Date());
    return leaveEntries.filter(entry => {
      const entryDate = parseISO(entry.date);
      return isWithinInterval(entryDate, { start, end });
    });
  }, [leaveEntries]);

  const usedDays = useMemo(() => {
    return currentYearEntries
      .filter(e => e.type !== 'HOLIDAY')
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
  }, [currentYearEntries]);

  const handleAddLeave = (e) => {
    e.preventDefault();
    if (!formData.date) return;

    const newEntry = {
      id: Date.now(),
      ...formData,
      type: 'LEAVE',
      createdAt: new Date().toISOString()
    };

    setLeaveEntries([newEntry, ...leaveEntries]);
    setFormData({ ...formData, note: '' }); 
  };

  const handleInsertHolidays = () => {
    const holidayEntries = VN_HOLIDAYS_2026.map(h => ({
      id: `holiday-${h.date}`,
      date: h.date,
      amount: 0,
      note: h.note,
      type: 'HOLIDAY',
      createdAt: new Date().toISOString()
    }));

    // Avoid duplicates
    const existingDates = new Set(leaveEntries.map(e => e.date));
    const newHolidays = holidayEntries.filter(h => !existingDates.has(h.date));
    
    setLeaveEntries([...newHolidays, ...leaveEntries]);
  };

  const deleteEntry = (id) => {
    setLeaveEntries(leaveEntries.filter(e => e.id !== id));
  };

  // Summary Data for all users in the filtered list
  const summaryData = useMemo(() => {
    return filteredUsersByTeam.map(u => {
      const uName = u.name || u.email;
      const uStart = localStorage.getItem(`leaveStartDate_${uName}`) || format(new Date(), 'yyyy-MM-dd');
      const uEntries = JSON.parse(localStorage.getItem(`leaveEntries_${uName}`) || '[]');
      
      const uSeniority = differenceInYears(new Date(), parseISO(uStart)) || 0;
      const uAllowance = uSeniority >= 1 ? 15 : 12;
      
      const start = startOfYear(new Date());
      const end = endOfYear(new Date());
      const uUsed = uEntries
        .filter(e => {
          const d = parseISO(e.date);
          return isWithinInterval(d, { start, end }) && e.type !== 'HOLIDAY';
        })
        .reduce((sum, entry) => sum + Number(entry.amount), 0);

      return {
        id: u.id,
        name: uName,
        team: u.team || '-',
        seniority: uSeniority,
        allowance: uAllowance,
        used: uUsed,
        remaining: uAllowance - uUsed
      };
    }).sort((a, b) => b.used - a.used);
  }, [filteredUsersByTeam]);

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Control Header */}
      <div className="glass-panel p-4 border-[var(--glass-border)] bg-[var(--bg-card)] flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Landmark size={20} />
            </div>
            <div>
              <h2 className="text-xs font-black text-indigo-500 uppercase tracking-widest">VN Annual Leave</h2>
              <p className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-0.5">Management Dashboard</p>
            </div>
          </div>

          <div className="h-10 w-px bg-[var(--glass-border)]" />

          <div className="flex items-center gap-2 p-1 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
            <button 
              onClick={() => setViewMode('individual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${viewMode === 'individual' ? 'bg-indigo-500 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-indigo-500'}`}
            >
              <User size={14} /> Individual
            </button>
            <button 
              onClick={() => setViewMode('summary')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${viewMode === 'summary' ? 'bg-indigo-500 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-indigo-500'}`}
            >
              <LayoutGrid size={14} /> Team Summary
            </button>
            <button 
              onClick={() => setViewMode('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${viewMode === 'analytics' ? 'bg-indigo-500 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-indigo-500'}`}
            >
              <TrendingUp size={14} /> Analytics
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-indigo-500/5 px-4 py-2.5 rounded-xl border border-indigo-500/10">
            <Users size={14} className="text-indigo-400" />
            <select 
              className="bg-transparent text-[11px] font-black text-indigo-500 outline-none cursor-pointer uppercase"
              value={selectedTeam}
              onChange={e => setSelectedTeam(e.target.value)}
            >
              {teamOptions.map(t => <option key={t} value={t} className="bg-[var(--bg-dark)]">{t === 'ALL' ? 'ALL TEAMS' : t}</option>)}
            </select>
          </div>

          {viewMode === 'individual' && (
            <div className="flex items-center gap-3 bg-[var(--bg-surface)] px-4 py-2.5 rounded-xl border border-[var(--glass-border)]">
              <User size={14} className="text-[var(--text-muted)]" />
              <select 
                className="bg-transparent text-[11px] font-black text-[var(--text-main)] outline-none cursor-pointer min-w-[150px]"
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
              >
                <option value="ADMIN" className="bg-[var(--bg-dark)]">SYSTEM ADMIN</option>
                {filteredUsersByTeam.map(u => (
                  <option key={u.id} value={u.name || u.email} className="bg-[var(--bg-dark)]">{u.name || u.email}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'analytics' ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">Leave <span className="text-indigo-400">Analytics</span></h2>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Visual distribution of team energy & leave utilization</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[2.5rem] p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest">Leave Distribution (Days)</h3>
              </div>
              <div className="h-[500px]">
                <Bar 
                  data={{
                    labels: summaryData.slice(0, 15).map(u => u.name),
                    datasets: [
                      {
                        label: 'Used',
                        data: summaryData.slice(0, 15).map(u => u.used),
                        backgroundColor: 'rgba(99, 102, 241, 0.8)',
                        borderRadius: 6,
                      },
                      {
                        label: 'Remaining',
                        data: summaryData.slice(0, 15).map(u => u.remaining),
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        borderRadius: 6,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: { stacked: true, grid: { display: false }, ticks: { color: 'var(--text-muted)', font: { size: 9, weight: 'bold' } } },
                      y: { stacked: true, grid: { color: 'var(--border)' }, ticks: { color: 'var(--text-muted)' } }
                    },
                    plugins: {
                      legend: { position: 'bottom', labels: { color: 'var(--text-muted)', font: { size: 10, weight: 'bold' } } }
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-indigo-500/10 border border-indigo-500/20 p-8 rounded-[2rem] text-center">
                <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto mb-4 border border-indigo-500/20">
                  <Landmark size={32} />
                </div>
                <h4 className="text-sm font-black text-[var(--text-main)] uppercase tracking-[0.2em] mb-2">Total Team Reserve</h4>
                <p className="text-4xl font-black text-[var(--text-main)]">
                  {summaryData.reduce((s, u) => s + u.remaining, 0)}
                </p>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Available Days Remaining</p>
              </div>

              <div className="bg-[var(--bg-card)] border border-[var(--glass-border)] p-8 rounded-[2rem]">
                <h4 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-6 flex items-center gap-2">
                  <AlertCircle size={14} className="text-rose-400" />
                  Critical Attention
                </h4>
                <div className="space-y-4">
                  {summaryData.filter(u => u.remaining < 3).slice(0, 3).map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 text-[10px] font-black">
                          {u.name[0]}
                        </div>
                        <span className="text-xs font-black text-[var(--text-main)] uppercase">{u.name}</span>
                      </div>
                      <span className="text-xs font-black text-rose-400">{u.remaining}D Left</span>
                    </div>
                  ))}
                  {summaryData.filter(u => u.remaining < 3).length === 0 && (
                    <p className="text-[10px] text-[var(--text-muted)] font-bold italic text-center py-4">No critical users detected.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : viewMode === 'summary' ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">Team <span className="text-indigo-400">Overview</span></h2>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Aggregate leave statistics for Vietnam operations</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--glass-border)] text-center min-w-[120px]">
                <p className="text-sm font-black text-[var(--text-muted)] uppercase mb-1">Total Users</p>
                <p className="text-xl font-black text-[var(--text-main)]">{summaryData.length}</p>
              </div>
              <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20 text-center min-w-[120px]">
                <p className="text-sm font-black text-indigo-400 uppercase mb-1">Avg Used</p>
                <p className="text-xl font-black text-[var(--text-main)]">
                  {summaryData.length ? (summaryData.reduce((s, u) => s + u.used, 0) / summaryData.length).toFixed(1) : 0}D
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel overflow-hidden border border-[var(--glass-border)] bg-[var(--bg-card)] backdrop-blur-xl shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-indigo-500/5 text-sm font-black text-[var(--text-muted)] uppercase tracking-[0.2em] border-b border-[var(--glass-border)]">
                  <th className="px-8 py-5">User Intelligence</th>
                  <th className="px-8 py-5">Team</th>
                  <th className="px-8 py-5 text-center">Seniority</th>
                  <th className="px-8 py-5 text-center">Allowance</th>
                  <th className="px-8 py-5 text-center">Used</th>
                  <th className="px-8 py-5 text-center">Remaining</th>
                  <th className="px-8 py-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {summaryData.map((u, i) => (
                  <tr 
                    key={u.id} 
                    className="group hover:bg-indigo-500/10 transition-all cursor-pointer" 
                    style={{ backgroundColor: i % 2 === 0 ? 'var(--row-odd)' : 'var(--row-even)' }}
                    onClick={() => { setSelectedUser(u.name); setViewMode('individual'); }}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] flex items-center justify-center text-indigo-500 font-black border border-[var(--glass-border)] group-hover:scale-110 transition-transform">
                          {u.name[0]}
                        </div>
                        <div className="font-black text-[var(--text-main)] group-hover:text-indigo-500 transition-colors">{u.name}</div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--glass-border)] text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">{u.team}</span>
                    </td>
                    <td className="px-8 py-6 text-center text-xs font-bold text-[var(--text-muted)]">{u.seniority} Yrs</td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-sm font-black text-indigo-500">{u.allowance}</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-sm font-black text-emerald-400">{u.used}</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`text-sm font-black ${u.remaining < 3 ? 'text-rose-400' : 'text-[var(--text-main)]'}`}>{u.remaining}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="w-24 h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden ml-auto">
                        <div 
                          className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" 
                          style={{ width: `${Math.min(100, (u.used / u.allowance) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-grow space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                <h1 className="text-3xl font-black text-[var(--text-main)] uppercase tracking-tight">
                  {selectedUser.split(' ')[0]}'s <span className="text-indigo-400">Leave</span>
                </h1>
              </div>
              <p className="text-[var(--text-muted)] font-bold text-xs uppercase tracking-[0.2em] ml-5">Energy & Wellness Intelligence</p>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={handleInsertHolidays}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 text-sm font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all active:scale-95"
              >
                <Landmark size={14} /> Insert VN Holidays
              </button>
              
              <div className="glass-panel p-4 flex items-center gap-6 border-[var(--glass-border)] bg-[var(--bg-card)]">
                <div className="space-y-1">
                  <label className="!mb-0 text-xs font-black text-[var(--text-muted)] uppercase">Work Start</label>
                  <input 
                    type="date" 
                    className="bg-transparent border-none text-indigo-400 font-black text-sm p-0 focus:ring-0 cursor-pointer"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div className="w-[1px] h-10 bg-[var(--glass-border)]" />
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Award size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest leading-none">Seniority</p>
                    <p className="text-lg font-black text-[var(--text-main)]">{seniority} {seniority === 1 ? 'YEAR' : 'YEARS'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Stats & Animation */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-panel p-6 border-[var(--glass-border)] bg-gradient-to-br from-slate-900/80 to-indigo-950/20">
                <EnergyBar used={usedDays} total={totalAllowance} />
              </div>

              <div className="glass-panel p-5 border-indigo-500/10 bg-indigo-500/5 space-y-4">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Info size={16} />
                  <h4 className="text-sm font-black uppercase tracking-widest">Policy Overview</h4>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed font-medium">
                  Hợp đồng lao động tại <span className="text-indigo-300 font-bold">Việt Nam</span>. 
                  Dựa trên thâm niên <span className="text-indigo-300 font-bold">{seniority} năm</span>, 
                  bạn được hưởng quỹ nghỉ phép <span className="text-indigo-300 font-bold">{totalAllowance} ngày</span>/năm.
                </p>
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--glass-border)] flex items-start gap-3">
                  <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider leading-normal">
                    {totalAllowance === 15 ? 'Đã đạt mức tối đa 15 ngày phép/năm.' : 'Làm việc trên 1 năm sẽ được tăng lên 15 ngày.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Form & History */}
            <div className="lg:col-span-8 space-y-6">
              {/* Entry Form */}
              <div className="glass-panel p-6 border-[var(--glass-border)]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Clock className="text-indigo-400" size={18} />
                    <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest">Book Leave Request</h3>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-black text-indigo-400 uppercase tracking-widest">
                    Create Entry
                  </div>
                </div>

                <form onSubmit={handleAddLeave} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 space-y-2">
                    <label className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Leave Date</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        className="input pl-10 h-12 bg-[var(--bg-surface)] text-[var(--text-main)] border-[var(--glass-border)]"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    </div>
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <label className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Duration</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { val: 1, label: 'Full Day' },
                        { val: 0.5, label: '1/2 Day' }
                      ].map(opt => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setFormData({ ...formData, amount: opt.val })}
                          className={`h-12 rounded-xl text-sm font-black uppercase tracking-widest transition-all border ${
                            formData.amount === opt.val
                              ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20'
                              : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--glass-border)] hover:border-indigo-500/10'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <label className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Reason / Note</label>
                    <input 
                      type="text" 
                      className="input h-12 bg-[var(--bg-surface)] text-[var(--text-main)] border-[var(--glass-border)]" 
                      placeholder="Optional note..." 
                      value={formData.note}
                      onChange={e => setFormData({ ...formData, note: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2 flex items-end">
                    <button type="submit" className="btn btn-primary w-full h-12 gap-2 shadow-lg shadow-indigo-500/20">
                      <Plus size={16} />
                      ADD
                    </button>
                  </div>
                </form>
              </div>

              {/* History Log */}
              <div className="glass-panel overflow-hidden border-[var(--glass-border)] bg-[var(--bg-card)]">
                <div className="px-6 py-4 border-b border-[var(--glass-border)] bg-indigo-500/5 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <List className="text-indigo-400" size={14} />
                    <h3 className="text-sm font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Leave History {new Date().getFullYear()}</h3>
                  </div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20">
                    {currentYearEntries.length} Records Found
                  </span>
                </div>
                
                <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                  {currentYearEntries.length === 0 ? (
                    <div className="p-16 text-center space-y-4">
                    <div className="w-20 h-20 rounded-3xl bg-[var(--bg-surface)] border border-[var(--glass-border)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                        <Calendar size={40} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">No Leave Records</p>
                        <p className="text-sm text-[var(--text-muted)] font-bold mt-1 uppercase tracking-wider">Lịch sử nghỉ phép sẽ hiển thị ở đây.</p>
                      </div>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-indigo-500/5 text-xs font-black uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--glass-border)] sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4 text-center">Amount</th>
                          <th className="px-6 py-4">Note / Type</th>
                          <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        <AnimatePresence initial={false}>
                          {currentYearEntries.map((entry, i) => (
                            <motion.tr 
                              key={entry.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              className={`group hover:bg-indigo-500/5 transition-colors ${entry.type === 'HOLIDAY' ? 'bg-amber-500/10' : ''}`}
                              style={{ backgroundColor: entry.type === 'HOLIDAY' ? undefined : (i % 2 === 0 ? 'var(--row-odd)' : 'var(--row-even)') }}
                            >
                              <td className="px-6 py-4">
                                <span className="text-xs font-black text-[var(--text-main)]">
                                  {format(parseISO(entry.date), 'EEEE, MMM dd, yyyy')}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {entry.type === 'HOLIDAY' ? (
                                  <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    HOLIDAY
                                  </span>
                                ) : (
                                  <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest border ${
                                    entry.amount === 1 
                                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  }`}>
                                    {entry.amount === 1 ? '1.0 DAY' : '0.5 DAY'}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-[11px] font-bold ${entry.type === 'HOLIDAY' ? 'text-amber-400/70' : 'text-[var(--text-muted)]'} group-hover:text-slate-300 transition-colors uppercase tracking-tight`}>
                                  {entry.note || '—'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => deleteEntry(entry.id)}
                                  className="p-2 text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all active:scale-90"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AnnualLeave;
