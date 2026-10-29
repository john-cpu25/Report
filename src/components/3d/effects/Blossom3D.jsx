import React, { useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import useThreeCanvas from '../useThreeCanvas';

/**
 * Blossom3D Component
 * 3D tumbling peach blossoms (hoa đào) & apricot blossoms (hoa mai)
 * Powered by THREE.InstancedMesh for rock-solid 60-120fps GPU rendering.
 *
 * @param {string} intensity - 'LOW' | 'MEDIUM' | 'HIGH'
 * @param {string} className - Additional CSS classes
 */
const Blossom3D = ({ intensity = 'MEDIUM', className = '', onFallback2D }) => {
  const canvasRef = useRef(null);

  const petalCount = useMemo(() => {
    switch (intensity) {
      case 'LOW': return 80;
      case 'HIGH': return 350;
      case 'MEDIUM':
      default: return 180;
    }
  }, [intensity]);

  const initScene = useCallback(({ scene, camera }) => {
    camera.position.set(0, 0, 14);
    camera.lookAt(0, 0, 0);

    const count = petalCount;

    // 1. Create realistic 3D curved petal geometry
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.2, 0.3, 0.4, 0.8, 0, 1.2);
    shape.bezierCurveTo(-0.4, 0.8, -0.2, 0.3, 0, 0);

    const extrudeSettings = {
      depth: 0.02,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.01
    };
    const petalGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    petalGeometry.scale(0.35, 0.35, 0.35);

    // 2. Material with smooth 2-sided rendering and subtle translucent glow
    const petalMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.4,
      metalness: 0.1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92
    });

    const instancedMesh = new THREE.InstancedMesh(petalGeometry, petalMaterial, count);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // 3. Setup individual petal state
    const dummy = new THREE.Object3D();
    const petalData = [];

    // Colors: Pink Peach Blossom (#FB7185, #FDA4AF) & Golden Apricot (#FACC15, #FDE047)
    const colorPink1 = new THREE.Color('#FB7185');
    const colorPink2 = new THREE.Color('#FDA4AF');
    const colorYellow1 = new THREE.Color('#FACC15');
    const colorYellow2 = new THREE.Color('#FDE047');

    const xRange = 28;
    const yRange = 22;
    const zRange = 16;

    for (let i = 0; i < count; i++) {
      const isMai = Math.random() > 0.65; // ~35% hoa mai vàng, 65% hoa đào hồng
      const baseColor = isMai
        ? (Math.random() > 0.5 ? colorYellow1 : colorYellow2)
        : (Math.random() > 0.5 ? colorPink1 : colorPink2);

      instancedMesh.setColorAt(i, baseColor);

      petalData.push({
        x: (Math.random() - 0.5) * xRange,
        y: (Math.random() - 0.5) * yRange,
        z: (Math.random() - 0.5) * zRange,
        speedY: Math.random() * 0.9 + 0.5,
        speedX: Math.random() * 0.4 - 0.2,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        rotSpeedX: (Math.random() - 0.5) * 2.5,
        rotSpeedY: (Math.random() - 0.5) * 2.0,
        rotSpeedZ: (Math.random() - 0.5) * 2.2,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 1.5 + 0.8,
        scale: Math.random() * 0.4 + 0.7
      });
    }

    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }

    scene.add(instancedMesh);

    // 4. Subtle ambient & directional light to catch 3D petal edges
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    const dirLight = new THREE.DirectionalLight(0xfff1e6, 1.5);
    dirLight.position.set(5, 10, 8);
    scene.add(ambientLight, dirLight);

    return {
      onFrame: ({ delta, elapsed }) => {
        for (let i = 0; i < count; i++) {
          const p = petalData[i];

          // Fall down and organic flutter
          p.y -= p.speedY * delta;
          p.wobble += p.wobbleSpeed * delta;
          p.x += (Math.sin(p.wobble) * 0.6 + p.speedX) * delta * 2;

          // 3D Tumbling rotation
          p.rotX += p.rotSpeedX * delta;
          p.rotY += p.rotSpeedY * delta;
          p.rotZ += p.rotSpeedZ * delta;

          // Wrap boundaries
          if (p.y < -11) {
            p.y = 11;
            p.x = (Math.random() - 0.5) * xRange;
            p.z = (Math.random() - 0.5) * zRange;
          }

          dummy.position.set(p.x, p.y, p.z);
          dummy.rotation.set(p.rotX, p.rotY, p.rotZ);
          dummy.scale.setScalar(p.scale);
          dummy.updateMatrix();

          instancedMesh.setMatrixAt(i, dummy.matrix);
        }

        instancedMesh.instanceMatrix.needsUpdate = true;
      },
      cleanup: () => {
        petalGeometry.dispose();
        petalMaterial.dispose();
        scene.remove(instancedMesh, ambientLight, dirLight);
      }
    };
  }, [petalCount]);

  const { isSupported } = useThreeCanvas(canvasRef, initScene, {
    alpha: true,
    antialias: true,
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

export default React.memo(Blossom3D);
