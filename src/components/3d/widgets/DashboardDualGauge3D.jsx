import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../../context/AppContext';

/**
 * DashboardDualGauge3D Component
 * Thẻ thứ 3 chia làm 2 chỉ số độc lập:
 * 1. Tổng số giờ làm lấy từ PERSONAL \ time sheet
 * 2. Tổng số giờ làm lấy từ PERSONAL \ list
 * 
 * Đồng bộ phong cách team-card, kính mờ, parallax 3D tilt và tự động đổi màu theo theme.
 */
const DashboardDualGauge3D = ({
  // 1. Dữ liệu từ PERSONAL \ time sheet
  timesheetHours = 0,
  timesheetPercentage = 0,
  timesheetLabel = 'GIỜ TIME SHEET',
  timesheetSublabel = 'PERSONAL \\ TIME SHEET',
  timesheetGradient = ['#4f46e5', '#3b82f6', '#06b6d4'],

  // 2. Dữ liệu từ PERSONAL \ list
  listHours = 0,
  listPercentage = 0,
  listLabel = 'GIỜ TASK LIST',
  listSublabel = 'PERSONAL \\ LIST',
  listGradient = ['#4f46e5', '#3b82f6', '#06b6d4'],

  isDark: propIsDark
}) => {
  const { theme } = useApp?.() || {};
  const isDark = propIsDark !== undefined ? propIsDark : (theme === 'DARK' || theme === 'GALAXY');

  const [tilt, setTilt] = useState({ rotX: 0, rotY: 0, glowX: 50, glowY: 50 });
  const cardRef = useRef(null);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  const tsOffset = circumference - (Math.min(Math.max(0, timesheetPercentage), 100) / 100) * circumference;
  const listOffset = circumference - (Math.min(Math.max(0, listPercentage), 100) / 100) * circumference;

  const handlePointerMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const normX = (x / rect.width) * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;

    setTilt({
      rotY: normX * 12,
      rotX: -normY * 10,
      glowX: (x / rect.width) * 100,
      glowY: (y / rect.height) * 100
    });
  };

  const handlePointerLeave = () => {
    setTilt({ rotX: 0, rotY: 0, glowX: 50, glowY: 50 });
  };

  const formatHours = (val) => {
    const num = Number(val) || 0;
    return num >= 1000 ? `${Math.round(num).toLocaleString('vi-VN')}h` : `${num.toFixed(1)}h`;
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="team-card relative flex flex-col justify-between !p-2.5 2xl:!p-3 transition-all duration-300 cursor-pointer overflow-hidden group select-none"
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
            ? `radial-gradient(circle 140px at ${tilt.glowX}% ${tilt.glowY}%, rgba(6, 182, 212, 0.2), transparent 70%)`
            : `radial-gradient(circle 140px at ${tilt.glowX}% ${tilt.glowY}%, rgba(79, 70, 229, 0.08), transparent 70%)`
        }}
      />

      {/* Vertical Glass Divider Between the 2 Halves */}
      <div className="absolute left-1/2 top-3 bottom-3 -translate-x-1/2 w-[1px] bg-[var(--glass-border)] opacity-60 pointer-events-none" />

      {/* Dual Columns */}
      <div className="grid grid-cols-2 gap-2 w-full h-full items-center relative z-10">
        
        {/* ── LEFT HALF: PERSONAL \ TIME SHEET ── */}
        <div className="flex flex-col items-center justify-center h-full px-1">
          {/* Gauge Torus */}
          <div
            className="relative w-[84px] h-[84px] 2xl:w-[98px] 2xl:h-[98px] flex items-center justify-center transition-transform duration-200"
            style={{ transform: 'translateZ(30px)' }}
          >
            <svg className="w-full h-full -rotate-90 select-none overflow-visible" viewBox="0 0 140 140">
              <defs>
                <linearGradient id="gauge-grad-timesheet" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={timesheetGradient[0]} />
                  <stop offset="50%" stopColor={timesheetGradient[1]} />
                  <stop offset="100%" stopColor={timesheetGradient[2]} />
                </linearGradient>

                <filter id="depth-glow-timesheet" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
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
                stroke={isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)"}
                strokeWidth="10"
                strokeDasharray="4 3"
              />

              {/* Active 3D Progress Arc */}
              <motion.circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="url(#gauge-grad-timesheet)"
                strokeWidth="11"
                strokeLinecap="round"
                filter="url(#depth-glow-timesheet)"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: tsOffset }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                style={{ strokeDasharray: circumference }}
              />
            </svg>

            {/* Readout */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none transition-transform duration-200 px-1"
              style={{ transform: 'translateZ(45px)' }}
            >
              <span className={`text-base 2xl:text-lg font-black tracking-tight truncate max-w-full text-center ${
                isDark 
                  ? 'text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.8)]' 
                  : 'text-slate-900 drop-shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
              }`}>
                {formatHours(timesheetHours)}
              </span>
              <span 
                className="text-[7.5px] 2xl:text-[8px] font-black tracking-widest uppercase truncate mt-0.5 text-cyan-600 dark:text-cyan-400"
              >
                TIME SHEET
              </span>
            </div>
          </div>

          {/* Subline */}
          <div
            className="mt-1 text-center transition-transform duration-200 select-none px-1 w-full"
            style={{ transform: 'translateZ(20px)' }}
          >
            <div className={`text-[9.5px] 2xl:text-[10.5px] font-black tracking-wider uppercase truncate ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              {timesheetLabel}
            </div>
            <div className="text-[7.5px] 2xl:text-[8px] font-mono font-bold flex items-center justify-center gap-1 mt-0.5 truncate text-cyan-600 dark:text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shrink-0" />
              <span className="truncate">{timesheetSublabel}</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT HALF: PERSONAL \ LIST ── */}
        <div className="flex flex-col items-center justify-center h-full px-1">
          {/* Gauge Torus */}
          <div
            className="relative w-[84px] h-[84px] 2xl:w-[98px] 2xl:h-[98px] flex items-center justify-center transition-transform duration-200"
            style={{ transform: 'translateZ(30px)' }}
          >
            <svg className="w-full h-full -rotate-90 select-none overflow-visible" viewBox="0 0 140 140">
              <defs>
                <linearGradient id="gauge-grad-list" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={listGradient[0]} />
                  <stop offset="50%" stopColor={listGradient[1]} />
                  <stop offset="100%" stopColor={listGradient[2]} />
                </linearGradient>

                <filter id="depth-glow-list" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
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
                stroke={isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)"}
                strokeWidth="10"
                strokeDasharray="4 3"
              />

              {/* Active 3D Progress Arc */}
              <motion.circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="url(#gauge-grad-list)"
                strokeWidth="11"
                strokeLinecap="round"
                filter="url(#depth-glow-list)"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: listOffset }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                style={{ strokeDasharray: circumference }}
              />
            </svg>

            {/* Readout */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none transition-transform duration-200 px-1"
              style={{ transform: 'translateZ(45px)' }}
            >
              <span className={`text-base 2xl:text-lg font-black tracking-tight truncate max-w-full text-center ${
                isDark 
                  ? 'text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.8)]' 
                  : 'text-slate-900 drop-shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
              }`}>
                {formatHours(listHours)}
              </span>
              <span 
                className="text-[7.5px] 2xl:text-[8px] font-black tracking-widest uppercase truncate mt-0.5 text-cyan-600 dark:text-cyan-400"
              >
                TASK LIST
              </span>
            </div>
          </div>

          {/* Subline */}
          <div
            className="mt-1 text-center transition-transform duration-200 select-none px-1 w-full"
            style={{ transform: 'translateZ(20px)' }}
          >
            <div className={`text-[9.5px] 2xl:text-[10.5px] font-black tracking-wider uppercase truncate ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              {listLabel}
            </div>
            <div className="text-[7.5px] 2xl:text-[8px] font-mono font-bold flex items-center justify-center gap-1 mt-0.5 truncate text-cyan-600 dark:text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shrink-0" />
              <span className="truncate">{listSublabel}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default React.memo(DashboardDualGauge3D);

