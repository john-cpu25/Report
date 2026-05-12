
import React from 'react'
import { Menu, Bell, Search, User } from 'lucide-react'
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
    activeTab
  } = useApp();

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
          <div className="flex items-center gap-3">
             <RincovitchLogo size={36} />
             <h1 className="text-[28px] font-black text-[var(--text-main)] uppercase tracking-tighter leading-none">
               RINCOVITCH <span className="text-indigo-500">OPERATIONS</span>
             </h1>
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
