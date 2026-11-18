import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Context
import { useApp } from './context/AppContext'
import { useAuth } from './context/AuthContext'

// Components
import CelestialBackground from './CelestialBackground'
import Preloader from './Preloader'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import AnnualLeave from './components/AnnualLeave'
import Projects from './components/Projects'
import Dashboard from './components/Dashboard'
import Settings from './components/Settings'
import BambooBackground from './components/BambooBackground'
import Workflows from './components/Workflows'
import AdminPanel from './components/AdminPanel'
import PersonalSpace from './components/PersonalSpace'
import DrawingsManager from './components/DrawingsManager'
import DrawingTracker from './components/DrawingTracker'
import ProfileModal from './components/ProfileModal'
import SeasonalEffects from './components/SeasonalEffects'

function App() {
  const {
    activeTab, setActiveTab,
    theme, setTheme,
    background, setBackground,
    seasonalEffect, setSeasonalEffect,
    seasonalIntensity, setSeasonalIntensity,
    sidebarCollapsed, setSidebarCollapsed,
    mobileSidebarOpen, setMobileSidebarOpen,
    isSidebarOpen, setIsSidebarOpen,
    reportData, setReportData,
    selectedDate, setSelectedDate,
    allProjects,
    weekDates,
    showProjectGroups,
    formData,
    showProfileModal, setShowProfileModal,
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

  useEffect(() => {
    if (activeTab === 'report' || activeTab === 'organization') {
      setActiveTab('dashboard');
    }
  }, [activeTab, setActiveTab]);

  if (authLoading || !user) {
    return <Login />;
  }

  // Route Guard Logic
  const canAccessAdmin = isAdmin;

  const isFullViewportTab = ['personal', 'leave', 'dashboard', 'drawing-tracker'].includes(activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case 'personal': return <PersonalSpace />;
      case 'leave': return <AnnualLeave />;
      case 'projects': return <Projects />;
      case 'dashboard': return <Dashboard />;
      case 'drawing-tracker': return <DrawingTracker />;
      case 'workflows': return <Workflows />;
      case 'issues': return <DrawingsManager />;
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
        <div className={`flex ${isFullViewportTab ? 'h-screen overflow-hidden' : 'min-h-screen'} relative`}>
          {background === 'GALAXY' && <CelestialBackground />}
          {background === 'BAMBOO' && <BambooBackground />}
          {background === 'MINIMAL' && (
            <div className={`fixed inset-0 z-[-1] ${theme === 'GALAXY' ? 'bg-slate-950' : 'bg-slate-50'}`} />
          )}

          {/* Festive Seasonal Effects (Snow, Peach Blossoms, Hearts, Fireworks) */}
          <SeasonalEffects effect={seasonalEffect} intensity={seasonalIntensity} />

          <Sidebar />
          <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />

          <div
            className={`flex-1 ${isFullViewportTab ? 'h-screen overflow-hidden' : 'min-h-screen'} flex flex-col transition-all duration-300 min-w-0 relative z-[1]`}
            style={{ 
              paddingLeft: windowWidth >= 1024 
                ? (sidebarCollapsed ? '100px' : '260px') 
                : '0px' 
            }}
          >
            <TopBar />

            <main className={`flex-1 min-h-0 w-full flex flex-col ${isFullViewportTab ? 'overflow-hidden p-0' : 'p-[10px]'}`}>
              <div className={`w-full ${isFullViewportTab ? 'h-full flex-1 flex flex-col min-h-0 overflow-hidden' : ''}`}>
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    style={{ transform: 'none', transformOrigin: 'unset' }}
                    className={isFullViewportTab ? 'h-full flex-1 flex flex-col min-h-0 overflow-hidden' : ''}
                  >
                    {renderContent()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </main>

            {!isFullViewportTab && (
              <footer className="px-8 py-6 border-t border-white/5 text-center text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em]">
                &copy; 2026 APEX Southern Cross Engineering - Weekly Report Intelligence - Vietnam
              </footer>
            )}
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default App;
