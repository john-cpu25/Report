import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const BambooBackground = () => {
  // Generate random bamboo stalks
  const stalks = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      x: (i * 10) + (Math.random() * 5),
      width: 15 + (Math.random() * 20),
      height: 100 + (Math.random() * 20),
      delay: Math.random() * 2,
      opacity: 0.03 + (Math.random() * 0.05),
      tilt: (Math.random() - 0.5) * 4
    }));
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#f8fafc]">
      {/* Soft gradient top to bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 via-white to-white" />

      {/* Abstract Sun/Light source */}
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-100/20 blur-[120px] rounded-full" />

      {/* Animated Bamboo Stalks */}
      {stalks.map((s) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 100 }}
          animate={{ 
            opacity: s.opacity, 
            y: 0,
            rotate: [s.tilt, s.tilt + 1, s.tilt] 
          }}
          transition={{ 
            rotate: { duration: 10, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 2 }
          }}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            bottom: '-10%',
            width: `${s.width}px`,
            height: '120%',
            backgroundColor: '#065f46', // Emerald 800
            transformOrigin: 'bottom center',
            borderRadius: '4px',
            filter: 'blur(1px)'
          }}
        >
          {/* Bamboo segments */}
          {Array.from({ length: 8 }).map((_, j) => (
            <div 
              key={j}
              className="w-full h-[1px] bg-white/20 absolute"
              style={{ top: `${(j + 1) * 12}%` }}
            />
          ))}
        </motion.div>
      ))}

      {/* Falling Leaves (Abstract) */}
      {Array.from({ length: 15 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: Math.random() * 100 + '%', 
            y: -20, 
            rotate: Math.random() * 360,
            opacity: 0 
          }}
          animate={{ 
            y: '110vh', 
            x: (Math.random() * 100 + 10) + '%',
            rotate: 720,
            opacity: [0, 0.4, 0.4, 0]
          }}
          transition={{ 
            duration: 15 + (Math.random() * 10), 
            repeat: Infinity, 
            delay: Math.random() * 15,
            ease: "linear"
          }}
          className="absolute w-4 h-8 bg-emerald-500/20 rounded-full"
          style={{ filter: 'blur(1px)' }}
        />
      ))}

      {/* Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(255,255,255,1)]" />
    </div>
  );
};

export default BambooBackground;
