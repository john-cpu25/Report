import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const WorkflowAnimation = () => {
  const [activeStep, setActiveStep] = useState(0)
  
  // The sequence: CREATE -> ACCEPT -> START -> CHECK -> RECHECK -> CHECK -> COMPLETE
  const sequence = ['create', 'accept', 'start', 'check', 'recheck', 'check', 'complete']

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % sequence.length)
    }, 1500) // 1.5 seconds per step
    return () => clearInterval(interval)
  }, [])

  const nodes = [
    { id: 'create', label: 'CREATE', x: 10, y: 30, color: '#475569', activeColor: '#94a3b8' }, // slate
    { id: 'accept', label: 'ACCEPT', x: 30, y: 30, color: '#3b82f6', activeColor: '#60a5fa' }, // blue
    { id: 'start', label: 'START', x: 50, y: 30, color: '#6366f1', activeColor: '#818cf8' },  // indigo
    { id: 'check', label: 'CHECK', x: 70, y: 30, color: '#f59e0b', activeColor: '#fbbf24' },  // amber
    { id: 'complete', label: 'COMPLETE', x: 90, y: 30, color: '#10b981', activeColor: '#34d399' }, // emerald
    { id: 'recheck', label: 'RECHECK', x: 70, y: 70, color: '#ef4444', activeColor: '#f87171' } // red
  ]

  const links = [
    { source: 'create', target: 'accept', color: '#3b82f6', stepIndex: 0 },
    { source: 'accept', target: 'start', color: '#6366f1', stepIndex: 1 },
    { source: 'start', target: 'check', color: '#f59e0b', stepIndex: 2 },
    { source: 'check', target: 'recheck', color: '#ef4444', path: 'M 72 40 L 72 60', stepIndex: 3 }, // Down to recheck
    { source: 'recheck', target: 'check', color: '#f59e0b', path: 'M 68 60 L 68 40', dashed: true, stepIndex: 4 }, // Up to check
    { source: 'check', target: 'complete', color: '#10b981', stepIndex: 5 },
  ]

  const currentActiveNodeId = sequence[activeStep]

  return (
    <div className="w-full h-full mt-6 flex flex-col">
      <h3 className="font-bold text-slate-400 uppercase text-[10px] tracking-[0.3em] flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
        Workflow Automation
      </h3>
      
      <div className="relative w-full flex-1 bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden min-h-[160px] p-2 flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            {links.map((link, i) => (
              <marker key={`head-${i}`} id={`arrowhead-${i}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <polygon points="0 0, 6 3, 0 6" fill={link.color} />
              </marker>
            ))}
            <filter id="glow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="nodeGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Draw Links */}
          {links.map((link, i) => {
            const s = nodes.find(n => n.id === link.source)
            const t = nodes.find(n => n.id === link.target)
            
            let d = link.path
            if (!d) {
              const dx = t.x - s.x
              const dy = t.y - s.y
              const length = Math.sqrt(dx*dx + dy*dy)
              const nx = dx / length
              const ny = dy / length
              const startX = s.x + nx * 9
              const startY = s.y + ny * 6
              const endX = t.x - nx * 9
              const endY = t.y - ny * 6
              d = `M ${startX} ${startY} L ${endX} ${endY}`
            }

            const isActiveLink = activeStep === link.stepIndex

            return (
              <g key={`link-${i}`}>
                {/* Background track */}
                <path d={d} fill="none" stroke={link.color} strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray={link.dashed ? "2 2" : "none"} />
                {/* Animated beam */}
                <motion.path
                  d={d}
                  fill="none"
                  stroke={link.color}
                  strokeWidth="0.8"
                  markerEnd={`url(#arrowhead-${i})`}
                  strokeDasharray={link.dashed ? "2 2" : "none"}
                  filter={isActiveLink ? "url(#glow)" : ""}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ 
                    pathLength: isActiveLink ? 1 : 0, 
                    opacity: isActiveLink ? 1 : 0 
                  }}
                  transition={{ 
                    duration: isActiveLink ? 1.4 : 0.2, 
                    ease: "easeInOut"
                  }}
                />
              </g>
            )
          })}

          {/* Draw Nodes */}
          {nodes.map((node) => {
            const isActive = currentActiveNodeId === node.id

            return (
              <motion.g 
                key={node.id}
                animate={{ 
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ duration: 0.3, type: 'spring' }}
              >
                <motion.rect 
                  x={node.x - 9} y={node.y - 6} 
                  width="18" height="12" 
                  rx="2" 
                  fill="#0f172a" 
                  stroke={isActive ? node.activeColor : node.color} 
                  strokeWidth={isActive ? "1" : "0.5"}
                  filter={isActive ? "url(#nodeGlow)" : ""}
                  animate={{
                    fill: isActive ? '#1e293b' : '#0f172a'
                  }}
                  transition={{ duration: 0.3 }}
                />
                <motion.text 
                  x={node.x} y={node.y + 1.2} 
                  textAnchor="middle" 
                  fontSize="2.5" 
                  fontWeight="900" 
                  letterSpacing="0.3"
                  animate={{
                    fill: isActive ? '#ffffff' : '#94a3b8',
                    textShadow: isActive ? `0 0 8px ${node.activeColor}` : 'none'
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {node.label}
                </motion.text>
              </motion.g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export default WorkflowAnimation
