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

const TELEMETRY_LEFT = [
  "SYS.LOC.VN : ACTIVED",
  "BEAM_STRESS_TENSOR: OK",
  "PT_TENSION_LIMIT: 98.4%",
  "REO_DENSITY_MATRIX: CALIB",
  "GRID_X: 104.22901",
  "GRID_Y: 10.83904",
  "σ_max = 345.8 MPa",
  "E_modulus = 200 GPa",
  "STRUCTURE_PULSE: 188.3Hz"
]

const TELEMETRY_RIGHT = [
  "MSAL_AUTH_BYPASS: TRUE",
  "SUPABASE_REALTIME: SYNC",
  "DB_CONN_POOL: ACTIVE",
  "PING_LATENCY: 12ms",
  "MODEL_ISOMETRIC: LOADED",
  "WIND_LOAD_MATRIX: CALC",
  "τ_xy = 18.4 MPa",
  "v_Poisson = 0.25",
  "CELESTIAL_ENGINE: ONLINE"
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
      exit={{ opacity: 0, scale: 1.05 }}
      className="fixed inset-0 z-[9999] bg-[#030712] flex flex-col items-center justify-center overflow-hidden font-sans"
    >
      {/* 1. CAD Drafting Grid Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(0deg, transparent, transparent 39px, rgba(99, 102, 241, 0.08) 39px, rgba(99, 102, 241, 0.08) 40px),
            linear-gradient(90deg, transparent, transparent 39px, rgba(99, 102, 241, 0.08) 39px, rgba(99, 102, 241, 0.08) 40px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* 2. Floating Ambient Glow Orbs (Framer Motion slow-shifting) */}
      <motion.div 
        animate={{
          x: [-40, 40, -40],
          y: [-30, 30, -30],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[450px] h-[450px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.15)_0%,transparent_70%)] top-[-100px] left-[-50px] pointer-events-none"
      />
      <motion.div 
        animate={{
          x: [30, -30, 30],
          y: [40, -40, 40],
          scale: [1.2, 1, 1.2]
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.12)_0%,transparent_70%)] bottom-[-150px] right-[-50px] pointer-events-none"
      />
      <motion.div 
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.6, 0.9, 0.6]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.08)_0%,transparent_75%)] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      />

      {/* 3. Corner Technical Compass Graphics (Slow spinning SVG) */}
      <div className="absolute top-[-80px] left-[-80px] w-96 h-96 opacity-15 pointer-events-none">
        <motion.svg 
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          viewBox="0 0 200 200" 
          className="w-full h-full text-indigo-400"
        >
          <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 8" />
          <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" strokeWidth="0.25" />
          <line x1="100" y1="5" x2="100" y2="195" stroke="currentColor" strokeWidth="0.25" />
          <line x1="5" y1="100" x2="195" y2="100" stroke="currentColor" strokeWidth="0.25" />
        </motion.svg>
      </div>

      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] opacity-15 pointer-events-none">
        <motion.svg 
          animate={{ rotate: -360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          viewBox="0 0 200 200" 
          className="w-full h-full text-sky-400"
        >
          <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="0.25" strokeDasharray="10 5" />
          <line x1="100" y1="0" x2="100" y2="200" stroke="currentColor" strokeWidth="0.25" />
          <line x1="0" y1="100" x2="200" y2="100" stroke="currentColor" strokeWidth="0.25" />
          {/* Compass ticks */}
          {Array.from({ length: 12 }).map((_, i) => (
            <line 
              key={i} 
              x1="100" y1="10" x2="100" y2="18" 
              stroke="currentColor" strokeWidth="0.75" 
              transform={`rotate(${i * 30} 100 100)`} 
            />
          ))}
        </motion.svg>
      </div>

      {/* 4. Telemetry Real-time Data Rails (Left & Right) */}
      <div className="absolute left-[3%] top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-3 font-mono text-[8px] text-indigo-400/20 pointer-events-none select-none tracking-widest leading-relaxed">
        {TELEMETRY_LEFT.map((line, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 bg-indigo-500/20 rounded-full" />
            {line}
          </motion.div>
        ))}
      </div>

      <div className="absolute right-[3%] top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-3 font-mono text-[8px] text-sky-400/20 pointer-events-none select-none tracking-widest leading-relaxed text-right">
        {TELEMETRY_RIGHT.map((line, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-center justify-end gap-2"
          >
            {line}
            <span className="w-1.5 h-1.5 bg-sky-500/20 rounded-full" />
          </motion.div>
        ))}
      </div>

      {/* 5. Center Preloader Focus Container */}
      <div className="relative flex flex-col items-center">
        {/* Complex rotating drafting circles */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute w-72 h-72 border border-dashed border-indigo-500/20 rounded-full flex items-center justify-center"
        >
          <div className="w-[90%] h-[90%] border border-indigo-500/5 rounded-full" />
        </motion.div>
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
          className="absolute w-56 h-56 border-t border-b border-sky-500/30 rounded-full"
        />
        <motion.div 
          animate={{ rotate: 180 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute w-40 h-40 border-l border-r border-indigo-500/50 rounded-full opacity-40"
        />
        
        {/* Logo Container with High-tech Shadow */}
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
            filter: ["brightness(1) drop-shadow(0 0 10px rgba(99,102,241,0.2))", "brightness(1.3) drop-shadow(0 0 25px rgba(99,102,241,0.6))", "brightness(1) drop-shadow(0 0 10px rgba(99,102,241,0.2))"]
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="z-10 bg-[#030712]/80 p-6 rounded-full border border-indigo-500/20 backdrop-blur-md"
        >
          <RincovitchLogo size={80} />
        </motion.div>

        {/* Text and progress bars */}
        <div className="mt-28 flex flex-col items-center gap-4 z-10">
          <motion.h2 
            initial={{ letterSpacing: "0.2em", opacity: 0 }}
            animate={{ letterSpacing: "0.35em", opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="text-2xl font-black text-white tracking-[0.35em] drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]"
          >
            RINCOVITCH
          </motion.h2>
          
          <div className="flex flex-col items-center gap-3">
            <div className="h-4 flex items-center justify-center">
              <motion.p 
                key={statusIdx}
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                className="text-[9px] font-black text-indigo-400 tracking-[0.3em] uppercase"
              >
                {STATUS_MESSAGES[statusIdx]}
              </motion.p>
            </div>
            
            {/* Custom High-Tech Loading Bar */}
            <div className="relative w-72 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5 p-[1px] mt-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-sky-400 to-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.8)]"
              />
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-ping" />
              <span className="text-[10px] font-mono font-black text-white/40 tracking-wider">
                CALIBRATING: {Math.min(Math.round(progress), 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Blueprint Crosshairs (Subtle horizontal & vertical lines) */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute top-1/2 left-0 w-full h-[0.5px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
        <div className="absolute top-0 left-1/2 w-[0.5px] h-full bg-gradient-to-b from-transparent via-indigo-500 to-transparent" />
        {/* Tech tick marks on main axis */}
        <div className="absolute top-[48%] left-1/2 transform -translate-x-1/2 w-4 h-8 border-l border-r border-indigo-400/30 pointer-events-none" />
        <div className="absolute top-1/2 left-[48%] transform -translate-y-1/2 h-4 w-8 border-t border-b border-indigo-400/30 pointer-events-none" />
      </div>
    </motion.div>
  )
}

export default Preloader
