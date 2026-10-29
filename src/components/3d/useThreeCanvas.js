import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// Safe patch for WebGL getShaderPrecisionFormat to avoid Three.js r186 null crash on environments without HIGH_FLOAT
if (typeof window !== 'undefined') {
  const patchPrecision = (proto) => {
    if (!proto || !proto.getShaderPrecisionFormat) return;
    const orig = proto.getShaderPrecisionFormat;
    proto.getShaderPrecisionFormat = function (shaderType, precisionType) {
      try {
        const res = orig.call(this, shaderType, precisionType);
        return res || { rangeMin: 62, rangeMax: 62, precision: 23 };
      } catch (e) {
        return { rangeMin: 62, rangeMax: 62, precision: 23 };
      }
    };
  };
  if (window.WebGLRenderingContext) patchPrecision(window.WebGLRenderingContext.prototype);
  if (window.WebGL2RenderingContext) patchPrecision(window.WebGL2RenderingContext.prototype);
}

export const isWebGLAvailable = () => {
  try {
    if (typeof window === 'undefined' || !window.WebGLRenderingContext) return false;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return false;
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Deep dispose helper to prevent VRAM and RAM memory leaks in SPA
 */
export const deepDispose = (object) => {
  if (!object) return;

  if (object.children) {
    while (object.children.length > 0) {
      deepDispose(object.children[0]);
      object.remove(object.children[0]);
    }
  }

  if (object.geometry) {
    object.geometry.dispose();
  }

  if (object.material) {
    if (Array.isArray(object.material)) {
      object.material.forEach((mat) => disposeMaterial(mat));
    } else {
      disposeMaterial(object.material);
    }
  }
};

const disposeMaterial = (material) => {
  if (!material) return;
  // Dispose textures
  Object.keys(material).forEach((key) => {
    const value = material[key];
    if (value && typeof value === 'object' && value.isTexture) {
      value.dispose();
    }
  });
  material.dispose();
};

/**
 * useThreeCanvas Hook
 * Handles lifecycle, auto-resize, visibility pausing (battery saving), and 100% memory cleanup
 *
 * @param {React.RefObject} canvasRef - Reference to the HTML canvas element
 * @param {Function} initScene - Callback ({ scene, camera, renderer, width, height, THREE }) => ({ onFrame, onResize, cleanup })
 * @param {Object} options - { alpha, antialias, powerPreference, fov, near, far, maxDpr }
 */
export const useThreeCanvas = (canvasRef, initScene, options = {}) => {
  const [isSupported, setIsSupported] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const sceneContextRef = useRef(null);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      console.warn('[useThreeCanvas] WebGL not available on this device/browser. Falling back.');
      setIsSupported(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId = null;
    let isTabVisible = !document.hidden;

    // 1. Determine initial dimensions
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    // 2. Initialize Renderer
    const {
      alpha = true,
      antialias = true,
      powerPreference = 'high-performance',
      fov = 60,
      near = 0.1,
      far = 2000,
      maxDpr = 2
    } = options;

    let renderer;
    try {
      const rendererOptions = {
        canvas,
        alpha,
        premultipliedAlpha: false,
        antialias,
        powerPreference,
        preserveDrawingBuffer: false
      };
      if (options.precision) {
        rendererOptions.precision = options.precision;
      }
      renderer = new THREE.WebGLRenderer(rendererOptions);
      renderer.setClearColor(0x000000, 0);
    } catch (err) {
      console.error('[useThreeCanvas] Failed to create WebGLRenderer:', err);
      setIsSupported(false);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(width, height, false);

    // 3. Initialize Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, width / height, near, far);
    camera.position.z = 5;

    // 4. Initialize Custom Scene Logic
    let userHandlers = {};
    if (typeof initScene === 'function') {
      try {
        userHandlers = initScene({
          scene,
          camera,
          renderer,
          width,
          height,
          canvas,
          THREE
        }) || {};
      } catch (err) {
        console.error('[useThreeCanvas] Error in initScene callback:', err);
      }
    }

    sceneContextRef.current = { scene, camera, renderer, userHandlers };
    setIsReady(true);

    // Context Lost Protection (Graceful fallback without white canvas artifacts)
    const handleContextLost = (e) => {
      e.preventDefault();
      console.warn('[useThreeCanvas] WebGL context lost. Recovering gracefully.');
      setIsSupported(false);
      if (typeof options.onContextLost === 'function') {
        options.onContextLost();
      }
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, false);

    // 5. Visibility Change Handler (Pause loop when tab is hidden to save CPU/Battery)
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 6. Resize Observer
    const handleResize = () => {
      if (!canvas || !renderer) return;
      const newWidth = canvas.clientWidth || window.innerWidth;
      const newHeight = canvas.clientHeight || window.innerHeight;

      if (newWidth === 0 || newHeight === 0) return;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight, false);

      if (typeof userHandlers.onResize === 'function') {
        userHandlers.onResize(newWidth, newHeight);
      }
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(canvas);
    window.addEventListener('resize', handleResize);

    // 7. High Precision Animation Loop using performance.now() (Zero Deprecation)
    let lastTime = performance.now();
    const startTime = lastTime;

    const loop = (currentTime) => {
      animId = requestAnimationFrame(loop);

      if (!isTabVisible) return; // Skip calculation when tab inactive

      const now = typeof currentTime === 'number' ? currentTime : performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const elapsed = (now - startTime) / 1000;

      if (typeof userHandlers.onFrame === 'function') {
        userHandlers.onFrame({ delta, elapsed, now });
      }

      // Default render if onFrame doesn't cancel or override
      if (!userHandlers.preventAutoRender) {
        renderer.render(scene, camera);
      }
    };

    animId = requestAnimationFrame(loop);

    // 8. Robust Cleanup on Component Unmount
    return () => {
      setIsReady(false);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();

      if (animId) {
        cancelAnimationFrame(animId);
      }

      if (typeof userHandlers.cleanup === 'function') {
        try {
          userHandlers.cleanup();
        } catch (e) {
          console.error('[useThreeCanvas] Error in user cleanup:', e);
        }
      }

      // Deep dispose scene objects
      deepDispose(scene);

      // Dispose renderer
      try {
        renderer.dispose();
        renderer.forceContextLoss();
      } catch (e) {
        // Ignore context loss error during shutdown
      }

      sceneContextRef.current = null;
    };
  }, []);

  return {
    isSupported,
    isReady,
    context: sceneContextRef.current
  };
};

export default useThreeCanvas;
