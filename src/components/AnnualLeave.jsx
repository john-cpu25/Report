import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Trash2, Plus, Clock, Award, Info, AlertCircle, Users, User, LayoutGrid, List, Landmark, TrendingUp, ChevronDown, CalendarDays } from 'lucide-react';
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
import NeumorphicDropdown from './buttons/NeumorphicDropdown';
import NeumorphicSearch from './buttons/NeumorphicSearch';
import OvertimeLeaveView from './AnnualLeave/OvertimeLeaveView';
import LeaveScheduleView from './AnnualLeave/LeaveScheduleView';
import ThreeDLeaveChart from './AnnualLeave/ThreeDLeaveChart';
import { getThreeMonthsAgoISO } from '../utils/timeUtils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

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
  const [viewMode, setViewMode] = useState('personal'); // 'personal' | 'team' | 'overtime'
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Persistent OT Conversions
  const [otConversions, setOtConversions] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_ot_conversions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('apex_ot_conversions', JSON.stringify(otConversions));
    } catch (e) {}
  }, [otConversions]);

  // Settings & Data State (indexed by selectedUser)
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(10); // default October
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleSubView, setScheduleSubView] = useState('daily');
  const [leaveEntries, setLeaveEntries] = useState([]);

  const [allLeaveEntries, setAllLeaveEntries] = useState([]);

  // Fetch Users and Leave Data from Supabase (giới hạn 3 tháng)
  const fetchLeaveData = async () => {
    setIsLoadingUsers(true);
    try {
      const threeMonthsAgoIso = getThreeMonthsAgoISO(3);

      // 1. Fetch Vietnam Users
      const { data: userData, error: userError } = await supabase
        .from('APEX_User')
        .select('id, name, email, team, location')
        .ilike('location', 'VIETNAM')
        .order('name');
        
      if (userError) throw userError;
      setUsers(userData || []);

      // 2. Fetch Leave Entries (3 months)
      let combinedLeaves = [];

      // Ưu tiên APEX_Leave và APEX_Leave_Span
      const [apexLeaveRes, apexSpanRes] = await Promise.all([
        supabase.from('APEX_Leave').select('*').gte('created_at', threeMonthsAgoIso),
        supabase.from('APEX_Leave_Span').select('*').gte('start_at', threeMonthsAgoIso)
      ]);

      if (apexLeaveRes.data && apexSpanRes.data && apexLeaveRes.data.length > 0) {
        const leaveById = {};
        apexLeaveRes.data.forEach(l => { leaveById[l.id] = l; });
        
        apexSpanRes.data.forEach(span => {
          const l = leaveById[span.leave_id];
          if (l && l.status === 'approved') {
            combinedLeaves.push({
              id: span.id,
              create_by: l.user_id,
              user_id: l.user_id,
              start_at: span.start_at,
              end_at: span.end_at,
              leave_reason: l.reason || 'Nghỉ phép',
              type: l.kind || 'Annual Leave',
              status: l.status,
              created_at: l.created_at,
              leave_list: [{
                Start: span.start_at,
                End: span.end_at,
                LeaveStart: span.start_at,
                LeaveEnd: span.end_at
              }]
            });
          }
        });
      }

      // Fallback thêm từ NMK_Leave (nếu có, giới hạn 3 tháng)
      const { data: nmkLeaveData } = await supabase
        .from('NMK_Leave')
        .select('*')
        .gte('created_at', threeMonthsAgoIso)
        .order('created_at', { ascending: false });

      if (nmkLeaveData && nmkLeaveData.length > 0) {
        combinedLeaves = [...combinedLeaves, ...nmkLeaveData];
      }

      setAllLeaveEntries(combinedLeaves);
    } catch (err) {
      console.error('Failed to fetch data from Supabase:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
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
    const targetUser = users.find(u => (u.name || u.email) === (selectedUser === 'ADMIN' ? 'ADMIN' : selectedUser));
    const targetOtDays = targetUser ? otConversions
      .filter(c => c.userId === targetUser.id && c.conversionType === 'allowance')
      .reduce((sum, c) => sum + (Number(c.leaveDays) || 0), 0) : 0;
    return base + targetOtDays;
  }, [seniority, selectedYear, users, selectedUser, otConversions]);

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

      const uOtDays = otConversions
        .filter(c => c.userId === u.id && c.conversionType === 'allowance')
        .reduce((sum, c) => sum + (Number(c.leaveDays) || 0), 0);
      const effectiveAllowance = uAllowance + uOtDays;

      return {
        id: u.id,
        name: uName,
        team: u.team || '-',
        startDate: uStart,
        seniority: uSeniority,
        allowance: effectiveAllowance,
        baseAllowance: uAllowance,
        otLeaveDays: uOtDays,
        used: uUsed,
        remaining: Math.max(0, effectiveAllowance - uUsed)
      };
    }).sort((a, b) => {
      if (a.team < b.team) return -1;
      if (a.team > b.team) return 1;
      return b.used - a.used;
    });
  }, [filteredUsersByTeam, allLeaveEntries, otConversions]);

  useEffect(() => {
    if (summaryData.length > 0) {
      const totalUsedAcrossTeam = summaryData.reduce((s, u) => s + u.used, 0);
      console.log(`[UI SYNC] Summary calculated for ${summaryData.length} users. Total team USED: ${totalUsedAcrossTeam}`);
    }
  }, [summaryData]);

  return (
    <div className="tab-leave w-full h-full flex flex-col min-h-0 overflow-hidden">
      {/* Control Header (Neumorphic Action Bar) */}
      <div className="leave-header-bar flex-shrink-0 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-8">
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
              title="Team Summary (Hạn mức nghỉ phép)"
              className={`neu-button w-[46px] h-[46px] rounded-2xl flex items-center justify-center p-0 ${viewMode === 'team' ? 'active text-indigo-500' : ''}`}
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('schedule')}
              title="Leave Schedule (Lịch nghỉ chi tiết & Ma trận 12 tháng)"
              className={`neu-button w-[46px] h-[46px] rounded-2xl flex items-center justify-center p-0 ${viewMode === 'schedule' ? 'active text-emerald-500' : ''}`}
            >
              <CalendarDays size={20} />
            </button>
            <button 
              onClick={() => setViewMode('overtime')}
              title="Overtime - Quy đổi thành ngày nghỉ bù"
              className={`neu-button w-[46px] h-[46px] rounded-2xl flex items-center justify-center p-0 ${viewMode === 'overtime' ? 'active text-amber-500' : ''}`}
            >
              <Clock size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Neumorphic Search Bar (from Personal) */}
          <div className="w-[180px] sm:w-[220px]">
            <NeumorphicSearch 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search ..."
            />
          </div>

          {/* Month Dropdown (when in schedule view & daily mode) */}
          {viewMode === 'schedule' && scheduleSubView === 'daily' && (
            <NeumorphicDropdown
              className="min-w-[140px]"
              value={selectedMonth.toString()}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              options={MONTH_NAMES.map((name, i) => ({
                value: (i + 1).toString(),
                label: name.toUpperCase()
              }))}
            />
          )}

          <NeumorphicDropdown
            className="min-w-[120px]"
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            options={[
              { value: '2024', label: '2024' },
              { value: '2025', label: '2025' },
              { value: '2026', label: '2026' },
              { value: 'ALL', label: 'YEARS' }
            ]}
          />

          <NeumorphicDropdown
            className="min-w-[140px]"
            value={isAdmin ? selectedTeam : currentUser?.team}
            onChange={e => { if (isAdmin) setSelectedTeam(e.target.value); }}
            disabled={!isAdmin}
            defaultLabel={isAdmin ? 'TEAMS' : (currentUser?.team || 'MY TEAM')}
            options={teamOptions.map(t => ({ value: t, label: t === 'ALL' ? 'TEAMS' : t }))}
          />

          {viewMode === 'personal' && (
            <NeumorphicDropdown
              className="min-w-[160px]"
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              defaultLabel="MEMBERS"
              options={filteredUsersByTeam.map(u => ({ value: u.name || u.email, label: u.name || u.email }))}
            />
          )}
        </div>
      </div>

      {viewMode === 'personal' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="leave-chart-card flex-1 min-h-0 flex flex-col p-4">
            
            {/* Chart Sub-header: 100% English */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[var(--text-contrast)]">
                  ANNUAL LEAVE CHART
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  {summaryData.length} MEMBERS
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-0 w-full h-full">
              <ThreeDLeaveChart summaryData={summaryData} />
            </div>
          </div>
        </motion.div>
      )}

      {viewMode === 'team' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="leave-table-wrapper flex-1 min-h-0 overflow-auto">
            <table className="leave-table min-w-full">
              <thead>
                <tr>
                  <th className="th-primary sticky top-0 z-[35] text-left border-b border-r border-[var(--border)] bg-[var(--bg-card)]" style={{ paddingLeft: '12px', paddingRight: '12px' }}>Team</th>
                  <th className="th-primary sticky top-0 z-[35] text-left border-b border-r border-[var(--border)] bg-[var(--bg-card)]" style={{ paddingLeft: '12px', paddingRight: '12px' }}>USER</th>
                  <th className="th-primary sticky top-0 z-[35] text-center border-b border-r border-[var(--border)] bg-[var(--bg-card)]">Start</th>
                  <th className="th-primary sticky top-0 z-[35] text-center border-b border-r border-[var(--border)] bg-[var(--bg-card)]">Seniority</th>
                  <th className="th-primary sticky top-0 z-[35] text-center border-b border-r border-[var(--border)] bg-[var(--bg-card)]">Allowance</th>
                  <th className="th-primary sticky top-0 z-[35] text-center border-b border-r border-[var(--border)] bg-[var(--bg-card)]">Used</th>
                  <th className="th-primary sticky top-0 z-[35] text-center border-b border-r border-[var(--border)] bg-[var(--bg-card)]">Remaining</th>
                  <th className="th-primary sticky top-0 z-[35] text-right border-b border-[var(--border)] bg-[var(--bg-card)]" style={{ paddingRight: '16px' }}>Status</th>
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
                        <span className="text-[14px] font-normal text-accent">
                          {u.allowance}
                          {u.otLeaveDays > 0 && (
                            <span className="ml-1 text-[11px] font-bold text-amber-500" title={`Đã cộng ${u.otLeaveDays.toFixed(1)} ngày quy đổi từ Overtime`}>
                              (+{u.otLeaveDays.toFixed(1)} OT)
                            </span>
                          )}
                        </span>
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

      {viewMode === 'schedule' && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <LeaveScheduleView
            users={users}
            filteredUsersByTeam={filteredUsersByTeam}
            selectedTeam={selectedTeam}
            selectedYear={selectedYear}
            allLeaveEntries={allLeaveEntries}
            searchQuery={searchQuery}
            currentMonth={selectedMonth}
            setCurrentMonth={setSelectedMonth}
            subView={scheduleSubView}
            setSubView={setScheduleSubView}
          />
        </div>
      )}

      {viewMode === 'overtime' && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <OvertimeLeaveView
            users={users}
            filteredUsersByTeam={filteredUsersByTeam}
            selectedTeam={selectedTeam}
            selectedYear={selectedYear}
            isAdmin={isAdmin}
            currentUser={currentUser}
            allLeaveEntries={allLeaveEntries}
            otConversions={otConversions}
            setOtConversions={setOtConversions}
            searchQuery={searchQuery}
            onConversionSuccess={() => {
              fetchLeaveData();
            }}
          />
        </div>
      )}
    </div>
  );
};

export default AnnualLeave;
