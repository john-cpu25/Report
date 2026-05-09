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
  if (!ms || ms <= 0) return '-';
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

/**
 * Trả về số giờ dạng số thập phân (ví dụ 1.5)
 */
export function getDurationHours(ms) {
  if (!ms || ms <= 0) return 0;
  return ms / (1000 * 60 * 60);
}
