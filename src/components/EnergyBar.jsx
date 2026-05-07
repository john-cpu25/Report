import React from 'react';
import { motion } from 'framer-motion';

const EnergyBar = ({ used, total }) => {
  const percentage = total > 0 ? Math.max(0, Math.min(100, ((total - used) / total) * 100)) : 0;
  const remainingDays = total - used;
  
  // Color based on percentage
  const getColor = () => {
    if (percentage > 60) return '#10b981'; // Green
    if (percentage > 30) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const color = getColor();
  const segments = 15; // User requested 15 segments

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Energy Reserves</h3>
          <p className="text-2xl font-black italic text-white flex items-baseline gap-2">
            {percentage.toFixed(1)}<span className="text-xs not-italic text-slate-500">%</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Remaining</p>
          <p className="text-lg font-bold text-indigo-400">{remainingDays.toFixed(1)} <span className="text-[10px] text-slate-600">DAYS</span></p>
        </div>
      </div>

      {/* Battery-style Segmented Bar */}
      <div className="relative p-2 bg-slate-950 rounded-2xl border-4 border-slate-800 shadow-2xl flex items-center gap-1.5 h-16 group">
        {/* Battery Tip */}
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-6 bg-slate-800 rounded-r-md" />

        {/* Segments */}
        {[...Array(segments)].map((_, i) => {
          const segmentThreshold = (i / segments) * 100;
          const isFilled = percentage > segmentThreshold;
          const isPartial = percentage > segmentThreshold && percentage <= ((i + 1) / segments) * 100;
          
          return (
            <div 
              key={i} 
              className="relative flex-1 h-full rounded-sm overflow-hidden bg-slate-900/50 border border-white/5"
            >
              <AnimatePresence>
                {isFilled && (
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0 }}
                    className="absolute inset-0"
                    style={{ 
                      backgroundColor: color,
                      boxShadow: `0 0 15px ${color}44`,
                      // For partial segments, we use a clip path or width
                      width: isPartial ? `${((percentage - segmentThreshold) / (100 / segments)) * 100}%` : '100%'
                    }}
                  >
                    {/* Animated Liquid Surface for each segment */}
                    <motion.div 
                      animate={{ 
                        y: [-2, 2, -2],
                        opacity: [0.3, 0.5, 0.3]
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                      className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Glossy Overlay for the whole battery */}
        <div className="absolute inset-2 bg-gradient-to-b from-white/5 via-transparent to-black/10 rounded-xl pointer-events-none" />
      </div>

      <div className="flex gap-4">
        <div className="flex-1 p-3 rounded-xl bg-slate-900/40 border border-white/5">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Capacity</p>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => <div key={i} className="w-1 h-3 bg-indigo-500/40 rounded-full" />)}
            </div>
            <p className="text-sm font-bold text-white">{total} Days</p>
          </div>
        </div>
        <div className="flex-1 p-3 rounded-xl bg-slate-900/40 border border-white/5">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Consumption</p>
          <p className="text-sm font-bold text-rose-400">-{used} Days</p>
        </div>
      </div>
    </div>
  );
};

// Import AnimatePresence as it was missing from previous thought but used in code
import { AnimatePresence } from 'framer-motion';

export default EnergyBar;
