import { processDate, formatDuration, formatDateTime } from './csvHelpers';
import { calculateTaskMetrics } from './performanceEngine';

export const processTaskData = (tasksData, userMap = {}, teamMap = {}) => {
  if (!tasksData || !Array.isArray(tasksData)) return [];
  
  const safeUserMap = userMap || {};
  const safeTeamMap = teamMap || {};
  const tasksById = new Map(tasksData.map(t => [t?.id, t]));
  const childrenByParentId = new Map();
  const parentHasOnlyCheckChild = new Set();
  tasksData.forEach(t => {
    if (t && t.parent_id) {
      if (!childrenByParentId.has(t.parent_id)) childrenByParentId.set(t.parent_id, []);
      childrenByParentId.get(t.parent_id).push(t);

      if (t.is_onlychecked || (t.name && String(t.name).trim().endsWith('_'))) {
        parentHasOnlyCheckChild.add(t.parent_id);
      }
    }
  });
  const context = { tasksById, childrenByParentId, parentHasOnlyCheckChild };

  return tasksData.map(row => {
    try {
      const metrics = calculateTaskMetrics(row, context);
      const createdAt = processDate(row.created_at);
      const dateStart = processDate(row.planned_start || row.date_start);
      const dateEnd = processDate(row.planned_end || row.date_end);
      const dateAccepted = processDate(row.seen_at || row.date_accepted);
      const dateStarted = processDate(row.started_at || row.date_started);
      const dateComplete = processDate(row.completed_at || row.date_complete);
      const dateChecked = processDate(row.checked_at || row.date_checked);
      const parts = (row.name || '').toString().split(':');
      
      const userId = (row.assigned_to_id || row.user_id || '').toString();
      const creatorId = (row.create_by_id || row.create_by || '').toString();

      const getSafeName = (id) => {
        if (!id) return 'UNKNOWN';
        const name = safeUserMap[id] || safeUserMap[id.toLowerCase()] || id;
        return name.toString().trim();
      };

      const getSafeTeam = (id) => {
        if (!id) return 'UNASSIGNED TEAM';
        const team = safeTeamMap[id] || safeTeamMap[id.toLowerCase()] || 'UNASSIGNED TEAM';
        return team.toString().trim().toUpperCase();
      };

      const finalProject = row._projectName || (parts[0] || '').toString().trim().toUpperCase() || 'UNASSIGNED';
      const finalTaskName = row._isApex 
        ? (parts.length > 1 ? parts.slice(1).join(':').trim() : (row.detail || row.name || 'UNTITLED'))
        : ((parts[1] || '').toString().trim() || 'UNTITLED');

      const finalCreator = row._creatorName || getSafeName(creatorId);
      const finalUser = row._userName || getSafeName(userId);
      const finalTeam = row._team || getSafeTeam(userId);

      // PLAN TIME: lấy từ hours_planned của APEX_Task
      let planTimeStr = '-';
      if (row.hours_planned !== null && row.hours_planned !== undefined && row.hours_planned !== '') {
        planTimeStr = `${Number(row.hours_planned).toFixed(2)}h`;
      } else if (metrics.t1) {
        planTimeStr = formatDuration(metrics.t1);
      }

      // USER TIME: lấy từ hours_complete của APEX_Task
      let userTimeStr = '-';
      if (row.hours_complete !== null && row.hours_complete !== undefined && row.hours_complete !== '') {
        userTimeStr = `${Number(row.hours_complete).toFixed(2)}h`;
      } else if (metrics.t2 || metrics.t3) {
        userTimeStr = formatDuration(metrics.t2 || metrics.t3);
      }

      return {
        id: row.id,
        parent_id: row.parent_id,
        name: row.name,
        project: finalProject,
        taskName: finalTaskName,
        createdBy: finalCreator,
        userName: finalUser,
        ...metrics,
        // Raw Date Objects for calculations
        created_at: createdAt,
        date_start: dateStart,
        date_end: dateEnd,
        date_accepted: dateAccepted,
        date_started: dateStarted,
        date_complete: dateComplete,
        date_checked: dateChecked,
        
        // Time strings
        time1Str: planTimeStr,
        time2Str: userTimeStr,
        time3Str: userTimeStr,
        time4Str: '-', // Bỏ ONLY CHECK
        time5Str: row.review_comment || formatDuration(metrics.t5),
        reviewTime: row.review_comment || '',
        hours_planned: Number(row.hours_planned) || 0,
        hours_complete: Number(row.hours_complete) || 0,
        hours_ot: Number(row.hours_ot) || 0,
        ot_note: row.ot_note || '',
        area: row.area || '-',
        dateObj: createdAt || dateStart,
        createdAtStr: formatDateTime(createdAt),
        dateStartStr: formatDateTime(dateStart),
        dateEndStr: formatDateTime(dateEnd),
        dateAcceptedStr: formatDateTime(dateAccepted),
        dateStartedStr: formatDateTime(dateStarted),
        dateCompleteStr: formatDateTime(dateComplete),
        dateCheckedStr: formatDateTime(dateChecked),
        team: finalTeam,
        color: metrics.isOnlyChecked ? '#EAB308' : (row.color === '#EAB308' ? '#0080FF' : row.color),
        is_onlychecked: false
      };
    } catch (err) {
      console.error('Error processing row:', row, err);
      return null;
    }
  }).filter(r => r !== null && r.project !== 'UNASSIGNED');
};
