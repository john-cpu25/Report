import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import useThreeCanvas from './useThreeCanvas';

/**
 * ApexLogo3D Component
 * 3D Faceted Diamond / Structural Apex Emblem with Metallic Titanium PBR Material
 * Designed for the Login screen and brand preloader.
 */
const ApexLogo3D = ({ className = '' }) => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ targetX: 0, targetY: 0, x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.targetX = x * 0.6;
      mouseRef.current.targetY = y * 0.4;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const initScene = useCallback(({ scene, camera }) => {
    camera.position.set(0, 0, 7.5);
    camera.lookAt(0, 0, 0);

    const logoGroup = new THREE.Group();
    scene.add(logoGroup);

    // 1. Double Pyramid / Faceted Diamond Geometry (Octahedron with bevel)
    const geom = new THREE.OctahedronGeometry(2.2, 0);
    geom.scale(1.0, 1.35, 0.85); // Elongated elegant diamond apex shape

    // PBR Chrome Titanium Material
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      emissive: 0x0369a1,
      emissiveIntensity: 0.15,
      metalness: 0.95,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 1.0,
      wireframe: false
    });

    const mesh = new THREE.Mesh(geom, material);
    logoGroup.add(mesh);

    // Glowing Cyan Engineering Edge Lines
    const edgesGeom = new THREE.EdgesGeometry(geom);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 2,
      transparent: true,
      opacity: 0.85
    });
    const edgeLines = new THREE.LineSegments(edgesGeom, lineMaterial);
    logoGroup.add(edgeLines);

    // Floating orbital rings representing engineering precision
    const ringGeom = new THREE.TorusGeometry(3.2, 0.02, 16, 80);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.4
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI * 0.35;
    logoGroup.add(ring);

    // 2. High-Tech Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    const keyLight = new THREE.DirectionalLight(0x38bdf8, 3.0);
    keyLight.position.set(5, 8, 6);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 2.0);
    rimLight.position.set(-6, -4, -4);

    scene.add(ambientLight, keyLight, rimLight);

    return {
      onFrame: ({ delta, elapsed }) => {
        // Smooth mouse tilt lerp
        const m = mouseRef.current;
        m.x += (m.targetX - m.x) * 0.06;
        m.y += (m.targetY - m.y) * 0.06;

        // Continuous gentle rotation combined with mouse tilt
        logoGroup.rotation.y = elapsed * 0.35 + m.x;
        logoGroup.rotation.x = Math.sin(elapsed * 0.5) * 0.15 - m.y;
        logoGroup.position.y = Math.sin(elapsed * 1.5) * 0.15; // Smooth levitation

        ring.rotation.z = elapsed * 0.2;
      },
      cleanup: () => {
        geom.dispose();
        material.dispose();
        edgesGeom.dispose();
        lineMaterial.dispose();
        ringGeom.dispose();
        ringMat.dispose();
        scene.remove(logoGroup, ambientLight, keyLight, rimLight);
      }
    };
  }, []);

  const { isSupported } = useThreeCanvas(canvasRef, initScene, {
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });

  if (!isSupported) return null;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block pointer-events-none"
      />
    </div>
  );
};

export default React.memo(ApexLogo3D);
