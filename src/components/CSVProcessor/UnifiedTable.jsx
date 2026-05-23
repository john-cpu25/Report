import React, { useState, useMemo } from 'react';
import { formatDuration } from '../../utils/csvHelpers';
import { useApp } from '../../context/AppContext';

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
      className={`sys-px py-[${isRow2 ? '5' : '10'}px] ${color} text-center border-r border-b border-[var(--border)] sticky ${isHovered ? 'z-40' : 'z-20'} bg-[var(--bg-card)] group cursor-help min-w-[65px]`}
      style={{ top: isRow2 ? row2Offset : stickyOffset }}
    >
      <div className="relative inline-block">
        {id}
        {isHovered && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="bg-slate-950/95 border border-white/15 rounded-xl p-3.5 shadow-2xl min-w-[210px] backdrop-blur-2xl text-left">
              <div className="flex items-center gap-2.5 mb-2">
                <span className={`text-[13px] font-black ${logic.color} tracking-wider`}>{id}</span>
                <span className="text-[10px] font-black text-white uppercase tracking-wider">{logic.label}</span>
              </div>
              <div className={`p-2 rounded-lg ${logic.bg} border border-white/5`}>
                <p className="text-[10px] font-mono text-slate-200 font-bold whitespace-nowrap">{logic.formula}</p>
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-8 border-transparent border-t-slate-950/95" />
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

  const { dashboardProjects } = useApp();

  const projectColorMap = useMemo(() => {
    const map = {};
    if (dashboardProjects) {
      dashboardProjects.forEach(p => {
        if (p.name && p.color) {
          map[p.name.toUpperCase()] = p.color;
        }
      });
    }
    return map;
  }, [dashboardProjects]);

  const getProjectColor = (projectName) => {
    const name = (projectName || '').toUpperCase();
    if (projectColorMap[name]) return projectColorMap[name];
    
    // Fallback: Consistent color based on name hash
    const colors = [
      '#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#3b82f6', 
      '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return <span className="text-indigo-400 ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const tableRows = React.useMemo(() => {
    let result = data ? [...data] : [];
    
    // Apply Internal Project Filter
    if (safeFilters.project) {
      result = result.filter(r => r.project === safeFilters.project);
    }

    // Apply Sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        if (!aVal) aVal = '';
        if (!bVal) bVal = '';
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [data, safeFilters.project, sortConfig]);

  const stickyOffset = props.stickyOffset || '0px';
  const row2Offset = `calc(${stickyOffset} + 40px)`; 

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] shadow-xl rounded-[8px] m-[10px] min-w-[calc(100%-20px)] w-fit">
        <table className="w-full text-left border-separate border-spacing-0" style={{ minWidth: '1690px' }}>
          <thead>
            <tr className="text-[14px] font-black uppercase tracking-wide bg-[var(--bg-card)]" style={{ height: '40px' }}>
              <th rowSpan={2} className="py-[2px] text-[var(--text-contrast)] text-left border-r-2 border-b border-[var(--border)] sticky left-0 z-30 min-w-[140px] backdrop-blur-md bg-[var(--bg-card)]" style={{ top: stickyOffset, paddingLeft: '12px', paddingRight: '12px' }}>
                <div className="flex items-center justify-center h-full cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => handleSort('project')}>
                  <span>PROJECT {renderSortIcon('project')}</span>
                </div>
              </th>
              <th rowSpan={2} className="py-[2px] text-[var(--text-contrast)] text-left border-r-2 border-b border-[var(--border)] sticky left-[140px] z-30 min-w-[130px] backdrop-blur-md bg-[var(--bg-card)]" style={{ top: stickyOffset, paddingLeft: '12px', paddingRight: '12px' }}>
                <div className="flex items-center justify-center h-full cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => handleSort('taskName')}>
                  <span>TASK NAME {renderSortIcon('taskName')}</span>
                </div>
              </th>
              <th colSpan={4} className="px-[8px] py-[4px] text-[var(--text-contrast)] text-center border-r-2 border-b border-[var(--border)] sticky z-20 bg-[var(--bg-card)]" style={{ top: stickyOffset }}>MANAGER / LEADER</th>
              <th colSpan={5} className="px-[8px] py-[4px] text-[var(--text-contrast)] text-center border-r-2 border-b border-[var(--border)] sticky z-20 bg-[var(--bg-card)]" style={{ top: stickyOffset }}>USER</th>
              <th rowSpan={2} className="px-[8px] py-[2px] text-[var(--text-contrast)] text-center border-r-2 border-b border-[var(--border)] min-w-[70px] sticky z-20 bg-[var(--bg-card)]" style={{ top: stickyOffset }} onClick={() => handleSort('area')}>
                area {renderSortIcon('area')}
              </th>
              <HeaderWithTooltip id="T1" color="text-[var(--text-contrast)]" stickyOffset={stickyOffset} rowSpan={2} />
              <HeaderWithTooltip id="T2" color="text-[var(--text-contrast)]" stickyOffset={stickyOffset} rowSpan={2} />
              <HeaderWithTooltip id="T3" color="text-[var(--text-contrast)]" stickyOffset={stickyOffset} rowSpan={2} />
              <HeaderWithTooltip id="T4" color="text-[var(--text-contrast)]" stickyOffset={stickyOffset} rowSpan={2} />
              <HeaderWithTooltip id="T5" color="text-[var(--text-contrast)]" stickyOffset={stickyOffset} rowSpan={2} />
            </tr>
            <tr className="text-[12px] font-black uppercase tracking-wide text-[var(--text-muted)] bg-[var(--bg-card)]" style={{ height: '32px' }}>
              <th className="py-[4px] text-left border-r border-b border-[var(--border)] min-w-[110px] sticky z-20 bg-[var(--bg-card)]" style={{ top: row2Offset, paddingLeft: '12px', paddingRight: '12px' }} onClick={() => handleSort('createdBy')}>CREATE BY</th>
              <th className="px-[8px] py-[4px] text-center border-r border-b border-[var(--border)] min-w-[115px] sticky z-20 bg-[var(--bg-card)]" style={{ top: row2Offset }} onClick={() => handleSort('createdAt')}>CREATE</th>
              <th className="px-[8px] py-[4px] text-center border-r border-b border-[var(--border)] min-w-[115px] sticky z-20 bg-[var(--bg-card)]" style={{ top: row2Offset }} onClick={() => handleSort('dateStart')}>START</th>
              <th className="px-[8px] py-[4px] text-center border-r-2 border-b border-[var(--border)] min-w-[115px] sticky z-20 bg-[var(--bg-card)]" style={{ top: row2Offset }} onClick={() => handleSort('dateEnd')}>END</th>
              <th className="py-[4px] text-left border-r border-b border-[var(--border)] min-w-[110px] sticky z-20 bg-[var(--bg-card)]" style={{ top: row2Offset, paddingLeft: '12px', paddingRight: '12px' }} onClick={() => handleSort('userName')}>USER</th>
              <th className="px-[8px] py-[4px] text-center border-r border-b border-[var(--border)] min-w-[115px] sticky z-20 bg-[var(--bg-card)]" style={{ top: row2Offset }} onClick={() => handleSort('dateAccepted')}>ACCEPTED</th>
              <th className="px-[8px] py-[4px] text-center border-r border-b border-[var(--border)] min-w-[115px] sticky z-20 bg-[var(--bg-card)]" style={{ top: row2Offset }} onClick={() => handleSort('dateStarted')}>STARTED</th>
              <th className="px-[8px] py-[4px] text-center border-r border-b border-[var(--border)] min-w-[115px] sticky z-20 bg-[var(--bg-card)]" style={{ top: row2Offset }} onClick={() => handleSort('dateComplete')}>COMPLETED</th>
              <th className="px-[8px] py-[4px] text-center border-r-2 border-b border-[var(--border)] min-w-[115px] sticky z-20 bg-[var(--bg-card)]" style={{ top: row2Offset }} onClick={() => handleSort('dateChecked')}>CHECKED</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {tableRows.length === 0 ? (
              <tr><td colSpan={16} className="sys-px sys-py text-center text-[var(--text-muted)] font-black uppercase text-sm border-b border-[var(--border)]">No tasks found</td></tr>
            ) : tableRows.map((r, i) => {
              const rowBg = i % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-slate-50/40';
              const stickyBg = i % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-[#f8fafc]'; // slate-50 equivalent for sticky
              
              return (
                <tr key={r.id || i} className={`transition-all text-[14px] align-middle ${rowBg}`}>
                  <td className={`sys-py text-left sticky left-0 z-10 border-r-2 border-b border-[var(--border)] backdrop-blur-sm ${stickyBg}`} style={{ paddingLeft: '12px', paddingRight: '12px', verticalAlign: 'middle' }}>
                    <span className="text-[14px] tracking-tight uppercase line-clamp-1" style={{ color: getProjectColor(r.project) }}>{r.project}</span>
                  </td>
                  <td className={`sys-py text-left sticky left-[140px] z-10 border-r-2 border-b border-[var(--border)] backdrop-blur-sm ${stickyBg}`} style={{ paddingLeft: '12px', paddingRight: '12px', verticalAlign: 'middle' }}>
                    <span className="text-[var(--text-contrast)] line-clamp-1">{r.taskName}</span>
                  </td>
                  <td className="sys-py align-middle text-left text-indigo-500/80 border-r border-b border-[var(--border)]" style={{ paddingLeft: '12px', paddingRight: '12px' }}>{r.createdBy || '-'}</td>
                  <td className="px-[8px] sys-py align-middle text-center text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.createdAtStr || '-'}</td>
                  <td className="px-[8px] sys-py align-middle text-center text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.dateStartStr || '-'}</td>
                  <td className="px-[8px] sys-py align-middle text-center text-[var(--text-muted)] font-mono border-r-2 border-b border-[var(--border)]">{r.dateEndStr || '-'}</td>
                  <td className="sys-py text-left text-sky-500 border-r border-b border-[var(--border)]" style={{ paddingLeft: '12px', paddingRight: '12px', verticalAlign: 'middle' }}>{r.userName || '-'}</td>
                  <td className="px-[8px] sys-py align-middle text-center text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.dateAcceptedStr || '-'}</td>
                  <td className="px-[8px] sys-py align-middle text-center text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.dateStartedStr || '-'}</td>
                  <td className="px-[8px] sys-py align-middle text-center text-[var(--text-muted)] font-mono border-r border-b border-[var(--border)]">{r.dateCompleteStr || '-'}</td>
                  <td className="px-[8px] sys-py align-middle text-center text-[var(--text-muted)] font-mono border-r-2 border-b border-[var(--border)]">{r.dateCheckedStr || '-'}</td>
                  <td className="px-[8px] sys-py align-middle text-center border-r-2 border-b border-[var(--border)] text-[var(--text-muted)]">{r.area || '-'}</td>
                  <td className="sys-px sys-py align-middle text-center border-r-2 border-b border-[var(--border)] text-emerald-500">{r.time1Str || '-'}</td>
                  <td className="sys-px sys-py align-middle text-center border-r-2 border-b border-[var(--border)] text-indigo-500">{r.time2Str || '-'}</td>
                  <td className="sys-px sys-py align-middle text-center border-r-2 border-b border-[var(--border)] text-violet-500">{r.time3Str || '-'}</td>
                  <td className="sys-px sys-py align-middle text-center border-r-2 border-b border-[var(--border)] text-amber-500">{r.time4Str || '-'}</td>
                  <td className="sys-px sys-py align-middle text-center border-b border-[var(--border)] text-rose-500">{r.time5Str || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
    </div>
  );
};

export default UnifiedTable;
