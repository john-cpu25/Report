import React from 'react';
import { formatDuration } from '../../utils/csvHelpers';

const UnifiedTable = ({ 
  data, 
  columnFilters, 
  setColumnFilters,
  sortConfig,
  handleSort,
  columnOptions
}) => {

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return <span className="text-indigo-400 ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const tableRows = [...data];

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

  return (
    <div className="glass-panel overflow-hidden border border-[var(--border)] shadow-xl bg-[var(--bg-card)] rounded-none">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse" style={{ minWidth: '1800px' }}>
          <thead className="sticky top-0 z-10">
            <tr className="text-[10px] font-black uppercase tracking-widest border-b border-[var(--border)] bg-[var(--bg-header)]">
              <th rowSpan={2} className="px-3 py-3 text-amber-500 border-r border-b border-[var(--border)] sticky left-0 z-20 min-w-[200px] backdrop-blur-md" style={{ backgroundColor: 'var(--table-sticky)' }}>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('project')}>
                    <span>NAME {renderSortIcon('project')}</span>
                  </div>
                  <select 
                    className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-none px-2 py-1 text-[10px] font-bold outline-none focus:border-indigo-500 cursor-pointer appearance-none w-full text-[var(--text-main)]"
                    value={columnFilters.project}
                    onChange={e => setColumnFilters(prev => ({...prev, project: e.target.value}))}
                  >
                    <option value="">All Projects</option>
                    {columnOptions.projects.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </th>
              <th colSpan={4} className="px-3 py-3 bg-indigo-500/10 text-indigo-500 text-center border-r border-b border-[var(--border)]">MANAGER / LEADER</th>
              <th colSpan={5} className="px-3 py-3 bg-sky-500/10 text-sky-500 text-center border-r border-b border-[var(--border)]">USER</th>
              <th rowSpan={2} className="px-3 py-3 bg-[var(--bg-header)] text-[var(--text-muted)] text-center border-r border-b border-[var(--border)] min-w-[80px]" onClick={() => handleSort('area')}>
                area {renderSortIcon('area')}
              </th>
              <th className="px-3 py-3 bg-emerald-500/10 text-emerald-500 text-center border-r border-b border-[var(--border)]">T1</th>
              <th className="px-3 py-3 bg-indigo-500/10 text-indigo-500 text-center border-r border-b border-[var(--border)]">T2</th>
              <th className="px-3 py-3 bg-violet-500/10 text-violet-500 text-center border-r border-b border-[var(--border)]">T3</th>
              <th className="px-3 py-3 bg-amber-500/10 text-amber-500 text-center border-r border-b border-[var(--border)]">T4</th>
              <th className="px-3 py-3 bg-rose-500/10 text-rose-500 text-center border-b border-[var(--border)]">T5</th>
            </tr>
            <tr className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--bg-header)]">
              <th className="px-3 py-2 bg-indigo-500/5 border-r border-b border-[var(--border)] min-w-[100px]" onClick={() => handleSort('createdBy')}>create_by {renderSortIcon('createdBy')}</th>
              <th className="px-3 py-2 bg-indigo-500/5 border-r border-b border-[var(--border)] min-w-[90px]" onClick={() => handleSort('createdAt')}>created_at {renderSortIcon('createdAt')}</th>
              <th className="px-3 py-2 bg-indigo-500/5 border-r border-b border-[var(--border)] min-w-[90px]" onClick={() => handleSort('dateStart')}>date_start {renderSortIcon('dateStart')}</th>
              <th className="px-3 py-2 bg-indigo-500/5 border-r border-b border-[var(--border)] min-w-[90px]" onClick={() => handleSort('dateEnd')}>date_end {renderSortIcon('dateEnd')}</th>
              <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)] min-w-[100px]" onClick={() => handleSort('userName')}>user_id {renderSortIcon('userName')}</th>
              <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)] min-w-[90px]" onClick={() => handleSort('dateAccepted')}>date_accepted {renderSortIcon('dateAccepted')}</th>
              <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)] min-w-[90px]" onClick={() => handleSort('dateStarted')}>date_started {renderSortIcon('dateStarted')}</th>
              <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)] min-w-[90px]" onClick={() => handleSort('dateComplete')}>date_complete {renderSortIcon('dateComplete')}</th>
              <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)] min-w-[90px]" onClick={() => handleSort('dateChecked')}>date_checked {renderSortIcon('dateChecked')}</th>
              <th className="px-3 py-2 bg-emerald-500/5 border-r border-b border-[var(--border)] text-center">T1</th>
              <th className="px-3 py-2 bg-indigo-500/5 border-r border-b border-[var(--border)] text-center">T2</th>
              <th className="px-3 py-2 bg-violet-500/5 border-r border-b border-[var(--border)] text-center">T3</th>
              <th className="px-3 py-2 bg-amber-500/5 border-r border-b border-[var(--border)] text-center">T4</th>
              <th className="px-3 py-2 bg-rose-500/5 border-b border-[var(--border)] text-center">T5</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {tableRows.length === 0 ? (
              <tr><td colSpan={16} className="px-8 py-16 text-center text-[var(--text-muted)] font-black uppercase text-sm">No tasks found</td></tr>
            ) : tableRows.map((r, i) => (
              <tr key={r.id || i} className="group hover:bg-[var(--bg-header)] transition-all text-[11px]" style={{ backgroundColor: i % 2 === 0 ? 'var(--row-odd)' : 'var(--row-even)' }}>
                <td className="px-3 py-2.5 sticky left-0 z-10 border-r border-b border-[var(--border)] backdrop-blur-md" style={{ backgroundColor: 'var(--table-sticky)' }}>
                  <div className="flex flex-col">
                    <span className="text-indigo-500 font-black text-[10px] tracking-tight">{r.project}</span>
                    <span className="font-bold text-[var(--text-contrast)] group-hover:text-emerald-500 transition-colors line-clamp-1">{r.taskName}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-indigo-500/80 font-bold border-r border-b border-[var(--border)]">{r.createdBy}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.createdAtStr}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.dateStartStr}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.dateEndStr}</td>
                <td className="px-3 py-2.5 text-sky-500/80 font-bold border-r border-b border-[var(--border)]">{r.userName}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.dateAcceptedStr}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.dateStartedStr}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.dateCompleteStr}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.dateCheckedStr}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)] text-center border-r border-b border-[var(--border)]">{r.area}</td>
                <td className="px-3 py-2.5 text-center font-black border-r border-b border-[var(--border)] text-emerald-500">{r.time1Str}</td>
                <td className="px-3 py-2.5 text-center font-black border-r border-b border-[var(--border)] text-indigo-500">{r.time2Str}</td>
                <td className="px-3 py-2.5 text-center font-black border-r border-b border-[var(--border)] text-violet-500">{r.time3Str}</td>
                <td className="px-3 py-2.5 text-center font-black border-r border-b border-[var(--border)] text-amber-500">{r.time4Str}</td>
                <td className="px-3 py-2.5 text-center font-black border-b border-[var(--border)] text-rose-500">{r.time5Str}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UnifiedTable;
