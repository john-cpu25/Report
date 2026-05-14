import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';
import { fetchProjects } from '../services/supabaseService';
import projectsData from '../data/projects.json';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Filter overlay in CSVProcessor
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
  const [formData, setFormData] = useState({
    project: '',
    level: '',
    showLevel: true,
    team: 'STR MODELING TEAM',
    tasks: [],
    note: '',
    day: format(new Date(), 'EEEE'),
    status: 'WIP',
    eta: '',
    etaMode: ''
  });

  // Dashboard Data States (Synced with Supabase)
  const [dashboardProjects, setDashboardProjects] = useState([]);
  const [dashboardUsers, setDashboardUsers] = useState([]);
  const [dashboardTasks, setDashboardTasks] = useState([]);
  const [dashboardLeave, setDashboardLeave] = useState([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

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
    if (savedLogs) {
      const logs = JSON.parse(savedLogs);
      const migratedLogs = logs.map(log =>
        log.status === 'PLANING' ? { ...log, status: 'PLANNING' } : log
      );
      setReportData(migratedLogs);
    }
    if (savedProjects) setCustomProjects(JSON.parse(savedProjects));

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
    let channel;
    const setupSubscription = async () => {
      const { supabase: supabaseClient } = await import('../supabaseClient');
      channel = supabaseClient
        .channel('public_dashboard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'NMK_Project' }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'NMK_Task' }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'NMK_User' }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'NMK_Leave' }, () => fetchDashboardData())
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        import('../supabaseClient').then(({ supabase: supabaseClient }) => {
          supabaseClient.removeChannel(channel);
        });
      }
    };
  }, []);

  const fetchDashboardData = async () => {
    const { supabase } = await import('../supabaseClient');
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
    setReportData(reportData.map(r => r.id === id ? { ...r, status } : r));
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
    sidebarCollapsed, setSidebarCollapsed,
    mobileSidebarOpen, setMobileSidebarOpen,
    theme, setTheme,
    background, setBackground,
    reportData, setReportData,
    customProjects, setCustomProjects,
    supabaseProjects, setSupabaseProjects,
    selectedDate, setSelectedDate,
    showProjectGroups, setShowProjectGroups,
    formData, setFormData,
    allProjects,
    weekDates,
    analystTasks, setAnalystTasks,
    analystUserMap, setAnalystUserMap,
    analystUserTeamMap, setAnalystUserTeamMap,
    lastAnalystFetch, setLastAnalystFetch,
    dashboardProjects, dashboardUsers, dashboardTasks, dashboardLeave, isDashboardLoading, dashboardStats, fetchDashboardData,
    handleAddTask, deleteRow, moveRow, updateStatus, updateDayTime, updateMarkup, bulkUpdateMarkup
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
