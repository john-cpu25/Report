import { processDate, formatDuration, formatDateTime } from './csvHelpers';
import { calculateTaskMetrics } from './performanceEngine';

export const processTaskData = (tasksData, userMap = {}, teamMap = {}) => {
  if (!tasksData || !Array.isArray(tasksData)) return [];
  
  const safeUserMap = userMap || {};
  const safeTeamMap = teamMap || {};

  return tasksData.map(row => {
    try {
      const metrics = calculateTaskMetrics(row);
      const createdAt = processDate(row.created_at);
      const dateStart = processDate(row.date_start);
      const dateEnd = processDate(row.date_end);
      const dateAccepted = processDate(row.date_accepted);
      const dateStarted = processDate(row.date_started);
      const dateComplete = processDate(row.date_complete);
      const dateChecked = processDate(row.date_checked);
      const parts = (row.name || '').toString().split(':');
      
      const userId = (row.user_id || '').toString();
      const creatorId = (row.create_by || '').toString();

      const getSafeName = (id) => {
        if (!id) return '-';
        return safeUserMap[id] || safeUserMap[id.toLowerCase()] || id;
      };

      const getSafeTeam = (id) => {
        if (!id) return '-';
        return safeTeamMap[id] || safeTeamMap[id.toLowerCase()] || '-';
      };

      return {
        id: row.id,
        project: parts[0]?.trim() || '-',
        taskName: parts[1]?.trim() || '-',
        createdBy: getSafeName(creatorId),
        userName: getSafeName(userId),
        ...metrics,
        // Raw Date Objects for calculations
        created_at: createdAt,
        date_start: dateStart,
        date_end: dateEnd,
        date_accepted: dateAccepted,
        date_started: dateStarted,
        date_complete: dateComplete,
        date_checked: dateChecked,
        
        time1Str: formatDuration(metrics.t1),
        time2Str: formatDuration(metrics.t2),
        time3Str: formatDuration(metrics.t3),
        time4Str: formatDuration(metrics.t4),
        time5Str: formatDuration(metrics.t5),
        area: row.area || '-',
        dateObj: createdAt || dateStart,
        createdAtStr: formatDateTime(createdAt),
        dateStartStr: formatDateTime(dateStart),
        dateEndStr: formatDateTime(dateEnd),
        dateAcceptedStr: formatDateTime(dateAccepted),
        dateStartedStr: formatDateTime(dateStarted),
        dateCompleteStr: formatDateTime(dateComplete),
        dateCheckedStr: formatDateTime(dateChecked),
        team: getSafeTeam(userId)
      };
    } catch (err) {
      console.error('Error processing row:', row, err);
      return null;
    }
  }).filter(r => r !== null && r.project !== '-');
};
