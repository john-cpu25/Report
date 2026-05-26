import React, { useState, useEffect } from 'react';
import { Folder, PenTool, Search, Building2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import DrawingRegisterView from './DrawingRegisterView';
import { drawingRegisterData } from '../data/drawingRegisterData';

const MOCK_PROJECTS = [
  { id: 'P1', name: 'NMK Tower', code: 'PROJ-01', color: '#3B82F6' },
  { id: 'P2', name: 'Ocean Villa', code: 'PROJ-02', color: '#10B981' },
  { id: 'P3', name: 'Rincovitch HQ', code: 'PROJ-03', color: '#F59E0B' }
];

export default function DrawingsManager() {
  const { theme, dashboardProjects } = useApp();
  const isDark = theme === 'GALAXY' || theme === 'DARK';

  const projects = React.useMemo(() => {
    const baseProjects = dashboardProjects && dashboardProjects.length > 0 
      ? dashboardProjects.map((p, i) => ({
          id: p.id,
          name: p.name || 'Unnamed Project',
          code: p.key || `PROJ-${String(i+1).padStart(2, '0')}`,
          color: p.color || ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][i % 5]
        }))
      : MOCK_PROJECTS;
    
    return baseProjects.sort((a, b) => a.code.localeCompare(b.code));
  }, [dashboardProjects]);

  const [projectSearch, setProjectSearch] = useState('');
  const [selectedProj, setSelectedProj] = useState(projects[0]?.id || null);
  
  useEffect(() => {
    if (projects.length > 0 && !selectedProj) {
      setSelectedProj(projects[0].id);
    }
  }, [projects]);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) || 
    p.code.toLowerCase().includes(projectSearch.toLowerCase())
  );

  return (
    <div 
      style={{ margin: '10px 10px 0 10px', width: 'calc(100% - 20px)', height: 'calc(100vh - 110px)' }}
      className={`rounded-2xl overflow-hidden shadow-md flex flex-col transition-colors duration-300 ${
        isDark ? 'bg-slate-950 text-slate-200' : 'bg-white text-slate-800'
      }`}
    >
      
      {/* Header */}
      <div className={`px-6 py-4 flex items-center z-10 issue-header backdrop-blur-md gap-8`}>
        {/* Left Side: PROJECT */}
        <div className="w-64 shrink-0 flex items-center gap-3">
           <div className={`flex items-center justify-center ${isDark ? 'text-white' : 'text-black'}`}>
             <Building2 size={24} strokeWidth={1.5} />
           </div>
           <h1 className="text-[24px] font-normal uppercase tracking-normal" style={{ color: isDark ? '#fff' : '#000' }}>Project</h1>
        </div>

        {/* Right Side: Drawing Issues */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 flex items-center justify-center text-indigo-500">
            <PenTool size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className={`text-[24px] font-normal uppercase tracking-normal issue-title`}>Drawing Issues</h1>
          </div>
        </div>
        
        {/* Portal Target for Search & Buttons from RegisterView */}
        <div id="drawing-register-toolbar-portal" className="flex-1 flex items-center justify-end min-w-0"></div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-auto p-8">
        
        {/* Columns Grid */}
        <div className="relative z-10 flex gap-10 items-start min-h-full pl-6 md:pl-12 w-full h-full">
          
          {/* COLUMN 1: PROJECTS */}
          <div className="flex flex-col gap-4 w-64 shrink-0 h-full">
            
            {/* Search Bar */}
            <div className="px-2 mb-2">
              <div className={`relative flex items-center w-full rounded-full shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all overflow-hidden h-11 ${
                isDark ? 'bg-slate-900 border border-slate-700/50' : 'bg-white'
              }`}>
                <div className="absolute left-1.5 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-[0_2px_10px_-2px_rgba(99,102,241,0.6)]">
                  <Search size={16} strokeWidth={2.5} />
                </div>
                <input 
                  type="text"
                  placeholder="Search..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  style={{ paddingLeft: '48px' }}
                  className={`w-full pr-4 h-full bg-transparent outline-none text-[15px] font-bold placeholder:text-indigo-400/70 ${
                    isDark ? 'text-white' : 'text-indigo-600'
                  }`}
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto flex flex-col gap-3 pr-2 scrollbar-hide" style={{ paddingLeft: '30px', maxHeight: 'calc(100vh - 300px)' }}>
              {filteredProjects.map(proj => {
                const active = selectedProj === proj.id;
                return (
                  <div key={proj.id} className="mb-3">
                    <div 
                      onClick={() => setSelectedProj(proj.id)}
                      className={`flex items-center w-full p-1.5 pr-4 rounded-full border transition-all duration-300 cursor-pointer ${
                        active 
                          ? (isDark ? 'bg-slate-800 border-slate-600 shadow-md' : 'bg-slate-50 border-slate-300 shadow-md')
                          : (isDark ? 'bg-slate-900/50 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50')
                      }`}
                    >
                      <div 
                        className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ${
                          active
                            ? (isDark ? 'bg-slate-700 shadow-inner' : 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] border border-slate-200')
                            : (isDark ? 'bg-slate-800' : 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-slate-100')
                        }`}
                      >
                        <Folder 
                          size={18} 
                          strokeWidth={active ? 2.5 : 2} 
                          color={active ? proj.color : (isDark ? '#94a3b8' : '#64748b')} 
                        />
                      </div>
                      <h4 
                        className={`ml-4 text-[15px] font-normal tracking-normal issue-proj-name`}
                        style={{ color: active ? proj.color : (isDark ? '#fff' : '#334155') }}
                      >
                        {proj.code}
                      </h4>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 min-w-0 pr-6 h-full" style={{ minWidth: 0 }}>
            <DrawingRegisterView 
              projectId={selectedProj}
              projectCode={projects.find(p => p.id === selectedProj)?.code || ''}
              isDark={isDark} 
            />
          </div>

        </div>
      </div>
    </div>
  );
}
