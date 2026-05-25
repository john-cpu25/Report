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
    const savedProjects = localStorage.getItem('customProjects');
    if (savedProjects) {
      try {
        setCustomProjects(JSON.parse(savedProjects));
      } catch (e) {
        // ignore
      }
    } else {
      const requiredProjects = ['DLD', 'MEL02', 'MAC', 'RIVER TERRACE', 'CW2', 'CW3', 'MORAY', 'LEEDS', 'FGWB'];
      setCustomProjects(requiredProjects);
      localStorage.setItem('customProjects', JSON.stringify(requiredProjects));
    }

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
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'NMK_Project' }, fetchSupabaseProjects)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'NMK_Task' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'NMK_User' }, fetchDashboardData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchDashboardData() {
    setIsDashboardLoading(true);
    try {
      const [projRes, userRes, taskRes, leaveRes] = await Promise.all([
        supabase.from('NMK_Project').select('*'),
        supabase.from('NMK_User').select('*'),
        supabase.from('NMK_Task').select('*').order('created_at', { ascending: false }).limit(1500),
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

  

  useEffect(() => {
    localStorage.setItem('customProjects', JSON.stringify(customProjects));
  }, [customProjects]);

  // Data Manipulation Functions
  
  const handleAddTask = async (e, batchTasks = null, batchOverrides = null) => {
    if (e) e.preventDefault();
    const targetProject = batchOverrides?.project || formData.project;
    if (!targetProject) return;

    try {
      const tasksToAdd = batchTasks || (formData.tasks.length > 0 ? [formData.tasks.join(' ')] : ['']);
      const inserts = [];
      tasksToAdd.forEach(taskText => {
        const useBatchLevel = batchOverrides !== null;
        const levelEnabled = useBatchLevel ? !!batchOverrides.level : formData.showLevel;
        const levelValue = useBatchLevel ? batchOverrides.level : formData.level;
        if (!useBatchLevel && levelEnabled && !levelValue) return;

        let taskName = (levelEnabled && levelValue) ? `LEVEL ${levelValue}` : '';
        if (taskText) taskName += (taskName ? ' ' : '') + taskText;
        if (!useBatchLevel && formData.note) taskName += (taskName ? ' ' : '') + formData.note;
        if (!taskName) taskName = '(no detail)';
        
        inserts.push({
           project_id: targetProject, // Assuming targetProject is the ID or we should find the ID
           name: taskName,
           status: formData.status || 'WIP',
           team: formData.team || 'CIVIL'
        });
      });
      if (inserts.length > 0) {
        const p = dashboardProjects.find(p => p.key === targetProject || p.name === targetProject);
        if (p) {
          inserts.forEach(i => i.project_id = p.id);
        }
        await supabase.from('NMK_Task').insert(inserts);
      }
    } catch (err) {
      console.error(err);
    }
    
    if (!batchOverrides) {
      setFormData(prev => ({ ...prev, project: '', level: '', tasks: [], note: '', eta: '' }));
    }
  };
const deleteRow = async (id) => { await supabase.from("NMK_Task").delete().eq("id", id); };

  const moveRow = () => {};

  const updateDayTime = () => {};

  const updateStatus = async (id, status) => {
    try {
      await supabase.from('NMK_Task').update({ status }).eq('id', id);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const updateMarkup = () => {};

  const bulkUpdateMarkup = () => {};

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
  const reportData = useMemo(() => {
    if (!dashboardTasks || dashboardTasks.length === 0) return [];
    
    // Get start and end of weekDates
    const [d1, m1, y1] = weekDates[0].split('/');
    const weekStart = new Date(y1, m1 - 1, d1, 0, 0, 0);
    const [d2, m2, y2] = weekDates[4].split('/');
    const weekEnd = new Date(y2, m2 - 1, d2, 23, 59, 59);

    const projectMap = {};
    dashboardProjects.forEach(p => {
      projectMap[p.id] = (p.key || p.name || 'UNKNOWN').toUpperCase();
    });

    const userMap = {};
    dashboardUsers.forEach(u => {
      if (u.email) userMap[u.email.toLowerCase()] = u;
      if (u.id) userMap[u.id] = u;
    });

    const isSameDayFn = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

    const mapped = dashboardTasks.filter(t => {
      let rStart = t.date_start;
      let rEnd = t.date_end;
      
      if (!rStart || !rEnd || rStart === '-' || rEnd === '-') {
        const fallback = new Date(t.created_at || Date.now());
        return fallback >= weekStart && fallback <= weekEnd;
      }
      
      const startD = new Date(rStart);
      const endD = new Date(rEnd);
      if (isNaN(startD.getTime()) || isNaN(endD.getTime())) return false;
      
      return startD <= weekEnd && endD >= weekStart;
    }).map(t => {
      const projectKey = projectMap[t.project_id] || 'UNKNOWN';
      let team = 'CIVIL';
      if (t.create_by) {
        const creator = userMap[t.create_by] || userMap[String(t.create_by).toLowerCase()];
        if (creator && creator.team) team = creator.team.toUpperCase();
      }

      let rStart = t.date_start;
      let rEnd = t.date_end;
      if (!rStart || !rEnd || rStart === '-' || rEnd === '-') {
        rStart = t.created_at;
        rEnd = t.created_at;
      }
      const startD = new Date(rStart);
      const endD = new Date(rEnd);

      const days = { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '' };
      
      weekDates.forEach((dateStr, idx) => {
        const [d, m, y] = dateStr.split('/');
        const colDate = new Date(y, m - 1, d, 12, 0, 0); // Noon for safe comparison
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        
        startD.setHours(0,0,0,0);
        endD.setHours(23,59,59,999);
        
        if (colDate >= startD && colDate <= endD) {
          days[dayNames[idx]] = '100%';
        }
      });

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
    
    return mapped;
  }, [dashboardTasks, dashboardProjects, dashboardUsers, weekDates]);


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
    reportData,
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
    
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
