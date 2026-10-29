import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Users, 
  Layers, 
  Search, 
  Filter, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  ArrowRight, 
  FolderGit2, 
  Maximize2,
  GitFork,
  Sparkles,
  Eye,
  Globe2,
  Flame,
  RotateCw,
  Compass
} from 'lucide-react';

// ==========================================
// 1. PROCEDURAL GLOW TEXTURE & SPRITES
// ==========================================
const createGlowTexture = (colorStr, size = 64) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.2, colorStr);
  gradient.addColorStop(0.5, colorStr);
  gradient.addColorStop(0.8, 'rgba(0,0,0,0.15)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
};

// 3D Text Billboard Label for Project Hubs
const createTextSprite = (text, color = '#ffffff') => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 64);
  
  // High-tech glass pill
  ctx.fillStyle = 'rgba(5, 12, 30, 0.85)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(16, 12, 224, 40, 20);
  ctx.fill();
  ctx.stroke();

  // Project label
  ctx.fillStyle = color;
  ctx.font = '900 22px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(15, 3.75, 1);
  return sprite;
};

// ==========================================
// 2. MAIN 3D NETWORK COMPONENT
// ==========================================
export default function ProjectTaskNetwork({
  tasks = [],
  filteredData = [],
  dashboardProjects = [],
  dashboardUsers = [],
  getProjectColor,
  theme,
  initialProject = '',
  initialUser = ''
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Filter States
  const [selectedProject, setSelectedProject] = useState(initialProject || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRotate, setAutoRotate] = useState(true);
  const [themeMode, setThemeMode] = useState('cosmic'); // 'cosmic' (Image 1 - Blue Horizon) | 'cyber' (Image 2 - Amber City)
  
  // Selected Node for Right Inspector Drawer
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false });

  // Scene references
  const threeRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    animId: null,
    nodesMap: new Map(),
    interactiveObjects: [],
    flowParticles: [],
    photonGeo: null,
    targetCamPos: null,
    targetLookAt: null
  });

  // Project List for dropdown
  const projectOptions = useMemo(() => {
    const set = new Set();
    tasks.forEach(t => {
      const p = (t.project || t.projectKey || '').trim().toUpperCase();
      if (p && p !== 'UNASSIGNED') set.add(p);
    });
    return Array.from(set).sort();
  }, [tasks]);

  // User Lookup Map
  const userMap = useMemo(() => {
    const map = new Map();
    if (dashboardUsers) {
      dashboardUsers.forEach(u => {
        if (!u) return;
        if (u.id) map.set(u.id, u);
        if (u.id) map.set(u.id.toLowerCase(), u);
        if (u.name) map.set(u.name.toLowerCase().trim(), u);
      });
    }
    return map;
  }, [dashboardUsers]);

  // Project Lookup Map
  const projectMap = useMemo(() => {
    const map = new Map();
    if (dashboardProjects) {
      dashboardProjects.forEach(p => {
        if (!p) return;
        const key = (p.key || p.name || '').trim().toUpperCase();
        if (p.id) map.set(p.id, p);
        if (key) map.set(key, p);
      });
    }
    return map;
  }, [dashboardProjects]);

  // Filter Tasks
  const candidateTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t) return false;
      const pKey = (t.project || '').trim().toUpperCase();
      if (selectedProject !== 'ALL' && pKey !== selectedProject) return false;
      if (selectedStatus !== 'ALL') {
        const s = Number(t.status);
        if (selectedStatus === 'pending' && s !== 0) return false;
        if (selectedStatus === 'wip' && (s < 1 || s > 2)) return false;
        if (selectedStatus === 'review' && s !== 3) return false;
        if (selectedStatus === 'done' && s < 4) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (t.name || t.taskName || '').toLowerCase().includes(q);
        const matchUser = (t.userName || '').toLowerCase().includes(q);
        const matchCreator = (t.createdBy || '').toLowerCase().includes(q);
        if (!matchTitle && !matchUser && !matchCreator) return false;
      }
      return true;
    });
  }, [tasks, selectedProject, selectedStatus, searchQuery]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let pending = 0;
    let wip = 0;
    let review = 0;
    let done = 0;
    const uniqueUsers = new Set();

    candidateTasks.forEach(t => {
      const s = Number(t.status);
      if (s >= 4) done++;
      else if (s === 3) review++;
      else if (s === 1 || s === 2) wip++;
      else pending++;

      if (t.userName) uniqueUsers.add(t.userName);
      if (t.createdBy) uniqueUsers.add(t.createdBy);
    });

    return {
      total: candidateTasks.length,
      pending,
      wip,
      review,
      done,
      members: uniqueUsers.size
    };
  }, [candidateTasks]);

  // ==========================================
  // 3. THREE.JS INITIALIZATION & SCENE GRAPH
  // ==========================================
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Palette
    const scene = new THREE.Scene();
    const isCosmic = themeMode === 'cosmic';

    // Deep space backdrop & fog
    scene.background = new THREE.Color(isCosmic ? 0x030712 : 0x0b0404);
    scene.fog = new THREE.FogExp2(isCosmic ? 0x030712 : 0x0b0404, 0.0018);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(52, width / height, 1, 3000);
    camera.position.set(0, 95, 230);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.minDistance = 25;
    controls.maxDistance = 750;
    controls.maxPolarAngle = Math.PI / 2 + 0.12;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.45;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, isCosmic ? 0.7 : 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(isCosmic ? 0x99ddff : 0xffaa55, 1.4);
    mainLight.position.set(120, 220, 150);
    scene.add(mainLight);

    // 6. Curved Planetary Horizon & Constellation Wireframe (Image 1 / Image 2)
    const globeRadius = 195;
    const globeCenterY = -165;

    // Planetary Horizon Curvature Wireframe
    const globeGeo = new THREE.SphereGeometry(globeRadius, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2.2);
    const globeMat = new THREE.MeshBasicMaterial({
      color: isCosmic ? 0x0a2550 : 0x3d170a,
      wireframe: true,
      transparent: true,
      opacity: isCosmic ? 0.22 : 0.28
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    globeMesh.position.set(0, globeCenterY, 0);
    scene.add(globeMesh);

    // Horizon Atmospheric Light Arc
    const arcGeo = new THREE.RingGeometry(globeRadius - 0.5, globeRadius + 7, 96);
    const arcMat = new THREE.MeshBasicMaterial({
      color: isCosmic ? 0x00d2ff : 0xff6600,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isCosmic ? 0.45 : 0.55,
      blending: THREE.AdditiveBlending
    });
    const arcMesh = new THREE.Mesh(arcGeo, arcMat);
    arcMesh.rotation.x = Math.PI / 2;
    arcMesh.position.set(0, globeCenterY + globeRadius * 0.985, 0);
    scene.add(arcMesh);

    // Background Starfield Particles
    const starCount = 1000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 1200;
      starPositions[i + 1] = Math.random() * 500 + 10;
      starPositions[i + 2] = (Math.random() - 0.5) * 1200;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      size: 2.2,
      color: isCosmic ? 0x99ddff : 0xffddaa,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 7. Graph Data Construction in 3D Space
    const nodesMap = new Map();
    const interactiveObjects = [];
    const flowParticles = [];

    // Shared Geometries & Textures
    const sphereGeo = new THREE.SphereGeometry(1, 16, 16);
    const glowTexture = createGlowTexture(isCosmic ? 'rgba(0, 220, 255, 0.95)' : 'rgba(255, 120, 0, 0.95)');
    const glowMat = new THREE.SpriteMaterial({
      map: glowTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });

    // Group tasks by project
    const projectTasksMap = new Map();
    candidateTasks.forEach(t => {
      const pKey = (t.project || 'APEX').trim().toUpperCase();
      if (!projectTasksMap.has(pKey)) projectTasksMap.set(pKey, []);
      projectTasksMap.get(pKey).push(t);
    });

    const projectKeys = Array.from(projectTasksMap.keys());
    const totalProjects = Math.max(1, projectKeys.length);
    const projectPositions = [];

    // Common Line Materials with Additive Glow
    const lineMatArtery = new THREE.LineBasicMaterial({
      color: isCosmic ? 0x38bdf8 : 0xfb923c,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    const lineMatTask = new THREE.LineBasicMaterial({
      color: isCosmic ? 0x00e5ff : 0xff7700,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const lineMatSubtask = new THREE.LineBasicMaterial({
      color: isCosmic ? 0xf59e0b : 0xffaa00,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    // Place Project Hubs along a wide horizon arc
    projectKeys.forEach((pKey, pIdx) => {
      const pTasks = projectTasksMap.get(pKey);
      const pColorHex = (getProjectColor ? getProjectColor(pKey) : null) || projectMap.get(pKey)?.color || (isCosmic ? '#00e5ff' : '#ff7700');
      const pColor = new THREE.Color(pColorHex);

      const angle = (pIdx / totalProjects) * Math.PI * 1.5 - Math.PI * 0.75;
      const hubDist = 135;
      const hubX = Math.sin(angle) * hubDist;
      const hubZ = Math.cos(angle) * (hubDist * 0.7) - 35;
      const hubY = 32 + Math.sin(pIdx * 1.4) * 16;
      const hubPos = new THREE.Vector3(hubX, hubY, hubZ);
      projectPositions.push(hubPos);

      // --- Project Hub Core Sphere ---
      const hubMat = new THREE.MeshStandardMaterial({
        color: pColor,
        emissive: pColor,
        emissiveIntensity: 0.9,
        roughness: 0.15
      });
      const hubMesh = new THREE.Mesh(sphereGeo, hubMat);
      hubMesh.scale.set(6.5, 6.5, 6.5);
      hubMesh.position.copy(hubPos);
      scene.add(hubMesh);

      // Outer Pulsing Corona Glow Sprite
      const hubGlow = new THREE.Sprite(glowMat.clone());
      hubGlow.material.color = pColor;
      hubGlow.scale.set(28, 28, 1);
      hubMesh.add(hubGlow);

      // Orbiting Halo Ring
      const ringGeo = new THREE.RingGeometry(8.5, 10.2, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: pColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2.2;
      hubMesh.add(ringMesh);

      // Floating 3D Billboard Label
      const hubLabel = createTextSprite(pKey, pColorHex);
      hubLabel.position.set(hubX, hubY + 12, hubZ);
      scene.add(hubLabel);

      const hubNodeData = {
        id: `project-${pKey}`,
        type: 'project',
        projectKey: pKey,
        color: pColorHex,
        taskCount: pTasks.length,
        position: hubPos
      };
      hubMesh.userData = hubNodeData;
      interactiveObjects.push(hubMesh);
      nodesMap.set(hubNodeData.id, { mesh: hubMesh, data: hubNodeData });

      // Separate Parent tasks and Child tasks
      const parentTasks = pTasks.filter(t => !t.parent_id);
      const childTasks = pTasks.filter(t => Boolean(t.parent_id));
      const parentMeshMap = new Map();
      const parentPositions = [];

      // --- Place Parent Tasks around Project Hub ---
      parentTasks.forEach((t, tIdx) => {
        const subAngle = (tIdx / Math.max(1, parentTasks.length)) * Math.PI * 2;
        const orbitRadius = 32 + (tIdx % 3) * 7;
        const taskX = hubX + Math.cos(subAngle) * orbitRadius;
        const taskZ = hubZ + Math.sin(subAngle) * orbitRadius;
        const taskY = hubY + (Math.sin(subAngle * 2) * 11);
        const taskPos = new THREE.Vector3(taskX, taskY, taskZ);
        parentPositions.push(taskPos);

        const status = Number(t.status);
        let taskColorHex = isCosmic ? '#ffaa00' : '#ff9900'; // Pending
        if (status >= 4) taskColorHex = '#10b981'; // Done
        else if (status === 3) taskColorHex = '#f43f5e'; // Review
        else if (status === 1 || status === 2) taskColorHex = isCosmic ? '#00e5ff' : '#ff5500'; // WIP

        const taskColor = new THREE.Color(taskColorHex);
        const taskMat = new THREE.MeshStandardMaterial({
          color: taskColor,
          emissive: taskColor,
          emissiveIntensity: 0.85,
          roughness: 0.2
        });

        const taskMesh = new THREE.Mesh(sphereGeo, taskMat);
        const taskSize = 3.6;
        taskMesh.scale.set(taskSize, taskSize, taskSize);
        taskMesh.position.copy(taskPos);
        scene.add(taskMesh);

        // Task Glow Halo
        const taskGlow = new THREE.Sprite(glowMat.clone());
        taskGlow.material.color = taskColor;
        taskGlow.scale.set(13, 13, 1);
        taskMesh.add(taskGlow);

        const taskNodeData = {
          id: `task-${t.id}`,
          type: 'task',
          task: t,
          taskName: t.taskName || t.name,
          projectKey: pKey,
          status: t.status,
          hours_planned: t.hours_planned,
          hours_complete: t.hours_complete,
          isParent: true,
          position: taskPos
        };
        taskMesh.userData = taskNodeData;
        interactiveObjects.push(taskMesh);
        nodesMap.set(taskNodeData.id, { mesh: taskMesh, data: taskNodeData });
        parentMeshMap.set(t.id, { mesh: taskMesh, pos: taskPos });

        // Line: Project Hub -> Parent Task
        const hubLineGeo = new THREE.BufferGeometry().setFromPoints([hubPos, taskPos]);
        const hubLine = new THREE.Line(hubLineGeo, lineMatTask);
        scene.add(hubLine);

        // Flowing energy photon pulse
        flowParticles.push({
          start: hubPos,
          end: taskPos,
          progress: Math.random(),
          speed: 0.007 + Math.random() * 0.005,
          color: taskColor
        });
      });

      // Sister-task geometric constellation mesh (creating polygon network triangles like Image 1!)
      for (let i = 0; i < parentPositions.length; i++) {
        if (i < parentPositions.length - 1) {
          const sisterLineGeo = new THREE.BufferGeometry().setFromPoints([parentPositions[i], parentPositions[i + 1]]);
          const sisterLine = new THREE.Line(sisterLineGeo, lineMatArtery);
          scene.add(sisterLine);
        }
      }

      // --- Place Child Tasks orbiting their Parent Tasks ---
      childTasks.forEach((cTask, cIdx) => {
        const parentInfo = parentMeshMap.get(cTask.parent_id);
        const parentPos = parentInfo ? parentInfo.pos : hubPos;

        const subAngle = (cIdx / Math.max(1, childTasks.length)) * Math.PI * 2;
        const childDist = 12 + (cIdx % 2) * 5;
        const childX = parentPos.x + Math.cos(subAngle) * childDist;
        const childZ = parentPos.z + Math.sin(subAngle) * childDist;
        const childY = parentPos.y + (Math.sin(subAngle) * 6);
        const childPos = new THREE.Vector3(childX, childY, childZ);

        const status = Number(cTask.status);
        let childColorHex = isCosmic ? '#38bdf8' : '#fb923c';
        if (status >= 4) childColorHex = '#34d399';
        else if (status === 3) childColorHex = '#fb7185';
        else if (status === 1 || status === 2) childColorHex = isCosmic ? '#00e5ff' : '#ff4400';

        const childColor = new THREE.Color(childColorHex);
        const childMat = new THREE.MeshStandardMaterial({
          color: childColor,
          emissive: childColor,
          emissiveIntensity: 0.7
        });
        const childMesh = new THREE.Mesh(sphereGeo, childMat);
        childMesh.scale.set(2.4, 2.4, 2.4);
        childMesh.position.copy(childPos);
        scene.add(childMesh);

        // Child Glow Halo
        const childGlow = new THREE.Sprite(glowMat.clone());
        childGlow.material.color = childColor;
        childGlow.scale.set(8, 8, 1);
        childMesh.add(childGlow);

        const childNodeData = {
          id: `task-${cTask.id}`,
          type: 'task',
          task: cTask,
          taskName: cTask.taskName || cTask.name,
          projectKey: pKey,
          status: cTask.status,
          hours_planned: cTask.hours_planned,
          hours_complete: cTask.hours_complete,
          isParent: false,
          parent_id: cTask.parent_id,
          position: childPos
        };
        childMesh.userData = childNodeData;
        interactiveObjects.push(childMesh);
        nodesMap.set(childNodeData.id, { mesh: childMesh, data: childNodeData });

        // Line: Parent Task -> Child Task
        const pLineGeo = new THREE.BufferGeometry().setFromPoints([parentPos, childPos]);
        const pLine = new THREE.Line(pLineGeo, lineMatSubtask);
        scene.add(pLine);

        // Flow particle on Child link
        flowParticles.push({
          start: parentPos,
          end: childPos,
          progress: Math.random(),
          speed: 0.009 + Math.random() * 0.004,
          color: childColor
        });
      });
    });

    // Arterial Constellation Lines connecting adjacent Project Hubs (Image 1 style)
    for (let i = 0; i < projectPositions.length; i++) {
      if (i < projectPositions.length - 1) {
        const arteryGeo = new THREE.BufferGeometry().setFromPoints([projectPositions[i], projectPositions[i + 1]]);
        const arteryLine = new THREE.Line(arteryGeo, lineMatArtery);
        scene.add(arteryLine);

        // Flow particle connecting Project Hubs
        flowParticles.push({
          start: projectPositions[i],
          end: projectPositions[i + 1],
          progress: Math.random(),
          speed: 0.004,
          color: new THREE.Color(isCosmic ? 0x00e5ff : 0xff7700)
        });
      }
    }

    // 8. Photon Point Cloud for Flowing Light Pulses
    const photonCount = flowParticles.length;
    const photonGeo = new THREE.BufferGeometry();
    const photonPositions = new Float32Array(photonCount * 3);
    const photonColors = new Float32Array(photonCount * 3);
    photonGeo.setAttribute('position', new THREE.BufferAttribute(photonPositions, 3));
    photonGeo.setAttribute('color', new THREE.BufferAttribute(photonColors, 3));

    const photonMat = new THREE.PointsMaterial({
      size: 4.5,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    const photonPoints = new THREE.Points(photonGeo, photonMat);
    scene.add(photonPoints);

    // Store in ref
    threeRef.current = {
      scene,
      camera,
      renderer,
      controls,
      nodesMap,
      interactiveObjects,
      flowParticles,
      photonPoints,
      photonGeo,
      targetCamPos: null,
      targetLookAt: null
    };

    // 9. Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Controls update
      controls.update();

      // Twinkle Stars
      stars.rotation.y = elapsed * 0.015;

      // Animate Flowing Photons along edges
      const positions = photonGeo.attributes.position.array;
      const colors = photonGeo.attributes.color.array;

      for (let i = 0; i < flowParticles.length; i++) {
        const fp = flowParticles[i];
        fp.progress += fp.speed;
        if (fp.progress > 1) fp.progress = 0;

        const curPos = new THREE.Vector3().lerpVectors(fp.start, fp.end, fp.progress);
        positions[i * 3] = curPos.x;
        positions[i * 3 + 1] = curPos.y;
        positions[i * 3 + 2] = curPos.z;

        colors[i * 3] = fp.color.r;
        colors[i * 3 + 1] = fp.color.g;
        colors[i * 3 + 2] = fp.color.b;
      }
      photonGeo.attributes.position.needsUpdate = true;
      photonGeo.attributes.color.needsUpdate = true;

      // Smooth Camera Glide when flying to a node
      const ref = threeRef.current;
      if (ref.targetCamPos) {
        camera.position.lerp(ref.targetCamPos, 0.05);
        if (ref.targetLookAt) {
          controls.target.lerp(ref.targetLookAt, 0.05);
        }
        if (camera.position.distanceTo(ref.targetCamPos) < 1.5) {
          ref.targetCamPos = null;
        }
      }

      renderer.render(scene, camera);
      threeRef.current.animId = requestAnimationFrame(animate);
    };

    animate();

    // 10. Resize Listener
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (threeRef.current.animId) cancelAnimationFrame(threeRef.current.animId);
      controls.dispose();
      renderer.dispose();
      scene.clear();
    };
  }, [candidateTasks, themeMode, autoRotate]);

  // Sync auto-rotate toggle
  useEffect(() => {
    if (threeRef.current.controls) {
      threeRef.current.controls.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // ==========================================
  // 4. RAYCASTING: HOVER & CLICK INTERACTIONS
  // ==========================================
  const handlePointerMove = useCallback((e) => {
    const container = containerRef.current;
    if (!container || !threeRef.current.camera) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), threeRef.current.camera);

    const intersects = raycaster.intersectObjects(threeRef.current.interactiveObjects, false);

    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      const data = hitObj.userData;
      setHoveredNode(data);
      setTooltipPos({
        x: e.clientX - rect.left + 14,
        y: e.clientY - rect.top - 14,
        visible: true
      });
      container.style.cursor = 'pointer';
    } else {
      setHoveredNode(null);
      setTooltipPos(prev => ({ ...prev, visible: false }));
      container.style.cursor = 'default';
    }
  }, []);

  const handleClick = useCallback((e) => {
    const container = containerRef.current;
    if (!container || !threeRef.current.camera) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), threeRef.current.camera);

    const intersects = raycaster.intersectObjects(threeRef.current.interactiveObjects, false);

    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      const data = hitObj.userData;
      setSelectedNode(data);

      // Smooth camera glide to target node
      if (data.position) {
        const offset = new THREE.Vector3(0, 15, 45);
        threeRef.current.targetCamPos = data.position.clone().add(offset);
        threeRef.current.targetLookAt = data.position.clone();
      }
    } else {
      setSelectedNode(null);
    }
  }, []);

  // Reset Camera View
  const handleResetCamera = useCallback(() => {
    if (!threeRef.current.camera || !threeRef.current.controls) return;
    threeRef.current.targetCamPos = new THREE.Vector3(0, 95, 230);
    threeRef.current.targetLookAt = new THREE.Vector3(0, 0, 0);
  }, []);

  return (
    <div className="w-full h-full flex flex-col rounded-2xl border border-[var(--border,#1e293b)] bg-[#030712] text-white overflow-hidden shadow-2xl relative select-none">
      
      {/* ======================================================== */}
      {/* 1. TOP CONTROL BAR (10px padding & 12px font size)       */}
      {/* ======================================================== */}
      <div className="p-[10px] border-b border-white/10 bg-black/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-[10px] z-10">
        
        {/* Left Toolbar Controls */}
        <div className="flex items-center flex-wrap gap-[6px]">
          
          {/* Project Switcher */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 shadow-sm backdrop-blur">
            <FolderGit2 size={13} className="text-cyan-400 shrink-0" />
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="bg-transparent text-[12px] font-bold text-white focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL" className="bg-[#0f172a] text-white">ALL PROJECTS</option>
              {projectOptions.map(p => (
                <option key={p} value={p} className="bg-[#0f172a] text-white">{p}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 shadow-sm backdrop-blur">
            <Filter size={12} className="text-purple-400 shrink-0" />
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="bg-transparent text-[12px] font-medium text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#0f172a]">All Status</option>
              <option value="pending" className="bg-[#0f172a]">Pending</option>
              <option value="wip" className="bg-[#0f172a]">In Progress (WIP)</option>
              <option value="review" className="bg-[#0f172a]">Review</option>
              <option value="done" className="bg-[#0f172a]">Completed</option>
            </select>
          </div>

          {/* 3D Theme Mode Toggle (Cosmic Blue Globe vs Cyber Amber) */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setThemeMode('cosmic')}
              title="Cosmic Blue Horizon (Style 1)"
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                themeMode === 'cosmic' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'text-slate-400'
              }`}
            >
              <Globe2 size={11} /> Cosmic
            </button>
            <button
              onClick={() => setThemeMode('cyber')}
              title="Cyber Amber Constellation (Style 2)"
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                themeMode === 'cyber' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' : 'text-slate-400'
              }`}
            >
              <Flame size={11} /> Cyber
            </button>
          </div>

          {/* Auto Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            title="Toggle 3D Orbit Auto-Rotation"
            className={`px-2.5 py-1 rounded-xl text-[12px] font-medium transition-colors border shadow-sm flex items-center gap-1.5 ${
              autoRotate
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            <RotateCw size={12} className={autoRotate ? 'animate-spin' : ''} style={{ animationDuration: '6s' }} />
            <span>Orbit</span>
          </button>

          {/* Quick Search Box */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 shadow-sm">
            <Search size={12} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search 3D nodes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-[12px] text-white placeholder:text-slate-500 focus:outline-none w-32"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Right Summary Metrics Bar */}
        <div className="flex items-center gap-[6px] shrink-0 font-mono">
          <div className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase font-sans">TOTAL</span>
            <span className="text-[12px] font-bold text-white">{summaryMetrics.total}</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-cyan-400 uppercase font-sans">WIP</span>
            <span className="text-[12px] font-bold text-cyan-300">{summaryMetrics.wip}</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-emerald-400 uppercase font-sans">DONE</span>
            <span className="text-[12px] font-bold text-emerald-300">{summaryMetrics.done}</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-amber-400 uppercase font-sans">PENDING</span>
            <span className="text-[12px] font-bold text-amber-300">{summaryMetrics.pending}</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1.5">
            <Users size={12} className="text-purple-400" />
            <span className="text-[12px] font-bold text-white">{summaryMetrics.members}</span>
          </div>

          <button
            onClick={handleResetCamera}
            title="Reset 3D Camera"
            className="p-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-colors shadow-sm ml-1"
          >
            <Compass size={13} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. 3D WEBGL CANVAS VIEWPORT                              */}
      {/* ======================================================== */}
      <div 
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        className="flex-1 w-full h-full relative overflow-hidden"
      >
        <canvas ref={canvasRef} className="w-full h-full outline-none block" />

        {/* Floating Raycast Hover Tooltip HUD */}
        {tooltipPos.visible && hoveredNode && (
          <div
            className="absolute pointer-events-none z-30 px-3 py-2 rounded-xl bg-slate-900/90 border border-cyan-500/40 shadow-2xl backdrop-blur-md text-[12px] max-w-[240px] animate-in fade-in zoom-in-95 duration-150"
            style={{
              left: Math.min(tooltipPos.x, (containerRef.current?.clientWidth || 300) - 250),
              top: Math.min(tooltipPos.y, (containerRef.current?.clientHeight || 300) - 90)
            }}
          >
            {hoveredNode.type === 'project' ? (
              <div>
                <div className="text-[11px] font-black text-cyan-400 uppercase tracking-wider">PROJECT HUB</div>
                <div className="text-[13px] font-bold text-white mt-0.5">{hoveredNode.projectKey}</div>
                <div className="text-[11px] text-slate-300 mt-1 font-mono">{hoveredNode.taskCount} tasks connected</div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">
                    {hoveredNode.projectKey} · {hoveredNode.isParent ? 'PARENT' : 'SUBTASK'}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-white font-mono">
                    {hoveredNode.status >= 4 ? 'Done' : hoveredNode.status === 3 ? 'Review' : hoveredNode.status >= 1 ? 'WIP' : 'Pending'}
                  </span>
                </div>
                <div className="text-[12px] font-bold text-white leading-tight line-clamp-2">
                  {hoveredNode.taskName}
                </div>
                <div className="text-[11px] font-mono text-slate-300 mt-1 flex justify-between">
                  <span>Actual: <b>{(Number(hoveredNode.hours_complete) || 0).toFixed(1)}h</b></span>
                  <span>Plan: {(Number(hoveredNode.hours_planned) || 0).toFixed(1)}h</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Minimal Bottom Legend */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 backdrop-blur-md text-[11px] text-slate-300 font-medium shadow-lg">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00e5ff]" /> WIP
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" /> Done
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" /> Pending
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e]" /> Review
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-[10px] text-slate-400">Left-Drag: 3D Rotate · Wheel: Zoom · Right-Drag: Pan</span>
        </div>

        {/* ======================================================== */}
        {/* 3. SLIDE-OUT INSPECTOR DRAWER ON RIGHT (300px)           */}
        {/* ======================================================== */}
        {selectedNode && (
          <div className="absolute top-2.5 right-2.5 bottom-2.5 w-[300px] rounded-2xl bg-slate-950/90 border border-white/15 shadow-2xl p-[10px] flex flex-col z-20 backdrop-blur-xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-[13px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-cyan-400" />
                {selectedNode.type === 'project' ? 'PROJECT HUB' : 'TASK INSPECTION'}
              </span>
              <button 
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-2 space-y-2.5 text-[12px]">
              {selectedNode.type === 'project' ? (
                <>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">PROJECT KEY</span>
                    <span className="text-[16px] font-black text-white">{selectedNode.projectKey}</span>
                    <span className="text-[11px] text-slate-400 block mt-1 font-mono">
                      Connected Tasks: {selectedNode.taskCount}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {/* Task Name & Project */}
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-black uppercase text-cyan-400">
                        {selectedNode.projectKey}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                        selectedNode.status >= 4 ? 'bg-emerald-500/20 text-emerald-300' :
                        selectedNode.status === 3 ? 'bg-rose-500/20 text-rose-300' :
                        selectedNode.status >= 1 ? 'bg-cyan-500/20 text-cyan-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {selectedNode.status >= 4 ? 'Done' : selectedNode.status === 3 ? 'Review' : selectedNode.status >= 1 ? 'WIP' : 'Pending'}
                      </span>
                    </div>
                    <div className="text-[13px] font-bold text-white leading-snug">
                      {selectedNode.taskName}
                    </div>
                  </div>

                  {/* Delegation Flow (Giao việc & Nhận việc) */}
                  <div className="space-y-1.5">
                    <div className="p-2 rounded-xl border border-purple-500/30 bg-purple-500/10">
                      <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                        NGƯỜI GIAO (ASSIGNER)
                      </span>
                      <span className="text-[12px] font-bold text-white">
                        {selectedNode.task?.createdBy || 'Project Manager'}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10">
                      <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block">
                        NGƯỜI THỰC HIỆN (ASSIGNEE)
                      </span>
                      <span className="text-[12px] font-bold text-white">
                        {selectedNode.task?.userName || 'Unassigned'}
                      </span>
                      {selectedNode.task?.team && (
                        <span className="text-[10px] text-slate-400 block">
                          Team: {selectedNode.task.team}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hours & Progress */}
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Planned Hours:</span>
                      <b className="text-white">{(Number(selectedNode.hours_planned) || 0).toFixed(2)}h</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Actual Hours:</span>
                      <b className="text-cyan-300">{(Number(selectedNode.hours_complete) || 0).toFixed(2)}h</b>
                    </div>
                  </div>

                  {/* Parent Task Reference */}
                  {selectedNode.parent_id && (
                    <div className="p-2 rounded-xl border border-amber-500/30 bg-amber-500/10">
                      <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                        TASK CHA (PARENT TASK ID)
                      </span>
                      <span className="text-[11px] font-mono text-slate-300 truncate block">
                        {selectedNode.parent_id}
                      </span>
                    </div>
                  )}

                  {/* Task Detail Description */}
                  {selectedNode.task?.detail && (
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        DESCRIPTION
                      </span>
                      <p className="text-[11px] text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {selectedNode.task.detail}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom Action */}
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  if (selectedNode.position && threeRef.current.camera) {
                    const offset = new THREE.Vector3(0, 10, 35);
                    threeRef.current.targetCamPos = selectedNode.position.clone().add(offset);
                    threeRef.current.targetLookAt = selectedNode.position.clone();
                  }
                }}
                className="w-full py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-[12px] flex items-center justify-center gap-1.5 transition-all shadow-lg"
              >
                <Maximize2 size={12} /> Focus in 3D View
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
