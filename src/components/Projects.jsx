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
  User
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('NMK_Project')
          .select('*')
          .order('index', { ascending: true });
        
        if (error) throw error;
        setProjects(data || []);
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.key?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects, searchQuery]);

  const selectedProject = useMemo(() => 
    projects.find(p => p.id === selectedId), [projects, selectedId]
  );

  return (
    <div className="max-w-[1500px] mx-auto space-y-8 pb-20 px-4 sm:px-6">
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

                <div className="p-6 space-y-6">
                  {/* Top Row: Key & Version */}
                  <div className="flex justify-between items-start">
                    <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-white/5 text-[10px] font-black text-indigo-400 uppercase tracking-widest shadow-inner">
                      {project.key || 'N/A'}
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      <Cpu size={10} />
                      {project.revit_version || '2024'}
                    </div>
                  </div>

                  {/* Project Identity */}
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-white uppercase italic group-hover:text-indigo-400 transition-colors">
                      {project.name}
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
                        <span className="text-xs font-black text-slate-300">450+</span>
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
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
            />
            
            <motion.div
              layoutId={`card-${selectedId}`}
              className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]"
            >
              <div 
                className="absolute top-0 left-0 w-full h-2 z-10"
                style={{ backgroundColor: selectedProject.color || '#6366f1', boxShadow: `0 0 30px ${selectedProject.color || '#6366f1'}` }}
              />

              <div className="flex flex-col lg:flex-row h-full">
                {/* Left: Visual / Image */}
                <div className="lg:w-2/5 relative bg-slate-950 flex items-center justify-center min-h-[300px]">
                  {selectedProject.image ? (
                    <img 
                      src={selectedProject.image} 
                      alt={selectedProject.name} 
                      className="w-full h-full object-cover opacity-60"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-indigo-500/20">
                      <Layers size={120} strokeWidth={0.5} />
                      <p className="text-[10px] font-black uppercase tracking-[0.5em]">No Image Data</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent lg:bg-gradient-to-r" />
                  
                  {/* Stats Overlay */}
                  <div className="absolute bottom-8 left-8 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-indigo-400/60 uppercase tracking-widest leading-none">Priority</p>
                        <p className="text-xl font-black text-white">HIGH-LEVEL</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Content */}
                <div className="lg:w-3/5 p-12 space-y-8 relative">
                  <button 
                    onClick={() => setSelectedId(null)}
                    className="absolute top-8 right-8 w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all active:scale-90"
                  >
                    <ArrowRight className="rotate-180" size={20} />
                  </button>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">
                        {selectedProject.key}
                      </span>
                      <span className="px-4 py-2 rounded-xl bg-slate-800 border border-white/5 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                        ID: {selectedId.slice(0, 8)}
                      </span>
                    </div>
                    <h2 className="text-5xl font-black text-white uppercase tracking-tight">
                      {selectedProject.name}
                    </h2>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Project Description</h4>
                    <p className="text-slate-400 text-sm leading-relaxed font-medium">
                      {selectedProject.description || "This BIM architectural project is focused on high-precision structural modeling and coordination using Revit system protocols. Part of the core Rincovitch portfolio for 2026."}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-indigo-400 mb-1">
                        <Cpu size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Platform</span>
                      </div>
                      <p className="text-lg font-black text-white">REVIT {selectedProject.revit_version || '2024'}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-emerald-400 mb-1">
                        <User size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Manager</span>
                      </div>
                      <p className="text-lg font-black text-white">NM KHANG</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-amber-400 mb-1">
                        <Calendar size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Modified</span>
                      </div>
                      <p className="text-lg font-black text-white">MAY 2026</p>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button className="flex items-center gap-3 px-8 py-4 bg-indigo-500 rounded-2xl text-white font-black uppercase italic tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-400 transition-all active:scale-95">
                      Open Project Dashboard <ExternalLink size={18} />
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
