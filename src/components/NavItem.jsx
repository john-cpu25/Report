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
      className={`nav-item-btn ${collapsed ? 'collapsed' : 'expanded'} ${active ? `bg-${color}-500/10 text-${color}-500 active` : ''}`}
    >
      {/* Icon - Raw 24px size to align actual ink with Logo */}
      <div className={`nav-item-icon-wrapper ${active ? `scale-110 text-${color}-500` : ''}`}>
        <Icon size={24} strokeWidth={active ? 2.5 : 2} />
      </div>

      {/* Label - Positioned below icon when collapsed (10px), side by side when expanded (14px) */}
      {!collapsed && (
        <span className="nav-item-label">
          {label}
        </span>
      )}

      {/* Count Badge - Only in expanded mode */}
      {!collapsed && count !== null && (
        <span className={`nav-item-badge ${active ? `bg-${color}-500/20 text-${color}-500` : 'inactive'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

export default NavItem
