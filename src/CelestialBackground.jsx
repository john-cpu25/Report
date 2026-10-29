import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import Celestial3D from './components/3d/Celestial3D';
import { isWebGLAvailable } from './components/3d/useThreeCanvas';
import { useApp } from './context/AppContext';

const ZODIAC_CONSTELLATIONS = [
  { name: 'Capricorn', month: 0 },
  { name: 'Aquarius', month: 1 },
  { name: 'Pisces', month: 2 },
  { name: 'Aries', month: 3 },
  { name: 'Taurus', month: 4 },
  { name: 'Gemini', month: 5 },
  { name: 'Cancer', month: 6 },
  { name: 'Leo', month: 7 },
  { name: 'Virgo', month: 8 },
  { name: 'Libra', month: 9 },
  { name: 'Scorpio', month: 10 },
  { name: 'Sagittarius', month: 11 }
];

const CelestialBackground = () => {
  const { graphicsMode = 'ULTRA_3D' } = useApp();
  const currentMonth = new Date().getMonth();
  const constellation = useMemo(() => ZODIAC_CONSTELLATIONS[currentMonth], [currentMonth]);
  const hasWebGL = useMemo(() => isWebGLAvailable(), []);
  const enable3D = hasWebGL && graphicsMode !== 'CLASSIC_2D';

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#020617]">
      {/* Animated Nebulas */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)] blur-[100px]"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [0, -90, 0],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="absolute bottom-[-20%] right-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.1)_0%,transparent_70%)] blur-[100px]"
      />

      {/* GPU Accelerated 3D Starfield & Constellation Engine */}
      {enable3D && <Celestial3D />}

      {/* Constellation Name Watermark */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 0.18, y: 0 }}
        className="absolute bottom-12 left-12 font-black text-white text-4xl tracking-[0.5em] uppercase pointer-events-none select-none drop-shadow-lg"
      >
        {constellation.name}
      </motion.div>
    </div>
  );
};

export default React.memo(CelestialBackground);
