import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const BambooBackground = () => {
  // Generate random bamboo stalks with depth layers
  const stalks = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => {
      const depth = Math.random(); // 0 is back, 1 is front
      return {
        id: i,
        x: (i * 7) + (Math.random() * 5) - 5,
        width: 10 + (depth * 30),
        height: 110 + (Math.random() * 20),
        delay: Math.random() * 5,
        opacity: 0.05 + (depth * 0.1),
        tilt: (Math.random() - 0.5) * 6,
        blur: (1 - depth) * 4,
        zIndex: Math.floor(depth * 10),
        color: depth > 0.6 ? '#065f46' : '#064e3b' // Emerald 800 or 900
      };
    });
  }, []);

  // Glowing LED particles (Bokeh)
  const particles = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 6,
      duration: 10 + Math.random() * 20,
      delay: Math.random() * 10,
      color: Math.random() > 0.5 ? '#10b981' : '#fbbf24' // Emerald or Amber
    }));
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#fdfdfd]">
      {/* Base Gradient - Zen Atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/30" />

      {/* Main Light Source (Sun/LED Core) */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.4, 0.3]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] blur-[100px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.4) 0%, rgba(16, 185, 129, 0.2) 50%, transparent 100%)'
        }}
      />

      {/* Soft God Rays */}
      <div className="absolute top-0 right-0 w-full h-full pointer-events-none opacity-20">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ 
              rotate: [-25 + i * 5, -20 + i * 5, -25 + i * 5],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 15 + i * 5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: 'absolute',
              top: '-20%',
              right: '-10%',
              width: '150%',
              height: '40px',
              background: 'linear-gradient(to left, rgba(251, 191, 36, 0.4), transparent)',
              transformOrigin: 'top right',
              filter: 'blur(40px)',
              transform: `rotate(${-25 + i * 10}deg)`
            }}
          />
        ))}
      </div>

      {/* Atmospheric Mist Layer */}
      <motion.div 
        animate={{ x: [-20, 20, -20] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-0 left-0 w-[200%] h-[30%] bg-gradient-to-t from-white via-emerald-50/10 to-transparent opacity-60 blur-3xl" 
      />

      {/* Animated Bamboo Stalks */}
      {stalks.map((s) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 50 }}
          animate={{ 
            opacity: s.opacity, 
            y: 0,
            rotate: [s.tilt, s.tilt + 0.8, s.tilt] 
          }}
          transition={{ 
            rotate: { duration: 12, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 2 }
          }}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            bottom: '-10%',
            width: `${s.width}px`,
            height: '120%',
            backgroundColor: s.color,
            transformOrigin: 'bottom center',
            borderRadius: '8px',
            filter: `blur(${s.blur}px)`,
            zIndex: s.zIndex,
            boxShadow: s.zIndex > 5 ? 'inset -2px 0 10px rgba(255,255,255,0.1), 5px 0 15px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          {/* Bamboo Rim Light (LED Effect) */}
          <div className="absolute inset-y-0 right-0 w-[20%] bg-gradient-to-l from-white/20 to-transparent rounded-r-lg" />
          
          {/* Bamboo segments */}
          {Array.from({ length: 12 }).map((_, j) => (
            <div 
              key={j}
              className="w-full h-[1px] bg-white/10 absolute"
              style={{ top: `${(j + 1) * 8}%` }}
            />
          ))}
        </motion.div>
      ))}

      {/* Bokeh LED Particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: '100vh' }}
          animate={{ 
            opacity: [0, 0.6, 0],
            y: ['110vh', '-10vh'],
            x: [`${p.x}%`, `${p.x + (Math.random() * 10 - 5)}%`]
          }}
          transition={{ 
            duration: p.duration, 
            repeat: Infinity, 
            delay: p.delay,
            ease: "linear"
          }}
          className="absolute rounded-full"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            filter: 'blur(2px)',
            boxShadow: `0 0 10px ${p.color}`
          }}
        />
      ))}

      {/* Falling Leaves (Abstract & Glowing) */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={`leaf-${i}`}
          initial={{ 
            x: Math.random() * 100 + '%', 
            y: -20, 
            rotate: Math.random() * 360,
            opacity: 0 
          }}
          animate={{ 
            y: '110vh', 
            x: (Math.random() * 100 + 5) + '%',
            rotate: 720,
            opacity: [0, 0.3, 0.3, 0]
          }}
          transition={{ 
            duration: 20 + (Math.random() * 15), 
            repeat: Infinity, 
            delay: Math.random() * 20,
            ease: "linear"
          }}
          className="absolute w-3 h-6 bg-emerald-400/20 rounded-full"
          style={{ 
            filter: 'blur(1px)',
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
          }}
        />
      ))}

      {/* Vignette & Soft Bloom */}
      <div className="absolute inset-0 shadow-[inset_0_0_200px_rgba(255,255,255,0.8)] pointer-events-none" />
    </div>
  );
};

export default BambooBackground;
