import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const BuildingAnimation = ({ progress: externalProgress }) => {
  const [internalProgress, setInternalProgress] = useState(0);

  // Digital build progress count loop (fallback if externalProgress is not provided)
  useEffect(() => {
    if (externalProgress !== undefined) return;
    const interval = setInterval(() => {
      setInternalProgress((prev) => {
        if (prev >= 100) return 0;
        return +(prev + 0.1).toFixed(1);
      });
    }, 40);
    return () => clearInterval(interval);
  }, [externalProgress]);

  const progress = externalProgress !== undefined ? externalProgress : internalProgress;

  return (
    <div className="relative w-full h-[400px] lg:h-[550px] flex items-center justify-center bg-[#020617] rounded-3xl overflow-hidden border border-slate-800 shadow-[inset_0_0_40px_rgba(30,41,59,0.3)] group">
      {/* CAD grid pattern background */}
      <div className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="bp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="1" />
              <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#0f172a" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bp-grid)" />
        </svg>
      </div>

      {/* Cyber ambient radial glow */}
      <div className="absolute w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-[80px] pointer-events-none -translate-y-10 group-hover:bg-indigo-500/15 transition-all duration-1000"></div>

      {/* Main SVG Blueprint Workspace */}
      <svg 
        viewBox="0 0 500 500" 
        className="w-[90%] h-[90%] select-none z-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="soft-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <style>{`
          /* Structural assembly & line drawing */
          .bp-line {
            stroke-dasharray: 600;
            stroke-dashoffset: 600;
            animation: drawLine 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          .bp-line-fast {
            stroke-dasharray: 400;
            stroke-dashoffset: 400;
            animation: drawLine 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          .bp-structure {
            transform-origin: bottom;
            animation: growStructure 8s cubic-bezier(0.25, 1, 0.5, 1) infinite;
          }
          .bp-facade {
            animation: fadeGlass 8s ease-in-out infinite;
          }
          
          /* Scaffold Bracing Hatch */
          .bp-scaffold {
            stroke-dasharray: 10, 5;
            animation: dashScaffold 30s linear infinite;
          }

          /* Tower Crane animations */
          .crane-trolley-assembly {
            animation: craneMove 12s ease-in-out infinite;
          }
          .crane-cable {
            animation: cableExtend 12s ease-in-out infinite;
          }
          .crane-cargo {
            animation: cargoMove 12s ease-in-out infinite;
          }

          /* Laser Scan Sweeper */
          .laser-scanner {
            animation: laserSweep 5s ease-in-out infinite;
          }

          /* Floating digital nodes */
          .bp-node {
            animation: pulseNode 2s ease-in-out infinite;
          }

          @keyframes drawLine {
            0% { stroke-dashoffset: 600; opacity: 0.1; }
            30% { stroke-dashoffset: 0; opacity: 1; }
            75% { stroke-dashoffset: 0; opacity: 0.9; }
            100% { stroke-dashoffset: 0; opacity: 0; }
          }

          @keyframes growStructure {
            0% { transform: scaleY(0); opacity: 0; }
            10% { transform: scaleY(0); opacity: 0.2; }
            45% { transform: scaleY(1); opacity: 1; }
            80% { transform: scaleY(1); opacity: 1; }
            100% { transform: scaleY(1); opacity: 0; }
          }

          @keyframes fadeGlass {
            0%, 35% { fill-opacity: 0; opacity: 0; stroke-opacity: 0; }
            55% { fill-opacity: 0.08; opacity: 1; stroke-opacity: 0.6; }
            80% { fill-opacity: 0.12; opacity: 1; stroke-opacity: 0.8; }
            100% { fill-opacity: 0; opacity: 0; stroke-opacity: 0; }
          }

          @keyframes dashScaffold {
            to { stroke-dashoffset: -1000; }
          }

          @keyframes craneMove {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(-160px); }
          }

          @keyframes cableExtend {
            0%, 100% { y2: 300; }
            45%, 55% { y2: 240; }
          }

          @keyframes cargoMove {
            0%, 100% { transform: translate(0, 0); opacity: 1; }
            45%, 55% { transform: translate(-160px, -60px); opacity: 0.2; }
          }

          @keyframes laserSweep {
            0% { transform: translateY(0); opacity: 0; }
            10%, 90% { opacity: 0.8; }
            50% { transform: translateY(270px); opacity: 0.8; }
            100% { transform: translateY(300px); opacity: 0; }
          }

          @keyframes pulseNode {
            0%, 100% { r: 2; opacity: 0.4; }
            50% { r: 4.5; opacity: 1; }
          }
        `}</style>

        {/* ================= BACKGROUND AXIS LINES ================= */}
        <g stroke="#1e293b" strokeWidth="0.5" opacity="0.5">
          <line x1="50" y1="440" x2="450" y2="440" />
          <line x1="60" y1="80" x2="60" y2="450" />
          <line x1="440" y1="80" x2="440" y2="450" />
        </g>

        {/* ================= BUILDING STRUCTURE UNDER CONSTRUCTION ================= */}
        
        {/* Semi-transparent Concrete/Glass Facade Panels */}
        <g stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.4" fill="#0ea5e9" className="bp-facade">
          <rect x="110" y="370" width="60" height="70" />
          <rect x="170" y="370" width="60" height="70" />
          <rect x="230" y="370" width="60" height="70" />
          
          <rect x="170" y="300" width="60" height="70" />
          <rect x="230" y="300" width="60" height="70" />
          
          <rect x="110" y="230" width="60" height="70" />
          <rect x="170" y="230" width="60" height="70" />
        </g>

        {/* Scaffolding Hatch & Cross Bracings (Structural CAD layout) */}
        <g stroke="#0284c7" strokeWidth="0.5" className="bp-scaffold" opacity="0.3">
          {/* Diagonal truss lattices */}
          <line x1="110" y1="440" x2="170" y2="370" />
          <line x1="170" y1="440" x2="110" y2="370" />
          <line x1="170" y1="440" x2="230" y2="370" />
          <line x1="230" y1="440" x2="170" y2="370" />
          <line x1="230" y1="440" x2="290" y2="370" />
          <line x1="290" y1="440" x2="230" y2="370" />
          
          <line x1="110" y1="370" x2="170" y2="300" />
          <line x1="170" y1="370" x2="110" y2="300" />
          <line x1="170" y1="300" x2="230" y2="230" />
          <line x1="230" y1="300" x2="170" y2="230" />
        </g>

        {/* Structural Steel Framework (Columns & Beams growing upward) */}
        <g stroke="#38bdf8" strokeWidth="2.5" fill="none" className="bp-structure" filter="url(#glow)">
          {/* Vertical Columns */}
          <line x1="110" y1="440" x2="110" y2="160" />
          <line x1="170" y1="440" x2="170" y2="160" />
          <line x1="230" y1="440" x2="230" y2="160" />
          <line x1="290" y1="440" x2="290" y2="160" />

          {/* Horizontal Floor Slabs */}
          <line x1="110" y1="440" x2="290" y2="440" stroke="#6366f1" strokeWidth="4" />
          <line x1="110" y1="370" x2="290" y2="370" />
          <line x1="110" y1="300" x2="290" y2="300" />
          <line x1="110" y1="230" x2="290" y2="230" />
          <line x1="110" y1="160" x2="290" y2="160" stroke="#f43f5e" strokeWidth="2" /> {/* Topmost deck roof */}
        </g>

        {/* Blueprint drawing wireframe overlay */}
        <g stroke="#06b6d4" strokeWidth="1.2" fill="none" className="bp-line">
          {/* Detailed outer frame elements */}
          <rect x="105" y="155" width="190" height="290" strokeOpacity="0.4" />
          <path d="M 110 160 L 200 70 L 290 160" stroke="#06b6d4" strokeDasharray="5,5" /> {/* Triangular roof pitch guideline */}
        </g>

        {/* ================= TOWER CRANE ASSEMBLY ================= */}
        <g stroke="#e2e8f0" strokeWidth="1.5" fill="none">
          {/* Tower Mast (Right side, stable anchoring) */}
          <g stroke="#cbd5e1" opacity="0.6">
            <line x1="390" y1="440" x2="390" y2="100" />
            <line x1="410" y1="440" x2="410" y2="100" />
            {/* Mast lattice cross-beams */}
            <path d="M 390 440 L 410 420 M 390 420 L 410 440 M 390 400 L 410 380 M 390 380 L 410 400 M 390 360 L 410 340 M 390 340 L 410 360 M 390 320 L 410 300 M 390 300 L 410 320 M 390 280 L 410 260 M 390 260 L 410 280 M 390 240 L 410 220 M 390 220 L 410 240 M 390 200 L 410 180 M 390 180 L 410 200 M 390 160 L 410 140 M 390 140 L 410 160 M 390 120 L 410 100 M 390 100 L 410 120" strokeWidth="1" />
          </g>

          {/* Crane Cabin (Stays at the mast head) */}
          <rect x="382" y="80" width="36" height="20" rx="3" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" filter="url(#soft-glow)" />
          <circle cx="395" cy="90" r="2.5" fill="#f59e0b" className="animate-pulse" />

          {/* Horizontal Jib & Counterweight */}
          <line x1="210" y1="80" x2="460" y2="80" stroke="#f59e0b" strokeWidth="3" filter="url(#glow)" />
          <line x1="430" y1="80" x2="430" y2="95" stroke="#cbd5e1" strokeWidth="2" />
          <rect x="420" y="95" width="20" height="15" fill="#475569" rx="2" /> {/* Counterweight block */}

          {/* Jib upper tension tie ropes */}
          <line x1="400" y1="60" x2="260" y2="80" stroke="#cbd5e1" strokeWidth="1" />
          <line x1="400" y1="60" x2="450" y2="80" stroke="#cbd5e1" strokeWidth="1" />
          <line x1="400" y1="60" x2="400" y2="80" stroke="#cbd5e1" strokeWidth="1.5" />

          {/* Crane Trolley & Cable Assembly (Animated) */}
          <g className="crane-trolley-assembly">
            {/* The moving trolley wheel mount */}
            <rect x="350" y="77" width="16" height="6" fill="#f59e0b" />
            
            {/* The hoist cable lifting/lowering */}
            <line x1="358" y1="83" x2="358" y2="280" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" className="crane-cable" />

            {/* Crane Cargo / Girder Block under assembly */}
            <g className="crane-cargo" filter="url(#glow)">
              {/* Slings/Rigging lines */}
              <line x1="358" y1="240" x2="340" y2="265" stroke="#94a3b8" strokeWidth="1.2" />
              <line x1="358" y1="240" x2="376" y2="265" stroke="#94a3b8" strokeWidth="1.2" />
              
              {/* Heavy concrete I-beam girder being assembled */}
              <line x1="330" y1="265" x2="386" y2="265" stroke="#f43f5e" strokeWidth="5.5" strokeLinecap="round" />
              <line x1="335" y1="265" x2="381" y2="265" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
              
              {/* Assembly text note */}
              <text x="325" y="252" fill="#f43f5e" fontSize="8" fontWeight="bold" className="font-mono">ALIGNING BEAM</text>
            </g>
          </g>
        </g>

        {/* ================= BLUEPRINT SCAFFOLD SCANNER SWEEPER ================= */}
        <g className="laser-scanner" filter="url(#glow)">
          <line x1="80" y1="150" x2="330" y2="150" stroke="#06b6d4" strokeWidth="2.5" strokeOpacity="0.8" />
          <polygon points="80,150 90,140 320,140 330,150 320,160 90,160" fill="url(#laser-gradient)" opacity="0.15" />
        </g>

        {/* Gradients definitions */}
        <defs>
          <linearGradient id="laser-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ================= INTERACTIVE DIGITAL CAD CALLOUT NODES ================= */}
        <g fill="#10b587" stroke="#10b587" strokeWidth="1" filter="url(#glow)">
          {/* Floor nodes */}
          <circle cx="110" cy="440" r="3" className="bp-node" />
          <circle cx="290" cy="440" r="3" className="bp-node" />
          <circle cx="110" cy="370" r="3" className="bp-node" />
          <circle cx="290" cy="370" r="3" className="bp-node" />
          <circle cx="110" cy="300" r="3" className="bp-node" />
          <circle cx="290" cy="300" r="3" className="bp-node" />
          <circle cx="110" cy="230" r="3" className="bp-node" />
          <circle cx="290" cy="230" r="3" className="bp-node" />
          <circle cx="110" cy="160" r="3" className="bp-node" />
          <circle cx="290" cy="160" r="3" className="bp-node" />
        </g>

        {/* Digital node measurement text labels (CAD aesthetic) */}
        <g fill="#0ea5e9" fontSize="8" fontFamily="monospace" opacity="0.7">
          <text x="70" y="373" className="font-bold">FLR 01 | 3700</text>
          <text x="70" y="303" className="font-bold">FLR 02 | 7400</text>
          <text x="70" y="233" className="font-bold">FLR 03 | 11100</text>
          <text x="70" y="163" fill="#f43f5e" className="font-bold">DECK | 14800</text>

          {/* Coordinate callouts */}
          <text x="120" y="152">[X: 110, Y: 160]</text>
          <text x="240" y="295">[X: 290, Y: 300]</text>
        </g>
      </svg>

      {/* ================= HIGH-TECH METADATA OVERLAYS (CAD LOOK) ================= */}
      
      {/* Top Left: BIM Status */}
      <div className="absolute top-6 left-6 font-mono text-[9px] tracking-widest text-slate-400/80 flex flex-col gap-1 z-20">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>BIM MODEL: RUNNING</span>
        </div>
        <div className="text-blue-400 font-bold">PROJECT: RINCO_OFFICE_V4</div>
        <div className="text-[8px] text-slate-500">SYS: AUTODESK_BRIDGE_ACTIVE</div>
      </div>

      {/* Top Right: Real-time dynamic build progress */}
      <div className="absolute top-6 right-6 font-mono text-[10px] text-right text-slate-400/80 flex flex-col gap-0.5 z-20">
        <div className="text-slate-500">BUILD PROGRESS</div>
        <div className="text-[14px] font-black text-cyan-400 tracking-wider transition-all">
          {progress.toFixed(1)}%
        </div>
        <div className="text-[8px] text-rose-400 font-semibold animate-pulse">
          STAGE_03: STRUCTURAL_ASSEMBLY
        </div>
      </div>

      {/* Bottom Left: Live structural calculations */}
      <div className="absolute bottom-6 left-6 font-mono text-[8px] text-slate-500 flex flex-col gap-0.5 z-20">
        <div>SYS_TEMP: 24.8°C | LOAD_FACTOR: 1.02</div>
        <div className="flex gap-2 text-cyan-500/80">
          <span>H: 14800mm</span>
          <span>W: 18000mm</span>
          <span>SPAN: 6000mm</span>
        </div>
      </div>

      {/* Bottom Right: Digital design guidelines */}
      <div className="absolute bottom-6 right-6 font-mono text-[8px] text-right text-slate-500 z-20">
        <div>GRID_REF: A-1 / B-4</div>
        <div>SCALE: 1:100 @ A3</div>
        <div className="text-emerald-500 font-bold">AUTO_SAVED</div>
      </div>
    </div>
  );
};

export default BuildingAnimation;
