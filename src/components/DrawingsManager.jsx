import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FileText, MessageSquare, Plus, PenTool, CheckCircle2, Clock, Edit2, Trash2, Search } from 'lucide-react';
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

  const projects = React.useMemo(() => {
    return dashboardProjects && dashboardProjects.length > 0 
      ? dashboardProjects.map((p, i) => ({
          id: p.id,
          name: p.name || 'Unnamed Project',
          code: p.key || `PROJ-${String(i+1).padStart(2, '0')}`,
          color: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][i % 5]
        }))
      : MOCK_PROJECTS;
  }, [dashboardProjects]);

  const [selectedProj, setSelectedProj] = useState(projects[0]?.id || null);
  const [projectSearch, setProjectSearch] = useState('');
  
  // Sync selectedProj if projects change or search filters out the selected one
  useEffect(() => {
    if (projects.length > 0 && !selectedProj) {
      setSelectedProj(projects[0].id);
    }
  }, [projects]);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) || 
    p.code.toLowerCase().includes(projectSearch.toLowerCase())
  );
  
  // Initialize drawings state with a merge of MOCK and Generated data to ensure consistency
  const [drawings, setDrawings] = useState(() => {
    const initial = { ...MOCK_DRAWINGS };
    projects.forEach(p => {
      if (!initial[p.id]) {
        const seed = String(p.id).charCodeAt(0) || 0;
        const count = (seed % 3) + 2;
        const generated = [];
        for (let i = 1; i <= count; i++) {
          generated.push({
            id: `D-${p.id}-${i}`, number: `S-0${i}`,
            title: ['Ground Floor Layout', 'Typical Details', 'Column Schedule', 'Roof Plan'][i % 4],
            rev: ['P1', 'P2', 'T1', 'C1'][i % 4], date: `2026-05-${10 + i}`
          });
        }
        initial[p.id] = generated;
      }
    });
    return initial;
  });
  
  const getDrawings = (pid) => {
    return drawings[pid] || [];
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

  const [showAddDrawingModal, setShowAddDrawingModal] = useState(false);
  const [formData, setFormData] = useState({ number: '', title: '', rev: 'P1', status: 'Draft', date: new Date().toISOString().split('T')[0] });

  // Use memoization to ensure UI updates when drawings state changes
  const currentDrawings = React.useMemo(() => {
    if (!selectedProj) return [];
    return drawings[selectedProj] || [];
  }, [selectedProj, drawings]);

  const [selectedDraw, setSelectedDraw] = useState(null);

  // Sync selectedDraw if it becomes invalid or empty
  React.useEffect(() => {
    if (currentDrawings.length > 0) {
      if (!selectedDraw || !currentDrawings.find(d => d.id === selectedDraw)) {
        setSelectedDraw(currentDrawings[0].id);
      }
    } else {
      setSelectedDraw(null);
    }
  }, [selectedProj, currentDrawings]);

  const currentMarkups = React.useMemo(() => {
    if (!selectedDraw) return [];
    if (MOCK_MARKUPS[selectedDraw]) return MOCK_MARKUPS[selectedDraw];
    
    // Generator for other markups
    const seed = String(selectedDraw).charCodeAt(selectedDraw.length - 1) || 0;
    const count = (seed % 3) + 1; 
    const markups = [];
    for (let i = 1; i <= count; i++) {
      markups.push({
        id: `M-${selectedDraw}-${i}`,
        author: ['Minh', 'Khoa', 'Tung', 'Lan'][i % 4],
        text: ['Add 12mm rebar', 'Check concrete grade', 'Update title block logo', 'Verify grid dimensions'][i % 4],
        status: i % 2 === 0 ? 'Done' : 'Pending', date: `2026-05-${15 + i}`
      });
    }
    return markups;
  }, [selectedDraw]);

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
        // If project card is outside the scrolled container viewport, handle gracefully
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
    const timer = setTimeout(updateLines, 100); 
    window.addEventListener('resize', updateLines);
    // Listen for scroll in columns
    const columns = containerRef.current?.querySelectorAll('.overflow-auto');
    columns?.forEach(col => col.addEventListener('scroll', updateLines));

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateLines);
      columns?.forEach(col => col.removeEventListener('scroll', updateLines));
    };
  }, [selectedProj, selectedDraw, drawings, currentDrawings, currentMarkups]);

  // Handle selections
  const handleSelectProj = (pid) => {
    setSelectedProj(pid);
    // selection sync handled by useEffect
  };

  const [editingDrawing, setEditingDrawing] = useState(null);

  const handleAddDrawing = () => {
    if (!formData.title || !formData.number) {
      alert("Please fill in both Title and Sheet Number.");
      return;
    }
    
    const newId = `D-NEW-${Date.now()}`;
    const drawingObj = {
      id: newId,
      ...formData
    };

    setDrawings(prev => {
      const updated = { ...prev };
      updated[selectedProj] = [...(prev[selectedProj] || []), drawingObj];
      return updated;
    });

    setSelectedDraw(newId);
    setShowAddDrawingModal(false);
    setFormData({ number: '', title: '', rev: 'P1', status: 'Draft', date: new Date().toISOString().split('T')[0] });
  };

  const handleDeleteDrawing = (id) => {
    if (!window.confirm("Are you sure you want to delete this drawing?")) return;
    
    setDrawings(prev => {
      const updated = { ...prev };
      updated[selectedProj] = (prev[selectedProj] || []).filter(d => d.id !== id);
      return updated;
    });

    if (selectedDraw === id) {
      setSelectedDraw(null);
    }
  };

  const handleEditDrawing = (draw) => {
    setFormData({ ...draw });
    setEditingDrawing(draw.id);
    setShowAddDrawingModal(true);
  };

  const handleUpdateDrawing = () => {
    if (!formData.title || !formData.number) return;

    setDrawings(prev => {
      const updated = { ...prev };
      updated[selectedProj] = (prev[selectedProj] || []).map(d => 
        d.id === editingDrawing ? { ...d, ...formData } : d
      );
      return updated;
    });

    setShowAddDrawingModal(false);
    setEditingDrawing(null);
    setFormData({ number: '', title: '', rev: 'P1', status: 'Draft', date: new Date().toISOString().split('T')[0] });
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
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAddDrawingModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-indigo-600 transition-colors"
          >
            <Plus size={16} /> New Drawing
          </button>
        </div>
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
          <div className="flex flex-col gap-4 w-64 shrink-0 h-full">
            <h3 className={`text-xs font-black uppercase tracking-widest pl-2 mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>1. Projects</h3>
            
            {/* Search Bar */}
            <div className="px-2 mb-2">
              <div className={`relative flex items-center rounded-xl border-2 transition-all ${isDark ? 'bg-slate-900 border-slate-800 focus-within:border-indigo-500' : 'bg-white border-slate-200 focus-within:border-indigo-500'}`}>
                <Search size={14} className="absolute left-3 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Search projects..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 bg-transparent outline-none text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto flex flex-col gap-3 pr-2 scrollbar-hide" style={{ paddingLeft: '30px', maxHeight: 'calc(100vh - 300px)' }}>
              {filteredProjects.map(proj => {
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
          <div className="flex flex-col gap-4 w-72 shrink-0 h-full overflow-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            <AnimatePresence mode="wait">
              <motion.div key={selectedProj} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col gap-4">
                <div className="flex items-center justify-between pl-2 mb-2 pr-4">
                  <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>2. Blueprints</h3>
                  <button 
                    onClick={() => setShowAddDrawingModal(true)}
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isDark ? 'bg-slate-800 text-indigo-400 hover:bg-slate-700' : 'bg-slate-200 text-indigo-600 hover:bg-slate-300'}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {currentDrawings.map(draw => {
                  const active = selectedDraw === draw.id;
                  return (
                    <div 
                      key={draw.id} 
                      ref={el => drawRefs.current[draw.id] = el}
                      onClick={() => setSelectedDraw(draw.id)}
                      className={`rounded-2xl border-2 transition-all cursor-pointer relative group overflow-hidden ${
                        active 
                        ? (isDark ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20' : 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-500/20')
                        : (isDark ? 'border-slate-800 bg-slate-800/50 hover:border-slate-700' : 'border-slate-200 bg-white hover:border-slate-300')
                      }`}
                      style={{ padding: '24px 20px 24px 24px' }}
                    >
                      {/* Action Buttons (Hover) */}
                      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditDrawing(draw); }}
                          className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-indigo-400' : 'bg-slate-200 hover:bg-slate-300 text-indigo-600'}`}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteDrawing(draw.id); }}
                          className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-700 hover:bg-red-900/50 text-red-400' : 'bg-red-100 hover:bg-red-200 text-red-600'}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="flex flex-col gap-2">
                        <h4 className={`text-base font-black leading-tight pr-12 ${active ? 'text-indigo-500' : (isDark ? 'text-white' : 'text-slate-900')}`}>{draw.title}</h4>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>REV {draw.rev}</span>
                          <span className={`text-[11px] font-bold tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{draw.date}</span>
                        </div>
                      </div>
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
          <div className="flex flex-col gap-4 w-80 shrink-0 pr-4 h-full overflow-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 220px)' }}>
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
                      className={`rounded-2xl border transition-all overflow-hidden ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'} shadow-sm`}
                      style={{ padding: '24px 20px 20px 24px' }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 shadow-sm`} style={{ background: color }}>
                            {mark.author.charAt(0)}
                          </div>
                          <span className={`text-sm font-black ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{mark.author}</span>
                        </div>
                        <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full`} style={{ background: `${color}15`, color }}>
                          {isDone ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          {mark.status}
                        </span>
                      </div>
                      <div className={`p-4 rounded-xl text-sm font-semibold leading-relaxed border-l-4`} 
                           style={{ borderColor: color, backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : '#f8fafc', marginLeft: '4px' }}>
                        "{mark.text}"
                      </div>
                      <div className={`text-[10px] font-black mt-4 text-right uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {mark.date}
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

      {/* Add/Edit Drawing Modal */}
      <AnimatePresence>
        {showAddDrawingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowAddDrawingModal(false); setEditingDrawing(null); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-100'}`}
              style={{ padding: '32px' }}
            >
              <h2 className={`text-2xl font-black mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {editingDrawing ? 'Edit Drawing' : 'Add New Drawing'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Drawing Title</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Ground Floor Plan" 
                    className={`w-full rounded-xl border-2 outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`} 
                    style={{ padding: '12px 20px' }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Sheet No.</label>
                    <input 
                      type="text" 
                      value={formData.number}
                      onChange={(e) => setFormData({...formData, number: e.target.value})}
                      placeholder="S-01" 
                      className={`w-full rounded-xl border-2 outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`} 
                      style={{ padding: '12px 20px' }}
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Revision</label>
                    <input 
                      type="text" 
                      value={formData.rev}
                      onChange={(e) => setFormData({...formData, rev: e.target.value})}
                      placeholder="P1" 
                      className={`w-full rounded-xl border-2 outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`} 
                      style={{ padding: '12px 20px' }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Status</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className={`w-full rounded-xl border-2 outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                      style={{ padding: '12px 20px' }}
                    >
                      <option>Draft</option>
                      <option>Approved</option>
                      <option>In Review</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Date</label>
                    <input 
                      type="date" 
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className={`w-full rounded-xl border-2 outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`} 
                      style={{ padding: '12px 20px' }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => { setShowAddDrawingModal(false); setEditingDrawing(null); }} 
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  Cancel
                </button>
                <button 
                  onClick={editingDrawing ? handleUpdateDrawing : handleAddDrawing} 
                  className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 transition-all"
                >
                  {editingDrawing ? 'Save Changes' : 'Add Drawing'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
