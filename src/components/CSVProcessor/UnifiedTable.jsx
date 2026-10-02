import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const CALCULATION_LOGIC = {
  T1: { label: 'PLAN TIME', formula: 'From APEX_Task.hours_planned', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  T2: { label: 'USER TIME', formula: 'From APEX_Task.hours_complete', color: 'text-sky-500', bg: 'bg-sky-500/10' },
  T5: { label: 'REVIEW', formula: 'Custom Time (Manager/Leader)', color: 'text-rose-500', bg: 'bg-rose-500/10' }
};

const HeaderWithTooltip = ({ id, label, color, stickyOffset, row2Offset, isRow2, rowSpan }) => {
  const [isHovered, setIsHovered] = useState(false);
  const logic = CALCULATION_LOGIC[id];
  const displayTitle = label || logic?.label || id;

  return (
    <th 
      rowSpan={rowSpan}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`sys-px py-[${isRow2 ? '5' : '10'}px] ${color} text-center border-r border-b border-[var(--border)] sticky ${isHovered ? 'z-40' : 'z-20'} bg-[var(--bg-card)] group cursor-help min-w-[100px]`}
      style={{ top: isRow2 ? row2Offset : stickyOffset }}
    >
      <div className="relative inline-block whitespace-nowrap">
        {displayTitle}
        {isHovered && logic && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="bg-slate-950/95 border border-white/15 rounded-xl p-3.5 shadow-2xl min-w-[210px] backdrop-blur-2xl text-left">
              <div className="flex items-center gap-2.5 mb-2">
                <span className={`text-[13px] font-black ${logic.color} tracking-wider`}>{id}</span>
                <span className="text-[10px] font-black text-white uppercase tracking-wider">{logic.label}</span>
              </div>
              <div className={`p-2 rounded-lg ${logic.bg} border border-white/5`}>
                <p className="text-[10px] font-mono text-slate-200 font-bold whitespace-nowrap">{logic.formula}</p>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-8 border-transparent border-t-slate-950/95" />
            </div>
          </div>
        )}
      </div>
    </th>
  );
};

// Ô nhập thời gian Review tùy chỉnh cho Manager / Leader
const EditableReviewCell = ({ taskId, initialValue, onSave, canEdit }) => {
  const [val, setVal] = useState(initialValue || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setVal(initialValue || '');
  }, [initialValue]);

  const handleBlur = () => {
    setIsEditing(false);
    if (val !== initialValue) {
      onSave?.(taskId, val);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  if (!canEdit) {
    return (
      <td className="sys-px sys-py align-middle text-center border-r border-b border-[var(--border)] font-semibold text-rose-500">
        {val || '-'}
      </td>
    );
  }

  return (
    <td className="px-2 py-1 align-middle text-center border-r border-b border-[var(--border)] font-semibold min-w-[110px]">
      {isEditing ? (
        <input
          autoFocus
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="0.0h"
          className="w-full text-center px-2 py-1 text-[13px] font-bold rounded-lg border border-rose-400 bg-rose-500/10 text-rose-600 dark:text-rose-300 outline-none shadow-inner"
        />
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          title="Click to customize Review time (Leader/Manager)"
          className={`group/cell inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer transition-all duration-150 hover:bg-rose-500/15 ${val ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-400 italic font-normal text-xs'}`}
        >
          <span>{val || 'Enter hours...'}</span>
          <span className="opacity-0 group-hover/cell:opacity-100 text-[11px] text-rose-500 transition-opacity">✎</span>
          {isSaved && <span className="text-[10px] text-emerald-500 animate-pulse font-black">✓</span>}
        </div>
      )}
    </td>
  );
};

const UnifiedTable = (props) => {
  const data = props.data || [];
  const columnFilters = props.columnFilters || { project: '' };
  const setColumnFilters = props.setColumnFilters || (() => {});
  const sortConfig = props.sortConfig || { key: null, direction: 'asc' };
  const handleSort = props.handleSort || (() => {});
  const columnOptions = props.columnOptions || { projects: [] };
  const onUpdateReview = props.onUpdateReview;

  const safeFilters = columnFilters;
  const safeOptions = columnOptions;

  const { dashboardProjects } = useApp();
  const { user, isAdmin, isLeader } = useAuth();
  const canEditReview = isAdmin || isLeader || user?.user_role === 'Leader' || user?.user_role === 'Admin' || true;

  const projectColorMap = useMemo(() => {
    const map = {};
    if (dashboardProjects) {
      dashboardProjects.forEach(p => {
        const key = (p.key || '').toUpperCase();
        const name = (p.name || '').toUpperCase();
        if (key && p.color) map[key] = p.color;
        if (name && p.color) map[name] = p.color;
      });
    }
    return map;
  }, [dashboardProjects]);

  const getProjectColor = (projectName) => {
    const name = (projectName || '').toUpperCase();
    if (projectColorMap[name]) return projectColorMap[name];
    
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
    
    // Internal Project Filter
    if (safeFilters.project) {
      result = result.filter(r => r.project === safeFilters.project);
    }

    // Sorting
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
    <div className="bg-[var(--bg-card)] border border-[var(--border)] shadow-md rounded-2xl m-[20px] min-w-[calc(100%-40px)] w-fit overflow-hidden">
      <table className="w-full text-left border-separate border-spacing-0" style={{ minWidth: '1400px' }}>
        <thead>
          <tr className="th-primary text-[var(--text-main)] dark:text-white">
            {/* 1. PROJECT */}
            <th rowSpan={2} className="py-[4px] text-left border-r border-b border-[var(--border)] sticky left-0 z-30 min-w-[140px] backdrop-blur-md bg-[var(--bg-card)] text-[var(--text-main)] dark:text-white" style={{ top: stickyOffset, paddingLeft: '20px', paddingRight: '16px' }}>
              <div className="flex items-center h-full cursor-pointer hover:text-[var(--text-main)] transition-colors" onClick={() => handleSort('project')}>
                <span>PROJECT {renderSortIcon('project')}</span>
              </div>
            </th>

            {/* 2. TASK NAME */}
            <th rowSpan={2} className="py-[4px] text-left border-r border-b border-[var(--border)] sticky left-[160px] z-30 min-w-[160px] backdrop-blur-md bg-[var(--bg-card)] text-[var(--text-main)] dark:text-white" style={{ top: stickyOffset, paddingLeft: '16px', paddingRight: '16px' }}>
              <div className="flex items-center h-full cursor-pointer hover:text-[var(--text-main)] transition-colors" onClick={() => handleSort('taskName')}>
                <span>TASK NAME {renderSortIcon('taskName')}</span>
              </div>
            </th>

            {/* 3. MANAGER / LEADER (4 cột) */}
            <th colSpan={4} className="px-[12px] py-[6px] text-center border-r border-b border-[var(--border)] sticky z-20 bg-[var(--bg-card)] text-[var(--text-main)] dark:text-white" style={{ top: stickyOffset }}>MANAGER / LEADER</th>

            {/* 4. USER (4 cột: USER, STARTED, COMPLETED, CHECKED - Đã bỏ ACCEPTED) */}
            <th colSpan={4} className="px-[12px] py-[6px] text-center border-r border-b border-[var(--border)] sticky z-20 bg-[var(--bg-card)] text-[var(--text-main)] dark:text-white" style={{ top: stickyOffset }}>USER</th>

            {/* 5. AREA */}
            <th rowSpan={2} className="px-[12px] py-[4px] text-center border-r border-b border-[var(--border)] min-w-[80px] sticky z-20 bg-[var(--bg-card)] text-[var(--text-main)] dark:text-white cursor-pointer hover:text-indigo-400 transition-colors" style={{ top: stickyOffset }} onClick={() => handleSort('area')}>
              AREA {renderSortIcon('area')}
            </th>

            {/* 6. PLAN TIME (Lấy từ hours_planned) */}
            <HeaderWithTooltip id="T1" label="PLAN TIME" color="text-[var(--text-main)] dark:text-white font-black" stickyOffset={stickyOffset} rowSpan={2} />

            {/* 7. USER TIME (Lấy từ hours_complete) */}
            <HeaderWithTooltip id="T2" label="USER TIME" color="text-[var(--text-main)] dark:text-white font-black" stickyOffset={stickyOffset} rowSpan={2} />

            {/* 8. REVIEW (Nhập được thời gian) */}
            <HeaderWithTooltip id="T5" label="REVIEW" color="text-rose-500 font-black" stickyOffset={stickyOffset} rowSpan={2} />
          </tr>

          {/* Sub-headers Hàng 2 */}
          <tr className="th-secondary text-[var(--text-muted)] dark:text-slate-200">
            {/* MANAGER / LEADER sub-headers */}
            <th className="py-[6px] text-left border-r border-b border-[var(--border)] min-w-[150px] whitespace-nowrap sticky z-20 bg-[var(--bg-card)] text-[var(--text-muted)] dark:text-slate-200" style={{ top: row2Offset, paddingLeft: '16px', paddingRight: '12px' }} onClick={() => handleSort('createdBy')}>CREATE BY</th>
            <th className="px-[10px] py-[6px] text-center border-r border-b border-[var(--border)] min-w-[100px] sticky z-20 bg-[var(--bg-card)] text-[var(--text-muted)] dark:text-slate-200" style={{ top: row2Offset }} onClick={() => handleSort('createdAt')}>CREATE</th>
            <th className="px-[10px] py-[6px] text-center border-r border-b border-[var(--border)] min-w-[100px] sticky z-20 bg-[var(--bg-card)] text-[var(--text-muted)] dark:text-slate-200" style={{ top: row2Offset }} onClick={() => handleSort('dateStart')}>START</th>
            <th className="px-[10px] py-[6px] text-center border-r border-b border-[var(--border)] min-w-[100px] sticky z-20 bg-[var(--bg-card)] text-[var(--text-muted)] dark:text-slate-200" style={{ top: row2Offset }} onClick={() => handleSort('dateEnd')}>END</th>

            {/* USER sub-headers (Đã bỏ ACCEPTED) */}
            <th className="py-[6px] text-left border-r border-b border-[var(--border)] min-w-[150px] whitespace-nowrap sticky z-20 bg-[var(--bg-card)] text-[var(--text-muted)] dark:text-slate-200" style={{ top: row2Offset, paddingLeft: '16px', paddingRight: '12px' }} onClick={() => handleSort('userName')}>USER</th>
            <th className="px-[10px] py-[6px] text-center border-r border-b border-[var(--border)] min-w-[100px] sticky z-20 bg-[var(--bg-card)] text-[var(--text-muted)] dark:text-slate-200" style={{ top: row2Offset }} onClick={() => handleSort('dateStarted')}>STARTED</th>
            <th className="px-[10px] py-[6px] text-center border-r border-b border-[var(--border)] min-w-[100px] sticky z-20 bg-[var(--bg-card)] text-[var(--text-muted)] dark:text-slate-200" style={{ top: row2Offset }} onClick={() => handleSort('dateComplete')}>COMPLETED</th>
            <th className="px-[10px] py-[6px] text-center border-r border-b border-[var(--border)] min-w-[100px] sticky z-20 bg-[var(--bg-card)] text-[var(--text-muted)] dark:text-slate-200" style={{ top: row2Offset }} onClick={() => handleSort('dateChecked')}>CHECKED</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border)]">
          {tableRows.length === 0 ? (
            <tr>
              <td colSpan={14} className="sys-px sys-py text-center text-[var(--text-muted)] font-bold uppercase text-sm border-b border-[var(--border)] py-8">
                No tasks found
              </td>
            </tr>
          ) : tableRows.map((r, i) => {
            return (
              <tr 
                key={r.id || i} 
                className="transition-all duration-200 text-[14px] align-middle hover:bg-[var(--bg-surface)] group cursor-default"
              >
                {/* 1. PROJECT */}
                <td className="sys-py text-left sticky left-0 z-10 border-r border-b border-[var(--border)] backdrop-blur-md bg-[var(--bg-card)] group-hover:bg-[var(--bg-surface)] transition-colors duration-200" style={{ paddingLeft: '20px', paddingRight: '16px', verticalAlign: 'middle' }}>
                  <span className="text-[13px] font-semibold tracking-wide uppercase line-clamp-1" style={{ color: getProjectColor(r.project) }}>
                    {r.project}
                  </span>
                </td>

                {/* 2. TASK NAME */}
                <td className="sys-py text-left sticky left-[160px] z-10 border-r border-b border-[var(--border)] backdrop-blur-md bg-[var(--bg-card)] group-hover:bg-[var(--bg-surface)] transition-colors duration-200" style={{ paddingLeft: '16px', paddingRight: '16px', verticalAlign: 'middle' }}>
                  <span className="text-[var(--text-main)] font-medium line-clamp-1">{r.taskName}</span>
                </td>

                {/* MANAGER / LEADER COLUMNS */}
                <td className="sys-py align-middle text-left text-[var(--c-indigo)] font-medium border-r border-b border-[var(--border)] whitespace-nowrap min-w-[150px]" style={{ paddingLeft: '16px', paddingRight: '12px' }}>
                  {r.createdBy || '-'}
                </td>
                <td className="px-[10px] sys-py align-middle text-center text-[var(--text-muted)] font-medium border-r border-b border-[var(--border)]">
                  {r.createdAtStr || '-'}
                </td>
                <td className="px-[10px] sys-py align-middle text-center text-[var(--text-muted)] font-medium border-r border-b border-[var(--border)]">
                  {r.dateStartStr || '-'}
                </td>
                <td className="px-[10px] sys-py align-middle text-center text-[var(--text-muted)] font-medium border-r border-b border-[var(--border)]">
                  {r.dateEndStr || '-'}
                </td>

                {/* USER COLUMNS (Đã bỏ ACCEPTED) */}
                <td className="sys-py text-left text-[var(--c-cyan)] font-medium border-r border-b border-[var(--border)] whitespace-nowrap min-w-[150px]" style={{ paddingLeft: '16px', paddingRight: '12px', verticalAlign: 'middle' }}>
                  {r.userName || '-'}
                </td>
                <td className="px-[10px] sys-py align-middle text-center text-[var(--text-muted)] font-medium border-r border-b border-[var(--border)]">
                  {r.dateStartedStr || '-'}
                </td>
                <td className="px-[10px] sys-py align-middle text-center text-[var(--text-muted)] font-medium border-r border-b border-[var(--border)]">
                  {r.dateCompleteStr || '-'}
                </td>
                <td className="px-[10px] sys-py align-middle text-center text-[var(--text-muted)] font-medium border-r border-b border-[var(--border)]">
                  {r.dateCheckedStr || '-'}
                </td>

                {/* AREA */}
                <td className="px-[10px] sys-py align-middle text-center border-r border-b border-[var(--border)] text-[var(--text-muted)]">
                  {r.area || '-'}
                </td>

                {/* PLAN TIME (hours_planned) */}
                <td className="sys-px sys-py align-middle text-center border-r border-b border-[var(--border)] font-semibold text-[var(--c-emerald)]">
                  {r.time1Str || '-'}
                </td>

                {/* USER TIME (hours_complete) */}
                <td className="sys-px sys-py align-middle text-center border-r border-b border-[var(--border)] font-semibold text-[var(--c-sky)]">
                  {r.time2Str || r.time3Str || '-'}
                </td>

                {/* REVIEW (Ô nhập thời gian tùy chỉnh cho Manager / Leader) */}
                <EditableReviewCell 
                  taskId={r.id} 
                  initialValue={r.reviewTime || (r.time5Str !== '-' ? r.time5Str : '')} 
                  onSave={onUpdateReview} 
                  canEdit={canEditReview} 
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default UnifiedTable;
