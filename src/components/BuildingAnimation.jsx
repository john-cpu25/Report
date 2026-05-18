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

  // --- DYNAMIC 3D ISOMETRIC BIM STRUCTURAL CALCULATIONS ---
  // Ground center base is at (250, 360) in isometric space
  // Full height of structural columns is 180px
  const currentHeight = Math.min((progress / 100) * 180, 180);
  const currentYOffset = currentHeight; // The upward growth vector

  // Define 9 structural columns in a 3D Isometric Grid (3x3 Layout)
  const columns = [
    { id: 'col-back', bx: 250, by: 260, label: 'C-09' },
    { id: 'col-mid-bl', bx: 198, by: 290, label: 'C-08' },
    { id: 'col-mid-br', bx: 302, by: 290, label: 'C-07' },
    { id: 'col-left', bx: 146, by: 320, label: 'C-06' },
    { id: 'col-center', bx: 250, by: 320, label: 'C-05' },
    { id: 'col-right', bx: 354, by: 320, label: 'C-04' },
    { id: 'col-mid-fl', bx: 198, by: 350, label: 'C-03' },
    { id: 'col-mid-fr', bx: 302, by: 350, label: 'C-02' },
    { id: 'col-front', bx: 250, by: 380, label: 'C-01' },
  ];

  // Define structural beams connecting the columns in 3D isometric space
  const beams = [
    // Left-diagonal axes (j-axis)
    { from: { x: 250, y: 260 }, to: { x: 198, y: 290 } },
    { from: { x: 198, y: 290 }, to: { x: 146, y: 320 } },
    { from: { x: 302, y: 290 }, to: { x: 250, y: 320 } },
    { from: { x: 250, y: 320 }, to: { x: 198, y: 350 } },
    { from: { x: 354, y: 320 }, to: { x: 302, y: 350 } },
    { from: { x: 302, y: 350 }, to: { x: 250, y: 380 } },

    // Right-diagonal axes (i-axis)
    { from: { x: 250, y: 260 }, to: { x: 302, y: 290 } },
    { from: { x: 302, y: 290 }, to: { x: 354, y: 320 } },
    { from: { x: 198, y: 290 }, to: { x: 250, y: 320 } },
    { from: { x: 250, y: 320 }, to: { x: 302, y: 350 } },
    { from: { x: 146, y: 320 }, to: { x: 198, y: 350 } },
    { from: { x: 198, y: 350 }, to: { x: 302, y: 350 } }, // cross grid
    { from: { x: 198, y: 350 }, to: { x: 250, y: 380 } },
  ];

  // Structural progress variables
  const showFloor1 = progress >= 20;
  const showFloor2 = progress >= 45;
  const showFloor3 = progress >= 70;
  const showRoof = progress >= 90;
  const showRoofTruss = progress >= 95;

  // 3D Glass Facade wall panels (glowing isometric polygons)
  const showFacade1 = progress >= 35;
  const showFacade2 = progress >= 60;
  const showFacade3 = progress >= 80;

  // Active scaffolding lattices (3D diagonal braces)
  const showScaffold1 = progress >= 5 && progress < 40;
  const showScaffold2 = progress >= 30 && progress < 65;
  const showScaffold3 = progress >= 55 && progress < 85;
  const showScaffold4 = progress >= 75 && progress < 97;

  // 3D Isometric Tower Crane positioning
  // Mast base is at back-right (380, 260), jib stretches diagonally to building center
  const isCraneActive = progress < 98;
  const cargoY = Math.max(320 - currentYOffset - 18, 100);

  return (
    <div className="relative w-full h-[400px] lg:h-[550px] flex items-center justify-center bg-[#020617] rounded-3xl overflow-hidden border border-slate-800 shadow-[inset_0_0_40px_rgba(30,41,59,0.3)] group">
      {/* CAD grid pattern background */}
      <div className="absolute inset-0 opacity-30 mix-blend-screen pointer-events-none">
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
      <div className="absolute w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[90px] pointer-events-none -translate-y-10 group-hover:bg-cyan-500/15 transition-all duration-1000"></div>

      {/* Main SVG Blueprint Workspace */}
      <svg 
        viewBox="0 0 500 500" 
        className="w-[92%] h-[92%] select-none z-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
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
          .bp-line-3d {
            stroke-dasharray: 400;
            stroke-dashoffset: 400;
            animation: drawLine3D 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          
          /* Scaffold Bracing Hatch */
          .bp-scaffold-3d {
            stroke-dasharray: 8, 4;
            animation: dashScaffold3D 25s linear infinite;
          }

          /* Laser Scan Sweeper */
          .laser-scanner-3d {
            animation: laserSweep3D 6s ease-in-out infinite;
          }

          /* Floating digital nodes */
          .bp-node-3d {
            animation: pulseNode3D 2s ease-in-out infinite;
          }

          @keyframes drawLine3D {
            0% { stroke-dashoffset: 400; opacity: 0.1; }
            30% { stroke-dashoffset: 0; opacity: 1; }
            75% { stroke-dashoffset: 0; opacity: 0.9; }
            100% { stroke-dashoffset: 0; opacity: 0; }
          }

          @keyframes dashScaffold3D {
            to { stroke-dashoffset: -500; }
          }

          @keyframes laserSweep3D {
            0% { transform: translateY(0); opacity: 0; }
            10%, 90% { opacity: 0.75; }
            50% { transform: translateY(220px); opacity: 0.75; }
            100% { transform: translateY(260px); opacity: 0; }
          }

          @keyframes pulseNode3D {
            0%, 100% { r: 2; opacity: 0.4; }
            50% { r: 4; opacity: 1; }
          }
        `}</style>

        {/* ================= BACKGROUND 3D ISOMETRIC AXIS GRID ================= */}
        <g stroke="#1e293b" strokeWidth="0.5" opacity="0.4" fill="none">
          {/* Ground Grid lines (Isometric 3D perspective floor grid) */}
          <polygon points="250,260 354,320 250,380 146,320" stroke="#0ea5e9" strokeWidth="1" strokeOpacity="0.3" fill="#0f172a" fillOpacity="0.2" />
          <line x1="198" y1="290" x2="302" y2="350" />
          <line x1="302" y1="290" x2="198" y2="350" />
          <line x1="250" y1="320" x2="250" y2="380" />
          
          {/* Vertical axis anchors */}
          <line x1="250" y1="80" x2="250" y2="440" strokeDasharray="3,3" />
          <line x1="146" y1="80" x2="146" y2="440" strokeDasharray="5,5" />
          <line x1="354" y1="80" x2="354" y2="440" strokeDasharray="5,5" />
        </g>

        {/* ================= 3D GLASS FACADE WALL PANELS ================= */}
        <g stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.4" fill="#06b6d4" fillOpacity="0.08">
          {/* Floor 1 Facade Wall Panels (Left & Front-Left isometric walls) */}
          {showFacade1 && (
            <g>
              {/* Back-left wall segment */}
              <polygon points="146,320 198,350 198,300 146,270" />
              {/* Front-left wall segment */}
              <polygon points="198,350 250,380 250,330 198,300" fillOpacity="0.12" strokeWidth="1.5" />
            </g>
          )}
          {/* Floor 2 Facade Wall Panels */}
          {showFacade2 && (
            <g>
              <polygon points="250,330 302,300 302,250 250,280" />
              <polygon points="302,300 354,270 354,220 302,250" fillOpacity="0.1" />
            </g>
          )}
          {/* Floor 3 Facade Wall Panels */}
          {showFacade3 && (
            <g>
              <polygon points="198,250 250,280 250,230 198,200" />
            </g>
          )}
        </g>

        {/* ================= 3D SCAFFOLDING DIAGONAL TRUSSES ================= */}
        <g stroke="#0284c7" strokeWidth="0.5" className="bp-scaffold-3d" opacity="0.3" fill="none">
          {/* Level 1 Scaffold Truss Bracings */}
          {showScaffold1 && (
            <g>
              <line x1="146" y1="320" x2="198" y2="290 - 50" />
              <line x1="198" y1="320" x2="146" y2="320 - 50" />
              <line x1="198" y1="350" x2="250" y2="350 - 50" />
              <line x1="250" y1="350" x2="198" y2="350 - 50" />
            </g>
          )}
          {/* Level 2 Scaffold Truss Bracings */}
          {showScaffold2 && (
            <g>
              <line x1="250" y1="320 - 50" x2="302" y2="290 - 100" />
              <line x1="302" y1="290 - 50" x2="250" y2="320 - 100" />
              <line x1="302" y1="350 - 50" x2="354" y2="320 - 100" />
              <line x1="354" y1="320 - 50" x2="302" y2="350 - 100" />
            </g>
          )}
          {/* Level 3 Scaffold Truss Bracings */}
          {showScaffold3 && (
            <g>
              <line x1="198" y1="290 - 100" x2="250" y2="320 - 150" />
              <line x1="250" y1="320 - 100" x2="198" y2="290 - 150" />
            </g>
          )}
        </g>

        {/* ================= 3D STRUCTURAL STEEL FRAMEWORK ================= */}
        {/* Columns & Floor Plates growing dynamically */}
        <g stroke="#38bdf8" fill="none" filter="url(#glow)">
          
          {/* 9 Vertical Columns - Heights grow dynamically up to (by - currentYOffset) */}
          {columns.map((col) => (
            <line 
              key={col.id} 
              x1={col.bx} 
              y1={col.by} 
              x2={col.bx} 
              y2={col.by - currentYOffset} 
              strokeWidth="2.5" 
              stroke={col.id === 'col-center' ? '#6366f1' : '#38bdf8'}
            />
          ))}

          {/* Floor 1 Slab Plates (Isometric diamond plane at h=50) */}
          {showFloor1 && (
            <g>
              <polygon points="250,210 354,270 250,330 146,270" stroke="#38bdf8" strokeWidth="2.2" fill="#0ea5e9" fillOpacity="0.05" />
              {/* Internal Floor Beams */}
              <line x1="198" y1="240" x2="302" y2="300" strokeWidth="1.5" />
              <line x1="302" y1="240" x2="198" y2="300" strokeWidth="1.5" />
            </g>
          )}

          {/* Floor 2 Slab Plates (Isometric diamond plane at h=100) */}
          {showFloor2 && (
            <g>
              <polygon points="250,160 354,220 250,280 146,220" stroke="#38bdf8" strokeWidth="2.2" fill="#0ea5e9" fillOpacity="0.05" />
              <line x1="198" y1="190" x2="302" y2="250" strokeWidth="1.5" />
              <line x1="302" y1="190" x2="198" y2="250" strokeWidth="1.5" />
            </g>
          )}

          {/* Floor 3 Slab Plates (Isometric diamond plane at h=150) */}
          {showFloor3 && (
            <g>
              <polygon points="250,110 354,170 250,230 146,170" stroke="#38bdf8" strokeWidth="2.2" fill="#0ea5e9" fillOpacity="0.05" />
              <line x1="198" y1="140" x2="302" y2="200" strokeWidth="1.5" />
              <line x1="302" y1="140" x2="198" y2="200" strokeWidth="1.5" />
            </g>
          )}

          {/* Roof Deck Plate (Isometric diamond plane at h=180) */}
          {showRoof && (
            <g>
              <polygon points="250,80 354,140 250,200 146,140" stroke="#f43f5e" strokeWidth="3" fill="#fda4af" fillOpacity="0.1" />
              <line x1="198" y1="110" x2="302" y2="170" stroke="#f43f5e" strokeWidth="2" />
              <line x1="302" y1="110" x2="198" y2="170" stroke="#f43f5e" strokeWidth="2" />
            </g>
          )}
        </g>

        {/* 3D Wireframe outline guides (Fades out when complete) */}
        {progress < 100 && (
          <g stroke="#06b6d4" strokeWidth="0.8" fill="none" opacity="0.25" strokeDasharray="3,3">
            {/* Box frame projection */}
            <polygon points="250,80 354,140 250,200 146,140" />
            <line x1="146" y1="140" x2="146" y2="320" />
            <line x1="354" y1="140" x2="354" y2="320" />
            <line x1="250" y1="200" x2="250" y2="380" />
            <line x1="250" y1="80" x2="250" y2="260" />
          </g>
        )}

        {/* Triangular structural pitch crown truss (3D isometric roof pitch!) */}
        {showRoofTruss && (
          <g stroke="#10b587" strokeWidth="1.5" fill="none" opacity="0.9" filter="url(#glow)">
            {/* Front pitch */}
            <path d="M 146,140 L 250,30 L 354,140" />
            {/* Center strut */}
            <line x1="250" y1="30" x2="250" y2="200" strokeDasharray="3,3" />
            {/* Diagonal depth bracing */}
            <line x1="250" y1="30" x2="250" y2="80" stroke="#10b587" />
            {/* Crown node beacon */}
            <circle cx="250" cy="30" r="4.5" fill="#f43f5e" className="animate-ping" />
            <circle cx="250" cy="30" r="3" fill="#f43f5e" />
          </g>
        )}

        {/* ================= 3D ISOMETRIC TOWER CRANE ASSEMBLY ================= */}
        <g stroke="#cbd5e1" strokeWidth="1.5" fill="none">
          {/* Tower Mast (Right-back corner, stable foundation) */}
          <g stroke="#cbd5e1" opacity="0.4">
            <line x1="390" y1="410" x2="390" y2="90" />
            <line x1="410" y1="410" x2="410" y2="90" />
            <path d="M 390 410 L 410 390 M 390 390 L 410 410 M 390 370 L 410 350 M 390 350 L 410 370 M 390 330 L 410 310 M 390 310 L 410 330 M 390 290 L 410 270 M 390 270 L 410 290 M 390 250 L 410 230 M 390 230 L 410 250 M 390 210 L 410 190 M 390 190 L 410 210 M 390 170 L 410 150 M 390 150 L 410 170 M 390 130 L 410 110 M 390 110 L 410 130" strokeWidth="0.8" />
          </g>

          {/* Crane Cabin */}
          <rect x="382" y="70" width="36" height="20" rx="3" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" filter="url(#soft-glow)" />
          <circle cx="395" cy="80" r="2.5" fill="#f59e0b" className="animate-pulse" />

          {/* 3D Diagonal Jib stretching across the 3D grid center */}
          {/* Streches along isometric angle from (440, 50) to mast center (400, 70) down to grid center (250, 145) */}
          <line x1="220" y1="155" x2="450" y2="45" stroke="#f59e0b" strokeWidth="3" filter="url(#glow)" />
          <line x1="425" y1="55" x2="425" y2="70" stroke="#cbd5e1" strokeWidth="2" />
          <rect x="415" y="70" width="20" height="15" fill="#475569" rx="2" /> {/* Counterweight */}

          {/* 3D Jib support cable ties */}
          <line x1="400" y1="45" x2="280" y2="128" stroke="#cbd5e1" strokeWidth="1" />
          <line x1="400" y1="45" x2="440" y2="50" stroke="#cbd5e1" strokeWidth="1" />
          <line x1="400" y1="45" x2="400" y2="70" stroke="#cbd5e1" strokeWidth="1.5" />

          {/* 3D Cable & Girder Lift Hoist Assembly */}
          {isCraneActive && (
            <g>
              {/* Hoist Trolley positioned right over grid center (250, 140) */}
              <rect x="242" y="137" width="16" height="6" fill="#f59e0b" transform="rotate(15 250 140)" />
              
              {/* Cable extends straight down dynamically to cargoY! */}
              <line x1="250" y1="143" x2="250" y2={cargoY} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />

              {/* Crane Girder in 3D Isometric Projection */}
              <g filter="url(#glow)">
                {/* Rigging slings */}
                <line x1="250" y1={cargoY} x2="224" y2={cargoY + 18} stroke="#cbd5e1" strokeWidth="1.2" />
                <line x1="250" y1={cargoY} x2="276" y2={cargoY + 18} stroke="#cbd5e1" strokeWidth="1.2" />

                {/* 3D Girder Bar aligned with the isometric right axis (dx=26, dy=15) */}
                <line x1="220" y1={cargoY + 18} x2="280" y2={cargoY + 18} stroke="#f43f5e" strokeWidth="5.5" strokeLinecap="round" />
                <line x1="225" y1={cargoY + 18} x2="275" y2={cargoY + 18} stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />

                {/* BIM Structural callout note */}
                <text x="210" y={cargoY + 8} fill="#f43f5e" fontSize="7" fontWeight="bold" fontFamily="monospace">
                  LIFTING 3D_BEAM
                </text>
              </g>
            </g>
          )}
        </g>



        {/* ================= INTERACTIVE CAD CALLOUT NODES (3D Anchors) ================= */}
        <g fill="#10b587" stroke="#10b587" strokeWidth="1" filter="url(#glow)">
          {/* Base Grid Anchors */}
          <circle cx="250" cy="380" r="3" className="bp-node-3d" />
          <circle cx="146" cy="320" r="2.5" className="bp-node-3d" />
          <circle cx="354" cy="320" r="2.5" className="bp-node-3d" />

          {/* Active growing top nodes */}
          {columns.map((col) => (
            <circle 
              key={`top-${col.id}`} 
              cx={col.bx} 
              cy={col.by - currentYOffset} 
              r="2.5" 
              fill={progress === 100 ? '#10b587' : '#f43f5e'} 
              stroke={progress === 100 ? '#10b587' : '#fff'}
            />
          ))}
        </g>

        {/* Digital CAD labels in 3D perspective */}
        <g fill="#0ea5e9" fontSize="8" fontFamily="monospace" opacity="0.6">
          {showFloor1 && <text x="100" y="273" className="font-bold">LVL 01 | +3700</text>}
          {showFloor2 && <text x="100" y="223" className="font-bold">LVL 02 | +7400</text>}
          {showFloor3 && <text x="100" y="173" className="font-bold">LVL 03 | +11100</text>}
          {showRoof && <text x="100" y="143" fill="#f43f5e" className="font-bold">ROOF | +14800</text>}

          {/* Live coordinate updates */}
          <text x="310" y="112">{`[Z: ${Math.round(currentYOffset * 48)}mm]`}</text>
          <text x="50" y="325">{`[BIM_NODE: ${Math.round(progress)}%]`}</text>
        </g>
      </svg>

      {/* ================= HIGH-TECH METADATA OVERLAYS (CAD LOOK) ================= */}
      
      {/* Top Left: BIM Status */}
      <div className="absolute top-6 left-6 font-mono text-[9px] tracking-widest text-slate-400/80 flex flex-col gap-1 z-20">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${progress === 100 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          <span>{progress === 100 ? 'BIM 3D: AS-BUILT OK' : 'BIM 3D: ASSEMBLY ACTIVE'}</span>
        </div>
        <div className="text-cyan-400 font-bold">MODEL: RINCO_STRUCTURAL_3D</div>
        <div className="text-[8px] text-slate-500">SYS: DIRECT_AUTODESK_COLLABORATION</div>
      </div>

      {/* Top Right: Real-time dynamic build progress */}
      <div className="absolute top-6 right-6 font-mono text-[10px] text-right text-slate-400/80 flex flex-col gap-0.5 z-20">
        <div className="text-slate-500">3D VECTOR PROGRESS</div>
        <div className="text-[14px] font-black text-indigo-400 tracking-wider transition-all">
          {progress.toFixed(1)}%
        </div>
        <div className="text-[8px] text-rose-400 font-semibold animate-pulse">
          {progress === 100 ? 'SYS: SECURE_READY' : `CALCULATING_WEIGHTS...`}
        </div>
      </div>

      {/* Bottom Left: Live structural calculations */}
      <div className="absolute bottom-6 left-6 font-mono text-[8px] text-slate-500 flex flex-col gap-0.5 z-20">
        <div>{`SYS_TEMP: 22.4°C | 3D_PROJECTION: ISOMETRIC_30`}</div>
        <div className="flex gap-2 text-cyan-500/80">
          <span>{`H_EXTRUDED: ${Math.round(currentYOffset * 82.2)}mm`}</span>
          <span>GRID: 3x3_COLUMNS</span>
        </div>
      </div>

      {/* Bottom Right: Digital design guidelines */}
      <div className="absolute bottom-6 right-6 font-mono text-[8px] text-right text-slate-500 z-20">
        <div>COORDINATE: ISOMETRIC_BIM</div>
        <div>RENDER_MODE: WIREFRAME_GLOW</div>
        <div className="text-emerald-500 font-bold">{progress === 100 ? 'AS-BUILT VALIDATED' : 'STAGING_SAVED'}</div>
      </div>
    </div>
  );
};

export default BuildingAnimation;
