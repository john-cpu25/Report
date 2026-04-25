import React from 'react'

const RincovitchLogo = ({ size = 28 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]"
    >
      {/* Top Left - Red */}
      <path d="M50 10 L10 50 L50 50 Z" fill="#EF4444" />
      {/* Top Right - Light Grey */}
      <path d="M50 10 L90 50 L50 50 Z" fill="#D1D5DB" />
      {/* Bottom Left - Dark Grey */}
      <path d="M10 50 L50 90 L50 50 Z" fill="#374151" />
      {/* Bottom Right - Medium Grey */}
      <path d="M90 50 L50 90 L50 50 Z" fill="#6B7280" />
      
      {/* Center White Square (Diamond) */}
      <path d="M50 42 L58 50 L50 58 L42 50 Z" fill="white" />
    </svg>
  )
}

export default RincovitchLogo
