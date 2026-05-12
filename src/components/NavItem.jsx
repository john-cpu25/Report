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
        relative transition-all duration-300 group flex items-center justify-center
        ${collapsed 
          ? 'w-[80px] h-[80px] flex-col gap-[10px] p-[10px] mx-auto' 
          : 'w-full h-[40px] flex-row gap-[10px] px-[10px] py-[10px]'
        }
        rounded-[8px] mb-[10px]
        ${active 
          ? `bg-${color}-500/10 text-${color}-400 shadow-lg shadow-${color}-500/5 border border-${color}-500/20` 
          : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.05]'
        }
      `}
    >
      {/* Icon - Always centered in collapsed, left in expanded */}
      <div className={`
        flex items-center justify-center transition-all duration-300
        ${collapsed ? 'w-full h-full' : 'w-[20px] h-[20px]'}
        ${active ? `scale-110 text-${color}-400` : 'group-hover:scale-110 group-hover:text-slate-200'}
      `}>
        <Icon size={collapsed ? 40 : 18} strokeWidth={active ? 2.5 : 2} />
      </div>

      {/* Label - Positioned below icon when collapsed (10px), side by side when expanded (14px) */}
      <span className={`
        font-bold tracking-tight whitespace-nowrap transition-all duration-300
        ${collapsed 
          ? 'text-[10px] uppercase tracking-wider' 
          : 'text-[14px] flex-grow text-left'
        }
        ${active ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'}
      `}>
        {label}
      </span>

      {/* Count Badge - Only in expanded mode */}
      {!collapsed && count !== null && (
        <span className={`
          text-[9px] font-black px-1.5 py-0.5 rounded-[4px]
          ${active ? `bg-${color}-500/20 text-${color}-400` : 'bg-[var(--bg-dark)] text-[var(--text-muted)]'}
        `}>
          {count}
        </span>
      )}
    </button>
  )
}

export default NavItem
