import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import RincovitchLogo from './RincovitchLogo'

const Preloader = ({ onLoadingComplete }) => {
  const [progress, setProgress] = useState(0)
  const videoRef = useRef(null)
  const [hasStarted, setHasStarted] = useState(false)

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
    setTimeout(onLoadingComplete, 600)
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
            setTimeout(onLoadingComplete, 800)
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
      {/* CSS Injection for Organic Gooey Liquid Dot Animation */}
      <style>{`
        .gooey-container {
          position: relative;
          width: 140px;
          height: 140px;
          animation: gooey-rotate 4s ease-in-out infinite;
          filter: url("#gooey");
        }

        @keyframes gooey-rotate {
          0% {
            transform: rotate(360deg);
          }
          50% {
            transform: rotate(360deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }

        .gooey-liquid {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(
            90deg,
            #06b6d4 0%,
            #6366f1 50%,
            #a855f7 100%
          );
          width: 32px;
          height: 32px;
          border-radius: 50%;
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
        }

        .gooey-liquid:nth-child(1) {
          top: 0;
          animation: gooey-animate1 4s ease-in-out infinite;
        }

        .gooey-liquid:nth-child(2) {
          left: 0;
          animation: gooey-animate2 4s ease-in-out infinite;
        }

        .gooey-liquid:nth-child(3) {
          left: 100%;
          animation: gooey-animate3 4s ease-in-out infinite;
        }

        .gooey-liquid:nth-child(4) {
          top: 100%;
          animation: gooey-animate4 4s ease-in-out infinite;
        }

        @keyframes gooey-animate1 {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 100%; }
        }

        @keyframes gooey-animate2 {
          0% { left: 0; }
          50% { left: 100%; }
          100% { left: 100%; }
        }

        @keyframes gooey-animate3 {
          0% { left: 100%; }
          50% { left: 0; }
          100% { left: 0; }
        }

        @keyframes gooey-animate4 {
          0% { top: 100%; }
          50% { top: 0; }
          100% { top: 0; }
        }
      `}</style>

      {/* 1. Background MP4 Video (100% BRIGHTNESS, 0% OVERLAYS - Pure Raw Video) */}
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

      {/* 2. Super Subtle HUD Blueprint grid paper overlay (Very light: opacity-10) */}
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
      <div className="relative flex flex-col items-center z-20">
        <div className="relative flex flex-col items-center max-w-lg w-full">
          {/* Logo Container (Raw floating without backing box) */}
          <motion.div
            animate={{ 
              scale: [1, 1.04, 1],
              filter: ["brightness(1) drop-shadow(0 0 10px rgba(99,102,241,0.25))", "brightness(1.25) drop-shadow(0 0 20px rgba(99,102,241,0.5))", "brightness(1) drop-shadow(0 0 10px rgba(99,102,241,0.25))"]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="z-10"
          >
            <RincovitchLogo size={75} />
          </motion.div>

          {/* Typography and interactive load status bar */}
          <div className="mt-8 flex flex-col items-center z-10 w-full animate-fadeIn">
            <motion.h2 
              initial={{ letterSpacing: "0.08em", opacity: 0 }}
              animate={{ letterSpacing: "0.14em", opacity: 1 }}
              transition={{ duration: 1.2 }}
              style={{ fontFamily: "'Cinzel', 'Playfair Display', 'Times New Roman', serif", fontWeight: 400 }}
              className="text-3xl text-white tracking-[0.14em] drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] text-center uppercase"
            >
              RINCOVITCH
            </motion.h2>
            
            {/* 🟢 KHUNG XANH ĐÃ ĐƯỢC CHUYỂN LÊN VỊ TRÍ KHUNG CAM (Hiển thị chữ LOADING : % ) */}
            <div className="h-6 flex items-center justify-center mt-3">
              <span className="text-[10px] font-mono font-black text-white tracking-[0.25em] uppercase text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                LOADING : {Math.min(Math.round(progress), 100)}%
              </span>
            </div>

            {/* 🔴 GOOEY LIQUID DRIPPING DOT LOADER (Trung tâm màn hình dưới chữ LOADING) */}
            <div className="relative w-44 h-44 mt-4 flex items-center justify-center overflow-visible">
              <div className="gooey-container">
                <div className="gooey-liquid" />
                <div className="gooey-liquid" />
                <div className="gooey-liquid" />
                <div className="gooey-liquid" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Gooey Filter definitions (Hidden completely) */}
      <svg className="absolute w-0 h-0 pointer-events-none z-[-1]">
        <defs>
          <filter id="gooey">
            <feGaussianBlur stdDeviation="7" in="SourceGraphic" result="blur" />
            <feColorMatrix 
              in="blur"
              mode="matrix" 
              values="1 0 0 0 0  
                      0 1 0 0 0  
                      0 0 1 0 0  
                      0 0 0 20 -10" 
              result="gooey"
            />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
        </defs>
      </svg>
    </motion.div>
  )
}

export default Preloader
