import React, { useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import useThreeCanvas from '../useThreeCanvas';

/**
 * Fireworks3D Component
 * 3D celebration fireworks simulation with radial bursts, gravity drag, and vibrant color palettes
 * Replaces CPU 2D fireworks in SeasonalEffects.
 *
 * @param {string} intensity - 'LOW' | 'MEDIUM' | 'HIGH'
 * @param {string} className - Additional CSS classes
 */
const Fireworks3D = ({ intensity = 'MEDIUM', className = '', onFallback2D }) => {
  const canvasRef = useRef(null);

  const burstCount = useMemo(() => {
    switch (intensity) {
      case 'LOW': return 3;
      case 'HIGH': return 8;
      case 'MEDIUM':
      default: return 5;
    }
  }, [intensity]);

  const initScene = useCallback(({ scene, camera }) => {
    camera.position.set(0, 0, 16);
    camera.lookAt(0, 0, 0);

    const PARTICLES_PER_BURST = 120;
    const TOTAL_PARTICLES = burstCount * PARTICLES_PER_BURST;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(TOTAL_PARTICLES * 3);
    const colors = new Float32Array(TOTAL_PARTICLES * 3);
    const sizes = new Float32Array(TOTAL_PARTICLES);
    const alphas = new Float32Array(TOTAL_PARTICLES);

    // Burst states
    const bursts = [];
    const PALETTES = [
      ['#FF3B30', '#FF9500', '#FFCC00'], // Warm flame & gold
      ['#007AFF', '#5856D6', '#AF52DE'], // Electric purple & blue
      ['#34C759', '#30B0C7', '#63E6BE'], // Neon emerald & cyan
      ['#FF2D55', '#FF375F', '#FFD60A']  // Festive ruby & gold
    ];

    const resetBurst = (burstIdx) => {
      const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      const baseColor = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
      const center = new THREE.Vector3(
        (Math.random() - 0.5) * 18,
        Math.random() * 8 - 1,
        (Math.random() - 0.5) * 10
      );

      bursts[burstIdx] = {
        center,
        age: 0,
        maxLife: Math.random() * 1.2 + 1.6,
        active: true,
        delay: Math.random() * 0.8
      };

      const startOffset = burstIdx * PARTICLES_PER_BURST;
      for (let i = 0; i < PARTICLES_PER_BURST; i++) {
        const pIdx = startOffset + i;
        const i3 = pIdx * 3;

        positions[i3] = center.x;
        positions[i3 + 1] = center.y;
        positions[i3 + 2] = center.z;

        // Spherical explosion velocity
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.acos(Math.random() * 2 - 1);
        const speed = Math.random() * 4.5 + 2.0;

        bursts[burstIdx][`v_${i}`] = new THREE.Vector3(
          Math.sin(theta) * Math.cos(phi) * speed,
          Math.sin(theta) * Math.sin(phi) * speed,
          Math.cos(theta) * speed
        );

        colors[i3] = baseColor.r;
        colors[i3 + 1] = baseColor.g;
        colors[i3 + 2] = baseColor.b;

        sizes[pIdx] = Math.random() * 2.5 + 1.5;
        alphas[pIdx] = 1.0;
      }
    };

    // Initialize all bursts
    for (let b = 0; b < burstCount; b++) {
      resetBurst(b);
      bursts[b].delay = b * 0.5; // Stagger initial explosions
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    // Custom Shader for glowing firework particles
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          if (-mvPosition.z <= 0.5) {
            gl_PointSize = 0.0;
          } else {
            gl_PointSize = clamp(size * uPixelRatio * (120.0 / -mvPosition.z), 0.0, 32.0);
          }
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          if (dist > 0.5) discard;

          float intensity = pow(1.0 - (dist * 2.0), 1.8);
          gl_FragColor = vec4(vColor, vAlpha * intensity);
        }
      `
    });

    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    return {
      onFrame: ({ delta }) => {
        const posArr = geometry.attributes.position.array;
        const alphaArr = geometry.attributes.alpha.array;

        for (let b = 0; b < burstCount; b++) {
          const burst = bursts[b];
          if (burst.delay > 0) {
            burst.delay -= delta;
            continue;
          }

          burst.age += delta;
          const lifeProgress = burst.age / burst.maxLife;

          if (lifeProgress >= 1.0) {
            resetBurst(b);
            continue;
          }

          const startOffset = b * PARTICLES_PER_BURST;
          const fade = 1.0 - lifeProgress;

          for (let i = 0; i < PARTICLES_PER_BURST; i++) {
            const pIdx = startOffset + i;
            const i3 = pIdx * 3;
            const velocity = burst[`v_${i}`];

            if (velocity) {
              // Gravity and air drag
              velocity.y -= 2.2 * delta;
              velocity.multiplyScalar(0.98);

              posArr[i3] += velocity.x * delta;
              posArr[i3 + 1] += velocity.y * delta;
              posArr[i3 + 2] += velocity.z * delta;
            }

            alphaArr[pIdx] = fade;
          }
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.alpha.needsUpdate = true;
      },
      cleanup: () => {
        geometry.dispose();
        material.dispose();
        scene.remove(particleSystem);
      }
    };
  }, [burstCount]);

  const { isSupported } = useThreeCanvas(canvasRef, initScene, {
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance',
    onContextLost: onFallback2D
  });

  if (!isSupported) {
    if (onFallback2D) onFallback2D();
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 w-full h-full ${className}`}
      style={{ display: 'block', backgroundColor: 'transparent' }}
    />
  );
};

export default React.memo(Fireworks3D);
