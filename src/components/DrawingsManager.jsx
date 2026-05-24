import React, { useState, useEffect } from 'react';
import { Folder, PenTool, Search } from 'lucide-react';
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
          color: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][i % 5]
        }))
      : MOCK_PROJECTS;
      
    const hasSurfParade = baseProjects.some(p => p.id === '12011' || p.name.includes('SURF PARADE'));
    if (!hasSurfParade) {
      return [
        { id: '12011', name: '7-9 SURF PARADE BROADBEACH', code: '12011', color: '#8B5CF6' },
        ...baseProjects
      ];
    }
    return baseProjects;
  }, [dashboardProjects]);

  const [selectedProj, setSelectedProj] = useState(() => {
    const hasSurfParade = projects.some(p => p.id === '12011');
    return hasSurfParade ? '12011' : (projects[0]?.id || null);
  });
  const [projectSearch, setProjectSearch] = useState('');
  
  useEffect(() => {
    if (projects.length > 0 && !selectedProj) {
      const hasSurfParade = projects.some(p => p.id === '12011');
      setSelectedProj(hasSurfParade ? '12011' : projects[0].id);
    }
  }, [projects]);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) || 
    p.code.toLowerCase().includes(projectSearch.toLowerCase())
  );

  return (
    <div 
      style={{ margin: '24px', width: 'calc(100% - 48px)', height: 'calc(100vh - 140px)' }}
      className={`tab-issues rounded-2xl overflow-hidden relative flex flex-col shadow-sm`}
    >
      
      {/* Header */}
      <div className={`px-6 py-4 flex items-center justify-between z-10 issue-header backdrop-blur-md`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl issue-icon-box flex items-center justify-center">
            <PenTool size={20} />
          </div>
          <div>
            <h1 className={`text-xl font-black tracking-tight issue-title`}>Drawing Issues</h1>
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] issue-subtitle`}>
              Drawing Register Sheet View
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-auto p-8">
        
        {/* Columns Grid */}
        <div className="relative z-10 flex gap-10 items-start min-h-full pl-6 md:pl-12 w-full h-full">
          
          {/* COLUMN 1: PROJECTS */}
          <div className="flex flex-col gap-4 w-64 shrink-0 h-full">
            <h3 className={`text-xs font-black uppercase tracking-widest pl-2 mb-2 issue-subtitle`}>1. Projects</h3>
            
            {/* Search Bar */}
            <div className="px-2 mb-2">
              <div className={`relative flex items-center rounded-xl border-2 transition-all issue-search-wrapper`}>
                <Search size={14} className="absolute left-3 issue-subtitle" />
                <input 
                  type="text"
                  placeholder="Search projects..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 bg-transparent outline-none text-xs font-bold issue-search-input`}
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
                      onClick={() => setSelectedProj(proj.id)}
                      className={`py-4 pr-4 rounded-2xl border-2 transition-all cursor-pointer min-h-[72px] flex flex-col justify-center issue-proj-card ${active ? 'active' : ''}`}
                      style={{
                        paddingLeft: '64px',
                        ...(active ? { borderColor: proj.color, background: `${proj.color}15`, boxShadow: `0 10px 30px -10px ${proj.color}50` } : {})
                      }}
                    >
                      <div className="flex items-center">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded issue-proj-code`}>
                          {proj.code}
                        </span>
                      </div>
                      <h4 className={`text-sm font-bold mt-1.5 leading-tight issue-proj-name`}>{proj.name}</h4>
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

          <div className="flex-1 min-w-0 pr-6 h-full" style={{ minWidth: 0 }}>
            <DrawingRegisterView 
              initialData={selectedProj === '12011' ? drawingRegisterData : null} 
              isDark={isDark} 
            />
          </div>

        </div>
      </div>
    </div>
  );
}
