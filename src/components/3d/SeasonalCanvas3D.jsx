import React from 'react';
import Snow3D from './effects/Snow3D';
import Blossom3D from './effects/Blossom3D';
import Fireworks3D from './effects/Fireworks3D';
import Hearts3D from './effects/Hearts3D';
import { isWebGLAvailable } from './useThreeCanvas';

/**
 * SeasonalCanvas3D Coordinator Component
 * Dynamically mounts the appropriate 3D festive GPU effect
 *
 * @param {string} effect - 'NOEL' | 'TET' | 'VALENTINE' | 'FIREWORKS' | 'NONE'
 * @param {string} intensity - 'LOW' | 'MEDIUM' | 'HIGH'
 */
const SeasonalCanvas3D = ({ effect = 'NOEL', intensity = 'MEDIUM', onFallback2D }) => {
  if (!isWebGLAvailable()) {
    if (onFallback2D) onFallback2D();
    return null;
  }

  switch (effect) {
    case 'NOEL':
      return <Snow3D intensity={intensity} onFallback2D={onFallback2D} />;
    case 'TET':
      return <Blossom3D intensity={intensity} onFallback2D={onFallback2D} />;
    case 'VALENTINE':
      return <Hearts3D intensity={intensity} onFallback2D={onFallback2D} />;
    case 'FIREWORKS':
      return <Fireworks3D intensity={intensity} onFallback2D={onFallback2D} />;
    case 'NONE':
    default:
      return null;
  }
};

export default React.memo(SeasonalCanvas3D);
