import React from 'react'
import { motion } from 'framer-motion'

const AtomicAnimation = () => {
  const tasks = [
    { id: 1, size: 8, color: '#3b82f6', orbit: 35, duration: 3, delay: 0 },
    { id: 2, size: 6, color: '#10b981', orbit: 35, duration: 4, delay: -1 },
    { id: 3, size: 10, color: '#f59e0b', orbit: 55, duration: 5, delay: 0 },
    { id: 4, size: 7, color: '#ef4444', orbit: 55, duration: 6, delay: -2.5 },
    { id: 5, size: 9, color: '#8b5cf6', orbit: 75, duration: 7, delay: 0 },
    { id: 6, size: 5, color: '#06b6d4', orbit: 75, duration: 8, delay: -4 },
  ]

  return (
    <div className="w-full mt-6">
      <h3 className="font-bold text-slate-400 uppercase text-[10px] tracking-[0.3em] flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
        Task Orbit
      </h3>
      
      <div className="relative w-full h-[180px] bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center">
        {/* Orbits */}
        <div className="absolute w-[70px] h-[70px] rounded-full border border-slate-700/50"></div>
        <div className="absolute w-[110px] h-[110px] rounded-full border border-slate-700/50"></div>
        <div className="absolute w-[150px] h-[150px] rounded-full border border-slate-700/50"></div>

        {/* Center: Created By */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="absolute z-10 w-12 h-12 rounded-full bg-slate-800 border-2 border-rose-500 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.4)]"
        >
          <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest text-center leading-tight">Create<br/>By</span>
        </motion.div>

        {/* Orbiting Tasks */}
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            className="absolute left-1/2 top-1/2"
            style={{ width: task.orbit * 2, height: task.orbit * 2, marginLeft: -task.orbit, marginTop: -task.orbit }}
            animate={{ rotate: 360 }}
            transition={{ 
              duration: task.duration, 
              repeat: Infinity, 
              ease: "linear",
              delay: task.delay
            }}
          >
            <div 
              className="absolute rounded-full shadow-lg"
              style={{ 
                width: task.size, 
                height: task.size, 
                backgroundColor: task.color,
                top: -task.size / 2,
                left: '50%',
                marginLeft: -task.size / 2,
                boxShadow: `0 0 10px ${task.color}`
              }}
            />
          </motion.div>
        ))}
        
        {/* Glow Effects */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none"></div>
      </div>
    </div>
  )
}

export default AtomicAnimation
