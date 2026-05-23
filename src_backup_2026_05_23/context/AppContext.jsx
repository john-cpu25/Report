import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';
import { fetchProjects, fetchTemporaryTasks } from '../services/supabaseService';
import projectsData from '../data/projects.json';
import { useNotifications } from './NotificationContext';
import { supabase } from '../supabaseClient';

const DEFAULT_WEEKLY_PLANNER_TASKS = [
  {
    id: 1779075000001,
    project: 'DLD',
    team: 'CIVIL',
    task: 'LEVEL 5 TO LEVEL 10',
    status: 'WIP',
    markupDate: null,
    markupTime: null,
    days: { Monday: '17:30', Tuesday: '', Wednesday: '', Thursday: '', Friday: '' }
  },
  {
    id: 1779075000002,
    project: 'DLD',
    team: 'CIVIL',
    task: 'LEVEL 11 TO LEVEL 17',
    status: 'WIP',
    markupDate: null,
    markupTime: null,
    days: { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '17:30' }
  },
  {
    id: 1779075000003,
    project: 'MEL02',
    team: 'CIVIL',
    task: 'LEVEL 4 (UPDATING)',
    status: 'WIP',
    markupDate: null,
    markupTime: null,
    days: { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '' }
  },
  {
    id: 1779075000004,
    project: 'MAC',
    team: 'CIVIL',
    task: 'LEVEL 1 TO ROOF:',
    status: 'WIP',
    markupDate: null,
    markupTime: null,
    days: { Monday: '16:30', Tuesday: '', Wednesday: '', Thursday: '', Friday: '' }
  },
  {
    id: 1779075000005,
    project: 'RIVER TERRACE',
    team: 'CIVIL',
    task: 'LEVEL 7 - TYPICAL REO',
    status: 'WIP',
    markupDate: null,
    markupTime: null,
    days: { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '' }
  },
  {
    id: 1779075000006,
    project: 'RIVER TERRACE',
    team: 'CIVIL',
    task: 'LEVEL 17 - TYPICAL REO',
    status: 'WIP',
    markupDate: null,
    markupTime: null,
    days: { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '' }
  },
  {
    id: 1779075000007,
    project: 'RIVER TERRACE',
    team: 'CIVIL',
    task: 'PT MARKUP',
    status: 'WIP',
    markupDate: null,
    markupTime: null,
    days: { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '' }
  },
  {
    id: 1779075000008,
    project: 'CW2',
    team: 'CIVIL',
    task: 'LEVEL – MARKUP (MAYBE)',
    status: 'WIP',
    markupDate: null,
    markupTime: null,
    days: { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '' }
  },
  {
    id: 1779075000009,
    project: 'CW3',
    team: 'CIVIL',
    task: 'LEVEL – MARKUP (MAYBE)',
    status: 'WIP',
    markupDate: null,
    markupTime: null,
    days: { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '' }
  },
  {
    id: 1779075000010,
    project: 'MORAY',
    team: 'CIVIL',
    task: 'LEVEL – MARKUP (MAYBE)',
    status: 'WIP',
    markupDate: null,
    markupTime: null,
    days: { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '' }
  },
  {
    id: 1779075000011,
    project: 'LEEDS',
    team: 'CIVIL',
    task: 'L3 TO RF – AB BACK DRAFTING',
    status: 'WIP',
    markupDate: null,
    markupTime: null,
    days: { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '' }
  },
  {
    id: 1779075000012,
    project: 'LEEDS',
    team: 'CIVIL',
    task: 'L3 TO RF – CD BACK DRAFTING',
    status: 'WIP',
    markupDate: null,
    markupTime: null,
    days: { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '' }
  },
  {
    id: 1779075000013,
    project: 'FGWB',
    team: 'CIVIL',
    task: 'PT MARKUP',
    status: 'WIP',
    markupDate: '2026-05-20',
    markupTime: null,
    days: { Monday: '', Tuesday: '', Wednesday: '17:30', Thursday: '', Friday: '' }
  }
];

const mapDbTasksToPlanner = (dbTasks, dbProjects, dbUsers) => {
  const projectMap = {};
  dbProjects.forEach(p => {
    projectMap[p.id] = (p.key || p.name || 'UNKNOWN').toUpperCase();
  });

  const userMap = {};
  dbUsers.forEach(u => {
    if (u.email) {
      userMap[u.email.toLowerCase()] = u;
    }
  });

  return dbTasks.map(t => {
    const projectKey = projectMap[t.project_id] || 'UNKNOWN';
    let team = 'CIVIL';
    if (t.create_by) {
      const creatorEmail = t.create_by.toLowerCase();
      if (userMap[creatorEmail] && userMap[creatorEmail].team) {
        team = userMap[creatorEmail].team.toUpperCase();
      }
    }

    const days = { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '' };
    if (t.time && !t.time.startsWith('0001-01-01')) {
      const date = new Date(t.time);
      if (!isNaN(date.getTime())) {
        // Shift to GMT+7 (Vietnam time) and use UTC getters to ensure browser timezone independence
        const vnDate = new Date(date.getTime() + 7 * 3600000);
        const hours = String(vnDate.getUTCHours()).padStart(2, '0');
        const minutes = String(vnDate.getUTCMinutes()).padStart(2, '0');
        const timeFormatted = `${hours}:${minutes}`;
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = daysOfWeek[vnDate.getUTCDay()];
        if (days.hasOwnProperty(dayName)) {
          days[dayName] = timeFormatted;
        }
      }
    }

    return {
      id: t.id,
      project: projectKey,
      team,
      task: t.name || '(no detail)',
      status: t.status || 'WIP',
      markupDate: null,
      markupTime: null,
      days
    };
  });
};

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { sendNotification } = useNotifications();
  const isAdminMode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('admin_mode') === 'true' : false;

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Filter overlay in CSVProcessor
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Theme States
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('appTheme') || 'GALAXY';
  });
  const [background, setBackground] = useState(() => {
    return localStorage.getItem('appBackground') || (theme === 'GALAXY' ? 'GALAXY' : 'BAMBOO');
  });

  // Data States
  const [reportData, setReportData] = useState([]);
  const [customProjects, setCustomProjects] = useState([]);
  const [supabaseProjects, setSupabaseProjects] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showProjectGroups, setShowProjectGroups] = useState(true);
  const [weeklyViewMode, setWeeklyViewMode] = useState('list');
  const [triggerWeeklyExpand, setTriggerWeeklyExpand] = useState(0);
  const [triggerWeeklyCollapse, setTriggerWeeklyCollapse] = useState(0);
  const [formData, setFormData] = useState({
    project: '',
    level: '',
    showLevel: true,
    team: 'CIVIL',
    tasks: [],
    note: '',
    day: 'Monday',
    status: 'WIP',
    eta: '',
    etaMode: ''
  });

  // Global Dashboard & Admin Analytics Data
  const [dashboardProjects, setDashboardProjects] = useState([]);
  const [dashboardUsers, setDashboardUsers] = useState([]);
  const [dashboardTasks, setDashboardTasks] = useState([]);
  const [dashboardLeave, setDashboardLeave] = useState([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [projectsCache, setProjectsCache] = useState(null);
  const [adminViewMode, setAdminViewMode] = useState('GLOBAL');
  const [adminActiveTeam, setAdminActiveTeam] = useState('MODELLING');

  // Data Analyst Persistence States
  const [analystTasks, setAnalystTasks] = useState([]);
  const [analystUserMap, setAnalystUserMap] = useState({});
  const [analystUserTeamMap, setAnalystUserTeamMap] = useState({});
  const [lastAnalystFetch, setLastAnalystFetch] = useState(null);

  // Effects for Persistance
  useEffect(() => {
    localStorage.setItem('appTheme', theme);
    document.body.className = `theme-${theme.toLowerCase()}`;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('appBackground', background);
  }, [background]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    try {
      const date = parseISO(selectedDate);
      const dayName = format(date, 'EEEE');
      setFormData(prev => ({ ...prev, day: dayName }));
    } catch (e) {
      console.error('Invalid date');
    }
  }, [selectedDate]);

  // Initial Data Load
  useEffect(() => {
    const savedLogs = localStorage.getItem('weeklyReportData');
    const savedProjects = localStorage.getItem('customProjects');
    
    const initData = async () => {
      if (savedLogs && JSON.parse(savedLogs).length > 0) {
        const logs = JSON.parse(savedLogs);
        const migratedLogs = logs.map(log =>
          log.status === 'PLANING' ? { ...log, status: 'PLANNING' } : log
        );
        setReportData(migratedLogs);
      } else {
        try {
          const [dbTasks, dbProjectsRes, dbUsersRes] = await Promise.all([
            fetchTemporaryTasks(),
            supabase.from('NMK_Project').select('id, name, key'),
            supabase.from('NMK_User').select('id, email, name, team')
          ]);

          const dbProjects = dbProjectsRes.data || [];
          const dbUsers = dbUsersRes.data || [];
          const mappedTasks = mapDbTasksToPlanner(dbTasks, dbProjects, dbUsers);

          if (mappedTasks.length > 0) {
            setReportData(mappedTasks);
            localStorage.setItem('weeklyReportData', JSON.stringify(mappedTasks));
            
            const mappedProjectKeys = Array.from(new Set(mappedTasks.map(t => t.project).filter(Boolean)));
            const requiredProjects = ['DLD', 'MEL02', 'MAC', 'RIVER TERRACE', 'CW2', 'CW3', 'MORAY', 'LEEDS', 'FGWB'];
            const updatedCustom = Array.from(new Set([...(savedProjects ? JSON.parse(savedProjects) : []), ...requiredProjects, ...mappedProjectKeys]));
            setCustomProjects(updatedCustom);
            localStorage.setItem('customProjects', JSON.stringify(updatedCustom));
          } else {
            setReportData(DEFAULT_WEEKLY_PLANNER_TASKS);
            localStorage.setItem('weeklyReportData', JSON.stringify(DEFAULT_WEEKLY_PLANNER_TASKS));
            
            const requiredProjects = ['DLD', 'MEL02', 'MAC', 'RIVER TERRACE', 'CW2', 'CW3', 'MORAY', 'LEEDS', 'FGWB'];
            const updatedCustom = Array.from(new Set([...(savedProjects ? JSON.parse(savedProjects) : []), ...requiredProjects]));
            setCustomProjects(updatedCustom);
            localStorage.setItem('customProjects', JSON.stringify(updatedCustom));
          }
        } catch (err) {
          console.error('Failed to auto-seed from Supabase on load, using defaults:', err);
          setReportData(DEFAULT_WEEKLY_PLANNER_TASKS);
          localStorage.setItem('weeklyReportData', JSON.stringify(DEFAULT_WEEKLY_PLANNER_TASKS));
          
          const requiredProjects = ['DLD', 'MEL02', 'MAC', 'RIVER TERRACE', 'CW2', 'CW3', 'MORAY', 'LEEDS', 'FGWB'];
          const updatedCustom = Array.from(new Set([...(savedProjects ? JSON.parse(savedProjects) : []), ...requiredProjects]));
          setCustomProjects(updatedCustom);
          localStorage.setItem('customProjects', JSON.stringify(updatedCustom));
        }
      }
    };
    initData();

    const fetchSupabaseProjects = async () => {
      try {
        const data = await fetchProjects();
        if (data) {
          const keys = data.map(p => (p.key || p.name).toUpperCase()).filter(Boolean);
          setSupabaseProjects(keys);
        }
      } catch (err) {
        console.error('Failed to fetch Supabase projects:', err);
      }
    };
    fetchSupabaseProjects();
    fetchDashboardData();
    
    // Subscribe to changes
    const channel = supabase
      .channel('public_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'NMK_Project' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'NMK_Task' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'NMK_User' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'NMK_Leave' }, () => fetchDashboardData())
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const fetchDashboardData = async () => {
    setIsDashboardLoading(true);
    try {
      const [projRes, userRes, taskRes, leaveRes] = await Promise.all([
        supabase.from('NMK_Project').select('*'),
        supabase.from('NMK_User').select('*'),
        supabase.from('NMK_Task').select('*').order('created_at', { ascending: false }),
        supabase.from('NMK_Leave').select('*')
      ]);
      setDashboardProjects(projRes.data || []);
      setDashboardUsers(userRes.data || []);
      setDashboardTasks(taskRes.data || []);
      setDashboardLeave(leaveRes.data || []);
    } catch (err) {
      console.error('Dashboard Fetch Error:', err);
    } finally {
      setIsDashboardLoading(false);
    }
  };

  const seedPlannerData = async () => {
    try {
      const [dbTasks, dbProjectsRes, dbUsersRes] = await Promise.all([
        fetchTemporaryTasks(),
        supabase.from('NMK_Project').select('id, name, key'),
        supabase.from('NMK_User').select('id, email, name, team')
      ]);

      const dbProjects = dbProjectsRes.data || [];
      const dbUsers = dbUsersRes.data || [];

      const mappedTasks = mapDbTasksToPlanner(dbTasks, dbProjects, dbUsers);

      setReportData(mappedTasks);
      localStorage.setItem('weeklyReportData', JSON.stringify(mappedTasks));

      const mappedProjectKeys = Array.from(new Set(mappedTasks.map(t => t.project).filter(Boolean)));
      const requiredProjects = ['DLD', 'MEL02', 'MAC', 'RIVER TERRACE', 'CW2', 'CW3', 'MORAY', 'LEEDS', 'FGWB'];
      const updatedCustom = Array.from(new Set([...customProjects, ...requiredProjects, ...mappedProjectKeys]));
      setCustomProjects(updatedCustom);
      localStorage.setItem('customProjects', JSON.stringify(updatedCustom));

      sendNotification({
        recipient: 'admin@bypass.local',
        sender: 'system',
        senderName: 'Hệ thống',
        type: 'SYSTEM',
        title: 'Đồng bộ Weekly Planner thành công 📋',
        content: `Đã đồng bộ thành công ${mappedTasks.length} nhiệm vụ từ cơ sở dữ liệu Supabase.`,
        link: '?tab=weekly'
      });
    } catch (err) {
      console.error('Failed to seed Weekly Planner from Supabase:', err);
      sendNotification({
        recipient: 'admin@bypass.local',
        sender: 'system',
        senderName: 'Hệ thống',
        type: 'SYSTEM',
        title: 'Đồng bộ Weekly Planner thất bại ❌',
        content: `Lỗi: ${err.message || 'Không xác định'}.`,
        link: '?tab=weekly'
      });
    }
  };

  // Save data on change
  useEffect(() => {
    localStorage.setItem('weeklyReportData', JSON.stringify(reportData));
  }, [reportData]);

  useEffect(() => {
    localStorage.setItem('customProjects', JSON.stringify(customProjects));
  }, [customProjects]);

  // Data Manipulation Functions
  const handleAddTask = (e, batchTasks = null, batchOverrides = null) => {
    if (e) e.preventDefault();
    const targetProject = batchOverrides?.project || formData.project;
    if (!targetProject) return;

    const newReportData = [...reportData];
    let dataChanged = false;

    if (batchOverrides?.isDirectBatch) {
      batchTasks.forEach(taskObj => {
        const taskWithProject = { ...taskObj, project: taskObj.projectId };
        delete taskWithProject.projectId;
        const existingIndex = newReportData.findIndex(
          (r) => r.project === taskWithProject.project && r.task === taskWithProject.task && r.team === taskWithProject.team
        );
        if (existingIndex > -1) Object.assign(newReportData[existingIndex], taskWithProject);
        else newReportData.push(taskWithProject);
      });
      dataChanged = true;
    } else {
      const tasksToAdd = batchTasks || (formData.tasks.length > 0 ? [formData.tasks.join(' ')] : ['']);
      tasksToAdd.forEach(taskText => {
        const useBatchLevel = batchOverrides !== null;
        const levelEnabled = useBatchLevel ? !!batchOverrides.level : formData.showLevel;
        const levelValue = useBatchLevel ? batchOverrides.level : formData.level;
        if (!useBatchLevel && levelEnabled && !levelValue) return;

        let taskName = (levelEnabled && levelValue) ? `LEVEL ${levelValue}` : '';
        if (taskText) taskName += (taskName ? ' ' : '') + taskText;
        if (!useBatchLevel && formData.note) taskName += (taskName ? ' ' : '') + formData.note;
        if (!taskName) taskName = '(no detail)';

        const existingIndex = newReportData.findIndex(
          (r) => r.project === targetProject && r.task === taskName && r.team === formData.team
        );
        if (existingIndex > -1) {
          newReportData[existingIndex].days[formData.day] = formData.eta;
          newReportData[existingIndex].status = formData.status;
          dataChanged = true;

          // Trigger local notification in bypass mode
          if (isAdminMode) {
            sendNotification({
              recipient: 'admin@bypass.local',
              sender: 'system',
              senderName: 'Hệ thống',
              type: 'TASK_ASSIGNED',
              title: 'Cập nhật tiến độ nhiệm vụ 🎯',
              content: `Bạn vừa cập nhật tiến độ cho nhiệm vụ **"${taskName}"** trong dự án **"${targetProject}"**.`,
              link: '?tab=personal'
            });
          }
        } else {
          newReportData.push({
            id: Date.now() + Math.random(),
            project: targetProject,
            team: formData.team,
            task: taskName,
            status: formData.status,
            markupDate: null,
            markupTime: null,
            days: { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '', ...{ [formData.day]: formData.eta } }
          });
          dataChanged = true;

          // Trigger local notification in bypass mode
          if (isAdminMode) {
            sendNotification({
              recipient: 'admin@bypass.local',
              sender: 'system',
              senderName: 'Hệ thống',
              type: 'TASK_ASSIGNED',
              title: 'Nhiệm vụ mới được giao 🎯',
              content: `Bạn vừa gán nhiệm vụ mới **"${taskName}"** trong dự án **"${targetProject}"** cho bản thân.`,
              link: '?tab=personal'
            });
          }
        }
      });
    }
    if (dataChanged) setReportData(newReportData);
    if (!batchOverrides) {
      setFormData(prev => ({ ...prev, project: '', level: '', tasks: [], note: '', eta: '' }));
    }
  };

  const deleteRow = (id) => setReportData(reportData.filter(r => r.id !== id));

  const moveRow = (id, dir) => {
    const idx = reportData.findIndex(r => r.id === id);
    if (idx === -1) return;
    const ni = idx + dir;
    if (ni < 0 || ni >= reportData.length) return;
    const newData = [...reportData];
    ;[newData[idx], newData[ni]] = [newData[ni], newData[idx]];
    setReportData(newData);
  };

  const updateDayTime = (id, day, value) => {
    setReportData(reportData.map(r => r.id === id ? { ...r, days: { ...r.days, [day]: value } } : r));
  };

  const updateStatus = (id, status) => {
    const task = reportData.find(r => r.id === id);
    setReportData(reportData.map(r => r.id === id ? { ...r, status } : r));

    // Trigger local notification in bypass mode
    if (isAdminMode && task) {
      if (status === 'DONE') {
        sendNotification({
          recipient: 'admin@bypass.local',
          sender: 'admin@bypass.local',
          senderName: 'Super Admin',
          type: 'TASK_COMPLETED',
          title: 'Nhiệm vụ hoàn thành 🎉',
          content: `Bạn đã báo cáo HOÀN THÀNH nhiệm vụ **"${task.task}"** thuộc dự án **"${task.project}"**.`,
          link: '?tab=personal'
        });
      } else if (status === 'ISSUE') {
        sendNotification({
          recipient: 'admin@bypass.local',
          sender: 'admin@bypass.local',
          senderName: 'Super Admin',
          type: 'TASK_INTERRUPTED',
          title: 'Nhiệm vụ bị gián đoạn 🚨',
          content: `Bạn đã báo cáo GIÁN ĐOẠN nhiệm vụ **"${task.task}"** thuộc dự án **"${task.project}"**.`,
          link: '?tab=personal'
        });
      } else {
        sendNotification({
          recipient: 'admin@bypass.local',
          sender: 'admin@bypass.local',
          senderName: 'Super Admin',
          type: 'SYSTEM',
          title: 'Trạng thái thay đổi ⚙️',
          content: `Nhiệm vụ **"${task.task}"** đã chuyển trạng thái sang **${status}**.`,
          link: '?tab=personal'
        });
      }
    }
  };

  const updateMarkup = (id, { date, time }) => {
    setReportData(reportData.map(r => r.id === id ? { ...r, markupDate: date, markupTime: time } : r));
  };

  const bulkUpdateMarkup = (ids, { date, time }) => {
    setReportData(reportData.map(r => ids.includes(r.id) ? { ...r, markupDate: date, markupTime: time } : r));
  };

  // Derived States
  const allProjects = useMemo(() => {
    return Array.from(new Set([...supabaseProjects, ...customProjects])).sort();
  }, [supabaseProjects, customProjects]);

  const weekDates = useMemo(() => {
    const date = parseISO(selectedDate);
    const monday = startOfWeek(date, { weekStartsOn: 1 });
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((_, i) =>
      format(addDays(monday, i), 'dd/MM/yyyy')
    );
  }, [selectedDate]);

  const dashboardStats = useMemo(() => {
    const activeProjectIds = new Set(dashboardTasks.map(t => t.project_id));
    return {
      totalProjects: dashboardProjects.length,
      activeProjects: activeProjectIds.size,
      totalUsers: dashboardUsers.length,
      totalTasks: dashboardTasks.length
    };
  }, [dashboardProjects, dashboardTasks, dashboardUsers]);

  const value = {
    activeTab, setActiveTab,
    isSidebarOpen, setIsSidebarOpen,
    showProfileModal, setShowProfileModal,
    sidebarCollapsed, setSidebarCollapsed,
    mobileSidebarOpen, setMobileSidebarOpen,
    theme, setTheme,
    background, setBackground,
    reportData, setReportData,
    customProjects, setCustomProjects,
    supabaseProjects, setSupabaseProjects,
    selectedDate, setSelectedDate,
    showProjectGroups, setShowProjectGroups,
    weeklyViewMode, setWeeklyViewMode,
    triggerWeeklyExpand, setTriggerWeeklyExpand,
    triggerWeeklyCollapse, setTriggerWeeklyCollapse,
    formData, setFormData,
    allProjects,
    weekDates,
    analystTasks, setAnalystTasks,
    analystUserMap, setAnalystUserMap,
    analystUserTeamMap, setAnalystUserTeamMap,
    lastAnalystFetch, setLastAnalystFetch,
    dashboardProjects, dashboardUsers, dashboardTasks, dashboardLeave, isDashboardLoading, dashboardStats, fetchDashboardData,
    projectsCache, setProjectsCache,
    adminViewMode, setAdminViewMode,
    adminActiveTeam, setAdminActiveTeam,
    handleAddTask, deleteRow, moveRow, updateStatus, updateDayTime, updateMarkup, bulkUpdateMarkup,
    seedPlannerData
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
