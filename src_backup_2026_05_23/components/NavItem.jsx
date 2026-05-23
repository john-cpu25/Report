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
          ? 'w-[60px] h-[60px] sys-p mx-auto' 
          : 'w-full h-[40px] flex-row sys-gap sys-px sys-py'
        }
        rounded-[8px] mb-[10px]
        ${active 
          ? `bg-${color}-500/10 text-${color}-500` 
          : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--glass-border)]'
        }
      `}
    >
      {/* Icon - Always centered in collapsed, left in expanded */}
      <div className={`
        flex items-center justify-center transition-all duration-300
        ${collapsed ? 'w-full h-full' : 'w-[20px] h-[20px]'}
        ${active ? `scale-110 text-${color}-500` : 'group-hover:scale-110 group-hover:text-[var(--text-main)]'}
      `}>
        <Icon size={collapsed ? 28 : 18} strokeWidth={active ? 2.5 : 2} />
      </div>

      {/* Label - Positioned below icon when collapsed (10px), side by side when expanded (14px) */}
      {!collapsed && (
        <span className={`
          font-bold tracking-tight whitespace-nowrap transition-all duration-300
          text-[14px] flex-grow text-left
          ${active ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'}
        `}>
          {label}
        </span>
      )}

      {/* Count Badge - Only in expanded mode */}
      {!collapsed && count !== null && (
        <span className={`
          text-[9px] font-black px-1.5 py-0.5 rounded-[4px]
          ${active ? `bg-${color}-500/20 text-${color}-500` : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}
        `}>
          {count}
        </span>
      )}
    </button>
  )
}

export default NavItem
