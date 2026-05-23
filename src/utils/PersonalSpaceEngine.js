import { useMemo } from 'react';
import { 
  startOfDay, addDays, startOfWeek, endOfWeek, 
  isWithinInterval, isSameDay, format, getISOWeek, 
  eachMonthOfInterval, subDays 
} from 'date-fns';
import { calculateDailyWorkingMinutes, calculateTaskMetrics } from './performanceEngine';

export const usePersonalSpaceEngine = (params) => {
  const {
    filteredData = [],
    strictlyFilteredData = [],
    analystTasks = [],
    filterOptions = { users: [] },
    weekOffset = 0,
    timeRange = 'week',
    selectedTimeMetric = 't4',
    manualData = {}
  } = params;

  // Project Grouping View
  const projectGroups = useMemo(() => {
    const groups = {};
    strictlyFilteredData.forEach(t => {
      const key = t.project || 'Unassigned';
      if (!groups[key]) groups[key] = { name: key, tasks: [], totalTime: 0 };
      groups[key].tasks.push(t);
      groups[key].totalTime += (t.score || 0);
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [strictlyFilteredData]);

  const teamGroups = useMemo(() => {
    const groups = {};
    strictlyFilteredData.forEach(t => {
      const key = t.team || 'Unknown Team';
      if (!groups[key]) groups[key] = { name: key, tasks: [], totalTime: 0 };
      groups[key].tasks.push(t);
      groups[key].totalTime += (t.score || 0);
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [strictlyFilteredData]);

  const ganttTimeline = useMemo(() => {
    const targetDate = addDays(startOfDay(new Date()), weekOffset * 7);
    
    if (timeRange === 'day') {
      return [...Array(24)].map((_, i) => {
        const d = new Date(targetDate);
        d.setHours(i, 0, 0, 0);
        return d;
      });
    } else if (timeRange === 'week') {
      const targetMonday = startOfWeek(targetDate, { weekStartsOn: 1 });
      return [...Array(5)].map((_, i) => addDays(targetMonday, i));
    } else if (timeRange === 'month') {
      const startOfCurrentMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endOfCurrentMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      const daysInMonth = endOfCurrentMonth.getDate();
      return [...Array(daysInMonth)]
        .map((_, i) => addDays(startOfCurrentMonth, i))
        .filter(d => d.getDay() !== 0 && d.getDay() !== 6);
    } else if (timeRange === 'year') {
      return [...Array(12)].map((_, i) => new Date(targetDate.getFullYear(), i, 1));
    } else {
      const targetMonday = startOfWeek(targetDate, { weekStartsOn: 1 });
      return [...Array(14)].map((_, i) => addDays(targetMonday, i));
    }
  }, [weekOffset, timeRange]);

  const workloadData = useMemo(() => {
    return ganttTimeline.map(day => {
      const activeTasks = strictlyFilteredData.filter(task => {
        let rStart = task.date_start;
        let rEnd = task.date_end;
        if (selectedTimeMetric === 't2') rEnd = task.date_complete;
        if (selectedTimeMetric === 't3') rEnd = task.date_checked;
        if (selectedTimeMetric === 't4') { rStart = task.date_started; rEnd = task.date_checked; }
        if (selectedTimeMetric === 't5') { rStart = task.created_at; rEnd = task.date_checked; }
        
        let start = rStart && rStart !== '-' ? new Date(rStart) : null;
        let end = rEnd && rEnd !== '-' ? new Date(rEnd) : null;
        
        if (!start || isNaN(start.getTime())) start = task.dateObj || new Date(task.created_at || Date.now());
        if (!end || isNaN(end.getTime())) end = addDays(start, 1);
        if (end < start) end = addDays(start, 1);

        return isWithinInterval(day, { start: startOfDay(start), end: startOfDay(end) });
      });
      return activeTasks.length;
    });
  }, [strictlyFilteredData, ganttTimeline, selectedTimeMetric]);

  const weeklyData = useMemo(() => {
    const groups = {};
    strictlyFilteredData.forEach(task => {
      const date = task.dateObj || new Date();
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-ww');
      const weekLabel = `Week ${format(weekStart, 'ww')} (${format(weekStart, 'dd/MM')} - ${format(endOfWeek(date, { weekStartsOn: 1 }), 'dd/MM')})`;
      
      if (!groups[weekKey]) {
        groups[weekKey] = { label: weekLabel, tasks: [], count: 0, completed: 0 };
      }
      groups[weekKey].tasks.push(task);
      groups[weekKey].count++;
      if (task.dateCompleteStr !== '-') groups[weekKey].completed++;
    });
    
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, data]) => ({ key, ...data }));
  }, [strictlyFilteredData]);

  const timesheetData = useMemo(() => {
    const dataToProcess = strictlyFilteredData;
    if (!dataToProcess || dataToProcess.length === 0) {
      const today = new Date();
      const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
      const targetMonday = addDays(currentMonday, weekOffset * 7);
      const weekDates = [0, 1, 2, 3, 4].map(i => addDays(targetMonday, i));
      const weekNum = getISOWeek(targetMonday);
      return { weekNumber: weekNum, monday: targetMonday, weekDates, teams: [], totalPerDay: [0,0,0,0,0], tasksPerDay: [0,0,0,0,0], grandTotalHours: 0, grandTotalTasks: 0 };
    }

    const today = new Date();
    const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
    const targetMonday = addDays(currentMonday, weekOffset * 7);
    const weekDates = [0, 1, 2, 3, 4].map(i => addDays(targetMonday, i));
    const weekNum = getISOWeek(targetMonday);

    const weekTasks = strictlyFilteredData.filter(t => {
      let rangeStart = t.date_start;
      let rangeEnd = t.date_end;
      if (selectedTimeMetric === 't2') rangeEnd = t.date_complete;
      if (selectedTimeMetric === 't3') rangeEnd = t.date_checked;
      if (selectedTimeMetric === 't4') { rangeStart = t.date_started; rangeEnd = t.date_checked; }
      if (selectedTimeMetric === 't5') { rangeStart = t.created_at; rangeEnd = t.date_checked; }

      const weekStart = weekDates[0];
      const weekEnd = addDays(weekDates[4], 1); 

      if (!rangeStart || !rangeEnd || rangeStart === '-' || rangeEnd === '-') {
        const fallbackDate = t.dateObj || new Date(t.created_at || Date.now());
        return fallbackDate >= weekStart && fallbackDate < weekEnd;
      }
      
      const startD = new Date(rangeStart);
      const endD = new Date(rangeEnd);
      
      if (isNaN(startD.getTime()) || isNaN(endD.getTime())) {
        const fallbackDate = t.dateObj || new Date(t.created_at || Date.now());
        return fallbackDate >= weekStart && fallbackDate < weekEnd;
      }

      return (startD < weekEnd && endD > weekStart);
    });

    const teamMap = {};
    weekTasks.forEach(t => {
      const team = t.team || 'Unknown';
      const user = t.userName || 'Unknown';
      const project = t.project || 'Unassigned';
      
      let rangeStart = t.date_start;
      let rangeEnd = t.date_end;

      if (selectedTimeMetric === 't2') rangeEnd = t.date_complete;
      if (selectedTimeMetric === 't3') rangeEnd = t.date_checked;
      if (selectedTimeMetric === 't4') { rangeStart = t.date_started; rangeEnd = t.date_checked; }
      if (selectedTimeMetric === 't5') { rangeStart = t.created_at; rangeEnd = t.date_checked; }

      const breakdown = calculateDailyWorkingMinutes(rangeStart, rangeEnd);
      
      if (!teamMap[team]) teamMap[team] = {};
      if (!teamMap[team][user]) teamMap[team][user] = {};
      if (!teamMap[team][user][project]) {
        teamMap[team][user][project] = { hours: [0, 0, 0, 0, 0], tasks: [0, 0, 0, 0, 0] };
      }

      Object.entries(breakdown).forEach(([dateStr, mins]) => {
        const d = new Date(dateStr);
        const dayIndex = weekDates.findIndex(wd => isSameDay(d, wd));
        if (dayIndex !== -1) {
          teamMap[team][user][project].hours[dayIndex] += (mins / 60);
        }
      });
      
      const primaryDate = t.dateObj || new Date(rangeStart);
      const primaryIdx = weekDates.findIndex(wd => isSameDay(primaryDate, wd));
      if (primaryIdx !== -1) {
        teamMap[team][user][project].tasks[primaryIdx] += 1;
      }
    });

    const teams = Object.entries(teamMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([teamName, users]) => {
        const teamUsers = Object.entries(users)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([userName, projects]) => ({
            name: userName,
            projects: Object.entries(projects)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([projectName, data]) => ({
                name: projectName,
                hours: data.hours,
                tasks: data.tasks,
                totalHours: data.hours.reduce((a, b) => a + b, 0),
                totalTasks: data.tasks.reduce((a, b) => a + b, 0)
              }))
          }));
        
        return {
          name: teamName,
          users: teamUsers,
          totalRows: teamUsers.reduce((acc, u) => acc + u.projects.length, 0)
        };
      });

    const totalPerDay = [0, 0, 0, 0, 0];
    const tasksPerDay = [0, 0, 0, 0, 0];
    teams.forEach(team => {
      team.users.forEach(user => {
        user.projects.forEach(project => {
          project.hours.forEach((val, i) => { totalPerDay[i] += val; });
          project.tasks.forEach((val, i) => { tasksPerDay[i] += val; });
        });
      });
    });

    return {
      weekNumber: weekNum,
      monday: targetMonday,
      weekDates,
      teams,
      totalPerDay,
      tasksPerDay,
      grandTotalHours: totalPerDay.reduce((a, b) => a + b, 0),
      grandTotalTasks: tasksPerDay.reduce((a, b) => a + b, 0)
    };
  }, [strictlyFilteredData, weekOffset, selectedTimeMetric]);

  const projectTimesheetData = useMemo(() => {
    const today = new Date();
    const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
    const targetMonday = addDays(currentMonday, weekOffset * 7);
    const weekDates = [0, 1, 2, 3, 4].map(i => addDays(targetMonday, i));
    const weekNum = getISOWeek(targetMonday);

    const weekTasks = strictlyFilteredData.filter(t => {
      let rangeStart = t.date_start;
      let rangeEnd = t.date_end;
      if (selectedTimeMetric === 't2') rangeEnd = t.date_complete;
      if (selectedTimeMetric === 't3') rangeEnd = t.date_checked;
      if (selectedTimeMetric === 't4') { rangeStart = t.date_started; rangeEnd = t.date_checked; }
      if (selectedTimeMetric === 't5') { rangeStart = t.created_at; rangeEnd = t.date_checked; }
      
      const weekStart = weekDates[0];
      const weekEnd = addDays(weekDates[4], 1);

      if (!rangeStart || !rangeEnd || rangeStart === '-' || rangeEnd === '-') {
        const fallbackDate = t.dateObj || new Date(t.created_at || Date.now());
        return fallbackDate >= weekStart && fallbackDate < weekEnd;
      }
      
      const startD = new Date(rangeStart);
      const endD = new Date(rangeEnd);
      
      if (isNaN(startD.getTime()) || isNaN(endD.getTime())) {
        const fallbackDate = t.dateObj || new Date(t.created_at || Date.now());
        return fallbackDate >= weekStart && fallbackDate < weekEnd;
      }

      return (startD < weekEnd && endD > weekStart);
    });

    const teamMap = {};
    weekTasks.forEach(t => {
      const team = t.team || 'Unassigned Team';
      const project = t.project || 'Unassigned Project';
      const user = t.userName || t.createdBy || 'Unknown Member';
      
      let rangeStart = t.date_start;
      let rangeEnd = t.date_end;
      if (selectedTimeMetric === 't2') rangeEnd = t.date_complete;
      if (selectedTimeMetric === 't3') rangeEnd = t.date_checked;
      if (selectedTimeMetric === 't4') { rangeStart = t.date_started; rangeEnd = t.date_checked; }
      if (selectedTimeMetric === 't5') { rangeStart = t.created_at; rangeEnd = t.date_checked; }

      const breakdown = calculateDailyWorkingMinutes(rangeStart, rangeEnd);
      
      if (!teamMap[team]) teamMap[team] = {};
      if (!teamMap[team][project]) teamMap[team][project] = {};
      if (!teamMap[team][project][user]) {
        teamMap[team][project][user] = { hours: [0, 0, 0, 0, 0], tasks: [0, 0, 0, 0, 0] };
      }

      Object.entries(breakdown).forEach(([dateStr, mins]) => {
        const d = new Date(dateStr);
        const dayIndex = weekDates.findIndex(wd => isSameDay(d, wd));
        if (dayIndex !== -1) {
          teamMap[team][project][user].hours[dayIndex] += (mins / 60);
        }
      });
      
      const primaryDate = t.dateObj || new Date(rangeStart || Date.now());
      const primaryIdx = weekDates.findIndex(wd => isSameDay(primaryDate, wd));
      if (primaryIdx !== -1) {
        teamMap[team][project][user].tasks[primaryIdx] += 1;
      }
    });

    const teams = Object.entries(teamMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([teamName, projects]) => {
        const teamProjects = Object.entries(projects)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([projectName, users]) => ({
            name: projectName,
            members: Object.entries(users)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([userName, data]) => ({
                name: userName,
                hours: data.hours,
                tasks: data.tasks,
                totalHours: data.hours.reduce((a, b) => a + b, 0),
                totalTasks: data.tasks.reduce((a, b) => a + b, 0)
              })),
            totalRows: Object.keys(users).length
          }));
        return {
          name: teamName,
          projects: teamProjects,
          totalRows: teamProjects.reduce((acc, p) => acc + p.totalRows, 0)
        };
      });
    
    let grandTotalHours = 0;
    let grandTotalTasks = 0;
    (teams || []).forEach(team => {
      (team.projects || []).forEach(project => {
        (project.members || []).forEach(member => {
          grandTotalHours += (member.totalHours || 0);
          grandTotalTasks += (member.totalTasks || 0);
        });
      });
    });

    return { 
      weekNumber: weekNum, 
      weekDates, 
      teams,
      grandTotalHours,
      grandTotalTasks
    };
  }, [strictlyFilteredData, weekOffset, selectedTimeMetric]);

  const deepAnalysisData = useMemo(() => {
    if (filteredData.length === 0) return null;

    const months = eachMonthOfInterval({
      start: subDays(new Date(), 150), 
      end: new Date()
    });

    const trendLabels = months.map(m => format(m, 'yyyy-MM'));
    const t1Data = [];
    const t2Data = [];
    
    months.forEach(m => {
      const monthTasks = filteredData.filter(t => {
        const d = t.dateObj || new Date(t.created_at);
        return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
      });

      if (monthTasks.length === 0) {
        t1Data.push(0);
        t2Data.push(0);
      } else {
        const metrics = monthTasks.map(t => calculateTaskMetrics(t));
        const avgT1 = metrics.reduce((acc, curr) => acc + curr[selectedTimeMetric], 0) / metrics.length;
        const avgT2 = metrics.reduce((acc, curr) => acc + (curr.t2 || 0), 0) / metrics.length;
        t1Data.push(avgT1 / 60); 
        t2Data.push(avgT2 / 60);
      }
    });

    const movingAvg = t1Data.map((val, i, arr) => {
      if (i < 2) return val;
      return (arr[i] + arr[i-1] + arr[i-2]) / 3;
    });

    const projectMap = {};
    filteredData.forEach(t => {
      const pName = t.project || 'Internal';
      projectMap[pName] = (projectMap[pName] || 0) + 1;
    });
    const projectLabels = Object.keys(projectMap).sort((a, b) => projectMap[b] - projectMap[a]).slice(0, 8);
    const projectCounts = projectLabels.map(l => projectMap[l]);

    const userMap = {};
    filteredData.forEach(t => {
      const uName = t.userName || 'Unknown';
      userMap[uName] = (userMap[uName] || 0) + 1;
    });
    const userLabels = Object.keys(userMap).sort((a, b) => userMap[b] - userMap[a]).slice(0, 5);
    const userCounts = userLabels.map(l => userMap[l]);

    return { trendLabels, t1Data, t2Data, movingAvg, projectLabels, projectCounts, userLabels, userCounts };
  }, [filteredData, selectedTimeMetric]);

  const efficiencyData = useMemo(() => {
    const data = analystTasks || [];
    // Only show users who have tasks in the current strictly filtered dataset
    const activeUsers = [...new Set(strictlyFilteredData.map(t => t.userName).filter(Boolean))];
    const users = activeUsers.length > 0 ? activeUsers : filterOptions.users;
    return users.map(uName => {
      const uTasks = strictlyFilteredData.filter(t => t.userName === uName);
      const metrics = uTasks.map(t => calculateTaskMetrics(t));
      const projectTime = metrics.reduce((acc, curr) => acc + (curr.t3 || 0), 0) / 60;
      const checkTime = 0; // Temporarily disabled
      const otTime = manualData[uName]?.ot || 0;
      const totalPlan = metrics.reduce((acc, curr) => acc + curr[selectedTimeMetric], 0) / 60;
      const leaveDays = 0; 
      const freeTime = Math.max(0, 40 - (projectTime + checkTime));
      const efficiency = projectTime > 0 ? (totalPlan / projectTime) * 100 : 100;
      const performance = Math.min(((projectTime + otTime) / 40) * 100, 100);
      return { name: uName, projectTime, checkTime, otTime, leaveDays, freeTime, efficiency, performance };
    }).sort((a, b) => b.projectTime - a.projectTime);
  }, [strictlyFilteredData, analystTasks, filterOptions.users, manualData, selectedTimeMetric]);

  return {
    projectGroups,
    teamGroups,
    ganttTimeline,
    workloadData,
    weeklyData,
    timesheetData,
    projectTimesheetData,
    deepAnalysisData,
    efficiencyData
  };
};
