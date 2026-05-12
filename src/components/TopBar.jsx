
import React from 'react'
import { Menu, Filter, Bell, Search, User, Plus } from 'lucide-react'
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
    <header className="h-20 bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--border)] sticky top-0 z-30 transition-all duration-500">
      <div className="w-full h-full flex items-center justify-between px-8">
        <div className="flex items-center gap-8">
          <button 
            onClick={handleMenuClick}
            className="p-2.5 rounded-xl hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all active:scale-95"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="p-2.5 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-sm group-hover:scale-105 transition-all duration-300">
              <RincovitchLogo size={30} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-[1.25rem] font-extrabold text-[var(--text-main)] tracking-tight leading-tight">
                RINCOVITCH <span className="text-indigo-500">REPORT</span>
              </h1>
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em] opacity-80">Intelligence System</p>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-[var(--border)] mx-2 hidden lg:block" />

          {/* Search Bar - Refined UX */}
          {activeTab !== 'processor' && (
            <div className="hidden md:flex items-center gap-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-5 py-2.5 w-64 group focus-within:border-indigo-500/50 transition-all shadow-sm">
              <Search size={18} className="text-[var(--text-muted)] group-focus-within:text-indigo-500" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="bg-transparent border-none focus:ring-0 text-sm font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] w-full"
              />
            </div>
          )}

          <button 
            onClick={() => setShowProjectGroups(!showProjectGroups)}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border font-semibold transition-all duration-300 ${
              showProjectGroups 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Filter size={16} />
            <span className="text-[11px] uppercase tracking-wider hidden lg:block">Project Groups</span>
          </button>

          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all active:scale-95 font-bold"
          >
            <Plus size={18} strokeWidth={3} />
            <span className="text-[11px] uppercase tracking-wider hidden sm:block">Add Task</span>
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="h-8 w-[1px] bg-[var(--border)] hidden sm:block" />

          <div className="flex items-center gap-4">
            <button className="p-2.5 rounded-xl hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[var(--bg-main)]" />
            </button>
            
            <button className="flex items-center gap-3.5 p-1 pr-4 rounded-2xl hover:bg-white/5 transition-all group border border-transparent hover:border-[var(--border)]">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                <User size={20} />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[13px] font-bold text-[var(--text-main)] leading-tight">
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
