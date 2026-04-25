import React from 'react'
import { motion } from 'framer-motion'

const WorkflowAnimation = () => {
  const nodes = [
    { id: 'create', label: 'CREATE', x: 10, y: 30, color: '#475569' }, // slate-600
    { id: 'accept', label: 'ACCEPT', x: 30, y: 30, color: '#3b82f6' }, // blue-500
    { id: 'start', label: 'START', x: 50, y: 30, color: '#6366f1' },  // indigo-500
    { id: 'check', label: 'CHECK', x: 70, y: 30, color: '#f59e0b' },  // amber-500
    { id: 'complete', label: 'COMPLETE', x: 90, y: 30, color: '#10b981' }, // emerald-500
    { id: 'recheck', label: 'RECHECK', x: 70, y: 70, color: '#ef4444' } // red-500
  ]

  const links = [
    { source: 'create', target: 'accept', color: '#3b82f6' },
    { source: 'accept', target: 'start', color: '#6366f1' },
    { source: 'start', target: 'check', color: '#f59e0b' },
    { source: 'check', target: 'complete', color: '#10b981' },
    { source: 'check', target: 'recheck', color: '#ef4444', path: 'M 72 40 L 72 60' }, // Down to recheck
    { source: 'recheck', target: 'check', color: '#f59e0b', path: 'M 68 60 L 68 40', dashed: true } // Up to check
  ]

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
              // Start outside the node box (approx 9 wide, 6 high)
              const startX = s.x + nx * 9
              const startY = s.y + ny * 6
              const endX = t.x - nx * 9
              const endY = t.y - ny * 6
              d = `M ${startX} ${startY} L ${endX} ${endY}`
            }

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
                  filter="url(#glow)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ 
                    duration: 1.5, 
                    ease: "linear", 
                    repeat: Infinity, 
                    repeatDelay: 0.5,
                    delay: i * 0.3 
                  }}
                />
              </g>
            )
          })}

          {/* Draw Nodes */}
          {nodes.map((node) => (
            <motion.g 
              key={node.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
            >
              <rect 
                x={node.x - 9} y={node.y - 6} 
                width="18" height="12" 
                rx="2" 
                fill="#0f172a" 
                stroke={node.color} 
                strokeWidth="0.5"
                className="drop-shadow-lg"
              />
              <text 
                x={node.x} y={node.y + 1.5} 
                textAnchor="middle" 
                fill="#e2e8f0" 
                fontSize="3" 
                fontWeight="bold" 
                letterSpacing="0.2"
                style={{ textShadow: `0 0 5px ${node.color}` }}
              >
                {node.label}
              </text>
            </motion.g>
          ))}
        </svg>
      </div>
    </div>
  )
}

export default WorkflowAnimation
