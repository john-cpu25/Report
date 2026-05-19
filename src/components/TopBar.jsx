
import React, { useState, useRef, useEffect } from 'react'
import { Menu, Bell, Search, User, ChevronDown, FolderKanban, CheckCircle2, Clipboard, Check, AlertTriangle, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import RincovitchLogo from '../RincovitchLogo'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import AvatarWithFrame from './AvatarWithFrame'

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
    adminActiveTeam, setAdminActiveTeam
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
    <header className="h-[80px] bg-[var(--bg-main)]/80 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-30 px-[10px]">
      <div className="h-full max-w-full mx-auto flex items-center justify-between gap-[10px]">
        <div className="flex items-center gap-[10px]">
          <button onClick={handleMenuClick} className="p-[10px] rounded-[8px] hover:bg-white/5 text-[var(--text-muted)] lg:hidden">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <RincovitchLogo size={36} />
               <h1 className="text-[28px] font-black text-[var(--text-main)] uppercase tracking-tighter leading-none">
                 RINCOVITCH
               </h1>
             </div>

             {/* Dynamic Stats Header with Dropdowns */}
             <div className="hidden xl:flex items-center gap-12 ml-10 relative" ref={dropdownRef}>
               {/* Total Projects */}
               <div 
                 className="flex flex-col cursor-pointer group/stat select-none"
                 onClick={() => setDropdownOpen(dropdownOpen === 'TOTAL' ? null : 'TOTAL')}
               >
                 <div className="flex items-center gap-2 mb-2.5">
                   <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] leading-none group-hover/stat:text-indigo-400 transition-colors">Total Projects</p>
                   <ChevronDown size={10} className={`text-[var(--text-muted)] transition-transform duration-300 ${dropdownOpen === 'TOTAL' ? 'rotate-180 text-indigo-400' : ''}`} />
                 </div>
                 <div className="flex items-center gap-3">
                   <span className="text-xl font-black text-[var(--text-main)] leading-none tracking-tighter group-hover/stat:text-indigo-300 transition-colors">{dashboardStats.totalProjects}</span>
                 </div>
               </div>

               {/* Active Projects */}
               <div 
                 className="flex flex-col cursor-pointer group/stat select-none"
                 onClick={() => setDropdownOpen(dropdownOpen === 'ACTIVE' ? null : 'ACTIVE')}
               >
                 <div className="flex items-center gap-2 mb-2.5">
                   <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] leading-none group-hover/stat:text-emerald-400 transition-colors">Active Projects</p>
                   <ChevronDown size={10} className={`text-[var(--text-muted)] transition-transform duration-300 ${dropdownOpen === 'ACTIVE' ? 'rotate-180 text-emerald-400' : ''}`} />
                 </div>
                 <div className="flex items-center gap-3">
                   <span className="text-xl font-black text-emerald-500 leading-none tracking-tighter group-hover/stat:text-emerald-400 transition-colors">{dashboardStats.activeProjects}</span>
                 </div>
               </div>

               {/* Dropdown Menu */}
               <AnimatePresence>
                 {dropdownOpen && (
                   <motion.div
                     initial={{ opacity: 0, y: 10, scale: 0.99 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 10, scale: 0.99 }}
                     className="absolute top-[calc(100%+28px)] left-0 w-96 bg-[var(--bg-card)]/98 backdrop-blur-2xl border border-[var(--border)] rounded-md shadow-2xl z-50 overflow-hidden"
                   >
                     <div className="px-5 py-4 pt-5 border-b border-[var(--border)] bg-white/5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-[0.25em]">
                            {dropdownOpen === 'TOTAL' ? 'Project Portfolio' : 'Active Operations'}
                          </h3>
                          <span className="text-[9px] font-black text-[var(--text-muted)] bg-white/5 px-2.5 py-1 rounded border border-[var(--border)]">
                            {dropdownOpen === 'TOTAL' ? dashboardProjects.length : activeProjectsList.length} UNITS
                          </span>
                        </div>
                     </div>
                     <div className="max-h-[380px] overflow-y-auto custom-scrollbar p-1.5">
                        {(dropdownOpen === 'TOTAL' ? dashboardProjects : activeProjectsList).map((p, idx) => (
                          <div 
                            key={p.id || idx} 
                            className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition-all group/item cursor-default mb-0.5"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-7 h-7 rounded flex items-center justify-center ${dropdownOpen === 'TOTAL' ? 'bg-indigo-500/5 text-indigo-400' : 'bg-emerald-500/5 text-emerald-400'} border border-white/5`}>
                                <FolderKanban size={13} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-[var(--text-main)] group-hover/item:text-indigo-300 transition-colors uppercase tracking-tight leading-tight">{p.name}</span>
                                <span className="text-[8px] font-medium text-[var(--text-muted)] uppercase tracking-widest mt-0.5">{p.key || 'RIN-PROJ'}</span>
                              </div>
                            </div>
                            {activeProjectIds.has(p.id) && (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                <span className="text-[7px] font-black text-emerald-500 uppercase">Live</span>
                              </div>
                            )}
                          </div>
                        ))}
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-[10px]">
          {activeTab === 'report' && (
            <>
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                <input type="text" placeholder="GLOBAL SEARCH..." className="ocd-input pl-10 w-64 m-0" />
              </div>

              <div className="flex items-center gap-[10px]">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className={`neu-button neu-pill px-6 py-2.5 text-[11px] ${isSidebarOpen ? 'active text-indigo-500' : ''}`}
                >
                  CREATE TASK
                </button>

                <button 
                  onClick={() => setShowProjectGroups(!showProjectGroups)}
                  className={`neu-button neu-pill px-6 py-2.5 text-[11px] ${showProjectGroups ? 'active text-emerald-500' : ''}`}
                >
                  PROJECT GROUP
                </button>
              </div>
            </>
          )}

          <div className="flex items-center gap-[10px]">

            {activeTab === 'dashboard' && isAdmin && (
              <div className="flex items-center gap-2 mr-2 shrink-0">
                {/* ADMIN / TEAM SWITCHER */}
                <div className="flex items-center bg-[var(--bg-surface)]/60 p-0.5 rounded-xl border border-[var(--border)] shadow-[inset_1px_1px_4px_rgba(0,0,0,0.05)]">
                  <button
                    onClick={() => setAdminViewMode('GLOBAL')}
                    className={`w-14 h-6 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 flex items-center justify-center ${
                      adminViewMode === 'GLOBAL'
                        ? 'bg-[var(--bg-surface)] text-indigo-500 shadow-[1px_1px_3px_rgba(0,0,0,0.1)] dark:shadow-[1px_1px_3px_rgba(255,255,255,0.05)] scale-[0.98]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    ADMIN
                  </button>
                  <button
                    onClick={() => setAdminViewMode('TEAM')}
                    className={`w-14 h-6 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 flex items-center justify-center ${
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
                  <div className="flex items-center bg-[var(--bg-surface)]/30 p-0.5 rounded-xl border border-[var(--border)]">
                    <div className="flex gap-1 p-0.5">
                      {[
                        { id: 'MODELLING', display: 'SM' },
                        { id: 'PT&REO', display: 'PR' },
                        { id: 'ENGINEER', display: 'SE' },
                        { id: 'ETABS', display: 'LE' }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setAdminActiveTeam(t.id)}
                          className={`w-8 h-6 text-[9px] font-black uppercase rounded-lg transition-all duration-200 flex items-center justify-center ${
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

            {/* Real-time Interactive Bell Dropdown Popover */}
            <div className="relative" ref={bellRef}>
              <button 
                onClick={() => setBellOpen(!bellOpen)}
                className={`p-[10px] rounded-[8px] hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all relative ${bellOpen ? 'bg-white/10 text-[var(--text-main)]' : ''}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[var(--bg-main)] shadow-lg shadow-rose-500/20 px-1 animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {bellOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.99 }}
                    className="absolute right-0 top-[calc(100%+28px)] bg-[var(--bg-card)]/98 backdrop-blur-2xl border border-[var(--border)] rounded-[8px] shadow-2xl z-50 overflow-hidden"
                    style={{ width: '600px', maxWidth: 'calc(100vw - 20px)' }}
                  >
                    <div className="px-5 py-4 pt-5 border-b border-[var(--border)] bg-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell size={14} className="text-indigo-400" />
                        <h3 className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-[0.25em]">Thông Báo</h3>
                      </div>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead} 
                          className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded hover:bg-indigo-500/20 transition-all"
                        >
                          Đọc tất cả
                        </button>
                      )}
                    </div>
                    
                    {/* Segmented Filter Control */}
                    <div className="px-5 py-2.5 border-b border-[var(--border)] flex gap-2 bg-[var(--bg-surface)]">
                      {['all', 'unread'].map(f => (
                        <button
                          key={f}
                          onClick={() => setNotifFilter(f)}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                            notifFilter === f 
                              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/10' 
                              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          {f === 'all' ? 'Tất cả' : `Chưa đọc (${unreadCount})`}
                        </button>
                      ))}
                    </div>

                    <div className="max-h-[700px] overflow-y-auto custom-scrollbar p-1.5">
                      {filteredNotifs.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-40">
                          Không có thông báo mới
                        </div>
                      ) : (
                        filteredNotifs.map((n, idx) => {
                          const senderUser = dashboardUsers?.find(u => u.email?.toLowerCase() === n.sender?.toLowerCase() || u.name?.toLowerCase() === n.senderName?.toLowerCase());
                          const avatarImg = senderUser?.image || null;
                          const isUnread = !n.is_read;

                          return (
                            <div 
                              key={n.id || idx} 
                              onClick={() => handleNotifClick(n)}
                              className={`flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--bg-surface)] transition-all cursor-pointer mb-1 border border-transparent ${isUnread ? 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/10 dark:border-indigo-500/20' : ''}`}
                            >
                              {/* Sender Avatar with Type Badge Overlay */}
                              <div className="relative shrink-0 mt-0.5">
                                <AvatarWithFrame 
                                  user={senderUser || { name: n.senderName || 'H' }} 
                                  sizeClass="w-9 h-9" 
                                  borderClass="border border-indigo-500/20"
                                />
                                <div className={`absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md border-2 border-[var(--bg-card)] ${
                                  n.type === 'TASK_ASSIGNED' ? 'bg-blue-500' :
                                  n.type === 'TASK_COMPLETED' ? 'bg-emerald-500' :
                                  n.type === 'TASK_INTERRUPTED' ? 'bg-rose-500' :
                                  n.type === 'LEAVE_REQUESTED' ? 'bg-orange-500' : 'bg-slate-500'
                                }`}>
                                  {n.type === 'TASK_ASSIGNED' && <Clipboard size={9} />}
                                  {n.type === 'TASK_COMPLETED' && <Check size={9} />}
                                  {n.type === 'TASK_INTERRUPTED' && <AlertTriangle size={9} />}
                                  {n.type === 'LEAVE_REQUESTED' && <Calendar size={9} />}
                                  {n.type !== 'TASK_ASSIGNED' && n.type !== 'TASK_COMPLETED' && n.type !== 'TASK_INTERRUPTED' && n.type !== 'LEAVE_REQUESTED' && <Bell size={9} />}
                                </div>
                              </div>

                              <div className="flex-grow min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-[11px] font-black text-[var(--text-main)] tracking-wide uppercase leading-none">{n.title}</span>
                                  <span className="text-[9px] font-bold text-slate-500 whitespace-nowrap shrink-0">{formatRelativeTime(n.created_at)}</span>
                                </div>
                                <p className="text-[11px] font-medium text-[var(--text-muted)] leading-relaxed tracking-normal break-words">
                                  {formatContent(n.content)}
                                </p>
                              </div>

                              {isUnread && (
                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 self-center shrink-0 ml-1 animate-pulse" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="h-8 w-px bg-[var(--border)]" />

            <button 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-[10px] p-[10px] rounded-[8px] hover:bg-white/5 transition-all group border border-transparent hover:border-[var(--border)]"
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
                  {user?.team || user?.role || 'Operation Team'}
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
