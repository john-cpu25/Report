import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { parseISO } from 'date-fns';
import { supabase } from '../../supabaseClient';

const HOURS_PER_DAY = 8; // Quy chuẩn: 8 giờ làm thêm (OT) = 1 ngày nghỉ bù
const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Helper to get the mid-week date (Thursday) of an ISO week and year to determine month
const getMidWeekOfISOWeek = (week, year) => {
  const simple = new Date(year, 0, 4);
  const dayOfWeek = simple.getDay() || 7;
  const mondayOfWeek1 = new Date(simple);
  mondayOfWeek1.setDate(simple.getDate() - (dayOfWeek - 1));
  const targetThursday = new Date(mondayOfWeek1);
  targetThursday.setDate(mondayOfWeek1.getDate() + (week - 1) * 7 + 3);
  return targetThursday;
};

// Helper for fuzzy search
const normalizeStr = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

const OvertimeLeaveView = ({
  users = [],
  filteredUsersByTeam = [],
  selectedTeam = 'ALL',
  selectedYear = '2026',
  isAdmin = false,
  currentUser = null,
  allLeaveEntries = [],
  otConversions = [],
  setOtConversions = () => {},
  searchQuery = '',
  onConversionSuccess = () => {}
}) => {
  const [timesheetRecords, setTimesheetRecords] = useState([]);
  const [isLoadingTimesheet, setIsLoadingTimesheet] = useState(false);

  // 1. Fetch APEX_TimeSheet data from Supabase
  useEffect(() => {
    let isMounted = true;
    const fetchTimesheetData = async () => {
      setIsLoadingTimesheet(true);
      try {
        const { data, error } = await supabase
          .from('APEX_TimeSheet')
          .select('*');

        if (isMounted && !error && data) {
          setTimesheetRecords(data);
        }
      } catch (err) {
        console.error('Error fetching Timesheet in OvertimeLeaveView:', err);
      } finally {
        if (isMounted) setIsLoadingTimesheet(false);
      }
    };

    fetchTimesheetData();
    return () => { isMounted = false; };
  }, []);

  // 2. Direct inline update for converted OT hours
  const handleUpdateConvertedHours = (userId, userName, userTeam, newHours) => {
    const val = parseFloat(newHours);
    const hours = isNaN(val) || val < 0 ? 0 : val;
    const leaveDays = hours / HOURS_PER_DAY;

    setOtConversions(prev => {
      const existingIdx = prev.findIndex(c => c.userId === userId);
      let updated;
      if (hours === 0) {
        updated = prev.filter(c => c.userId !== userId);
      } else if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          otHours: hours,
          leaveDays: leaveDays,
          convertedAt: new Date().toISOString()
        };
      } else {
        updated = [
          ...prev,
          {
            id: `conv_${Date.now()}_${userId}`,
            userId,
            userName,
            userTeam,
            otHours: hours,
            leaveDays: leaveDays,
            type: 'allowance',
            convertedAt: new Date().toISOString(),
            note: 'Tự chuyển đổi trực tiếp'
          }
        ];
      }
      try {
        localStorage.setItem('apex_ot_conversions', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    onConversionSuccess();
  };

  // 3. Build User OT Table Data aggregated from APEX_TimeSheet (TEAM, USER, JAN..DEC, TOTAL OT, CONVERTED OT)
  const otTableData = useMemo(() => {
    const currentYearNum = parseInt(selectedYear) || 2026;
    const isAllYears = selectedYear === 'ALL';

    // Map: userId -> Array of 12 month numbers
    const userOtMonthsMap = {};
    // Map: userId -> total OT hours
    const userOtTotalMap = {};

    // Group timesheet rows by (user_id, year, week) to calculate weekly total & weekend hours
    const userWeeks = {};
    timesheetRecords.forEach(t => {
      if (!t.user_id || !t.year || !t.week) return;
      const key = `${t.user_id}_${t.year}_${t.week}`;
      if (!userWeeks[key]) {
        userWeeks[key] = {
          userId: t.user_id,
          year: Number(t.year),
          week: Number(t.week),
          mon: 0,
          tue: 0,
          wed: 0,
          thu: 0,
          fri: 0,
          sat: 0,
          sun: 0
        };
      }
      userWeeks[key].mon += Number(t.mon) || 0;
      userWeeks[key].tue += Number(t.tue) || 0;
      userWeeks[key].wed += Number(t.wed) || 0;
      userWeeks[key].thu += Number(t.thu) || 0;
      userWeeks[key].fri += Number(t.fri) || 0;
      userWeeks[key].sat += Number(t.sat) || 0;
      userWeeks[key].sun += Number(t.sun) || 0;
    });

    // Calculate OT per week: Giờ vượt 40h/tuần (Mon-Fri) + Giờ làm Thứ 7 & CN
    Object.values(userWeeks).forEach(uw => {
      if (!isAllYears && uw.year !== currentYearNum) return;

      const weekdayHours = uw.mon + uw.tue + uw.wed + uw.thu + uw.fri;
      const weekendHours = uw.sat + uw.sun;
      const excessWeekdayOt = Math.max(0, weekdayHours - 40);
      const otHours = excessWeekdayOt + weekendHours;

      if (otHours > 0) {
        const midWeekDate = getMidWeekOfISOWeek(uw.week, uw.year);
        const mIdx = midWeekDate.getMonth(); // 0 to 11
        if (mIdx >= 0 && mIdx < 12) {
          if (!userOtMonthsMap[uw.userId]) {
            userOtMonthsMap[uw.userId] = Array(12).fill(0);
          }
          userOtMonthsMap[uw.userId][mIdx] += otHours;
          userOtTotalMap[uw.userId] = (userOtTotalMap[uw.userId] || 0) + otHours;
        }
      }
    });

    // Total converted OT and leave days by userId
    const convertedMap = {};
    otConversions.forEach(c => {
      if (c.userId) {
        convertedMap[c.userId] = (convertedMap[c.userId] || 0) + (Number(c.otHours) || 0);
      }
    });

    const q = normalizeStr(searchQuery);

    return filteredUsersByTeam
      .filter(u => {
        if (!q) return true;
        const nameNorm = normalizeStr(u.name);
        const teamNorm = normalizeStr(u.team);
        return nameNorm.includes(q) || teamNorm.includes(q);
      })
      .map(u => {
        const uName = u.name || u.email;
        const months = userOtMonthsMap[u.id] || Array(12).fill(0);
        const rawOtHours = userOtTotalMap[u.id] || 0;
        const convertedOtHours = convertedMap[u.id] || 0;

        return {
          id: u.id,
          name: uName,
          team: u.team || '-',
          months,
          rawOtHours,
          convertedOtHours
        };
      })
      .sort((a, b) => {
        if (a.team < b.team) return -1;
        if (a.team > b.team) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [filteredUsersByTeam, timesheetRecords, otConversions, searchQuery, selectedYear]);

  // Monthly totals for footer
  const monthlyTotals = useMemo(() => {
    const sums = Array(12).fill(0);
    otTableData.forEach(row => {
      row.months.forEach((val, idx) => {
        sums[idx] += val;
      });
    });
    return sums;
  }, [otTableData]);

  const totalRawHours = useMemo(() => {
    return otTableData.reduce((acc, u) => acc + (u.rawOtHours || 0), 0);
  }, [otTableData]);

  const totalConvertedHours = useMemo(() => {
    return otTableData.reduce((acc, u) => acc + (u.convertedOtHours || 0), 0);
  }, [otTableData]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full h-full flex-1 min-h-0 flex flex-col overflow-hidden">
      
      {/* ── MAIN OVERTIME TABLE: MONTHLY BREAKDOWN & EDITABLE CONVERSION ── */}
      <div className="leave-table-wrapper flex-1 min-h-0 overflow-auto">
        <table className="leave-table min-w-full">
          <thead>
            <tr>
              <th 
                className="th-primary sticky top-0 left-0 z-40 text-left border-b border-r border-[var(--border)] bg-[var(--bg-card)] uppercase" 
                style={{ paddingLeft: '12px', paddingRight: '12px', minWidth: '110px' }}
              >
                TEAM
              </th>
              <th 
                className="th-primary sticky top-0 left-[110px] z-40 text-left border-b border-r border-[var(--border)] bg-[var(--bg-card)] shadow-r uppercase" 
                style={{ paddingLeft: '12px', paddingRight: '12px', minWidth: '170px' }}
              >
                USER
              </th>
              
              {/* 12 Months: JAN - DEC */}
              {MONTH_SHORT.map((mShort, i) => (
                <th 
                  key={`m_ot_head_${i}`} 
                  className="th-primary sticky top-0 z-30 text-center border-b border-r border-[var(--border)] bg-[var(--bg-card)] uppercase" 
                  style={{ minWidth: '55px' }}
                >
                  {mShort}
                </th>
              ))}

              <th 
                className="th-primary sticky top-0 z-30 text-center border-b border-r border-[var(--border)] bg-[var(--bg-card)] uppercase" 
                style={{ minWidth: '100px' }}
              >
                TOTAL OT
              </th>
              <th 
                className="th-primary sticky top-0 z-30 text-center border-b border-[var(--border)] bg-[var(--bg-card)] uppercase" 
                style={{ minWidth: '200px' }}
              >
                CONVERTED OT
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.03]">
            {otTableData.map((u, i) => {
              const isFirstOfTeam = i === 0 || otTableData[i - 1].team !== u.team;
              let teamRowCount = 1;
              if (isFirstOfTeam) {
                for (let j = i + 1; j < otTableData.length; j++) {
                  if (otTableData[j].team === u.team) teamRowCount++;
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
                      <span className="text-[13px] font-bold text-indigo-500 uppercase tracking-widest px-1">{u.team}</span>
                    </td>
                  )}

                  <td 
                    className="sticky left-[110px] z-20 border-r border-[var(--border)] bg-[var(--bg-surface)] shadow-r" 
                    style={{ paddingLeft: '12px', paddingRight: '12px' }}
                  >
                    <div className="team-name text-left truncate font-bold text-[13px]">{u.name}</div>
                  </td>

                  {/* 12 Months: JAN - DEC */}
                  {u.months.map((val, mIdx) => (
                    <td key={`mval_${u.id}_${mIdx}`} className="text-center border-r border-[var(--border)] py-2.5">
                      {val > 0 ? (
                        <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                          {val.toFixed(1)}h
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)] opacity-20 text-[13px] font-bold">·</span>
                      )}
                    </td>
                  ))}

                  {/* TOTAL OT */}
                  <td className="text-center border-r border-[var(--border)] py-2.5 bg-[var(--bg-surface)]">
                    <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                      {u.rawOtHours > 0 ? `${u.rawOtHours.toFixed(1)}h` : '0h'}
                    </span>
                  </td>

                  {/* CONVERTED OT: INLINE EDITABLE */}
                  <td className="text-center py-2.5">
                    <div className="inline-flex items-center justify-center gap-2">
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={u.convertedOtHours > 0 ? u.convertedOtHours : ''}
                          onChange={(e) => handleUpdateConvertedHours(u.id, u.name, u.team, e.target.value)}
                          placeholder="0.0"
                          className="w-20 px-2.5 py-1 text-center font-bold text-xs rounded-[5px] border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-2xs"
                        />
                        <span className="text-[11px] font-bold text-slate-400 ml-1.5">h</span>
                      </div>

                      {u.convertedOtHours > 0 && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                          = {(u.convertedOtHours / HOURS_PER_DAY).toFixed(1)}d
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {otTableData.length === 0 && (
              <tr>
                <td colSpan={16} className="text-center py-8 text-sm text-[var(--text-muted)] font-medium">
                  {isLoadingTimesheet ? 'Đang tải dữ liệu Timesheet...' : 'Không có thành viên nào phù hợp'}
                </td>
              </tr>
            )}
          </tbody>

          {/* Bottom Total Row */}
          <tfoot>
            <tr className="sticky bottom-0 z-30 bg-[var(--bg-card)] border-t-2 border-[var(--border)] text-xs">
              <td 
                colSpan={2} 
                className="sticky left-0 z-40 bg-[var(--bg-card)] p-3 text-right uppercase tracking-wider text-[var(--text-muted)] font-bold border-r border-[var(--border)]"
              >
                TOTAL:
              </td>

              {/* Monthly Totals for JAN - DEC */}
              {monthlyTotals.map((tot, idx) => (
                <td key={`tot_m_${idx}`} className="text-center py-2 px-1 border-r border-[var(--border)] text-[13px] font-bold">
                  <span className={tot > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)] opacity-40'}>
                    {tot > 0 ? `${tot.toFixed(1)}h` : '0h'}
                  </span>
                </td>
              ))}

              {/* Grand Total OT */}
              <td className="text-center py-2 px-1 border-r border-[var(--border)] text-[13px] font-bold text-slate-800 dark:text-slate-100 bg-[var(--bg-surface)]">
                {totalRawHours.toFixed(1)}h
              </td>

              {/* Converted Total */}
              <td className="text-center py-2 px-1 text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                {totalConvertedHours.toFixed(1)}h
                {totalConvertedHours > 0 && ` (= ${(totalConvertedHours / HOURS_PER_DAY).toFixed(1)}d)`}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

    </motion.div>
  );
};

export default OvertimeLeaveView;
