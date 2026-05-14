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
    <div className="w-full space-y-[10px] pb-12">
      {/* Control Header */}
      <div className="bg-[var(--bg-card)] p-[10px] border border-[var(--border)] rounded-[8px] flex flex-wrap items-center justify-between gap-[10px] m-[10px] shadow-sm">
        <div className="flex items-center gap-[10px]">
          <div className="flex items-center gap-[10px]">
            <div className="p-[10px] rounded-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Landmark size={20} />
            </div>
            <div>
              <h2 className="text-[14px] font-black text-indigo-500 uppercase tracking-widest leading-none">VN Annual Leave</h2>
              <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-1">Management Dashboard</p>
            </div>
          </div>

          <div className="h-10 w-px bg-[var(--border)]" />

          <div className="flex items-center gap-[10px] p-[10px] bg-indigo-500/5 rounded-[8px] border border-indigo-500/10">
            <button 
              onClick={() => setViewMode('personal')}
              className={`flex items-center gap-[10px] px-[15px] py-[10px] rounded-[8px] text-[14px] font-black uppercase tracking-widest transition-all ${viewMode === 'personal' ? 'bg-indigo-500 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-indigo-500'}`}
            >
              <User size={14} /> Individual + Analytics
            </button>
            <button 
              onClick={() => setViewMode('team')}
              className={`flex items-center gap-[10px] px-[15px] py-[10px] rounded-[8px] text-[14px] font-black uppercase tracking-widest transition-all ${viewMode === 'team' ? 'bg-indigo-500 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-indigo-500'}`}
            >
              <LayoutGrid size={14} /> Team Summary
            </button>
          </div>
        </div>

        <div className="flex items-center gap-[10px]">
          <div className="flex items-center gap-[10px] bg-indigo-500/5 px-[15px] py-[10px] rounded-[8px] border border-indigo-500/10">
            <Calendar size={14} className="text-indigo-400" />
            <select 
              className="bg-transparent text-[11px] font-black text-indigo-500 outline-none cursor-pointer uppercase"
              style={{ colorScheme: 'dark' }}
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
            >
              <option value="2024" className="bg-[#161B26] text-white">YEAR 2024</option>
              <option value="2025" className="bg-[#161B26] text-white">YEAR 2025</option>
              <option value="2026" className="bg-[#161B26] text-white">YEAR 2026</option>
              <option value="ALL" className="bg-[#161B26] text-white">ALL DATA (CUMULATIVE)</option>
            </select>
          </div>

          <div className="flex items-center gap-[10px] bg-indigo-500/5 px-[15px] py-[10px] rounded-[8px] border border-indigo-500/10">
            <Users size={14} className="text-indigo-400" />
            <select 
              className="bg-transparent text-[11px] font-black text-indigo-500 outline-none cursor-pointer uppercase"
              style={{ colorScheme: 'dark' }}
              value={selectedTeam}
              onChange={e => setSelectedTeam(e.target.value)}
            >
              {teamOptions.map(t => <option key={t} value={t} className="bg-[#161B26] text-white">{t === 'ALL' ? 'ALL TEAMS' : t}</option>)}
            </select>
          </div>

          {viewMode === 'personal' && (
            <div className="flex items-center gap-[10px] bg-[var(--bg-surface)] px-[15px] py-[10px] rounded-[8px] border border-[var(--border)]">
              <User size={14} className="text-[var(--text-muted)]" />
              <select 
                className="bg-transparent text-[11px] font-black text-[var(--text-main)] outline-none cursor-pointer min-w-[150px]"
                style={{ colorScheme: 'dark' }}
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
              >
                <option value="ADMIN" className="bg-[#161B26] text-white">SYSTEM ADMIN</option>
                {filteredUsersByTeam.map(u => (
                  <option key={u.id} value={u.name || u.email} className="bg-[#161B26] text-white">{u.name || u.email}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'personal' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-[10px] m-[10px]">
          {/* Orange Zone: Individual + Analytics */}
          <div className="border-[2px] border-orange-500/30 rounded-[12px] p-[15px] bg-orange-500/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-orange-500/40" />
            
            <div className="flex flex-col gap-[15px]">
              <div className="flex items-center gap-[10px] mb-[10px]">
                <div className="w-2 h-8 bg-indigo-500 rounded-[8px]" />
                <h1 className="text-[28px] font-black text-[var(--text-main)] uppercase tracking-tight italic">
                  {selectedUser.split(' ')[0]}'s <span className="text-indigo-400">Leave</span>
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
                  <div className="flex items-center gap-[10px] mb-[15px]">
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
          <div className="border-[2px] border-emerald-500/30 rounded-[12px] p-[15px] bg-emerald-500/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500/40" />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-[15px]">
              {/* Stats Column */}
              <div className="lg:col-span-4 flex flex-col gap-[10px]">
                <div className="flex-grow bg-[var(--bg-card)] border border-[var(--border)] p-[20px] rounded-[8px] flex flex-col items-center justify-center text-center shadow-sm">
                  <div className="p-[15px] rounded-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4">
                    <Landmark size={24} />
                  </div>
                  <h4 className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Total Team Reserve</h4>
                  <p className="text-[40px] font-black text-[var(--text-main)] leading-none">
                    {summaryData.reduce((s, u) => s + u.remaining, 0)}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-2">Available Days Remaining</p>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border)] p-[15px] rounded-[8px]">
                  <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-[15px] flex items-center gap-[10px]">
                    <AlertCircle size={12} /> Critical Attention
                  </h4>
                  <div className="space-y-[8px]">
                    {summaryData.filter(u => u.remaining < 3).slice(0, 3).map(u => (
                      <div key={u.id} className="flex items-center justify-between p-[8px] bg-rose-500/5 border border-rose-500/10 rounded-[6px]">
                        <span className="text-[11px] font-black text-[var(--text-main)] uppercase">{u.name}</span>
                        <span className="text-[11px] font-black text-rose-400">{u.remaining}D Left</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* History Column */}
              <div className="lg:col-span-8">
                <div className="bg-[var(--bg-card)] overflow-hidden border border-[var(--border)] rounded-[8px] shadow-sm h-full flex flex-col">
                  <div className="px-[20px] py-[12px] border-b border-[var(--border)] bg-indigo-500/5 flex justify-between items-center">
                    <div className="flex items-center gap-[10px]">
                      <List className="text-indigo-400" size={14} />
                      <h3 className="text-[12px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Leave History {selectedYear === 'ALL' ? 'Lifetime' : selectedYear}</h3>
                    </div>
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-[10px] py-[4px] rounded-[4px] border border-indigo-500/20">
                      {currentYearEntries.length} Records Detected
                    </span>
                  </div>
                  
                  <div className="flex-grow max-h-[350px] overflow-y-auto custom-scrollbar">
                    {currentYearEntries.length === 0 ? (
                      <div className="p-[40px] text-center text-[var(--text-muted)] text-[11px] font-bold uppercase italic">No leave records synchronized for this period.</div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-indigo-500/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)] sticky top-0 z-10 backdrop-blur-md">
                          <tr>
                            <th className="px-[20px] py-[12px]">Event Date</th>
                            <th className="px-[20px] py-[12px] text-center">Amount</th>
                            <th className="px-[20px] py-[12px] text-right">Reason / Description</th>
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
                              <tr key={entry.id} className="hover:bg-indigo-500/5 transition-colors" style={{ backgroundColor: i % 2 === 0 ? 'var(--row-odd)' : 'var(--row-even)' }}>
                                <td className="px-[20px] py-[12px] text-[12px] font-bold text-[var(--text-main)] uppercase">
                                  {segments.length > 0 ? format(parseISO(segments[0].LeaveStart || segments[0].Start), 'EEEE, MMM dd, yyyy') : '-'}
                                </td>
                                <td className="px-[20px] py-[12px] text-center">
                                  <span className="px-[8px] py-[3px] rounded-[4px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase">
                                    {totalDays.toFixed(1)} Days
                                  </span>
                                </td>
                                <td className="px-[20px] py-[12px] text-right text-[12px] text-[var(--text-muted)] font-bold truncate max-w-[300px]">
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
          <div className="flex justify-between items-end p-[10px]">
            <div>
              <h2 className="text-[30px] font-black text-[var(--text-main)] uppercase tracking-tight italic leading-none">Team <span className="text-indigo-400">Overview</span></h2>
              <p className="text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2">Aggregate leave statistics for Vietnam operations</p>
            </div>
            <div className="flex gap-[10px]">
              <div className="bg-[var(--bg-card)] p-[15px] rounded-[8px] border border-[var(--border)] text-center min-w-[120px] shadow-sm">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase mb-1">Total Users</p>
                <p className="text-[24px] font-black text-[var(--text-main)]">{summaryData.length}</p>
              </div>
              <div className="bg-indigo-500/10 p-[15px] rounded-[8px] border border-indigo-500/20 text-center min-w-[120px] shadow-sm">
                <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Avg Used</p>
                <p className="text-[24px] font-black text-[var(--text-main)]">
                  {summaryData.length ? (summaryData.reduce((s, u) => s + u.used, 0) / summaryData.length).toFixed(1) : 0}D
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] overflow-hidden border border-[var(--border)] shadow-xl rounded-[8px]">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-indigo-500/5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] border-b border-[var(--border)]">
                  <th className="px-[20px] py-[15px]">User Intelligence</th>
                  <th className="px-[20px] py-[15px]">Team</th>
                  <th className="px-[20px] py-[15px] text-center">Seniority</th>
                  <th className="px-[20px] py-[15px] text-center">Allowance</th>
                  <th className="px-[20px] py-[15px] text-center">Used</th>
                  <th className="px-[20px] py-[15px] text-center">Remaining</th>
                  <th className="px-[20px] py-[15px] text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {summaryData.map((u, i) => (
                  <tr 
                    key={u.id} 
                    className="group hover:bg-indigo-500/10 transition-all cursor-pointer" 
                    style={{ backgroundColor: i % 2 === 0 ? 'var(--row-odd)' : 'var(--row-even)' }}
                    onClick={() => { setSelectedUser(u.name); setViewMode('personal'); }}
                  >
                    <td className="px-[20px] py-[15px]">
                      <div className="flex items-center gap-[15px]">
                        <div className="w-10 h-10 rounded-[8px] bg-[var(--bg-surface)] flex items-center justify-center text-indigo-500 font-black border border-[var(--border)] group-hover:scale-110 transition-transform">
                          {u.name[0]}
                        </div>
                        <div className="text-[14px] font-black text-[var(--text-main)] group-hover:text-indigo-500 transition-colors uppercase tracking-tight">{u.name}</div>
                      </div>
                    </td>
                    <td className="px-[20px] py-[15px]">
                      <span className="px-[10px] py-[5px] rounded-[4px] bg-[var(--bg-surface)] border border-[var(--border)] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{u.team}</span>
                    </td>
                    <td className="px-[20px] py-[15px] text-center text-[12px] font-bold text-[var(--text-muted)]">{u.seniority} Yrs</td>
                    <td className="px-[20px] py-[15px] text-center">
                      <span className="text-[14px] font-black text-indigo-500">{u.allowance}</span>
                    </td>
                    <td className="px-[20px] py-[15px] text-center">
                      <span className="text-[14px] font-black text-emerald-400">{u.used}</span>
                    </td>
                    <td className="px-[20px] py-[15px] text-center">
                      <span className={`text-[14px] font-black ${u.remaining < 3 ? 'text-rose-400' : 'text-[var(--text-main)]'}`}>{u.remaining}</span>
                    </td>
                    <td className="px-[20px] py-[15px] text-right">
                      <div className="w-24 h-2 bg-[var(--bg-surface)] rounded-[8px] overflow-hidden ml-auto">
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
      )}
    </div>
  );
};

export default AnnualLeave;
