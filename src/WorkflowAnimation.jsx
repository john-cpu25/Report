import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const WorkflowAnimation = () => {
  const [activeStep, setActiveStep] = useState(0)
  const [isTransiting, setIsTransiting] = useState(false)
  
  // The sequence: CREATE -> ACCEPT -> START -> CHECK -> RECHECK -> CHECK -> COMPLETE
  const sequence = ['create', 'accept', 'start', 'check', 'recheck', 'check2', 'complete']

  const DOCK_TIME = 5000  // 5 seconds docked at each planet
  const TRANSIT_TIME = 1200 // 1.2s flight animation between planets

  useEffect(() => {
    let timeout
    const cycle = () => {
      // Start transit animation
      setIsTransiting(true)
      timeout = setTimeout(() => {
        // Arrive at next planet
        setActiveStep(prev => (prev + 1) % sequence.length)
        setIsTransiting(false)
        // Dock for 5 seconds then move again
        timeout = setTimeout(cycle, DOCK_TIME)
      }, TRANSIT_TIME)
    }
    // Initial dock
    timeout = setTimeout(cycle, DOCK_TIME)
    return () => clearTimeout(timeout)
  }, [])

  // Planet definitions with orbital positions (arranged in a flowing path)
  const planets = [
    { id: 'create',   label: 'CREATE',   cx: 14, cy: 30, r: 5, color: '#64748b', glowColor: '#94a3b8', ringColor: '#475569' },
    { id: 'accept',   label: 'ACCEPT',   cx: 32, cy: 22, r: 4.5, color: '#3b82f6', glowColor: '#60a5fa', ringColor: '#2563eb' },
    { id: 'start',    label: 'START',    cx: 50, cy: 16, r: 5.5, color: '#6366f1', glowColor: '#a5b4fc', ringColor: '#4f46e5' },
    { id: 'check',    label: 'CHECK',    cx: 68, cy: 24, r: 4.5, color: '#f59e0b', glowColor: '#fcd34d', ringColor: '#d97706' },
    { id: 'complete', label: 'COMPLETE', cx: 88, cy: 18, r: 5, color: '#10b981', glowColor: '#6ee7b7', ringColor: '#059669' },
    { id: 'recheck',  label: 'RECHECK',  cx: 68, cy: 55, r: 4, color: '#ef4444', glowColor: '#fca5a5', ringColor: '#dc2626' },
  ]

  // Map sequence step to planet
  const getPlanetForStep = (step) => {
    const map = { 'create': 'create', 'accept': 'accept', 'start': 'start', 'check': 'check', 'recheck': 'recheck', 'check2': 'check', 'complete': 'complete' }
    return planets.find(p => p.id === map[sequence[step]])
  }

  const currentPlanet = getPlanetForStep(activeStep)
  const nextStep = (activeStep + 1) % sequence.length
  const nextPlanet = getPlanetForStep(nextStep)

  // Ship position: when transiting, animate from current to next; when docked, stay at current
  const shipTarget = isTransiting ? nextPlanet : currentPlanet

  // Background stars (static, generated once)
  const stars = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      x: (i * 37 + 13) % 100,
      y: (i * 53 + 7) % 80,
      r: ((i % 3) + 1) * 0.15,
      opacity: 0.2 + (i % 5) * 0.1,
      twinkleDelay: (i % 7) * 0.5,
    }))
  }, [])

  // Orbit path connections
  const orbitPaths = [
    { from: 'create', to: 'accept' },
    { from: 'accept', to: 'start' },
    { from: 'start', to: 'check' },
    { from: 'check', to: 'complete' },
    { from: 'check', to: 'recheck', dashed: true },
    { from: 'recheck', to: 'check', dashed: true },
  ]

  // Active planet ID from sequence
  const activePlanetId = (() => {
    const step = sequence[activeStep]
    if (step === 'check2') return 'check'
    return step
  })()

  return (
    <div className="w-full h-full mt-6 flex flex-col">
      <h3 className="font-bold text-slate-400 uppercase text-[10px] tracking-[0.3em] flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
        Workflow Automation
      </h3>
      
      <div className="relative w-full flex-1 bg-slate-950/80 rounded-2xl border border-white/5 overflow-hidden min-h-[200px] p-2">
        <svg className="w-full h-full" viewBox="0 0 100 75" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Planet glow filters */}
            {planets.map(p => (
              <filter key={`glow-${p.id}`} id={`planet-glow-${p.id}`} x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feFlood floodColor={p.glowColor} floodOpacity="0.6" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
            {/* Ship engine glow */}
            <filter id="engine-glow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feFlood floodColor="#60a5fa" floodOpacity="0.8" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Star twinkle filter */}
            <filter id="star-soft">
              <feGaussianBlur stdDeviation="0.3" />
            </filter>
            {/* Radial gradient for planets */}
            {planets.map(p => (
              <radialGradient key={`grad-${p.id}`} id={`planet-grad-${p.id}`} cx="35%" cy="35%">
                <stop offset="0%" stopColor={p.glowColor} stopOpacity="0.9" />
                <stop offset="50%" stopColor={p.color} stopOpacity="1" />
                <stop offset="100%" stopColor={p.ringColor} stopOpacity="1" />
              </radialGradient>
            ))}
          </defs>

          {/* Deep space background gradient */}
          <rect x="0" y="0" width="100" height="75" fill="transparent" />

          {/* Background stars with twinkle */}
          {stars.map((star, i) => (
            <motion.circle
              key={`star-${i}`}
              cx={star.x}
              cy={star.y}
              r={star.r}
              fill="#e2e8f0"
              filter="url(#star-soft)"
              animate={{ opacity: [star.opacity, star.opacity * 2, star.opacity] }}
              transition={{ 
                duration: 2 + (i % 3), 
                repeat: Infinity, 
                delay: star.twinkleDelay,
                ease: "easeInOut"
              }}
            />
          ))}

          {/* Orbit paths (connection lines between planets) */}
          {orbitPaths.map((path, i) => {
            const from = planets.find(p => p.id === path.from)
            const to = planets.find(p => p.id === path.to)
            return (
              <line
                key={`orbit-${i}`}
                x1={from.cx} y1={from.cy}
                x2={to.cx} y2={to.cy}
                stroke="rgba(148,163,184,0.08)"
                strokeWidth="0.3"
                strokeDasharray={path.dashed ? "1.5 1.5" : "none"}
              />
            )
          })}

          {/* Planets */}
          {planets.map(planet => {
            const isActive = activePlanetId === planet.id && !isTransiting

            return (
              <g key={planet.id}>
                {/* Planet orbit ring */}
                <motion.circle
                  cx={planet.cx}
                  cy={planet.cy}
                  r={planet.r + 2.5}
                  fill="none"
                  stroke={planet.color}
                  strokeWidth="0.15"
                  strokeDasharray="1 1.5"
                  animate={{ 
                    strokeOpacity: isActive ? 0.6 : 0.1,
                    rotate: [0, 360]
                  }}
                  transition={{ 
                    strokeOpacity: { duration: 0.5 },
                    rotate: { duration: 20, repeat: Infinity, ease: "linear" }
                  }}
                  style={{ transformOrigin: `${planet.cx}px ${planet.cy}px` }}
                />

                {/* Planet glow ring (active) */}
                {isActive && (
                  <motion.circle
                    cx={planet.cx}
                    cy={planet.cy}
                    r={planet.r + 1.5}
                    fill="none"
                    stroke={planet.glowColor}
                    strokeWidth="0.4"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: [0.3, 0.7, 0.3], 
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ transformOrigin: `${planet.cx}px ${planet.cy}px` }}
                  />
                )}

                {/* Planet body */}
                <motion.circle
                  cx={planet.cx}
                  cy={planet.cy}
                  r={planet.r}
                  fill={`url(#planet-grad-${planet.id})`}
                  filter={isActive ? `url(#planet-glow-${planet.id})` : 'none'}
                  animate={{
                    r: isActive ? planet.r * 1.15 : planet.r,
                  }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
                />

                {/* Planet surface detail (small crescent shadow) */}
                <circle
                  cx={planet.cx + planet.r * 0.3}
                  cy={planet.cy - planet.r * 0.1}
                  r={planet.r * 0.85}
                  fill="rgba(0,0,0,0.2)"
                  clipPath={`circle(${planet.r}px at ${planet.cx}px ${planet.cy}px)`}
                />

                {/* Planet label */}
                <motion.text
                  x={planet.cx}
                  y={planet.cy + planet.r + 4.5}
                  textAnchor="middle"
                  fontSize="2.8"
                  fontWeight="900"
                  letterSpacing="0.4"
                  animate={{
                    fill: isActive ? '#ffffff' : '#64748b',
                    opacity: isActive ? 1 : 0.6,
                  }}
                  transition={{ duration: 0.4 }}
                >
                  {planet.label}
                </motion.text>
              </g>
            )
          })}

          {/* === SPACESHIP === */}
          <motion.g
            animate={{
              x: shipTarget.cx - 50,
              y: shipTarget.cy - 50 - (isTransiting ? 0 : shipTarget.r + 3),
            }}
            transition={{
              duration: isTransiting ? TRANSIT_TIME / 1000 : 0.3,
              ease: isTransiting ? [0.25, 0.1, 0.25, 1] : "easeOut",
            }}
          >
            {/* Engine trail (when transiting) */}
            {isTransiting && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.ellipse
                  cx={50}
                  cy={51.5}
                  rx={0.6}
                  ry={2}
                  fill="#60a5fa"
                  filter="url(#engine-glow)"
                  animate={{ ry: [2, 3.5, 2], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 0.3, repeat: Infinity }}
                />
                <motion.ellipse
                  cx={50}
                  cy={52}
                  rx={0.3}
                  ry={1.5}
                  fill="#93c5fd"
                  animate={{ ry: [1.5, 2.5, 1.5], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 0.2, repeat: Infinity }}
                />
              </motion.g>
            )}

            {/* Ship body */}
            <g filter={isTransiting ? "url(#engine-glow)" : "none"}>
              {/* Main hull */}
              <polygon
                points="50,46 47.5,51 52.5,51"
                fill="#e2e8f0"
                stroke="#94a3b8"
                strokeWidth="0.2"
              />
              {/* Cockpit window */}
              <circle cx={50} cy={48.5} r={0.6} fill="#60a5fa" />
              {/* Wings */}
              <polygon points="47.5,50.5 45.5,52 47.5,51" fill="#94a3b8" />
              <polygon points="52.5,50.5 54.5,52 52.5,51" fill="#94a3b8" />
            </g>

            {/* Docking indicator (when docked) */}
            {!isTransiting && (
              <motion.circle
                cx={50}
                cy={46}
                r={0.4}
                fill="#10b981"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </motion.g>

          {/* Traveling particles (when transiting) */}
          {isTransiting && Array.from({ length: 5 }).map((_, i) => (
            <motion.circle
              key={`particle-${i}`}
              r={0.2}
              fill="#60a5fa"
              initial={{ 
                cx: currentPlanet.cx,
                cy: currentPlanet.cy - currentPlanet.r - 3,
                opacity: 0 
              }}
              animate={{ 
                cx: nextPlanet.cx + (Math.random() - 0.5) * 4,
                cy: nextPlanet.cy - nextPlanet.r - 3 + (Math.random() - 0.5) * 4,
                opacity: [0, 0.8, 0] 
              }}
              transition={{ 
                duration: TRANSIT_TIME / 1000,
                delay: i * 0.15,
                ease: "easeOut"
              }}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}

export default WorkflowAnimation
