import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import UnifiedTable from './CSVProcessor/UnifiedTable';
import { User, Target, TrendingUp, Calendar, CalendarDays, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchPersonalSpaceData, fetchUsers } from '../services/supabaseService';
import { processTaskData } from '../utils/dataProcessor';
import { format, startOfWeek, endOfWeek, getISOWeek } from 'date-fns';
import { Filter, List, LayoutGrid, ChevronRight, ChevronLeft, ChevronDown, BarChart2, Users, ArrowUpDown, Search, PieChart } from 'lucide-react';
import { differenceInDays, startOfDay, addDays, isSameDay, isWithinInterval, eachMonthOfInterval, subDays } from 'date-fns';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { 
  calculateTaskMetrics, 
  formatMinutes, 
  calculateDailyWorkingMinutes 
} from '../utils/performanceEngine';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PersonalSpace = () => {
  const { 
    analystUserMap, 
    analystUserTeamMap, 
    analystTasks, 
    setAnalystTasks,
    setColumnFilters, 
    columnFilters, 
    sortConfig, 
    handleSort,
    dashboardProjects 
  } = useApp();

  const projectColorMap = useMemo(() => {
    const map = {};
    if (dashboardProjects) {
      dashboardProjects.forEach(p => {
        if (p.name && p.color) {
          map[p.name.toUpperCase()] = p.color;
        }
      });
    }
    return map;
  }, [dashboardProjects]);

  const getProjectColor = (projectName) => {
    const name = (projectName || '').toUpperCase();
    if (projectColorMap[name]) return projectColorMap[name];
    const colors = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'daily' | 'project' | 'team' | 'gantt' | 'deep-analysis'
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedTeams, setExpandedTeams] = useState({});
  const [weekOffset, setWeekOffset] = useState(0);
  const [localMaps, setLocalMaps] = useState({ userMap: {}, teamMap: {} });
  const [selectedTimeMetric, setSelectedTimeMetric] = useState('t4'); // Default to T4 (Processing Time)
  
  // Optimization: Date Filtering
  const [timeRange, setTimeRange] = useState('month'); // 'week' | 'month' | 'custom'
  
  // Local Filter States
  const [localFilters, setLocalFilters] = useState({
    team: '',
    user: '',
    project: '',
    search: ''
  });

  // Local Sort State
  const [localSort, setLocalSort] = useState('date-desc'); // 'date-desc' | 'date-asc' | 'project-asc' | 'project-desc' | 'user-asc' | 'user-desc' | 'team-asc'

  const loadData = async (force = false) => {
    if (!user) return;
    if (!force && analystTasks && analystTasks.length > 0) return;
    
    setIsLoading(true);
    try {
      // 1. Always fetch ALL users for complete name/team mapping
      const usersList = await fetchUsers();
      const uMap = {};
      const tMap = {};
      usersList.forEach(u => {
        uMap[u.id] = u.name;
        uMap[u.id?.toLowerCase()] = u.name;
        uMap[u.email?.toLowerCase()] = u.name;
        tMap[u.id] = u.team;
        tMap[u.id?.toLowerCase()] = u.team;
      });
      setLocalMaps({ userMap: uMap, teamMap: tMap });

      // 2. Fetch tasks - Admin gets ALL data (no team filter applied in supabaseService)
      const rawTasks = await fetchPersonalSpaceData(user, 50000);
      const processed = processTaskData(rawTasks, uMap, tMap);
      setAnalystTasks(processed);
    } catch (err) {
      console.error('Failed to load personal space data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Ensure daily view only uses weekly range
  useEffect(() => {
    if (viewMode === 'daily' && timeRange !== 'week') {
      setTimeRange('week');
    }
  }, [viewMode]);

  // Dynamic Options for Filters
  const filterOptions = useMemo(() => {
    // We use all tasks to populate the base options
    const data = analystTasks || [];
    const projects = [...new Set(data.map(t => t.project))].sort();
    const users = [...new Set(data.map(t => t.userName))].sort();
    const teams = [...new Set(data.map(t => t.team))].sort().filter(Boolean);
    return { projects, users, teams };
  }, [analystTasks]);

  const filteredData = useMemo(() => {
    const tasks = analystTasks || [];
    if (tasks.length === 0) return [];
    
    const now = new Date();
    const targetDate = addDays(now, weekOffset * 7);
    const startOfCurrentWeek = startOfWeek(targetDate, { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(targetDate, { weekStartsOn: 1 });
    const startOfCurrentMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfCurrentMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

    const filtered = tasks.filter(t => {
      // 1. Date Range Filter
      let dateMatch = true;
      if (t.dateObj && viewMode !== 'project' && viewMode !== 'daily' && viewMode !== 'gantt') {
        if (timeRange === 'week') {
          dateMatch = isWithinInterval(t.dateObj, { start: startOfCurrentWeek, end: endOfCurrentWeek });
        } else if (timeRange === 'month') {
          dateMatch = isWithinInterval(t.dateObj, { start: startOfCurrentMonth, end: endOfCurrentMonth });
        } else if (timeRange === 'custom') {
          dateMatch = true;
        }
      }

      if (!dateMatch) return false;

      // 2. Team Filter
      const matchTeam = !localFilters.team || 
        (t.team && t.team.toString().trim().toLowerCase() === localFilters.team.trim().toLowerCase());
      
      // 3. User Filter
      const matchUser = !localFilters.user || 
        (t.userName && t.userName.toString().trim().toLowerCase() === localFilters.user.trim().toLowerCase());
      
      // 4. Project Filter
      const matchProject = !localFilters.project || 
        (t.project && t.project.toString().trim().toLowerCase() === localFilters.project.trim().toLowerCase());
      
      // 5. Search Filter
      const searchTerm = localFilters.search?.trim().toLowerCase();
      const matchSearch = !searchTerm || 
        t.taskName?.toLowerCase().includes(searchTerm) ||
        t.project?.toLowerCase().includes(searchTerm) ||
        t.userName?.toLowerCase().includes(searchTerm);
      
      return matchTeam && matchUser && matchProject && matchSearch;
    });

    // 6. Apply local sort
    const sorted = [...filtered];
    switch (localSort) {
      case 'date-desc': sorted.sort((a, b) => (b.dateObj || 0) - (a.dateObj || 0)); break;
      case 'date-asc': sorted.sort((a, b) => (a.dateObj || 0) - (b.dateObj || 0)); break;
      case 'project-asc': sorted.sort((a, b) => (a.project || '').localeCompare(b.project || '')); break;
      case 'project-desc': sorted.sort((a, b) => (b.project || '').localeCompare(a.project || '')); break;
      case 'user-asc': sorted.sort((a, b) => (a.userName || '').localeCompare(b.userName || '')); break;
      case 'user-desc': sorted.sort((a, b) => (b.userName || '').localeCompare(a.userName || '')); break;
      case 'team-asc': sorted.sort((a, b) => (a.team || '').localeCompare(b.team || '')); break;
      default: break;
    }
    return sorted;
  }, [analystTasks, localFilters, timeRange, localSort]);

  // Project Grouping View
  const projectGroups = useMemo(() => {
    const groups = {};
    filteredData.forEach(t => {
      const key = t.project || 'Unassigned';
      if (!groups[key]) groups[key] = { name: key, tasks: [], totalTime: 0 };
      groups[key].tasks.push(t);
      groups[key].totalTime += (t.score || 0);
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredData]);

  const teamGroups = useMemo(() => {
    const groups = {};
    filteredData.forEach(t => {
      const key = t.team || 'Unknown Team';
      if (!groups[key]) groups[key] = { name: key, tasks: [], totalTime: 0 };
      groups[key].tasks.push(t);
      groups[key].totalTime += (t.score || 0);
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredData]);

  const ganttTimeline = useMemo(() => {
    const targetDate = addDays(startOfDay(new Date()), weekOffset * 7);
    
    if (timeRange === 'month') {
      const startOfCurrentMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endOfCurrentMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      const daysInMonth = endOfCurrentMonth.getDate();
      return [...Array(daysInMonth)].map((_, i) => addDays(startOfCurrentMonth, i));
    } else if (timeRange === 'week') {
      const targetMonday = startOfWeek(targetDate, { weekStartsOn: 1 });
      return [...Array(7)].map((_, i) => addDays(targetMonday, i));
    } else {
      // Default: 14 days
      const targetMonday = startOfWeek(targetDate, { weekStartsOn: 1 });
      return [...Array(14)].map((_, i) => addDays(targetMonday, i));
    }
  }, [weekOffset, timeRange]);

  const workloadData = useMemo(() => {
    return ganttTimeline.map(day => {
      const activeTasks = filteredData.filter(task => {
        let rStart = task.date_start;
        let rEnd = task.date_end;
        if (selectedTimeMetric === 't2') rEnd = task.date_complete;
        if (selectedTimeMetric === 't3') rEnd = task.date_checked;
        if (selectedTimeMetric === 't4') { rStart = task.date_started; rEnd = task.date_checked; }
        if (selectedTimeMetric === 't5') { rStart = task.created_at; rEnd = task.date_checked; }
        
        let start = rStart && rStart !== '-' ? new Date(rStart) : null;
        let end = rEnd && rEnd !== '-' ? new Date(rEnd) : null;
        
        if (!start || isNaN(start)) start = task.dateObj || new Date(task.created_at || Date.now());
        if (!end || isNaN(end)) end = addDays(start, 1);
        if (end < start) end = addDays(start, 1);

        return isWithinInterval(day, { start: startOfDay(start), end: startOfDay(end) });
      });
      return activeTasks.length;
    });
  }, [filteredData, ganttTimeline, selectedTimeMetric]);

  // Grouping for Weekly View
  const weeklyData = useMemo(() => {
    const groups = {};
    filteredData.forEach(task => {
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
  }, [filteredData]);

  // Timesheet View Data (Mo-Fr pivot table)
  const timesheetData = useMemo(() => {
    const dataToProcess = filteredData;
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

    // Filter tasks that have ANY overlap with this week's Mon-Fri
    const weekTasks = filteredData.filter(t => {
      let rangeStart = t.date_start;
      let rangeEnd = t.date_end;
      if (selectedTimeMetric === 't2') rangeEnd = t.date_complete;
      if (selectedTimeMetric === 't3') rangeEnd = t.date_checked;
      if (selectedTimeMetric === 't4') { rangeStart = t.date_started; rangeEnd = t.date_checked; }
      if (selectedTimeMetric === 't5') { rangeStart = t.created_at; rangeEnd = t.date_checked; }

      const weekStart = weekDates[0];
      const weekEnd = addDays(weekDates[4], 1); // Saturday 00:00

      if (!rangeStart || !rangeEnd || rangeStart === '-' || rangeEnd === '-') {
        const fallbackDate = t.dateObj || new Date(t.created_at || Date.now());
        return fallbackDate >= weekStart && fallbackDate < weekEnd;
      }
      
      const startD = new Date(rangeStart);
      const endD = new Date(rangeEnd);
      
      if (isNaN(startD) || isNaN(endD)) {
        const fallbackDate = t.dateObj || new Date(t.created_at || Date.now());
        return fallbackDate >= weekStart && fallbackDate < weekEnd;
      }

      return (startD < weekEnd && endD > weekStart);
    });

    // Group by team → user → day, distributing hours across the week
    const teamMap = {};
    weekTasks.forEach(t => {
      const team = t.team || 'Unknown';
      const user = t.userName || 'Unknown';
      const project = t.project || 'Unassigned';
      
      // Determine the range for splitting based on selected metric
      let rangeStart = t.date_start;
      let rangeEnd = t.date_end;

      if (selectedTimeMetric === 't2') rangeEnd = t.date_complete;
      if (selectedTimeMetric === 't3') rangeEnd = t.date_checked;
      if (selectedTimeMetric === 't4') { rangeStart = t.date_started; rangeEnd = t.date_checked; }
      if (selectedTimeMetric === 't5') { rangeStart = t.created_at; rangeEnd = t.date_checked; }

      // Get breakdown of minutes per day
      const breakdown = calculateDailyWorkingMinutes(rangeStart, rangeEnd);
      
      if (!teamMap[team]) teamMap[team] = {};
      if (!teamMap[team][user]) teamMap[team][user] = {};
      if (!teamMap[team][user][project]) {
        teamMap[team][user][project] = { hours: [0, 0, 0, 0, 0], tasks: [0, 0, 0, 0, 0] };
      }

      // Add to each day that overlaps with our weekDates
      Object.entries(breakdown).forEach(([dateStr, mins]) => {
        const d = new Date(dateStr);
        const dayIndex = weekDates.findIndex(wd => isSameDay(d, wd));
        if (dayIndex !== -1) {
          teamMap[team][user][project].hours[dayIndex] += (mins / 60);
        }
      });
      
      // Still count the task itself on the primary date for the "Tasks" count
      const primaryDate = t.dateObj || new Date(rangeStart);
      const primaryIdx = weekDates.findIndex(wd => isSameDay(primaryDate, wd));
      if (primaryIdx !== -1) {
        teamMap[team][user][project].tasks[primaryIdx] += 1;
      }
    });

    // Convert to structured array: Team -> User -> Project
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
  }, [filteredData, weekOffset, selectedTimeMetric]);

  // Project-Centric Timesheet View (Team -> Project -> Member)
  const projectTimesheetData = useMemo(() => {
    const today = new Date();
    const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
    const targetMonday = addDays(currentMonday, weekOffset * 7);
    const weekDates = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(targetMonday, i));
    const weekNum = getISOWeek(targetMonday);

    const weekTasks = filteredData.filter(t => {
      let rangeStart = t.date_start;
      let rangeEnd = t.date_end;
      if (selectedTimeMetric === 't2') rangeEnd = t.date_complete;
      if (selectedTimeMetric === 't3') rangeEnd = t.date_checked;
      if (selectedTimeMetric === 't4') { rangeStart = t.date_started; rangeEnd = t.date_checked; }
      if (selectedTimeMetric === 't5') { rangeStart = t.created_at; rangeEnd = t.date_checked; }
      
      const weekStart = weekDates[0];
      const weekEnd = addDays(weekDates[6], 1); // Sunday 23:59:59

      if (!rangeStart || !rangeEnd || rangeStart === '-' || rangeEnd === '-') {
        const fallbackDate = t.dateObj || new Date(t.created_at || Date.now());
        return fallbackDate >= weekStart && fallbackDate < weekEnd;
      }
      
      const startD = new Date(rangeStart);
      const endD = new Date(rangeEnd);
      
      if (isNaN(startD) || isNaN(endD)) {
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

      // Even if calculateDailyWorkingMinutes returns empty (malformed dates), 
      // we still want to see the member row if they have a task this week
      const breakdown = calculateDailyWorkingMinutes(rangeStart, rangeEnd);
      
      if (!teamMap[team]) teamMap[team] = {};
      if (!teamMap[team][project]) teamMap[team][project] = {};
      if (!teamMap[team][project][user]) {
        teamMap[team][project][user] = { hours: [0, 0, 0, 0, 0, 0, 0], tasks: [0, 0, 0, 0, 0, 0, 0] };
      }

      Object.entries(breakdown).forEach(([dateStr, mins]) => {
        const d = new Date(dateStr);
        const dayIndex = weekDates.findIndex(wd => isSameDay(d, wd));
        if (dayIndex !== -1) {
          teamMap[team][project][user].hours[dayIndex] += (mins / 60);
        }
      });
      
      // Force task count increment to ensure row visibility
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
    
    // Calculate totals for Project view
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
  }, [filteredData, weekOffset, selectedTimeMetric]);

  // --- DEEP ANALYSIS CALCULATIONS (Power BI Style) ---
  const deepAnalysisData = useMemo(() => {
    if (filteredData.length === 0) return null;

    // 1. Performance Trend (Last 5 Months)
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

  const toggleWeek = (key) => {
    setExpandedWeeks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const scopeLabel = useMemo(() => {
    if (user?.isAdmin) return { label: 'Global Intelligence', sub: 'Admin Oversight Mode', color: 'text-rose-500', bg: 'bg-rose-500/10' };
    if (user?.team) return { label: 'Team Intelligence', sub: `${user.team} Collaboration Mode`, color: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { label: 'Personal Intelligence', sub: 'Individual Performance Mode', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
  }, [user]);

  if (isLoading && (!analystTasks || analystTasks.length === 0)) {
    return (
      <div className="space-y-[10px] pb-20">
        {/* Show header even while loading */}
        <div className="bg-[var(--bg-card)] p-[20px] rounded-[12px] border border-[var(--border)] shadow-xl">
          <h2 className="text-[28px] font-black text-[var(--text-contrast)] uppercase tracking-tighter flex items-center gap-[10px]">
            <User size={28} className={scopeLabel.color} />
            <span className={scopeLabel.color}>PERSONAL</span> SPACE
          </h2>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${scopeLabel.bg} ${scopeLabel.color}`}>{scopeLabel.label}</span>
          </div>
        </div>
        <div className="h-[50vh] flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-400">Syncing Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-[10px] animate-in fade-in duration-700 pb-20">
      {/* Sticky Header + Filter Wrapper */}
      <div className="sticky top-[64px] z-[40] w-full space-y-[10px] pb-[10px] pt-[10px] mt-[-10px]" style={{ background: 'var(--bg-main, #0f172a)' }}>
      {/* Header */}
      <div className="bg-[var(--bg-card)] px-[20px] py-[16px] rounded-[12px] border border-[var(--border)] shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-[12px]">
          <div>
            <h2 className="text-[28px] font-black text-[var(--text-contrast)] uppercase tracking-tighter flex items-center gap-[10px]">
              <User size={28} className={scopeLabel.color} />
              <span className={scopeLabel.color}>PERSONAL</span> SPACE
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${scopeLabel.bg} ${scopeLabel.color}`}>{scopeLabel.label}</span>
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{scopeLabel.sub}</span>
              {filteredData.length > 0 && (
                <span className="text-[9px] font-bold text-slate-500 uppercase">{filteredData.length} records</span>
              )}
            </div>
          </div>
        </div>

        {/* Windows 11 Fluent Toolbar - REDESIGNED */}
        <div className="mt-[12px] flex items-center gap-[12px] overflow-x-auto custom-scrollbar py-[4px]">
          
          {/* Orange Group: View Modes (List, Weekly, Daily) */}
          <div className="flex items-center gap-[6px] p-[4px] rounded-xl bg-orange-500/5 border border-orange-500/20 shadow-sm shrink-0">
            {[
              { id: 'list', label: 'List', icon: <List size={14} /> },
              { id: 'daily', label: 'Daily', icon: <CalendarDays size={14} /> }
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`flex items-center gap-2 h-[32px] px-3 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${
                  viewMode === v.id
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                    : 'text-orange-500/70 hover:bg-orange-500/10 hover:text-orange-500'
                }`}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>

          {/* Green Group: Entity Modes (Project) */}
          <div className="flex items-center gap-[6px] p-[4px] rounded-xl bg-emerald-500/5 border border-emerald-500/20 shadow-sm shrink-0">
            {[
              { id: 'project', label: 'Project', icon: <LayoutGrid size={14} /> }
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`flex items-center gap-2 h-[32px] px-3 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${
                  viewMode === v.id
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'text-emerald-500/70 hover:bg-emerald-500/10 hover:text-emerald-500'
                }`}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>

          {/* Dark Blue Group: Analysis Modes (Gantt, Deep Analysis) */}
          <div className="flex items-center gap-[6px] p-[4px] rounded-xl bg-indigo-500/5 border border-indigo-500/20 shadow-sm shrink-0">
            {[
              { id: 'gantt', label: 'Gantt', icon: <BarChart2 size={14} /> },
              { id: 'deep-analysis', label: 'Deep Analysis', icon: <Target size={14} /> }
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`flex items-center gap-2 h-[32px] px-3 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${
                  viewMode === v.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300'
                }`}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>

          <div className="flex-1" /> {/* Spacer */}

            {/* Lime Group: Time Filters (Week, Month, Custom) - HIDDEN IN PROJECT VIEW */}
            {viewMode !== 'project' && (
              <div className="flex items-center gap-[6px] p-[4px] rounded-xl bg-lime-500/5 border border-lime-500/20 shadow-sm shrink-0">
                {[
                  { id: 'week', label: 'Week', icon: <Calendar size={14} /> },
                  { id: 'month', label: 'Month', icon: <CalendarDays size={14} /> },
                  { id: 'custom', label: 'Custom', icon: <TrendingUp size={14} /> }
                ].map(r => {
                  const isDisabled = viewMode === 'daily' && r.id !== 'week';
                  return (
                    <button
                      key={r.id}
                      disabled={isDisabled}
                      onClick={() => setTimeRange(r.id)}
                      className={`flex items-center gap-2 h-[32px] px-3 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${
                        isDisabled ? 'opacity-20 grayscale cursor-not-allowed' :
                        timeRange === r.id
                          ? 'bg-lime-600 text-white shadow-lg shadow-lime-600/25'
                          : 'text-lime-500/70 hover:bg-lime-500/10 hover:text-lime-400'
                      }`}
                    >
                      {r.icon} {r.label}
                    </button>
                  );
                })}
              </div>
            )}

          {/* Purple Group: Sync */}
          <div className="flex items-center gap-[6px] p-[4px] rounded-xl bg-violet-500/5 border border-violet-500/20 shadow-sm shrink-0">
            <button
              onClick={() => loadData(true)}
              className={`flex items-center gap-2 h-[32px] px-3 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-200 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300`}
              title="Force Sync with Supabase"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Sync
            </button>
          </div>
        </div>
      </div>

      {/* Smart Filters Bar */}
      <div className="flex items-center gap-[10px] bg-[var(--bg-card)] px-[16px] py-[10px] rounded-[10px] border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-2 text-[var(--text-muted)] shrink-0">
          <Filter size={16} />
          <span className="text-[11px] font-semibold uppercase tracking-wider">Filters</span>
        </div>

        <input 
          type="text"
          placeholder="Search projects or tasks..."
          className="flex-1 min-w-[180px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-md h-[36px] px-3 text-[13px] font-medium text-[var(--text-main)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-300/30 transition-all"
          value={localFilters.search}
          onChange={e => setLocalFilters(prev => ({ ...prev, search: e.target.value }))}
        />

        {user?.isAdmin && (
          <select 
            className="min-w-[160px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-md h-[36px] px-3 text-[13px] font-medium text-[var(--text-main)] outline-none focus:border-blue-500 transition-all"
            value={localFilters.team}
            onChange={e => setLocalFilters(prev => ({ ...prev, team: e.target.value }))}
          >
            <option value="">All Teams</option>
            {filterOptions.teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        <select 
          className="min-w-[160px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-md h-[36px] px-3 text-[13px] font-medium text-[var(--text-main)] outline-none focus:border-emerald-500 transition-all"
          value={localFilters.project}
          onChange={e => setLocalFilters(prev => ({ ...prev, project: e.target.value }))}
        >
          <option value="">All Projects</option>
          {filterOptions.projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select 
          className="min-w-[160px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-md h-[36px] px-3 text-[13px] font-medium text-[var(--text-main)] outline-none focus:border-indigo-500 transition-all"
          value={localFilters.user}
          onChange={e => setLocalFilters(prev => ({ ...prev, user: e.target.value }))}
        >
          <option value="">All Members</option>
          {filterOptions.users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        <button 
          onClick={() => setLocalFilters({ team: '', user: '', project: '', search: '' })}
          className="h-[36px] px-4 text-[12px] font-semibold text-rose-500 hover:bg-rose-500/10 rounded-md transition-all shrink-0"
        >
          Clear
        </button>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 shrink-0 border-l border-[var(--border)] pl-3">
          <ArrowUpDown size={14} className="text-[var(--text-muted)]" />
          <select
            className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-md h-[36px] px-3 text-[13px] font-medium text-[var(--text-main)] outline-none focus:border-blue-500 transition-all"
            value={localSort}
            onChange={e => setLocalSort(e.target.value)}
          >
            <option value="date-desc">Date ↓ Newest</option>
            <option value="date-asc">Date ↑ Oldest</option>
            <option value="project-asc">Project A→Z</option>
            <option value="project-desc">Project Z→A</option>
            <option value="user-asc">User A→Z</option>
            <option value="user-desc">User Z→A</option>
            <option value="team-asc">Team A→Z</option>
          </select>
        </div>
      </div>
      </div>{/* End Sticky Wrapper */}

      {/* Content Area */}
      {/* Timesheet Summary & Navigation Header (Visible for Daily, Project, and Gantt) */}
      {/* --- CONTENT AREA: STATS & TIME NAVIGATION --- */}
      <div className="ocd-card p-0 overflow-hidden mb-[10px] shadow-xl border border-indigo-500/20 bg-[var(--bg-card)]">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between px-[20px] py-[12px] bg-indigo-500/5 border-b border-[var(--border)] gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Hours:</span>
              <span className="text-[15px] font-black text-indigo-400">
                {((viewMode === 'daily' || viewMode === 'list') ? timesheetData?.grandTotalHours : projectTimesheetData?.grandTotalHours || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Tasks:</span>
              <span className="text-[15px] font-black text-emerald-400">
                {(viewMode === 'daily' || viewMode === 'list') ? timesheetData?.grandTotalTasks : projectTimesheetData?.grandTotalTasks || 0}
              </span>
            </div>

            <div className="w-[1px] h-8 bg-[var(--border)] mx-2 hidden xl:block" />

            {/* Time Metric Selector */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-inner">
              {[
                { id: 't1', label: 'T1', color: 'emerald', tooltip: 'DATE_START → DATE_END' },
                { id: 't2', label: 'T2', color: 'sky', tooltip: 'DATE_START → DATE_COMPLETE' },
                { id: 't3', label: 'T3', color: 'indigo', tooltip: 'DATE_START → DATE_CHECKED' },
                { id: 't4', label: 'T4', color: 'orange', tooltip: 'DATE_STARTED → DATE_CHECKED' },
                { id: 't5', label: 'T5', color: 'rose', tooltip: 'CREATED_AT → DATE_CHECKED' }
              ].map((m) => {
                const isActive = selectedTimeMetric === m.id;
                const colorClass = 
                  m.color === 'emerald' ? (isActive ? 'bg-emerald-500 text-white' : 'text-emerald-500 hover:bg-emerald-500/10') :
                  m.color === 'sky' ? (isActive ? 'bg-sky-500 text-white' : 'text-sky-500 hover:bg-sky-500/10') :
                  m.color === 'indigo' ? (isActive ? 'bg-indigo-500 text-white' : 'text-indigo-500 hover:bg-indigo-500/10') :
                  m.color === 'orange' ? (isActive ? 'bg-orange-500 text-white' : 'text-orange-500 hover:bg-orange-500/10') :
                  (isActive ? 'bg-rose-500 text-white' : 'text-rose-500 hover:bg-rose-500/10');

                return (
                  <div key={m.id} className="relative group/time">
                    <div className="absolute -top-[34px] left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-[#0f172a] border border-white/10 rounded-md shadow-2xl opacity-0 group-hover/time:opacity-100 transition-all pointer-events-none whitespace-nowrap z-[60]">
                      <span className="text-[9px] font-black text-white tracking-tighter uppercase">{m.tooltip}</span>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0f172a] border-r border-b border-white/10 rotate-45" />
                    </div>

                    <button
                      onClick={() => setSelectedTimeMetric(m.id)}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${colorClass} ${isActive ? 'shadow-md' : ''}`}
                    >
                      {m.label}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enhanced Year/Week Picker + Navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-indigo-500/10 p-1.5 rounded-xl border border-indigo-500/30 shadow-sm">
              <select 
                className="bg-[var(--bg-surface)] border border-indigo-500/20 rounded-lg h-[32px] px-2 text-[12px] font-black text-indigo-400 outline-none cursor-pointer hover:border-indigo-500 transition-all"
                value={format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7), 'yyyy')}
                onChange={(e) => {
                  const targetYear = parseInt(e.target.value);
                  const targetMonday = new Date(targetYear, 0, 4);
                  const currentMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
                  const diffWeeks = Math.round((targetMonday - currentMonday) / (7 * 24 * 60 * 60 * 1000));
                  setWeekOffset(diffWeeks);
                  if (timeRange === 'custom') setTimeRange('week');
                }}
              >
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              
              <div className="w-[1px] h-4 bg-indigo-500/20" />
              
              <div className="flex items-center gap-1.5 px-1">
                <span className="text-[10px] font-black text-indigo-500/60">W</span>
                <select 
                  className="bg-[var(--bg-surface)] border border-emerald-500/20 rounded-lg h-[32px] px-2 text-[12px] font-black text-emerald-500 outline-none cursor-pointer hover:border-emerald-500 transition-all"
                  value={format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7), 'I')}
                  onChange={(e) => {
                    const targetWeek = parseInt(e.target.value);
                    const date = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7);
                    const currentWeek = parseInt(format(date, 'I'));
                    setWeekOffset(prev => prev + (targetWeek - currentWeek));
                    if (timeRange === 'custom') setTimeRange('week');
                  }}
                >
                  {[...Array(53)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekOffset(o => o - 1)}
                className="w-[32px] h-[32px] rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setWeekOffset(o => o + 1)}
                className="w-[32px] h-[32px] rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider px-3 py-1.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
              >
                Current Week
              </button>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'list' && (
        <div className="ocd-card p-0 overflow-hidden shadow-2xl shadow-black/20">
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar sticky-header-container">
            <UnifiedTable 
              data={filteredData}
              columnFilters={columnFilters}
              setColumnFilters={setColumnFilters}
              sortConfig={sortConfig}
              handleSort={handleSort}
              columnOptions={filterOptions}
              stickyOffset="0px"
            />
          </div>
        </div>
      )}

      {viewMode === 'project' && (
        <div className="ocd-card p-0 shadow-2xl shadow-black/20 border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse table-fixed" style={{ minWidth: '1120px' }}>
              <colgroup>
                <col style={{ width: '140px' }} />
                <col style={{ width: '200px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
              </colgroup>
              <thead>
                <tr className="bg-[var(--bg-card)]">
                  <th className="sticky z-[35] text-left px-[16px] py-[14px] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-r border-[var(--border)] bg-[var(--bg-card)]" style={{ top: '0px' }}>Team</th>
                  <th className="sticky z-[35] text-left px-[16px] py-[14px] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-r border-[var(--border)] bg-[var(--bg-card)]" style={{ top: '0px' }}>Project</th>
                  <th className="sticky z-[35] text-left px-[16px] py-[14px] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-r border-[var(--border)] bg-[var(--bg-card)]" style={{ top: '0px' }}>Member</th>
                  {projectTimesheetData.weekDates.map((date, i) => {
                    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    const dayColors = ['text-blue-400', 'text-violet-400', 'text-amber-400', 'text-emerald-400', 'text-rose-400', 'text-orange-400', 'text-pink-400'];
                    return (
                      <th key={i} className="sticky z-[35] text-center px-[10px] py-[12px] border-b border-r border-[var(--border)] bg-[var(--bg-card)]" style={{ top: '0px' }}>
                        <div className={`text-[12px] font-black ${dayColors[i]}`}>{format(date, 'dd/MM')}</div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">[{dayLabels[i]}]</div>
                      </th>
                    );
                  })}
                  <th className="sticky z-[35] text-center px-[10px] py-[14px] border-b border-[var(--border)] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest bg-[var(--bg-card)]" style={{ top: '0px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {projectTimesheetData.teams.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-[40px]">
                      <CalendarDays size={28} className="text-[var(--text-muted)] opacity-30 mx-auto mb-2" />
                      <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.2em]">No project data for Week {projectTimesheetData.weekNumber}</p>
                    </td>
                  </tr>
                )}
                {projectTimesheetData.teams.map((team, ti) => (
                  <React.Fragment key={ti}>
                    {team.projects.map((project, pi) => (
                      project.members.map((member, mi) => {
                        const isEvenMember = mi % 2 === 0;
                        const rowBg = isEvenMember ? 'bg-[var(--bg-surface)]/30' : 'bg-transparent';
                        
                        return (
                          <tr 
                            key={`${ti}-${pi}-${mi}`} 
                            className={`hover:bg-indigo-500/10 transition-colors border-b border-[var(--border)] ${rowBg}`}
                          >
                            {/* Team Column */}
                            {pi === 0 && mi === 0 && (
                              <td
                                rowSpan={team.totalRows}
                                className="px-[20px] py-[15px] text-[12px] font-black text-indigo-500 uppercase tracking-tight border-r border-[var(--border)] align-top bg-indigo-500/[0.05] min-w-[140px]"
                              >
                                {team.name}
                              </td>
                            )}
                            {/* Project Column */}
                            {mi === 0 && (
                              <td
                                rowSpan={project.totalRows}
                                className="px-[12px] py-[15px] text-[10px] font-black border-r border-[var(--border)] uppercase align-top bg-emerald-500/[0.02]"
                                style={{ color: getProjectColor(project.name) }}
                              >
                                {project.name}
                              </td>
                            )}
                            {/* Member Column */}
                            <td className="px-[20px] py-[15px] text-[12px] font-black text-sky-500 uppercase tracking-tight border-r border-[var(--border)] min-w-[140px]">
                              {member.name}
                            </td>
                            {member.hours.map((hours, di) => {
                              const cellColor = hours === 0 ? 'text-[var(--text-muted)] opacity-30'
                                : hours < 4 ? 'text-rose-400 font-black'
                                : hours < 7 ? 'text-amber-400 font-black'
                                : hours < 9 ? 'text-emerald-400 font-black'
                                : 'text-blue-400 font-black';
                              return (
                                <td key={di} className={`text-center px-[12px] py-[15px] text-[13px] border-r border-[var(--border)] ${cellColor}`}>
                                  {hours > 0 ? hours.toFixed(2) : ''}
                                </td>
                              );
                            })}
                            <td className="text-center px-[12px] py-[15px] text-[13px] font-black text-[var(--text-contrast)]">
                              {member.totalHours > 0 ? member.totalHours.toFixed(2) : ''}
                            </td>
                          </tr>
                        );
                      })
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'gantt' && (
        <div className="ocd-card p-0 overflow-hidden bg-[var(--bg-card)] border border-[var(--border)] rounded-[12px] shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <div className="w-full min-w-[900px]">
              {/* Gantt Header: Dates */}
              <div className="flex border-b border-[var(--border)] bg-white/5 sticky z-20 backdrop-blur-md" style={{ top: '240px' }}>
                <div className="w-[200px] md:w-[250px] border-r border-[var(--border)] p-[15px] text-[10px] font-black uppercase text-indigo-400 shrink-0 bg-[var(--bg-card)]">Task Intelligence</div>
                <div className="flex-1 flex min-w-0">
                  {ganttTimeline.map((date, i) => {
                    const isToday = isSameDay(date, new Date());
                    return (
                      <div key={i} className={`flex-1 min-w-[28px] border-r border-[var(--border)] py-[10px] px-0 text-center flex flex-col items-center justify-center ${isToday ? 'bg-indigo-500/20' : 'bg-[var(--bg-card)]'}`}>
                        <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-tighter">{format(date, 'EEE')}</div>
                        <div className={`text-[10px] md:text-[11px] font-black tracking-tighter ${isToday ? 'text-indigo-400' : 'text-[var(--text-main)]'}`}>{format(date, 'dd/MM')}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gantt Rows */}
              <div className="max-h-[calc(100vh-320px)] min-h-[400px] overflow-y-auto">
                <AnimatePresence initial={false}>
                  {projectGroups.map(group => {
                    const chartStart = ganttTimeline[0];
                    const totalDays = ganttTimeline.length;
                    
                    // Pre-calculate visibility
                    const visibleTasks = group.tasks.map(task => {
                      let rStart = task.date_start;
                      let rEnd = task.date_end;
                      if (selectedTimeMetric === 't2') rEnd = task.date_complete;
                      if (selectedTimeMetric === 't3') rEnd = task.date_checked;
                      if (selectedTimeMetric === 't4') { rStart = task.date_started; rEnd = task.date_checked; }
                      if (selectedTimeMetric === 't5') { rStart = task.created_at; rEnd = task.date_checked; }
                      
                      let startDate = rStart && rStart !== '-' ? new Date(rStart) : null;
                      let endDate = rEnd && rEnd !== '-' ? new Date(rEnd) : null;
                      
                      if (!startDate || isNaN(startDate)) startDate = task.dateObj || new Date(task.created_at || Date.now());
                      if (!endDate || isNaN(endDate)) endDate = addDays(startDate, 1);
                      if (endDate < startDate) endDate = addDays(startDate, 1);
                      
                      const startOffsetRaw = differenceInDays(startDate, chartStart);
                      const durationRaw = differenceInDays(endDate, startDate) + 1;
                      
                      const renderOffset = Math.max(0, startOffsetRaw);
                      const overflowLeft = startOffsetRaw < 0 ? Math.abs(startOffsetRaw) : 0;
                      let renderDuration = durationRaw - overflowLeft;
                      
                      if (renderOffset + renderDuration > totalDays) {
                        renderDuration = totalDays - renderOffset;
                      }
                      
                      if (renderDuration <= 0 || renderOffset >= totalDays || startOffsetRaw + durationRaw <= 0) return null;
                      
                      return { ...task, renderOffset, renderDuration };
                    }).filter(Boolean);

                    if (visibleTasks.length === 0) return null;

                    const minOffset = Math.min(...visibleTasks.map(t => t.renderOffset));
                    const maxEnd = Math.max(...visibleTasks.map(t => t.renderOffset + t.renderDuration));
                    const projectDuration = maxEnd - minOffset;

                    return (
                      <motion.div 
                        key={group.name} 
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="flex h-[48px] hover:bg-white/[0.02] group border-b border-[var(--border)] transition-colors"
                      >
                        <div className="w-[200px] md:w-[250px] border-r border-[var(--border)] p-[10px] flex items-center justify-between shrink-0 bg-indigo-500/5">
                          <span className="text-[10px] font-black text-[var(--text-main)] group-hover:text-indigo-400 uppercase truncate pr-2 transition-colors">{group.name}</span>
                          <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md whitespace-nowrap">{visibleTasks.length} tasks</span>
                        </div>
                        <div className="flex-1 relative flex items-center px-2">
                          {/* Project Aggregated Bar */}
                          <motion.div 
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: `${(projectDuration / totalDays) * 100}%` }}
                            style={{ 
                              marginLeft: `${(minOffset / totalDays) * 100}%`,
                              backgroundColor: 'rgba(99, 102, 241, 0.25)',
                              border: '1px solid rgba(99, 102, 241, 0.6)',
                              boxShadow: '0 0 10px rgba(99, 102, 241, 0.1)'
                            }}
                            className="h-5 rounded-[4px] relative overflow-hidden group/bar"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
                          </motion.div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Workload Intelligence HTML Chart */}
              <div className="flex border-t border-[var(--border)] bg-[var(--bg-card)] h-[150px] sticky bottom-0 z-10">
                <div className="w-[200px] md:w-[250px] border-r border-[var(--border)] p-[15px] flex flex-col justify-center shrink-0">
                  <div className="flex items-center gap-[10px]">
                    <TrendingUp size={16} className="text-emerald-400 shrink-0" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-tight">Workload<br/>(Tasks / Day)</span>
                  </div>
                </div>
                <div className="flex-1 flex min-w-0 items-end">
                  {ganttTimeline.map((date, i) => {
                    const count = workloadData[i];
                    const maxCount = Math.max(...workloadData, 1);
                    const heightPct = (count / maxCount) * 100;
                    const isToday = isSameDay(date, new Date());
                    
                    return (
                      <div key={i} className={`flex-1 min-w-[28px] border-r border-[var(--border)] h-full flex flex-col justify-end px-[4px] pb-[1px] group relative ${isToday ? 'bg-indigo-500/10' : ''}`}>
                        {count > 0 && (
                          <div className="w-full relative flex flex-col items-center justify-end h-full">
                            <span className="text-[9px] font-black text-emerald-500 mb-1 opacity-50 group-hover:opacity-100 transition-opacity">{count}</span>
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: `${heightPct * 0.8}%` }}
                              className="bg-emerald-500/60 hover:bg-emerald-400 border border-emerald-500 rounded-t-[4px] w-full max-w-[32px] transition-colors"
                              style={{ minHeight: '4px' }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}




      {viewMode === 'daily' && (
        <div className="ocd-card p-0 shadow-2xl shadow-black/20 border border-[var(--border)] bg-[var(--bg-card)]">
          {/* Timesheet Table */}
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse table-fixed" style={{ minWidth: '960px' }}>
              <colgroup>
                <col style={{ width: '140px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: '200px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
              </colgroup>
              <thead>
                <tr className="bg-[var(--bg-card)]">
                  <th className="sticky z-[35] text-left px-[16px] py-[14px] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-r border-[var(--border)] bg-[var(--bg-card)]" style={{ top: '0px' }}>Team</th>
                  <th className="sticky z-[35] text-left px-[16px] py-[14px] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-r border-[var(--border)] bg-[var(--bg-card)]" style={{ top: '0px' }}>Member</th>
                  <th className="sticky z-[35] text-left px-[16px] py-[14px] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-r border-[var(--border)] bg-[var(--bg-card)]" style={{ top: '0px' }}>Project</th>
                  {timesheetData.weekDates.map((date, i) => {
                    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                    const dayColors = ['text-blue-400', 'text-violet-400', 'text-amber-400', 'text-emerald-400', 'text-rose-400'];
                    const isToday = isSameDay(date, new Date());
                    return (
                      <th key={i} className={`sticky z-[35] text-center px-[10px] py-[12px] border-b border-r border-[var(--border)] ${isToday ? 'bg-indigo-500/20' : 'bg-[var(--bg-card)]'}`} style={{ top: '0px' }}>
                        <div className={`text-[12px] font-black ${dayColors[i]}`}>{format(date, 'dd/MM')}</div>
                        <div className={`text-[9px] font-bold uppercase tracking-wider ${isToday ? 'text-indigo-400' : 'text-[var(--text-muted)]'}`}>[{dayLabels[i]}]</div>
                      </th>
                    );
                  })}
                  <th className="sticky z-[35] text-center px-[10px] py-[14px] border-b border-[var(--border)] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest bg-[var(--bg-card)]" style={{ top: '0px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {timesheetData.teams.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-[40px]">
                      <CalendarDays size={28} className="text-[var(--text-muted)] opacity-30 mx-auto mb-2" />
                      <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.2em]">No data for Week {timesheetData.weekNumber}</p>
                    </td>
                  </tr>
                )}
                {timesheetData.teams.map((team, ti) => (
                  <React.Fragment key={ti}>
                    {team.users.map((user, ui) => {
                      const isEvenUser = ui % 2 === 0;
                      const rowBg = isEvenUser ? 'bg-[var(--bg-surface)]/30' : 'bg-transparent';
                      
                      return user.projects.map((project, pi) => (
                        <tr 
                          key={`${ti}-${ui}-${pi}`} 
                          className={`hover:bg-indigo-500/10 transition-colors border-b border-[var(--border)] ${rowBg}`}
                        >
                        {/* Team Column */}
                        {ui === 0 && pi === 0 && (
                          <td
                            rowSpan={team.totalRows}
                            className="px-[20px] py-[15px] text-[12px] font-black text-indigo-500 uppercase tracking-tight border-r border-[var(--border)] align-top bg-indigo-500/[0.05] min-w-[140px]"
                          >
                            {team.name}
                          </td>
                        )}
                        {/* Member Column */}
                        {pi === 0 && (
                          <td
                            rowSpan={user.projects.length}
                            className="px-[20px] py-[15px] text-[12px] font-black text-sky-500 uppercase tracking-tight border-r border-[var(--border)] align-top bg-[var(--bg-surface)]/10 min-w-[140px]"
                          >
                            {user.name}
                          </td>
                        )}
                        {/* Project Column */}
                        <td className="px-[20px] py-[15px] text-[11px] font-bold text-emerald-500 border-r border-[var(--border)] uppercase min-w-[180px]">
                          {project.name}
                        </td>
                        {project.hours.map((hours, di) => {
                          const isToday = isSameDay(timesheetData.weekDates[di], new Date());
                          const cellColor = hours === 0 ? 'text-[var(--text-muted)] opacity-30'
                            : hours < 4 ? 'text-rose-400 font-black'
                            : hours < 7 ? 'text-amber-400 font-black'
                            : hours < 9 ? 'text-emerald-400 font-black'
                            : 'text-blue-400 font-black';
                          return (
                            <td
                              key={di}
                              className={`text-center px-[12px] py-[15px] text-[13px] border-r border-[var(--border)] ${isToday ? 'bg-indigo-500/5' : ''} ${cellColor}`}
                            >
                              {hours > 0 ? hours.toFixed(2) : ''}
                            </td>
                          );
                        })}
                        <td className="text-center px-[12px] py-[15px] text-[13px] font-black text-[var(--text-contrast)]">
                          {project.totalHours > 0 ? project.totalHours.toFixed(2) : ''}
                        </td>
                      </tr>
                      ))
                    })}
                  </React.Fragment>
                ))}
              </tbody>
              {timesheetData.teams.length > 0 && (
                <tfoot>
                  <tr className="bg-white/[0.05] border-t-2 border-[var(--border)]">
                    <td colSpan={3} className="px-[16px] py-[12px] text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest border-r border-[var(--border)]">Total</td>
                    {timesheetData.totalPerDay.map((total, i) => {
                      const isToday = isSameDay(timesheetData.weekDates[i], new Date());
                      return (
                        <td key={i} className={`text-center px-[10px] py-[12px] text-[13px] font-black text-[var(--text-contrast)] border-r border-[var(--border)] ${isToday ? 'bg-indigo-500/10' : ''}`}>
                          {total > 0 ? total.toFixed(2) : ''}
                        </td>
                      );
                    })}
                    <td className="text-center px-[10px] py-[12px] text-[14px] font-black text-indigo-400">
                      {timesheetData.grandTotalHours.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {viewMode === 'deep-analysis' && (
        <div className="flex flex-col gap-[15px] animate-in fade-in duration-1000 slide-in-from-bottom-4">
          {/* Main Trend Chart Card */}
          <div className="bg-[var(--bg-card)] backdrop-blur-2xl border border-[var(--border)] rounded-xl overflow-hidden shadow-xl">
            {/* Header section moved inside the chart card for a cleaner look */}
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Operational Pulse</span>
                  </div>
                  <h3 className="text-[14px] font-black text-[var(--text-contrast)] uppercase tracking-[0.1em]">Performance Trend <span className="text-[var(--text-muted)] font-medium ml-2">(Inc. 3-Period Moving Average)</span></h3>
                </div>
                <div className="flex items-center gap-6 bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border)] shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.3)]" />
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">T1 Duration</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-0.5 border-t-2 border-amber-500 border-dashed" />
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-tighter">Moving Avg (3P)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">T2 Completion</span>
                  </div>
                </div>
              </div>
              <div className="h-[320px] w-full">
                <Line 
                  data={{
                    labels: deepAnalysisData?.trendLabels || [],
                    datasets: [
                      {
                        label: 'T1 Duration',
                        data: deepAnalysisData?.t1Data || [],
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 4,
                        pointRadius: 5,
                        pointBackgroundColor: '#6366f1',
                        pointBorderColor: 'var(--bg-card)',
                        pointBorderWidth: 2,
                        tension: 0.4,
                        fill: true
                      },
                      {
                        label: 'Moving Average',
                        data: deepAnalysisData?.movingAvg || [],
                        borderColor: '#f59e0b',
                        borderWidth: 2,
                        borderDash: [8, 4],
                        pointRadius: 0,
                        tension: 0.4,
                        fill: false
                      },
                      {
                        label: 'T2 Completion',
                        data: deepAnalysisData?.t2Data || [],
                        borderColor: '#10b981',
                        borderWidth: 4,
                        pointRadius: 5,
                        pointBackgroundColor: '#10b981',
                        pointBorderColor: 'var(--bg-card)',
                        pointBorderWidth: 2,
                        tension: 0.4,
                        fill: false
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'var(--bg-card)',
                        titleColor: 'var(--text-contrast)',
                        bodyColor: 'var(--text-main)',
                        titleFont: { size: 12, weight: 'bold' },
                        bodyFont: { size: 11 },
                        padding: 15,
                        cornerRadius: 12,
                        borderColor: 'var(--border)',
                        borderWidth: 1
                      }
                    },
                    scales: {
                      x: { grid: { display: false }, ticks: { color: 'var(--text-muted)', font: { size: 9, weight: 'medium' }, opacity: 0.5 } },
                      y: { 
                        grid: { color: 'rgba(148, 163, 184, 0.05)', drawBorder: false }, 
                        ticks: { color: 'var(--text-muted)', font: { size: 9 }, callback: v => v.toFixed(2) + 'h', opacity: 0.5 } 
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Interactive Layer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[15px]">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 shadow-sm h-[480px] flex flex-col">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-[12px] font-black text-[var(--text-contrast)] uppercase tracking-widest">Project Distribution</h3>
                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mt-1">Resource Allocation Analysis</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <PieChart size={18} className="text-indigo-500" />
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <div className="relative w-[360px] h-[360px] flex items-center justify-center" style={{ perspective: '2000px' }}>
                  {/* Cinematic Glow/Pulse behind the sphere */}
                  <div className="absolute inset-0 bg-indigo-500/5 rounded-full blur-[100px] animate-pulse" />
                  
                  {/* Rotating Orbital Rings Wrapper */}
                  <div 
                    className="w-full h-full"
                    style={{ 
                      transform: 'rotateX(65deg) rotateY(0deg)',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    <motion.div 
                      className="w-full h-full"
                      animate={{ rotateZ: 360 }}
                      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    >
                      <Doughnut 
                        data={{
                          labels: deepAnalysisData?.projectLabels || [],
                          datasets: [{
                            data: deepAnalysisData?.projectCounts || [],
                            backgroundColor: [
                              '#6366f1', '#10b981', '#f59e0b', '#3b82f6', 
                              '#f43f5e', '#8b5cf6', '#06b6d4', '#f97316'
                            ],
                            borderWidth: 0,
                            hoverOffset: 40,
                            cutout: '80%',
                            borderRadius: 10
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { 
                            legend: { display: false },
                            tooltip: { enabled: true }
                          },
                          animation: { animateScale: true, animateRotate: true }
                        }}
                      />
                    </motion.div>
                  </div>
                  
                  {/* THE CORE SPHERE - Refined with 3D Lighting */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div 
                      className="w-32 h-32 rounded-full relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center overflow-hidden"
                      style={{
                        background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #e0e7ff 20%, #818cf8 60%, #4338ca 100%)',
                        boxShadow: 'inset -10px -10px 30px rgba(0,0,0,0.5), 0 0 40px rgba(99, 102, 241, 0.4)',
                        transform: 'translateZ(60px)'
                      }}
                    >
                      {/* Lens Flare / Specular Highlight */}
                      <div className="absolute top-[15%] left-[15%] w-8 h-6 bg-white/40 blur-[4px] rounded-full rotate-[45deg]" />
                      
                      <div className="relative z-10 flex flex-col items-center">
                        <span className="text-[11px] font-black text-white/70 uppercase tracking-widest leading-none">Global</span>
                        <span className="text-[36px] font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] leading-none my-1">
                          {deepAnalysisData?.projectLabels.length || 0}
                        </span>
                        <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-tighter opacity-80">Projects</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* External Legend - Floating Badge Style */}
              <div className="mt-12 flex flex-wrap justify-center gap-3">
                {deepAnalysisData?.projectLabels.map((label, i) => (
                  <div key={label} className="group flex items-center gap-2 bg-indigo-500/5 border border-white/5 px-4 py-2 rounded-xl transition-all hover:bg-indigo-500/20 hover:scale-110 cursor-pointer">
                    <div className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#f43f5e', '#8b5cf6', '#06b6d4', '#f97316'][i] }} />
                    <span className="text-[11px] font-black text-[var(--text-muted)] group-hover:text-indigo-400 transition-colors">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 shadow-sm h-[480px] flex flex-col">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-[12px] font-black text-[var(--text-contrast)] uppercase tracking-widest">Workload Analysis</h3>
                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mt-1">Individual Contributor Pulse</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <BarChart2 size={18} className="text-emerald-400" />
                </div>
              </div>
              <div className="flex-1">
                <Bar 
                  data={{
                    labels: deepAnalysisData?.userLabels || [],
                    datasets: [{
                      label: 'Total Tasks',
                      data: deepAnalysisData?.userCounts || [],
                      backgroundColor: 'rgba(99, 102, 241, 0.4)',
                      borderColor: '#6366f1',
                      borderWidth: 2,
                      borderRadius: 8,
                      hoverBackgroundColor: '#6366f1',
                      barThickness: 35
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { grid: { display: false }, ticks: { color: 'var(--text-muted)', font: { size: 9, weight: 'medium' }, opacity: 0.5 } },
                      y: { grid: { color: 'rgba(148, 163, 184, 0.05)', drawBorder: false }, ticks: { color: 'var(--text-muted)', font: { size: 9 }, opacity: 0.5 } }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalSpace; // updated
