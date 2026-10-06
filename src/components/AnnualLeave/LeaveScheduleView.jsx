import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';
import { 
  format, 
  parseISO, 
  getDaysInMonth, 
  getDay, 
  isWithinInterval, 
  differenceInMinutes, 
  startOfMonth, 
  endOfMonth,
  startOfYear,
  endOfYear,
  isSameDay
} from 'date-fns';
import * as XLSX from 'xlsx';
import excelData from './excelScheduleData.json';

// Helper for Vietnamese / English fuzzy name matching
const normalizeStr = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const LeaveScheduleView = ({
  users = [],
  filteredUsersByTeam = [],
  selectedTeam = 'ALL',
  selectedYear = '2026',
  allLeaveEntries = [],
  searchQuery = '',
  currentMonth = 10,
  setCurrentMonth,
  subView = 'daily',
  setSubView
}) => {
  const [localSubView, setLocalSubView] = useState('daily');
  const activeSubView = subView || localSubView;
  const setActiveSubView = setSubView || setLocalSubView;

  // Year from top header bar
  const currentYear = parseInt(selectedYear) || 2026;

  // 1. Generate working days (Monday - Friday) for the selected month
  const workingDays = useMemo(() => {
    const totalDays = getDaysInMonth(new Date(currentYear, currentMonth - 1, 1));
    const days = [];
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(currentYear, currentMonth - 1, d);
      const dayOfWeek = getDay(dateObj); // 0 = Sun, 1 = Mon ... 6 = Sat
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Only Mon to Fri
        days.push({
          dayNumber: d,
          weekday: WEEKDAY_NAMES[dayOfWeek],
          fullDate: format(dateObj, 'yyyy-MM-dd'),
          dateObj
        });
      }
    }
    return days;
  }, [currentYear, currentMonth]);

  // 2. Pre-process Supabase NMK_Leave entries by user and date
  // Key format: `${userId}_${yyyy-MM-dd}` -> { days: number, reason: string, type: string }
  const dbLeavesMap = useMemo(() => {
    const map = {};
    const yearStart = startOfYear(new Date(currentYear, 0, 1));
    const yearEnd = endOfYear(new Date(currentYear, 0, 1));

    allLeaveEntries.forEach(entry => {
      if (!entry.create_by) return;
      try {
        const list = typeof entry.leave_list === 'string' ? JSON.parse(entry.leave_list) : (entry.leave_list || []);
        list.forEach(seg => {
          const dStart = parseISO(seg.LeaveStart || seg.Start);
          const dEnd = parseISO(seg.LeaveEnd || seg.End);
          if (isWithinInterval(dStart, { start: yearStart, end: yearEnd })) {
            const dateStr = format(dStart, 'yyyy-MM-dd');
            const diffHours = Math.abs(differenceInMinutes(dEnd, dStart)) / 60;
            let dayFraction = 1.0;
            if (diffHours < 3) dayFraction = diffHours / 8;
            else if (diffHours < 7.5) dayFraction = 0.5;

            const key = `${entry.create_by}_${dateStr}`;
            map[key] = {
              days: dayFraction,
              reason: entry.leave_reason || 'Nghỉ phép',
              type: entry.type || 'Annual Leave'
            };
          }
        });
      } catch (err) {}
    });
    return map;
  }, [allLeaveEntries, currentYear]);

  // 3. User rows sorted and grouped by Team
  const displayUsers = useMemo(() => {
    return filteredUsersByTeam.filter(u => {
      if (!searchQuery.trim()) return true;
      const q = normalizeStr(searchQuery);
      return normalizeStr(u.name).includes(q) || normalizeStr(u.team).includes(q);
    }).sort((a, b) => {
      if (a.team < b.team) return -1;
      if (a.team > b.team) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [filteredUsersByTeam, searchQuery]);

  // 4. Calculate Daily Leave Data for the active month
  const dailyData = useMemo(() => {
    return displayUsers.map(u => {
      const uNorm = normalizeStr(u.name);
      let monthTotal = 0;

      const daysLeave = workingDays.map(day => {
        // A. Check Supabase DB
        const dbKey = `${u.id}_${day.fullDate}`;
        if (dbLeavesMap[dbKey]) {
          const val = dbLeavesMap[dbKey].days;
          monthTotal += val;
          return {
            hasLeave: true,
            days: val,
            reason: dbLeavesMap[dbKey].reason,
            type: dbLeavesMap[dbKey].type,
            source: 'db'
          };
        }

        // B. Check Excel Historical Data Fallback
        const excelMatch = excelData.dailyLeaves?.find(item => {
          const itemUserNorm = normalizeStr(item.user);
          const isUser = itemUserNorm.includes(uNorm) || uNorm.includes(itemUserNorm);
          return isUser && item.month === currentMonth && (item.dayRaw === day.dayNumber || item.dayRaw === day.fullDate);
        });

        if (excelMatch) {
          const val = excelMatch.daysTaken || 1;
          monthTotal += val;
          return {
            hasLeave: true,
            days: val,
            reason: 'Lịch nghỉ kế hoạch (Excel Schedule)',
            type: 'Scheduled Leave',
            source: 'excel'
          };
        }

        return { hasLeave: false, days: 0 };
      });

      return {
        user: u,
        daysLeave,
        monthTotal
      };
    });
  }, [displayUsers, workingDays, dbLeavesMap, currentMonth]);

  // 5. Daily column totals (how many people off each day)
  const columnTotals = useMemo(() => {
    return workingDays.map((_, colIdx) => {
      let totalOff = 0;
      dailyData.forEach(row => {
        if (row.daysLeave[colIdx]?.hasLeave) {
          totalOff += (row.daysLeave[colIdx].days || 1);
        }
      });
      return totalOff;
    });
  }, [workingDays, dailyData]);

  // 6. Calculate 12-Month Matrix Data (T1 -> T12)
  const matrixData = useMemo(() => {
    return displayUsers.map(u => {
      const uNorm = normalizeStr(u.name);
      const months = Array(12).fill(0);

      // A. Calculate from Supabase DB
      allLeaveEntries.forEach(entry => {
        if (entry.create_by !== u.id) return;
        try {
          const list = typeof entry.leave_list === 'string' ? JSON.parse(entry.leave_list) : (entry.leave_list || []);
          list.forEach(seg => {
            const d = parseISO(seg.LeaveStart || seg.Start);
            if (d.getFullYear() === currentYear) {
              const mIdx = d.getMonth(); // 0-11
              const diffHours = Math.abs(differenceInMinutes(parseISO(seg.LeaveEnd || seg.End), d)) / 60;
              let frac = 1.0;
              if (diffHours < 3) frac = diffHours / 8;
              else if (diffHours < 7.5) frac = 0.5;
              months[mIdx] += frac;
            }
          });
        } catch (err) {}
      });

      // B. Merge Excel Sheet1 Historical baseline
      const excelYear = excelData.yearlyMatrix?.[currentYear.toString()] || {};
      for (const [xName, xVals] of Object.entries(excelYear)) {
        const xNorm = normalizeStr(xName);
        if (uNorm.includes(xNorm) || xNorm.includes(uNorm)) {
          for (let m = 1; m <= 12; m++) {
            const tKey = `T${m}`;
            if (xVals[tKey] && months[m - 1] === 0) {
              months[m - 1] = xVals[tKey];
            }
          }
          break;
        }
      }

      const totalYear = months.reduce((sum, val) => sum + val, 0);

      return {
        user: u,
        months,
        totalYear
      };
    });
  }, [displayUsers, allLeaveEntries, currentYear]);

  // 7. Monthly column totals for matrix
  const matrixMonthTotals = useMemo(() => {
    const sums = Array(12).fill(0);
    matrixData.forEach(row => {
      row.months.forEach((val, idx) => {
        sums[idx] += val;
      });
    });
    const grandTotal = sums.reduce((a, b) => a + b, 0);
    return { sums, grandTotal };
  }, [matrixData]);

  // 8. Export current view to Excel
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      if (activeSubView === 'daily') {
        const headerRow1 = ['Team', 'User', ...workingDays.map(d => `${d.weekday} (${d.dayNumber})`), 'Total Days Off'];
        const rows = dailyData.map(r => {
          const rowVals = r.daysLeave.map(d => d.hasLeave ? (d.days === 1 ? 'ALL DAY' : `${d.days * 100}%`) : '');
          return [r.user.team, r.user.name, ...rowVals, r.monthTotal];
        });
        const ws = XLSX.utils.aoa_to_sheet([headerRow1, ...rows]);
        XLSX.utils.book_append_sheet(wb, ws, `Month ${currentMonth}-${currentYear}`);
        XLSX.writeFile(wb, `Apex_Leave_Schedule_${currentMonth}_${currentYear}.xlsx`);
      } else {
        const headerRow = ['Team', 'User', ...MONTH_SHORT, 'Full Year Total'];
        const rows = matrixData.map(r => [
          r.user.team,
          r.user.name,
          ...r.months.map(m => m > 0 ? m : ''),
          r.totalYear
        ]);
        rows.push(['TOTAL', 'ALL', ...matrixMonthTotals.sums, matrixMonthTotals.grandTotal]);
        const ws = XLSX.utils.aoa_to_sheet([headerRow, ...rows]);
        XLSX.utils.book_append_sheet(wb, ws, `Matrix ${currentYear}`);
        XLSX.writeFile(wb, `Apex_Leave_Matrix_${currentYear}.xlsx`);
      }
    } catch (err) {
      console.error('Export Excel failed:', err);
    }
  };

  // Render personal total with conditional color rules (unified typography)
  const renderPersonalTotal = (total) => {
    if (!total || total <= 0) {
      return <span className="text-[var(--text-muted)] text-[13px] opacity-40 font-bold">—</span>;
    }
    // Trên 15: màu đỏ có box
    if (total > 15) {
      return (
        <span className="inline-block px-2 py-0.5 rounded-[5px] bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[13px] font-bold shadow-xs">
          {total}
        </span>
      );
    }
    // Đúng 15: màu đỏ
    if (total === 15) {
      return (
        <span className="text-[13px] font-bold text-rose-600 dark:text-rose-400">
          {total}
        </span>
      );
    }
    // Trên 10: màu cam (từ 10 đến dưới 15)
    if (total >= 10) {
      return (
        <span className="text-[13px] font-bold text-amber-500 dark:text-amber-400">
          {total}
        </span>
      );
    }
    // Dưới 10: màu xanh lá
    return (
      <span className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
        {total}
      </span>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full h-full flex-1 min-h-0 flex flex-col overflow-hidden gap-[10px]">
      
      {/* ── TOP CONTROL TOOLBAR: iOS / iPhone Segmented Style (Border Radius 5px) ── */}
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-[5px] bg-[var(--bg-card)] border border-[var(--border)] shadow-sm backdrop-blur-md">
        
        {/* Left: DAILY / MATRIX Segmented Control */}
        <div className="bg-slate-200/80 dark:bg-slate-800/80 p-[4px] rounded-[5px] flex items-center gap-[5px] border border-slate-300/40 dark:border-slate-700/50">
          <button
            type="button"
            onClick={() => setActiveSubView('daily')}
            style={{ padding: '5px 12px' }}
            className={`rounded-[5px] font-semibold text-xs tracking-wider transition-all cursor-pointer inline-flex items-center justify-center leading-none ${
              activeSubView === 'daily'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            DAILY
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('matrix')}
            style={{ padding: '5px 12px' }}
            className={`rounded-[5px] font-semibold text-xs tracking-wider transition-all cursor-pointer inline-flex items-center justify-center leading-none ${
              activeSubView === 'matrix'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            MATRIX
          </button>
        </div>

        {/* Right: Legend & Export Excel */}
        <div className="flex items-center gap-3">
          {activeSubView === 'daily' && (
            <div className="hidden lg:flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 pr-2 border-r border-[var(--border)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[3px] bg-emerald-500 shadow-sm inline-block" />
                <span>All Day (1.0d)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[3px] bg-blue-500 shadow-sm inline-block" />
                <span>Half Day (0.5d)</span>
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1 rounded-[5px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Export to Excel spreadsheet"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        </div>

      </div>

      {/* ── VIEW 1: DAILY LEAVE SCHEDULE (Mo-Fr) ── */}
      {activeSubView === 'daily' && (
        <div className="leave-table-wrapper flex-1 min-h-0 overflow-auto rounded-[5px]">
          <table className="leave-table min-w-full">
            <thead>
              {/* Header 1: Weekday names */}
              <tr>
                <th 
                  className="th-primary sticky top-0 left-0 z-40 text-left border-b border-r border-[var(--border)] bg-[var(--bg-card)] uppercase" 
                  style={{ minWidth: '110px', paddingLeft: '12px', paddingRight: '12px' }}
                >
                  TEAM
                </th>
                <th 
                  className="th-primary sticky top-0 left-[110px] z-40 text-left border-b border-r border-[var(--border)] bg-[var(--bg-card)] shadow-r" 
                  style={{ minWidth: '170px', paddingLeft: '12px', paddingRight: '12px' }}
                >
                  USER
                </th>
                {workingDays.map((d, idx) => (
                  <th 
                    key={`wd_${idx}`} 
                    className="th-primary sticky top-0 z-30 text-center border-b border-r border-[var(--border)] bg-[var(--bg-card)]"
                    style={{ minWidth: '40px', padding: '6px 4px' }}
                  >
                    <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase">{d.weekday}</div>
                    <div className="text-[13px] font-black text-[var(--text-contrast)]">{d.dayNumber}</div>
                  </th>
                ))}
                <th 
                  className="th-primary sticky top-0 right-0 z-40 text-center border-b border-l border-[var(--border)] bg-[var(--bg-card)] shadow-l"
                  style={{ minWidth: '80px', padding: '8px 12px' }}
                >
                  TOTAL
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.03]">
              {dailyData.map((row, i) => {
                const u = row.user;
                const isFirstOfTeam = i === 0 || dailyData[i - 1].user.team !== u.team;
                let teamRowCount = 1;
                if (isFirstOfTeam) {
                  for (let j = i + 1; j < dailyData.length; j++) {
                    if (dailyData[j].user.team === u.team) teamRowCount++;
                    else break;
                  }
                }

                return (
                  <tr 
                    key={u.id}
                    className="team-row"
                    style={{ backgroundColor: i % 2 === 0 ? 'var(--row-odd)' : 'var(--row-even)' }}
                  >
                    {isFirstOfTeam && (
                      <td 
                        rowSpan={teamRowCount}
                        className="sticky left-0 z-20 align-middle border-r border-[var(--border)] bg-[var(--bg-surface)] text-left"
                        style={{ paddingLeft: '12px', paddingRight: '12px' }}
                      >
                        <span className="text-[13px] font-bold text-indigo-500 uppercase tracking-widest">{u.team}</span>
                      </td>
                    )}
                    <td 
                      className="sticky left-[110px] z-20 border-r border-[var(--border)] bg-[var(--bg-surface)] shadow-r"
                      style={{ paddingLeft: '12px', paddingRight: '12px' }}
                    >
                      <div className="team-name text-left truncate font-bold text-[13px]">{u.name}</div>
                    </td>

                    {/* Day Cells */}
                    {row.daysLeave.map((cell, cIdx) => {
                      const isFullDay = cell.hasLeave && cell.days >= 0.9;
                      const isHalfDay = cell.hasLeave && cell.days < 0.9;

                      return (
                        <td 
                          key={`cell_${u.id}_${cIdx}`}
                          className="text-center p-1 border-r border-[var(--border)] align-middle relative group"
                        >
                          {isFullDay && (
                            <div 
                              className="w-full py-1 rounded-[3px] bg-emerald-500 text-white font-bold text-[11px] shadow-sm flex items-center justify-center cursor-default"
                              title={`${u.name} full day off (${workingDays[cIdx].fullDate}): ${cell.reason}`}
                            >
                              1.0
                            </div>
                          )}

                          {isHalfDay && (
                            <div 
                              className="w-full py-1 rounded-[3px] bg-blue-500 text-white font-bold text-[11px] shadow-sm flex items-center justify-center cursor-default"
                              title={`${u.name} half day off (${workingDays[cIdx].fullDate}): ${cell.reason}`}
                            >
                              0.5
                            </div>
                          )}

                          {!cell.hasLeave && (
                            <span className="text-[var(--text-muted)] opacity-20 text-xs font-mono">·</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Total days off in active month */}
                    <td className="sticky right-0 z-20 text-center border-l border-[var(--border)] bg-[var(--bg-surface)] shadow-l">
                      <span className={`text-[13px] font-bold ${row.monthTotal > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)] opacity-40'}`}>
                        {row.monthTotal > 0 ? row.monthTotal : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Bottom Summary Row: People on leave per day */}
            <tfoot>
              <tr className="sticky bottom-0 z-30 bg-[var(--bg-card)] border-t-2 border-[var(--border)] text-xs">
                <td colSpan={2} className="sticky left-0 z-40 bg-[var(--bg-card)] p-3 text-right uppercase tracking-wider text-[var(--text-muted)] font-bold border-r border-[var(--border)]">
                  DAILY ABSENCES:
                </td>
                {columnTotals.map((tot, idx) => (
                  <td key={`tot_${idx}`} className="text-center py-2 px-1 border-r border-[var(--border)] text-[13px] font-bold">
                    <span className={tot > 0 ? 'text-rose-500' : 'text-[var(--text-muted)]'}>
                      {tot > 0 ? tot : '0'}
                    </span>
                  </td>
                ))}
                <td className="sticky right-0 z-40 bg-[var(--bg-card)] text-center text-[13px] font-bold text-indigo-600 dark:text-indigo-400 border-l border-[var(--border)]">
                  {columnTotals.reduce((a, b) => a + b, 0)}d
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── VIEW 2: 12-MONTH MATRIX SUMMARY (M1 - M12) ── */}
      {activeSubView === 'matrix' && (
        <div className="leave-table-wrapper flex-1 min-h-0 overflow-auto rounded-[5px]">
          <table className="leave-table min-w-full">
            <thead>
              <tr>
                <th className="th-primary sticky top-0 left-0 z-40 text-left border-b border-r border-[var(--border)] bg-[var(--bg-card)] uppercase" style={{ minWidth: '120px', paddingLeft: '12px', paddingRight: '12px' }}>TEAM</th>
                <th className="th-primary sticky top-0 left-[120px] z-40 text-left border-b border-r border-[var(--border)] bg-[var(--bg-card)] shadow-r uppercase" style={{ minWidth: '180px', paddingLeft: '12px', paddingRight: '12px' }}>USER</th>
                {MONTH_SHORT.map((mShort, i) => (
                  <th key={`m_head_${i+1}`} className="th-primary sticky top-0 z-30 text-center border-b border-r border-[var(--border)] bg-[var(--bg-card)]" style={{ minWidth: '55px' }}>
                    {mShort}
                  </th>
                ))}
                <th className="th-primary sticky top-0 right-0 z-40 text-center border-b border-l border-[var(--border)] bg-[var(--bg-card)] shadow-l" style={{ minWidth: '90px' }}>
                  TOTAL
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.03]">
              {matrixData.map((row, i) => {
                const u = row.user;
                const isFirstOfTeam = i === 0 || matrixData[i - 1].user.team !== u.team;
                let teamRowCount = 1;
                if (isFirstOfTeam) {
                  for (let j = i + 1; j < matrixData.length; j++) {
                    if (matrixData[j].user.team === u.team) teamRowCount++;
                    else break;
                  }
                }

                return (
                  <tr 
                    key={`mat_${u.id}`}
                    className="team-row"
                    style={{ backgroundColor: i % 2 === 0 ? 'var(--row-odd)' : 'var(--row-even)' }}
                  >
                    {isFirstOfTeam && (
                      <td 
                        rowSpan={teamRowCount}
                        className="sticky left-0 z-20 align-middle border-r border-[var(--border)] bg-[var(--bg-surface)] text-left"
                        style={{ paddingLeft: '12px', paddingRight: '12px' }}
                      >
                        <span className="text-[13px] font-bold text-indigo-500 uppercase tracking-widest">{u.team}</span>
                      </td>
                    )}
                    <td 
                      className="sticky left-[120px] z-20 border-r border-[var(--border)] bg-[var(--bg-surface)] shadow-r"
                      style={{ paddingLeft: '12px', paddingRight: '12px' }}
                    >
                      <div className="team-name text-left truncate font-bold text-[13px]">{u.name}</div>
                    </td>

                    {/* 12 Months Cells: Plain black text, no colored boxes, unified typography */}
                    {row.months.map((val, mIdx) => (
                      <td key={`mval_${u.id}_${mIdx}`} className="text-center border-r border-[var(--border)] py-2">
                        {val > 0 ? (
                          <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                            {val}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] opacity-20 text-[13px] font-bold">·</span>
                        )}
                      </td>
                    ))}

                    {/* Year Total: Unified typography */}
                    <td className="sticky right-0 z-20 text-center border-l border-[var(--border)] bg-[var(--bg-surface)] shadow-l">
                      {renderPersonalTotal(row.totalYear)}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Bottom Total Row */}
            <tfoot>
              <tr className="sticky bottom-0 z-30 bg-[var(--bg-card)] border-t-2 border-[var(--border)] text-xs">
                <td colSpan={2} className="sticky left-0 z-40 bg-[var(--bg-card)] p-3 text-right uppercase tracking-wider text-[var(--text-muted)] font-bold border-r border-[var(--border)]">
                  MONTHLY TOTAL:
                </td>
                {matrixMonthTotals.sums.map((sumVal, idx) => (
                  <td key={`sum_m_${idx}`} className="text-center py-2 px-1 border-r border-[var(--border)] text-[13px] font-bold text-indigo-600 dark:text-indigo-400">
                    {sumVal > 0 ? sumVal : '0'}
                  </td>
                ))}
                <td className="sticky right-0 z-40 bg-[var(--bg-card)] text-center text-[13px] font-bold text-emerald-600 dark:text-emerald-400 border-l border-[var(--border)]">
                  {matrixMonthTotals.grandTotal}d
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

    </motion.div>
  );
};

export default LeaveScheduleView;
