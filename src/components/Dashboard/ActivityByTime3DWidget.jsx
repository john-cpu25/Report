import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Flame, Layers } from 'lucide-react';
import { getISOWeek, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { deepDispose } from '../3d/useThreeCanvas';

/**
 * ActivityByTime3DWidget
 * Biểu đồ 3D Isometric Workload Heatmap hoàn toàn 100% dạng 3D (Three.js):
 * - Mâm đế bo góc cao cấp, các khối trụ 3D (3D rounded extruded pillars) cao thấp theo giờ làm/task
 * - Nhãn ngày (MON ... SUN) và khung giờ (1pm ... 6pm) trực tiếp trong không gian 3D
 * - Đổ bóng mềm Studio, hiệu ứng sáng viền (Rim Light), nhịp thở khối cao điểm
 * - Bắt tương tác chuột 3D Raycaster với Tooltip chi tiết
 */
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_FULL_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = [
  { label: '1pm', timeRangeText: '1:00 PM – 2:00 PM' },
  { label: '2pm', timeRangeText: '2:00 PM – 3:00 PM' },
  { label: '3pm', timeRangeText: '3:00 PM – 4:00 PM' },
  { label: '4pm', timeRangeText: '4:00 PM – 5:00 PM' },
  { label: '5pm', timeRangeText: '5:00 PM – 6:00 PM' },
  { label: '6pm', timeRangeText: '6:00 PM – 7:00 PM' }
];

// Tạo hình khối bo góc (Rounded Rectangle Shape)
const createRoundedRectShape = (width, height, radius) => {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const w = width;
  const h = height;
  const r = Math.min(radius, w / 2, h / 2);

  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  return shape;
};

// Tạo nhãn chữ 3D Sprite
const createTextSprite = (text, isDark, isDim = false) => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 64);
  ctx.fillStyle = isDim ? (isDark ? '#64748b' : '#94a3b8') : (isDark ? '#e2e8f0' : '#334155');
  ctx.font = '900 24px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.0, 0.5, 1);
  return sprite;
};

const ActivityByTime3DWidget = ({
  tasks = [],
  timesheetRecords = [],
  selectedTeam = 'ALL',
  timeRange = 'WEEK',
  users = [],
  isDark = false
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [metricMode, setMetricMode] = useState('HOURS'); // 'HOURS' or 'TASKS'
  const [hoveredData, setHoveredData] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // 1. Ánh xạ Team của Users
  const userTeamMap = useMemo(() => {
    const map = new Map();
    const getMappedTeam = (rawTeam) => {
      const t = (rawTeam || '').toUpperCase();
      if (t.includes('MODEL')) return 'MODELLING';
      if (t.includes('PT') || t.includes('REO')) return 'PT&REO';
      if (t.includes('SLAB') || t.includes('ENGINEER')) return 'ENGINEER';
      if (t.includes('ETABS') || t.includes('LATERAL')) return 'ETABS';
      return 'ALL';
    };

    users.forEach(u => {
      const loc = (u?.location || '').toString().toLowerCase();
      const isAus = loc.includes('aus') || loc.includes('australia');
      const t = (u?.team || '').toString().toUpperCase();
      const isMgr = t.includes('MANAGER') || t.includes('MANAGEMENT');
      map.set(u.id, {
        id: u.id,
        name: u.name,
        team: getMappedTeam(u.team),
        isExcluded: isAus || isMgr
      });
    });
    return map;
  }, [users]);

  // Lọc IDs thuộc Team được chọn
  const activeStaffIds = useMemo(() => {
    const ids = new Set();
    userTeamMap.forEach((u, id) => {
      if (u.isExcluded) return;
      if (selectedTeam === 'ALL' || u.team === selectedTeam) {
        ids.add(id);
      }
    });
    return ids;
  }, [userTeamMap, selectedTeam]);

  // 2. Tính toán ma trận dữ liệu thực tế từ Timesheet & Tasks
  const { matrix, maxHours, maxTasks, peakCell } = useMemo(() => {
    const now = new Date();
    const currentWk = getISOWeek(now);
    const currentYr = now.getFullYear();

    const dayTimesheetHours = [0, 0, 0, 0, 0, 0, 0];
    if (timesheetRecords && timesheetRecords.length > 0) {
      const filteredTs = timesheetRecords.filter(r => {
        if (!activeStaffIds.has(r.user_id)) return false;
        const w = Number(r.week);
        const y = Number(r.year);
        if (y && y !== currentYr) return false;
        if (timeRange === 'WEEK') return w === currentWk;
        if (timeRange === 'MONTH') {
          const m = Math.floor((w - 1) / 4.33);
          return m === now.getMonth();
        }
        return true;
      });

      filteredTs.forEach(r => {
        dayTimesheetHours[0] += Number(r.mon) || 0;
        dayTimesheetHours[1] += Number(r.tue) || 0;
        dayTimesheetHours[2] += Number(r.wed) || 0;
        dayTimesheetHours[3] += Number(r.thu) || 0;
        dayTimesheetHours[4] += Number(r.fri) || 0;
        dayTimesheetHours[5] += Number(r.sat) || 0;
        dayTimesheetHours[6] += Number(r.sun) || 0;
      });
    }

    let rangeStart;
    let rangeEnd = now;
    if (timeRange === 'WEEK') {
      rangeStart = startOfWeek(now, { weekStartsOn: 1 });
      rangeEnd = endOfWeek(now, { weekStartsOn: 1 });
    } else if (timeRange === 'MONTH') {
      rangeStart = startOfMonth(now);
      rangeEnd = endOfMonth(now);
    } else {
      rangeStart = new Date(now.getFullYear(), 0, 1);
    }

    let activeTasks = tasks.filter(t => {
      const uId = t.user_id || t.assigned_to_id;
      if (!activeStaffIds.has(uId)) return false;
      const d = new Date(t.planned_start || t.date_start || t.created_at);
      if (isNaN(d.getTime())) return false;
      return isWithinInterval(d, { start: rangeStart, end: rangeEnd });
    });

    if (activeTasks.length === 0 && tasks.length > 0) {
      const teamTasks = tasks.filter(t => activeStaffIds.has(t.user_id || t.assigned_to_id));
      if (teamTasks.length > 0) {
        const sorted = teamTasks.slice().sort((a, b) => {
          const ta = new Date(a.planned_start || a.date_start || a.created_at).getTime() || 0;
          const tb = new Date(b.planned_start || b.date_start || b.created_at).getTime() || 0;
          return tb - ta;
        });
        const latestDate = new Date(sorted[0].planned_start || sorted[0].date_start || sorted[0].created_at || now);
        const altStart = subDays(latestDate, timeRange === 'WEEK' ? 7 : 30);
        activeTasks = teamTasks.filter(t => {
          const d = new Date(t.planned_start || t.date_start || t.created_at);
          return isWithinInterval(d, { start: altStart, end: latestDate });
        });
      }
    }

    const slotWeights = [0.12, 0.22, 0.30, 0.20, 0.11, 0.05];
    const grid = [];
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      grid[dayIdx] = [];
      const baseDayHours = dayTimesheetHours[dayIdx] || 0;

      for (let slotIdx = 0; slotIdx < 6; slotIdx++) {
        grid[dayIdx][slotIdx] = {
          dayIdx,
          slotIdx,
          day: DAYS[dayIdx],
          dayFull: DAY_FULL_NAMES[dayIdx],
          slot: TIME_SLOTS[slotIdx].label,
          timeRangeText: TIME_SLOTS[slotIdx].timeRangeText,
          hours: baseDayHours > 0 ? baseDayHours * slotWeights[slotIdx] : 0,
          tasksCount: 0,
          level: 0
        };
      }
    }

    activeTasks.forEach(t => {
      const d = new Date(t.planned_start || t.date_start || t.created_at);
      if (isNaN(d.getTime())) return;
      const jsDay = d.getDay();
      const dayIdx = jsDay === 0 ? 6 : jsDay - 1;

      const hour = d.getHours();
      let slotIdx = -1;
      if (hour >= 13 && hour < 14) slotIdx = 0;
      else if (hour >= 14 && hour < 15) slotIdx = 1;
      else if (hour >= 15 && hour < 16) slotIdx = 2;
      else if (hour >= 16 && hour < 17) slotIdx = 3;
      else if (hour >= 17 && hour < 18) slotIdx = 4;
      else if (hour >= 18 && hour < 20) slotIdx = 5;
      else slotIdx = (dayIdx % 2 === 0) ? 2 : 1;

      if (slotIdx >= 0 && slotIdx < 6 && dayIdx >= 0 && dayIdx < 7) {
        grid[dayIdx][slotIdx].tasksCount += 1;
        const taskHours = Number(t.hours_complete) || Number(t.hours_planned) || 1;
        grid[dayIdx][slotIdx].hours += taskHours * 0.25;
      }
    });

    let maxH = 0;
    let maxT = 0;
    let peak = null;

    for (let d = 0; d < 7; d++) {
      for (let s = 0; s < 6; s++) {
        const cell = grid[d][s];
        if (cell.hours > maxH) {
          maxH = cell.hours;
          peak = cell;
        }
        if (cell.tasksCount > maxT) {
          maxT = cell.tasksCount;
        }
      }
    }

    // Gán level (0 - 4)
    for (let d = 0; d < 7; d++) {
      for (let s = 0; s < 6; s++) {
        const cell = grid[d][s];
        if (maxH === 0 || cell.hours <= 0.05) {
          cell.level = 0;
        } else {
          const ratio = cell.hours / maxH;
          if (ratio <= 0.22) cell.level = 1;
          else if (ratio <= 0.48) cell.level = 2;
          else if (ratio <= 0.78) cell.level = 3;
          else cell.level = 4;
        }
      }
    }

    return {
      matrix: grid,
      maxHours: maxH || 1,
      maxTasks: maxT || 1,
      peakCell: peak
    };
  }, [timesheetRecords, tasks, activeStaffIds, timeRange]);

  // 3. Khởi tạo Three.js Scene
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const pillarsRef = useRef([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseVecRef = useRef(new THREE.Vector2(-999, -999));
  const hoveredMeshRef = useRef(null);
  const targetCameraPos = useRef({ x: 13.0, y: 15.5, z: 13.0 });

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera Isometric
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(13.0, 15.5, 13.0);
    camera.lookAt(0, 0.3, 0);
    cameraRef.current = camera;

    // Renderer với ShadowMap chuẩn Three.js r186
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.95 : 1.25);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, isDark ? 1.5 : 1.85);
    mainLight.position.set(12, 22, 14);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 40;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    mainLight.shadow.bias = -0.0005;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x818cf8, isDark ? 0.8 : 0.45);
    fillLight.position.set(-10, 8, -12);
    scene.add(fillLight);

    // ── Base Tray (Mâm đế bo góc kiểu Apple / Clay Design) ──
    const trayShape = createRoundedRectShape(10.2, 8.8, 0.65);
    const trayGeo = new THREE.ExtrudeGeometry(trayShape, {
      depth: 0.35,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.12,
      bevelThickness: 0.12
    });
    trayGeo.rotateX(Math.PI / 2);

    const trayMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x181a28 : 0xf1f3f7,
      roughness: 0.45,
      metalness: 0.05
    });
    const trayMesh = new THREE.Mesh(trayGeo, trayMat);
    trayMesh.position.set(0, -0.2, 0);
    trayMesh.receiveShadow = true;
    scene.add(trayMesh);

    // ── 42 Pillars (Khối 3D bo góc Mon-Sun x 1pm-6pm) ──
    const cellWidth = 0.95;
    const cellDepth = 0.95;
    const pillarShape = createRoundedRectShape(cellWidth, cellDepth, 0.22);
    
    const basePillarGeo = new THREE.ExtrudeGeometry(pillarShape, {
      depth: 1,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.06
    });
    basePillarGeo.rotateX(Math.PI / 2);
    basePillarGeo.translate(0, 0.5, 0);

    const colors = {
      level0: isDark ? 0x24283b : 0x94a3b8,
      level1: 0x2e2768,
      level2: 0x6366f1,
      level3: 0x8b5cf6,
      level4: 0xc084fc
    };

    const pillarMeshes = [];
    const startX = -3.6;
    const stepX = 1.2;
    const startZ = -2.7;
    const stepZ = 1.1;

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      for (let slotIdx = 0; slotIdx < 6; slotIdx++) {
        const posX = startX + dayIdx * stepX;
        const posZ = startZ + slotIdx * stepZ;

        const mat = new THREE.MeshStandardMaterial({
          color: colors.level0,
          roughness: 0.35,
          metalness: 0.1,
          emissive: 0x000000,
          emissiveIntensity: 0
        });

        const mesh = new THREE.Mesh(basePillarGeo, mat);
        mesh.position.set(posX, 0, posZ);
        mesh.scale.set(1, 0.25, 1);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.userData = {
          dayIdx,
          slotIdx,
          targetHeight: 0.25,
          currentHeight: 0.25,
          level: 0
        };

        scene.add(mesh);
        pillarMeshes.push(mesh);
      }
    }
    pillarsRef.current = pillarMeshes;

    // ── Thêm Nhãn 3D (3D Labels: MON..SUN & 1pm..6pm) ──
    // Nhãn Thứ (MON ... SUN) ở mép trước
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const posX = startX + dayIdx * stepX;
      const sprite = createTextSprite(DAYS[dayIdx], isDark, dayIdx >= 5);
      sprite.position.set(posX, 0.2, 3.8);
      scene.add(sprite);
    }

    // Nhãn Giờ (1pm ... 6pm) ở mép trái
    for (let slotIdx = 0; slotIdx < 6; slotIdx++) {
      const posZ = startZ + slotIdx * stepZ;
      const sprite = createTextSprite(TIME_SLOTS[slotIdx].label, isDark, false);
      sprite.position.set(-4.7, 0.2, posZ);
      scene.add(sprite);
    }

    // ── Animation Loop ──
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Camera parallax lerp
      camera.position.x += (targetCameraPos.current.x - camera.position.x) * 0.05;
      camera.position.y += (targetCameraPos.current.y - camera.position.y) * 0.05;
      camera.position.z += (targetCameraPos.current.z - camera.position.z) * 0.05;
      camera.lookAt(0, 0.3, 0);

      // Lerp chiều cao các khối
      pillarMeshes.forEach(mesh => {
        mesh.userData.currentHeight += (mesh.userData.targetHeight - mesh.userData.currentHeight) * 0.1;
        mesh.scale.y = mesh.userData.currentHeight;

        if (mesh.userData.level === 4 && mesh !== hoveredMeshRef.current) {
          const pulse = Math.sin(Date.now() * 0.004) * 0.15 + 0.25;
          mesh.material.emissiveIntensity = pulse;
        }
      });

      // Raycaster kiểm tra Hover
      raycasterRef.current.setFromCamera(mouseVecRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(pillarMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hoveredMeshRef.current !== hit) {
          if (hoveredMeshRef.current) {
            hoveredMeshRef.current.material.emissive.setHex(0x000000);
            hoveredMeshRef.current.material.emissiveIntensity = 0;
            hoveredMeshRef.current.position.y = 0;
          }
          hoveredMeshRef.current = hit;
          hit.material.emissive.setHex(0xffffff);
          hit.material.emissiveIntensity = 0.2;
          hit.position.y = 0.12;
        }
      } else {
        if (hoveredMeshRef.current) {
          hoveredMeshRef.current.material.emissive.setHex(0x000000);
          hoveredMeshRef.current.material.emissiveIntensity = 0;
          hoveredMeshRef.current.position.y = 0;
          hoveredMeshRef.current = null;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      deepDispose(scene);
      renderer.dispose();
    };
  }, [isDark]);

  // 4. Đồng bộ dữ liệu vào 42 khối 3D khi data thay đổi
  useEffect(() => {
    if (!pillarsRef.current || pillarsRef.current.length === 0) return;

    const colors = {
      level0: isDark ? 0x24283b : 0x94a3b8,
      level1: 0x2e2768,
      level2: 0x6366f1,
      level3: 0x8b5cf6,
      level4: 0xc084fc
    };

    pillarsRef.current.forEach(mesh => {
      const { dayIdx, slotIdx } = mesh.userData;
      const cell = matrix[dayIdx]?.[slotIdx];
      if (!cell) return;

      const value = metricMode === 'HOURS' ? cell.hours : cell.tasksCount;
      const maxVal = metricMode === 'HOURS' ? maxHours : maxTasks;

      let targetH = 0.25;
      let targetColor = colors.level0;
      let emissiveCol = 0x000000;
      let emissiveInt = 0;

      if (cell.level === 0 || value <= 0.05) {
        targetH = 0.25;
        targetColor = colors.level0;
      } else if (cell.level === 1) {
        targetH = 0.9 + (value / maxVal) * 0.4;
        targetColor = colors.level1;
      } else if (cell.level === 2) {
        targetH = 1.6 + (value / maxVal) * 0.6;
        targetColor = colors.level2;
      } else if (cell.level === 3) {
        targetH = 2.4 + (value / maxVal) * 0.7;
        targetColor = colors.level3;
      } else {
        targetH = 3.6;
        targetColor = colors.level4;
        emissiveCol = 0x8b5cf6;
        emissiveInt = 0.35;
      }

      mesh.userData.targetHeight = targetH;
      mesh.userData.level = cell.level;
      mesh.userData.cell = cell;
      mesh.material.color.setHex(targetColor);
      mesh.material.emissive.setHex(emissiveCol);
      mesh.material.emissiveIntensity = emissiveInt;
    });
  }, [matrix, metricMode, maxHours, maxTasks, isDark]);

  // 5. Tương tác chuột
  const handlePointerMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    mouseVecRef.current.x = (x / rect.width) * 2 - 1;
    mouseVecRef.current.y = -(y / rect.height) * 2 + 1;

    const normX = (x / rect.width) * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;
    targetCameraPos.current.x = 13.0 + normX * 1.5;
    targetCameraPos.current.z = 13.0 - normY * 1.5;

    if (hoveredMeshRef.current?.userData?.cell) {
      setHoveredData(hoveredMeshRef.current.userData.cell);
    } else {
      setHoveredData(null);
    }
  };

  const handlePointerLeave = () => {
    mouseVecRef.current.x = -999;
    mouseVecRef.current.y = -999;
    targetCameraPos.current.x = 13.0;
    targetCameraPos.current.z = 13.0;
    setHoveredData(null);
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="team-card flex flex-col h-full overflow-hidden relative select-none !p-2.5 2xl:!p-3"
    >
      {/* ── Top Header Bar ── */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 dark:border-white/10 shrink-0 z-10 px-1">
        <div className="flex items-center gap-2">
          {/* Radar Pulse Badge (màu đen) */}
          <div className="relative w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center border border-black/20 dark:border-white/20 shrink-0">
            <span className="w-2 h-2 rounded-full bg-black dark:bg-white animate-ping absolute opacity-75"></span>
            <span className="w-2 h-2 rounded-full bg-black dark:bg-white relative"></span>
          </div>

          <h4 className="text-[13.5px] 2xl:text-[14.5px] font-black uppercase tracking-tight text-[var(--text-main)]">
            Activity by time <span className="text-[10px] text-black dark:text-white font-mono font-black ml-1">3D</span>
          </h4>
        </div>

        {/* Toggle Mode Button: Hours vs Tasks (màu đen) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMetricMode(prev => prev === 'HOURS' ? 'TASKS' : 'HOURS')}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-tight bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-slate-200/60 dark:border-white/10 text-black dark:text-white transition-colors cursor-pointer shadow-sm"
            title="Nhấn để đổi cách tính chiều cao cột 3D theo Số Giờ hoặc Số Task"
          >
            <span>{metricMode === 'HOURS' ? 'Hours' : 'Tasks'}</span>
            <ArrowUpRight size={12} className="opacity-70" />
          </button>
        </div>
      </div>

      {/* ── Main 3D Canvas Viewport ── */}
      <div className="flex-1 relative w-full h-full min-h-[140px] overflow-hidden flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

        {/* 3D Floating Tooltip Overlay */}
        <AnimatePresence>
          {hoveredData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 5 }}
              transition={{ duration: 0.15 }}
              className="absolute pointer-events-none z-30 px-3 py-2 rounded-xl bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-md border border-white/20 text-white shadow-xl text-left"
              style={{
                left: Math.min(Math.max(10, mousePos.x - 70), (containerRef.current?.clientWidth || 200) - 150),
                top: Math.max(10, mousePos.y - 75)
              }}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-200 uppercase tracking-wider mb-0.5">
                <span>{hoveredData.dayFull}</span>
                <span className="text-white/40">•</span>
                <span>{hoveredData.slot}</span>
              </div>
              <div className="text-[13px] font-black font-mono">
                {hoveredData.hours.toFixed(1)}h{' '}
                <span className="text-[11px] font-normal text-slate-300">
                  ({hoveredData.tasksCount} {hoveredData.tasksCount === 1 ? 'task' : 'tasks'})
                </span>
              </div>
              <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                {hoveredData.level === 4
                  ? '🔥 Peak Activity'
                  : hoveredData.level === 3
                  ? 'High Workload'
                  : hoveredData.level === 2
                  ? 'Moderate Workload'
                  : hoveredData.level === 1
                  ? 'Light Workload'
                  : 'Idle / Off-peak'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom Floating Information & 3D Legend ── */}
      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/80 dark:border-white/10 shrink-0 z-10 px-1">
        {/* Peak Info Pill */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-muted)] truncate">
          {peakCell && peakCell.hours > 0 ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-surface)] border border-slate-200/60 dark:border-white/10">
              <Flame size={12} className="text-black dark:text-white shrink-0" />
              <span className="truncate text-[10.5px]">
                Peak: <strong className="text-[var(--text-main)] font-black">{peakCell.day} {peakCell.slot}</strong> ({peakCell.hours.toFixed(1)}h)
              </span>
            </div>
          ) : (
            <span>Dynamic 3D Workload Grid</span>
          )}
        </div>

        {/* 3D Legend Pill */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-surface)] border border-slate-200/60 dark:border-white/10 text-[10px] font-bold text-[var(--text-muted)]">
          <span>Less</span>
          <div className="flex items-end gap-1 px-0.5 h-3">
            <span className="w-1.5 h-1 rounded-xs bg-[#94a3b8] dark:bg-[#334155]" title="Level 0: Flat / Idle"></span>
            <span className="w-1.5 h-1.5 rounded-xs bg-[#2e2768]" title="Level 1: Low"></span>
            <span className="w-1.5 h-2 rounded-xs bg-[#6366f1]" title="Level 2: Moderate"></span>
            <span className="w-1.5 h-2.5 rounded-xs bg-[#8b5cf6]" title="Level 3: High"></span>
            <span className="w-1.5 h-3 rounded-xs bg-[#c084fc] shadow-[0_0_6px_#c084fc]" title="Level 4: Peak Workload"></span>
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ActivityByTime3DWidget);
