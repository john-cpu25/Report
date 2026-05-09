import React, { useState, useEffect, useMemo } from 'react';
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

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [timeFilter, setTimeFilter] = useState('MONTH');
  const [taskCounts, setTaskCounts] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let startDate = new Date();
        if (timeFilter === 'WEEK') startDate.setDate(startDate.getDate() - 7);
        else if (timeFilter === 'MONTH') startDate.setMonth(startDate.getMonth() - 1);
        else if (timeFilter === 'YEAR') startDate.setFullYear(startDate.getFullYear() - 1);

        const [projRes, taskRes] = await Promise.all([
          supabase.from('NMK_Project').select('*').order('index', { ascending: true }),
          supabase.from('NMK_Task')
            .select('name')
            .gte('created_at', startDate.toISOString())
            .limit(5000)
        ]);
        
        if (projRes.error) throw projRes.error;
        if (taskRes.error) throw taskRes.error;

        setProjects(projRes.data || []);
        
        // Count tasks per project
        const counts = {};
        if (taskRes.data) {
          taskRes.data.forEach(t => {
            const rawName = t.name || '';
            const parts = rawName.toString().split(':');
            if (parts.length > 0) {
              const projectName = parts[0]?.trim()?.toUpperCase();
              if (projectName) {
                counts[projectName] = (counts[projectName] || 0) + 1;
              }
            }
          });
        }
        setTaskCounts(counts);
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeFilter]);

  const projectsWithStats = useMemo(() => {
    return projects.map(p => {
      // Use real count if available
      let taskCount = taskCounts[p.key?.toUpperCase()] || taskCounts[p.name?.toUpperCase()] || 0;
      
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
    <div className="w-full mx-auto space-y-8 pb-20 px-4 sm:px-6">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/20 p-6 rounded-3xl border border-white/5 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.6)]" />
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">
              Project <span className="text-indigo-400">Intelligence</span>
            </h1>
          </div>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] ml-5">Global Portfolio Management System</p>
        </div>

        <div className="relative group max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="FILTER PROJECTS..." 
            className="w-full bg-slate-900/40 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm font-black text-white focus:border-indigo-500/50 focus:bg-slate-900/60 transition-all outline-none shadow-2xl placeholder:text-slate-700"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="h-[50vh] flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Syncing Supabase Database...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-9">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                layoutId={`card-${project.id}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                onClick={() => setSelectedId(project.id)}
                className={`group relative cursor-pointer glass-panel overflow-hidden border-white/5 transition-all ${
                  selectedId === project.id 
                    ? 'ring-2 ring-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.2)] bg-indigo-500/5' 
                    : 'hover:bg-white/[0.03] hover:border-white/10'
                }`}
              >
                {/* Accent Color Strip */}
                <div 
                  className="absolute top-0 left-0 w-full h-1 z-10"
                  style={{ backgroundColor: project.color || '#6366f1', boxShadow: `0 0 15px ${project.color || '#6366f1'}` }}
                />

                <div className="pt-12 pl-12 pr-8 pb-8 space-y-6">
                  {/* Top Row: Key & Version */}
                  <div className="flex justify-between items-start gap-4">
                    <div 
                      className="px-4 py-2 rounded-xl bg-slate-950 border border-white/5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] shadow-inner break-words leading-relaxed"
                      title={project.name}
                    >
                      {project.name || 'N/A'}
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 text-[9px] font-bold text-slate-500 uppercase tracking-wider shrink-0 border border-white/5">
                      <Cpu size={10} />
                      {project.revit_version || '2024'}
                    </div>
                  </div>

                  {/* Project Identity */}
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-white uppercase group-hover:text-indigo-400 transition-colors truncate" title={project.key}>
                      {project.key}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Active System</span>
                    </div>
                  </div>

                  {/* Meta Stats (Placeholder/Mock) */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Team Size</p>
                      <div className="flex items-center gap-1.5">
                        <Users size={12} className="text-slate-500" />
                        <span className="text-xs font-black text-slate-300">12</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Tasks</p>
                      <div className="flex items-center gap-1.5">
                        <Database size={12} className="text-slate-500" />
                        <span className="text-xs font-black text-slate-300">{project.taskCount}+</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative Bottom Graphic */}
                <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                  <Box size={80} strokeWidth={1} />
                </div>
              </motion.div>
            ))}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="lg:col-span-3">
            <div className="sticky top-6">
              <div className="glass-panel p-6 border-white/5 shadow-2xl relative overflow-hidden bg-slate-900/30">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Sparkles size={80} />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                      <div>
                        <h2 className="text-sm font-black text-white tracking-tight uppercase">Top 10 Projects</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">High Activity</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex bg-slate-950/50 p-1 rounded-xl mb-6 border border-white/5">
                    {['WEEK', 'MONTH', 'YEAR'].map(filter => (
                      <button
                        key={filter}
                        onClick={() => setTimeFilter(filter)}
                        className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                          timeFilter === filter 
                            ? 'bg-indigo-500 text-white shadow-lg' 
                            : 'text-slate-500 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-[600px] overflow-y-auto custom-scrollbar pr-2 relative">
                    <div className="flex flex-col gap-3 pb-8">
                      {top10Projects.map((proj, idx) => {
                        const isTop3 = idx < 3;
                        let crownColor = '';
                        let glowColor = '';
                        if (idx === 0) {
                          crownColor = 'text-yellow-400';
                          glowColor = 'rgba(250, 204, 21, 0.2)';
                        } else if (idx === 1) {
                          crownColor = 'text-slate-300';
                          glowColor = 'rgba(203, 213, 225, 0.2)';
                        } else if (idx === 2) {
                          crownColor = 'text-amber-600';
                          glowColor = 'rgba(217, 119, 6, 0.2)';
                        }

                        return (
                          <motion.div 
                            key={proj.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => setSelectedId(proj.id)}
                            className={`bg-slate-900/50 hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/30 transition-all rounded-xl p-4 cursor-pointer group flex flex-col gap-2 relative overflow-hidden`}
                            style={isTop3 ? {
                              boxShadow: `inset 0 0 20px ${glowColor}`,
                              border: `1px solid ${glowColor.replace('0.2', '0.4')}`
                            } : {}}
                          >
                            {isTop3 && (
                              <motion.div 
                                className="absolute inset-0 pointer-events-none"
                                animate={{ 
                                  backgroundColor: [glowColor, 'rgba(0,0,0,0)', glowColor],
                                }}
                                transition={{ 
                                  duration: 2, 
                                  repeat: Infinity, 
                                  ease: "easeInOut" 
                                }}
                              />
                            )}
                            <div 
                              className="absolute left-0 top-0 w-1 h-full"
                              style={{ backgroundColor: proj.color || '#6366f1' }}
                            />
                            <div className="flex justify-between items-start pl-4 relative z-10">
                              <div className="flex items-center gap-2">
                                {isTop3 && (
                                  <motion.div
                                    animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="shrink-0"
                                  >
                                    <Crown size={16} className={`${crownColor} drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]`} fill="currentColor" />
                                  </motion.div>
                                )}
                                <span className="text-sm font-black text-white uppercase group-hover:text-indigo-400 transition-colors pr-2 break-words leading-tight">
                                  {proj.key}
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase whitespace-nowrap transition-all ${
                                isTop3 ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-indigo-500/20 text-indigo-400'
                              }`}>
                                {proj.taskCount} T
                              </span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase pl-4 break-words leading-relaxed relative z-10">{proj.name}</p>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Project Detail Modal */}
      <AnimatePresence>
        {selectedId && selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedId(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl"
            />
            
            <motion.div
              layoutId={`card-${selectedId}`}
              className="relative w-full max-w-5xl bg-slate-900 border border-white/10 rounded-none overflow-hidden shadow-[0_0_150px_rgba(0,0,0,0.8)]"
            >
              <div 
                className="absolute top-0 left-0 w-full h-2 z-10"
                style={{ backgroundColor: selectedProject.color || '#6366f1', boxShadow: `0 0 30px ${selectedProject.color || '#6366f1'}` }}
              />

              <div className="flex flex-col lg:flex-row h-full relative">
                {/* Left: Visual Branding */}
                <div className="lg:w-2/5 relative bg-indigo-600 px-10 pb-10 flex flex-col overflow-hidden min-h-[600px]">
                  {/* EXPLICIT SPACER TO FORCE CONTENT DOWN */}
                  <div className="h-40 shrink-0 w-full" />
                  
                  <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <Box size={400} className="absolute -top-20 -left-20" />
                  </div>

                  <div className="relative z-10 space-y-6 flex-grow">
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 rounded-none border border-white/20 backdrop-blur-md">
                      <Sparkles size={14} className="text-yellow-300" />
                      <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Priority High-Level</span>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[9px] font-black text-indigo-200 uppercase tracking-[0.3em]">Project Identity</p>
                      <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight break-words uppercase tracking-tight">
                        {selectedProject.key}
                      </h2>
                      <p className="text-indigo-100 text-[11px] font-bold leading-relaxed opacity-90 max-w-[200px] break-words">
                        {selectedProject.name}
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 mt-auto pt-8">
                    <div className="bg-white/10 rounded-none p-6 border border-white/20 backdrop-blur-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-none bg-white/20 flex items-center justify-center">
                          <Users size={24} className="text-white" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-indigo-100/60 uppercase tracking-widest">Performance</p>
                          <p className="text-xl font-black text-white">85% OPTIMIZED</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Detailed Data */}
                <div className="lg:w-3/5 px-10 pb-10 md:px-14 md:pb-14 flex flex-col space-y-10 bg-slate-900 relative">
                  {/* EXPLICIT SPACER TO FORCE CONTENT DOWN */}
                  <div className="h-40 shrink-0 w-full" />

                  <button 
                    onClick={() => setSelectedId(null)}
                    className="absolute top-12 right-12 w-12 h-12 rounded-none bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all active:scale-90 z-30"
                  >
                    <ArrowRight className="rotate-180" size={24} />
                  </button>

                  <div className="space-y-5">
                    <div className="flex items-center gap-3 text-indigo-400">
                      <Layers size={18} />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">Project Brief</span>
                    </div>
                    <p className="text-slate-300 text-lg leading-relaxed font-medium max-w-xl">
                      {selectedProject.description || "This BIM architectural project is focused on high-precision structural modeling and coordination using Revit system protocols. Part of the core Rincovitch portfolio for 2026."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-4 p-5 bg-white/[0.02] rounded-none border border-white/5">
                      <div className="w-12 h-12 rounded-none bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <Cpu size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase">Platform</p>
                        <p className="text-white font-black text-lg">REVIT {selectedProject.revit_version || '2024'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-5 bg-white/[0.02] rounded-none border border-white/5">
                      <div className="w-12 h-12 rounded-none bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <User size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase">Lead Manager</p>
                        <p className="text-white font-black text-lg">NM KHANG</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-12">
                    <button className="group flex items-center gap-4 px-12 py-6 bg-indigo-500 text-white rounded-none font-black uppercase tracking-widest shadow-[0_20px_50px_rgba(99,102,241,0.3)] hover:bg-indigo-400 transition-all active:scale-95 w-full md:w-auto justify-center">
                      Open Project Dashboard 
                      <ExternalLink size={24} className="group-hover:translate-x-1 transition-transform" />
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
