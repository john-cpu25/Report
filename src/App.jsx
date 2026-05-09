import React, { useState, useEffect, useMemo } from 'react'
import { format, startOfWeek, addDays, parseISO } from 'date-fns'
import { Layout } from 'lucide-react'
import * as XLSX from 'xlsx'
import { motion, AnimatePresence } from 'framer-motion'
import WeeklyReport from './WeeklyReport'
import CSVProcessor from './CSVProcessor'
import projectsData from './data/projects.json'
import CelestialBackground from './CelestialBackground'
import Preloader from './Preloader'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import AnnualLeave from './components/AnnualLeave'
import Projects from './components/Projects'
import PerformanceReview from './components/PerformanceReview'
import Dashboard from './components/Dashboard'
import Planning from './components/Planning'
import Settings from './components/Settings'
import BambooBackground from './components/BambooBackground'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('appTheme') || 'GALAXY'
  })

  useEffect(() => {
    localStorage.setItem('appTheme', theme)
    document.body.className = `theme-${theme.toLowerCase()}`
  }, [theme])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved !== null ? JSON.parse(saved) : false
  })
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  // Auto-collapse sidebar on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setSidebarCollapsed(true)
      } else {
        setSidebarCollapsed(false)
      }
    }
    window.addEventListener('resize', handleResize)
    handleResize() // Run on mount
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [isLoading, setIsLoading] = useState(true)
  const [reportData, setReportData] = useState([])
  const [customProjects, setCustomProjects] = useState([])
  const [supabaseProjects, setSupabaseProjects] = useState([])
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // Load data
  useEffect(() => {
    const savedLogs = localStorage.getItem('weeklyReportData')
    const savedProjects = localStorage.getItem('customProjects')
    if (savedLogs) {
      const logs = JSON.parse(savedLogs)
      // Migration: Convert PLANING to PLANNING
      const migratedLogs = logs.map(log => 
        log.status === 'PLANING' ? { ...log, status: 'PLANNING' } : log
      )
      setReportData(migratedLogs)
    }
    if (savedProjects) setCustomProjects(JSON.parse(savedProjects))

    const fetchSupabaseProjects = async () => {
      try {
        const { data, error } = await import('./supabaseClient').then(m => m.supabase.from('NMK_Project').select('name, key').order('key'));
        if (error) throw error;
        if (data) {
          const keys = data.map(p => (p.key || p.name).toUpperCase()).filter(Boolean);
          setSupabaseProjects(keys);
        }
      } catch (err) {
        console.error('Failed to fetch Supabase projects:', err);
      }
    };
    fetchSupabaseProjects();
  }, [])

  const allProjects = useMemo(() => {
    return Array.from(new Set([...supabaseProjects, ...customProjects])).sort()
  }, [supabaseProjects, customProjects])

  // Save data
  useEffect(() => {
    localStorage.setItem('weeklyReportData', JSON.stringify(reportData))
  }, [reportData])

  useEffect(() => {
    localStorage.setItem('customProjects', JSON.stringify(customProjects))
  }, [customProjects])

  const addCustomProject = (name) => {
    if (!name || customProjects.includes(name) || projectsData.includes(name)) return
    setCustomProjects(prev => [...prev, name])
  }

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
    etaMode: '', // '', '12:30', '17:30', 'CUSTOM', 'OVERTIME'
    showProjectGroups: true
  })

  // Auto-update day when date changes
  useEffect(() => {
    try {
      const date = parseISO(selectedDate)
      const dayName = format(date, 'EEEE')
      setFormData(prev => ({ ...prev, day: dayName }))
    } catch (e) {
      console.error('Invalid date')
    }
  }, [selectedDate])

  // Calculate week dates
  const weekDates = useMemo(() => {
    const date = parseISO(selectedDate)
    const monday = startOfWeek(date, { weekStartsOn: 1 })
    return DAYS_OF_WEEK.map((_, i) => format(addDays(monday, i), 'dd/MM/yyyy'))
  }, [selectedDate])

  const handleAddTask = (e, batchTasks = null, batchOverrides = null) => {
    if (e) e.preventDefault()
    
    const targetProject = batchOverrides?.project || formData.project
    if (!targetProject) return
    
    const tasksToAdd = batchTasks || (formData.tasks.length > 0 ? [formData.tasks.join(' ')] : [''])

    const newReportData = [...reportData]
    let dataChanged = false

    if (batchOverrides?.isDirectBatch) {
      // Direct injection from Batch Engine
      batchTasks.forEach(taskObj => {
        // Map projectId to project for consistency with existing state
        const taskWithProject = { ...taskObj, project: taskObj.projectId };
        delete taskWithProject.projectId;
        
        const existingIndex = newReportData.findIndex(
          (r) => r.project === taskWithProject.project && r.task === taskWithProject.task && r.team === taskWithProject.team
        )

        if (existingIndex > -1) {
          Object.assign(newReportData[existingIndex], taskWithProject);
        } else {
          newReportData.push(taskWithProject);
        }
      });
      dataChanged = true;
    } else {
      const tasksToAdd = batchTasks || (formData.tasks.length > 0 ? [formData.tasks.join(' ')] : [''])

      tasksToAdd.forEach(taskText => {
        // For batch overrides, level is already baked into the override
        const useBatchLevel = batchOverrides !== null
        const levelEnabled = useBatchLevel ? !!batchOverrides.level : formData.showLevel
        const levelValue = useBatchLevel ? batchOverrides.level : formData.level

        if (!useBatchLevel && levelEnabled && !levelValue) return

        let taskName = ''
        if (levelEnabled && levelValue) {
          taskName = `LEVEL ${levelValue}`
        }
        
        if (taskText) {
          taskName += (taskName ? ' ' : '') + taskText
        }

        if (!useBatchLevel && formData.note) {
          taskName += (taskName ? ' ' : '') + formData.note
        }
        if (!taskName) taskName = '(no detail)'

        const existingIndex = newReportData.findIndex(
          (r) => r.project === targetProject && r.task === taskName && r.team === formData.team
        )

        if (existingIndex > -1) {
          newReportData[existingIndex].days[formData.day] = formData.eta
          newReportData[existingIndex].status = formData.status
          dataChanged = true
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
          })
          dataChanged = true
        }
      })
    }

    if (dataChanged) {
      setReportData(newReportData)
    }

    // Only reset sidebar form if not a batch override call
    if (!batchOverrides) {
      setFormData(prev => ({
        ...prev,
        project: '',
        level: '',
        tasks: [],
        note: '',
        eta: ''
      }))
    }
  }

  const deleteRow = (id) => setReportData(reportData.filter(r => r.id !== id))
  
  const moveRow = (id, dir) => {
    const idx = reportData.findIndex(r => r.id === id)
    if (idx === -1) return
    const ni = idx + dir
    if (ni < 0 || ni >= reportData.length) return
    const newData = [...reportData]
    ;[newData[idx], newData[ni]] = [newData[ni], newData[idx]]
    setReportData(newData)
  }

  const updateDayTime = (id, day, value) => {
    setReportData(reportData.map(r => 
      r.id === id ? { ...r, days: { ...r.days, [day]: value } } : r
    ))
  }

  const updateStatus = (id, status) => {
    setReportData(reportData.map(r => r.id === id ? { ...r, status } : r))
  }

  const updateMarkup = (id, { date, time }) => {
    setReportData(reportData.map(r => 
      r.id === id ? { ...r, markupDate: date, markupTime: time } : r
    ))
  }

  const bulkUpdateMarkup = (ids, { date, time }) => {
    setReportData(reportData.map(r => 
      ids.includes(r.id) ? { ...r, markupDate: date, markupTime: time } : r
    ))
  }

  const exportExcel = async () => {
    if (reportData.length === 0) return
    
    // Create header row with dates
    const headers = ['PROJECT', 'TASK DETAILS', 'STATUS', ...DAYS_OF_WEEK.map((d, i) => `${d.toUpperCase()} (${weekDates[i]})`)]
    
    // Create data rows
    const rows = reportData.map(r => [
      r.project, 
      r.task, 
      r.status, 
      r.days.Monday || '-', 
      r.days.Tuesday || '-', 
      r.days.Wednesday || '-', 
      r.days.Thursday || '-', 
      r.days.Friday || '-'
    ])

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    
    // Add a title row
    const titleRow = [['RINCOVITCH WEEKLY REPORT - ' + weekDates[0] + ' to ' + weekDates[4]]]
    const ws = XLSX.utils.aoa_to_sheet([...titleRow, [], headers, ...rows])

    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // Project
      { wch: 50 }, // Task Details
      { wch: 12 }, // Status
      { wch: 18 }, // Monday
      { wch: 18 }, // Tuesday
      { wch: 18 }, // Wednesday
      { wch: 18 }, // Thursday
      { wch: 18 }  // Friday
    ]

    // Merge title cells
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } } // Merge title across all columns
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Weekly Report')
    
    const fileName = `Rincovitch_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`

    // Advanced "Save As" if supported by browser (Chrome, Edge, etc.)
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Excel Files',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
          }],
        })
        const writable = await handle.createWritable()
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        await writable.write(excelBuffer)
        await writable.close()
      } catch (err) {
        // Fallback to standard download if user cancels or error occurs
        if (err.name !== 'AbortError') {
          XLSX.writeFile(wb, fileName)
        }
      }
    } else {
      // Fallback for browsers that don't support showSaveFilePicker
      XLSX.writeFile(wb, fileName)
    }
  }

return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <Preloader key="preloader" onLoadingComplete={() => setIsLoading(false)} />
      ) : (
        <div className="flex min-h-screen relative">
          {theme === 'GALAXY' ? <CelestialBackground /> : <BambooBackground />}
          
          <Sidebar 
            collapsed={sidebarCollapsed} 
            setCollapsed={setSidebarCollapsed}
            mobileOpen={mobileSidebarOpen}
            setMobileOpen={setMobileSidebarOpen}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          <motion.div 
            layout
            initial={false}
            animate={{ 
              marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024 
                ? (sidebarCollapsed ? 72 : 260) 
                : 0 
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="min-h-screen flex flex-col"
          >
            <TopBar 
              onMenuClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileSidebarOpen(true)
                } else {
                  setSidebarCollapsed(!sidebarCollapsed)
                }
              }}
              onAddTask={() => setIsSidebarOpen(!isSidebarOpen)}
              showProjectGroups={formData.showProjectGroups}
              onToggleProjectGroups={() => setFormData(prev => ({ ...prev, showProjectGroups: !prev.showProjectGroups }))}
              isSidebarCollapsed={sidebarCollapsed}
              activeTab={activeTab}
            />

            <main className="flex-grow p-4 md:p-6 lg:p-8">
              <div className="w-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    {activeTab === 'report' ? (
                      <WeeklyReport 
                        reportData={reportData} setReportData={setReportData}
                        selectedDate={selectedDate} setSelectedDate={setSelectedDate}
                        weekDates={weekDates} formData={formData} setFormData={setFormData}
                        handleAddTask={handleAddTask} deleteRow={deleteRow} moveRow={moveRow}
                        updateStatus={updateStatus} updateDayTime={updateDayTime}
                        updateMarkup={updateMarkup} bulkUpdateMarkup={bulkUpdateMarkup}
                        customProjects={customProjects} addCustomProject={addCustomProject}
                        allProjects={allProjects}
                        exportExcel={exportExcel} isSidebarOpen={isSidebarOpen}
                        setIsSidebarOpen={setIsSidebarOpen}
                        sidebarCollapsed={sidebarCollapsed}
                      />
                    ) : activeTab === 'processor' ? (
                      <CSVProcessor />
                    ) : activeTab === 'leave' ? (
                      <AnnualLeave />
                    ) : activeTab === 'projects' ? (
                      <Projects />
                    ) : activeTab === 'review' ? (
                      <PerformanceReview />
                    ) : activeTab === 'dashboard' ? (
                      <Dashboard />
                    ) : activeTab === 'planning' ? (
                      <Planning reportData={reportData} weekDates={weekDates} />
                    ) : activeTab === 'settings' ? (
                      <Settings theme={theme} setTheme={setTheme} />
                    ) : (
                      <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <Layout size={40} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Coming Soon</h2>
                          <p className="text-slate-500 font-bold text-sm mt-2">This module is under development.</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </main>

            <footer className="px-8 py-6 border-t border-white/5 text-center text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em]">
              &copy; 2026 Rincovitch - Weekly Report Intelligence - Vietnam
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default App
