/**
 * Tính toán thời gian làm việc hiệu quả giữa hai mốc thời gian.
 * Chỉ tính trong khung giờ: 09:00 - 12:30 và 13:30 - 18:00.
 * Tự động loại bỏ thời gian nghỉ trưa và thời gian ngoài giờ hành chính.
 */
export function calculateWorkingDuration(start, end) {
  if (!start || !end || end <= start) return 0;

  let totalMs = 0;
  const startDate = new Date(start);
  const endDate = new Date(end);

  // Lấy ngày bắt đầu và ngày kết thúc (đặt về 0h để lặp)
  const sDay = new Date(startDate);
  sDay.setHours(0, 0, 0, 0);
  const eDay = new Date(endDate);
  eDay.setHours(0, 0, 0, 0);

  // Lặp qua từng ngày từ ngày bắt đầu đến ngày kết thúc
  for (let d = new Date(sDay); d <= eDay; d.setDate(d.getDate() + 1)) {
    // Ca sáng: 09:00 - 12:30
    const p1Start = new Date(d); p1Start.setHours(9, 0, 0, 0);
    const p1End = new Date(d); p1End.setHours(12, 30, 0, 0);
    
    // Ca chiều: 13:30 - 18:00
    const p2Start = new Date(d); p2Start.setHours(13, 30, 0, 0);
    const p2End = new Date(d); p2End.setHours(18, 0, 0, 0);

    // Tính phần giao thoa của task với Ca sáng
    const overlap1Start = Math.max(startDate.getTime(), p1Start.getTime());
    const overlap1End = Math.min(endDate.getTime(), p1End.getTime());
    if (overlap1End > overlap1Start) {
      totalMs += (overlap1End - overlap1Start);
    }

    // Tính phần giao thoa của task với Ca chiều
    const overlap2Start = Math.max(startDate.getTime(), p2Start.getTime());
    const overlap2End = Math.min(endDate.getTime(), p2End.getTime());
    if (overlap2End > overlap2Start) {
      totalMs += (overlap2End - overlap2Start);
    }
  }

  return totalMs;
}

/**
 * Format milliseconds sang chuỗi "Xh Ym"
 */
export function formatDuration(ms) {
  if (!ms || ms <= 0) return '0h00';
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}

/**
 * Trả về số giờ dạng số thập phân (ví dụ 1.5)
 */
export function getDurationHours(ms) {
  if (!ms || ms <= 0) return 0;
  return ms / (1000 * 60 * 60);
}

/**
 * Lấy mốc thời gian 3 tháng trước (mặc định 3 tháng / 90 ngày)
 */
export function getThreeMonthsAgoDate(months = 3) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

export function getThreeMonthsAgoISO(months = 3) {
  return getThreeMonthsAgoDate(months).toISOString();
}

import { getISOWeek } from 'date-fns';

/**
 * Lấy danh sách các số tuần ISO (1..53) thuộc tháng & năm được chỉ định.
 * Trong chuẩn ISO-8601, thứ Năm quyết định tuần thuộc về tháng và năm nào.
 */
export function getWeeksForMonth(year, month) {
  const weeks = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 4) { // Thứ 5 quyết định tuần ISO
      const w = getISOWeek(d);
      if (!weeks.includes(w)) {
        weeks.push(w);
      }
    }
  }
  if (weeks.length === 0) {
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const w = getISOWeek(d);
      if (!weeks.includes(w)) {
        weeks.push(w);
      }
    }
  }
  return weeks;
}

/**
 * Lấy tháng (0-11) mà một tuần ISO thuộc về (dựa vào thứ 5 của tuần đó).
 */
export function getMonthFromISOWeek(weekNumber, year) {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstThursday = new Date(jan4);
  firstThursday.setDate(jan4.getDate() + (4 - dayOfWeek));

  const targetThursday = new Date(firstThursday);
  targetThursday.setDate(firstThursday.getDate() + (weekNumber - 1) * 7);

  return targetThursday.getMonth();
}

/**
 * Kiểm tra xem một bản ghi timesheet (có r.week và r.year) có thỏa mãn điều kiện lọc timeRange không
 * @param {number|string} recordWeek 
 * @param {number|string} recordYear 
 * @param {Date} currentDate 
 * @param {'week'|'month'|'year'|'custom'|'date_range'} timeRange 
 * @param {Array<number>} [monthWeeks] Mảng các tuần trong tháng để tối ưu
 * @param {Array<number>} [customWeeks] Mảng các tuần được chọn tùy ý khi timeRange === 'custom'
 * @param {{ startDate: string, endDate: string }} [customDateRange] Khoảng ngày tùy ý khi timeRange === 'date_range'
 */
export function isRecordInTimeRange(recordWeek, recordYear, currentDate, timeRange = 'week', monthWeeks = null, customWeeks = [], customDateRange = null) {
  const w = Number(recordWeek);
  const y = Number(recordYear);
  const targetYear = currentDate.getFullYear();

  if (timeRange === 'date_range' && customDateRange?.startDate && customDateRange?.endDate) {
    const monday = getWeekMonday(w, y || targetYear);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    monday.setHours(0, 0, 0, 0);

    const start = new Date(customDateRange.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customDateRange.endDate);
    end.setHours(23, 59, 59, 999);

    return monday <= end && sunday >= start;
  }

  if (y && y !== targetYear) return false;

  if (timeRange === 'custom') {
    return Array.isArray(customWeeks) && customWeeks.includes(w);
  }

  if (timeRange === 'year') {
    return true;
  }

  if (timeRange === 'month') {
    const weeks = monthWeeks || getWeeksForMonth(targetYear, currentDate.getMonth());
    return weeks.includes(w);
  }

  // timeRange === 'week' (mặc định)
  const currentWeek = getISOWeek(currentDate);
  return w === currentWeek;
}

/**
 * Lấy ngày Thứ 2 của tuần ISO
 */
export function getWeekMonday(weekNumber, year) {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstThursday = new Date(jan4);
  firstThursday.setDate(jan4.getDate() + (4 - dayOfWeek));

  const targetThursday = new Date(firstThursday);
  targetThursday.setDate(firstThursday.getDate() + (weekNumber - 1) * 7);

  const monday = new Date(targetThursday);
  monday.setDate(targetThursday.getDate() - 3);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Lấy ngày bắt đầu (Thứ 2) và kết thúc (Chủ Nhật) của một tuần ISO trong năm
 * @param {number} weekNumber 
 * @param {number} year 
 */
export function getWeekDateRange(weekNumber, year) {
  const monday = getWeekMonday(weekNumber, year);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const pad = (n) => String(n).padStart(2, '0');
  const label = `${pad(monday.getDate())}/${pad(monday.getMonth() + 1)} - ${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}`;

  return { monday, sunday, label };
}

/**
 * Lấy danh sách các tuần ISO giao với khoảng ngày [startDate, endDate]
 */
export function getWeeksInDateRange(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

  const weeksMap = new Map();
  const cur = new Date(start);
  while (cur <= end) {
    const yr = cur.getFullYear();
    const wk = getISOWeek(cur);
    const key = `${yr}-${wk}`;
    if (!weeksMap.has(key)) {
      const range = getWeekDateRange(wk, yr);
      weeksMap.set(key, {
        weekNum: wk,
        year: yr,
        label: `W${wk}`,
        fullLabel: `Tuần ${wk} (${range.label})`
      });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return Array.from(weeksMap.values());
}

/**
 * Đếm số ngày làm việc tiêu chuẩn (Thứ 2 đến Thứ 6) trong khoảng [startDate, endDate]
 */
export function getWorkingDaysCount(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setHours(23, 59, 59, 999);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay(); // 0: Sun, 6: Sat
    if (day !== 0 && day !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Lọc chính xác từng ngày trong bản ghi APEX_TimeSheet theo khoảng [startDate, endDate]
 * Giữ nguyên các ngày nằm trong khoảng, zero out các ngày nằm ngoài khoảng
 */
export function filterRecordByDateRange(r, startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr || !r) return { clipped: r, totalHours: 0, hasOverlap: true };
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setHours(23, 59, 59, 999);

  const monday = getWeekMonday(Number(r.week), Number(r.year));
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  
  const clipped = { ...r };
  let anyIncluded = false;
  let totalHours = 0;

  days.forEach((day, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    d.setHours(12, 0, 0, 0);

    if (d >= start && d <= end) {
      const val = Number(r[day]) || 0;
      clipped[day] = val;
      if (val > 0) anyIncluded = true;
      totalHours += val;
    } else {
      clipped[day] = 0;
    }
  });

  return { clipped, totalHours, hasOverlap: anyIncluded };
}

/**
 * Lấy năm và tuần ISO cho mốc thời gian
 */
export function getISOWeekAndYear(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return { year: target.getUTCFullYear(), week: weekNo };
}



