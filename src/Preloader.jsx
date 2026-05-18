import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import RincovitchLogo from './RincovitchLogo'
import BuildingAnimation from './components/BuildingAnimation'

const STATUS_MESSAGES = [
  "INITIALIZING CORE...",
  "LOADING PROJECT DATABASE...",
  "SYNCING CELESTIAL ENGINE...",
  "CALIBRATING WORKFLOWS...",
  "ESTABLISHING SECURE CONNECTION...",
  "SYSTEM READY"
]

const Preloader = ({ onLoadingComplete }) => {
  const [progress, setProgress] = useState(0)
  const [statusIdx, setStatusIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer)
          setTimeout(onLoadingComplete, 800)
          return 100
        }
        return prev + Math.random() * 15
      })
    }, 200)

    const statusTimer = setInterval(() => {
      setStatusIdx(prev => (prev < STATUS_MESSAGES.length - 1 ? prev + 1 : prev))
    }, 500)

    return () => {
      clearInterval(timer)
      clearInterval(statusTimer)
    }
  }, [onLoadingComplete])

  return (
    <motion.div 
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center overflow-hidden px-6"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)]" />

      {/* Main Container */}
      <div className="relative w-full max-w-lg flex flex-col items-center gap-6">
        
        {/* Growing Architectural Building Construction Animation */}
        <div className="w-full shadow-2xl shadow-indigo-500/5 rounded-3xl overflow-hidden">
          <BuildingAnimation progress={progress} />
        </div>

        {/* Corporate Status Information */}
        <div className="flex flex-col items-center gap-3 mt-2 w-full text-center">
          
          <div className="flex items-center gap-3 justify-center">
            <RincovitchLogo size={24} />
            <h2 className="text-sm font-black text-white uppercase tracking-[0.25em]">
              RINCOVITCH
            </h2>
          </div>
          
          <div className="flex flex-col items-center gap-2.5 w-full">
            <motion.p 
              key={statusIdx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] h-4"
            >
              {STATUS_MESSAGES[statusIdx]}
            </motion.p>
            
            {/* Progress Bar Container */}
            <div className="w-full max-w-[320px] h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5 relative shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
              />
            </div>
            
            <span className="text-[10px] font-black text-white/40 tracking-wider">
              {Math.min(Math.round(progress), 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Tech Grid Coordinate Overlay */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,1)]" />
        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,1)]" />
      </div>
    </motion.div>
  )
}

export default Preloader
