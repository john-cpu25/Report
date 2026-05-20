
import { format, differenceInMinutes, isWeekend, addMinutes, startOfDay } from 'date-fns';

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
 */
export const calculateTaskMetrics = (task) => {
  const {
    date_start, date_end, date_complete, date_checked, date_started, created_at
  } = task;

  const parse = (d) => d ? new Date(d) : null;
  
  const dStart = parse(date_start);
  const dEnd = parse(date_end);
  const dComplete = parse(date_complete);
  const dChecked = parse(date_checked);
  const dStarted = parse(date_started);
  const dCreated = parse(created_at);

  const metrics = {
    t1: calculateWorkingMinutes(dStart, dEnd),           // Target Duration
    t2: calculateWorkingMinutes(dStart, dComplete),      // Actual Completion
    t3: calculateWorkingMinutes(dStart, dChecked),       // Full Cycle (Client Delivery)
    t4: calculateWorkingMinutes(dStarted, dChecked),     // Pure Processing
    t5: calculateWorkingMinutes(dCreated, dChecked),     // System Lead Time
  };

  // Efficiency Calculation (Standard: T1 / T4)
  metrics.efficiency = metrics.t4 > 0 ? (metrics.t1 / metrics.t4) : 0;
  
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
    if (!isWeekend(current)) {
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
