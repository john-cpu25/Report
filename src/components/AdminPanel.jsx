import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, History, Info, Package, Zap } from 'lucide-react';

const AdminPanel = () => {
  const versionHistory = [
    {
      version: 'v4.7.0',
      date: '2026-05-11',
      title: 'System Modularization & Performance Optimization',
      changes: [
        'Modularized CSVProcessor into sub-components (StatCards, FilterBar, UnifiedTable, DataUploader).',
        'Implemented Lazy Loading (300 records) for Data Analyst module to reduce lag.',
        'Integrated Global State Persistence for seamless tab switching.',
        'Standardized UI to "Sharp Design" (rounded-none) for professional aesthetics.',
        'Fixed Project Groups toggle functionality in Weekly Planner.'
      ],
      type: 'major'
    },
    {
      version: 'v4.6.1',
      date: '2026-05-10',
      title: 'Workflow Expansion & Refinement',
      changes: [
        'Added detailed Issue Process and Specialty Knowledge workflows.',
        'Fixed Dynamic Icon Rendering syntax errors.',
        'Resolved White-on-White contrast issues on Bamboo background.'
      ],
      type: 'minor'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[var(--text-contrast)] uppercase italic tracking-tighter flex items-center gap-3">
            <ShieldCheck size={32} className="text-indigo-500" />
            Admin <span className="text-indigo-400">Panel</span>
          </h2>
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
            <Zap size={12} className="text-amber-500 animate-pulse" />
            System Control & Version Intelligence
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Version Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-none shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Package size={80} />
            </div>
            <div className="relative z-10">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <Info size={14} /> Current Build
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">Version</p>
                  <p className="text-3xl font-black text-[var(--text-contrast)] tracking-tighter mt-1">v4.7.0</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">Release Date</p>
                  <p className="text-lg font-bold text-[var(--text-main)] mt-1">May 11, 2026</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">Status</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                    <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Production Ready</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="glass-panel p-8 border border-[var(--border)] rounded-none space-y-4">
            <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">System Environment</h3>
            <div className="space-y-3">
              {[
                { label: 'OS', value: 'Windows x64' },
                { label: 'Engine', value: 'Vite v8.0.10' },
                { label: 'Runtime', value: 'React v19.2.5' },
                { label: 'Database', value: 'Supabase v2.105.3' }
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{item.label}</span>
                  <span className="text-[11px] font-black text-indigo-400 uppercase">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Update History */}
        <div className="lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-8 border border-[var(--border)] rounded-none shadow-xl bg-[var(--bg-card)]"
          >
            <div className="flex items-center gap-3 mb-8">
              <History size={20} className="text-indigo-400" />
              <h3 className="text-[11px] font-black text-[var(--text-contrast)] uppercase tracking-[0.3em]">Deployment History</h3>
            </div>

            <div className="space-y-8">
              {versionHistory.map((item, idx) => (
                <div key={item.version} className="relative pl-8 border-l-2 border-white/5">
                  <div className={`absolute top-0 -left-[9px] w-4 h-4 rounded-full border-4 border-[var(--bg-card)] shadow-lg ${item.type === 'major' ? 'bg-indigo-500' : 'bg-slate-700'}`} />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-lg font-black text-[var(--text-contrast)] tracking-tight">{item.version} — {item.title}</h4>
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{item.date}</p>
                    </div>
                    <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-none border ${item.type === 'major' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-500/10 text-slate-400 border-white/10'}`}>
                      {item.type.toUpperCase()} RELEASE
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {item.changes.map((change, cIdx) => (
                      <li key={cIdx} className="text-[12px] text-[var(--text-muted)] flex items-start gap-2 leading-relaxed font-medium">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500/40 shrink-0" />
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
