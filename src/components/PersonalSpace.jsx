import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import UnifiedTable from './CSVProcessor/UnifiedTable';
import { User, Target, TrendingUp, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

const PersonalSpace = () => {
  const { analystTasks, columnOptions, setColumnFilters, columnFilters, sortConfig, handleSort } = useApp();
  const { user } = useAuth();

  // Filter only current user's tasks
  const myTasks = useMemo(() => {
    if (!user || !analystTasks) return [];
    const myName = user.name?.toLowerCase() || '';
    const myEmail = user.username?.toLowerCase() || '';
    
    return analystTasks.filter(t => 
      t.userName?.toLowerCase() === myName || 
      t.userName?.toLowerCase() === myEmail
    );
  }, [analystTasks, user]);

  const stats = useMemo(() => {
    const total = myTasks.length;
    const completed = myTasks.filter(t => t.dateCompleteStr !== '-').length;
    return { total, completed };
  }, [myTasks]);

  return (
    <div className="space-y-[10px] animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-[10px]">
        <div>
          <h2 className="text-[30px] font-black text-[var(--text-contrast)] uppercase italic tracking-tighter flex items-center gap-[10px]">
            <User size={32} className="text-emerald-500" />
            My <span className="text-emerald-400">Space</span>
          </h2>
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em] mt-2">
            Personal Performance & Task Intelligence
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[10px]">
        <div className="ocd-card bg-emerald-500/5 border-emerald-500/10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Tasks</p>
              <h3 className="text-3xl font-black text-[var(--text-contrast)] tracking-tighter">{stats.total}</h3>
            </div>
            <Target className="text-emerald-500/20" size={40} />
          </div>
        </div>
        <div className="ocd-card bg-indigo-500/5 border-indigo-500/10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Completed</p>
              <h3 className="text-3xl font-black text-[var(--text-contrast)] tracking-tighter">{stats.completed}</h3>
            </div>
            <TrendingUp className="text-indigo-500/20" size={40} />
          </div>
        </div>
      </div>

      {/* Personal Data Table */}
      <div className="ocd-card p-0 overflow-hidden">
        <div className="p-[10px] border-b border-[var(--border)] flex items-center gap-2">
          <Calendar size={16} className="text-amber-500" />
          <h3 className="text-[11px] font-black text-[var(--text-contrast)] uppercase tracking-[0.2em]">Weekly Task Detail</h3>
        </div>
        <UnifiedTable 
          data={myTasks}
          columnFilters={columnFilters}
          setColumnFilters={setColumnFilters}
          sortConfig={sortConfig}
          handleSort={handleSort}
          columnOptions={columnOptions}
        />
      </div>
    </div>
  );
};

export default PersonalSpace;
