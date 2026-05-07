import React from 'react'
import { Menu, Filter, Bell, Search, User, Plus } from 'lucide-react'
import RincovitchLogo from '../RincovitchLogo'

const TopBar = ({ 
  onMenuClick, 
  onAddTask,
  showProjectGroups, 
  onToggleProjectGroups,
  isSidebarCollapsed 
}) => {
  return (
    <header className="h-20 bg-slate-950/20 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-6">
        <button 
          onClick={onMenuClick}
          className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all active:scale-95"
        >
          <Menu size={22} />
        </button>

        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="p-2 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl group-hover:scale-110 transition-all duration-500">
            <RincovitchLogo size={28} />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-black text-white tracking-tight leading-none mb-1">
              RINCOVITCH <span className="text-indigo-400">REPORT</span>
            </h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.4em]">Intelligence System</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search - Desktop only */}
        <div className="hidden md:flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2 w-64 group focus-within:border-indigo-500/50 transition-all">
          <Search size={16} className="text-slate-500 group-focus-within:text-indigo-400" />
          <input 
            type="text" 
            placeholder="Search projects..." 
            className="bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-300 placeholder:text-slate-600 w-full"
          />
        </div>

        <button 
          onClick={onToggleProjectGroups}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 ${
            showProjectGroups 
              ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
              : 'bg-slate-900/50 border-white/10 text-slate-500 hover:text-slate-300'
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

        <div className="h-8 w-[1px] bg-white/5 mx-2 hidden sm:block" />

        <div className="flex items-center gap-3">
          <button className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all relative">
            <Bell size={20} />
            <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-950" />
          </button>
          <button className="flex items-center gap-2 p-1 pr-3 rounded-xl hover:bg-white/5 transition-all group">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
              <User size={18} />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-[10px] font-black text-white leading-none">ADMIN</p>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Superuser</p>
            </div>
          </button>
        </div>
      </div>
    </header>
  )
}

export default TopBar
