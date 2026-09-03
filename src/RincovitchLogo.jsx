import React from 'react'

const RincovitchLogo = ({ size = 28, className = '' }) => {
  return (
    <img 
      src={`${import.meta.env.BASE_URL}apex-icon.png?v=2`} 
      alt="APEX Southern Cross Engineering" 
      style={{ height: size, width: size }}
      className={`object-contain drop-shadow-[0_2px_8px_rgba(30,58,138,0.3)] ${className}`}
    />
  )
}

export default RincovitchLogo
