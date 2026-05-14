import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EnergyBar = ({ used, total }) => {
  const percentage = total > 0 ? Math.max(0, Math.min(100, ((total - used) / total) * 100)) : 0;
  const remainingDays = total - used;
  // Use 15 segments if total allowance is 15 (worked > 1 year), else use 12
  const segments = total >= 15 ? 15 : 12;
  
  const filledSegmentsCount = Math.round((percentage / 100) * segments);

  const getColor = () => {
    if (percentage >= 100) return '#10b981'; // Green lá
    if (percentage >= 75) return '#f59e0b';  // Cam
    if (percentage >= 50) return '#a855f7';  // Tím
    return '#ef4444'; // Đỏ
  };

  const color = getColor();

  return (
    <div className="flex flex-col items-center h-full">
      {/* Vertical Battery Shell - BIGGER */}
      <div className="relative w-[100px] flex flex-col items-center bg-[#0f172a] rounded-[10px] border-[4px] border-[#1e293b] p-[8px] gap-[4px] shadow-[0_0_50px_rgba(0,0,0,0.5)] h-full">
        {/* Battery Top Cap */}
        <div className="absolute -top-[12px] left-1/2 -translate-x-1/2 w-[40px] h-[12px] bg-[#1e293b] rounded-t-[6px]" />
        
        {/* Percentage Label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="text-[32px] font-black text-white/10 select-none -rotate-90">
            {percentage.toFixed(0)}%
          </span>
        </div>

        {/* Segments */}
        {[...Array(segments)].map((_, i) => {
          const indexFromBottom = segments - 1 - i;
          const isFilled = indexFromBottom < filledSegmentsCount;
          
          return (
            <div 
              key={i} 
              className="w-full flex-1 rounded-[3px] border border-white/5 overflow-hidden relative bg-white/[0.02]"
            >
              <AnimatePresence>
                {isFilled && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0"
                    style={{ 
                      backgroundColor: color,
                      boxShadow: `0 0 20px ${color}66`
                    }}
                  >
                    {/* Inner Glow/Shine */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Consumption Label (rotated as requested in previous turn or logic) */}
      <div className="mt-4 flex flex-col items-center gap-2">
         <div className="bg-rose-500/10 border border-rose-500/20 px-[12px] py-[6px] rounded-[6px]">
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest text-center">Consumption</p>
            <p className="text-[20px] font-black text-rose-400 leading-none text-center">-{used.toFixed(1)}</p>
          </div>
      </div>
    </div>
  );
};

export default EnergyBar;
