import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FileText, MessageSquare, Plus, PenTool, CheckCircle2, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

// ==================== MOCK DATA ====================
const MOCK_PROJECTS = [
  { id: 'P1', name: 'NMK Tower', code: 'PROJ-01', color: '#3B82F6' },
  { id: 'P2', name: 'Ocean Villa', code: 'PROJ-02', color: '#10B981' },
  { id: 'P3', name: 'Rincovitch HQ', code: 'PROJ-03', color: '#F59E0B' }
];

const MOCK_DRAWINGS = {
  'P1': [
    { id: 'D1', number: 'S-01', title: 'Ground Floor Slab Layout', rev: 'P1', date: '2026-05-15' },
    { id: 'D2', number: 'S-02', title: 'Typical Details', rev: 'P2', date: '2026-05-16' },
    { id: 'D3', number: 'S-03', title: 'Column Schedule', rev: 'T1', date: '2026-05-18' }
  ],
  'P2': [
    { id: 'D4', number: 'A-01', title: 'Front Elevation', rev: 'P1', date: '2026-05-10' }
  ]
};

const MOCK_MARKUPS = {
  'D1': [
    { id: 'M1', author: 'Minh', text: 'Add 12mm rebar to edge', status: 'Pending', date: '2026-05-17' },
    { id: 'M2', author: 'Khoa', text: 'Check concrete grade on note 3', status: 'Done', date: '2026-05-18' }
  ],
  'D2': [
    { id: 'M3', author: 'Tung', text: 'Update title block logo', status: 'Done', date: '2026-05-19' }
  ],
  'D3': [
    { id: 'M4', author: 'Lan', text: 'Missing column C4 dims', status: 'Pending', date: '2026-05-20' },
    { id: 'M5', author: 'Khoa', text: 'Verify grid offset', status: 'Pending', date: '2026-05-21' }
  ]
};

export default function DrawingsManager() {
  const { theme, dashboardProjects } = useApp();
  const isDark = theme === 'GALAXY' || theme === 'DARK';

  const projects = dashboardProjects && dashboardProjects.length > 0 
    ? dashboardProjects.map((p, i) => ({
        id: p.id,
        name: p.name || 'Unnamed Project',
        code: p.key || `PROJ-${String(i+1).padStart(2, '0')}`,
        color: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][i % 5]
      }))
    : MOCK_PROJECTS;

  const [selectedProj, setSelectedProj] = useState(projects[0]?.id || null);
  
  // Deterministic mock data generators
  const getDrawings = (pid) => {
    if (!pid) return [];
    if (MOCK_DRAWINGS[pid]) return MOCK_DRAWINGS[pid]; // Fallback to initial mock if matched
    const seed = String(pid).charCodeAt(0) || 0;
    const count = (seed % 3) + 2; 
    const drawings = [];
    for (let i = 1; i <= count; i++) {
      drawings.push({
        id: `D-${pid}-${i}`, number: `S-0${i}`,
        title: ['Ground Floor Layout', 'Typical Details', 'Column Schedule', 'Roof Plan'][i % 4],
        rev: ['P1', 'P2', 'T1', 'C1'][i % 4], date: `2026-05-${10 + i}`
      });
    }
    return drawings;
  };

  const getMarkups = (did) => {
    if (!did) return [];
    if (MOCK_MARKUPS[did]) return MOCK_MARKUPS[did];
    const seed = String(did).charCodeAt(did.length - 1) || 0;
    const count = (seed % 3) + 1; 
    const markups = [];
    for (let i = 1; i <= count; i++) {
      markups.push({
        id: `M-${did}-${i}`,
        author: ['Minh', 'Khoa', 'Tung', 'Lan'][i % 4],
        text: ['Add 12mm rebar', 'Check concrete grade', 'Update title block logo', 'Verify grid dimensions'][i % 4],
        status: i % 2 === 0 ? 'Done' : 'Pending', date: `2026-05-${15 + i}`
      });
    }
    return markups;
  };

  const currentDrawings = getDrawings(selectedProj);
  const [selectedDraw, setSelectedDraw] = useState(currentDrawings[0]?.id || null);
  const currentMarkups = getMarkups(selectedDraw);

  const containerRef = useRef(null);
  const [lines, setLines] = useState([]);

  const projRefs = useRef({});
  const drawRefs = useRef({});
  const markRefs = useRef({});

  const updateLines = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines = [];

    // 1. Line from Proj -> Drawings
    if (selectedProj && projRefs.current[selectedProj] && currentDrawings.length > 0) {
      const pNode = projRefs.current[selectedProj];
      if (pNode) {
        const pRect = pNode.getBoundingClientRect();
        const startX = pRect.right - containerRect.left;
        const startY = pRect.top - containerRect.top + pRect.height / 2;

        currentDrawings.forEach(d => {
          const dNode = drawRefs.current[d.id];
          if (dNode) {
            const dRect = dNode.getBoundingClientRect();
            const endX = dRect.left - containerRect.left;
            const endY = dRect.top - containerRect.top + dRect.height / 2;
            newLines.push({ id: `p-${d.id}`, startX, startY, endX, endY, type: 'draw', color: '#3B82F6' });
          }
        });
      }
    }

    // 2. Line from Draw -> Markups
    if (selectedDraw && drawRefs.current[selectedDraw] && currentMarkups.length > 0) {
      const dNode = drawRefs.current[selectedDraw];
      if (dNode) {
        const dRect = dNode.getBoundingClientRect();
        const startX = dRect.right - containerRect.left;
        const startY = dRect.top - containerRect.top + dRect.height / 2;

        currentMarkups.forEach(m => {
          const mNode = markRefs.current[m.id];
          if (mNode) {
            const mRect = mNode.getBoundingClientRect();
            const endX = mRect.left - containerRect.left;
            const endY = mRect.top - containerRect.top + mRect.height / 2;
            const color = m.status === 'Done' ? '#10B981' : '#F59E0B';
            newLines.push({ id: `d-${m.id}`, startX, startY, endX, endY, type: 'mark', color });
          }
        });
      }
    }

    setLines(newLines);
  };

  useLayoutEffect(() => {
    const timer = setTimeout(updateLines, 50); 
    window.addEventListener('resize', updateLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateLines);
    };
  }, [selectedProj, selectedDraw]);

  // Handle selections
  const handleSelectProj = (pid) => {
    setSelectedProj(pid);
    const newDrawings = getDrawings(pid);
    setSelectedDraw(newDrawings[0]?.id || null);
  };

  const drawCurve = (x1, y1, x2, y2) => {
    const cp = Math.abs(x2 - x1) / 2;
    return `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`;
  };

  return (
    <div 
      style={{ margin: '24px', width: 'calc(100% - 48px)', height: 'calc(100vh - 140px)' }}
      className={`rounded-2xl overflow-hidden relative flex flex-col shadow-sm ${isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-[#F8FAFC] border-slate-200'} border`}
    >
      
      {/* Header */}
      <div className={`px-6 py-4 flex items-center justify-between z-10 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'} border-b backdrop-blur-md`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <PenTool size={20} />
          </div>
          <div>
            <h1 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Drawing Issues</h1>
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Visual Blueprint Engine</p>
          </div>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-indigo-600 transition-colors">
          <Plus size={16} /> New Drawing
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-auto p-8" ref={containerRef}>
        
        {/* SVG Connectors */}
        <svg className="absolute inset-0 pointer-events-none w-full h-full" style={{ zIndex: 0 }}>
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <style>{`
            @keyframes comet {
              0% { stroke-dashoffset: 1000; }
              100% { stroke-dashoffset: 0; }
            }
          `}</style>
          
          <AnimatePresence>
            {lines.map((line) => (
              <motion.g 
                key={line.id}
                initial={{ opacity: 0, pathLength: 0 }}
                animate={{ opacity: 1, pathLength: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {/* Base Line */}
                <path 
                  d={drawCurve(line.startX, line.startY, line.endX, line.endY)}
                  fill="none"
                  stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'}
                  strokeWidth="2"
                />
                {/* Animated Comet Line */}
                <path 
                  d={drawCurve(line.startX, line.startY, line.endX, line.endY)}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="2"
                  strokeDasharray="50 1000"
                  strokeDashoffset="1000"
                  strokeLinecap="round"
                  style={{ animation: 'comet 1.5s linear infinite' }}
                />
              </motion.g>
            ))}
          </AnimatePresence>
        </svg>

        {/* Columns Grid */}
        <div className="relative z-10 flex gap-20 items-start min-h-full pl-6 md:pl-12">
          
          {/* COLUMN 1: PROJECTS */}
          <div className="flex flex-col gap-4 w-64 shrink-0">
            <h3 className={`text-xs font-black uppercase tracking-widest pl-2 mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>1. Projects</h3>
            <div className="flex flex-col gap-3" style={{ paddingLeft: '30px' }}>
              {projects.map(proj => {
                const active = selectedProj === proj.id;
                return (
                  <div key={proj.id} className="relative mb-2 mt-2">
                    {/* Card Body */}
                    <div 
                      ref={el => projRefs.current[proj.id] = el}
                      onClick={() => handleSelectProj(proj.id)}
                      className={`py-4 pr-4 rounded-2xl border-2 transition-all cursor-pointer min-h-[72px] flex flex-col justify-center ${
                        active 
                        ? `border-[${proj.color}] bg-[${proj.color}]/10 shadow-lg` 
                        : `${isDark ? 'border-slate-800 bg-slate-800/50 hover:border-slate-700' : 'border-slate-200 bg-white hover:border-slate-300'}`
                      }`}
                      style={{
                        paddingLeft: '64px',
                        ...(active ? { borderColor: proj.color, background: `${proj.color}15`, boxShadow: `0 10px 30px -10px ${proj.color}50` } : {})
                      }}
                    >
                      <div className="flex items-center">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${isDark ? 'bg-slate-900/50 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                          {proj.code}
                        </span>
                      </div>
                      <h4 className={`text-sm font-bold mt-1.5 leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{proj.name}</h4>
                    </div>

                    {/* Floating Icon (Overlapping) */}
                    <div 
                      className={`absolute -left-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md pointer-events-none transition-transform duration-300 ${active ? 'scale-110 shadow-lg' : 'scale-100'}`}
                      style={{ background: proj.color, boxShadow: active ? `0 10px 20px -5px ${proj.color}80` : '' }}
                    >
                      <Folder size={24} strokeWidth={2.5} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMN 2: DRAWINGS */}
          <div className="flex flex-col gap-4 w-72 shrink-0">
            <AnimatePresence mode="wait">
              <motion.div key={selectedProj} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col gap-4">
                <h3 className={`text-xs font-black uppercase tracking-widest pl-2 mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>2. Blueprints</h3>
                {currentDrawings.map(draw => {
                  const active = selectedDraw === draw.id;
                  return (
                    <div 
                      key={draw.id} 
                      ref={el => drawRefs.current[draw.id] = el}
                      onClick={() => setSelectedDraw(draw.id)}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                        active 
                        ? (isDark ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20' : 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-500/20')
                        : (isDark ? 'border-slate-800 bg-slate-800/50 hover:border-slate-700' : 'border-slate-200 bg-white hover:border-slate-300')
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-2.5 rounded-lg shrink-0 ${active ? 'bg-indigo-500 text-white' : (isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500')}`}>
                          <FileText size={18} />
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-md ${isDark ? 'bg-slate-900 text-indigo-400' : 'bg-slate-100 text-indigo-600'}`}>{draw.number}</span>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>REV {draw.rev}</span>
                        </div>
                      </div>
                      <h4 className={`text-sm font-bold mb-2.5 leading-tight pr-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{draw.title}</h4>
                      <p className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{draw.date}</p>
                    </div>
                  );
                })}
                {currentDrawings.length === 0 && (
                  <div className={`p-6 rounded-2xl border-2 border-dashed text-center ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
                    No drawings uploaded yet.
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* COLUMN 3: MARKUPS */}
          <div className="flex flex-col gap-4 w-80 shrink-0 pr-4">
            <AnimatePresence mode="wait">
              <motion.div key={selectedDraw} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col gap-4">
                <h3 className={`text-xs font-black uppercase tracking-widest pl-2 mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>3. Active Markups</h3>
                {currentMarkups.map(mark => {
                  const isDone = mark.status === 'Done';
                  const color = isDone ? '#10B981' : '#F59E0B';
                  return (
                    <div 
                      key={mark.id} 
                      ref={el => markRefs.current[mark.id] = el}
                      className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'} shadow-sm`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0`} style={{ background: color }}>
                            {mark.author.charAt(0)}
                          </div>
                          <span className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{mark.author}</span>
                        </div>
                        <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-md`} style={{ background: `${color}15`, color }}>
                          {isDone ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          {mark.status}
                        </span>
                      </div>
                      <div className={`p-4 rounded-xl text-sm font-medium leading-relaxed ${isDark ? 'bg-slate-900/50 text-slate-300' : 'bg-slate-50 text-slate-700'}`}>
                        "{mark.text}"
                      </div>
                      <div className={`text-[10px] font-bold mt-4 text-right uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Logged: {mark.date}
                      </div>
                    </div>
                  );
                })}
                {currentMarkups.length === 0 && (
                  <div className={`p-6 rounded-2xl border-2 border-dashed text-center ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
                    No markups on this drawing.
                  </div>
                )}
                
                {/* Add Markup Button */}
                {selectedDraw && (
                  <button className={`w-full p-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-bold transition-colors ${isDark ? 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10' : 'border-indigo-200 text-indigo-500 hover:bg-indigo-50'}`}>
                    <MessageSquare size={16} /> Log New Markup
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}
