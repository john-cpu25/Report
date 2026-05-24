import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Trash2, Plus, Clock, Award, Info, AlertCircle, Users, User, LayoutGrid, List, Landmark, TrendingUp, ChevronDown } from 'lucide-react';
import { format, differenceInYears, parseISO, startOfYear, endOfYear, isWithinInterval, differenceInMinutes } from 'date-fns';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
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
  const { user: currentUser, isAdmin } = useAuth();
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

  // Filtered users by team (excluding MANAGER and ADMIN)
  const filteredUsersByTeam = useMemo(() => {
    const nonManagerUsers = users.filter(u => 
      u.team?.toUpperCase() !== 'MANAGER' && 
      !u.name?.toUpperCase().includes('ADMIN')
    );
    
    if (isAdmin) {
      if (selectedTeam === 'ALL') return nonManagerUsers;
      return nonManagerUsers.filter(u => u.team === selectedTeam);
    } else {
      const myTeam = currentUser?.team;
      return nonManagerUsers.filter(u => u.team === myTeam);
    }
  }, [users, selectedTeam, isAdmin, currentUser]);

  const teamOptions = useMemo(() => {
    const teams = new Set();
    users.forEach(u => { 
      if (u.team && u.team.toUpperCase() !== 'MANAGER' && !u.name?.toUpperCase().includes('ADMIN')) teams.add(u.team);
    });
    
    const allTeams = Array.from(teams).sort();
    if (isAdmin) {
      return ['ALL', ...allTeams];
    } else {
      return [currentUser?.team].filter(Boolean);
    }
  }, [users, isAdmin, currentUser]);

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

  const totalAllowance = useMemo(() => {
    let base = 15;
    if (selectedYear === 'ALL') {
      base = 15 * Math.max(1, seniority);
    }
    return base;
  }, [seniority, selectedYear]);

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
      let uAllowance = 15;
      if (selectedYear === 'ALL') {
        uAllowance = 15 * Math.max(1, uSeniority);
      }
      
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
        startDate: uStart,
        seniority: uSeniority,
        allowance: uAllowance,
        used: uUsed,
        remaining: Math.max(0, uAllowance - uUsed)
      };
    }).sort((a, b) => {
      if (a.team < b.team) return -1;
      if (a.team > b.team) return 1;
      return b.used - a.used;
    });
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
      <div className="leave-header-bar flex flex-wrap items-center justify-between gap-8">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="neu-button neu-square p-4 text-indigo-500">
              <Landmark size={24} />
            </div>
            <div>
              <h2 className="text-[12px] font-black text-indigo-500 uppercase tracking-widest leading-none">ANNUAL LEAVE</h2>
            </div>
          </div>

          <div className="h-12 w-px bg-[var(--border)] opacity-50" />

          <div className="flex gap-4">
            <button 
              onClick={() => setViewMode('personal')}
              title="Personal + Analytics"
              className={`neu-button w-[46px] h-[46px] rounded-2xl flex items-center justify-center p-0 ${viewMode === 'personal' ? 'active text-indigo-500' : ''}`}
            >
              <User size={20} />
            </button>
            <button 
              onClick={() => setViewMode('team')}
              title="Team Summary"
              className={`neu-button w-[46px] h-[46px] rounded-2xl flex items-center justify-center p-0 ${viewMode === 'team' ? 'active text-indigo-500' : ''}`}
            >
              <LayoutGrid size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border)] rounded-full pl-[24px] pr-[10px] py-[8px] shadow-sm hover:shadow-md transition-shadow min-w-[160px]">
            <span className="font-medium text-[14px] uppercase tracking-wider text-[var(--text-main)] pointer-events-none">
              {selectedYear === 'ALL' ? 'YEARS' : selectedYear}
            </span>
            <div className="w-[28px] h-[28px] rounded-full border-[2px] border-indigo-500 flex items-center justify-center text-indigo-500 pointer-events-none">
              <ChevronDown size={14} strokeWidth={3} />
            </div>
            <select 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
            >
              <option value="2024" className="leave-select-option">2024</option>
              <option value="2025" className="leave-select-option">2025</option>
              <option value="2026" className="leave-select-option">2026</option>
              <option value="ALL" className="leave-select-option">YEARS</option>
            </select>
          </div>

          <div className="relative flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border)] rounded-full pl-[24px] pr-[10px] py-[8px] shadow-sm hover:shadow-md transition-shadow min-w-[160px]">
            <span className="font-medium text-[14px] uppercase tracking-wider text-[var(--text-main)] pointer-events-none">
              {isAdmin 
                ? (selectedTeam === 'ALL' ? 'TEAMS' : selectedTeam)
                : (currentUser?.team || 'MY TEAM')
              }
            </span>
            <div className="w-[28px] h-[28px] rounded-full border-[2px] border-indigo-500 flex items-center justify-center text-indigo-500 pointer-events-none">
              <ChevronDown size={14} strokeWidth={3} />
            </div>
            <select 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              value={isAdmin ? selectedTeam : currentUser?.team}
              onChange={e => { if (isAdmin) setSelectedTeam(e.target.value); }}
              disabled={!isAdmin}
            >
              {teamOptions.map(t => <option key={t} value={t} className="leave-select-option">{t === 'ALL' ? 'TEAMS' : t}</option>)}
            </select>
          </div>

          {viewMode === 'personal' && (
            <div className="relative flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border)] rounded-full pl-[24px] pr-[10px] py-[8px] shadow-sm hover:shadow-md transition-shadow min-w-[160px]">
              <span className="font-medium text-[14px] uppercase tracking-wider text-[var(--text-main)] pointer-events-none">
                {selectedUser ? (filteredUsersByTeam.find(u => (u.name || u.email) === selectedUser)?.name || selectedUser) : 'MEMBERS'}
              </span>
              <div className="w-[28px] h-[28px] rounded-full border-[2px] border-indigo-500 flex items-center justify-center text-indigo-500 pointer-events-none">
                <ChevronDown size={14} strokeWidth={3} />
              </div>
              <select 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
              >
                {filteredUsersByTeam.map(u => (
                  <option key={u.id} value={u.name || u.email} className="leave-select-option">{u.name || u.email}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'personal' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-[10px] m-[10px]">
          {/* Orange Zone: Individual + Analytics */}
          <div className="zone-card zone-orange">
            <div className="zone-accent" />
            
            <div className="flex flex-col gap-[15px]">


              <div className="flex flex-col lg:flex-row gap-[20px] items-stretch">
                {/* Right: Analytics Chart */}
                <div className="flex-grow leave-chart-card">
                  <div className="h-[350px]">
                    <Bar 
                      data={{
                        labels: summaryData.map(u => u.name),
                        datasets: [
                          {
                            label: 'Used',
                            data: summaryData.map(u => u.used),
                            backgroundColor: 'rgba(99, 102, 241, 0.3)',
                            borderColor: '#6366f1',
                            borderWidth: 1,
                            borderRadius: 4,
                            maxBarThickness: 40,
                          },
                          {
                            label: 'Remaining',
                            data: summaryData.map(u => u.remaining),
                            backgroundColor: summaryData.map(u => 
                              u.seniority >= 1 ? 'rgba(249, 115, 22, 0.15)' : 'rgba(16, 185, 129, 0.15)'
                            ),
                            borderColor: summaryData.map(u => 
                              u.seniority >= 1 ? 'rgba(249, 115, 22, 0.4)' : 'rgba(16, 185, 129, 0.4)'
                            ),
                            borderWidth: 1,
                            borderRadius: 4,
                            maxBarThickness: 40,
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
              {/* History Column */}
              <div className="lg:col-span-12">
                <div className="leave-history-card">
                  <div className="px-[20px] py-[15px] border-b border-[var(--border)] bg-indigo-500/5 flex justify-between items-center">
                    <div className="flex items-center sys-gap">
                      <List className="text-indigo-400 animate-pulse" size={14} />
                      <h3 className="text-[14px] font-black text-[var(--text-contrast)] uppercase">Leave History {selectedYear === 'ALL' ? '' : selectedYear}</h3>
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="leave-table-wrapper">
            <table className="leave-table">
              <thead>
                <tr>
                  <th className="th-primary sticky z-[35] text-left border-b border-r border-[var(--border)]" style={{ top: '0px', paddingLeft: '12px', paddingRight: '12px' }}>Team</th>
                  <th className="th-primary sticky z-[35] text-left border-b border-r border-[var(--border)]" style={{ top: '0px', paddingLeft: '12px', paddingRight: '12px' }}>USER</th>
                  <th className="th-primary sticky z-[35] text-center border-b border-r border-[var(--border)]" style={{ top: '0px' }}>Start</th>
                  <th className="th-primary sticky z-[35] text-center border-b border-r border-[var(--border)]" style={{ top: '0px' }}>Seniority</th>
                  <th className="th-primary sticky z-[35] text-center border-b border-r border-[var(--border)]" style={{ top: '0px' }}>Allowance</th>
                  <th className="th-primary sticky z-[35] text-center border-b border-r border-[var(--border)]" style={{ top: '0px' }}>Used</th>
                  <th className="th-primary sticky z-[35] text-center border-b border-r border-[var(--border)]" style={{ top: '0px' }}>Remaining</th>
                  <th className="th-primary sticky z-[35] text-right border-b border-[var(--border)]" style={{ top: '0px', paddingRight: '16px' }}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {summaryData.map((u, i) => {
                  const isFirstOfTeam = i === 0 || summaryData[i - 1].team !== u.team;
                  let teamRowCount = 1;
                  if (isFirstOfTeam) {
                    for (let j = i + 1; j < summaryData.length; j++) {
                      if (summaryData[j].team === u.team) teamRowCount++;
                      else break;
                    }
                  }

                  return (
                    <tr 
                      key={u.id} 
                      className="team-row cursor-pointer" 
                      style={{ backgroundColor: i % 2 === 0 ? 'var(--row-odd)' : 'var(--row-even)' }}
                      onClick={() => { setSelectedUser(u.name); setViewMode('personal'); }}
                    >
                      {isFirstOfTeam && (
                        <td 
                          rowSpan={teamRowCount} 
                          className="align-middle border-r border-[var(--border)] bg-[var(--bg-surface)]/30"
                        >
                          <span className="text-[14px] font-normal text-indigo-500 uppercase tracking-widest px-2">{u.team}</span>
                        </td>
                      )}
                      <td>
                        <div className="flex items-center gap-[15px]">
                          <div className="team-name">{u.name}</div>
                        </div>
                      </td>
                      <td className="text-center text-[14px] font-normal text-[var(--text-muted)]">
                        {u.startDate ? format(parseISO(u.startDate), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="text-center text-[14px] font-normal text-[var(--text-muted)]">{u.seniority} Yrs</td>
                      <td className="text-center">
                        <span className="text-[14px] font-normal text-accent">{u.allowance}</span>
                      </td>
                      <td className="text-center">
                        <span className="text-[14px] font-normal text-done">{u.used}</span>
                      </td>
                      <td className="text-center">
                        <span className={`text-[14px] font-normal ${u.remaining < 3 ? 'text-danger' : 'text-[var(--text-main)]'}`}>{u.remaining}</span>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AnnualLeave;
