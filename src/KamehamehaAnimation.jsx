import React, { useMemo } from 'react'
import { motion } from 'framer-motion'

const KamehamehaAnimation = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 80 + 10,
      y: Math.random() * 40 + 30,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 0.5 + 0.3
    }))
  }, [])

  const debris = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 60 + 20,
      y: Math.random() * 50 + 25,
      size: Math.random() * 4 + 2,
      rotation: Math.random() * 360
    }))
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="energy-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feFlood floodColor="#38bdf8" floodOpacity="0.8" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="beam-gradient" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.8" />
            <stop offset="20%" stopColor="#38bdf8" stopOpacity="1" />
            <stop offset="80%" stopColor="#0ea5e9" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
          </linearGradient>

          <radialGradient id="impact-glow">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Energy Beam Core */}
        <motion.path
          d="M 5,50 Q 15,48 25,50 T 45,50 T 65,50 T 85,50 L 95,50"
          fill="none"
          stroke="url(#beam-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#energy-glow)"
          animate={{
            d: [
              "M 5,50 Q 15,47 25,50 T 45,50 T 65,50 T 85,50 L 95,50",
              "M 5,50 Q 15,53 25,50 T 45,50 T 65,50 T 85,50 L 95,50",
              "M 5,50 Q 15,47 25,50 T 45,50 T 65,50 T 85,50 L 95,50"
            ],
            strokeWidth: [3, 4, 3]
          }}
          transition={{ duration: 0.15, repeat: Infinity, ease: "linear" }}
        />

        {/* Outer Aura Beam */}
        <motion.path
          d="M 5,50 Q 25,40 50,50 T 95,50"
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="8"
          strokeOpacity="0.2"
          filter="url(#energy-glow)"
          animate={{
            strokeWidth: [8, 12, 8],
            strokeOpacity: [0.1, 0.3, 0.1]
          }}
          transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Energy Particles */}
        {particles.map((p) => (
          <motion.circle
            key={`p-${p.id}`}
            cx={p.x}
            cy={p.y}
            r={p.size}
            fill="#7dd3fc"
            initial={{ opacity: 0, x: -10 }}
            animate={{ 
              opacity: [0, 1, 0],
              x: [p.x, p.x + 20],
              y: [p.y, p.y + (Math.random() - 0.5) * 10]
            }}
            transition={{ 
              duration: p.duration, 
              repeat: Infinity, 
              delay: Math.random() * 2,
              ease: "easeOut"
            }}
          />
        ))}

        {/* Debris / Rocks */}
        {debris.map((d) => (
          <motion.rect
            key={`d-${d.id}`}
            x={d.x}
            y={d.y}
            width={d.size}
            height={d.size}
            fill="#1e293b"
            stroke="#334155"
            strokeWidth="0.5"
            animate={{ 
              rotate: [d.rotation, d.rotation + 360],
              y: [d.y, d.y - 5, d.y]
            }}
            transition={{ 
              duration: 2 + Math.random() * 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
        ))}

        {/* Impact Point */}
        <motion.circle
          cx="95"
          cy="50"
          r="10"
          fill="url(#impact-glow)"
          animate={{ 
            r: [10, 15, 10],
            opacity: [0.6, 0.9, 0.6]
          }}
          transition={{ duration: 0.2, repeat: Infinity }}
        />

        {/* Character Charging Silhouette (Simplified) */}
        <g transform="translate(2, 42) scale(0.15)">
          <motion.path
            d="M 50,0 L 70,30 L 100,20 L 80,50 L 100,80 L 70,70 L 50,100 L 30,70 L 0,80 L 20,50 L 0,20 L 30,30 Z"
            fill="#0ea5e9"
            filter="url(#energy-glow)"
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ duration: 0.2, repeat: Infinity }}
          />
        </g>
      </svg>

      {/* Lightning streaks */}
      <motion.div 
        className="absolute left-[5%] top-[50%] w-[90%] h-[2px] bg-sky-300 shadow-[0_0_20px_#38bdf8]"
        animate={{ 
          opacity: [0, 0.8, 0],
          scaleY: [1, 2, 1],
          translateY: [-2, 2, -1]
        }}
        transition={{ duration: 0.1, repeat: Infinity, repeatDelay: 0.5 }}
      />
    </div>
  )
}

export default KamehamehaAnimation
