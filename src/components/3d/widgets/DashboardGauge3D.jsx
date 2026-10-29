import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../../context/AppContext';

/**
 * DashboardGauge3D Component
 * 3D Holographic KPI Gauge with CSS 3D Perspective Parallax Tilt & Deep Multi-layer Rings
 * Adapts to Light Mode (pure white card & clean neumorphic contrast) and Dark/Galaxy Mode.
 * 
 * @param {number} percentage - Completion percentage (0 - 100)
 * @param {string} label - Metric label (e.g., 'Financial (%)')
 * @param {string} value - Formatted value string (e.g., '49.9%')
 */
const DashboardGauge3D = ({ 
  percentage = 75, 
  label = 'WEEKLY COMPLETION', 
  value = '75%',
  tag = '3D METRIC',
  sublabel = 'REAL-TIME LIVE',
  gradient = ['#4f46e5', '#3b82f6', '#06b6d4'],
  isDark: propIsDark
}) => {
  const { theme } = useApp?.() || {};
  const isDark = propIsDark !== undefined ? propIsDark : (theme === 'DARK' || theme === 'GALAXY');

  const [tilt, setTilt] = useState({ rotX: 0, rotY: 0, glowX: 50, glowY: 50 });
  const cardRef = useRef(null);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(Math.max(0, percentage), 100) / 100) * circumference;

  const handlePointerMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const normX = (x / rect.width) * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;

    setTilt({
      rotY: normX * 14,
      rotX: -normY * 12,
      glowX: (x / rect.width) * 100,
      glowY: (y / rect.height) * 100
    });
  };

  const handlePointerLeave = () => {
    setTilt({ rotX: 0, rotY: 0, glowX: 50, glowY: 50 });
  };

  const safeId = label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="team-card relative flex flex-col items-center justify-center !p-2.5 2xl:!p-3 transition-all duration-300 cursor-pointer overflow-hidden group"
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
        transform: `rotateX(${tilt.rotX}deg) rotateY(${tilt.rotY}deg)`
      }}
    >
      {/* Dynamic 3D Specular Light Glint */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: isDark
            ? `radial-gradient(circle 120px at ${tilt.glowX}% ${tilt.glowY}%, rgba(6, 182, 212, 0.2), transparent 70%)`
            : `radial-gradient(circle 120px at ${tilt.glowX}% ${tilt.glowY}%, rgba(79, 70, 229, 0.08), transparent 70%)`
        }}
      />

      {/* 3D Multi-Layered Gauge Torus */}
      <div
        className="relative w-[98px] h-[98px] 2xl:w-[114px] 2xl:h-[114px] flex items-center justify-center transition-transform duration-200"
        style={{ transform: 'translateZ(30px)' }}
      >
        <svg className="w-full h-full -rotate-90 select-none overflow-visible" viewBox="0 0 140 140">
          <defs>
            {/* 3D Gradient */}
            <linearGradient id={`gauge-grad-${safeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradient[0] || '#06b6d4'} />
              <stop offset="50%" stopColor={gradient[1] || '#6366f1'} />
              <stop offset="100%" stopColor={gradient[2] || '#10b981'} />
            </linearGradient>

            {/* Depth Drop Shadow Filter */}
            <filter id={`depth-glow-${safeId}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Outer Ring */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={isDark ? "rgba(30, 41, 59, 0.6)" : "rgba(226, 232, 240, 0.9)"}
            strokeWidth="10"
            strokeDasharray="4 3"
          />

          {/* Active 3D Progress Arc with Glow */}
          <motion.circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={`url(#gauge-grad-${safeId})`}
            strokeWidth="11"
            strokeLinecap="round"
            filter={`url(#depth-glow-${safeId})`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              strokeDasharray: circumference
            }}
          />
        </svg>

        {/* Center Floating 3D Metric Readout */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none transition-transform duration-200 px-1"
          style={{ transform: 'translateZ(45px)' }}
        >
          <span className={`text-xl 2xl:text-2xl font-black tracking-tight truncate max-w-full text-center ${
            isDark 
              ? 'text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]' 
              : 'text-slate-900 drop-shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
          }`}>
            {value}
          </span>
          <span 
            className="text-[8px] font-black tracking-widest uppercase drop-shadow-sm truncate mt-0.5 text-cyan-600 dark:text-cyan-400"
          >
            {tag}
          </span>
        </div>
      </div>

      {/* Label and high-tech subline */}
      <div
        className="mt-1.5 text-center transition-transform duration-200 select-none px-2 w-full"
        style={{ transform: 'translateZ(20px)' }}
      >
        <div className={`text-[10px] 2xl:text-[11px] font-black tracking-wider uppercase truncate ${
          isDark ? 'text-slate-300' : 'text-slate-700'
        }`}>
          {label}
        </div>
        <div className={`text-[8.5px] font-mono font-bold flex items-center justify-center gap-1 mt-0.5 truncate ${
          isDark ? 'text-cyan-400' : 'text-cyan-600'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${
            isDark ? 'bg-cyan-400' : 'bg-cyan-500'
          }`} />
          <span className="truncate">{sublabel}</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DashboardGauge3D);
