import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ThreeDLeaveChart = ({ summaryData = [] }) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 440 });
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // 1. Measure container width & height to make columns fill the screen
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: Math.max(900, clientWidth || 1200),
          height: Math.max(380, clientHeight || 440)
        });
      }
    };
    updateSize();

    const resizeObserver = new ResizeObserver(() => updateSize());
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 2. Vertical geometry
  const leftMargin = 50;
  const rightMargin = 30;
  const groundY = dimensions.height - 85;
  const topY = 35;
  const availableH = groundY - topY;

  const maxVal = useMemo(() => {
    const highest = Math.max(16, ...summaryData.map(u => u.allowance || 0));
    return Math.ceil(highest / 4) * 4;
  }, [summaryData]);

  const pxPerDay = availableH / maxVal;

  // 3. Horizontal spacing: scale to fit screen width
  const count = Math.max(1, summaryData.length);
  const chartW = dimensions.width - leftMargin - rightMargin;
  const slotWidth = chartW / count;
  // Make cylinder width generous: 70% of slot, capped between 36px and 68px
  const colW = Math.min(68, Math.max(36, slotWidth * 0.70));
  const rx = colW / 2;
  const ry = Math.max(5, rx * 0.28); // natural 3D cylinder vertical ellipse radius

  // Grid steps (0, 4, 8, 12, 16...)
  const gridSteps = useMemo(() => {
    const steps = [];
    for (let v = 0; v <= maxVal; v += 4) {
      steps.push(v);
    }
    return steps;
  }, [maxVal]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col select-none overflow-hidden">
      {/* 3D Cylindrical SVG Canvas */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            {/* ── 3D Cylindrical Purple Gradients (Remaining Days Core) ── */}
            <linearGradient id="purpleCylBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4338ca" />
              <stop offset="18%" stopColor="#a5b4fc" />
              <stop offset="42%" stopColor="#818cf8" />
              <stop offset="75%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#312e81" />
            </linearGradient>

            {/* Purple Top Ellipse Cap */}
            <radialGradient id="purpleCylCap" cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#e0e7ff" />
              <stop offset="50%" stopColor="#a5b4fc" />
              <stop offset="100%" stopColor="#6366f1" />
            </radialGradient>

            {/* ── 3D Green Glass Cylindrical Gradients (Total Allowance Overlay Tube) ── */}
            <linearGradient id="greenGlassCylBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(4, 120, 87, 0.42)" />
              <stop offset="16%" stopColor="rgba(167, 243, 208, 0.45)" />
              <stop offset="38%" stopColor="rgba(52, 211, 153, 0.18)" />
              <stop offset="70%" stopColor="rgba(16, 185, 129, 0.22)" />
              <stop offset="100%" stopColor="rgba(4, 120, 87, 0.48)" />
            </linearGradient>

            {/* Green Glass Top Rim Ellipse */}
            <radialGradient id="greenGlassCylCap" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="rgba(167, 243, 208, 0.65)" />
              <stop offset="60%" stopColor="rgba(52, 211, 153, 0.40)" />
              <stop offset="100%" stopColor="rgba(5, 150, 105, 0.60)" />
            </radialGradient>

            {/* Neon Glow Filter on Hover */}
            <filter id="cylNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ── 1. Isometric 3D Grid Lines ── */}
          {gridSteps.map(val => {
            const y = groundY - val * pxPerDay;
            return (
              <g key={`cyl_grid_${val}`} className="opacity-35">
                <line
                  x1={leftMargin - 15}
                  y1={y}
                  x2={dimensions.width - rightMargin + 10}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="text-slate-300 dark:text-slate-700"
                />
                <text
                  x={leftMargin - 22}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[11px] font-bold fill-slate-400 dark:fill-slate-500"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* ── 2. Ground Baseline ── */}
          <line
            x1={leftMargin - 20}
            y1={groundY}
            x2={dimensions.width - rightMargin + 15}
            y2={groundY}
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-slate-300 dark:text-slate-700"
          />

          {/* ── 3. Render 3D Cylinders for each User ── */}
          {summaryData.map((u, i) => {
            const cx = leftMargin + i * slotWidth + slotWidth / 2;
            const totalH = (u.allowance || 0) * pxPerDay;
            const remH = (u.remaining || 0) * pxPerDay;
            const yTotal = groundY - totalH;
            const yRem = groundY - remH;
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={`cyl_${u.id || i}`}
                className="cursor-pointer"
                onMouseEnter={(e) => {
                  setHoveredIdx(i);
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                }}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* ── Ground Ellipse Shadow ── */}
                <ellipse
                  cx={cx}
                  cy={groundY + ry * 0.7}
                  rx={rx * 1.15}
                  ry={ry * 0.85}
                  fill="rgba(0, 0, 0, 0.28)"
                />

                {/* ── LAYER A: 3D Purple Core Cylinder (Remaining Days) ── */}
                {u.remaining > 0 && (
                  <g filter={isHovered ? 'url(#cylNeonGlow)' : undefined}>
                    {/* Purple Cylinder Body */}
                    <path
                      d={`
                        M ${cx - rx},${yRem}
                        L ${cx - rx},${groundY}
                        A ${rx} ${ry} 0 0 0 ${cx + rx},${groundY}
                        L ${cx + rx},${yRem}
                        A ${rx} ${ry} 0 0 1 ${cx - rx},${yRem}
                        Z
                      `}
                      fill="url(#purpleCylBody)"
                      stroke="#4338ca"
                      strokeWidth="0.8"
                    />

                    {/* Bottom Rim Arc */}
                    <path
                      d={`M ${cx - rx},${groundY} A ${rx} ${ry} 0 0 0 ${cx + rx},${groundY}`}
                      fill="none"
                      stroke="#312e81"
                      strokeWidth="1"
                    />

                    {/* Purple Top Ellipse Cap */}
                    <ellipse
                      cx={cx}
                      cy={yRem}
                      rx={rx}
                      ry={ry}
                      fill="url(#purpleCylCap)"
                      stroke="#c7d2fe"
                      strokeWidth="1.2"
                    />
                  </g>
                )}

                {/* ── LAYER B: 3D Green Glass Cylinder Tube (Total Allowance Overlay) ── */}
                {/* Overlays the purple cylinder like a protective glass capsule */}
                <g filter={isHovered ? 'url(#cylNeonGlow)' : undefined}>
                  {/* Glass Cylinder Body */}
                  <path
                    d={`
                      M ${cx - rx},${yTotal}
                      L ${cx - rx},${groundY}
                      A ${rx} ${ry} 0 0 0 ${cx + rx},${groundY}
                      L ${cx + rx},${yTotal}
                      A ${rx} ${ry} 0 0 1 ${cx - rx},${yTotal}
                      Z
                    `}
                    fill="url(#greenGlassCylBody)"
                    stroke="#10b981"
                    strokeWidth={isHovered ? 2 : 1.5}
                  />

                  {/* Vertical Glossy Highlight Stripe down the curved glass cylinder */}
                  <line
                    x1={cx - rx * 0.55}
                    y1={yTotal + ry * 1.2}
                    x2={cx - rx * 0.55}
                    y2={groundY - ry * 0.8}
                    stroke="rgba(255, 255, 255, 0.48)"
                    strokeWidth={Math.max(1.5, colW * 0.08)}
                    strokeLinecap="round"
                  />

                  {/* Secondary subtle highlight on right edge */}
                  <line
                    x1={cx + rx * 0.65}
                    y1={yTotal + ry * 1.5}
                    x2={cx + rx * 0.65}
                    y2={groundY - ry}
                    stroke="rgba(255, 255, 255, 0.22)"
                    strokeWidth={Math.max(1, colW * 0.04)}
                    strokeLinecap="round"
                  />

                  {/* Bottom Glass Rim Arc */}
                  <path
                    d={`M ${cx - rx},${groundY} A ${rx} ${ry} 0 0 0 ${cx + rx},${groundY}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={1.5}
                  />

                  {/* Top Glass Rim Ellipse Cap */}
                  <ellipse
                    cx={cx}
                    cy={yTotal}
                    rx={rx}
                    ry={ry}
                    fill="url(#greenGlassCylCap)"
                    stroke="#34d399"
                    strokeWidth={isHovered ? 2.2 : 1.6}
                  />
                </g>

                {/* ── 4. X-Axis Staff Name ── */}
                <g transform={`translate(${cx}, ${groundY + ry + 16})`}>
                  <text
                    x={0}
                    y={0}
                    transform="rotate(38)"
                    textAnchor="start"
                    className={`text-[11px] font-bold transition-all ${
                      isHovered
                        ? 'fill-indigo-500 font-black scale-105'
                        : 'fill-slate-600 dark:fill-slate-300'
                    }`}
                  >
                    {u.name}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── 3D Floating Tooltip ── */}
      <AnimatePresence>
        {hoveredIdx !== null && summaryData[hoveredIdx] && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              left: tooltipPos.x,
              top: tooltipPos.y - 130,
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
              zIndex: 100,
              padding: '10px',
              borderRadius: '5px'
            }}
            className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700/70 shadow-2xl text-xs flex flex-col gap-1.5 min-w-[195px]"
          >
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-1">
              <span className="font-extrabold text-white text-sm">
                {summaryData[hoveredIdx].name}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-[3px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {summaryData[hoveredIdx].team}
              </span>
            </div>

            <div className="flex items-center justify-between text-emerald-400 font-semibold">
              <span>Total Allowance:</span>
              <span className="font-bold text-white">
                {summaryData[hoveredIdx].allowance}d
              </span>
            </div>

            <div className="flex items-center justify-between text-indigo-400 font-semibold">
              <span>Remaining:</span>
              <span className="font-bold text-white">
                {summaryData[hoveredIdx].remaining}d
              </span>
            </div>

            <div className="flex items-center justify-between text-rose-400 font-semibold">
              <span>Used:</span>
              <span className="font-bold text-white">
                {summaryData[hoveredIdx].used}d
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3D Chart Legend ── */}
      <div className="flex items-center justify-center gap-8 pt-2.5 border-t border-[var(--border)] mt-1">
        <div className="flex items-center gap-2">
          <div className="relative w-4 h-4 rounded-full bg-indigo-500 border border-indigo-400 shadow-sm" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Remaining Days
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-4 h-4 rounded-full bg-emerald-500/25 border-2 border-emerald-500 shadow-sm" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Total Allowance
          </span>
        </div>
      </div>
    </div>
  );
};

export default ThreeDLeaveChart;
