
import { format, differenceInMinutes, isWeekend, addMinutes, startOfDay } from 'date-fns';

/**
 * Performance Engine v1.0
 * Standardizes time and efficiency calculations across the system.
 */

// Shift Configuration
const SHIFT = {
  MORNING: { start: 9, end: 12.5 }, // 09:00 - 12:30
  AFTERNOON: { start: 13.5, end: 18 }, // 13:30 - 18:00
  TOTAL_DAILY_MINUTES: (12.5 - 9 + 18 - 13.5) * 60 // 480 minutes (8 hours)
};

/**
 * Calculates working minutes between two dates, excluding weekends and non-working hours.
 */
export const calculateWorkingMinutes = (start, end) => {
  if (!start || !end || end <= start) return 0;

  let totalMinutes = 0;
  let current = new Date(start);
  const target = new Date(end);

  while (current < target) {
    if (!isWeekend(current)) {
      const day = startOfDay(current);
      
      // Morning overlap
      const mStart = addMinutes(day, SHIFT.MORNING.start * 60);
      const mEnd = addMinutes(day, SHIFT.MORNING.end * 60);
      const overlapMStart = Math.max(current.getTime(), mStart.getTime());
      const overlapMEnd = Math.min(target.getTime(), mEnd.getTime());
      if (overlapMEnd > overlapMStart) totalMinutes += (overlapMEnd - overlapMStart) / 60000;

      // Afternoon overlap
      const aStart = addMinutes(day, SHIFT.AFTERNOON.start * 60);
      const aEnd = addMinutes(day, SHIFT.AFTERNOON.end * 60);
      const overlapAStart = Math.max(current.getTime(), aStart.getTime());
      const overlapAEnd = Math.min(target.getTime(), aEnd.getTime());
      if (overlapAEnd > overlapAStart) totalMinutes += (overlapAEnd - overlapAStart) / 60000;
    }
    
    // Jump to next day if we are past afternoon shift
    const dayEnd = addMinutes(startOfDay(current), SHIFT.AFTERNOON.end * 60);
    if (current >= dayEnd) {
      current = addMinutes(startOfDay(current), 24 * 60 + SHIFT.MORNING.start * 60);
    } else {
      // Step through time (optimized jump to next shift or target)
      current = new Date(Math.min(target.getTime(), dayEnd.getTime() + 1));
    }
  }

  return Math.floor(totalMinutes);
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
  if (!minutes || minutes <= 0) return '0h 0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
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
