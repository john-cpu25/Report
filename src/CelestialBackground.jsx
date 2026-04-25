import React, { useMemo } from 'react'
import { motion } from 'framer-motion'

const ZODIAC_CONSTELLATIONS = [
  { name: 'Capricorn', month: 0, stars: [[50,20], [70,30], [80,50], [60,70], [40,60], [30,40]] },
  { name: 'Aquarius', month: 1, stars: [[30,30], [40,50], [50,40], [60,60], [70,50], [80,70]] },
  { name: 'Pisces', month: 2, stars: [[20,20], [30,40], [50,40], [70,50], [80,30], [90,50]] },
  { name: 'Aries', month: 3, stars: [[30,30], [50,20], [70,25], [80,40]] },
  { name: 'Taurus', month: 4, stars: [[20,20], [40,40], [50,50], [60,40], [80,20], [70,60]] },
  { name: 'Gemini', month: 5, stars: [[30,20], [30,60], [50,20], [50,60], [70,20], [70,60]] },
  { name: 'Cancer', month: 6, stars: [[50,20], [50,50], [40,70], [60,70]] },
  { name: 'Leo', month: 7, stars: [[80,60], [70,40], [60,30], [50,30], [40,40], [30,60], [50,60]] },
  { name: 'Virgo', month: 8, stars: [[20,50], [40,40], [50,60], [60,40], [80,50], [70,70], [30,70]] },
  { name: 'Libra', month: 9, stars: [[50,20], [40,50], [60,50], [50,80]] },
  { name: 'Scorpio', month: 10, stars: [[80,20], [70,30], [60,50], [50,70], [40,80], [30,75], [25,65]] },
  { name: 'Sagittarius', month: 11, stars: [[30,70], [40,50], [50,30], [60,50], [70,70], [50,60], [50,80]] }
]

const CelestialBackground = () => {
  const currentMonth = new Date().getMonth()
  const constellation = useMemo(() => ZODIAC_CONSTELLATIONS[currentMonth], [currentMonth])

  // Random stars for background
  const bgStars = useMemo(() => {
    return Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 3 + 2
    }))
  }, [])

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#020617]">
      {/* Animated Nebulas */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)] blur-[100px]"
      />
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2],
          rotate: [0, -90, 0],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-20%] right-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.1)_0%,transparent_70%)] blur-[100px]"
      />

      {/* Twinkling Stars */}
      {bgStars.map(star => (
        <motion.div
          key={star.id}
          initial={{ opacity: Math.random() }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: star.duration, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: 'white',
            borderRadius: '50%',
            boxShadow: '0 0 5px white'
          }}
        />
      ))}

      {/* Monthly Constellation */}
      <svg className="absolute inset-0 w-full h-full opacity-40">
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Lines between stars */}
        {constellation.stars.map((star, i) => {
          if (i === constellation.stars.length - 1) return null
          const nextStar = constellation.stars[i + 1]
          return (
            <motion.line
              key={`line-${i}`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.3 }}
              transition={{ duration: 3, delay: i * 0.2 }}
              x1={`${star[0]}%`} y1={`${star[1]}%`}
              x2={`${nextStar[0]}%`} y2={`${nextStar[1]}%`}
              stroke="rgba(129, 140, 248, 0.5)"
              strokeWidth="1"
              filter="url(#glow)"
            />
          )
        })}

        {/* Constellation Stars */}
        {constellation.stars.map((star, i) => (
          <motion.circle
            key={`cstar-${i}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [1, 1.5, 1], opacity: 1 }}
            transition={{ duration: 4, repeat: Infinity, delay: i * 0.3 }}
            cx={`${star[0]}%`} cy={`${star[1]}%`}
            r="3"
            fill="white"
            filter="url(#glow)"
          />
        ))}
      </svg>

      {/* Constellation Name */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 0.2, y: 0 }}
        className="absolute bottom-12 left-12 font-black text-white text-4xl tracking-[0.5em] uppercase italic pointer-events-none select-none"
      >
        {constellation.name}
      </motion.div>
    </div>
  )
}

export default CelestialBackground
