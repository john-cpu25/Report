import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Users, Brain, RotateCcw, X, Activity, Filter, Calendar
} from 'lucide-react';
import { useApp } from '../context/AppContext';

// Color Palette for Neon Glow Styles
const PALETTE = {
  assigner: 'rgba(168, 85, 247, 0.95)',    // Purple/Indigo Neon
  assignerGlow: 'rgba(168, 85, 247, 0.25)',
  assignee: 'rgba(16, 185, 129, 0.95)',     // Emerald Neon
  assigneeGlow: 'rgba(16, 185, 129, 0.25)',
  synapse: 'rgba(99, 102, 241, 0.15)',      // Indigo Synapse Line
  synapseHover: 'rgba(99, 102, 241, 0.8)',
  pulseT1: 'rgba(244, 63, 94, 0.95)',       // Red/Rose (High priority)
  pulseT3: 'rgba(6, 182, 212, 0.95)',       // Cyan (Medium priority)
  pulseT5: 'rgba(245, 158, 11, 0.95)'        // Amber/Orange (Low priority)
};

const NeuralBrain = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { dashboardUsers: users, dashboardTasks: tasks, isDashboardLoading: loading } = useApp();

  // Filter States
  const [selectedTeam, setSelectedTeam] = useState('ALL TEAMS');
  const [timeRange, setTimeRange] = useState('WEEK');

  // Reset selected node when filters change to avoid sidebar data mismatch
  useEffect(() => {
    setSelectedNode(null);
  }, [selectedTeam, timeRange]);

  // Interactive 3D Camera / Engine States
  const [angleX, setAngleX] = useState(-0.3); // Rotation around X-axis
  const [angleY, setAngleY] = useState(0.5);  // Rotation around Y-axis
  const [zoom, setZoom] = useState(1.2);       // Zoom / Focal Scale
  const [autoRotate, setAutoRotate] = useState(true);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  // Mouse Interaction Refs
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const spinVelocity = useRef({ x: 0.003, y: 0.005 }); // Auto-rotation velocity or drag momentum
  const animationFrameId = useRef(null);

  // Biological Brain Node Generation & Mapping with Team & Time Filters
  const brainData = useMemo(() => {
    if (!users || users.length === 0) return { nodes: [], synapses: [] };

    // 1. Filter tasks by time range
    let filteredTasks = tasks;
    const now = new Date();
    if (timeRange === 'WEEK') {
      const limit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredTasks = filteredTasks.filter(t => new Date(t.created_at || t.date) >= limit);
    } else if (timeRange === 'MONTH') {
      const limit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredTasks = filteredTasks.filter(t => new Date(t.created_at || t.date) >= limit);
    } else if (timeRange === 'YEAR') {
      const limit = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      filteredTasks = filteredTasks.filter(t => new Date(t.created_at || t.date) >= limit);
    }

    // 2. Filter users by selected team
    let filteredUsers = users;
    if (selectedTeam !== 'ALL TEAMS') {
      // Find members of selected team
      const teamMembers = users.filter(u => (u.team || '').toUpperCase().includes(selectedTeam.toUpperCase()));
      const teamMemberIds = new Set(teamMembers.map(u => u.id));

      // Find creators of tasks assigned to these members
      const managerIds = new Set();
      filteredTasks.forEach(t => {
        const creatorName = t.create_by || 'Unknown';
        const assigneeName = t.user_id || 'Unknown';

        // Check if assignee is in the team
        const matchedAssignee = users.find(u => u.id === assigneeName || u.name === assigneeName || u.email === assigneeName);
        if (matchedAssignee && teamMemberIds.has(matchedAssignee.id)) {
          const matchedCreator = users.find(u => u.id === creatorName || u.name === creatorName || u.email === creatorName);
          if (matchedCreator) {
            managerIds.add(matchedCreator.id);
          }
        }
      });

      // Filtered users = team members + connected managers
      filteredUsers = users.filter(u => teamMemberIds.has(u.id) || managerIds.has(u.id));
    }

    const userMap = new Map();
    filteredUsers.forEach(u => {
      userMap.set(u.id, u);
      if (u.name) userMap.set(u.name.toLowerCase(), u);
      if (u.email) userMap.set(u.email.toLowerCase(), u);
    });

    const assignCounts = new Map(); // total assigned as creator
    const receiveCounts = new Map(); // total received as user
    const taskRelations = []; // relationships mapping creator -> assignee

    filteredTasks.forEach(t => {
      const creatorName = t.create_by || 'Unknown';
      const assigneeName = t.user_id || 'Unknown';

      let creatorUser = userMap.get(creatorName) || userMap.get(creatorName.toLowerCase());
      let assigneeUser = userMap.get(assigneeName) || userMap.get(assigneeName.toLowerCase());

      // If either node is not in the filtered set, skip this relation
      if (!creatorUser || !assigneeUser) return;

      const creatorId = creatorUser.id;
      const assigneeId = assigneeUser.id;

      assignCounts.set(creatorId, (assignCounts.get(creatorId) || 0) + 1);
      receiveCounts.set(assigneeId, (receiveCounts.get(assigneeId) || 0) + 1);

      taskRelations.push({
        creatorId,
        creatorName: creatorUser.name,
        assigneeId,
        assigneeName: assigneeUser.name,
        priority: t.priority_level || t.priority || 'T3',
        status: t.status,
        taskName: t.name || t.task_name || t.task || 'Report Log'
      });
    });

    const activeIds = new Set([
      ...Array.from(assignCounts.keys()),
      ...Array.from(receiveCounts.keys())
    ]);

    const nodes = [];
    const idToNodeIndex = new Map();

    Array.from(activeIds).forEach((id) => {
      const matchedUser = filteredUsers.find(u => u.id === id || u.name === id || u.email === id);
      if (!matchedUser) return; // safeguard

      const name = matchedUser.name;
      const team = matchedUser.team || 'MODELLING';
      const isLeader = assignCounts.get(id) > 0;

      // Biological Double-Lobe Ellipsoid Coordinates
      let x3d = 0, y3d = 0, z3d = 0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      if (isLeader) {
        // Core Corpus Callosum
        const r = 25 + Math.random() * 25;
        x3d = r * Math.sin(phi) * Math.cos(theta);
        y3d = r * Math.sin(phi) * Math.sin(theta) - 10;
        z3d = r * Math.cos(phi) * 0.8;
      } else {
        // Cortical outer hemispheres based on team
        const teamUpper = team.toUpperCase();
        if (teamUpper.includes('MODEL')) {
          // Left hemisphere
          const rx = 90 + Math.random() * 40;
          const ry = 70 + Math.random() * 30;
          const rz = 80 + Math.random() * 30;
          x3d = -Math.abs(rx * Math.sin(phi) * Math.cos(theta)) - 25;
          y3d = ry * Math.sin(phi) * Math.sin(theta);
          z3d = rz * Math.cos(phi);
        } else if (teamUpper.includes('ENGIN') || teamUpper.includes('ETAB')) {
          // Right hemisphere
          const rx = 90 + Math.random() * 40;
          const ry = 70 + Math.random() * 30;
          const rz = 80 + Math.random() * 30;
          x3d = Math.abs(rx * Math.sin(phi) * Math.cos(theta)) + 25;
          y3d = ry * Math.sin(phi) * Math.sin(theta);
          z3d = rz * Math.cos(phi);
        } else {
          // Occipital
          const rx = 80 + Math.random() * 35;
          const ry = 80 + Math.random() * 35;
          const rz = 90 + Math.random() * 40;
          x3d = rx * Math.sin(phi) * Math.cos(theta) * 0.4;
          y3d = ry * Math.sin(phi) * Math.sin(theta);
          z3d = Math.abs(rz * Math.cos(phi)) * (Math.random() > 0.5 ? 1 : -1);
        }
      }

      const node = {
        id,
        name,
        team,
        isLeader,
        assignedCount: assignCounts.get(id) || 0,
        receivedCount: receiveCounts.get(id) || 0,
        x: x3d,
        y: y3d,
        z: z3d,
        px: 0,
        py: 0,
        pz: 0,
        radius: isLeader ? 9 + Math.min(assignCounts.get(id) * 0.15, 8) : 5 + Math.min(receiveCounts.get(id) * 0.15, 6)
      };

      nodes.push(node);
      idToNodeIndex.set(id, nodes.length - 1);
    });

    const synapseMap = new Map();
    taskRelations.forEach(rel => {
      const sourceIdx = idToNodeIndex.get(rel.creatorId);
      const targetIdx = idToNodeIndex.get(rel.assigneeId);

      if (sourceIdx !== undefined && targetIdx !== undefined && sourceIdx !== targetIdx) {
        const key = `${rel.creatorId}-${rel.assigneeId}`;
        if (!synapseMap.has(key)) {
          synapseMap.set(key, {
            source: sourceIdx,
            target: targetIdx,
            tasks: [],
            weight: 0
          });
        }
        const syn = synapseMap.get(key);
        syn.tasks.push(rel);
        syn.weight += 1;
      }
    });

    return {
      nodes,
      synapses: Array.from(synapseMap.values())
    };
  }, [users, tasks, selectedTeam, timeRange]);

  // Handle Canvas Drawing and 3D Rotation Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = containerRef.current.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // active flying neon impulses
    const activeImpulses = [];
    const maxImpulsesPerSynapse = 2;

    brainData.synapses.forEach((syn, synIdx) => {
      const impulseCount = Math.min(Math.ceil(syn.weight * 0.3), maxImpulsesPerSynapse);
      for (let i = 0; i < impulseCount; i++) {
        activeImpulses.push({
          synapseIndex: synIdx,
          progress: Math.random(),
          speed: 0.003 + Math.random() * 0.005,
          priority: syn.tasks[i % syn.tasks.length].priority
        });
      }
    });

    let currentAngleX = angleX;
    let currentAngleY = angleY;

    const tick = () => {
      if (autoRotate && !isDragging.current) {
        currentAngleY += spinVelocity.current.y;
        currentAngleX += spinVelocity.current.x;
        if (currentAngleX > 1.2) currentAngleX = 1.2;
        if (currentAngleX < -1.2) currentAngleX = -1.2;
      } else if (!isDragging.current) {
        currentAngleX += spinVelocity.current.x;
        currentAngleY += spinVelocity.current.y;
        spinVelocity.current.x *= 0.95;
        spinVelocity.current.y *= 0.95;
      }

      setAngleX(currentAngleX);
      setAngleY(currentAngleY);

      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      const centerX = width / 2;
      const centerY = height / 2;
      const focalLength = 350 * zoom;

      // Space background
      ctx.fillStyle = '#090d16'; // Extremely dark background
      ctx.fillRect(0, 0, width, height);

      // Draw subtle grid lines
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.02)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 60) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let i = 0; i < height; i += 60) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }

      if (brainData.nodes.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('KHÔNG CÓ DỮ LIỆU ĐỒNG BỘ CHO TEAM & THỜI GIAN NÀY', centerX, centerY);
        return;
      }

      // Rotate and Project 3D Nodes
      const cosX = Math.cos(currentAngleX);
      const sinX = Math.sin(currentAngleX);
      const cosY = Math.cos(currentAngleY);
      const sinY = Math.sin(currentAngleY);

      brainData.nodes.forEach(node => {
        const x1 = node.x * cosY - node.z * sinY;
        const z1 = node.x * sinY + node.z * cosY;
        const y2 = node.y * cosX - z1 * sinX;
        const z2 = node.y * sinX + z1 * cosX;

        const distance = 400;
        const scale = focalLength / (z2 + distance);
        node.px = centerX + x1 * scale;
        node.py = centerY + y2 * scale;
        node.pz = z2;
        node.scale = scale;
      });

      // Update impulse progress
      activeImpulses.forEach(imp => {
        imp.progress += imp.speed;
        if (imp.progress >= 1) {
          imp.progress = 0;
          const syn = brainData.synapses[imp.synapseIndex];
          if (syn) {
            const randTask = syn.tasks[Math.floor(Math.random() * syn.tasks.length)];
            imp.priority = randTask.priority;
          }
        }
      });

      // Z-buffer sorting
      const drawList = [];

      brainData.synapses.forEach((syn, idx) => {
        const sNode = brainData.nodes[syn.source];
        const tNode = brainData.nodes[syn.target];
        if (!sNode || !tNode) return;
        drawList.push({
          type: 'synapse',
          index: idx,
          z: (sNode.pz + tNode.pz) / 2,
          source: sNode,
          target: tNode,
          synapse: syn
        });
      });

      activeImpulses.forEach((imp, idx) => {
        const syn = brainData.synapses[imp.synapseIndex];
        if (!syn) return;
        const sNode = brainData.nodes[syn.source];
        const tNode = brainData.nodes[syn.target];
        if (!sNode || !tNode) return;
        drawList.push({
          type: 'impulse',
          index: idx,
          z: sNode.pz + (tNode.pz - sNode.pz) * imp.progress,
          source: sNode,
          target: tNode,
          progress: imp.progress,
          priority: imp.priority
        });
      });

      brainData.nodes.forEach((node, idx) => {
        drawList.push({
          type: 'node',
          index: idx,
          z: node.pz,
          node
        });
      });

      drawList.sort((a, b) => b.z - a.z);

      // Render items
      drawList.forEach(item => {
        if (item.type === 'synapse') {
          const { source, target } = item;
          const isSourceHovered = hoveredNode !== null && hoveredNode.id === source.id;
          const isTargetHovered = hoveredNode !== null && hoveredNode.id === target.id;
          const isSynapseLit = isSourceHovered || isTargetHovered;

          ctx.beginPath();
          ctx.moveTo(source.px, source.py);
          
          const midX = (source.px + target.px) / 2;
          const midY = (source.py + target.py) / 2;
          const curveOffset = 30 * (source.pz > target.pz ? 1 : -1) * (zoom * 0.8);
          ctx.quadraticCurveTo(midX, midY - curveOffset, target.px, target.py);

          const alphaFactor = Math.max(0.1, 1 - (source.pz + 150) / 300);
          
          if (isSynapseLit) {
            ctx.strokeStyle = PALETTE.synapseHover;
            ctx.lineWidth = 1.8;
          } else if (hoveredNode !== null) {
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.02 * alphaFactor})`;
            ctx.lineWidth = 0.5;
          } else {
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.12 * alphaFactor})`;
            ctx.lineWidth = 1.0;
          }
          ctx.stroke();

        } else if (item.type === 'impulse') {
          const { source, target, progress, priority } = item;
          const isPathLit = hoveredNode === null || hoveredNode.id === source.id || hoveredNode.id === target.id;
          if (!isPathLit) return;

          const midX = (source.px + target.px) / 2;
          const midY = (source.py + target.py) / 2;
          const curveOffset = 30 * (source.pz > target.pz ? 1 : -1) * (zoom * 0.8);
          const cpX = midX;
          const cpY = midY - curveOffset;

          const t = progress;
          const mt = 1 - t;
          const px = mt * mt * source.px + 2 * mt * t * cpX + t * t * target.px;
          const py = mt * mt * source.py + 2 * mt * t * cpY + t * t * target.py;

          let color = PALETTE.pulseT3;
          if (priority === 'T1' || priority === 'T2') color = PALETTE.pulseT1;
          else if (priority === 'T5') color = PALETTE.pulseT5;

          const size = 3.5 * ((source.scale + target.scale) / 2);

          ctx.beginPath();
          ctx.arc(px, py, Math.max(1.5, size), 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.shadowBlur = 12;
          ctx.shadowColor = color;
          ctx.fill();
          ctx.shadowBlur = 0;

        } else if (item.type === 'node') {
          const { node } = item;
          const isNodeHovered = hoveredNode !== null && hoveredNode.id === node.id;
          const isNodeSelected = selectedNode !== null && selectedNode.id === node.id;
          const isAnyNodeHovered = hoveredNode !== null;

          const size = Math.max(4, node.radius * node.scale);
          const color = node.isLeader ? PALETTE.assigner : PALETTE.assignee;
          const glowColor = node.isLeader ? PALETTE.assignerGlow : PALETTE.assigneeGlow;

          let alphaFactor = Math.max(0.2, 1 - (node.pz + 150) / 300);
          if (isAnyNodeHovered && !isNodeHovered) {
            alphaFactor *= 0.15;
          }

          // Glowing Halo Ring
          if (isNodeHovered || isNodeSelected) {
            ctx.beginPath();
            ctx.arc(node.px, node.py, size * 2.2, 0, Math.PI * 2);
            ctx.fillStyle = glowColor;
            ctx.fill();

            ctx.strokeStyle = color;
            ctx.lineWidth = 1.8;
            ctx.stroke();
          }

          // Draw Core Node with dynamic neon radial gradient
          ctx.beginPath();
          ctx.arc(node.px, node.py, size, 0, Math.PI * 2);
          
          const gradient = ctx.createRadialGradient(
            node.px - size * 0.3, node.py - size * 0.3, size * 0.1,
            node.px, node.py, size
          );
          
          if (node.isLeader) {
            gradient.addColorStop(0, '#e9d5ff');
            gradient.addColorStop(1, `rgba(168, 85, 247, ${alphaFactor})`);
          } else {
            gradient.addColorStop(0, '#d1fae5');
            gradient.addColorStop(1, `rgba(16, 185, 129, ${alphaFactor})`);
          }

          ctx.fillStyle = gradient;
          ctx.fill();

          ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * alphaFactor})`;
          ctx.lineWidth = 1.0;
          ctx.stroke();

          // Names label with depth fog effect (Consistent modern font)
          if (node.scale > 0.55 || isNodeHovered) {
            ctx.fillStyle = isNodeHovered 
              ? '#ffffff' 
              : node.isLeader 
                ? `rgba(216, 180, 254, ${alphaFactor * 0.95})` 
                : `rgba(148, 163, 184, ${alphaFactor * 0.85})`;
            
            ctx.font = isNodeHovered ? 'semibold 10px sans-serif' : 'semibold 8.5px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(node.name, node.px, node.py + size + 6);
          }
        }
      });

      animationFrameId.current = requestAnimationFrame(tick);
    };

    animationFrameId.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [brainData, hoveredNode, selectedNode, zoom, autoRotate]);

  const handleMouseDown = (e) => {
    isDragging.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    previousMousePosition.current = {
      x: e.clientX,
      y: e.clientY
    };
    setAutoRotate(false);
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging.current) {
      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;

      const speedFactor = 0.005;
      const nextAngleY = angleY + deltaX * speedFactor;
      const nextAngleX = Math.max(-1.2, Math.min(1.2, angleX + deltaY * speedFactor));

      setAngleY(nextAngleY);
      setAngleX(nextAngleX);

      spinVelocity.current = {
        x: deltaY * speedFactor * 0.25,
        y: deltaX * speedFactor * 0.25
      };

      previousMousePosition.current = {
        x: e.clientX,
        y: e.clientY
      };
    } else {
      let nearestNode = null;
      let minDistance = 18;

      brainData.nodes.forEach(node => {
        const dx = mouseX - node.px;
        const dy = mouseY - node.py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < minDistance) {
          nearestNode = node;
          minDistance = dist;
        }
      });

      setHoveredNode(nearestNode);
    }
  };

  const handleMouseUp = (e) => {
    isDragging.current = false;

    // Determine if it was a precise click rather than a rotation drag (drag threshold of 5 pixels)
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    const dragDistance = Math.sqrt(dx * dx + dy * dy);

    if (dragDistance < 5) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let nearestNode = null;
        let minDistance = 18;

        brainData.nodes.forEach(node => {
          const ndx = mouseX - node.px;
          const ndy = mouseY - node.py;
          const dist = Math.sqrt(ndx * ndx + ndy * ndy);

          if (dist < minDistance) {
            nearestNode = node;
            minDistance = dist;
          }
        });

        setSelectedNode(nearestNode);
      }
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY * -0.001;
    setZoom(prev => Math.max(0.6, Math.min(prev + zoomFactor, 2.2)));
  };

  const resetCamera = () => {
    setAngleX(-0.3);
    setAngleY(0.5);
    setZoom(1.2);
    setSelectedNode(null);
    setHoveredNode(null);
    setAutoRotate(true);
    spinVelocity.current = { x: 0.003, y: 0.005 };
  };

  const selectedNodeDetails = useMemo(() => {
    if (!selectedNode) return null;
    
    const collaborations = [];
    brainData.synapses.forEach(syn => {
      const sourceNode = brainData.nodes[syn.source];
      const targetNode = brainData.nodes[syn.target];
      if (!sourceNode || !targetNode) return;

      if (sourceNode.id === selectedNode.id) {
        collaborations.push({
          type: 'assigned',
          partnerName: targetNode.name,
          tasksCount: syn.weight,
          tasks: syn.tasks
        });
      } else if (targetNode.id === selectedNode.id) {
        collaborations.push({
          type: 'received',
          partnerName: sourceNode.name,
          tasksCount: syn.weight,
          tasks: syn.tasks
        });
      }
    });

    return {
      node: selectedNode,
      collaborations
    };
  }, [selectedNode, brainData]);

  return (
    <div className="tab-neural h-[calc(100vh-140px)] min-h-[600px] font-['Inter'] relative overflow-hidden rounded-xl border shadow-2xl">
      
      {/* 3D Canvas Box takes up 100% full screen */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 w-full h-full flex items-center justify-center bg-transparent"
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090d16]/90 backdrop-blur-md z-30">
            <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-[0.25em] animate-pulse mt-4">Generating Neural Network...</p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="absolute inset-0 cursor-grab active:cursor-grabbing w-full h-full block"
        />
      </div>

      {/* Left Side: Brand Title HUD */}
      <div className="absolute top-6 left-6 z-20 backdrop-blur-md border px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg hud-box">
        <div className="w-8 h-8 rounded-lg border flex items-center justify-center brand-icon-box">
          <Brain size={18} className="animate-pulse" />
        </div>
        <div>
          <h1 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hud-title">
            Collaboration Brain Map
            <span className="text-[8px] font-bold tracking-widest border px-1.5 py-0.5 rounded badge-3d">3D</span>
          </h1>
          <p className="text-[9px] font-medium uppercase tracking-wider mt-0.5 hud-subtitle">
            Xoay và tương tác 3D xem liên kết công việc
          </p>
        </div>
      </div>

      {/* Right Side: Consolidated Controls & Filters */}
      <div className="absolute top-6 right-6 z-20 flex flex-wrap items-center gap-3 backdrop-blur-md border p-2 rounded-xl shadow-lg hud-box">
        
        {/* Team Filter Dropdown */}
        <div className="flex items-center gap-1.5 px-2 py-1 border-r border-slate-800/40">
          <Filter size={11} className="text-indigo-400" />
          <span className="text-[9px] font-bold uppercase tracking-wider hud-subtitle">TEAM:</span>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="border text-[10px] font-semibold rounded-lg px-2.5 py-1 outline-none cursor-pointer transition-colors filter-select"
          >
            <option value="ALL TEAMS">ALL TEAMS</option>
            <option value="MODELLING">MODELLING</option>
            <option value="ENGINEER">ENGINEER</option>
            <option value="ETABS">ETABS</option>
            <option value="PT&REO">PT & REO</option>
          </select>
        </div>

        {/* Time Range Segment Control */}
        <div className="flex items-center gap-1 p-1 rounded-lg border filter-segment-group">
          <Calendar size={11} className="text-emerald-400 ml-1 shrink-0" />
          {['WEEK', 'MONTH', 'YEAR'].map((t) => (
            <button
              key={t}
              onClick={() => setTimeRange(t)}
              className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 cursor-pointer filter-segment-btn ${
                timeRange === t ? 'active shadow-sm' : ''
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Canvas Actions */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800/40">
          <button 
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-wider gap-1 flex items-center h-7 rounded-lg border cursor-pointer transition-all duration-300 action-btn ${
              autoRotate ? 'active' : ''
            }`}
          >
            <RotateCcw size={11} className={autoRotate ? 'animate-spin' : ''} />
            ROTATE
          </button>

          <button 
            onClick={resetCamera}
            className="px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-wider gap-1 flex items-center h-7 rounded-lg border cursor-pointer transition-all duration-300 action-btn"
          >
            RESET
          </button>
        </div>

      </div>

      {/* Translucent Glass Legend (Bottom Left Floating Overlay - Sleek Curves & Uniform Typography) */}
      <div className="absolute bottom-6 left-6 z-20 backdrop-blur-md border p-3.5 rounded-xl flex flex-col gap-2.5 shadow-lg max-w-[220px] hud-box">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full legend-dot-giao" />
          <span className="text-[9px] font-semibold uppercase tracking-wider hud-text">Nơ-ron Giao Việc</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full legend-dot-nhan" />
          <span className="text-[9px] font-semibold uppercase tracking-wider hud-text">Nơ-ron Nhận Việc</span>
        </div>
        <div className="flex items-center gap-2 border-t border-slate-800/40 pt-2 mt-0.5">
          <span className="w-2.5 h-2.5 rounded-full legend-dot-t1" />
          <span className="w-2.5 h-2.5 rounded-full legend-dot-t3" />
          <span className="w-2.5 h-2.5 rounded-full legend-dot-t5" />
          <span className="text-[9px] font-semibold uppercase tracking-wider hud-subtitle">Xung Điện Task</span>
        </div>
      </div>

      {/* Floating sci-fi detail overlay (Standard rounded-xl curves & uniform typography) */}
      <AnimatePresence>
        {selectedNodeDetails && (
          <div className="absolute top-24 right-6 bottom-6 w-[310px] z-20 backdrop-blur-lg border p-4 rounded-xl flex flex-col gap-3.5 detail-panel">
            
            {/* Header profile */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold uppercase ${
                  selectedNodeDetails.node.isLeader ? 'avatar-leader' : 'avatar-member'
                }`}>
                  {selectedNodeDetails.node.name.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold uppercase truncate tracking-tight hud-title">{selectedNodeDetails.node.name}</h3>
                  <span className="text-[8.5px] font-bold border px-2 py-0.5 rounded uppercase tracking-wider inline-block mt-1 badge-3d">
                    {selectedNodeDetails.node.team}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-900/60"
              >
                <X size={14} />
              </button>
            </div>

            {/* Metrics (Clean rounded corners, standard modern font weights) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-lg border text-center metric-box">
                <p className="text-[9px] font-semibold uppercase tracking-wider mb-0.5 hud-subtitle">Giao Việc</p>
                <p className="text-sm font-bold metric-val-giao">{selectedNodeDetails.node.assignedCount}</p>
              </div>
              <div className="p-2.5 rounded-lg border text-center metric-box">
                <p className="text-[9px] font-semibold uppercase tracking-wider mb-0.5 hud-subtitle">Nhận Việc</p>
                <p className="text-sm font-bold metric-val-nhan">{selectedNodeDetails.node.receivedCount}</p>
              </div>
            </div>

            {/* Collaboration paths */}
            <div className="flex-1 flex flex-col gap-2 min-h-0">
              <h4 className="text-[8.5px] font-bold uppercase tracking-wider pl-1 hud-subtitle">Đường Liên Kết Cộng Tác</h4>
              
              <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
                {selectedNodeDetails.collaborations.map((col, idx) => (
                  <div 
                    key={idx} 
                    className="border p-3 rounded-lg collab-row"
                  >
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <p className={`uppercase tracking-wider ${col.type === 'assigned' ? 'collab-title-giao' : 'collab-title-nhan'}`}>
                        {col.type === 'assigned' ? 'Giao cho' : 'Nhận từ'}
                      </p>
                      <span className="border px-2 py-0.5 rounded text-[8.5px] badge-3d">
                        {col.tasksCount} Tasks
                      </span>
                    </div>

                    <p className="text-[10px] font-semibold uppercase tracking-tight mt-1.5 truncate collab-name">
                      {col.partnerName}
                    </p>

                    {/* Mini tasks list (Standard size and curves) */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/20 space-y-1.5">
                      {col.tasks.slice(0, 2).map((t, tIdx) => (
                        <div key={tIdx} className="flex justify-between items-center gap-2 text-[9px] font-medium uppercase tracking-tight text-slate-400">
                          <span className="truncate flex-1">{t.taskName}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold shrink-0 border ${
                            t.priority === 'T1' || t.priority === 'T2' 
                              ? 'badge-pri-high' 
                              : t.priority === 'T5' 
                                ? 'badge-pri-low' 
                                : 'badge-pri-mid'
                          }`}>
                            {t.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {selectedNodeDetails.collaborations.length === 0 && (
                  <p className="text-[8.5px] font-semibold uppercase tracking-wider text-center py-6 hud-subtitle">
                    Không có liên kết làm việc
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default NeuralBrain;
