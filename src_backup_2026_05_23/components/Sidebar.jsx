
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, 
  FolderKanban, 
  ListTodo, 
  BarChart3, 
  CalendarClock, 
  Wrench, 
  AlertCircle, 
  CheckCircle2, 
  Settings, 
  FileOutput, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  Battery,
  Network,
  User as UserIcon,
  Workflow as WorkflowIcon,
  Brain
} from 'lucide-react'
import NavItem from './NavItem'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'

const Sidebar = () => {
  const {
    sidebarCollapsed: collapsed,
    setSidebarCollapsed: setCollapsed,
    mobileSidebarOpen: mobileOpen,
    setMobileSidebarOpen: setMobileOpen,
    activeTab,
    setActiveTab
  } = useApp();

  const { isAdmin, isLeader } = useAuth();

  const mainSections = [
    {
      title: 'MAIN',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'projects', label: 'Projects', icon: FolderKanban },
        { id: 'report', label: 'Weekly Planner', icon: CalendarClock },
        { id: 'organization', label: 'Organization', icon: Network },
        { id: 'personal', label: 'Personal', icon: UserIcon },
        { id: 'leave', label: 'Annual Leave', icon: Battery },
        { id: 'issues', label: 'Issues', icon: AlertCircle },
        { id: 'workflows', label: 'Library', icon: WorkflowIcon },
      ]
    }
  ];

  const systemSection = {
    title: 'SYSTEM',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'export', label: 'Export Data', icon: FileOutput },
      // Only show Admin Panel to Admin
      ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: ShieldCheck }] : []),
    ]
  }

  const sidebarVariants = {
    expanded: { width: 260 },
    collapsed: { width: 80 }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full sys-p sys-gap">
      <div 
        className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} sys-p mb-[20px] cursor-pointer hover:opacity-80 transition-opacity`}
        onClick={() => setCollapsed(!collapsed)}
        title="Toggle Sidebar"
      >
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}rincovitch-logo.svg`} alt="Rincovitch" className="w-8 h-8" />
          {!collapsed && (
            <span className="text-[20px] font-black text-[var(--text-main)] uppercase tracking-tight">RINCOVITCH</span>
          )}
        </motion.div>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar space-y-[10px]">
        {mainSections.map((section, idx) => (
          <div key={section.title} className="space-y-[10px]">
            {!collapsed && section.title && (
              <h3 className="sys-px text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-[10px]">
                {section.title}
              </h3>
            )}
            <div className="flex flex-col gap-0">
              {section.items.map(item => (
                <NavItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={activeTab === item.id}
                  collapsed={collapsed}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (mobileOpen) setMobileOpen(false);
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* System Section at the bottom */}
      <div className="mt-auto space-y-[10px] border-t border-white/5 pt-[10px]">
        {!collapsed && (
          <h3 className="sys-px text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-[10px]">
            {systemSection.title}
          </h3>
        )}
        <div className="flex flex-col gap-0">
          {systemSection.items.map(item => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              collapsed={collapsed}
              onClick={() => {
                setActiveTab(item.id);
                if (mobileOpen) setMobileOpen(false);
              }}
            />
          ))}
        </div>
      </div>

      {!collapsed && (
        <div className="px-6 mt-8">
          <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
            <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-1">Version</p>
            <p className="text-[13px] font-bold text-[var(--text-muted)]">Intelligence v5.0.0</p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      <motion.aside
        initial={false}
        animate={collapsed ? 'collapsed' : 'expanded'}
        variants={sidebarVariants}
        className="hidden lg:block fixed left-0 top-0 h-screen bg-[var(--glass-bg)] backdrop-blur-3xl border-r border-[var(--glass-border)] z-40 overflow-hidden"
      >
        <SidebarContent />
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] lg:hidden" />
            <motion.aside initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed left-0 top-0 h-screen w-[260px] bg-[var(--bg-dark)] z-[101] lg:hidden overflow-hidden shadow-2xl">
              <div className="absolute top-6 right-6 lg:hidden">
                <button onClick={() => setMobileOpen(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default Sidebar
