import React from 'react';
import { motion } from 'framer-motion';
import { 
  Palette, 
  Moon, 
  Sun, 
  Monitor, 
  CheckCircle2,
  TreeDeciduous,
  Orbit,
  Maximize,
  Image as ImageIcon
} from 'lucide-react';

const Settings = ({ theme, setTheme, background, setBackground }) => {
  const themes = [
    {
      id: 'GALAXY',
      name: 'Galaxy Dark Mode',
      description: 'The classic Rincovitch intelligence system aesthetic with celestial animations.',
      icon: Moon,
      bgIcon: Orbit,
      color: 'bg-indigo-600',
      preview: 'bg-slate-950'
    },
    {
      id: 'NEWS',
      name: 'News Mode',
      description: 'A clean, high-contrast light theme with a serene bamboo nature background.',
      icon: Sun,
      bgIcon: TreeDeciduous,
      color: 'bg-emerald-600',
      preview: 'bg-slate-50'
    }
  ];

  const backgrounds = [
    { id: 'GALAXY', name: 'Celestial Orbit', icon: Orbit, color: 'text-indigo-400' },
    { id: 'BAMBOO', name: 'Bamboo Zen', icon: TreeDeciduous, color: 'text-emerald-400' },
    { id: 'MINIMAL', name: 'Minimalist', icon: Maximize, color: 'text-slate-400' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-[10px] pb-20 sys-px">
      <div className="flex flex-col md:flex-row md:items-center justify-between sys-gap ocd-card">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-indigo-500 rounded-full" />
            <h1 className="text-[30px] font-black text-[var(--text-contrast)] uppercase tracking-tight">
              System <span className="text-indigo-500">Settings</span>
            </h1>
          </div>
          <p className="text-[var(--text-muted)] font-bold text-[10px] uppercase tracking-[0.3em] ml-5">Customize your operational environment</p>
        </div>
        <Palette size={40} className="text-[var(--text-muted)] opacity-20" />
      </div>

      <div className="space-y-[10px]">
        <div className="flex items-center gap-3 px-2">
          <ImageIcon size={18} className="text-indigo-500" />
          <h2 className="text-sm font-black text-[var(--text-contrast)] uppercase tracking-widest">Interface Style</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 sys-gap">
          {themes.map((t) => (
            <motion.div
              key={t.id}
              whileHover={{ y: -5 }}
              onClick={() => {
                setTheme(t.id);
                // Also set default background for that theme
                setBackground(t.id === 'GALAXY' ? 'GALAXY' : 'BAMBOO');
              }}
              className={`relative group cursor-pointer overflow-hidden rounded-[8px] border-2 transition-all duration-500 ${
                theme === t.id 
                  ? 'border-indigo-500 bg-white/5 shadow-[0_0_30px_rgba(99,102,241,0.2)]' 
                  : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-indigo-500/30'
              }`}
            >
              <div className={`h-48 relative overflow-hidden ${t.preview}`}>
                <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                  <t.bgIcon size={120} />
                </div>
                <div className="absolute inset-x-6 bottom-6 space-y-3">
                    <div className={`h-2 w-20 rounded-full ${t.id === 'GALAXY' ? 'bg-white/20' : 'bg-slate-900/20'}`} />
                    <div className={`h-6 w-32 rounded-[8px] ${t.id === 'GALAXY' ? 'bg-white/10' : 'bg-slate-900/10'}`} />
                </div>
                {theme === t.id && (
                  <div className="absolute top-6 right-6">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-lg">
                      <CheckCircle2 size={18} />
                    </motion.div>
                  </div>
                )}
              </div>
              <div className="sys-p space-y-[10px]">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-[8px] ${t.color} text-white shadow-lg`}>
                    <t.icon size={20} />
                  </div>
                  <h3 className={`text-xl font-black uppercase tracking-tight text-[var(--text-contrast)]`}>
                    {t.name}
                  </h3>
                </div>
                <p className="text-sm font-bold text-[var(--text-muted)] leading-relaxed">
                  {t.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="space-y-[10px]">
        <div className="flex items-center gap-3 px-2">
          <ImageIcon size={18} className="text-indigo-500" />
          <h2 className="text-sm font-black text-[var(--text-contrast)] uppercase tracking-widest">Background Environment</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 sys-gap">
          {backgrounds.map((bg) => (
            <motion.div
              key={bg.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setBackground(bg.id)}
              className={`sys-p rounded-[8px] border-2 transition-all cursor-pointer flex flex-col items-center sys-gap text-center ${
                background === bg.id
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                  : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-indigo-500/30'
              }`}
            >
              <div className={`p-4 rounded-[8px] bg-[var(--bg-header)] ${bg.color}`}>
                <bg.icon size={24} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-contrast)]">{bg.name}</h4>
                {background === bg.id && <p className="text-[10px] font-bold text-indigo-500 uppercase mt-1">Active</p>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="ocd-card text-center space-y-[10px]">
        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em]">Current System Core</p>
        <div className="flex items-center justify-center gap-4">
          <Monitor size={16} className="text-indigo-500" />
          <span className="text-sm font-black text-[var(--text-contrast)] uppercase tracking-widest">Version 4.6.0-INTEL-ZEN</span>
        </div>
      </div>
    </div>
  );
};

export default Settings;
