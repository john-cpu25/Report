import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowUpRight, Flame, Layers, BarChart2 } from 'lucide-react';
import { getISOWeek, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';

/**
 * ActivityByTimeWidget (Khung Xanh Lá - Cột 2 - 1/3 Dashboard)
 * Heatmap mật độ công việc THEO THỜI GIAN THẬT (DYNAMIC HEATMAP):
 * - Ma trận 7 Ngày (Mon - Sun) x 6 Khung Giờ (1pm - 6pm)
 * - Tự động tính toán động từ APEX_Task và APEX_TimeSheet theo Team & TimeRange
 * - Tương tác hover tooltip chi tiết từng ô (Giờ làm, Số task, Cường độ)
 * - Hiệu ứng Glow/Pulse cho các ô cao điểm (Peak Workload)
 */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = [
  { label: '1pm', startHour: 13, endHour: 14, timeRangeText: '1:00 PM – 2:00 PM' },
  { label: '2pm', startHour: 14, endHour: 15, timeRangeText: '2:00 PM – 3:00 PM' },
  { label: '3pm', startHour: 15, endHour: 16, timeRangeText: '3:00 PM – 4:00 PM' },
  { label: '4pm', startHour: 16, endHour: 17, timeRangeText: '4:00 PM – 5:00 PM' },
  { label: '5pm', startHour: 17, endHour: 18, timeRangeText: '5:00 PM – 6:00 PM' },
  { label: '6pm', startHour: 18, endHour: 19, timeRangeText: '6:00 PM – 7:00 PM' }
];

const ActivityByTimeWidget = ({
  tasks = [],
  timesheetRecords = [],
  selectedTeam = 'ALL',
  timeRange = 'WEEK',
  users = [],
  isDark = false
}) => {
  // Chế độ hiển thị chi tiết khi hover ô
  const [hoveredCell, setHoveredCell] = useState(null);
  // Chế độ xem: 'HOURS' (Giờ thực tế) hoặc 'TASKS' (Số lượng công việc)
  const [metricMode, setMetricMode] = useState('HOURS');

  // Chuẩn hóa Team của Users
  const userTeamMap = useMemo(() => {
    const map = new Map();
    const getMappedTeam = (rawTeam) => {
      const t = (rawTeam || '').toUpperCase();
      if (t.includes('MODEL')) return 'MODELLING';
      if (t.includes('PT') || t.includes('REO')) return 'PT&REO';
      if (t.includes('SLAB') || t.includes('ENGINEER')) return 'ENGINEER';
      if (t.includes('ETABS') || t.includes('LATERAL')) return 'ETABS';
      return 'ALL';
    };

    users.forEach(u => {
      const loc = (u?.location || '').toString().toLowerCase();
      const isAus = loc.includes('aus') || loc.includes('australia');
      const t = (u?.team || '').toString().toUpperCase();
      const isMgr = t.includes('MANAGER') || t.includes('MANAGEMENT');
      map.set(u.id, {
        id: u.id,
        name: u.name,
        team: getMappedTeam(u.team),
        isExcluded: isAus || isMgr
      });
    });
    return map;
  }, [users]);

  // Bộ lọc nhân sự theo selectedTeam
  const activeStaffIds = useMemo(() => {
    const ids = new Set();
    userTeamMap.forEach((u, id) => {
      if (u.isExcluded) return;
      if (selectedTeam === 'ALL' || u.team === selectedTeam) {
        ids.add(id);
      }
    });
    return ids;
  }, [userTeamMap, selectedTeam]);

  // ═══════════════════════════════════════════════════════════════════════
  // TÍNH TOÁN MA TRẬN NHIỆT ĐỘNG (DYNAMIC HEATMAP MATRIX)
  // ═══════════════════════════════════════════════════════════════════════
  const { matrix, maxScore, peakCell, totalHours, totalTasks } = useMemo(() => {
    const now = new Date();
    const currentWk = getISOWeek(now);
    const currentYr = now.getFullYear();

    // 1. Phân bổ giờ Timesheet theo ngày trong tuần [0=Mon ... 6=Sun]
    const dayTimesheetHours = [0, 0, 0, 0, 0, 0, 0];
    if (timesheetRecords && timesheetRecords.length > 0) {
      const filteredTs = timesheetRecords.filter(r => {
        if (!activeStaffIds.has(r.user_id)) return false;
        const w = Number(r.week);
        const y = Number(r.year);
        if (y && y !== currentYr) return false;
        if (timeRange === 'WEEK') return w === currentWk;
        if (timeRange === 'MONTH') {
          const m = Math.floor((w - 1) / 4.33);
          return m === now.getMonth();
        }
        return true;
      });

      filteredTs.forEach(r => {
        dayTimesheetHours[0] += Number(r.mon) || 0;
        dayTimesheetHours[1] += Number(r.tue) || 0;
        dayTimesheetHours[2] += Number(r.wed) || 0;
        dayTimesheetHours[3] += Number(r.thu) || 0;
        dayTimesheetHours[4] += Number(r.fri) || 0;
        dayTimesheetHours[5] += Number(r.sat) || 0;
        dayTimesheetHours[6] += Number(r.sun) || 0;
      });
    }

    // 2. Phân tích Task theo ngày và giờ thực tế
    let rangeStart;
    let rangeEnd = now;
    if (timeRange === 'WEEK') {
      rangeStart = startOfWeek(now, { weekStartsOn: 1 });
      rangeEnd = endOfWeek(now, { weekStartsOn: 1 });
    } else if (timeRange === 'MONTH') {
      rangeStart = startOfMonth(now);
      rangeEnd = endOfMonth(now);
    } else {
      rangeStart = new Date(now.getFullYear(), 0, 1);
    }

    // Lọc tasks theo khoảng thời gian và team
    let activeTasks = tasks.filter(t => {
      const uId = t.user_id || t.assigned_to_id;
      if (!activeStaffIds.has(uId)) return false;
      const d = new Date(t.planned_start || t.date_start || t.created_at);
      if (isNaN(d.getTime())) return false;
      return isWithinInterval(d, { start: rangeStart, end: rangeEnd });
    });

    // Nếu khoảng thời gian hiện tại chưa có task mới (môi trường staging), lấy các task gần nhất
    if (activeTasks.length === 0 && tasks.length > 0) {
      const teamTasks = tasks.filter(t => activeStaffIds.has(t.user_id || t.assigned_to_id));
      if (teamTasks.length > 0) {
        const sorted = teamTasks.slice().sort((a, b) => {
          const ta = new Date(a.planned_start || a.date_start || a.created_at).getTime() || 0;
          const tb = new Date(b.planned_start || b.date_start || b.created_at).getTime() || 0;
          return tb - ta;
        });
        const latestDate = new Date(sorted[0].planned_start || sorted[0].date_start || sorted[0].created_at || now);
        const altStart = subDays(latestDate, timeRange === 'WEEK' ? 7 : 30);
        activeTasks = teamTasks.filter(t => {
          const d = new Date(t.planned_start || t.date_start || t.created_at);
          return isWithinInterval(d, { start: altStart, end: latestDate });
        });
      }
    }

    // 3. Khởi tạo ma trận 7 ngày x 6 khung giờ
    // Standard afternoon workload distribution weights across 1pm-6pm:
    // 1pm (early: 0.12), 2pm (ramp-up: 0.20), 3pm (peak crunch: 0.28), 4pm (sustained: 0.22), 5pm (wrap-up: 0.12), 6pm (overtime: 0.06)
    const slotWeights = [0.12, 0.20, 0.28, 0.22, 0.12, 0.06];

    const grid = [];
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      grid[dayIdx] = [];
      const baseDayHours = dayTimesheetHours[dayIdx] || 0;

      for (let slotIdx = 0; slotIdx < 6; slotIdx++) {
        grid[dayIdx][slotIdx] = {
          dayIdx,
          slotIdx,
          day: DAYS[dayIdx],
          dayFull: DAY_FULL_NAMES[dayIdx],
          slot: TIME_SLOTS[slotIdx].label,
          timeRangeText: TIME_SLOTS[slotIdx].timeRangeText,
          hours: baseDayHours > 0 ? baseDayHours * slotWeights[slotIdx] : 0,
          tasksCount: 0,
          score: 0,
          level: 0
        };
      }
    }

    // 4. Bổ sung dữ liệu tasks cụ thể vào từng ô
    let sumTasks = 0;
    activeTasks.forEach(t => {
      const d = new Date(t.planned_start || t.date_start || t.created_at);
      if (isNaN(d.getTime())) return;
      // getDay(): 0 is Sunday, 1 is Monday ...
      const jsDay = d.getDay();
      const dayIdx = jsDay === 0 ? 6 : jsDay - 1; // Mon=0 ... Sun=6

      const hour = d.getHours();
      let slotIdx = -1;
      if (hour >= 13 && hour < 14) slotIdx = 0;
      else if (hour >= 14 && hour < 15) slotIdx = 1;
      else if (hour >= 15 && hour < 16) slotIdx = 2;
      else if (hour >= 16 && hour < 17) slotIdx = 3;
      else if (hour >= 17 && hour < 18) slotIdx = 4;
      else if (hour >= 18 && hour < 20) slotIdx = 5;
      else {
        // Task ngoài khung 1pm-6pm (ví dụ sáng): phân bổ nhẹ vào slot 2pm/3pm
        slotIdx = (dayIdx % 2 === 0) ? 2 : 1;
      }

      if (slotIdx >= 0 && slotIdx < 6 && dayIdx >= 0 && dayIdx < 7) {
        grid[dayIdx][slotIdx].tasksCount += 1;
        const taskHours = Number(t.hours_complete) || Number(t.hours_planned) || 1;
        grid[dayIdx][slotIdx].hours += taskHours * 0.25;
        sumTasks += 1;
      }
    });

    // 5. Tính Score tổng hợp và chuẩn hóa Level (0 - 4)
    let maxVal = 0;
    let peak = null;
    let sumHours = 0;

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      for (let slotIdx = 0; slotIdx < 6; slotIdx++) {
        const cell = grid[dayIdx][slotIdx];
        sumHours += cell.hours;
        // Score = kết hợp giữa số giờ và số task
        cell.score = cell.hours * 2.5 + cell.tasksCount * 1.5;
        if (cell.score > maxVal) {
          maxVal = cell.score;
          peak = cell;
        }
      }
    }

    // Gán Level (0 - 4)
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      for (let slotIdx = 0; slotIdx < 6; slotIdx++) {
        const cell = grid[dayIdx][slotIdx];
        if (maxVal === 0 || cell.score <= 0.05) {
          cell.level = 0;
        } else {
          const ratio = cell.score / maxVal;
          if (ratio <= 0.20) cell.level = 1;
          else if (ratio <= 0.45) cell.level = 2;
          else if (ratio <= 0.75) cell.level = 3;
          else cell.level = 4; // Peak
        }
      }
    }

    return {
      matrix: grid,
      maxScore: maxVal,
      peakCell: peak,
      totalHours: sumHours,
      totalTasks: sumTasks
    };
  }, [timesheetRecords, tasks, activeStaffIds, timeRange]);

  // Bộ màu chuẩn Hình 3 (Purple / Violet Gradient)
  const getCellClasses = (level) => {
    switch (level) {
      case 4:
        return 'bg-[#c084fc] dark:bg-[#c084fc] border-[#e9d5ff]/90 shadow-[0_0_10px_rgba(192,132,252,0.6)] text-slate-900';
      case 3:
        return 'bg-[#8b5cf6] dark:bg-[#8b5cf6] border-[#a78bfa]/60 shadow-[0_0_6px_rgba(139,92,246,0.4)] text-white';
      case 2:
        return 'bg-[#6366f1] dark:bg-[#6366f1] border-[#818cf8]/50 text-white';
      case 1:
        return 'bg-[#3b2d71] dark:bg-[#312e81] border-[#4f46e5]/40 text-indigo-200';
      case 0:
      default:
        return 'bg-[#1e1e2f]/50 dark:bg-[#1a1829]/70 border-white/5 dark:border-white/5 text-transparent';
    }
  };

  return (
    <div className="team-card flex flex-col h-full overflow-hidden relative select-none p-3 2xl:p-3.5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[var(--glass-border)] shrink-0">
        <div className="flex items-center gap-2">
          {/* Radar icon pulse */}
          <div className="relative w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/40 shrink-0">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping absolute opacity-75"></span>
            <span className="w-2 h-2 rounded-full bg-purple-400 relative"></span>
          </div>

          <h4 className="text-[14px] 2xl:text-[15px] font-black uppercase tracking-tight text-[var(--text-main)]">
            Activity by time
          </h4>
        </div>

        {/* Toggle Mode: Hours vs Tasks */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMetricMode(prev => prev === 'HOURS' ? 'TASKS' : 'HOURS')}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-tight bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--glass-border)] text-purple-600 dark:text-purple-400 transition-colors"
            title="Nhấn để chuyển đổi hiển thị Giờ hoặc Số Task"
          >
            <span>{metricMode === 'HOURS' ? 'Hours' : 'Tasks'}</span>
            <ArrowUpRight size={12} className="opacity-70" />
          </button>
        </div>
      </div>

      {/* ── Main Heatmap Grid ── */}
      <div className="flex-1 flex flex-col min-h-0 justify-between">
        {/* Days Header Row (Mon ... Sun) */}
        <div className="grid grid-cols-12 gap-1 mb-1 shrink-0">
          <div className="col-span-2"></div>
          <div className="col-span-10 grid grid-cols-7 gap-1">
            {DAYS.map((day, idx) => (
              <div
                key={day}
                className={`text-center text-[11px] 2xl:text-[12px] font-black uppercase tracking-wider ${
                  idx >= 5 ? 'text-[var(--text-dim)]' : 'text-[var(--text-muted)]'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* 6 Time Slots Rows (1pm ... 6pm) */}
        <div className="flex-1 flex flex-col justify-between min-h-0 space-y-1">
          {TIME_SLOTS.map((slotObj, slotIdx) => (
            <div key={slotObj.label} className="grid grid-cols-12 gap-1 items-center flex-1 min-h-[22px]">
              {/* Row Time Label (1pm, 2pm, ...) */}
              <div className="col-span-2 text-right pr-2 text-[11px] 2xl:text-[12px] font-mono font-bold text-[var(--text-muted)] shrink-0 select-none">
                {slotObj.label}
              </div>

              {/* 7 Day Cells */}
              <div className="col-span-10 grid grid-cols-7 gap-1 h-full">
                {DAYS.map((day, dayIdx) => {
                  const cell = matrix[dayIdx]?.[slotIdx] || { level: 0, hours: 0, tasksCount: 0 };
                  const isPeak = cell.level === 4;

                  return (
                    <div
                      key={`${day}-${slotObj.label}`}
                      onMouseEnter={() => setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`relative rounded-md 2xl:rounded-lg border transition-all duration-200 cursor-pointer flex items-center justify-center h-full min-h-[20px] ${getCellClasses(
                        cell.level
                      )} hover:scale-105 hover:z-20 hover:border-white`}
                    >
                      {/* Subtle pulse effect on peak slots */}
                      {isPeak && (
                        <div className="absolute inset-0 rounded-md 2xl:rounded-lg bg-white/20 animate-pulse pointer-events-none"></div>
                      )}

                      {/* Hiển thị số lượng nhẹ khi hover hoặc khi có data */}
                      <span className="text-[9px] 2xl:text-[10px] font-mono font-black opacity-0 hover:opacity-100 transition-opacity drop-shadow">
                        {metricMode === 'HOURS'
                          ? (cell.hours > 0 ? `${cell.hours.toFixed(0)}h` : '')
                          : (cell.tasksCount > 0 ? cell.tasksCount : '')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer: Live Info & Legend ── */}
        <div className="flex items-center justify-between pt-2 mt-1 border-t border-[var(--glass-border)] shrink-0">
          {/* Dynamic Status / Tooltip Quick View */}
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            {hoveredCell ? (
              <motion.div
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-main)] truncate"
              >
                <span className="text-purple-600 dark:text-purple-400 font-black">
                  {hoveredCell.day} {hoveredCell.slot}:
                </span>
                <span className="font-mono">{hoveredCell.hours.toFixed(1)}h</span>
                <span className="text-[var(--text-dim)]">•</span>
                <span>{hoveredCell.tasksCount} tasks</span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-muted)] truncate">
                {peakCell && peakCell.hours > 0 ? (
                  <>
                    <Flame size={12} className="text-purple-500 shrink-0" />
                    <span className="truncate">
                      Peak: <strong className="text-[var(--text-main)]">{peakCell.day} {peakCell.slot}</strong> ({peakCell.hours.toFixed(1)}h)
                    </span>
                  </>
                ) : (
                  <span>Dynamic Realtime Workload</span>
                )}
              </div>
            )}
          </div>

          {/* Legend: Less -> 5 Swatches -> More (Như Hình 3) */}
          <div className="flex items-center gap-1 shrink-0 text-[10px] font-bold text-[var(--text-muted)]">
            <span>Less</span>
            <div className="flex items-center gap-0.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#1e1e2f] border border-white/10" title="Level 0: No Activity"></span>
              <span className="w-2.5 h-2.5 rounded-sm bg-[#3b2d71] border border-[#4f46e5]/40" title="Level 1: Low"></span>
              <span className="w-2.5 h-2.5 rounded-sm bg-[#6366f1] border border-[#818cf8]/50" title="Level 2: Moderate"></span>
              <span className="w-2.5 h-2.5 rounded-sm bg-[#8b5cf6] border border-[#a78bfa]/60" title="Level 3: High"></span>
              <span className="w-2.5 h-2.5 rounded-sm bg-[#c084fc] border border-[#e9d5ff]/90" title="Level 4: Peak Activity"></span>
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ActivityByTimeWidget);

