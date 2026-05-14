
import React, { useState, useRef, useEffect } from 'react'
import { Menu, Bell, Search, User, ChevronDown, FolderKanban, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import RincovitchLogo from '../RincovitchLogo'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'

const TopBar = () => {
  const { user } = useAuth();
  const {
    sidebarCollapsed, setSidebarCollapsed,
    mobileSidebarOpen, setMobileSidebarOpen,
    isSidebarOpen, setIsSidebarOpen,
    showProjectGroups, setShowProjectGroups,
    activeTab, dashboardStats, dashboardProjects, dashboardTasks
  } = useApp();

  const [dropdownOpen, setDropdownOpen] = useState(null); // 'TOTAL' or 'ACTIVE'
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
                     className="absolute top-[calc(100%+12px)] left-0 w-96 bg-[var(--bg-card)]/98 backdrop-blur-2xl border border-[var(--border)] rounded-md shadow-2xl z-50 overflow-hidden"
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
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input type="text" placeholder="GLOBAL SEARCH..." className="ocd-input pl-10 w-64 m-0" />
          </div>

          <div className="flex items-center gap-[10px]">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`px-[15px] py-[10px] rounded-[8px] text-[12px] font-black uppercase tracking-widest transition-all border ${
                isSidebarOpen 
                  ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20' 
                  : 'bg-white/5 text-slate-400 border-white/5 hover:border-indigo-500/30 hover:text-indigo-400'
              }`}
            >
              CREATE TASK
            </button>

            <button 
              onClick={() => setShowProjectGroups(!showProjectGroups)}
              className={`px-[15px] py-[10px] rounded-[8px] text-[12px] font-black uppercase tracking-widest transition-all border ${
                showProjectGroups 
                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20' 
                  : 'bg-white/5 text-slate-400 border-white/5 hover:border-emerald-500/30 hover:text-emerald-400'
              }`}
            >
              PROJECT GROUP
            </button>

            <div className="h-8 w-px bg-[var(--border)] mx-2" />

            <button className="p-[10px] rounded-[8px] hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[var(--bg-main)]" />
            </button>
            
            <div className="h-8 w-px bg-[var(--border)]" />

            <button className="flex items-center gap-[10px] p-[10px] rounded-[8px] hover:bg-white/5 transition-all group border border-transparent hover:border-[var(--border)]">
              <div className="w-10 h-10 rounded-[8px] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                <User size={20} />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[14px] font-bold text-[var(--text-main)] leading-tight">
                  {user?.name || user?.displayName || 'Authorized User'}
                </p>
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  {user?.role || user?.team || 'Operation Team'}
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
