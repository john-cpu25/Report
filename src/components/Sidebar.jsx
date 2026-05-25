
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
      title: '',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'projects', label: 'Projects', icon: FolderKanban },
        { id: 'report', label: 'Planner', icon: CalendarClock },
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
      // Only show Admin Panel to Admin
      ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: ShieldCheck }] : []),
    ]
  }

  const sidebarVariants = {
    expanded: { width: 260 },
    collapsed: { width: 80 }
  }

  const SidebarContent = () => (
    <div className="nav-sidebar-content">
      <div 
        className={`nav-sidebar-header ${collapsed ? 'justify-center' : 'justify-start !pl-[14px]'}`}
        onClick={() => setCollapsed(!collapsed)}
        title="Toggle Sidebar"
      >
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}rincovitch-logo.svg`} alt="Rincovitch" className="w-8 h-8" />
          {!collapsed && (
            <span className="nav-sidebar-logo-text">RINCOVITCH</span>
          )}
        </motion.div>
      </div>

      <div className="nav-sidebar-menu-list custom-scrollbar">
        {mainSections.map((section, idx) => (
          <div key={section.title} className="nav-sidebar-section">
            {!collapsed && section.title && (
              <h3 className="nav-sidebar-section-title">
                {section.title}
              </h3>
            )}
            <div className="nav-sidebar-item-group">
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
      <div className="nav-sidebar-system-section">
        {!collapsed && (
          <h3 className="nav-sidebar-section-title">
            {systemSection.title}
          </h3>
        )}
        <div className="nav-sidebar-item-group">
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

      <div className={`nav-sidebar-footer ${collapsed ? 'collapsed' : 'expanded'}`}>
        <div className={`nav-sidebar-version-box ${collapsed ? 'collapsed' : 'expanded'}`}>
          {!collapsed && <span className="nav-sidebar-version-label">Version</span>}
          <span className={`nav-sidebar-version-value ${collapsed ? 'collapsed' : 'expanded'}`}>v5.0.0</span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <motion.aside
        initial={false}
        animate={collapsed ? 'collapsed' : 'expanded'}
        variants={sidebarVariants}
        className="nav-sidebar"
      >
        <SidebarContent />
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="nav-sidebar-mobile-overlay" />
            <motion.aside initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="nav-sidebar-mobile-container">
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
