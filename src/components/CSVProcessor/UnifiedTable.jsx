
import React from 'react';
import { processDate, getEffectiveDuration, formatDuration, formatDateTime } from '../../utils/csvHelpers';

const UnifiedTable = ({ 
  rawTasks, 
  userMap, 
  userTeamMap, 
  selectedTeam, 
  searchQuery, 
  columnFilters, 
  setColumnFilters,
  dateRange,
  sortConfig,
  handleSort,
  columnOptions
}) => {

  const fmtDt = (val) => {
    const d = processDate(val);
    if (!d) return '';
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const h = String(d.getUTCHours()).padStart(2, '0');
    const mi = String(d.getUTCMinutes()).padStart(2, '0');
    return `${day}/${mo} ${h}:${mi}`;
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return <span className="text-indigo-400 ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const tableRows = rawTasks.map(t => {
    const rawName = t.name || '';
    const parts = rawName.toString().split(':');
    const creator = userMap[t.create_by] || userMap[t.create_by?.toLowerCase()] || t.create_by || '-';
    const user = userMap[t.user_id] || userMap[t.user_id?.toLowerCase()] || t.user_id || '-';
    const creatorTeam = userTeamMap[t.create_by] || userTeamMap[t.create_by?.toLowerCase()] || '-';
    const userTeam = userTeamMap[t.user_id] || userTeamMap[t.user_id?.toLowerCase()] || '-';
    
    if (selectedTeam !== 'ALL' && creatorTeam !== selectedTeam && userTeam !== selectedTeam) return null;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (parts[1] || '').toLowerCase();
      const proj = (parts[0] || '').toLowerCase();
      if (!name.includes(q) && !proj.includes(q) && !creator.toLowerCase().includes(q) && !user.toLowerCase().includes(q)) return null;
    }
    
    if (columnFilters.project && !(parts[0] || '').toLowerCase().includes(columnFilters.project.toLowerCase())) return null;
    if (columnFilters.taskName && !(parts[1] || '').toLowerCase().includes(columnFilters.taskName.toLowerCase())) return null;
    if (columnFilters.creator && !creator.toLowerCase().includes(columnFilters.creator.toLowerCase())) return null;
    if (columnFilters.user && !user.toLowerCase().includes(columnFilters.user.toLowerCase())) return null;
    
    if (dateRange.start) {
      const d = processDate(t.created_at);
      if (d && d < new Date(dateRange.start)) return null;
    }
    if (dateRange.end) {
      const d = processDate(t.created_at);
      const end = new Date(dateRange.end); end.setHours(23,59,59,999);
      if (d && d > end) return null;
    }

    const dateStart = processDate(t.date_start);
    const dateEnd = processDate(t.date_end);
    const dateComplete = processDate(t.date_complete);
    const dateChecked = processDate(t.date_checked);
    const dateStarted = processDate(t.date_started);
    const createdAt = processDate(t.created_at);

    return {
      id: t.id,
      project: parts[0]?.trim() || '-',
      taskName: parts[1]?.trim() || '-',
      creator, user,
      created_at: t.created_at,
      date_start: t.date_start,
      date_end: t.date_end,
      date_accepted: t.date_accepted,
      date_started: t.date_started,
      date_complete: t.date_complete,
      date_checked: t.date_checked,
      area: t.area || '-',
      t1: getEffectiveDuration(dateStart, dateEnd),
      t2: getEffectiveDuration(dateStart, dateComplete),
      t3: getEffectiveDuration(dateStart, dateChecked),
      t4: getEffectiveDuration(dateStarted, dateChecked),
      t5: getEffectiveDuration(createdAt, dateChecked),
    };
  }).filter(Boolean);

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
    <div className="glass-panel overflow-hidden border border-[var(--border)] shadow-xl bg-[var(--bg-card)]">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse" style={{ minWidth: '1800px' }}>
          <thead className="sticky top-0 z-10">
            <tr className="text-[10px] font-black uppercase tracking-normal border-b border-[var(--border)] bg-[var(--bg-header)]">
              <th rowSpan={2} className="px-3 py-3 text-amber-500 border-r border-b border-[var(--border)] sticky left-0 z-20 min-w-[200px] backdrop-blur-md" style={{ backgroundColor: 'var(--table-sticky)' }}>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('project')}>
                    <span>NAME {renderSortIcon('project')}</span>
                  </div>
                  <select 
                    className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2 py-1 text-[10px] font-bold outline-none focus:border-indigo-500 cursor-pointer appearance-none w-full text-[var(--text-main)]"
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
            <tr className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--bg-header)]">
              <th className="px-3 py-2 bg-indigo-500/5 border-r border-b border-[var(--border)] min-w-[100px]" onClick={() => handleSort('creator')}>create_by {renderSortIcon('creator')}</th>
              <th className="px-3 py-2 bg-indigo-500/5 border-r border-b border-[var(--border)] min-w-[90px]" onClick={() => handleSort('created_at')}>created_at {renderSortIcon('created_at')}</th>
              <th className="px-3 py-2 bg-indigo-500/5 border-r border-b border-[var(--border)] min-w-[90px]" onClick={() => handleSort('date_start')}>date_start {renderSortIcon('date_start')}</th>
              <th className="px-3 py-2 bg-indigo-500/5 border-r border-b border-[var(--border)] min-w-[90px]" onClick={() => handleSort('date_end')}>date_end {renderSortIcon('date_end')}</th>
              <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)] min-w-[100px]" onClick={() => handleSort('user')}>user_id {renderSortIcon('user')}</th>
              <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)] min-w-[90px]" onClick={() => handleSort('date_accepted')}>date_accepted {renderSortIcon('date_accepted')}</th>
              <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)] min-w-[90px]" onClick={() => handleSort('date_started')}>date_started {renderSortIcon('date_started')}</th>
              <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)] min-w-[90px]" onClick={() => handleSort('date_complete')}>date_complete {renderSortIcon('date_complete')}</th>
              <th className="px-3 py-2 bg-sky-500/5 border-r border-b border-[var(--border)] min-w-[90px]" onClick={() => handleSort('date_checked')}>date_checked {renderSortIcon('date_checked')}</th>
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
                <td className="px-3 py-2.5 text-indigo-500/80 font-bold border-r border-b border-[var(--border)]">{r.creator}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{fmtDt(r.created_at)}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{fmtDt(r.date_start)}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{fmtDt(r.date_end)}</td>
                <td className="px-3 py-2.5 text-sky-500/80 font-bold border-r border-b border-[var(--border)]">{r.user}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{fmtDt(r.date_accepted)}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{fmtDt(r.date_started)}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{fmtDt(r.date_complete)}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{fmtDt(r.date_checked)}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)] text-center border-r border-b border-[var(--border)]">{r.area}</td>
                <td className="px-3 py-2.5 text-center font-black border-r border-b border-[var(--border)] text-emerald-500">{formatDuration(r.t1)}</td>
                <td className="px-3 py-2.5 text-center font-black border-r border-b border-[var(--border)] text-indigo-500">{formatDuration(r.t2)}</td>
                <td className="px-3 py-2.5 text-center font-black border-r border-b border-[var(--border)] text-violet-500">{formatDuration(r.t3)}</td>
                <td className="px-3 py-2.5 text-center font-black border-r border-b border-[var(--border)] text-amber-500">{formatDuration(r.t4)}</td>
                <td className="px-3 py-2.5 text-center font-black border-b border-[var(--border)] text-rose-500">{formatDuration(r.t5)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UnifiedTable;
