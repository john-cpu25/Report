import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import useThreeCanvas from './useThreeCanvas';

/**
 * StructuralModel3D Component
 * Real-time 3D BIM Structural Engineering Model for APEX Southern Cross Engineering
 * 
 * Features:
 * - 9 Parametric 3D structural columns (C-01 to C-09) with real 3D extrusion
 * - Interconnected horizontal beams in 3x3 grid
 * - Progressive multi-floor slab construction (Foundation -> L1 -> L2 -> L3 -> Roof)
 * - 360-degree interactive rotation (Drag to rotate, scroll to zoom)
 * - Glow Wireframe + Solid PBR Engineering materials
 */
const StructuralModel3D = ({ progress = 50, isDark = true }) => {
  const canvasRef = useRef(null);
  const interactionRef = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    rotX: 0.35,
    rotY: -0.75,
    zoom: 18,
    targetZoom: 18
  });

  const [activeFloor, setActiveFloor] = useState('FOUNDATION');

  // Mouse interaction handlers for 360 degree Orbit inspection
  const handlePointerDown = (e) => {
    interactionRef.current.isDragging = true;
    interactionRef.current.prevX = e.clientX;
    interactionRef.current.prevY = e.clientY;
  };

  const handlePointerMove = (e) => {
    if (!interactionRef.current.isDragging) return;
    const dx = e.clientX - interactionRef.current.prevX;
    const dy = e.clientY - interactionRef.current.prevY;
    interactionRef.current.prevX = e.clientX;
    interactionRef.current.prevY = e.clientY;

    interactionRef.current.rotY += dx * 0.008;
    // Limit pitch angle to prevent flipping
    interactionRef.current.rotX = Math.max(0.1, Math.min(1.2, interactionRef.current.rotX + dy * 0.008));
  };

  const handlePointerUp = () => {
    interactionRef.current.isDragging = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const newZoom = interactionRef.current.targetZoom + (e.deltaY > 0 ? 1.5 : -1.5);
    interactionRef.current.targetZoom = Math.max(10, Math.min(32, newZoom));
  };

  const initScene = useCallback(({ scene, camera }) => {
    camera.position.set(0, 8, 18);
    camera.lookAt(0, 3, 0);

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // 1. Technical Ground Grid
    const gridHelper = new THREE.GridHelper(16, 16, 0x06b6d4, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // 2. 9 Columns (3x3 Grid Layout)
    const columnCoords = [
      { id: 'C-09', x: -3.5, z: -3.5 },
      { id: 'C-08', x: 0, z: -3.5 },
      { id: 'C-07', x: 3.5, z: -3.5 },
      { id: 'C-06', x: -3.5, z: 0 },
      { id: 'C-05', x: 0, z: 0 },
      { id: 'C-04', x: 3.5, z: 0 },
      { id: 'C-03', x: -3.5, z: 3.5 },
      { id: 'C-02', x: 0, z: 3.5 },
      { id: 'C-01', x: 3.5, z: 3.5 }
    ];

    const columnMeshes = [];
    const MAX_HEIGHT = 7.0; // Full building height

    // Structural steel/concrete material
    const columnMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.8,
      roughness: 0.25,
      wireframe: false
    });

    const wireMaterial = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.8
    });

    columnCoords.forEach((col) => {
      // Column group
      const cGroup = new THREE.Group();
      cGroup.position.set(col.x, 0, col.z);

      // Solid Box Column
      const geom = new THREE.BoxGeometry(0.35, 1, 0.35);
      // Move pivot to base so scaling Y expands upward
      geom.translate(0, 0.5, 0);

      const mesh = new THREE.Mesh(geom, columnMaterial);
      cGroup.add(mesh);

      // Edge wireframe for CAD look
      const edges = new THREE.EdgesGeometry(geom);
      const line = new THREE.LineSegments(edges, wireMaterial);
      mesh.add(line);

      // Top Anchor Node (Sphere)
      const nodeGeom = new THREE.SphereGeometry(0.15, 16, 16);
      const nodeMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const nodeMesh = new THREE.Mesh(nodeGeom, nodeMat);
      nodeMesh.position.y = 1;
      cGroup.add(nodeMesh);

      modelGroup.add(cGroup);
      columnMeshes.push({ group: cGroup, mesh, node: nodeMesh });
    });

    // 3. Multi-Floor Horizontal Beams & Slabs
    const beamMaterial = new THREE.MeshStandardMaterial({
      color: 0x818cf8,
      metalness: 0.7,
      roughness: 0.3
    });

    const slabMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.65,
      metalness: 0.5,
      roughness: 0.5
    });

    // Create 4 floor levels: L1 (25%), L2 (50%), L3 (75%), Roof (100%)
    const floorLevels = [
      { name: 'LVL 01', y: MAX_HEIGHT * 0.25, threshold: 25 },
      { name: 'LVL 02', y: MAX_HEIGHT * 0.5, threshold: 50 },
      { name: 'LVL 03', y: MAX_HEIGHT * 0.75, threshold: 75 },
      { name: 'ROOF', y: MAX_HEIGHT * 1.0, threshold: 98 }
    ];

    const floorGroups = [];

    floorLevels.forEach((fl) => {
      const fGroup = new THREE.Group();
      fGroup.position.y = fl.y;
      fGroup.visible = false;

      // Slab plate
      const slabGeom = new THREE.BoxGeometry(7.6, 0.1, 7.6);
      const slabMesh = new THREE.Mesh(slabGeom, slabMaterial);
      fGroup.add(slabMesh);

      // Beams along grid lines
      const createBeam = (x1, z1, x2, z2) => {
        const dx = x2 - x1;
        const dz = z2 - z1;
        const length = Math.sqrt(dx * dx + dz * dz);
        const beamGeom = new THREE.BoxGeometry(0.2, 0.2, length);
        const beamMesh = new THREE.Mesh(beamGeom, beamMaterial);
        beamMesh.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
        beamMesh.rotation.y = Math.atan2(dx, dz);
        return beamMesh;
      };

      // X-axis & Z-axis grid beams
      [-3.5, 0, 3.5].forEach((pos) => {
        fGroup.add(createBeam(-3.5, pos, 3.5, pos));
        fGroup.add(createBeam(pos, -3.5, pos, 3.5));
      });

      modelGroup.add(fGroup);
      floorGroups.push({ group: fGroup, threshold: fl.threshold, name: fl.name });
    });

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    const dirLight1 = new THREE.DirectionalLight(0x06b6d4, 2.0);
    dirLight1.position.set(10, 20, 15);

    const dirLight2 = new THREE.DirectionalLight(0xf43f5e, 1.2);
    dirLight2.position.set(-10, -5, -10);

    scene.add(ambientLight, dirLight1, dirLight2);

    return {
      onFrame: ({ delta }) => {
        const currentProgress = interactionRef.current.latestProgress ?? progress;
        const currentH = (currentProgress / 100) * MAX_HEIGHT;

        // Update column growth
        columnMeshes.forEach((col) => {
          col.mesh.scale.y = Math.max(0.01, currentH);
          col.node.position.y = currentH;
          col.node.material.color.set(currentProgress >= 98 ? 0x10b981 : 0xf43f5e);
        });

        // Toggle floor slabs visibility according to progress
        floorGroups.forEach((fl) => {
          fl.group.visible = currentProgress >= fl.threshold;
        });

        // Smooth camera Orbit interpolation
        const inter = interactionRef.current;
        inter.zoom += (inter.targetZoom - inter.zoom) * 0.1;

        // Auto slow rotation when user is not dragging
        if (!inter.isDragging) {
          inter.rotY += delta * 0.2;
        }

        const cx = Math.sin(inter.rotY) * Math.cos(inter.rotX) * inter.zoom;
        const cy = Math.sin(inter.rotX) * inter.zoom + 2;
        const cz = Math.cos(inter.rotY) * Math.cos(inter.rotX) * inter.zoom;

        camera.position.set(cx, cy, cz);
        camera.lookAt(0, currentH * 0.5, 0);
      },
      cleanup: () => {
        columnMaterial.dispose();
        wireMaterial.dispose();
        beamMaterial.dispose();
        slabMaterial.dispose();
        scene.remove(modelGroup, gridHelper, ambientLight, dirLight1, dirLight2);
      }
    };
  }, []);

  // Sync external progress to ref without re-creating scene
  useEffect(() => {
    interactionRef.current.latestProgress = progress;
  }, [progress]);

  useThreeCanvas(canvasRef, initScene, {
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });

  return (
    <div
      className="relative w-full h-full cursor-grab active:cursor-grabbing select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />

      {/* 360-degree interactive inspection hint overlay */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/80 border border-cyan-500/30 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono text-cyan-300 pointer-events-none flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        KÉO CHUỘT XOAY 360° | CUỘN ZOOM | MÔ HÌNH BIM APEX
      </div>
    </div>
  );
};

export default React.memo(StructuralModel3D);
