
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
  Workflow as WorkflowIcon
} from 'lucide-react'
import NavItem from './NavItem'
import { useApp } from '../context/AppContext'

const Sidebar = () => {
  const {
    sidebarCollapsed: collapsed,
    setSidebarCollapsed: setCollapsed,
    mobileSidebarOpen: mobileOpen,
    setMobileSidebarOpen: setMobileOpen,
    activeTab,
    setActiveTab
  } = useApp();

  const sections = [
    {
      title: 'MAIN',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'projects', label: 'Projects', icon: FolderKanban },
        { id: 'organization', label: 'Organization', icon: Network },
        { id: 'report', label: 'Weekly Planner', icon: CalendarClock },
        { id: 'processor', label: 'Data Analyst', icon: BarChart3 },
        { id: 'leave', label: 'Annual Leave', icon: Battery },
      ]
    },
    {
      title: 'WORKFLOW',
      items: [
        { id: 'planning', label: 'Planning', icon: ListTodo },
        { id: 'wip', label: 'Work In Progress', icon: Wrench },
        { id: 'issues', label: 'Issues', icon: AlertCircle },
        { id: 'review', label: 'Review', icon: CheckCircle2 },
        { id: 'workflows', label: 'Procedures', icon: WorkflowIcon },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'export', label: 'Export Data', icon: FileOutput },
        { id: 'admin', label: 'Admin Panel', icon: ShieldCheck },
      ]
    }
  ]

  const sidebarVariants = {
    expanded: { width: 260 },
    collapsed: { width: 72 }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full py-6">
      <div className={`px-4 mb-8 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-indigo-500 rounded-full" />
            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Navigation</span>
          </motion.div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar px-3 space-y-8 pb-20">
        {sections.map((section, idx) => (
          <div key={section.title} className="space-y-2">
            {!collapsed && (
              <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 text-[9px] font-black text-[var(--text-muted)] opacity-60 uppercase tracking-[0.2em] mb-2">
                {section.title}
              </motion.h3>
            )}
            <div className="space-y-1">
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
            {idx < sections.length - 1 && !collapsed && (
              <div className="mx-3 h-[1px] bg-white/[0.03] mt-6" />
            )}
          </div>
        ))}
      </div>

      {!collapsed && (
        <div className="px-6 mt-8">
          <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Version</p>
            <p className="text-[11px] font-bold text-[var(--text-muted)]">Intelligence v4.7.0</p>
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
