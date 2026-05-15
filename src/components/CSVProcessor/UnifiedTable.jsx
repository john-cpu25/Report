import React, { useState } from 'react';
import { formatDuration } from '../../utils/csvHelpers';

const CALCULATION_LOGIC = {
  T1: { label: 'TARGET DURATION', formula: 'date_start → date_end', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  T2: { label: 'ACTUAL COMPLETION', formula: 'date_start → date_complete', color: 'text-sky-500', bg: 'bg-sky-500/10' },
  T3: { label: 'FULL CYCLE', formula: 'date_start → date_checked', color: 'text-violet-500', bg: 'bg-violet-500/10' },
  T4: { label: 'PURE PROCESSING', formula: 'date_started → date_checked', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  T5: { label: 'SYSTEM LEAD TIME', formula: 'created_at → date_checked', color: 'text-rose-500', bg: 'bg-rose-500/10' }
};

const HeaderWithTooltip = ({ id, color, stickyOffset, row2Offset, isRow2, rowSpan }) => {
  const [isHovered, setIsHovered] = useState(false);
  const logic = CALCULATION_LOGIC[id];

  return (
    <th 
      rowSpan={rowSpan}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`px-[10px] py-[${isRow2 ? '5' : '10'}px] ${color} text-center border-r border-b border-[var(--border)] sticky z-20 bg-[var(--bg-card)] group cursor-help`}
      style={{ top: isRow2 ? row2Offset : stickyOffset }}
    >
      <div className="relative inline-block">
        {id}
        {isHovered && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="bg-[#1e293b] border border-white/10 rounded-lg p-3 shadow-2xl min-w-[180px] backdrop-blur-xl text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[11px] font-black ${logic.color}`}>{id}</span>
                <span className="text-[9px] font-black text-white uppercase tracking-tight">{logic.label}</span>
              </div>
              <div className={`p-2 rounded ${logic.bg} border border-white/5`}>
                <p className="text-[8px] font-mono text-slate-300 opacity-80 whitespace-nowrap">{logic.formula}</p>
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-8 border-transparent border-t-[#1e293b]" />
            </div>
          </div>
        )}
      </div>
    </th>
  );
};

const UnifiedTable = (props) => {
  // Ultra-robust prop extraction with fallbacks
  const data = props.data || [];
  const columnFilters = props.columnFilters || { project: '' };
  const setColumnFilters = props.setColumnFilters || (() => {});
  const sortConfig = props.sortConfig || { key: null, direction: 'asc' };
  const handleSort = props.handleSort || (() => {});
  const columnOptions = props.columnOptions || { projects: [] };

  const safeFilters = columnFilters;
  const safeOptions = columnOptions;
  const safeProjects = Array.isArray(safeOptions.projects) ? safeOptions.projects : [];

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return <span className="text-indigo-400 ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const tableRows = data ? [...data] : [];

  if (sortConfig.key) {
    tableRows.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (!aVal) aVal = '';
      if (!bVal) bVal = '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const stickyOffset = props.stickyOffset || '0px';
  const row2Offset = `calc(${stickyOffset} + 45px)`; // Approx height of first header row

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] shadow-xl rounded-[8px] m-[10px] w-full">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse" style={{ minWidth: '1800px' }}>
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-widest border-b border-[var(--border)] bg-[var(--bg-header)]">
              <th rowSpan={2} className="px-[10px] py-[10px] text-amber-500 border-r border-b border-[var(--border)] sticky left-0 z-30 min-w-[200px] backdrop-blur-md bg-[var(--bg-card)]" style={{ top: stickyOffset }}>
                <div className="flex flex-col gap-[10px]">
                  <div className="flex justify-between items-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('project')}>
                    <span>NAME {renderSortIcon('project')}</span>
                  </div>
                  <select 
                    className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-[10px] py-[5px] text-[10px] font-bold outline-none focus:border-indigo-500 cursor-pointer appearance-none w-full text-[var(--text-main)]"
                    value={safeFilters.project}
                    onChange={e => setColumnFilters(prev => ({...prev, project: e.target.value}))}
                  >
                    <option value="">All Projects</option>
                    {safeProjects.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </th>
              <th colSpan={4} className="px-[10px] py-[10px] text-indigo-500 text-center border-r border-b border-[var(--border)] sticky z-20 bg-[var(--bg-card)]" style={{ top: stickyOffset }}>MANAGER / LEADER</th>
              <th colSpan={5} className="px-[10px] py-[10px] text-sky-500 text-center border-r border-b border-[var(--border)] sticky z-20 bg-[var(--bg-card)]" style={{ top: stickyOffset }}>USER</th>
              <th rowSpan={2} className="px-[10px] py-[10px] text-[var(--text-muted)] text-center border-r border-b border-[var(--border)] min-w-[80px] sticky z-20 bg-[var(--bg-card)]" style={{ top: stickyOffset }} onClick={() => handleSort('area')}>
                area {renderSortIcon('area')}
              </th>
              <HeaderWithTooltip id="T1" color="text-emerald-500" stickyOffset={stickyOffset} rowSpan={2} />
              <HeaderWithTooltip id="T2" color="text-indigo-500" stickyOffset={stickyOffset} rowSpan={2} />
              <HeaderWithTooltip id="T3" color="text-violet-500" stickyOffset={stickyOffset} rowSpan={2} />
              <HeaderWithTooltip id="T4" color="text-amber-500" stickyOffset={stickyOffset} rowSpan={2} />
              <HeaderWithTooltip id="T5" color="text-rose-500" stickyOffset={stickyOffset} rowSpan={2} />
            </tr>
            <tr className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--bg-header)]">
              <th className="px-[10px] py-[5px] border-r border-b border-[var(--border)] min-w-[100px] sticky z-20 bg-[var(--bg-card)]" style={{ top: row2Offset }} onClick={() => handleSort('createdBy')}>create_by {renderSortIcon('createdBy')}</th>
              <th className="px-[10px] py-[5px] border-r border-b border-[var(--border)] min-w-[90px] sticky z-20 bg-[var(--bg-card)]" style={{ top: row2Offset }} onClick={() => handleSort('createdAt')}>created_at {renderSortIcon('createdAt')}</th>
              <th className="px-[10px] py-[5px] border-r border-b border-[var(--border)] min-w-[90px] sticky z-20 bg-[var(--bg-card)]" style={{ top: row2Offset }} onClick={() => handleSort('dateStart')}>date_start {renderSortIcon('dateStart')}</th>
              <th className="px-[10px] py-[5px] border-r border-b border-[var(--border)] min-w-[90px] sticky z-20 bg-[var(--bg-card)]" style={{ top: row2Offset }} onClick={() => handleSort('dateEnd')}>date_end {renderSortIcon('dateEnd')}</th>
              <th className="px-[10px] py-[5px] border-r border-b border-[var(--border)] min-w-[100px] sticky z-20 bg-[var(--bg-card)]" style={{ top: row2Offset }} onClick={() => handleSort('userName')}>user_id {renderSortIcon('userName')}</th>
              <th className="px-[10px] py-[5px] border-r border-b border-[var(--border)] min-w-[90px] sticky z-20 bg-[var(--bg-card)]" style={{ top: row2Offset }} onClick={() => handleSort('dateAccepted')}>date_accepted {renderSortIcon('dateAccepted')}</th>
              <th className="px-[10px] py-[5px] border-r border-b border-[var(--border)] min-w-[90px] sticky z-20 bg-[var(--bg-card)]" style={{ top: row2Offset }} onClick={() => handleSort('dateStarted')}>date_started {renderSortIcon('dateStarted')}</th>
              <th className="px-[10px] py-[5px] border-r border-b border-[var(--border)] min-w-[90px] sticky z-20 bg-[var(--bg-card)]" style={{ top: row2Offset }} onClick={() => handleSort('dateComplete')}>date_complete {renderSortIcon('dateComplete')}</th>
              <th className="px-[10px] py-[5px] border-r border-b border-[var(--border)] min-w-[90px] sticky z-20 bg-[var(--bg-card)]" style={{ top: row2Offset }} onClick={() => handleSort('dateChecked')}>date_checked {renderSortIcon('dateChecked')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {tableRows.length === 0 ? (
              <tr><td colSpan={16} className="px-[10px] py-[10px] text-center text-[var(--text-muted)] font-black uppercase text-sm">No tasks found</td></tr>
            ) : tableRows.map((r, i) => (
              <tr key={r.id || i} className="group hover:bg-[var(--bg-header)] transition-all text-[11px]" style={{ backgroundColor: i % 2 === 0 ? 'var(--row-odd)' : 'var(--row-even)' }}>
                <td className="px-[10px] py-[10px] sticky left-0 z-10 border-r border-b border-[var(--border)] backdrop-blur-md" style={{ backgroundColor: 'var(--table-sticky)' }}>
                  <div className="flex flex-col">
                    <span className="text-indigo-500 font-black text-[10px] tracking-tight">{r.project}</span>
                    <span className="font-bold text-[var(--text-contrast)] group-hover:text-emerald-500 transition-colors line-clamp-1">{r.taskName}</span>
                  </div>
                </td>
                <td className="px-[10px] py-[10px] text-indigo-500/80 font-bold border-r border-b border-[var(--border)]">{r.createdBy || '-'}</td>
                <td className="px-[10px] py-[10px] text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.createdAtStr || '-'}</td>
                <td className="px-[10px] py-[10px] text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.dateStartStr || '-'}</td>
                <td className="px-[10px] py-[10px] text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.dateEndStr || '-'}</td>
                <td className="px-[10px] py-[10px] text-sky-500/80 font-bold border-r border-b border-[var(--border)]">{r.userName || '-'}</td>
                <td className="px-[10px] py-[10px] text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.dateAcceptedStr || '-'}</td>
                <td className="px-[10px] py-[10px] text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.dateStartedStr || '-'}</td>
                <td className="px-[10px] py-[10px] text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.dateCompleteStr || '-'}</td>
                <td className="px-[10px] py-[10px] text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.dateCheckedStr || '-'}</td>
                <td className="px-[10px] py-[10px] text-[var(--text-muted)] text-center border-r border-b border-[var(--border)]">{r.area || '-'}</td>
                <td className="px-[10px] py-[10px] text-center font-black border-r border-b border-[var(--border)] text-emerald-500">{r.time1Str || '-'}</td>
                <td className="px-[10px] py-[10px] text-center font-black border-r border-b border-[var(--border)] text-indigo-500">{r.time2Str || '-'}</td>
                <td className="px-[10px] py-[10px] text-center font-black border-r border-b border-[var(--border)] text-violet-500">{r.time3Str || '-'}</td>
                <td className="px-[10px] py-[10px] text-center font-black border-r border-b border-[var(--border)] text-amber-500">{r.time4Str || '-'}</td>
                <td className="px-[10px] py-[10px] text-center font-black border-b border-[var(--border)] text-rose-500">{r.time5Str || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UnifiedTable;
