
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
