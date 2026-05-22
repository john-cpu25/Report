
import React from 'react';
import { motion } from 'framer-motion';
import { Search, Calendar, RefreshCw, Users, Table as TableIcon } from 'lucide-react';

const FilterBar = ({ 
  searchQuery, 
  setSearchQuery, 
  dateRange, 
  setDateRange, 
  selectedTeam, 
  setSelectedTeam, 
  groupBy, 
  setGroupBy, 
  teamOptions, 
  filteredDataCount,
  fetchSupabaseData,
  isLoading
}) => {

  const formatYMD = (d) => d.toISOString().split('T')[0];

  const handleMonthChange = (e) => {
    if (!e.target.value) return;
    const [y, m] = e.target.value.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    setDateRange({ start: formatYMD(start), end: formatYMD(end) });
  };

  const setPreset = (label) => {
    const d = new Date();
    let s;
    if (label === 'WEEK') {
      d.setDate(d.getDate() - d.getDay() + 1);
      s = formatYMD(d);
    } else if (label === 'MONTH') {
      s = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    } else {
      s = new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0];
    }
    setDateRange({ start: s, end: formatYMD(new Date()) });
  };

  return (
    <div className="ocd-card space-y-[10px]">
      <div className="flex flex-col xl:flex-row sys-gap">
        {/* Search */}
        <div className="relative flex-grow group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-indigo-400 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="SEARCH ACROSS PROJECTS, TASKS OR USERS..." 
            className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] py-4 pl-14 pr-4 text-xs font-black text-[var(--text-main)] focus:border-indigo-500/50 transition-all outline-none shadow-sm placeholder:text-[var(--text-muted)] placeholder:opacity-50 uppercase tracking-normal"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Date Controls */}
        <div className="flex flex-wrap items-center sys-gap">
          <div className="flex items-center sys-gap bg-[var(--bg-surface)] sys-p rounded-[8px] border border-[var(--border)] shadow-sm">
            <div className="flex items-center gap-2 px-3 border-r border-[var(--border)]">
              <Calendar size={14} className="text-indigo-500" />
              <input type="month" className="bg-transparent text-[11px] font-black text-[var(--text-main)] outline-none cursor-pointer uppercase"
                onChange={handleMonthChange} />
            </div>
            <div className="flex items-center gap-2 px-3">
              <input type="date" className="bg-transparent text-[11px] font-black text-[var(--text-main)] outline-none cursor-pointer uppercase"
                value={dateRange.start} onChange={e => setDateRange(p => ({...p, start: e.target.value}))} />
              <span className="text-[10px] font-bold text-[var(--text-muted)] mx-1">TO</span>
              <input type="date" className="bg-transparent text-[11px] font-black text-[var(--text-main)] outline-none cursor-pointer uppercase"
                value={dateRange.end} onChange={e => setDateRange(p => ({...p, end: e.target.value}))} />
            </div>
          </div>

          <div className="flex items-center sys-gap sys-p bg-[var(--bg-surface)] rounded-[8px] border border-[var(--border)] shadow-sm">
            {['WEEK', 'MONTH', 'YEAR'].map(label => (
              <button key={label} onClick={() => setPreset(label)}
              className="px-4 py-2 rounded-[8px] text-[10px] font-black text-[var(--text-muted)] hover:text-white hover:bg-indigo-500 transition-all uppercase tracking-normal">
                {label}
              </button>
            ))}
          </div>

          <button onClick={fetchSupabaseData} disabled={isLoading}
            className={`flex items-center gap-2 px-6 py-3 rounded-[8px] text-[10px] font-black uppercase tracking-normal transition-all border ${
              isLoading ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95'
            }`}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'SYNCING...' : 'RELOAD'}
          </button>
        </div>
      </div>

      {/* Sub Filters */}
      <div className="flex flex-wrap items-center sys-gap pt-[10px] border-t border-[var(--border)]">
        <div className="flex items-center sys-gap bg-[var(--bg-surface)] px-4 py-2.5 rounded-[8px] border border-[var(--border)] shadow-sm">
          <Users size={14} className="text-indigo-500" />
          <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-normal">TEAM:</span>
          <select className="bg-transparent text-[10px] font-black text-indigo-500 outline-none cursor-pointer uppercase tracking-normal"
            value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}>
            {teamOptions.map(t => <option key={t} value={t} className="bg-[var(--bg-dark)]">{t === 'ALL' ? 'ALL TEAMS' : t}</option>)}
          </select>
        </div>

        <div className="flex items-center sys-gap bg-[var(--bg-surface)] px-4 py-2.5 rounded-[8px] border border-[var(--border)] shadow-sm">
          <TableIcon size={14} className="text-indigo-500" />
          <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-normal">GROUP:</span>
          <select className="bg-transparent text-[10px] font-black text-indigo-500 outline-none cursor-pointer uppercase tracking-normal"
            value={groupBy} onChange={e => setGroupBy(e.target.value)}>
            {['none', 'project', 'user'].map(g => <option key={g} value={g} className="bg-[var(--bg-dark)] uppercase">{g.toUpperCase()}</option>)}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-normal">
            {filteredDataCount} RECORDS
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
