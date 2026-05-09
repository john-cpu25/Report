import React from 'react';
import { motion } from 'framer-motion';
import { 
  Palette, 
  Moon, 
  Sun, 
  Monitor, 
  CheckCircle2,
  TreeDeciduous,
  Orbit
} from 'lucide-react';

const Settings = ({ theme, setTheme }) => {
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

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/20 p-8 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-indigo-500 rounded-full" />
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">
              System <span className="text-indigo-400">Settings</span>
            </h1>
          </div>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] ml-5">Customize your operational environment</p>
        </div>
        <Palette size={40} className="text-slate-800" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {themes.map((t) => (
          <motion.div
            key={t.id}
            whileHover={{ y: -5 }}
            onClick={() => setTheme(t.id)}
            className={`relative group cursor-pointer overflow-hidden rounded-[2.5rem] border-2 transition-all duration-500 ${
              theme === t.id 
                ? 'border-indigo-500 bg-white/5' 
                : 'border-white/5 bg-slate-950/20 hover:border-white/20'
            }`}
          >
            {/* Preview Section */}
            <div className={`h-48 relative overflow-hidden ${t.preview}`}>
               {/* Background Pattern Placeholder */}
               <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                 <t.bgIcon size={120} />
               </div>
               
               {/* Content Mockup */}
               <div className="absolute inset-x-6 bottom-6 space-y-3">
                  <div className={`h-2 w-20 rounded-full ${t.id === 'GALAXY' ? 'bg-white/20' : 'bg-slate-900/20'}`} />
                  <div className={`h-6 w-32 rounded-lg ${t.id === 'GALAXY' ? 'bg-white/10' : 'bg-slate-900/10'}`} />
               </div>

               {theme === t.id && (
                 <div className="absolute top-6 right-6">
                   <motion.div 
                     initial={{ scale: 0 }}
                     animate={{ scale: 1 }}
                     className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-lg"
                   >
                     <CheckCircle2 size={18} />
                   </motion.div>
                 </div>
               )}
            </div>

            {/* Info Section */}
            <div className="p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${t.color} text-white`}>
                  <t.icon size={20} />
                </div>
                <h3 className={`text-xl font-black uppercase tracking-tight ${theme === 'NEWS' && theme !== t.id ? 'text-slate-900' : 'text-white'}`}>
                  {t.name}
                </h3>
              </div>
              <p className="text-sm font-bold text-slate-500 leading-relaxed">
                {t.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="glass-panel p-8 border-white/5 text-center space-y-4">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Current System Core</p>
        <div className="flex items-center justify-center gap-4">
          <Monitor size={16} className="text-indigo-400" />
          <span className="text-sm font-black text-white uppercase tracking-widest">Version 4.2.0-STABLE</span>
        </div>
      </div>
    </div>
  );
};

export default Settings;
