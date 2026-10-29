import React, { useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import useThreeCanvas from '../useThreeCanvas';

/**
 * Snow3D Component
 * High-performance GPU-accelerated 3D crystalline snowflake particle system
 * Replaces CPU-bound 2D Canvas in SeasonalEffects for NOEL season.
 *
 * @param {string} intensity - 'LOW' | 'MEDIUM' | 'HIGH'
 * @param {string} className - Additional CSS classes
 */
const Snow3D = ({ intensity = 'MEDIUM', className = '', onFallback2D }) => {
  const canvasRef = useRef(null);

  // Particle count based on intensity
  const particleCount = useMemo(() => {
    switch (intensity) {
      case 'LOW': return 1500;
      case 'HIGH': return 6000;
      case 'MEDIUM':
      default: return 3200;
    }
  }, [intensity]);

  const initScene = useCallback(({ scene, camera }) => {
    // 1. Setup Camera
    camera.position.set(0, 0, 15);
    camera.lookAt(0, 0, 0);

    // 2. Setup Geometry & Attributes
    const geometry = new THREE.BufferGeometry();
    const count = particleCount;

    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const phases = new Float32Array(count);

    const xRange = 32;
    const yRange = 22;
    const zRange = 20;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * xRange;
      positions[i3 + 1] = (Math.random() - 0.5) * yRange;
      positions[i3 + 2] = (Math.random() - 0.5) * zRange;

      // Vertical falling speed: 0.8 - 2.4 units per sec
      speeds[i] = Math.random() * 1.6 + 0.8;
      // Snowflake point size
      sizes[i] = Math.random() * 2.2 + 1.2;
      // Opacity
      alphas[i] = Math.random() * 0.6 + 0.4;
      // Phase for twinkling & horizontal drift
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    // 3. Custom GLSL Shader Material for Crystalline Sparkle
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uWind: { value: 0.5 }
      },
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute float aPhase;
        uniform float uTime;
        uniform float uWind;
        varying float vAlpha;
        varying float vPhase;

        void main() {
          vAlpha = aAlpha;
          vPhase = aPhase;

          vec3 pos = position;
          // Organic wind drift calculation in vertex shader
          float wave = sin(uTime * 0.8 + pos.y * 0.15 + aPhase);
          pos.x += wave * 0.5 + uWind * 0.2;
          pos.z += cos(uTime * 0.6 + pos.y * 0.12 + aPhase) * 0.4;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          if (-mvPosition.z <= 0.5) {
            gl_PointSize = 0.0;
          } else {
            gl_PointSize = clamp(aSize * (140.0 / -mvPosition.z), 0.0, 32.0);
          }
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying float vAlpha;
        varying float vPhase;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          if (dist > 0.5) discard;

          // Twinkle pulse effect
          float twinkle = 0.75 + 0.25 * sin(uTime * 3.5 + vPhase * 6.283);

          // Soft core glow
          float core = smoothstep(0.48, 0.0, dist);

          // 6-pointed crystalline star diffraction arms
          float angle = atan(uv.y, uv.x);
          float spike = pow(abs(cos(angle * 3.0)), 6.0) * smoothstep(0.45, 0.0, dist);
          float totalGlow = core + spike * 0.8;

          // Ice-white color with subtle glacial cyan tint (#E0F2FE)
          vec3 iceColor = mix(vec3(0.88, 0.95, 1.0), vec3(1.0, 1.0, 1.0), core);

          gl_FragColor = vec4(iceColor, vAlpha * totalGlow * twinkle);
        }
      `
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // 4. Per-Frame Animation Logic
    return {
      onFrame: ({ delta, elapsed }) => {
        material.uniforms.uTime.value = elapsed;

        const posArr = geometry.attributes.position.array;
        const speedArr = geometry.attributes.aSpeed.array;

        // Falling movement loop
        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          posArr[i3 + 1] -= speedArr[i] * delta;

          // Wrap around boundary check
          if (posArr[i3 + 1] < -11) {
            posArr[i3 + 1] = 11;
            posArr[i3] = (Math.random() - 0.5) * xRange;
            posArr[i3 + 2] = (Math.random() - 0.5) * zRange;
          }
        }

        geometry.attributes.position.needsUpdate = true;
      },
      cleanup: () => {
        geometry.dispose();
        material.dispose();
        scene.remove(points);
      }
    };
  }, [particleCount]);

  const { isSupported } = useThreeCanvas(canvasRef, initScene, {
    alpha: true,
    antialias: false, // Points do not need heavy MSAA
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

export default React.memo(Snow3D);
