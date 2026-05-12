
import React, { useState } from 'react'
import { format } from 'date-fns'
import { Layout } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import * as XLSX from 'xlsx'

// Context
import { useApp } from './context/AppContext'
import { useAuth } from './context/AuthContext'

// Components
import WeeklyReport from './WeeklyReport'
import CSVProcessor from './CSVProcessor'
import CelestialBackground from './CelestialBackground'
import Preloader from './Preloader'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import AnnualLeave from './components/AnnualLeave'
import Projects from './components/Projects'
import PerformanceReview from './components/PerformanceReview'
import Dashboard from './components/Dashboard'
import Planning from './components/Planning'
import Settings from './components/Settings'
import BambooBackground from './components/BambooBackground'
import OrgChart from './components/OrgChart'
import Workflows from './components/Workflows'
import AdminPanel from './components/AdminPanel'

function App() {
  const {
    activeTab, setActiveTab,
    theme, setTheme,
    background, setBackground,
    sidebarCollapsed, setSidebarCollapsed,
    mobileSidebarOpen, setMobileSidebarOpen,
    isSidebarOpen, setIsSidebarOpen,
    reportData, setReportData,
    selectedDate, setSelectedDate,
    allProjects,
    weekDates,
    showProjectGroups,
    formData,
    handleAddTask, deleteRow, moveRow, updateStatus, updateDayTime, updateMarkup, bulkUpdateMarkup
  } = useApp();

  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true)

  if (authLoading) return null;

  if (!user) {
    return <Login />;
  }

  const exportExcel = async () => {
    if (reportData.length === 0) return
    const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const headers = ['PROJECT', 'TASK DETAILS', 'STATUS', ...DAYS_OF_WEEK.map((d, i) => `${d.toUpperCase()} (${weekDates[i]})`)]
    const rows = reportData.map(r => [r.project, r.task, r.status, r.days.Monday || '-', r.days.Tuesday || '-', r.days.Wednesday || '-', r.days.Thursday || '-', r.days.Friday || '-'])
    const wb = XLSX.utils.book_new()
    const titleRow = [['RINCOVITCH WEEKLY REPORT - ' + weekDates[0] + ' to ' + weekDates[4]]]
    const ws = XLSX.utils.aoa_to_sheet([...titleRow, [], headers, ...rows])
    ws['!cols'] = [{ wch: 20 }, { wch: 50 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }]
    XLSX.utils.book_append_sheet(wb, ws, 'Weekly Report')
    const fileName = `Rincovitch_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <Preloader key="preloader" onLoadingComplete={() => setIsLoading(false)} />
      ) : (
        <div className="flex min-h-screen relative">
          {background === 'GALAXY' && <CelestialBackground />}
          {background === 'BAMBOO' && <BambooBackground />}
          {background === 'MINIMAL' && (
            <div className={`fixed inset-0 z-[-1] ${theme === 'GALAXY' ? 'bg-slate-950' : 'bg-slate-50'}`} />
          )}
          
          <Sidebar />

          <motion.div 
            layout initial={false}
            animate={{ marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024 ? (sidebarCollapsed ? 72 : 260) : 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex-1 min-h-screen flex flex-col w-full"
          >
            <TopBar />

            <main className="flex-grow px-4 md:px-6 lg:px-10 py-8 w-full">
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
                      <WeeklyReport exportExcel={exportExcel} />
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
                    ) : activeTab === 'organization' ? (
                      <OrgChart />
                    ) : activeTab === 'workflows' ? (
                      <Workflows />
                    ) : activeTab === 'admin' ? (
                      <AdminPanel />
                    ) : activeTab === 'settings' ? (
                      <Settings theme={theme} setTheme={setTheme} background={background} setBackground={setBackground} />
                    ) : (
                      <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <Layout size={40} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Coming Soon</h2>
                          <p className="text-indigo-400 font-black uppercase tracking-[0.4em] text-[10px] mt-2">Module: {activeTab}</p>
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
