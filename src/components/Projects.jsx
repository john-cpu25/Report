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
import { useApp } from '../context/AppContext';

const Projects = () => {
  const { projectsCache, setProjectsCache } = useApp();
  const [projects, setProjects] = useState(projectsCache?.projects || []);
  const [loading, setLoading] = useState(!projectsCache);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [timeFilter, setTimeFilter] = useState('MONTH');
  const [taskCounts, setTaskCounts] = useState(projectsCache?.taskCounts || {});

  useEffect(() => {
    if (projectsCache) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [projRes, taskRes] = await Promise.all([
          supabase.from('NMK_Project').select('*').order('index', { ascending: true }),
          supabase.from('NMK_Task').select('name').limit(10000)
        ]);
        
        if (projRes.error) throw projRes.error;
        if (taskRes.error) throw taskRes.error;

        const projectsData = projRes.data || [];
        
        const counts = {};
        if (taskRes.data) {
          taskRes.data.forEach(t => {
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
    <div className="w-full mx-auto pb-[10px] relative">
      {/* Header Intelligence - Sticky */}
      <div className="sticky top-[80px] z-50 bg-[var(--bg-main)] pt-[10px] pb-[5px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-[10px] bg-[var(--bg-card)] p-[10px] rounded-[8px] border border-[var(--border)] shadow-md mx-[10px]">
          <div className="flex flex-col gap-[5px]">
            <div className="flex items-center gap-[10px]">
              <div className="w-1.5 h-8 bg-indigo-500 rounded-full" />
              <h1 className="text-[30px] font-black text-[var(--text-main)] uppercase tracking-tight">
                Project <span className="text-indigo-400">Intelligence</span>
              </h1>
            </div>
            <p className="text-[var(--text-muted)] font-bold text-[10px] uppercase tracking-[0.3em] ml-[15px]">Global Portfolio Management System</p>
          </div>

          <div className="relative group max-w-md w-full">
            <Search className="absolute left-[15px] top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="FILTER PROJECTS..." 
              className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] py-[10px] pl-[45px] pr-[15px] text-[14px] font-bold text-[var(--text-main)] focus:border-indigo-500/50 transition-all outline-none placeholder:text-[var(--text-muted)]"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
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
          </div>
          
        </div>
      )}

      {/* Selected Project Detail Modal */}
      <AnimatePresence>
        {selectedId && selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-[10px]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedId(null)}
              className="absolute inset-0 bg-[#0B0F1A]/80 backdrop-blur-xl"
            />
            
            <motion.div
              layoutId={`card-${selectedId}`}
              className="relative w-full max-w-5xl bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] overflow-hidden shadow-2xl flex flex-col lg:flex-row"
            >
              <div 
                className="absolute top-0 left-0 w-full h-1 z-10"
                style={{ backgroundColor: selectedProject.color || '#6366f1' }}
              />

              {/* Left Content Area */}
              <div className="lg:w-2/5 p-[20px] bg-indigo-600/10 flex flex-col gap-[20px] border-r border-[var(--border)]">
                <div className="space-y-[10px]">
                  <div className="inline-flex items-center gap-[10px] px-[10px] py-[5px] bg-indigo-500/20 rounded-[8px] border border-indigo-500/30">
                    <Sparkles size={14} className="text-yellow-400" />
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Active Analysis</span>
                  </div>
                  <h2 className="text-[30px] font-black text-[var(--text-main)] leading-tight uppercase">
                    {selectedProject.key}
                  </h2>
                  <p className="text-[14px] font-bold text-[var(--text-muted)]">
                    {selectedProject.name}
                  </p>
                </div>

                <div className="mt-auto grid grid-cols-1 gap-[10px]">
                  <div className="bg-[var(--bg-surface)] p-[15px] rounded-[8px] border border-[var(--border)]">
                    <div className="flex items-center gap-[10px]">
                      <Users size={20} className="text-indigo-400" />
                      <div>
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Efficiency</p>
                        <p className="text-[14px] font-black text-[var(--text-main)]">92% PERFORMANCE</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Content Area */}
              <div className="lg:w-3/5 p-[20px] flex flex-col gap-[20px] bg-[var(--bg-card)] relative">
                <button 
                  onClick={() => setSelectedId(null)}
                  className="absolute top-[20px] right-[20px] w-10 h-10 flex items-center justify-center bg-[var(--bg-surface)] hover:bg-rose-500/10 hover:text-rose-500 rounded-[8px] text-[var(--text-muted)] transition-all"
                >
                  ✕
                </button>

                <div className="space-y-[10px]">
                  <div className="flex items-center gap-[10px] text-indigo-400">
                    <Layers size={18} />
                    <span className="text-[14px] font-black uppercase tracking-widest">Technical Brief</span>
                  </div>
                  <p className="text-[14px] text-[var(--text-muted)] leading-relaxed">
                    {selectedProject.description || "Core Rincovitch BIM coordination protocol. Focus on high-fidelity modeling and cross-disciplinary synchronization."}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
                  <div className="flex items-center gap-[10px] p-[10px] bg-[var(--bg-surface)] rounded-[8px] border border-[var(--border)]">
                    <Cpu size={24} className="text-indigo-400" />
                    <div>
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase">Platform</p>
                      <p className="text-[14px] font-black text-[var(--text-main)]">REVIT {selectedProject.revit_version || '2024'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-[10px] p-[10px] bg-[var(--bg-surface)] rounded-[8px] border border-[var(--border)]">
                    <User size={24} className="text-emerald-400" />
                    <div>
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase">Lead</p>
                      <p className="text-[14px] font-black text-[var(--text-main)]">NM KHANG</p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto">
                  <button className="w-full py-[15px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-[8px] text-[14px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all">
                    Access Project Protocol
                  </button>
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
