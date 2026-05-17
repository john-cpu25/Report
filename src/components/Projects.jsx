import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderKanban, 
  Search, 
  Box, 
  Cpu, 
  Users, 
  Calendar, 
  ExternalLink, 
  Layers, 
  ArrowRight,
  Sparkles,
  Database,
  User,
  Crown
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import userCat from '../assets/user_cat.png';

const Projects = () => {
  const { projectsCache, setProjectsCache } = useApp();
  const [projects, setProjects] = useState(projectsCache?.projects || []);
  const [loading, setLoading] = useState(!projectsCache);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [activeCatIdx, setActiveCatIdx] = useState(0); // Start cat at index 0
  const [mouseX, setMouseX] = useState(100);
  const [isHoveringShelf, setIsHoveringShelf] = useState(false);
  const [timeFilter, setTimeFilter] = useState('MONTH');
  const [taskCounts, setTaskCounts] = useState(projectsCache?.taskCounts || {});
  const [viewMode, setViewMode] = useState('bookshelf'); // Default to bookshelf

  const shelfRef = useRef(null);
  const [shelfScrollLeft, setShelfScrollLeft] = useState(0);

  const scrollShelf = (direction) => {
    if (shelfRef.current) {
      const scrollAmount = 300;
      shelfRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (projectsCache) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [projRes, taskRes] = await Promise.all([
          supabase.from('NMK_Project').select('*').order('index', { ascending: true }),
          supabase.from('NMK_Task').select('project_id, name').limit(15000)
        ]);
        
        if (projRes.error) throw projRes.error;
        if (taskRes.error) throw taskRes.error;

        const projectsData = projRes.data || [];
        
        const counts = {};
        if (taskRes.data) {
          taskRes.data.forEach(t => {
            // Group by real database project ID UUID
            if (t.project_id) {
              counts[t.project_id] = (counts[t.project_id] || 0) + 1;
            }
            
            // Fallback split name matching for backward compatibility
            const rawName = t.name || '';
            const parts = rawName.toString().split(':');
            if (parts.length > 0) {
              const projectName = parts[0]?.trim()?.toUpperCase();
              if (projectName) counts[projectName] = (counts[projectName] || 0) + 1;
            }
          });
        }

        setProjects(projectsData);
        setTaskCounts(counts);
        setProjectsCache({ projects: projectsData, taskCounts: counts });
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectsCache]);

  const projectsWithStats = useMemo(() => {
    return projects.map(p => {
      // Fetch precise task count by UUID, fallback to split names
      let taskCount = taskCounts[p.id] || taskCounts[p.key?.toUpperCase()] || taskCounts[p.name?.toUpperCase()] || 0;
      
      return { ...p, taskCount };
    });
  }, [projects, taskCounts]);

  const filteredProjects = useMemo(() => {
    return projectsWithStats.filter(p => 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.key?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projectsWithStats, searchQuery]);

  const top10Projects = useMemo(() => {
    return [...projectsWithStats].sort((a, b) => b.taskCount - a.taskCount).slice(0, 10);
  }, [projectsWithStats]);

  const selectedProject = useMemo(() => 
    projectsWithStats.find(p => p.id === selectedId), [projectsWithStats, selectedId]
  );

  return (
    <div className="w-full mx-auto pb-[10px] relative">
      {/* Header Intelligence - Sticky */}
      <div className="sticky top-[80px] z-50 bg-[var(--bg-main)] pt-[10px] pb-[5px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-[10px] bg-[var(--bg-card)] p-[10px] rounded-[8px] border border-[var(--border)] shadow-md mx-[10px]">
          <div className="flex flex-col gap-[5px]">
            <div className="flex items-center gap-[10px]">
              <div className="w-1.5 h-8 bg-indigo-500 rounded-full" />
              <h1 className="text-[30px] font-black text-[var(--text-main)] uppercase tracking-tight">
                PROJECT
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher */}
            <div className="flex items-center gap-1 p-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg shadow-inner">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-indigo-500 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-indigo-400'}`}
                title="Grid View"
              >
                <Layers size={18} />
              </button>
              <button
                onClick={() => setViewMode('bookshelf')}
                className={`p-2 rounded-md transition-all ${viewMode === 'bookshelf' ? 'bg-indigo-500 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-indigo-400'}`}
                title="Bookshelf View"
              >
                <Layers size={18} className="rotate-90" />
              </button>
            </div>

            <div className="flex items-center bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] overflow-hidden focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all group max-w-md w-full">
              <div className="w-12 h-10 flex items-center justify-center border-r border-[var(--border)] bg-indigo-500/5 shrink-0">
                <Search className="text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors" size={18} />
              </div>
              <input 
                type="text" 
                placeholder="FILTER PROJECTS..." 
                className="flex-1 bg-transparent py-2.5 px-4 text-[14px] font-bold text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)] placeholder:font-black placeholder:tracking-[0.2em]"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[50vh] flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Syncing Supabase Database...</p>
        </div>
      ) : (
        <div className="p-[10px]">
          {/* Main Project Portfolio - Full Width */}
          <div className="w-full">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-[15px]">
                <AnimatePresence mode="popLayout">
                  {filteredProjects.map((project, idx) => (
                    <motion.div
                      key={project.id}
                      layoutId={`card-${project.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => setSelectedId(project.id)}
                      className="flex flex-col bg-white border rounded-[8px] overflow-hidden shadow-md cursor-pointer group hover:shadow-xl transition-all h-[400px]"
                      style={{ borderColor: project.color || '#0078d4' }}
                    >
                      {/* Top: Image/Logo Area (2/3 height) */}
                      <div className="h-2/3 flex items-center justify-center bg-white relative overflow-hidden">
                        {project.image ? (
                          <img 
                            src={project.image.startsWith('data:image') ? project.image : `data:image/png;base64,${project.image}`} 
                            alt={project.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : project.image_url ? (
                          <img 
                            src={project.image_url} 
                            alt={project.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="relative w-32 h-32 rotate-45 flex flex-wrap border-2 border-slate-100 shadow-2xl">
                            <div className="w-1/2 h-1/2 bg-red-600" />
                            <div className="w-1/2 h-1/2 bg-slate-300" />
                            <div className="w-1/2 h-1/2 bg-slate-800" />
                            <div className="w-1/2 h-1/2 bg-slate-400" />
                            <div className="absolute inset-0 m-auto w-6 h-6 bg-white shadow-inner" />
                          </div>
                        )}
                      </div>

                      {/* Bottom: Colored Details Area (1/3 height) */}
                      <div 
                        className="h-1/3 text-white overflow-hidden relative"
                        style={{ backgroundColor: project.color || '#1e293b' }}
                      >
                        <div className="flex flex-col gap-[10px]" style={{ margin: '20px 0 0 20px' }}>
                          <div className="flex gap-[50px] items-start leading-none">
                            <span className="w-24 text-[11px] font-black uppercase shrink-0">NAME :</span>
                            <span className="text-[11px] font-bold truncate">{project.name || 'N/A'}</span>
                          </div>
                          
                          <div className="flex gap-[50px] items-start leading-none">
                            <span className="w-24 text-[11px] font-black uppercase shrink-0">CREATEAT :</span>
                            <span className="text-[11px] font-bold">{project.created_at ? new Date(project.created_at).toLocaleDateString('vi-VN') : '24/01/2026'}</span>
                          </div>

                          <div className="flex gap-[50px] items-start leading-none">
                            <span className="w-24 text-[11px] font-black uppercase shrink-0">VERSION :</span>
                            <span className="text-[11px] font-bold">Autodesk Revit {project.revit_version || '2024'}</span>
                          </div>

                          <div className="flex gap-[50px] items-start leading-none">
                            <span className="w-24 text-[11px] font-black uppercase shrink-0">DESCRIPTION :</span>
                            <span className="text-[10px] font-medium italic opacity-90 line-clamp-2">
                              {project.description || "Core Rincovitch BIM coordination protocol."}
                            </span>
                          </div>
                        </div>

                        <div className="absolute bottom-[5px] right-[5px]">
                          <div className="px-2 py-1 bg-white/20 backdrop-blur-md rounded-[4px] text-[9px] font-black uppercase tracking-widest shadow-sm">
                            {project.taskCount || 0} Tasks
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-10 min-h-[600px] flex flex-col justify-end shadow-2xl relative group/shelf">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none rounded-2xl" />
                
                {/* Scroll Navigation Buttons - Brass Arrows */}
                {filteredProjects.length > 5 && (
                  <>
                    <button
                      onClick={() => scrollShelf('left')}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gradient-to-b from-[#78350f] to-[#451a03] hover:from-[#92400e] hover:to-[#78350f] text-amber-400 border border-[#b45309]/50 shadow-lg flex items-center justify-center z-30 transition-all active:scale-95 group/btn"
                      title="Scroll Left"
                    >
                      <ArrowRight size={18} className="rotate-180 group-hover/btn:-translate-x-0.5 transition-transform" />
                    </button>
                    
                    <button
                      onClick={() => scrollShelf('right')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gradient-to-b from-[#78350f] to-[#451a03] hover:from-[#92400e] hover:to-[#78350f] text-amber-400 border border-[#b45309]/50 shadow-lg flex items-center justify-center z-30 transition-all active:scale-95 group/btn"
                      title="Scroll Right"
                    >
                      <ArrowRight size={18} className="group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                  </>
                )}

                {/* Persistent Interactive Large Orange Tabby Jumping Cat (Outside scroll container so it never gets cropped!) */}
                <motion.div
                  className="absolute z-[100] pointer-events-none"
                  initial={{ x: 100, y: -(280 + (Math.abs(0 % 8 - 4) * 18) - 10) }}
                  animate={{ 
                    x: isHoveringShelf ? (mouseX - 70) : (() => {
                      const widths = [42, 50, 58, 46, 54, 62, 38];
                      let offset = 40; // matches px-10 (40px)
                      for (let i = 0; i < activeCatIdx; i++) {
                        offset += widths[i % widths.length] + 2;
                      }
                      return offset + (widths[activeCatIdx % widths.length] / 2) + 35 - shelfScrollLeft;
                    })(),
                    y: -((280 + (Math.abs(activeCatIdx % 8 - 4) * 18)) - 10),
                    rotate: isHoveringShelf ? 0 : [-15, 5, 0],
                    rotateY: 0
                  }}
                  transition={{
                    x: { type: "spring", stiffness: 250, damping: 30 },
                    y: { type: "spring", stiffness: 200, damping: 25 },
                    rotate: { duration: 0.6 }
                  }}
                  style={{ bottom: '40px' }}
                >
                    <img 
                      src={userCat} 
                      alt="User 3D Cat"
                      style={{ 
                        width: '140px', 
                        height: 'auto',
                        filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))'
                      }}
                    />
                </motion.div>

                {/* Scrollable Books Container */}
                <div 
                  ref={shelfRef}
                  className="w-full overflow-x-auto flex items-end justify-start gap-0.5 relative z-10 px-10 py-6 min-h-[450px] scroll-smooth rounded-2xl"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  onScroll={(e) => setShelfScrollLeft(e.currentTarget.scrollLeft)}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setMouseX(e.clientX - rect.left);
                    setIsHoveringShelf(true);
                  }}
                  onMouseEnter={() => setIsHoveringShelf(true)}
                  onMouseLeave={() => setIsHoveringShelf(false)}
                >

                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((project, idx) => (
                      <motion.div
                        key={project.id}
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ 
                          y: [0, -5, 0], 
                          opacity: 1,
                          rotateZ: idx % 12 === 0 ? [-10, -8, -10] : idx % 15 === 0 ? [5, 7, 5] : [0, 1, 0] 
                        }}
                        transition={{
                          y: { duration: 3 + (idx % 2), repeat: Infinity, ease: "easeInOut" },
                          rotateZ: { duration: 4 + (idx % 3), repeat: Infinity, ease: "easeInOut" },
                          opacity: { duration: 0.5 }
                        }}
                        onMouseEnter={() => setActiveCatIdx(idx)}
                        whileHover={{ 
                          y: -40, 
                          rotateZ: 0, 
                          scale: 1.05,
                          zIndex: 50,
                          transition: { type: "spring", stiffness: 300 }
                        }}
                        onClick={() => setSelectedId(project.id)}
                        className="relative group/book cursor-pointer shrink-0 transition-all duration-300"
                        style={{
                          width: `${[42, 50, 58, 46, 54, 62, 38][idx % 7]}px`,
                          height: `${280 + (Math.abs(idx % 8 - 4) * 18)}px`,
                          backgroundColor: project.color || '#1e293b',
                          backgroundImage: `
                            repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 1px, transparent 1px, transparent 4px),
                            repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 1px, transparent 1px, transparent 4px),
                            linear-gradient(to right, 
                              rgba(0,0,0,0.5) 0%, 
                              rgba(255,255,255,0.18) 12%, 
                              rgba(255,255,255,0.28) 20%, 
                              transparent 40%, 
                              rgba(0,0,0,0.12) 80%, 
                              rgba(0,0,0,0.55) 100%)
                          `,
                          boxShadow: 'inset -2px 0 6px rgba(0,0,0,0.45), inset 2px 0 6px rgba(255,255,255,0.3), 8px 4px 15px rgba(0,0,0,0.4)',
                          borderRadius: '3px 5px 5px 3px',
                          border: '1px solid rgba(0,0,0,0.15)',
                        }}
                      >
                        {/* Satin Headband (Cloth band at top) */}
                        <div className="absolute top-0 left-0 w-full h-[6px] bg-slate-950/70 border-b border-white/10 z-10" />

                        {/* Gold Foil Accent Stripes (Top & Bottom) */}
                        <div className="absolute top-[8%] left-0 w-full h-[2px] bg-gradient-to-r from-amber-600 via-yellow-300 to-amber-600 opacity-90 shadow-[0_1px_2px_rgba(0,0,0,0.3)] z-10" />
                        <div className="absolute top-[10%] left-0 w-full h-[1px] bg-black/40 z-10" />
                        
                        <div className="absolute bottom-[22%] left-0 w-full h-[2px] bg-gradient-to-r from-amber-600 via-yellow-300 to-amber-600 opacity-90 shadow-[0_1px_2px_rgba(0,0,0,0.3)] z-10" />
                        <div className="absolute bottom-[24%] left-0 w-full h-[1px] bg-black/40 z-10" />

                        {/* Embossed Spine Ribs (Horizontal ridges) */}
                        <div className="absolute top-[30%] left-0 w-full h-[4px] bg-black/35 border-t border-white/15 border-b border-black/50 z-10" />
                        <div className="absolute bottom-[35%] left-0 w-full h-[4px] bg-black/35 border-t border-white/15 border-b border-black/50 z-10" />

                        {/* Satin Bookmark Ribbon hanging out from bottom */}
                        {idx % 3 === 0 && (
                          <div 
                            className="absolute bottom-[-18px] left-[40%] w-[6px] h-[22px] rounded-b-[2px] z-[-1] shadow-[1px_2px_4px_rgba(0,0,0,0.4)] transition-transform duration-300 group-hover/book:translate-y-1"
                            style={{
                              backgroundColor: idx % 6 === 0 ? '#dc2626' : '#eab308',
                              transform: 'rotate(6deg)'
                            }}
                          />
                        )}

                        <div className="absolute inset-0 flex flex-col items-center py-10 px-1 z-20">
                          {/* Top Tag / Category */}
                          <div className="text-[8px] font-black text-white/50 tracking-widest uppercase mb-6 leading-none select-none">
                            {project.key?.substring(0, 3)}
                          </div>

                          <div className="flex-1 flex items-center justify-center overflow-hidden w-full px-0.5">
                            <span 
                              className="text-[10px] font-black text-white/90 uppercase whitespace-nowrap rotate-90 tracking-[0.25em] origin-center select-none"
                              style={{
                                fontFamily: idx % 2 === 0 ? 'Georgia, serif' : 'system-ui, sans-serif',
                                fontStyle: idx % 2 === 0 ? 'italic' : 'normal',
                                textShadow: '1px 1px 1px rgba(255,255,255,0.12), -1px -1px 1px rgba(0,0,0,0.65)'
                              }}
                            >
                              {project.name}
                            </span>
                          </div>

                          <div className="mt-auto flex flex-col items-center gap-3">
                            {/* Task Count Badge styled like an library catalog circle tag */}
                            <div className="w-8 h-8 rounded-full bg-slate-900/60 flex items-center justify-center border border-white/20 shadow-inner group-hover/book:border-indigo-400/50 transition-colors">
                              <span className="text-[9px] font-black text-indigo-300 tracking-tighter pr-0.5">{project.taskCount || 0}</span>
                            </div>
                            <div className="w-10 h-1 bg-white/10 rounded-full" />
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-[var(--text-muted)] font-black uppercase tracking-widest">No Projects Match Your Search</div>
                  )}

                  {/* Decorative Mahogany Bookend */}
                  {filteredProjects.length > 0 && (
                    <div 
                      className="w-[24px] shrink-0 self-end mr-10 relative z-10 transition-transform duration-300 hover:scale-105"
                      style={{
                        height: '240px',
                        background: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)',
                        boxShadow: 'inset 2px 2px 5px rgba(255,255,255,0.2), 4px 4px 10px rgba(0,0,0,0.4)',
                        borderRadius: '0 16px 4px 0',
                        borderLeft: '4px solid #f59e0b', // gold brass accent
                      }}
                      title="Archival Bookend"
                    >
                      <div className="absolute inset-0 flex items-center justify-center rotate-90 pointer-events-none">
                        <span className="text-[9px] font-black text-amber-500/50 uppercase tracking-[0.4em] whitespace-nowrap">RINCO</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="w-full h-8 bg-gradient-to-b from-[#451a03] to-[#1c1917] rounded-md shadow-2xl mt-[-4px] relative z-[5] border-t-2 border-[#78350f] border-b border-black/40" />
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-10 py-2 bg-indigo-500/10 backdrop-blur-md rounded-full border border-indigo-500/20 opacity-0 group-hover/shelf:opacity-100 transition-all duration-700">
                  <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.6em]">Corporate Project Intelligence Vault</span>
                </div>
              </div>
            )}
          </div>
          
        </div>
      )}

      {/* Selected Project Detail Modal */}
      <AnimatePresence>
        {selectedId && selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 md:p-12 overflow-y-auto" style={{ perspective: 1200 }}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedId(null)}
              className="absolute inset-0 bg-[#0B0F1A]/85 backdrop-blur-xl z-10"
            />
            
            <motion.div
              layoutId={`card-${selectedId}`}
              initial={{ rotateY: 15, scale: 0.85, opacity: 0 }}
              animate={{ rotateY: 0, scale: 1, opacity: 1 }}
              exit={{ rotateY: -15, scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 20 }}
              className="relative w-full max-w-4xl rounded-[12px] p-[10px] flex flex-col z-20 transition-all select-none"
              style={{
                backgroundColor: selectedProject.color || '#3b82f6',
                backgroundImage: `
                  repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 4px),
                  repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 4px),
                  linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(255,255,255,0.12) 50%, rgba(0,0,0,0.5) 100%)
                `,
                boxShadow: `
                  0 30px 60px -15px rgba(0,0,0,0.85),
                  inset 0 1px 1px rgba(255,255,255,0.25),
                  inset 0 -1px 1px rgba(0,0,0,0.45),
                  0 0 0 3px ${selectedProject.color || '#3b82f6'},
                  0 10px 0 #faf8f5,
                  0 11px 0 rgba(0,0,0,0.3),
                  0 18px 25px rgba(0,0,0,0.5)
                `
              }}
            >
              {/* Protruding Hardcover Spines shadow/overlay */}
              <div className="absolute inset-[10px] rounded-[6px] bg-slate-900/10 pointer-events-none z-10" />

              <div className="relative grid grid-cols-1 md:grid-cols-2 bg-[#faf8f5] rounded-[6px] overflow-hidden min-h-[530px] shadow-[inset_0_0_30px_rgba(0,0,0,0.06)] border border-stone-300/40">
                {/* Left Page overlay shadows for crease/highlights */}
                <div className="absolute inset-y-0 left-0 w-[12px] bg-gradient-to-r from-black/[0.06] to-transparent pointer-events-none z-30" />
                <div className="absolute inset-y-0 right-1/2 w-[35px] bg-gradient-to-r from-transparent via-black/[0.015] to-black/[0.12] pointer-events-none z-30 hidden md:block" />

                {/* Right Page overlay shadows for crease/highlights */}
                <div className="absolute inset-y-0 left-1/2 w-[35px] bg-gradient-to-l from-transparent via-black/[0.015] to-black/[0.12] pointer-events-none z-30 hidden md:block" />
                <div className="absolute inset-y-0 right-0 w-[12px] bg-gradient-to-l from-black/[0.06] to-transparent pointer-events-none z-30" />

                {/* Vertical Center Crease */}
                <div className="absolute top-0 bottom-0 left-1/2 w-[1px] -translate-x-1/2 bg-stone-300/60 z-30 pointer-events-none hidden md:block" />
                <div className="absolute top-0 bottom-0 left-1/2 w-[18px] -translate-x-1/2 bg-gradient-to-r from-black/8 via-transparent to-black/8 z-20 pointer-events-none hidden md:block" />

                {/* LEFT PAGE - COVER & STAMP */}
                <div className="flex flex-col justify-between book-page-left relative select-text z-20 border-b md:border-b-0 md:border-r border-stone-200/60">
                  {/* Left Page Header */}
                  <div className="border-b border-stone-300 pb-2 flex justify-between items-center text-[8px] font-black text-stone-400 tracking-[0.25em] uppercase">
                    <span>Rincovitch BIM Registry</span>
                    <span>Vol. 2026</span>
                  </div>

                  {/* Left Page Title Page Body */}
                  <div className="flex-grow flex flex-col justify-center items-center text-center my-6">
                    {/* Stylized Archival Stamp */}
                    <div 
                      className="w-16 h-16 rounded-full border border-dashed flex items-center justify-center mb-6 relative animate-pulse shadow-sm"
                      style={{ 
                        borderColor: selectedProject.color || '#3b82f6',
                        backgroundColor: `${selectedProject.color || '#3b82f6'}08`
                      }}
                    >
                      <img 
                        src={`${import.meta.env.BASE_URL}rincovitch-logo.svg`} 
                        className="w-8 h-8 object-contain select-none" 
                        alt="Rincovitch Logo" 
                      />
                      <div 
                        className="absolute inset-[2px] rounded-full border border-dashed opacity-50"
                        style={{ borderColor: selectedProject.color || '#3b82f6' }}
                      />
                    </div>

                    <h3 className="text-[9px] font-black text-stone-400 tracking-[0.3em] uppercase mb-1">Archival Record</h3>
                    <h2 
                      className="text-[26px] font-black text-stone-800 leading-tight uppercase tracking-wide mb-3"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      {selectedProject.key}
                    </h2>
                    
                    <div className="w-12 h-[1px] bg-stone-300 my-3" />
                    
                    <p className="text-[12px] text-stone-600 font-bold max-w-[260px] leading-relaxed italic">
                      {selectedProject.name}
                    </p>

                    <div className="mt-8 space-y-2 text-left w-full max-w-[240px] bg-stone-100/50 p-4 rounded border border-stone-200/50 shadow-inner">
                      <div className="flex justify-between text-[11px] text-stone-600 leading-none">
                        <span className="font-bold uppercase tracking-wider text-[8px] text-stone-400">Registry ID</span>
                        <span className="font-mono text-[9px] max-w-[120px] truncate">{selectedProject.id}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-stone-600 leading-none">
                        <span className="font-bold uppercase tracking-wider text-[8px] text-stone-400">Registered</span>
                        <span>{selectedProject.created_at ? new Date(selectedProject.created_at).toLocaleDateString('en-US') : 'Jan 24, 2026'}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-stone-600 leading-none">
                        <span className="font-bold uppercase tracking-wider text-[8px] text-stone-400">Environment</span>
                        <span className="font-black text-indigo-600">Revit {selectedProject.revit_version || '2024'}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-stone-600 leading-none border-t border-stone-200/60 pt-2.5 mt-1">
                        <span className="font-bold uppercase tracking-wider text-[8px] text-stone-400">Active Tasks</span>
                        <span 
                          className="font-black text-[12px] tabular-nums"
                          style={{ color: selectedProject.color || '#3b82f6' }}
                        >
                          {selectedProject.taskCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Left Page Footer */}
                  <div className="flex justify-between text-[9px] text-stone-400 font-bold tracking-widest uppercase">
                    <span>ARCHIVE NO. {selectedProject.id}</span>
                    <span>PAGE 12</span>
                  </div>
                </div>

                {/* RIGHT PAGE - SYNOPSIS & METRICS */}
                <div className="flex flex-col justify-between book-page-right relative select-text z-20">
                  {/* Right Page Header */}
                  <div className="border-b border-stone-300 pb-2 flex justify-between items-center text-[8px] font-black text-stone-400 tracking-[0.25em] uppercase">
                    <span>Synchronized System Log</span>
                    <span>Classified</span>
                  </div>

                  {/* Right Page Content */}
                  <div className="flex-grow flex flex-col justify-center my-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-[9px] font-black text-stone-400 tracking-[0.2em] uppercase flex items-center gap-2">
                          <Sparkles size={12} className="text-yellow-600 animate-pulse" /> Description & Scope
                        </h4>
                        
                        {/* Elegant vintage drop cap description */}
                        <p className="text-[13px] text-stone-700 leading-relaxed text-justify first-letter:text-[36px] first-letter:font-black first-letter:text-stone-800 first-letter:mr-2 first-letter:float-left first-letter:leading-[0.8] first-letter:font-serif">
                          {selectedProject.description || "Core Rincovitch BIM coordination protocol and database synchronization configurations. This volume holds encrypted transactional schedules for ongoing real-time structural engineering modeling."}
                        </p>
                      </div>

                      {/* Vintage Index list representing project stats */}
                      <div className="pt-6 border-t border-stone-200/80 space-y-3">
                        <h5 className="text-[9px] font-black text-stone-400 tracking-[0.2em] uppercase">Archival Metrics</h5>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-stone-100/50 rounded border border-stone-200/50 flex flex-col shadow-inner">
                            <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest">Tasks Indexed</span>
                            <span className="text-[20px] font-black text-stone-800 tabular-nums">{selectedProject.taskCount || 0}</span>
                          </div>
                          <div className="p-3 bg-stone-100/50 rounded border border-stone-200/50 flex flex-col shadow-inner">
                            <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest">Security Status</span>
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mt-1.5 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> SECURE
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Signature Block */}
                    <div className="mt-8 pt-4 border-t border-dashed border-stone-300 flex justify-between items-end">
                      <div>
                        <p className="text-[8px] text-stone-400 font-bold uppercase tracking-wider leading-none mb-1">Approved by</p>
                        <p className="text-[13px] text-stone-700 italic leading-none" style={{ fontFamily: 'Georgia, serif' }}>Rinco Intelligence</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] text-stone-400 font-bold uppercase tracking-wider leading-none mb-1">Classification</p>
                        <p className="text-[8px] font-black text-rose-600 tracking-widest uppercase bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 leading-none">CONFIDENTIAL</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Page Footer containing the Close Volume Button */}
                  <div className="flex justify-between items-center text-[9px] text-stone-400 font-bold tracking-widest uppercase">
                    <span>PAGE 13</span>
                    <button 
                      onClick={() => setSelectedId(null)}
                      className="px-5 py-2.5 bg-stone-800 text-stone-200 hover:bg-rose-600 hover:text-white rounded-md text-[12px] font-black uppercase tracking-widest transition-all shadow-md active:translate-y-0.5 z-50 cursor-pointer"
                    >
                      Close Volume
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Projects;
