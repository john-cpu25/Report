import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Trash2, Plus, Clock, Award, Info, AlertCircle, Users, User, LayoutGrid, List, Landmark, TrendingUp } from 'lucide-react';
import { format, differenceInYears, parseISO, startOfYear, endOfYear, isWithinInterval, differenceInMinutes } from 'date-fns';
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
  const [viewMode, setViewMode] = useState('personal'); // 'personal' | 'team'
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Settings & Data State (indexed by selectedUser)
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [leaveEntries, setLeaveEntries] = useState([]);

  const [allLeaveEntries, setAllLeaveEntries] = useState([]);

  // Fetch Users and Leave Data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingUsers(true);
      try {
        // 1. Fetch Vietnam Users
        const { data: userData, error: userError } = await supabase
          .from('NMK_User')
          .select('id, name, email, team, location')
          .ilike('location', 'VIETNAM')
          .order('name');
          
        if (userError) throw userError;
        setUsers(userData || []);

        // 2. Fetch All Leave Entries
        const { data: leaveData, error: leaveError } = await supabase
          .from('NMK_Leave')
          .select('*')
          .order('created_at', { ascending: false });

        if (leaveError) {
          console.error('Error fetching NMK_Leave:', leaveError);
          setAllLeaveEntries([]);
        } else {
          console.log(`[DATABASE] Fetched ${userData?.length || 0} Vietnam users.`);
          console.log(`[DATABASE] Fetched ${leaveData?.length || 0} total leave entries.`);
          
          // Debug matching
          if (userData && leaveData) {
            const userIds = new Set(userData.map(u => u.id));
            const matchingEntries = leaveData.filter(e => userIds.has(e.create_by));
            console.log(`[DATABASE] Found ${matchingEntries.length} entries matching filtered Vietnam users.`);
          }
          
          setAllLeaveEntries(leaveData || []);
        }
      } catch (err) {
        console.error('Failed to fetch data from Supabase:', err);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchData();
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

  // Sync leaveEntries for selectedUser from the global pool
  useEffect(() => {
    const uName = selectedUser === 'ADMIN' ? 'ADMIN' : selectedUser;
    const targetUser = users.find(u => (u.name || u.email) === uName);
    
    // Filter by create_by UUID
    const userEntries = allLeaveEntries.filter(e => e.create_by === targetUser?.id);
    setLeaveEntries(userEntries);
    
    // Load start date from NMK_User or localStorage as fallback
    const savedStart = localStorage.getItem(`leaveStartDate_${uName}`);
    setStartDate(savedStart || format(new Date(), 'yyyy-MM-dd'));
  }, [selectedUser, allLeaveEntries, users]);

  // Persist Start Date (Seniority) - still in localStorage for now as it's user-specific setting
  useEffect(() => {
    localStorage.setItem(`leaveStartDate_${selectedUser}`, startDate);
  }, [startDate, selectedUser]);

  // Calculations
  const seniority = useMemo(() => {
    try {
      return differenceInYears(new Date(), parseISO(startDate));
    } catch (e) {
      return 0;
    }
  }, [startDate]);

  const totalAllowance = seniority >= 1 ? 15 : 12;

  const usedDays = useMemo(() => {
    const currentYear = parseInt(selectedYear);
    const start = selectedYear === 'ALL' ? new Date(2000, 0, 1) : startOfYear(new Date(currentYear, 0, 1));
    const end = selectedYear === 'ALL' ? new Date(2100, 0, 1) : endOfYear(new Date(currentYear, 0, 1));
    let total = 0;

    leaveEntries.forEach(entry => {
      if (entry.type?.trim().toLowerCase() !== 'annual leave') return;
      try {
        const list = typeof entry.leave_list === 'string' ? JSON.parse(entry.leave_list) : (entry.leave_list || []);
        list.forEach(segment => {
          const dStart = parseISO(segment.LeaveStart || segment.Start);
          const dEnd = parseISO(segment.LeaveEnd || segment.End);
          if (isWithinInterval(dStart, { start, end })) {
            const diffHours = Math.abs(differenceInMinutes(dEnd, dStart)) / 60;
            if (diffHours >= 8) total += 1;
            else if (diffHours >= 3) total += 0.5;
            else total += diffHours / 9;
          }
        });
      } catch (err) {}
    });
    return total;
  }, [leaveEntries, selectedYear]);

  const currentYearEntries = useMemo(() => {
    const currentYear = parseInt(selectedYear);
    const start = selectedYear === 'ALL' ? new Date(2000, 0, 1) : startOfYear(new Date(currentYear, 0, 1));
    const end = selectedYear === 'ALL' ? new Date(2100, 0, 1) : endOfYear(new Date(currentYear, 0, 1));
    
    return leaveEntries.filter(entry => {
      try {
        const list = typeof entry.leave_list === 'string' ? JSON.parse(entry.leave_list) : (entry.leave_list || []);
        return list.some(segment => {
          const d = parseISO(segment.LeaveStart || segment.Start);
          return isWithinInterval(d, { start, end });
        });
      } catch (e) { return false; }
    });
  }, [leaveEntries, selectedYear]);



  // Summary Data for all users in the filtered list
  const summaryData = useMemo(() => {
    return filteredUsersByTeam.map(u => {
      const uName = u.name || u.email;
      const uStart = localStorage.getItem(`leaveStartDate_${uName}`) || format(new Date(), 'yyyy-MM-dd');
      
      const uEntries = allLeaveEntries.filter(e => e.create_by === u.id);
      
      const uSeniority = differenceInYears(new Date(), parseISO(uStart)) || 0;
      const uAllowance = uSeniority >= 1 ? 15 : 12;
      
      const currentYear = parseInt(selectedYear);
      const start = selectedYear === 'ALL' ? new Date(2000, 0, 1) : startOfYear(new Date(currentYear, 0, 1));
      const end = selectedYear === 'ALL' ? new Date(2100, 0, 1) : endOfYear(new Date(currentYear, 0, 1));

      // Parse leave_list JSON and sum days
      let uUsed = 0;
      let uLog = [];
      
      uEntries.forEach(entry => {
        const type = entry.type?.trim().toLowerCase();
        if (type !== 'annual leave') return;
        
        try {
          const list = typeof entry.leave_list === 'string' 
            ? JSON.parse(entry.leave_list) 
            : (entry.leave_list || []);
            
          list.forEach(segment => {
            const startStr = segment.LeaveStart || segment.Start;
            const endStr = segment.LeaveEnd || segment.End;
            if (!startStr || !endStr) return;

            const dStart = parseISO(startStr);
            const dEnd = parseISO(endStr);
            
            if (isWithinInterval(dStart, { start, end })) {
              const diffHours = Math.abs(differenceInMinutes(dEnd, dStart)) / 60;
              let amount = 0;
              
              if (diffHours >= 8) amount = 1;
              else if (diffHours >= 3) amount = 0.5;
              else amount = diffHours / 9;
              
              uUsed += amount;
              uLog.push(`${format(dStart, 'dd/MM/yy')}: ${diffHours.toFixed(1)}h -> ${amount} day`);
            }
          });
        } catch (err) {
          console.error('Failed to parse leave_list for entry:', entry.id, err);
        }
      });

      if (uUsed > 0) {
        console.log(`[LEAVE CALC] User: ${uName} | Total Used: ${uUsed} days`);
        console.log(`  Breakdown:`, uLog.join(' | '));
      }

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
  }, [filteredUsersByTeam, allLeaveEntries]);

  useEffect(() => {
    if (summaryData.length > 0) {
      const totalUsedAcrossTeam = summaryData.reduce((s, u) => s + u.used, 0);
      console.log(`[UI SYNC] Summary calculated for ${summaryData.length} users. Total team USED: ${totalUsedAcrossTeam}`);
    }
  }, [summaryData]);

  return (
    <div className="tab-leave w-full space-y-[10px] pb-12">
      {/* Control Header (Neumorphic Action Bar) */}
      <div className="neu-raised p-6 flex flex-wrap items-center justify-between gap-8 m-[10px] rounded-3xl">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="neu-button neu-square p-4 text-indigo-500">
              <Landmark size={24} />
            </div>
            <div>
              <h2 className="text-[14px] font-black text-indigo-500 uppercase tracking-widest leading-none">VN Annual Leave</h2>
              <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-1">Management Dashboard</p>
            </div>
          </div>

          <div className="h-12 w-px bg-[var(--border)] opacity-50" />

          <div className="neu-inset rounded-2xl p-1.5 flex gap-2">
            <button 
              onClick={() => setViewMode('personal')}
              className={`neu-button px-6 py-2.5 text-[11px] gap-2 ${viewMode === 'personal' ? 'active text-indigo-500' : ''}`}
            >
              <User size={14} /> PERSONAL + ANALYTICS
            </button>
            <button 
              onClick={() => setViewMode('team')}
              className={`neu-button px-6 py-2.5 text-[11px] gap-2 ${viewMode === 'team' ? 'active text-indigo-500' : ''}`}
            >
              <LayoutGrid size={14} /> TEAM SUMMARY
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="neu-inset rounded-2xl p-1.5 flex gap-4 items-center">
            <div className="flex items-center gap-3 pl-4 border-r border-[var(--border)] pr-4">
              <Calendar size={14} className="text-indigo-400" />
              <select 
                className="leave-select"
                style={{ colorScheme: 'dark' }}
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
              >
                <option value="2024" className="leave-select-option">YEAR 2024</option>
                <option value="2025" className="leave-select-option">YEAR 2025</option>
                <option value="2026" className="leave-select-option">YEAR 2026</option>
                <option value="ALL" className="leave-select-option">ALL DATA</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pr-4">
              <Users size={14} className="text-indigo-400" />
              <select 
                className="leave-select"
                style={{ colorScheme: 'dark' }}
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
              >
                {teamOptions.map(t => <option key={t} value={t} className="leave-select-option">{t === 'ALL' ? 'ALL TEAMS' : t}</option>)}
              </select>
            </div>

            {viewMode === 'personal' && (
              <div className="flex items-center gap-3 bg-[var(--bg-surface)] px-4 py-2 rounded-xl border border-[var(--border)] shadow-inner">
                <User size={14} className="text-[var(--text-muted)]" />
                <select 
                  className="leave-select leave-select-user min-w-[120px]"
                  style={{ colorScheme: 'dark' }}
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                >
                  <option value="ADMIN" className="leave-select-option">SYSTEM ADMIN</option>
                  {filteredUsersByTeam.map(u => (
                    <option key={u.id} value={u.name || u.email} className="leave-select-option">{u.name || u.email}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'personal' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-[10px] m-[10px]">
          {/* Orange Zone: Individual + Analytics */}
          <div className="zone-card zone-orange">
            <div className="zone-accent" />
            
            <div className="flex flex-col gap-[15px]">
              <div className="flex items-center sys-gap mb-[10px]">
                <div className="heading-indicator" />
                <h1 className="text-[28px] font-black text-[var(--text-main)] uppercase tracking-tight italic">
                  {selectedUser.split(' ')[0]}'s <span className="text-accent">Leave</span>
                </h1>
                <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] mt-auto pb-1 ml-2">Energy & Wellness Intelligence</p>
              </div>

              <div className="flex flex-col lg:flex-row gap-[20px] items-stretch">
                {/* Left: Vertical Energy Bar */}
                <div className="h-[450px]">
                  <EnergyBar used={usedDays} total={totalAllowance} />
                </div>

                {/* Right: Analytics Chart */}
                <div className="flex-grow bg-[var(--bg-card)]/50 border border-[var(--border)] rounded-[8px] p-[20px] shadow-inner">
                  <div className="flex items-center sys-gap mb-[15px]">
                    <TrendingUp size={16} className="text-indigo-400" />
                    <h3 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-widest">Team Leave Distribution (Days)</h3>
                  </div>
                  <div className="h-[350px]">
                    <Bar 
                      data={{
                        labels: summaryData.slice(0, 10).map(u => u.name),
                        datasets: [
                          {
                            label: 'Used',
                            data: summaryData.slice(0, 10).map(u => u.used),
                            backgroundColor: 'rgba(99, 102, 241, 0.8)',
                            borderColor: '#6366f1',
                            borderWidth: 1,
                            borderRadius: 4,
                          },
                          {
                            label: 'Remaining',
                            data: summaryData.slice(0, 10).map(u => u.remaining),
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            borderColor: 'rgba(16, 185, 129, 0.4)',
                            borderWidth: 1,
                            borderRadius: 4,
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          x: { stacked: true, grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 9, weight: 'bold' } } },
                          y: { stacked: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94A3B8', font: { size: 10 } } }
                        },
                        plugins: {
                          legend: { position: 'bottom', labels: { color: '#CBD5E1', font: { size: 9, weight: 'bold' } } }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Green Zone: Reserves + History */}
          <div className="zone-card zone-green mt-[10px]">
            <div className="zone-accent" />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-[15px]">
              {/* Stats Column */}
              <div className="lg:col-span-4 flex flex-col sys-gap">
                <div className="flex-grow neu-raised p-[20px] rounded-2xl flex flex-col items-center justify-center text-center bg-[var(--bg-card)]">
                  <div className="neu-button neu-square p-4 text-indigo-500 mb-4">
                    <Landmark size={24} />
                  </div>
                  <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Total Team Reserve</h4>
                  <p className="text-[40px] font-black text-[var(--text-contrast)] leading-none">
                    {summaryData.reduce((s, u) => s + u.remaining, 0)}
                  </p>
                  <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-3">Available Days Remaining</p>
                </div>

                <div className="neu-raised p-[20px] rounded-2xl bg-[var(--bg-card)]">
                  <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-[15px] flex items-center sys-gap">
                    <AlertCircle size={14} className="text-rose-500 animate-pulse" /> Critical Attention
                  </h4>
                  <div className="space-y-[8px]">
                    {summaryData.filter(u => u.remaining < 3).slice(0, 3).map(u => (
                      <div key={u.id} className="flex items-center justify-between p-[8px] bg-danger-light rounded-[6px]">
                        <span className="text-[11px] font-black text-[var(--text-main)] uppercase">{u.name}</span>
                        <span className="text-[11px] font-black text-danger">{u.remaining}D Left</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* History Column */}
              <div className="lg:col-span-8">
                <div className="neu-raised rounded-2xl overflow-hidden h-full flex flex-col bg-[var(--bg-card)]">
                  <div className="px-[20px] py-[15px] border-b border-[var(--border)] bg-indigo-500/5 flex justify-between items-center">
                    <div className="flex items-center sys-gap">
                      <List className="text-indigo-400 animate-pulse" size={14} />
                      <h3 className="text-[11px] font-black text-[var(--text-contrast)] uppercase tracking-[0.2em]">Leave History {selectedYear === 'ALL' ? 'Lifetime' : selectedYear}</h3>
                    </div>
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest neu-inset px-[12px] py-[4px] rounded-full">
                      {currentYearEntries.length} Records Detected
                    </span>
                  </div>
                  
                  <div className="flex-grow max-h-[350px] overflow-y-auto custom-scrollbar">
                    {currentYearEntries.length === 0 ? (
                      <div className="p-[40px] text-center text-[var(--text-muted)] text-[11px] font-bold uppercase italic">No leave records synchronized for this period.</div>
                    ) : (
                      <table className="leave-table">
                        <thead className="sticky top-0 z-10 backdrop-blur-md">
                          <tr>
                            <th>Event Date</th>
                            <th className="text-center">Amount</th>
                            <th className="text-right">Reason / Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                          {currentYearEntries.map((entry, i) => {
                            let segments = [];
                            try { segments = typeof entry.leave_list === 'string' ? JSON.parse(entry.leave_list) : (entry.leave_list || []); } catch (e) {}
                            const totalDays = segments.reduce((sum, seg) => {
                              const h = Math.abs(differenceInMinutes(parseISO(seg.LeaveEnd || seg.End), parseISO(seg.LeaveStart || seg.Start))) / 60;
                              return sum + (h >= 8 ? 1 : h >= 3 ? 0.5 : h / 9);
                            }, 0);

                            return (
                              <tr key={entry.id} style={{ backgroundColor: i % 2 === 0 ? 'var(--row-odd)' : 'var(--row-even)' }}>
                                <td className="text-[12px] font-bold text-[var(--text-main)] uppercase">
                                  {segments.length > 0 ? format(parseISO(segments[0].LeaveStart || segments[0].Start), 'EEEE, MMM dd, yyyy') : '-'}
                                </td>
                                <td className="text-center">
                                  <span className="badge-done">
                                    {totalDays.toFixed(1)} Days
                                  </span>
                                </td>
                                <td className="text-right text-[12px] text-[var(--text-muted)] font-bold truncate max-w-[300px]">
                                  {entry.leave_reason || '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-[10px] m-[10px]">
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 sys-p mb-4">
            <div>
              <div className="flex items-center sys-gap mb-2">
                <div className="w-2.5 h-8 bg-indigo-500 rounded-full" />
                <h2 className="text-[28px] font-black text-[var(--text-main)] uppercase tracking-tight italic leading-none">Team <span className="text-indigo-400">Overview</span></h2>
              </div>
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Aggregate leave statistics for Vietnam operations</p>
            </div>
            <div className="flex gap-4">
              <div className="neu-raised px-6 py-4 rounded-2xl text-center min-w-[130px] bg-[var(--bg-card)]">
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Users</p>
                <p className="text-[28px] font-black text-[var(--text-contrast)] tracking-tighter leading-none">{summaryData.length}</p>
              </div>
              <div className="neu-raised px-6 py-4 rounded-2xl text-center min-w-[130px] bg-[var(--bg-card)] border border-indigo-500/10">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-wider mb-1">Avg Used</p>
                <p className="text-[28px] font-black text-indigo-500 tracking-tighter leading-none">
                  {summaryData.length ? (summaryData.reduce((s, u) => s + u.used, 0) / summaryData.length).toFixed(1) : 0}D
                </p>
              </div>
            </div>
          </div>

          <div className="neu-raised overflow-hidden rounded-3xl bg-[var(--bg-card)]">
            <table className="leave-table">
              <thead>
                <tr>
                  <th>User Intelligence</th>
                  <th>Team</th>
                  <th className="text-center">Seniority</th>
                  <th className="text-center">Allowance</th>
                  <th className="text-center">Used</th>
                  <th className="text-center">Remaining</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {summaryData.map((u, i) => (
                  <tr 
                    key={u.id} 
                    className="team-row cursor-pointer" 
                    style={{ backgroundColor: i % 2 === 0 ? 'var(--row-odd)' : 'var(--row-even)' }}
                    onClick={() => { setSelectedUser(u.name); setViewMode('personal'); }}
                  >
                    <td>
                      <div className="flex items-center gap-[15px]">
                        <div className="team-avatar">
                          {u.name[0]}
                        </div>
                        <div className="team-name">{u.name}</div>
                      </div>
                    </td>
                    <td>
                      <span className="sys-px py-[5px] rounded-[4px] bg-[var(--bg-surface)] border border-[var(--border)] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{u.team}</span>
                    </td>
                    <td className="text-center text-[12px] font-bold text-[var(--text-muted)]">{u.seniority} Yrs</td>
                    <td className="text-center">
                      <span className="text-[14px] font-black text-accent">{u.allowance}</span>
                    </td>
                    <td className="text-center">
                      <span className="text-[14px] font-black text-done">{u.used}</span>
                    </td>
                    <td className="text-center">
                      <span className={`text-[14px] font-black ${u.remaining < 3 ? 'text-danger' : 'text-[var(--text-main)]'}`}>{u.remaining}</span>
                    </td>
                    <td className="text-right">
                      <div className="progress-bar-bg">
                        <div 
                          className="progress-bar-fill" 
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
      )}
    </div>
  );
};

export default AnnualLeave;
