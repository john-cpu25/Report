import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Trash2, Plus, Clock, Award, Info, AlertCircle, Users, User } from 'lucide-react';
import { format, differenceInYears, parseISO, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import EnergyBar from './EnergyBar';
import { supabase } from '../supabaseClient';

const AnnualLeave = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('ADMIN');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Settings & Data State (indexed by selectedUser)
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [leaveEntries, setLeaveEntries] = useState([]);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: 1, // 1 or 0.5
    note: ''
  });

  // Fetch Users from Supabase (to support "all users")
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const { data, error } = await supabase.from('NMK_User').select('id, name, email');
        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

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
    return currentYearEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
  }, [currentYearEntries]);

  const handleAddLeave = (e) => {
    e.preventDefault();
    if (!formData.date) return;

    const newEntry = {
      id: Date.now(),
      ...formData,
      createdAt: new Date().toISOString()
    };

    setLeaveEntries([newEntry, ...leaveEntries]);
    setFormData({ ...formData, note: '' }); 
  };

  const deleteEntry = (id) => {
    setLeaveEntries(leaveEntries.filter(e => e.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* User Selector Header */}
      <div className="glass-panel p-4 border-white/5 bg-slate-900/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase italic tracking-widest">User Intelligence</h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Select account to view/edit leave data</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <select 
              className="appearance-none bg-slate-950 border border-white/10 rounded-xl px-10 py-3 text-xs font-black text-indigo-400 focus:border-indigo-500 transition-all outline-none cursor-pointer pr-12 min-w-[200px]"
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
            >
              <option value="ADMIN">SYSTEM ADMIN</option>
              {users.map(u => (
                <option key={u.id} value={u.name || u.email}>{u.name || u.email}</option>
              ))}
            </select>
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover:text-indigo-400 transition-colors">
              <Plus size={14} className="rotate-45" />
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
            <span className="text-[10px] font-bold text-slate-500">{users.length + 1} ACCOUNTS</span>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-grow space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
            <h1 className="text-3xl font-black italic text-white uppercase tracking-tight">
              {selectedUser.split(' ')[0]}'s <span className="text-indigo-400">Leave</span>
            </h1>
          </div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] ml-5">Energy & Wellness Intelligence</p>
        </div>

        <div className="glass-panel p-4 flex items-center gap-6 border-white/5 bg-slate-900/40">
          <div className="space-y-1">
            <label className="!mb-0 text-[9px]">Work Start Date</label>
            <input 
              type="date" 
              className="bg-transparent border-none text-indigo-400 font-black text-sm p-0 focus:ring-0 cursor-pointer"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="w-[1px] h-10 bg-white/5" />
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Award size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Seniority</p>
              <p className="text-lg font-black text-white italic">{seniority} {seniority === 1 ? 'YEAR' : 'YEARS'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Stats & Animation */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 border-white/10 bg-gradient-to-br from-slate-900/80 to-indigo-950/20">
            <EnergyBar used={usedDays} total={totalAllowance} />
          </div>

          <div className="glass-panel p-5 border-indigo-500/10 bg-indigo-500/5 space-y-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Info size={16} />
              <h4 className="text-[10px] font-black uppercase tracking-widest">Policy Overview</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              Based on the seniority of <span className="text-indigo-300 font-bold">{seniority} years</span>, 
              this user is entitled to <span className="text-indigo-300 font-bold">{totalAllowance} days</span> of annual leave per year.
            </p>
            <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 flex items-start gap-3">
              <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-normal">
                Seniority {'>'} 1 year grants 15 days. Currently {totalAllowance} days allowance.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Form & History */}
        <div className="lg:col-span-8 space-y-6">
          {/* Entry Form */}
          <div className="glass-panel p-6 border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="text-indigo-400" size={18} />
              <h3 className="text-sm font-black text-white uppercase italic tracking-widest">Book Leave Request</h3>
            </div>

            <form onSubmit={handleAddLeave} className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 space-y-2">
                <label>Leave Date</label>
                <div className="relative">
                  <input 
                    type="date" 
                    className="input pl-10"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                </div>
              </div>

              <div className="md:col-span-3 space-y-2">
                <label>Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 1, label: 'Full Day' },
                    { val: 0.5, label: '1/2 Day' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setFormData({ ...formData, amount: opt.val })}
                      className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                        formData.amount === opt.val
                          ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20'
                          : 'bg-slate-950/40 text-slate-500 border-white/5 hover:border-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-3 space-y-2">
                <label>Reason / Note</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Optional note..." 
                  value={formData.note}
                  onChange={e => setFormData({ ...formData, note: e.target.value })}
                />
              </div>

              <div className="md:col-span-2 flex items-end">
                <button type="submit" className="btn btn-primary w-full h-[42px] gap-2">
                  <Plus size={16} />
                  ADD
                </button>
              </div>
            </form>
          </div>

          {/* History Log */}
          <div className="glass-panel overflow-hidden border-white/5">
            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Leave History {new Date().getFullYear()}</h3>
              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                {currentYearEntries.length} Entries
              </span>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {currentYearEntries.length === 0 ? (
                <div className="p-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center mx-auto text-slate-700">
                    <Calendar size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No Leave Records</p>
                    <p className="text-[10px] text-slate-600 font-medium mt-1 uppercase tracking-wider">Lịch sử nghỉ phép của {selectedUser} sẽ hiển thị ở đây.</p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white/[0.01] text-[9px] font-black uppercase tracking-widest text-slate-600 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3 text-center">Amount</th>
                      <th className="px-6 py-3">Note</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    <AnimatePresence initial={false}>
                      {currentYearEntries.map(entry => (
                        <motion.tr 
                          key={entry.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="group hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-6 py-4">
                            <span className="text-xs font-black text-slate-300 italic">
                              {format(parseISO(entry.date), 'EEEE, MMM dd, yyyy')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                              entry.amount === 1 
                                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                              {entry.amount === 1 ? '1.0 DAY' : '0.5 DAY'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-400 transition-colors">
                              {entry.note || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => deleteEntry(entry.id)}
                              className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
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
    </div>
  );
};

export default AnnualLeave;
