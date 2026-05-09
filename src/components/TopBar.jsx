import React from 'react'
import { Menu, Filter, Bell, Search, User, Plus } from 'lucide-react'
import RincovitchLogo from '../RincovitchLogo'

const TopBar = ({ 
  onMenuClick, 
  onAddTask,
  showProjectGroups, 
  onToggleProjectGroups,
  isSidebarCollapsed,
  activeTab
}) => {
  return (
    <header className="h-20 bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--glass-border)] sticky top-0 z-30">
      <div className="max-w-[1600px] mx-auto h-full flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={onMenuClick}
            className="p-2 rounded-xl hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all active:scale-95"
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="p-2 bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--glass-border)] shadow-2xl group-hover:scale-110 transition-all duration-500">
              <RincovitchLogo size={28} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black text-[var(--text-main)] tracking-tight leading-none mb-1">
                RINCOVITCH <span className="text-indigo-400">REPORT</span>
              </h1>
              <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-[0.4em]">Intelligence System</p>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-[var(--glass-border)] mx-2 hidden lg:block" />

          {/* Search - Desktop only - Hidden when in Data Analyst */}
          {activeTab !== 'processor' && (
            <div className="hidden md:flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-xl px-4 py-2 w-48 group focus-within:border-indigo-500/50 transition-all">
              <Search size={16} className="text-[var(--text-muted)] group-focus-within:text-indigo-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none focus:ring-0 text-xs font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)] w-full"
              />
            </div>
          )}

          <button 
            onClick={onToggleProjectGroups}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 ${
              showProjectGroups 
                ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                : 'bg-[var(--bg-card)] border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
            title="Toggle Project Grouping"
          >
            <Filter size={16} className={showProjectGroups ? 'opacity-100' : 'opacity-70'} />
            <span className="text-[9px] font-black uppercase tracking-widest hidden lg:block">Project Groups</span>
          </button>

          <button 
            onClick={onAddTask}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">Add Task</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="h-8 w-[1px] bg-[var(--glass-border)] mx-2 hidden sm:block" />

          <div className="flex items-center gap-3">
            <button className="p-2 rounded-xl hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all relative">
              <Bell size={20} />
              <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[var(--bg-dark)]" />
            </button>
            <button className="flex items-center gap-2 p-1 pr-3 rounded-xl hover:bg-white/5 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                <User size={18} />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[10px] font-black text-[var(--text-main)] leading-none">ADMIN</p>
                <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Superuser</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default TopBar
