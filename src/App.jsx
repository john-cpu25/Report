import React, { useState, useEffect } from 'react'
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
import PersonalSpace from './components/PersonalSpace'

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

  const { user, loading: authLoading, isAdmin, isLeader } = useAuth();
  const [isLoading, setIsLoading] = useState(true)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Route Guard Logic
  const canAccessAnalyst = isAdmin || isLeader;
  const canAccessAdmin = isAdmin;

  const renderContent = () => {
    switch (activeTab) {
      case 'report': return <WeeklyReport exportExcel={exportExcel} />;
      case 'personal': return <PersonalSpace />;
      case 'processor': return canAccessAnalyst ? <CSVProcessor /> : <PersonalSpace />;
      case 'leave': return <AnnualLeave />;
      case 'projects': return <Projects />;
      case 'review': return canAccessAnalyst ? <PerformanceReview /> : <PersonalSpace />;
      case 'dashboard': return <Dashboard />;
      case 'planning': return <Planning reportData={reportData} weekDates={weekDates} />;
      case 'organization': return <OrgChart />;
      case 'workflows': return <Workflows />;
      case 'admin': return canAccessAdmin ? <AdminPanel /> : <PersonalSpace />;
      case 'settings': return <Settings theme={theme} setTheme={setTheme} background={background} setBackground={setBackground} />;
      default: return <Dashboard />;
    }
  };

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
            layout
            className="flex-1 min-h-screen flex flex-col transition-all duration-300 min-w-0"
            style={{ 
              paddingLeft: windowWidth >= 1024 
                ? (sidebarCollapsed ? '80px' : '260px') 
                : '0px' 
            }}
          >
            <TopBar />

            <main className="flex-grow p-[10px] w-full">
              <div className="w-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    {renderContent()}
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

export default App;
