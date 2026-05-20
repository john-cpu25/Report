import { calculateWorkingMinutes, formatMinutes } from './performanceEngine';

export const processDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date((val - 25569) * 86400 * 1000);
  let str = val.toString().trim();
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    return new Date((num - 25569) * 86400 * 1000);
  }
  if (str.startsWith('0001')) return null;
  try {
    let s = str.replace(' ', 'T');
    if (s.match(/[+-]\d{2}$/)) s += ':00';
    let date = new Date(s);
    if (isNaN(date.getTime())) {
      if (!s.includes('Z') && !s.match(/[+-]\d{2}/)) date = new Date(s + '+07:00');
    }
    if (isNaN(date.getTime())) {
      let sNoMs = s.replace(/\.\d+(?=[+-Z]|$)/, '');
      date = new Date(sNoMs);
    }
    return isNaN(date.getTime()) ? null : date;
  } catch (e) {
    return null;
  }
};

export const getEffectiveDuration = (start, end) => {
  return calculateWorkingMinutes(start, end);
};

export const formatDuration = (totalMinutes) => {
  return formatMinutes(totalMinutes);
};

export const formatDate = (date) => {
  if (!date) return '-';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${d}/${mo} ${h}:${mi}`;
};
