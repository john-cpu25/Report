import React, { useState, useRef, useEffect } from 'react'
import { Menu, Bell, Search, User, ChevronDown, FolderKanban, CheckCircle2, Clipboard, Check, AlertTriangle, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import RincovitchLogo from '../RincovitchLogo'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import AvatarWithFrame from './AvatarWithFrame'
import NeumorphicSearch from './buttons/NeumorphicSearch';
import NeumorphicWeeklySwitcher from './buttons/NeumorphicWeeklySwitcher';

const TopBar = () => {
  const { user, isAdmin } = useAuth();
  const {
    sidebarCollapsed, setSidebarCollapsed,
    mobileSidebarOpen, setMobileSidebarOpen,
    isSidebarOpen, setIsSidebarOpen,
    showProjectGroups, setShowProjectGroups,
    activeTab, setActiveTab, dashboardStats, dashboardProjects, dashboardTasks, dashboardUsers,
    setShowProfileModal,
    adminViewMode, setAdminViewMode,
    adminActiveTeam, setAdminActiveTeam,
    reportData,
    weeklyViewMode, setWeeklyViewMode,
    triggerWeeklyExpand, setTriggerWeeklyExpand,
    triggerWeeklyCollapse, setTriggerWeeklyCollapse
  } = useApp();

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(null); // 'TOTAL' or 'ACTIVE'
  const dropdownRef = useRef(null);

  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);
  const [notifFilter, setNotifFilter] = useState('all');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(null);
      }
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredNotifs = notifications.filter(n => notifFilter === 'all' ? true : !n.is_read);

  const formatContent = (text) => {
    if (!text) return '';
    const parts = text.split('**');
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-[var(--text-main)] font-black inline">{part}</strong> : part);
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return '';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
  };

  const handleNotifClick = (notif) => {
    markAsRead(notif.id);
    setBellOpen(false);
    if (notif.link) {
      const params = new URLSearchParams(notif.link);
      const tab = params.get('tab');
      if (tab) {
        setActiveTab(tab);
      }
    }
  };

  const activeProjectIds = new Set(dashboardTasks.map(t => t.project_id));
  const activeProjectsList = dashboardProjects.filter(p => activeProjectIds.has(p.id));

  const handleMenuClick = () => {
    if (window.innerWidth < 1024) {
      setMobileSidebarOpen(true);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <header className="nav-topbar">
      <div className="nav-topbar-inner">
        <div className="flex items-center sys-gap">
          <button onClick={handleMenuClick} className="sys-p rounded-[8px] hover:bg-white/5 text-[var(--text-muted)] lg:hidden">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-6">
             {activeTab !== 'dashboard' && (
               <h1 className="nav-topbar-title">
                 {activeTab === 'projects' ? 'PROJECT' : activeTab === 'report' ? 'PLANNER' : activeTab.replace('-', ' ').toUpperCase()}
               </h1>
             )}

             {/* Dynamic Stats Header with Dropdowns - On Dashboard and Projects */}
             {(activeTab === 'dashboard' || activeTab === 'projects') && (
             <div className="hidden xl:flex items-center gap-12 ml-10 relative" ref={dropdownRef}>
               {/* Total Projects */}
               <div 
                 className="flex flex-col cursor-pointer group/stat select-none"
                 onClick={() => setDropdownOpen(dropdownOpen === 'TOTAL' ? null : 'TOTAL')}
               >
                 <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1 group-hover/stat:text-indigo-400 transition-colors">
                   TOTAL PROJECTS <ChevronDown size={12} className={`transition-transform duration-300 ${dropdownOpen === 'TOTAL' ? 'rotate-180 text-indigo-400' : ''}`} />
                 </div>
                 <div className="text-[28px] font-black text-[var(--text-main)] leading-none mt-1 group-hover/stat:text-indigo-300 transition-colors">
                   {dashboardStats.totalProjects}
                 </div>
               </div>

               {/* Active Projects */}
               <div 
                 className="flex flex-col cursor-pointer group/stat select-none"
                 onClick={() => setDropdownOpen(dropdownOpen === 'ACTIVE' ? null : 'ACTIVE')}
               >
                 <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1 group-hover/stat:text-emerald-400 transition-colors">
                   ACTIVE PROJECTS <ChevronDown size={12} className={`transition-transform duration-300 ${dropdownOpen === 'ACTIVE' ? 'rotate-180 text-emerald-400' : ''}`} />
                 </div>
                 <div className="text-[28px] font-black text-emerald-500 leading-none mt-1 group-hover/stat:text-emerald-400 transition-colors">
                   {dashboardStats.activeProjects}
                 </div>
               </div>

               {/* Dropdown Menu */}
               <AnimatePresence>
                 {dropdownOpen && (
                   <motion.div
                     initial={{ opacity: 0, y: 10, scale: 0.99 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 10, scale: 0.99 }}
                     className="absolute top-[calc(100%+28px)] left-0 w-96 bg-[var(--bg-card)]/95 backdrop-blur-2xl border border-[var(--glass-border)] rounded-lg shadow-xl z-50 overflow-hidden"
                   >
                     <div className="px-5 py-4 pt-5 border-b border-[var(--border)] bg-white/5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[14px] font-black text-[var(--text-main)] uppercase">
                            {dropdownOpen === 'TOTAL' ? 'Project Portfolio' : 'Active Operations'}
                          </h3>
                          <span className="text-[14px] font-black text-[var(--text-muted)] bg-white/5 px-2.5 py-1 rounded border border-[var(--border)]">
                            {dropdownOpen === 'TOTAL' ? dashboardProjects.length : activeProjectsList.length} UNITS
                          </span>
                        </div>
                     </div>
                     <div className="max-h-[380px] overflow-y-auto custom-scrollbar sys-p">
                        {(dropdownOpen === 'TOTAL' ? dashboardProjects : activeProjectsList).map((p, idx) => (
                          <div 
                            key={p.id || idx} 
                            className="relative flex items-center justify-between rounded-lg hover:bg-white/5 transition-all group/item cursor-default mb-0.5 overflow-hidden"
                            style={{ padding: '8px 10px 8px 10px' }}
                          >
                            <div className="flex items-center">
                              {/* Dot slides in from left on hover */}
                              <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-300 ease-out opacity-0 -translate-x-4 group-hover/item:translate-x-2.5 group-hover/item:opacity-100 ${dropdownOpen === 'TOTAL' ? 'bg-indigo-400' : 'bg-emerald-400'}`}></span>
                              
                              {/* Text slides slightly right to accommodate the dot */}
                              <div className="flex flex-col transition-all duration-300 ease-out translate-x-0 group-hover/item:translate-x-3.5">
                                <span className="text-[14px] font-bold text-[var(--text-main)] group-hover/item:text-indigo-300 transition-colors uppercase tracking-tight leading-tight">{p.name}</span>
                                <span className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-widest mt-0.5">{p.key || 'RIN-PROJ'}</span>
                              </div>
                            </div>
                            {activeProjectIds.has(p.id) && (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span className="text-[12px] font-black text-emerald-500 uppercase">Live</span>
                              </div>
                            )}
                          </div>
                        ))}
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
             )}
          </div>
        </div>

        <div className="flex items-center sys-gap">
          {activeTab === 'report' && (
            <div className="flex items-center gap-[10px]">
              {/* EX and CO Buttons */}
              {showProjectGroups && weeklyViewMode === 'list' && (
                <div className="neu-inset rounded-[12px] p-1 flex gap-1">
                  <button onClick={() => setTriggerWeeklyExpand(prev => prev + 1)} className="neu-button px-4 py-1 text-[11px] font-black uppercase rounded-[8px]">EX</button>
                  <button onClick={() => setTriggerWeeklyCollapse(prev => prev + 1)} className="neu-button px-4 py-1 text-[11px] font-black uppercase rounded-[8px]">CO</button>
                </div>
              )}
              
              {/* View Switcher (List/Gantt) */}
              <NeumorphicWeeklySwitcher viewMode={weeklyViewMode} setViewMode={setWeeklyViewMode} />

              {/* Project Group Toggle */}
              {weeklyViewMode === 'list' && (
                <button
                  onClick={() => setShowProjectGroups(!showProjectGroups)}
                  className={`neumorphic-switcher-btn ${showProjectGroups ? 'active text-emerald-500' : ''}`}
                  title="Toggle Project Group"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12l10 5 10-5" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  </svg>
                </button>
              )}
            </div>
          )}

          <div className="flex items-center sys-gap">

            {activeTab === 'dashboard' && isAdmin && (
              <div className="flex items-center gap-2 mr-2 shrink-0">
                {/* ADMIN / TEAM SWITCHER */}
                <div className="flex items-center bg-[var(--bg-surface)]/60 p-1 rounded-2xl border border-[var(--border)] shadow-[inset_1px_1px_4px_rgba(0,0,0,0.05)]">
                  <button
                    onClick={() => setAdminViewMode('GLOBAL')}
                    className={`w-16 h-8 text-[12px] font-black uppercase rounded-xl transition-all duration-300 flex items-center justify-center ${
                      adminViewMode === 'GLOBAL'
                        ? 'bg-[var(--bg-surface)] text-indigo-500 shadow-[1px_1px_3px_rgba(0,0,0,0.1)] dark:shadow-[1px_1px_3px_rgba(255,255,255,0.05)] scale-[0.98]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    ADMIN
                  </button>
                  <button
                    onClick={() => setAdminViewMode('TEAM')}
                    className={`w-16 h-8 text-[12px] font-black uppercase rounded-xl transition-all duration-300 flex items-center justify-center ${
                      adminViewMode === 'TEAM'
                        ? 'bg-[var(--bg-surface)] text-indigo-500 shadow-[1px_1px_3px_rgba(0,0,0,0.1)] dark:shadow-[1px_1px_3px_rgba(255,255,255,0.05)] scale-[0.98]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    TEAM
                  </button>
                </div>

                {/* SM / PR / SE / LE SWITCHER (Shown when TEAM mode is active) */}
                {adminViewMode === 'TEAM' && (
                  <div className="flex items-center bg-[var(--bg-surface)]/30 p-1 rounded-2xl border border-[var(--border)]">
                    <div className="flex gap-1">
                      {[
                        { id: 'MODELLING', display: 'SM' },
                        { id: 'PT&REO', display: 'PR' },
                        { id: 'ENGINEER', display: 'SE' },
                        { id: 'ETABS', display: 'LE' }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setAdminActiveTeam(t.id)}
                          className={`w-10 h-8 text-[12px] font-black uppercase rounded-xl transition-all duration-200 flex items-center justify-center ${
                            adminActiveTeam === t.id
                              ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          {t.display}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}



            <button 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center sys-gap sys-p rounded-[8px] hover:bg-white/5 transition-all group border border-transparent hover:border-[var(--border)]"
            >
              <AvatarWithFrame 
                user={user} 
                sizeClass="w-10 h-10" 
                borderClass="border border-indigo-500/20 group-hover:border-indigo-500/40 transition-all shadow-sm"
              />
              <div className="text-left hidden sm:block">
                <p className="text-[14px] font-bold text-[var(--text-main)] leading-tight">
                  {user?.name || user?.displayName || 'Authorized User'}
                </p>
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  {user?.position || user?.role || 'Engineer'}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default TopBar
