import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import RincovitchLogo from './RincovitchLogo'

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
      className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1)_0%,transparent_70%)]" />

      {/* Main Scanner Container */}
      <div className="relative flex flex-col items-center">
        {/* Rotating Rings */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute w-64 h-64 border-t-2 border-b-2 border-indigo-500/20 rounded-full"
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute w-48 h-48 border-l-2 border-r-2 border-indigo-500/40 rounded-full"
        />
        
        {/* Pulsing Logo */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="z-10"
        >
          <RincovitchLogo size={80} />
        </motion.div>

        {/* Text Area */}
        <div className="mt-24 flex flex-col items-center gap-4">
          <motion.h2 
            className="text-2xl font-black text-white tracking-[0.3em]"
          >
            RINCOVITCH
          </motion.h2>
          
          <div className="flex flex-col items-center gap-2">
            <motion.p 
              key={statusIdx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.4em] h-4"
            >
              {STATUS_MESSAGES[statusIdx]}
            </motion.p>
            
            {/* Progress Bar Container */}
            <div className="w-64 h-1 bg-slate-900 rounded-full overflow-hidden border border-white/5 mt-4">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-indigo-600 via-indigo-400 to-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
              />
            </div>
            
            <span className="text-[10px] font-black text-white/20 mt-1">
              {Math.min(Math.round(progress), 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Decorative Lines */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,1)]" />
        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,1)]" />
      </div>
    </motion.div>
  )
}

export default Preloader
