import { supabase } from '../supabaseClient.js';
import { getThreeMonthsAgoISO, getThreeMonthsAgoDate, getISOWeekAndYear } from '../utils/timeUtils.js';

// Module-level singleton cache for APEX Timesheet data
let cachedData = null;
let inFlightPromise = null;
const listeners = new Set();

export const getCachedApexTimesheetData = () => cachedData;

export const subscribeApexTimesheetData = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = (data) => {
  listeners.forEach(fn => {
    try {
      fn(data);
    } catch (e) {
      console.error('Error in apexTimesheet listener:', e);
    }
  });
};

/**
 * Fetch APEX timesheet data once and cache it in memory.
 * Giới hạn tải dữ liệu trong vòng 3 tháng gần nhất (không load hết).
 * @param {boolean} force If true, bypasses cache and re-fetches from Supabase (e.g. on Sync button click)
 */
export const fetchApexTimesheetData = async (force = false) => {
  if (!force && cachedData) {
    return cachedData;
  }
  if (!force && inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const threeMonthsAgoIso = getThreeMonthsAgoISO(3);
      const threeMonthsAgoDate = getThreeMonthsAgoDate(3);
      const { year: cutoffYear, week: cutoffWeek } = getISOWeekAndYear(threeMonthsAgoDate);
      const currentYear = new Date().getFullYear();

      // Query Timesheet theo tuần và năm trong vòng 3 tháng
      const tsQuery = cutoffYear === currentYear
        ? supabase.from('APEX_TimeSheet').select('*').gte('year', cutoffYear).gte('week', cutoffWeek)
        : supabase.from('APEX_TimeSheet').select('*').or(`year.gt.${cutoffYear},and(year.eq.${cutoffYear},week.gte.${cutoffWeek})`);

      const [tsRes, typeRes, taskRes, userRes, projRes, spanRes, leaveRes] = await Promise.all([
        tsQuery,
        supabase.from('APEX_TimeSheetType').select('*'),
        supabase.from('APEX_Task').select('*').gte('created_at', threeMonthsAgoIso).order('created_at', { ascending: false }),
        supabase.from('APEX_User').select('*'),
        supabase.from('APEX_Project').select('*'),
        supabase.from('APEX_Leave_Span').select('*').gte('start_at', threeMonthsAgoIso),
        supabase.from('APEX_Leave').select('*').gte('created_at', threeMonthsAgoIso)
      ]);

      cachedData = {
        timesheetRecords: tsRes.data || [],
        timesheetTypes: typeRes.data || [],
        apexTasks: taskRes.data || [],
        apexUsers: userRes.data || [],
        apexProjects: projRes.data || [],
        apexLeaveSpans: spanRes.data || [],
        apexLeaves: leaveRes.data || [],
        timestamp: Date.now()
      };

      notifyListeners(cachedData);
      return cachedData;
    } catch (err) {
      console.error('Failed to fetch APEX timesheet data:', err);
      return cachedData;
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
};
