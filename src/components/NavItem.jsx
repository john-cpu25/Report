import React from 'react'
import { motion } from 'framer-motion'

const NavItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  collapsed,
  count = null,
  color = "indigo"
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative w-full flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all duration-300 group
        ${active 
          ? `bg-${color}-500/10 text-${color}-400 shadow-lg shadow-${color}-500/5` 
          : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.03]'
        }
      `}
    >
      {/* Active Indicator */}
      {active && (
        <motion.div
          layoutId="active-nav-indicator"
          className={`absolute left-0 w-1 h-6 bg-${color}-500 rounded-full`}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        />
      )}

      <div className={`
        flex items-center justify-center transition-all duration-300
        ${collapsed ? 'w-full' : 'w-6'}
        ${active ? `scale-110 text-${color}-400` : 'group-hover:scale-110 group-hover:text-slate-300'}
      `}>
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
      </div>

      {!collapsed && (
        <div className="flex-grow flex items-center justify-between overflow-hidden">
          <span className={`
            text-[13px] font-bold tracking-tight whitespace-nowrap transition-all duration-300
            ${active ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'}
          `}>
            {label}
          </span>
          {count !== null && (
            <span className={`
              text-[9px] font-black px-1.5 py-0.5 rounded-md
              ${active ? `bg-${color}-500/20 text-${color}-400` : 'bg-[var(--bg-dark)] text-[var(--text-muted)]'}
            `}>
              {count}
            </span>
          )}
        </div>
      )}

      {/* Tooltip for collapsed mode */}
      {collapsed && (
        <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-[11px] font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all pointer-events-none z-[100] shadow-2xl">
          {label}
          {count !== null && <span className="ml-2 text-indigo-400">({count})</span>}
          {/* Tooltip Arrow */}
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-white/10 rotate-45" />
        </div>
      )}
    </button>
  )
}

export default NavItem
