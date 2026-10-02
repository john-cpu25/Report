
import { format, differenceInMinutes, isWeekend, addMinutes, startOfDay, isSameDay } from 'date-fns';

/**
 * Performance Engine v1.0
 * Standardizes time and efficiency calculations across the system.
 */

// Shift Configuration
const SHIFT = {
  MORNING: { start: 8.5, end: 12.5 }, // 08:30 - 12:30
  AFTERNOON: { start: 13.5, end: 17.5 }, // 13:30 - 17:30
  TOTAL_DAILY_MINUTES: (12.5 - 8.5 + 17.5 - 13.5) * 60 // 480 minutes (8 hours)
};

/**
 * Calculates working minutes between two dates, excluding weekends and non-working hours.
 */
export const calculateWorkingMinutes = (start, end) => {
  if (!start || !end) return 0;
  
  const dStart = new Date(start);
  const dEnd = new Date(end);
  if (dEnd <= dStart) return 0;
  
  // Safety check: Don't process more than 1 year to avoid performance issues
  const diffDays = Math.ceil((dEnd - dStart) / (1000 * 60 * 60 * 24));
  if (diffDays > 365) return 0;

  let totalMinutes = 0;
  let current = new Date(dStart);

  // Set time to the start of the range for the first iteration
  while (current < dEnd) {
    if (!isWeekend(current)) {
      const day = startOfDay(current);
      
      // Define shifts for the current day
      const shifts = [
        { s: addMinutes(day, 8.5 * 60), e: addMinutes(day, 12.5 * 60) }, // 08:30 - 12:30
        { s: addMinutes(day, 13.5 * 60), e: addMinutes(day, 17.5 * 60) } // 13:30 - 17:30
      ];

      for (const shift of shifts) {
        const overlapStart = Math.max(current.getTime(), shift.s.getTime());
        const overlapEnd = Math.min(dEnd.getTime(), shift.e.getTime());
        
        if (overlapEnd > overlapStart) {
          totalMinutes += (overlapEnd - overlapStart) / 60000;
        }
      }
    }
    
    // Advance to the beginning of the next day (00:00) to ensure we don't skip days
    // but start at the very beginning of the next potential working period
    current = startOfDay(new Date(current.getTime() + 24 * 60 * 60 * 1000));
  }

  return Math.round(totalMinutes);
};

/**
 * Standard Metric Suite (T1-T5)
 * T1 => PLAN TIME (Kế hoạch: date_start -> date_end)
 * T2 & T3 => USER TIME (Gộp T2 & T3: date_start -> date_complete / date_checked)
 * T4 => ONLY CHECK (Có điều kiện is_onlychecked: Tổng Manager->Leader trừ thời gian User làm qua parent_id)
 * T5 => REVIEW (Thời gian nghiệm thu/review: date_complete -> date_checked)
 */
export const calculateTaskMetrics = (task, context = null) => {
  if (!task) return { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0, efficiency: 0, score: 0 };

  const {
    id, date_start, date_end, date_complete, date_checked, date_started, created_at,
    is_onlychecked, parent_id, color
  } = task;

  const parse = (d) => {
    if (!d || d === '0001-01-01 00:00:00+00' || (typeof d === 'string' && d.startsWith('0001-01-01'))) return null;
    try {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? null : dt;
    } catch {
      return null;
    }
  };
  
  const dStart = parse(date_start);
  const dEnd = parse(date_end);
  const dComplete = parse(date_complete);
  const dChecked = parse(date_checked);
  const dStarted = parse(date_started);
  const dCreated = parse(created_at);

  // Điểm hoàn thành thực tế: Ưu tiên date_checked, nếu chưa có thì lấy date_complete
  const dActualEnd = dChecked || dComplete;

  // 1. T1: Target Duration (Kế hoạch: date_start -> date_end)
  const t1 = calculateWorkingMinutes(dStart, dEnd);

  // 2. T2: Gộp T2 và T3 cũ thành 1 (Actual Cycle: date_start -> date_checked/complete)
  const t2 = calculateWorkingMinutes(dStart, dActualEnd);

  // Xác định task có phải là Task Cha Only Check (Manager giao cho Leader) hay không
  // 1. Task con (có parent_id) KHÔNG BAO GIỜ là only check
  const isChildTask = Boolean(parent_id || (task.name && task.name.includes('_')));
  
  // 2. Task cha được tính là Only Check khi:
  // - Có cờ is_onlychecked = true hoặc màu vàng #EAB308
  // - Hoặc có task con trong childrenByParentId được giao cho member
  const hasChildren = Boolean(context?.childrenByParentId?.has(id));
  const isParentOnlyCheck = !isChildTask && (
    is_onlychecked === true || 
    is_onlychecked === 'true' || 
    is_onlychecked === 'TRUE' || 
    (color && String(color).toUpperCase() === '#EAB308') ||
    (context?.parentHasOnlyCheckChild?.has(id))
  );

  const isOnlyChecked = isParentOnlyCheck;

  // 3. T4: ONLY CHECK
  let t4 = 0;

  if (isOnlyChecked) {
    // Công thức nghiệp vụ: User time của Leader - User time của member lớn nhất (max)
    const leaderUserTime = calculateWorkingMinutes(dStart, dActualEnd);
    let maxMemberUserTime = 0;

    // Tìm các task con của task cha này để tìm User time lớn nhất của member
    if (context && context.childrenByParentId && id) {
      const children = context.childrenByParentId.get(id) || [];
      children.forEach(c => {
        const cStart = parse(c.date_start) || parse(c.date_started);
        const cEnd = parse(c.date_complete) || parse(c.date_checked);
        const memberTime = calculateWorkingMinutes(cStart, cEnd);
        if (memberTime > maxMemberUserTime) {
          maxMemberUserTime = memberTime;
        }
      });
    }

    if (leaderUserTime > 0 && maxMemberUserTime > 0) {
      t4 = Math.max(0, leaderUserTime - maxMemberUserTime);
    } else if (leaderUserTime > 0) {
      t4 = leaderUserTime;
    } else {
      t4 = calculateWorkingMinutes(dComplete || dStarted, dChecked || dComplete);
    }
  } else {
    // Task thông thường hoặc Task con do Member làm -> ONLY CHECK = 0 (hiển thị '-')
    t4 = 0;
  }

  // USER TIME (t2):
  // Nếu là task cha (isOnlyChecked = true) thì Leader không làm trực tiếp -> t2 = 0
  // Nếu là task con / task thường của User -> t2 là thời gian thực tế làm
  const metrics = {
    t1,
    t2,
    t3: t2,
    t4,
    t5: calculateWorkingMinutes(dComplete, dChecked), // REVIEW
    isOnlyChecked
  };

  // Efficiency Calculation (Standard: T1 / Actual Work Time)
  const actualWorkMinutes = isOnlyChecked ? metrics.t4 : metrics.t2;
  metrics.efficiency = actualWorkMinutes > 0 ? (metrics.t1 / actualWorkMinutes) : 0;
  
  // Normalized Score (0-100)
  metrics.score = Math.min(100, Math.max(0, metrics.efficiency * 100));

  return metrics;
};

/**
 * Format minutes to "Xh Ym"
 */
export const formatMinutes = (minutes) => {
  if (!minutes || minutes <= 0) return '0h00';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
};

/**
 * Returns a breakdown of working minutes per day between two dates.
 * Useful for distributing task metrics across a timesheet.
 */
export const calculateDailyWorkingMinutes = (start, end) => {
  const breakdown = {};
  if (!start || !end) return breakdown;
  
  const dStart = new Date(start);
  const dEnd = new Date(end);
  if (dEnd <= dStart) return breakdown;

  let current = new Date(dStart);
  while (current < dEnd) {
    const isWeekendDay = isWeekend(current);
    const isExplicitWeekend = isSameDay(current, dStart) || isSameDay(current, dEnd);
    if (!isWeekendDay || isExplicitWeekend) {
      const day = startOfDay(current);
      const dateKey = format(day, 'yyyy-MM-dd');
      let dayMinutes = 0;

      const shifts = [
        { s: addMinutes(day, 8.5 * 60), e: addMinutes(day, 12.5 * 60) },
        { s: addMinutes(day, 13.5 * 60), e: addMinutes(day, 17.5 * 60) }
      ];

      for (const shift of shifts) {
        const overlapStart = Math.max(current.getTime(), shift.s.getTime());
        const overlapEnd = Math.min(dEnd.getTime(), shift.e.getTime());
        if (overlapEnd > overlapStart) {
          dayMinutes += (overlapEnd - overlapStart) / 60000;
        }
      }
      
      if (dayMinutes > 0) {
        breakdown[dateKey] = (breakdown[dateKey] || 0) + dayMinutes;
      }
    }
    current = startOfDay(new Date(current.getTime() + 24 * 60 * 60 * 1000));
  }

  return breakdown;
};

/**
 * Aggregates metrics for a group of tasks
 */
export const aggregateMetrics = (tasks) => {
  const totals = { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0, count: tasks.length };
  
  tasks.forEach(task => {
    const m = calculateTaskMetrics(task);
    totals.t1 += m.t1;
    totals.t2 += m.t2;
    totals.t3 += m.t3;
    totals.t4 += m.t4;
    totals.t5 += m.t5;
  });

  totals.avgEfficiency = totals.t4 > 0 ? (totals.t1 / totals.t4) : 0;
  return totals;
};
