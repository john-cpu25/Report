import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { SkipForward } from 'lucide-react'

const Preloader = ({ onLoadingComplete }) => {
  const [progress, setProgress] = useState(0)
  const videoRef = useRef(null)
  const [hasStarted, setHasStarted] = useState(false)

  // Skip handler
  const handleSkip = () => {
    setProgress(100)
    if (videoRef.current) {
      try { videoRef.current.pause() } catch (e) {}
    }
    onLoadingComplete()
  }

  // Keyboard shortcut to skip (Escape or Space)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.code === 'Space') {
        e.preventDefault()
        handleSkip()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onLoadingComplete])

  // 1. Time Update Listener on background video to sync progress
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime
      const duration = videoRef.current.duration
      if (duration && duration > 0) {
        setHasStarted(true)
        const calculatedProgress = (current / duration) * 100
        setProgress(Math.min(calculatedProgress, 100))
      }
    }
  }

  // 2. Video ended handler to finalize preloader transit
  const handleEnded = () => {
    setProgress(100)
    setTimeout(onLoadingComplete, 400)
  }

  // 3. Robust Fallback Timer: if video fails to load or play, auto-trigger load progress
  useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      if (!hasStarted) {
        console.warn("Video play not detected. Activating robust fallback loader.");
        let currentProg = 0
        const interval = setInterval(() => {
          currentProg += Math.random() * 8 + 2
          if (currentProg >= 100) {
            setProgress(100)
            clearInterval(interval)
            setTimeout(onLoadingComplete, 600)
          } else {
            setProgress(currentProg)
          }
        }, 150)
      }
    }, 2500)

    return () => clearTimeout(fallbackTimeout)
  }, [hasStarted, onLoadingComplete])

  return (
    <motion.div 
      exit={{ opacity: 0, scale: 1.05 }}
      className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center overflow-hidden font-sans"
    >
      {/* Skip Button Top Right */}
      <motion.button
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        onClick={handleSkip}
        className="absolute top-6 right-6 z-50 flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/25 hover:border-white/50 text-white text-xs font-bold tracking-widest uppercase backdrop-blur-md transition-all duration-200 cursor-pointer shadow-[0_4px_24px_rgba(0,0,0,0.6)] hover:scale-105 active:scale-95"
        title="Bỏ qua video giới thiệu (Phím Esc hoặc Space)"
      >
        <span>Bỏ qua / Skip</span>
        <SkipForward size={14} className="text-white fill-white" />
      </motion.button>

      {/* 1. Background MP4 Video */}
      <video 
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}building.mp4`}
        autoPlay 
        muted 
        playsInline 
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        className="absolute inset-0 w-full h-full object-cover opacity-100 pointer-events-none z-0 scale-[1.06]"
      />

      {/* 2. Super Subtle HUD Blueprint grid paper overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10 z-10"
        style={{
          backgroundImage: `
            linear-gradient(0deg, transparent, transparent 39px, rgba(99, 102, 241, 0.08) 39px, rgba(99, 102, 241, 0.08) 40px),
            linear-gradient(90deg, transparent, transparent 39px, rgba(99, 102, 241, 0.08) 39px, rgba(99, 102, 241, 0.08) 40px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* 3. Center Preloader Focus Container */}
      <div className="relative flex flex-col items-center z-20 px-4">
        <div className="relative flex flex-col items-center max-w-2xl w-full">
          {/* New APEX Logo Banner (Pure Transparent, No Extra Box) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1,
              scale: [1, 1.02, 1],
              filter: [
                "drop-shadow(0 8px 24px rgba(0,0,0,0.85))",
                "drop-shadow(0 12px 32px rgba(59,130,246,0.35))",
                "drop-shadow(0 8px 24px rgba(0,0,0,0.85))"
              ]
            }}
            transition={{ 
              opacity: { duration: 0.8 },
              scale: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
              filter: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
            }}
            className="z-10 flex justify-center w-full"
          >
            <img 
              src={`${import.meta.env.BASE_URL}apex-logo.png?v=3`} 
              alt="APEX Southern Cross Engineering" 
              className="h-32 sm:h-40 md:h-52 w-auto max-w-[85vw] object-contain"
            />
          </motion.div>

          {/* Loading status bar only (no redundant text) */}
          <div className="flex flex-col items-center z-10 w-full mt-6">
            <div className="h-6 flex items-center justify-center">
              <span className="text-[11px] font-mono font-bold text-white tracking-[0.25em] uppercase text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                LOADING : {Math.min(Math.round(progress), 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default Preloader
