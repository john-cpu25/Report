import React, { useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import useThreeCanvas from '../useThreeCanvas';

/**
 * Hearts3D Component
 * 3D floating hearts with gentle heartbeat pulsing and upward drift
 * Powered by THREE.InstancedMesh for Valentine season.
 *
 * @param {string} intensity - 'LOW' | 'MEDIUM' | 'HIGH'
 * @param {string} className - Additional CSS classes
 */
const Hearts3D = ({ intensity = 'MEDIUM', className = '', onFallback2D }) => {
  const canvasRef = useRef(null);

  const heartCount = useMemo(() => {
    switch (intensity) {
      case 'LOW': return 30;
      case 'HIGH': return 120;
      case 'MEDIUM':
      default: return 60;
    }
  }, [intensity]);

  const initScene = useCallback(({ scene, camera }) => {
    camera.position.set(0, 0, 14);
    camera.lookAt(0, 0, 0);

    const count = heartCount;

    // 1. Parametric 3D Heart Geometry using Shape extrusion
    const x = 0, y = 0;
    const heartShape = new THREE.Shape();
    heartShape.moveTo(x + 0.25, y + 0.25);
    heartShape.bezierCurveTo(x + 0.25, y + 0.25, x + 0.2, y, x, y);
    heartShape.bezierCurveTo(x - 0.3, y, x - 0.3, y + 0.35, x - 0.3, y + 0.35);
    heartShape.bezierCurveTo(x - 0.3, y + 0.55, x - 0.1, y + 0.77, x + 0.25, y + 0.95);
    heartShape.bezierCurveTo(x + 0.6, y + 0.77, x + 0.8, y + 0.55, x + 0.8, y + 0.35);
    heartShape.bezierCurveTo(x + 0.8, y + 0.35, x + 0.8, y, x + 0.5, y);
    heartShape.bezierCurveTo(x + 0.35, y, x + 0.25, y + 0.25, x + 0.25, y + 0.25);

    const extrudeSettings = {
      depth: 0.1,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.02
    };
    const heartGeometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
    // Center geometry & scale
    heartGeometry.center();
    heartGeometry.scale(0.5, 0.5, 0.5);

    // 2. Translucent glowing heart material
    const heartMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.2,
      metalness: 0.1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88
    });

    const instancedMesh = new THREE.InstancedMesh(heartGeometry, heartMaterial, count);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();
    const heartData = [];

    const colors = [
      new THREE.Color('#FF2D55'), // Ruby Rose
      new THREE.Color('#FF375F'), // Vivid Pink
      new THREE.Color('#FB7185'), // Soft Coral
      new THREE.Color('#E11D48')  // Deep Crimson
    ];

    const xRange = 26;
    const yRange = 20;
    const zRange = 14;

    for (let i = 0; i < count; i++) {
      instancedMesh.setColorAt(i, colors[i % colors.length]);

      heartData.push({
        x: (Math.random() - 0.5) * xRange,
        y: (Math.random() - 0.5) * yRange,
        z: (Math.random() - 0.5) * zRange,
        speedY: Math.random() * 0.7 + 0.4,
        rotY: Math.random() * Math.PI * 2,
        rotZ: (Math.random() - 0.5) * 0.4,
        rotSpeedY: (Math.random() - 0.5) * 1.5,
        baseScale: Math.random() * 0.35 + 0.65,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 1.2 + 0.8,
        pulseOffset: Math.random() * Math.PI * 2
      });
    }

    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }

    scene.add(instancedMesh);

    // Subtle romantic lighting
    const ambientLight = new THREE.AmbientLight(0xffe4e6, 1.2);
    const pointLight = new THREE.PointLight(0xff6b81, 2.0, 30);
    pointLight.position.set(0, 2, 10);
    scene.add(ambientLight, pointLight);

    return {
      onFrame: ({ delta, elapsed }) => {
        for (let i = 0; i < count; i++) {
          const h = heartData[i];

          // Upward drift
          h.y += h.speedY * delta;
          h.wobble += h.wobbleSpeed * delta;
          h.x += Math.sin(h.wobble) * delta * 0.6;
          h.rotY += h.rotSpeedY * delta;

          // Heartbeat pulse animation
          const pulse = 1.0 + Math.sin(elapsed * 4.0 + h.pulseOffset) * 0.08;

          // Wrap boundaries
          if (h.y > 11) {
            h.y = -11;
            h.x = (Math.random() - 0.5) * xRange;
            h.z = (Math.random() - 0.5) * zRange;
          }

          dummy.position.set(h.x, h.y, h.z);
          // Inverted Y rotation because heart shape is drawn right-side up
          dummy.rotation.set(Math.PI, h.rotY, h.rotZ);
          dummy.scale.setScalar(h.baseScale * pulse);
          dummy.updateMatrix();

          instancedMesh.setMatrixAt(i, dummy.matrix);
        }

        instancedMesh.instanceMatrix.needsUpdate = true;
      },
      cleanup: () => {
        heartGeometry.dispose();
        heartMaterial.dispose();
        scene.remove(instancedMesh, ambientLight, pointLight);
      }
    };
  }, [heartCount]);

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

export default React.memo(Hearts3D);
