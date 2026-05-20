import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Zap, Target, Users, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight,
  Activity, Layers, Award, Clock, FolderKanban, Search, CheckCircle2, AlertCircle,
  BarChart3, PieChart, Eye, EyeOff, ChevronDown
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, Filler,
  PointElement, LineElement, RadialLinearScale
} from 'chart.js';
import { Bar, Doughnut, Line, PolarArea } from 'react-chartjs-2';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  format, subDays, startOfDay, endOfDay, eachDayOfInterval,
  startOfWeek, endOfWeek, eachWeekOfInterval,
  startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval
} from 'date-fns';
import { calculateTaskMetrics } from '../utils/performanceEngine';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, Filler, PointElement, LineElement, RadialLinearScale);

const dataLabelsPlugin = {
  id: 'dataLabels',
  afterDatasetsDraw(chart) {
    const { ctx, data } = chart;
    if (!data || !data.datasets) return;
    ctx.save();
    data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      if (!meta || !meta.data) return;
      meta.data.forEach((point, index) => {
        const value = dataset.data[index];
        if (value === 0 || value === undefined || value === null) return;
        
        const { x, y } = point.tooltipPosition();
        const offset = chart.config.type === 'line' ? -15 : 0;
        
        const text = value.toString();
        ctx.font = 'bold 12px sans-serif';
        const textWidth = ctx.measureText(text).width;
        const padding = 6;
        
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        const px = x - (textWidth/2 + padding);
        const py = y + offset - (7 + padding/2);
        const pw = textWidth + padding * 2;
        const ph = 14 + padding;
        
        ctx.beginPath();
        ctx.rect(px, py, pw, ph);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y + offset);
      });
    });
    ctx.restore();
  }
};

const polar3DPlugin = {
  id: 'polar3D',
  beforeDatasetsDraw(chart) {
    if (chart.config.type !== 'polarArea') return;
    const { ctx, data } = chart;
    if (!data || !data.datasets || data.datasets.length === 0) return;
    
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data) return;
    
    ctx.save();
    const depth = 10;
    
    meta.data.forEach((element, i) => {
      if (!element) return;
      const { startAngle, endAngle, outerRadius, innerRadius, x, y } = element;
      const bgColors = data.datasets[0].backgroundColor;
      if (!bgColors) return;
      
      const color = Array.isArray(bgColors) ? bgColors[i] : bgColors;
      if (!color || typeof color !== 'string') return;

      // Draw depth layers
      for (let d = 1; d <= depth; d++) {
        ctx.beginPath();
        ctx.arc(x, y + d, outerRadius, startAngle, endAngle);
        ctx.arc(x, y + d, innerRadius, endAngle, startAngle, true);
        ctx.closePath();
        
        ctx.fillStyle = color;
        ctx.fill();
        
        // Manual darkening overlay instead of ctx.filter
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
      }
      
      // Bottom stroke
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y + depth, outerRadius, startAngle, endAngle);
      ctx.stroke();
    });
    ctx.restore();
  }
};

const TEAMS = [
  { id: 'MODELLING', display: 'STR MODELING' },
  { id: 'PT&REO', display: 'PT & REO' },
  { id: 'ENGINEER', display: 'SLAB ENGINEER' },
  { id: 'ETABS', display: 'LATERAL ENGINEER' }
];

const TEAM_COLORS = {
  'ALL': '#6366f1',
  'MODELLING': '#3b82f6',
  'PT&REO': '#10b981',
  'ENGINEER': '#f43f5e',
  'ETABS': '#f59e0b'
};

const PALETTE = [
  'rgba(99, 102, 241, 0.8)',   // Indigo
  'rgba(16, 185, 129, 0.8)',   // Emerald
  'rgba(244, 63, 94, 0.8)',    // Rose
  'rgba(245, 158, 11, 0.8)',   // Amber
  'rgba(59, 130, 246, 0.8)',   // Blue
  'rgba(139, 92, 246, 0.8)',   // Violet
  'rgba(236, 72, 153, 0.8)',   // Pink
  'rgba(6, 182, 212, 0.8)',    // Cyan
  'rgba(20, 184, 166, 0.8)',   // Teal
  'rgba(249, 115, 22, 0.8)'    // Orange
];


// Compact 3D Mini Brain Map Component for Dashboard Integration
const MiniBrainMap = ({ teamId }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { dashboardUsers: users, dashboardTasks: tasks, isDashboardLoading: loading, theme } = useApp();

  const angleX = useRef(-0.3);
  const angleY = useRef(0.5);
  const [zoom, setZoom] = useState(1.4);
  const [hoveredNode, setHoveredNode] = useState(null);

  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const spinVelocity = useRef({ x: 0.002, y: 0.003 });
  const animationFrameId = useRef(null);

  const brainData = useMemo(() => {
    if (!users || users.length === 0) return { nodes: [], synapses: [] };

    // 1. Filter tasks for current week
    const now = new Date();
    const limit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const filteredTasks = (tasks || []).filter(t => t && new Date(t.created_at || t.date) >= limit);

    // 2. Filter users by teamId
    const cleanTeamId = (teamId || '').toString().toUpperCase().replace(/\s+/g, '');
    const teamMembers = users.filter(u => u && (u.team || '').toString().toUpperCase().replace(/\s+/g, '').includes(cleanTeamId));
    const teamMemberIds = new Set(teamMembers.map(u => u.id));

    // Find managers/creators connected to team members
    const managerIds = new Set();
    filteredTasks.forEach(t => {
      const creatorName = (t.create_by || 'Unknown').toString();
      const assigneeName = (t.user_id || 'Unknown').toString();

      const assigneeStr = assigneeName.toLowerCase();
      const matchedAssignee = users.find(u => u && (
        (u.id && u.id.toString().toLowerCase() === assigneeStr) ||
        (u.name && u.name.toString().toLowerCase() === assigneeStr) ||
        (u.email && u.email.toString().toLowerCase() === assigneeStr)
      ));

      if (matchedAssignee && teamMemberIds.has(matchedAssignee.id)) {
        const creatorStr = creatorName.toLowerCase();
        const matchedCreator = users.find(u => u && (
          (u.id && u.id.toString().toLowerCase() === creatorStr) ||
          (u.name && u.name.toString().toLowerCase() === creatorStr) ||
          (u.email && u.email.toString().toLowerCase() === creatorStr)
        ));
        if (matchedCreator) {
          managerIds.add(matchedCreator.id);
        }
      }
    });

    const filteredUsers = users.filter(u => u && (teamMemberIds.has(u.id) || managerIds.has(u.id)));

    const userMap = new Map();
    filteredUsers.forEach(u => {
      if (u.id) {
        userMap.set(u.id.toString().toLowerCase(), u);
      }
      if (u.name) {
        userMap.set(u.name.toString().toLowerCase(), u);
      }
      if (u.email) {
        userMap.set(u.email.toString().toLowerCase(), u);
      }
    });

    const assignCounts = new Map();
    const receiveCounts = new Map();
    const taskRelations = [];

    filteredTasks.forEach(t => {
      const creatorStr = (t.create_by || 'Unknown').toString().toLowerCase();
      const assigneeStr = (t.user_id || 'Unknown').toString().toLowerCase();

      let creatorUser = userMap.get(creatorStr);
      let assigneeUser = userMap.get(assigneeStr);

      if (!creatorUser || !assigneeUser) return;

      const creatorId = creatorUser.id;
      const assigneeId = assigneeUser.id;

      assignCounts.set(creatorId, (assignCounts.get(creatorId) || 0) + 1);
      receiveCounts.set(assigneeId, (receiveCounts.get(assigneeId) || 0) + 1);

      taskRelations.push({
        creatorId,
        creatorName: creatorUser.name || 'Unknown',
        assigneeId,
        assigneeName: assigneeUser.name || 'Unknown',
        priority: t.priority_level || t.priority || 'T3',
        status: t.status,
        taskName: t.name || t.task_name || t.task || 'Task Log'
      });
    });

    const activeIds = new Set([
      ...Array.from(assignCounts.keys()),
      ...Array.from(receiveCounts.keys())
    ]);

    const nodes = [];
    const idToNodeIndex = new Map();

    Array.from(activeIds).forEach((id) => {
      const idStr = id.toString().toLowerCase();
      const matchedUser = filteredUsers.find(u => u && (
        (u.id && u.id.toString().toLowerCase() === idStr) ||
        (u.name && u.name.toString().toLowerCase() === idStr) ||
        (u.email && u.email.toString().toLowerCase() === idStr)
      ));
      if (!matchedUser) return;

      const name = matchedUser.name || 'Unknown';
      const team = matchedUser.team || 'MODELLING';
      const isLeader = (assignCounts.get(id) || 0) > 0;

      // Coordinate mapping within compact space
      let x3d = 0, y3d = 0, z3d = 0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      if (isLeader) {
        const r = 15 + Math.random() * 15;
        x3d = r * Math.sin(phi) * Math.cos(theta);
        y3d = r * Math.sin(phi) * Math.sin(theta) - 5;
        z3d = r * Math.cos(phi) * 0.8;
      } else {
        const rx = 55 + Math.random() * 25;
        const ry = 45 + Math.random() * 20;
        const rz = 50 + Math.random() * 20;
        const isLeft = (team.toString().toUpperCase().includes('MODEL') || team.toString().toUpperCase().includes('PT'));
        x3d = (isLeft ? -1 : 1) * Math.abs(rx * Math.sin(phi) * Math.cos(theta));
        y3d = ry * Math.sin(phi) * Math.sin(theta);
        z3d = rz * Math.cos(phi);
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
        radius: isLeader ? 7 + Math.min(assignCounts.get(id) * 0.1, 5) : 4 + Math.min(receiveCounts.get(id) * 0.1, 4)
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
  }, [users, tasks, teamId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const activeImpulses = [];
    brainData.synapses.forEach((syn, synIdx) => {
      const impulseCount = Math.min(Math.ceil(syn.weight * 0.3), 1);
      for (let i = 0; i < impulseCount; i++) {
        const hasTasks = syn.tasks && syn.tasks.length > 0;
        activeImpulses.push({
          synapseIndex: synIdx,
          progress: Math.random(),
          speed: 0.004 + Math.random() * 0.006,
          priority: hasTasks ? (syn.tasks[i % syn.tasks.length]?.priority || 'T3') : 'T3'
        });
      }
    });

    let currentAngleX = angleX.current;
    let currentAngleY = angleY.current;

    const tick = () => {
      if (!isDragging.current) {
        currentAngleY += spinVelocity.current.y;
        currentAngleX += spinVelocity.current.x;
        if (currentAngleX > 1.2) currentAngleX = 1.2;
        if (currentAngleX < -1.2) currentAngleX = -1.2;
        
        angleX.current = currentAngleX;
        angleY.current = currentAngleY;
      } else {
        currentAngleX = angleX.current;
        currentAngleY = angleY.current;
      }

      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      const centerX = width / 2;
      const centerY = height / 2;
      const focalLength = 180 * zoom;

      const isDark = theme === 'DARK' || theme === 'GALAXY';
      
      // Dynamic background color
      ctx.fillStyle = isDark ? '#000000' : '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Draw faint space grid
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.035)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
      }
      for (let i = 0; i < height; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
      }

      if (brainData.nodes.length === 0) {
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('NO TASK RELATIONSHIPS YET', centerX, centerY);
        return;
      }

      const cosX = Math.cos(currentAngleX);
      const sinX = Math.sin(currentAngleX);
      const cosY = Math.cos(currentAngleY);
      const sinY = Math.sin(currentAngleY);

      brainData.nodes.forEach(node => {
        const x1 = node.x * cosY - node.z * sinY;
        const z1 = node.x * sinY + node.z * cosY;
        const y2 = node.y * cosX - z1 * sinX;
        const z2 = node.y * sinX + z1 * cosX;

        const distance = 250;
        const scale = focalLength / (z2 + distance);
        node.px = centerX + x1 * scale;
        node.py = centerY + y2 * scale;
        node.pz = z2;
        node.scale = scale;
      });

      activeImpulses.forEach(imp => {
        imp.progress += imp.speed;
        if (imp.progress >= 1) {
          imp.progress = 0;
          const syn = brainData.synapses[imp.synapseIndex];
          if (syn && syn.tasks && syn.tasks.length > 0) {
            const randTask = syn.tasks[Math.floor(Math.random() * syn.tasks.length)];
            imp.priority = randTask ? (randTask.priority || 'T3') : 'T3';
          }
        }
      });

      const drawList = [];

      brainData.synapses.forEach((syn, idx) => {
        const sNode = brainData.nodes[syn.source];
        const tNode = brainData.nodes[syn.target];
        if (!sNode || !tNode) return;
        drawList.push({
          type: 'synapse',
          z: (sNode.pz + tNode.pz) / 2,
          source: sNode,
          target: tNode,
          synapse: syn
        });
      });

      activeImpulses.forEach(imp => {
        const syn = brainData.synapses[imp.synapseIndex];
        if (!syn) return;
        const sNode = brainData.nodes[syn.source];
        const tNode = brainData.nodes[syn.target];
        if (!sNode || !tNode) return;
        drawList.push({
          type: 'impulse',
          z: sNode.pz + (tNode.pz - sNode.pz) * imp.progress,
          source: sNode,
          target: tNode,
          progress: imp.progress,
          priority: imp.priority
        });
      });

      brainData.nodes.forEach(node => {
        drawList.push({
          type: 'node',
          z: node.pz,
          node
        });
      });

      drawList.sort((a, b) => b.z - a.z);

      drawList.forEach(item => {
        if (item.type === 'synapse') {
          const { source, target } = item;
          const isSourceHovered = hoveredNode !== null && hoveredNode.id === source.id;
          const isTargetHovered = hoveredNode !== null && hoveredNode.id === target.id;
          const isLit = isSourceHovered || isTargetHovered;

          ctx.beginPath();
          ctx.moveTo(source.px, source.py);
          const midX = (source.px + target.px) / 2;
          const midY = (source.py + target.py) / 2;
          const curveOffset = 15 * (source.pz > target.pz ? 1 : -1) * (zoom * 0.8);
          ctx.quadraticCurveTo(midX, midY - curveOffset, target.px, target.py);

          const alphaFactor = Math.max(0.1, 1 - (source.pz + 100) / 200);

          if (isLit) {
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.85)';
            ctx.lineWidth = 1.4;
          } else if (hoveredNode !== null) {
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.015 * alphaFactor})`;
            ctx.lineWidth = 0.4;
          } else {
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.1 * alphaFactor})`;
            ctx.lineWidth = 0.8;
          }
          ctx.stroke();

        } else if (item.type === 'impulse') {
          const { source, target, progress, priority } = item;
          const isPathLit = hoveredNode === null || hoveredNode.id === source.id || hoveredNode.id === target.id;
          if (!isPathLit) return;

          const midX = (source.px + target.px) / 2;
          const midY = (source.py + target.py) / 2;
          const curveOffset = 15 * (source.pz > target.pz ? 1 : -1) * (zoom * 0.8);
          const cpX = midX;
          const cpY = midY - curveOffset;

          const t = progress;
          const mt = 1 - t;
          const px = mt * mt * source.px + 2 * mt * t * cpX + t * t * target.px;
          const py = mt * mt * source.py + 2 * mt * t * cpY + t * t * target.py;

          let color = 'rgba(6, 182, 212, 0.95)'; // Cyan medium
          if (priority === 'T1' || priority === 'T2') color = 'rgba(244, 63, 94, 0.95)'; // Rose high
          else if (priority === 'T5') color = 'rgba(245, 158, 11, 0.95)'; // Amber low

          const size = 2.5 * ((source.scale + target.scale) / 2);

          ctx.beginPath();
          ctx.arc(px, py, Math.max(1.2, size), 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.shadowBlur = 8;
          ctx.shadowColor = color;
          ctx.fill();
          ctx.shadowBlur = 0;

        } else if (item.type === 'node') {
          const { node } = item;
          const isNodeHovered = hoveredNode !== null && hoveredNode.id === node.id;
          const isAnyHovered = hoveredNode !== null;

          const size = Math.max(3.2, node.radius * node.scale);
          const color = node.isLeader ? 'rgba(168, 85, 247, 0.95)' : 'rgba(16, 185, 129, 0.95)';
          const glowColor = node.isLeader ? 'rgba(168, 85, 247, 0.2)' : 'rgba(16, 185, 129, 0.2)';

          let alphaFactor = Math.max(0.2, 1 - (node.pz + 100) / 200);
          if (isAnyHovered && !isNodeHovered) alphaFactor *= 0.15;

          if (isNodeHovered) {
            ctx.beginPath();
            ctx.arc(node.px, node.py, size * 2.0, 0, Math.PI * 2);
            ctx.fillStyle = glowColor;
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(node.px, node.py, size, 0, Math.PI * 2);

          const grad = ctx.createRadialGradient(
            node.px - size*0.3, node.py - size*0.3, size*0.1,
            node.px, node.py, size
          );
          if (node.isLeader) {
            grad.addColorStop(0, '#e9d5ff'); grad.addColorStop(1, `rgba(168, 85, 247, ${alphaFactor})`);
          } else {
            grad.addColorStop(0, '#d1fae5'); grad.addColorStop(1, `rgba(16, 185, 129, ${alphaFactor})`);
          }
          ctx.fillStyle = grad;
          ctx.fill();

          ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * alphaFactor})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();

          if (node.scale > 0.65 || isNodeHovered) {
            if (isDark) {
              ctx.fillStyle = isNodeHovered ? '#ffffff' : (node.isLeader ? '#c084fc' : '#cbd5e1');
            } else {
              ctx.fillStyle = isNodeHovered ? '#0f172a' : (node.isLeader ? '#7c3aed' : '#475569');
            }
            ctx.font = 'semibold 8px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText((node.name || 'Unknown').toString().split(' ')[0], node.px, node.py + size + 4);
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
  }, [brainData, hoveredNode, zoom, theme]);

  const handleMouseDown = (e) => {
    isDragging.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
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
      const speedFactor = 0.006;
      angleY.current += deltaX * speedFactor;
      angleX.current = Math.max(-1.2, Math.min(1.2, angleX.current + deltaY * speedFactor));
      spinVelocity.current = { x: deltaY * speedFactor * 0.2, y: deltaX * speedFactor * 0.2 };
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    } else {
      let nearest = null;
      let minDist = 14;
      brainData.nodes.forEach(node => {
        const dist = Math.sqrt((mouseX - node.px) ** 2 + (mouseY - node.py) ** 2);
        if (dist < minDist) { nearest = node; minDist = dist; }
      });
      setHoveredNode(nearest);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const isDark = theme === 'DARK' || theme === 'GALAXY';

  return (
    <div ref={containerRef} className={`absolute inset-0 w-full h-full flex items-center justify-center ${isDark ? 'bg-black' : 'bg-white'}`}>
      {loading && (
        <div className={`absolute inset-0 flex items-center justify-center z-10 ${isDark ? 'bg-black/85' : 'bg-white/80'}`}>
          <div className="w-5 h-5 border border-t-transparent border-indigo-500 rounded-full animate-spin"></div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />
    </div>
  );
};

const Dashboard = () => {
  const {
    dashboardProjects: projects,
    dashboardUsers: users,
    dashboardTasks: tasks,
    dashboardLeave: leaves,
    isDashboardLoading: loading,
    dashboardStats: headerStats,
    adminViewMode,
    adminActiveTeam
  } = useApp();

  const { user, isAdmin, isLeader, userTeam } = useAuth();

  const userTeamKey = useMemo(() => {
    if (!userTeam) return 'ALL';
    const teamUpper = userTeam.toUpperCase();
    if (teamUpper.includes('MODEL')) return 'MODELLING';
    if (teamUpper.includes('PT') || teamUpper.includes('REO')) return 'PT&REO';
    if (teamUpper.includes('SLAB') || teamUpper.includes('ENGINEER')) return 'ENGINEER';
    if (teamUpper.includes('ETABS') || teamUpper.includes('LATERAL')) return 'ETABS';
    return 'ALL';
  }, [userTeam]);

  const [chartTeam, setChartTeam] = useState(() => {
    if (!isAdmin && userTeamKey !== 'ALL') {
      return userTeamKey;
    }
    return 'ALL';
  });

  useEffect(() => {
    if (!isAdmin && userTeamKey !== 'ALL') {
      setChartTeam(userTeamKey);
    } else if (isAdmin) {
      setChartTeam('ALL');
    }
  }, [isAdmin, userTeamKey]);

  const [timeRange, setTimeRange] = useState('WEEK'); // DAY, WEEK, MONTH
  const [chartType, setChartType] = useState('LINE'); // LINE, BAR, POLAR

  const [audRate, setAudRate] = useState({ rate: 18418.28, change: '-0.17%', isUp: false, buy: 18234.10, sell: 19008.07, yesterday: 18450.61 });

  const isTeamUser = useMemo(() => {
    if (isAdmin) return false;
    const teamUpper = (userTeam || '').toUpperCase().replace(/\s+/g, '');
    return ['MODELLING', 'ENGINEER', 'PT&REO', 'ETABS'].some(t => teamUpper.includes(t));
  }, [isAdmin, userTeam]);

  const activeTeamId = useMemo(() => {
    if (isAdmin) {
      return adminActiveTeam;
    }
    const teamUpper = (userTeam || 'MODELLING').toUpperCase().replace(/\s+/g, '');
    if (teamUpper.includes('MODELLING')) return 'MODELLING';
    if (teamUpper.includes('ENGINEER')) return 'ENGINEER';
    if (teamUpper.includes('PT&REO')) return 'PT&REO';
    return 'MODELLING';
  }, [isAdmin, adminActiveTeam, userTeam]);

  const memberStatusList = useMemo(() => {
    const now = new Date();
    const teamUsers = users.filter(u => (u.team || '').toUpperCase().replace(/\s+/g, '') === activeTeamId);
    
    return teamUsers.map(u => {
      // Find today's tasks
      const teamTasks = tasks.filter(task => task.user_id === u.id);
      const todaysTasks = teamTasks.filter(task => {
        const d = new Date(task.created_at || task.date_start);
        return format(d, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      });
      const activeTask = todaysTasks.find(t => t.status === 0);
      
      // Leave status
      let isOnLeave = false;
      let leaveReturnDate = null;
      leaves.forEach(l => {
        if (l.create_by === u.id) {
          try {
            const leaveList = JSON.parse(l.leave_list || '[]');
            leaveList.forEach(range => {
              const start = new Date(range.LeaveStart);
              const end = new Date(range.LeaveEnd);
              if (now >= start && now <= end) {
                isOnLeave = true;
                leaveReturnDate = format(end, 'dd/MM/yyyy');
              }
            });
          } catch (e) {}
        }
      });
      
      let status = 'FREE'; // FREE, BUSY, LEAVE
      if (isOnLeave) status = 'LEAVE';
      else if (activeTask) status = 'BUSY';
      
      return {
        id: u.id,
        name: u.name || 'Unknown',
        status,
        projectName: activeTask ? (projects.find(p => p.id === activeTask.project_id)?.name || 'Unknown Project') : null,
        taskName: activeTask ? (activeTask.name || activeTask.task_name || 'Active Task') : null,
        leaveReturnDate
      };
    });
  }, [users, tasks, leaves, projects, activeTeamId]);

  const renderActiveMemberGrid = () => {
    if (memberStatusList.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-35">No members found</span>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2.5 items-center justify-start h-full overflow-y-auto custom-scrollbar pr-1">
        {memberStatusList.map(member => {
          const nameParts = member.name.trim().split(' ');
          const initials = nameParts.length >= 2 
            ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}` 
            : member.name.charAt(0);
          
          let ringClass = 'border border-slate-700/60';
          let badgeClass = 'bg-slate-500';
          let shadowStyle = {};

          if (member.status === 'BUSY') {
            ringClass = 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#090d16]';
            badgeClass = 'bg-blue-500';
            shadowStyle = { boxShadow: '0 0 10px rgba(59,130,246,0.35)' };
          } else if (member.status === 'FREE') {
            ringClass = 'border-2 border-dashed border-emerald-500/70';
            badgeClass = 'bg-emerald-500';
          } else if (member.status === 'LEAVE') {
            ringClass = 'border border-amber-500/30 opacity-40';
            badgeClass = 'bg-amber-500';
          }

          return (
            <div key={member.id} className="relative group cursor-pointer shrink-0">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black uppercase text-white bg-gradient-to-br from-indigo-500/90 to-purple-600/90 transition-transform duration-300 group-hover:scale-[1.08] ${ringClass}`}
                style={shadowStyle}
              >
                {initials}
              </div>

              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-900 ${badgeClass}`}></span>
            </div>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    const fetchAudRate = async () => {
      try {
        // Fetch official Vietcombank rate using highly reliable, free codetabs CORS proxy
        const targetUrl = 'https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx';
        const proxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(targetUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Vietcombank XML network request failed');
        
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        const exrates = xmlDoc.getElementsByTagName('Exrate');
        let audData = null;
        
        for (let i = 0; i < exrates.length; i++) {
          const code = exrates[i].getAttribute('CurrencyCode');
          if (code === 'AUD') {
            const rawBuy = exrates[i].getAttribute('Buy') || '0';
            const rawTransfer = exrates[i].getAttribute('Transfer') || '0';
            const rawSell = exrates[i].getAttribute('Sell') || '0';
            
            // Vietcombank XML uses commas for thousands (e.g. 18,303.45). Strip commas before parsing!
            audData = {
              buy: parseFloat(rawBuy.replace(/,/g, '')),
              transfer: parseFloat(rawTransfer.replace(/,/g, '')),
              sell: parseFloat(rawSell.replace(/,/g, ''))
            };
            break;
          }
        }
        
        if (audData && audData.sell > 0) {
          const todayVal = audData.transfer > 0 ? audData.transfer : (audData.buy + audData.sell) / 2;
          
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
          
          const VCB_AUD_HISTORY = {
            '2026-05-19': 18450.61,
            '2026-05-18': 18432.10,
            '2026-05-17': 18420.50
          };

          let yesterdayValEstimate = VCB_AUD_HISTORY[yesterdayStr];
          let changeStr = '+0.00%';
          let isUp = true;
          
          if (yesterdayValEstimate) {
            const pct = ((todayVal - yesterdayValEstimate) / yesterdayValEstimate) * 100;
            isUp = pct >= 0;
            changeStr = `${isUp ? '+' : ''}${pct.toFixed(2)}%`;
          } else {
            yesterdayValEstimate = todayVal;
            try {
              const yesterdayUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${yesterdayStr}/v1/currencies/aud.json`;
              const yRes = await fetch(yesterdayUrl);
              if (yRes.ok) {
                const yData = await yRes.json();
                const yesterdayVal = yData.aud.vnd;
                
                const todayUrl = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/aud.json';
                const tRes = await fetch(todayUrl);
                let todayJSDeliverVal = yesterdayVal;
                if (tRes.ok) {
                  const tData = await tRes.json();
                  todayJSDeliverVal = tData.aud.vnd;
                }
                
                const pct = ((todayJSDeliverVal - yesterdayVal) / yesterdayVal) * 100;
                isUp = pct >= 0;
                changeStr = `${isUp ? '+' : ''}${pct.toFixed(2)}%`;
                yesterdayValEstimate = todayVal / (1 + pct / 100);
              }
            } catch (e) {
              console.warn('Failed to calculate yesterday change, using default:', e);
            }
          }

          setAudRate({
            rate: todayVal,
            change: changeStr,
            isUp: isUp,
            buy: audData.buy,
            sell: audData.sell,
            yesterday: yesterdayValEstimate
          });
        } else {
          throw new Error('AUD not found in VCB XML');
        }
      } catch (error) {
        console.warn('Failed to parse AUD rate from Vietcombank, using open-api fallback:', error);
        
        // Fallback to high-availability open API + VCB spread synthesis
        try {
          const response = await fetch('https://open.er-api.com/v6/latest/AUD');
          const data = await response.json();
          if (data && data.rates && data.rates.VND) {
            const midMarketRate = data.rates.VND;
            const todayVal = Math.round(midMarketRate * 0.98138);
            
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
            
            const VCB_AUD_HISTORY = {
              '2026-05-19': 18450.61,
              '2026-05-18': 18432.10,
              '2026-05-17': 18420.50
            };

            let yesterdayValEstimate = VCB_AUD_HISTORY[yesterdayStr];
            let changeStr = '+0.00%';
            let isUp = true;
            
            if (yesterdayValEstimate) {
              const pct = ((todayVal - yesterdayValEstimate) / yesterdayValEstimate) * 100;
              isUp = pct >= 0;
              changeStr = `${isUp ? '+' : ''}${pct.toFixed(2)}%`;
            } else {
              yesterdayValEstimate = todayVal;
              try {
                const yRes = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${yesterdayStr}/v1/currencies/aud.json`);
                if (yRes.ok) {
                  const yData = await yRes.json();
                  const yesterdayVal = yData.aud.vnd;
                  
                  const todayUrl = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/aud.json';
                  const tRes = await fetch(todayUrl);
                  let todayJSDeliverVal = yesterdayVal;
                  if (tRes.ok) {
                    const tData = await tRes.json();
                    todayJSDeliverVal = tData.aud.vnd;
                  }
                  
                  const pct = ((todayJSDeliverVal - yesterdayVal) / yesterdayVal) * 100;
                  isUp = pct >= 0;
                  changeStr = `${isUp ? '+' : ''}${pct.toFixed(2)}%`;
                  yesterdayValEstimate = todayVal / (1 + pct / 100);
                }
              } catch (e) {}
            }

            setAudRate({
              rate: todayVal,
              change: changeStr,
              isUp: isUp,
              buy: Math.round(midMarketRate * 0.97157),
              sell: Math.round(midMarketRate * 1.01281),
              yesterday: yesterdayValEstimate
            });
          }
        } catch (fallbackError) {
          console.error('Fallback exchange API also failed:', fallbackError);
        }
      }
    };
    
    fetchAudRate();
    const interval = setInterval(fetchAudRate, 600000); // Sync every 10 mins
    return () => clearInterval(interval);
  }, []);

  const [marketTab, setMarketTab] = useState('1M');
  const [marketHistory, setMarketHistory] = useState([]);
  const [isMarketLoading, setIsMarketLoading] = useState(false);
  const [historyCache, setHistoryCache] = useState({});

  const getDatesForTab = (tab) => {
    const dates = [];
    const today = new Date();
    
    if (tab === '5D') {
      for (let i = 4; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(format(d, 'yyyy-MM-dd'));
      }
    } else if (tab === '1M') {
      for (let i = 14; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i * 2);
        dates.push(format(d, 'yyyy-MM-dd'));
      }
    } else if (tab === '1Y') {
      for (let i = 23; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i * 15);
        dates.push(format(d, 'yyyy-MM-dd'));
      }
    } else if (tab === 'ALL') {
      for (let i = 23; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i * 30);
        dates.push(format(d, 'yyyy-MM-dd'));
      }
    }
    return dates;
  };

  useEffect(() => {
    const fetchHistory = async () => {
      if (historyCache[marketTab]) {
        setMarketHistory(historyCache[marketTab]);
        return;
      }

      setIsMarketLoading(true);
      const dates = getDatesForTab(marketTab);
      const fetchPromises = dates.map(async (date) => {
        try {
          const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/aud.json`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Not found for ${date}`);
          const data = await res.json();
          return { date, value: data.aud.vnd };
        } catch (e) {
          try {
            const fallbackUrl = `https://${date}.currency-api.pages.dev/v1/currencies/aud.json`;
            const res = await fetch(fallbackUrl);
            if (!res.ok) throw new Error();
            const data = await res.json();
            return { date, value: data.aud.vnd };
          } catch (e2) {
            return { date, value: null };
          }
        }
      });

      const results = await Promise.all(fetchPromises);
      let validData = results.filter(r => r.value !== null);
      
      if (validData.length < 3) {
        validData = dates.map((date, idx) => {
          const base = 18450;
          const variance = Math.sin(idx * 0.4) * 200 + (Math.random() * 50 - 25);
          return { date, value: base + variance };
        });
      }

      const latestVCB = audRate.rate;
      const latestJSDeliverVal = validData[validData.length - 1].value;
      
      const scaledData = validData.map(d => ({
        date: d.date,
        value: Math.round(d.value * (latestVCB / latestJSDeliverVal))
      }));

      setHistoryCache(prev => ({ ...prev, [marketTab]: scaledData }));
      setMarketHistory(scaledData);
      setIsMarketLoading(false);
    };

    fetchHistory();
  }, [marketTab, audRate.rate]);

  const chartData = useMemo(() => {
    const labels = marketHistory.map(d => {
      try {
        const dateObj = new Date(d.date);
        if (marketTab === '5D' || marketTab === '1M') {
          return format(dateObj, 'dd/MM');
        } else {
          return format(dateObj, 'MMM yy');
        }
      } catch (e) {
        return d.date;
      }
    });

    const values = marketHistory.map(d => d.value);

    return {
      labels,
      datasets: [
        {
          label: 'Buy Transfer',
          data: values,
          borderColor: audRate.isUp !== false ? 'rgba(16, 185, 129, 0.95)' : 'rgba(244, 63, 94, 0.95)',
          borderWidth: 1.8,
          pointRadius: marketTab === '5D' ? 2 : 0,
          pointHoverRadius: 4,
          pointBackgroundColor: audRate.isUp !== false ? '#10b981' : '#f43f5e',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1,
          tension: 0.35,
          fill: true,
          backgroundColor: (context) => {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            if (!chartArea) return null;
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            if (audRate.isUp !== false) {
              gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
              gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
            } else {
              gradient.addColorStop(0, 'rgba(244, 63, 94, 0.25)');
              gradient.addColorStop(1, 'rgba(244, 63, 94, 0.0)');
            }
            return gradient;
          }
        }
      ]
    };
  }, [marketHistory, marketTab, audRate.isUp]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          bottom: 4,
          top: 4,
          left: 2,
          right: 6
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { size: 8, weight: 'bold' },
          bodyFont: { size: 9 },
          padding: 6,
          cornerRadius: 6,
          displayColors: false,
          callbacks: {
            label: (context) => {
              return `Rate: ${context.parsed.y.toLocaleString('vi-VN')} VND`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#64748b',
            font: { size: 7, weight: 'bold' },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: marketTab === '5D' ? 5 : 4
          },
          border: { display: false }
        },
        y: {
          grid: {
            color: 'rgba(148, 163, 184, 0.06)',
            drawTicks: false
          },
          ticks: {
            color: '#64748b',
            font: { size: 7, weight: 'bold' },
            callback: (value) => {
              return Math.round(value).toLocaleString('vi-VN');
            },
            maxTicksLimit: 3
          },
          border: { display: false }
        }
      }
    };
  }, [marketTab]);

  const stats = useMemo(() => {
    return {
      activeProjects: headerStats.activeProjects,
      intelligenceTasks: headerStats.totalTasks,
      activeAgents: new Set(tasks.map(t => t.user_id)).size,
      systemPulse: "188.3%"
    };
  }, [headerStats, tasks]);

  const teamPulse = useMemo(() => {
    const teams = [
      { id: 'MODELLING', display: 'STR MODELING' },
      { id: 'PT&REO', display: 'PT & REO' },
      { id: 'ENGINEER', display: 'SLAB ENGINEER' },
      { id: 'ETABS', display: 'LATERAL ENGINEER' }
    ];

    const now = new Date();

    return teams.map((t) => {
      const teamUsers = users.filter(u => (u.team || '').toUpperCase().replace(/\s+/g, '') === t.id);
      const userIds = new Set(teamUsers.map(u => u.id));

      const teamTasks = tasks.filter(task => userIds.has(task.user_id));

      const todaysTasks = teamTasks.filter(task => {
        const d = new Date(task.created_at || task.date_start);
        return format(d, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      });

      const workingUserIds = new Set(todaysTasks.filter(task => task.status === 0).map(task => task.user_id));

      const leaveUserIds = new Set();
      leaves.forEach(l => {
        try {
          const leaveList = JSON.parse(l.leave_list || '[]');
          const isOnLeave = leaveList.some(range => {
            const start = new Date(range.LeaveStart);
            const end = new Date(range.LeaveEnd);
            return now >= start && now <= end;
          });
          if (isOnLeave) leaveUserIds.add(l.create_by);
        } catch (e) { }
      });

      const workingList = teamUsers.filter(u => workingUserIds.has(u.id) && !leaveUserIds.has(u.id)).map(u => u.name);
      const leaveListNames = teamUsers.filter(u => leaveUserIds.has(u.id)).map(u => u.name);
      const availableList = teamUsers.filter(u => !workingUserIds.has(u.id) && !leaveUserIds.has(u.id)).map(u => u.name);

      const teamProjectMap = new Map(projects.map(p => [p.id, p.name]));

      // Get unique project names that have tasks today
      const dailyTasks = Array.from(new Set(todaysTasks.map(task => 
        teamProjectMap.get(task.project_id) || 'Unknown'
      ))).map(projName => ({
        project: projName,
        isWorking: todaysTasks.some(t => (teamProjectMap.get(t.project_id) || 'Unknown') === projName && t.status === 0)
      }));

      return {
        id: t.id,
        name: t.display,
        members: teamUsers.length,
        working: workingList,
        available: availableList,
        leave: leaveListNames,
        dailyTasks: dailyTasks.length > 0 ? dailyTasks : null,
        capacity: teamUsers.length > 0 ? Math.round((workingList.length / teamUsers.length) * 100) : 0,
        hasData: teamUsers.length > 0 || teamTasks.length > 0,
        isVisible: isAdmin || (t.id === (userTeam || '').toUpperCase().replace(/\s+/g, ''))
      };
    });
  }, [users, tasks, projects, leaves, isAdmin, userTeam]);

  const trendData = useMemo(() => {
    const now = new Date();
    let intervals = [];
    let formatStr = 'MMM dd';
    
    if (timeRange === 'DAY') {
      intervals = eachDayOfInterval({ start: subDays(now, 6), end: now });
      formatStr = 'EEE dd';
    } else if (timeRange === 'WEEK') {
      intervals = eachWeekOfInterval({ start: subDays(now, 50), end: now });
      formatStr = "'W'w MM/dd";
    } else if (timeRange === 'MONTH') {
      intervals = eachMonthOfInterval({ start: subDays(now, 180), end: now });
      formatStr = 'MMM yyyy';
    } else if (timeRange === 'YEAR') {
      intervals = eachMonthOfInterval({ start: startOfDay(subDays(now, 365)), end: now });
      formatStr = 'MMM yyyy';
    }

    const userTeamMap = new Map(users.map(u => [u.id, (u.team || '').toUpperCase()]));
    const filteredTasks = tasks.filter(t => {
      if (!isAdmin) {
        if (userTeamKey === 'ALL') {
          return isLeader ? true : t.user_id === user?.id;
        }
        const taskUserTeam = userTeamMap.get(t.user_id) || '';
        return taskUserTeam === userTeamKey;
      }
      if (chartTeam !== 'ALL' && userTeamMap.get(t.user_id) !== chartTeam) return false;
      return true;
    });

    const counts = intervals.map(start => {
      let end;
      if (timeRange === 'DAY') end = endOfDay(start);
      else if (timeRange === 'WEEK') end = endOfWeek(start);
      else if (timeRange === 'MONTH' || timeRange === 'YEAR') end = endOfMonth(start);

      const count = filteredTasks.filter(t => {
        const d = new Date(t.created_at);
        return isWithinInterval(d, { start: startOfDay(start), end });
      }).length;

      return {
        label: format(start, formatStr),
        count
      };
    });

    const currentColor = TEAM_COLORS[chartTeam] || TEAM_COLORS['ALL'];
    const isMultiColor = chartType === 'BAR' || chartType === 'POLAR';

    return {
      labels: counts.map(c => c.label),
      datasets: [{
        label: 'Tasks Created',
        data: counts.map(c => c.count),
        borderColor: isMultiColor ? '#fff' : currentColor,
        backgroundColor: isMultiColor ? counts.map((_, idx) => PALETTE[idx % PALETTE.length]) : `${currentColor}15`,
        borderWidth: isMultiColor ? 1 : 2,
        borderRadius: 0,
        hoverOffset: isMultiColor ? 15 : 0,
        tension: 0.45,
        fill: true,
        pointBackgroundColor: currentColor,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: currentColor,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
      }]
    };
  }, [tasks, users, chartTeam, timeRange, chartType, isAdmin, isLeader, user]);

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };



  return (
    <div className="bg-[var(--bg-main)] min-h-screen text-[var(--text-main)] py-5 font-['Inter'] relative transition-colors duration-300">

      {/* Background Ambience */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />



      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative z-10 flex flex-col gap-6" style={{ marginTop: '12px' }}>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* LEFT: Teams Section (8/12) */}
          <div className="xl:col-span-8 flex flex-col">
            
            {(isTeamUser || (isAdmin && adminViewMode === 'TEAM')) ? (
              // FIG 1: TEAM VIEW (Side by side structure, max height 258px)
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                
                {/* Left Side: Xanh Dương (Card Nhóm) + Khung Cam (Mở Rộng) */}
                <div className="flex flex-col gap-4 h-full flex-1">
                  
                  {/* Blue Box (Card Nhóm) */}
                  <div className="flex flex-col flex-1">
                    <div className="flex justify-start mb-1 shrink-0">
                      <h2 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                        {teamPulse.find(t => t.id === activeTeamId)?.name || activeTeamId}
                      </h2>
                    </div>

                    {(() => {
                      const team = teamPulse.find(t => t.id === activeTeamId) || {
                        name: activeTeamId, members: 0, working: [], available: [], leave: [], dailyTasks: null, hasData: false, isVisible: true
                      };
                      return (
                        <motion.div variants={itemVariants} className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-2xl relative shadow-sm flex flex-col md:flex-row gap-3 flex-1" style={{ padding: '12px' }}>
                          {(!team.hasData && loading) ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[2px] z-20 rounded-2xl">
                              <div className="flex flex-col items-center gap-1.5">
                                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">Syncing...</p>
                              </div>
                            </div>
                          ) : !team.isVisible ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-main)]/80 backdrop-blur-[4px] z-20 rounded-2xl border border-dashed border-[var(--border)]">
                              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-60">NO TASKS TODAY</p>
                            </div>
                          ) : !team.hasData ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/5 z-20 rounded-2xl">
                              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">No Active Logs</p>
                            </div>
                          ) : null}

                          {/* Left Column - Team Info */}
                          <div className="w-[120px] shrink-0 flex flex-col justify-between h-full">
                            <p className="text-[10px] text-[var(--text-muted)] font-bold">{team.members} MEMBERS</p>
                            <div className="flex flex-col gap-1 text-[10px] font-bold text-[var(--text-main)] my-0.5">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                                <span className="text-[var(--text-muted)] w-[45px] inline-block">BUSY:</span>
                                <span className="tabular-nums">{team.working.length.toString().padStart(2, '0')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                <span className="text-[var(--text-muted)] w-[45px] inline-block">FREE:</span>
                                <span className="tabular-nums">{team.available.length.toString().padStart(2, '0')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                <span className="text-[var(--text-muted)] w-[45px] inline-block">LEAVE:</span>
                                <span className="tabular-nums">{team.leave.length.toString().padStart(2, '0')}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right Column - Tasks */}
                          <div className="flex-1 bg-[var(--bg-surface)]/50 border border-[var(--border)] rounded-xl flex flex-col justify-start overflow-hidden flex-1">
                            <div className="flex flex-col justify-start gap-1.5 h-full p-2.5 overflow-y-auto custom-scrollbar">
                              {team.dailyTasks ? team.dailyTasks.map((t, j) => (
                                <div key={j} className="flex items-center gap-2 group cursor-default shrink-0">
                                  <span className={`w-1 h-1 rounded-full shrink-0 ${t.isWorking ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'}`}></span>
                                  <div className="text-[10px] font-bold truncate">
                                    <span className={`${t.isWorking ? 'text-rose-400' : 'text-[var(--text-muted)]'} uppercase tracking-wide`}>{t.project}</span>
                                  </div>
                                </div>
                              )) : (
                                <div className="flex items-center justify-center h-full">
                                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-35">NO TASKS TODAY</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })()}
                  </div>

                  {/* Orange Box (Active Member Grid) */}
                  <div className="flex flex-col flex-1">
                    <div className="flex justify-start mb-1 shrink-0">
                      <h2 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">ACTIVE MEMBERS</h2>
                    </div>
                    <motion.div variants={itemVariants} className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-2xl shadow-sm flex-1" style={{ padding: '12px' }}>
                      {renderActiveMemberGrid()}
                    </motion.div>
                  </div>

                </div>

                {/* Right Side: Khung Xanh Lá (3D Mini Brain Map) */}
                <div className="flex flex-col h-full">
                  <div className="flex justify-start mb-1 shrink-0">
                    <h2 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">BRAIN MAP</h2>
                  </div>
                  <motion.div 
                    variants={itemVariants} 
                    className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-2xl relative shadow-sm flex-1 overflow-hidden border-indigo-500/20"
                    style={{ padding: '0px' }}
                  >
                    <MiniBrainMap teamId={activeTeamId} />
                  </motion.div>
                </div>

              </div>
            ) : (
              // FIG 2: ORIGINAL 2x2 GRID (Default View for Admin/Non-Team users)
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-fr">
                {teamPulse.map((team, i) => (
                  <div key={i} className="flex flex-col h-full">
                    <div className="flex justify-start mb-1">
                      <h2 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">{team.name}</h2>
                    </div>

                    <motion.div variants={itemVariants} className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-2xl relative shadow-sm flex flex-col md:flex-row gap-3 h-full flex-1" style={{ padding: '12px' }}>
                      {(!team.hasData && loading) ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[2px] z-20 rounded-2xl">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] animate-pulse">Syncing Data...</p>
                          </div>
                        </div>
                      ) : !team.isVisible ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-main)]/80 backdrop-blur-[4px] z-20 rounded-2xl border border-dashed border-[var(--border)]">
                          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-60">NO TASKS TODAY</p>
                        </div>
                      ) : !team.hasData ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/5 z-20 rounded-2xl">
                          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">No Active Logs</p>
                        </div>
                      ) : null}

                      {/* Left Column - Team Info (Compact) */}
                      <div className="w-[120px] shrink-0 flex flex-col justify-between">
                        <p className="text-[10px] text-[var(--text-muted)] font-bold">{team.members} MEMBERS</p>
                        <div className="flex flex-col gap-1.5 text-[10px] font-bold text-[var(--text-main)] my-1">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                            <span className="text-[var(--text-muted)] w-[45px] inline-block">BUSY:</span>
                            <span className="tabular-nums">{team.working.length.toString().padStart(2, '0')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                            <span className="text-[var(--text-muted)] w-[45px] inline-block">FREE:</span>
                            <span className="tabular-nums">{team.available.length.toString().padStart(2, '0')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                            <span className="text-[var(--text-muted)] w-[45px] inline-block">LEAVE:</span>
                            <span className="tabular-nums">{team.leave.length.toString().padStart(2, '0')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Tasks (Closer and Wider) */}
                      <div className="flex-1 bg-[var(--bg-surface)]/50 border border-[var(--border)] rounded-xl flex flex-col justify-start overflow-hidden h-[75px]">
                        <div className="flex flex-col justify-start gap-2 h-full p-2.5 overflow-y-auto custom-scrollbar">
                          {team.dailyTasks ? team.dailyTasks.map((t, j) => (
                            <div key={j} className="flex items-center gap-2 group cursor-default shrink-0">
                              <span className={`w-1 h-1 rounded-full shrink-0 ${t.isWorking ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'}`}></span>
                              <div className="text-[10px] font-bold truncate">
                                <span className={`${t.isWorking ? 'text-rose-400' : 'text-[var(--text-muted)]'} uppercase tracking-wide`}>{t.project}</span>
                              </div>
                            </div>
                          )) : (
                            <div className="flex items-center justify-center h-full">
                              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-30">NO TASKS TODAY</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Currency & Market Section (4/12) */}
          <div className="xl:col-span-4 flex flex-col">
             <div className="flex justify-start mb-1">
                <h2 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">MARKET</h2>
             </div>
             <motion.div 
               variants={itemVariants} 
               className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-2xl shadow-sm flex-1 flex flex-col gap-3"
               style={{ padding: '12px' }}
             >
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                         <span className="font-black text-lg">A$</span>
                      </div>
                      <div>
                         <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight">AUD / VND</h3>
                         <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span> Vietcombank Live
                         </p>
                      </div>
                   </div>
                    <div className="flex items-center">
                       {/* Yesterday's Price (Blue Box) */}
                       {audRate.yesterday && (
                          <div className="text-right pr-3 border-r border-[var(--glass-border)] mr-3">
                             <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-0.5">YESTERDAY</p>
                             <p className="text-xs font-black text-[var(--text-main)]">
                                {audRate.yesterday.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                             </p>
                          </div>
                       )}
                       
                       {/* Today's Price (Red Box) */}
                       <div className="text-right">
                          <div className={`flex items-center gap-1.5 font-black text-lg ${audRate.isUp !== false ? 'text-emerald-500' : 'text-rose-500'}`}>
                             {audRate.isUp !== false ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                             <span>{audRate.rate.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <p className={`text-[10px] font-bold ${audRate.isUp !== false ? 'text-emerald-500/90' : 'text-rose-500/90'}`}>
                             {audRate.change} Yesterday
                          </p>
                       </div>
                    </div>
                </div>

                {/* Main Content Area: Left Stacked Cards, Right Trend Line Chart */}
                <div className="flex flex-col sm:flex-row gap-3 mt-1 flex-1 h-[186px] min-h-[186px] overflow-hidden">
                   {/* Left Column: Stacked Rate Cards */}
                   <div className="w-full sm:w-[125px] flex flex-col gap-2 shrink-0 justify-between">
                      <div 
                       className="bg-[var(--bg-surface)]/50 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-surface)] transition-colors group flex flex-col justify-center flex-1"
                       style={{ padding: '6px 10px' }}
                      >
                         <p className="text-[8px] font-black text-[var(--text-muted)] uppercase mb-0.5 group-hover:text-[var(--text-main)] transition-colors tracking-tighter">Buy Cash</p>
                         <p className="text-[11px] font-black text-[var(--text-main)] truncate">{audRate.buy.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      <div 
                       className="bg-[var(--bg-surface)]/50 rounded-xl border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors group flex flex-col justify-center flex-1"
                       style={{ padding: '6px 10px' }}
                      >
                         <p className="text-[8px] font-black text-indigo-400 uppercase mb-0.5 group-hover:text-indigo-300 transition-colors tracking-tighter">Buy Transfer</p>
                         <p className="text-[11px] font-black text-indigo-300 truncate">{audRate.rate.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      <div 
                       className="bg-[var(--bg-surface)]/50 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-surface)] transition-colors group flex flex-col justify-center flex-1"
                       style={{ padding: '6px 10px' }}
                      >
                         <p className="text-[8px] font-black text-[var(--text-muted)] uppercase mb-0.5 group-hover:text-[var(--text-main)] transition-colors tracking-tighter">Sell Rate</p>
                         <p className="text-[11px] font-black text-[var(--text-main)] truncate">{audRate.sell.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                   </div>

                   {/* Right Column: Trend Line Chart */}
                   <div className="flex-1 bg-[var(--bg-surface)]/30 rounded-xl border border-[var(--border)] p-2 relative overflow-hidden flex flex-col justify-between">
                      {/* Chart Header */}
                      <div className="flex items-center justify-between mb-1 z-10">
                         <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-wider">Trend (Transfer)</span>
                         <div className="flex gap-1 bg-[var(--bg-main)]/60 p-0.5 rounded-lg border border-[var(--border)]/50">
                            {['5D', '1M', '1Y', 'ALL'].map(tab => (
                               <button
                                  key={tab}
                                  onClick={() => setMarketTab(tab)}
                                  className={`text-[8px] font-black px-1.5 py-0.5 rounded-md transition-all ${
                                     marketTab === tab 
                                        ? 'bg-indigo-500 text-white shadow-sm' 
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                  }`}
                               >
                                  {tab}
                               </button>
                            ))}
                         </div>
                      </div>

                      {/* Chart Area */}
                      <div className="flex-1 relative w-full h-[135px] min-h-[135px] mt-0.5">
                         {isMarketLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10">
                               <div className="w-4 h-4 border border-t-transparent border-indigo-500 rounded-full animate-spin"></div>
                            </div>
                         )}
                         <Line 
                            data={chartData} 
                            options={chartOptions} 
                         />
                      </div>
                   </div>
                </div>
             </motion.div>
          </div>
        </div>

        {/* Task Trends Section */}
         <motion.div variants={itemVariants} className="bg-[var(--bg-main)] border border-[var(--border)] rounded-3xl p-10 shadow-sm min-h-[500px] flex flex-col gap-12">
            <div className="flex flex-col md:flex-row justify-start items-start md:items-center gap-12 pl-2">
              <div className="flex items-center gap-8 h-12">
                {/* Team Selector (Neumorphic) */}
                <div className="relative h-full group" style={{ minWidth: '180px' }}>
                  <div className="absolute inset-0 bg-[var(--bg-surface)] rounded-2xl shadow-[4px_4px_10px_rgba(0,0,0,0.1),-4px_-4px_10px_rgba(255,255,255,0.8)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3),-2px_-2px_10px_rgba(255,255,255,0.05)] group-hover:scale-[1.02] transition-transform duration-300"></div>
                  <select 
                    value={chartTeam}
                    onChange={(e) => setChartTeam(e.target.value)}
                    disabled={!isAdmin}
                    className="relative w-full h-full bg-transparent text-[var(--text-main)] text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl cursor-pointer focus:outline-none z-10 disabled:cursor-default"
                    style={{
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none',
                      textAlign: 'center',
                      textAlignLast: 'center',
                      paddingLeft: '32px',
                      paddingRight: '40px',
                    }}
                  >
                    {isAdmin ? (
                      <>
                        <option value="ALL">ALL TEAMS</option>
                        {TEAMS.map(t => (
                          <option key={t.id} value={t.id}>{t.display}</option>
                        ))}
                      </>
                    ) : (
                      TEAMS.filter(t => t.id === userTeamKey).map(t => (
                        <option key={t.id} value={t.id}>{t.display}</option>
                      ))
                    )}
                  </select>
                  {isAdmin && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] z-20">
                      <ChevronDown size={14} />
                    </div>
                  )}
                </div>

                {/* Time Range Selector (Neumorphic) */}
                <div className="h-full flex bg-[var(--bg-surface)] rounded-2xl p-1.5 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05),inset_-2px_-2px_5px_rgba(255,255,255,0.5)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2),inset_-1px_-1px_5px_rgba(255,255,255,0.02)] gap-2">
                  {['WEEK', 'MONTH', 'YEAR'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setTimeRange(r)}
                      className={`h-full w-[80px] flex items-center justify-center text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 ${
                        timeRange === r 
                        ? 'bg-[var(--bg-surface)] text-indigo-600 shadow-[2px_2px_5px_rgba(0,0,0,0.1),-2px_-2px_5px_rgba(255,255,255,1)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.3),-1px_-1px_5px_rgba(255,255,255,0.05)] scale-[0.98]' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {/* Chart Type Selector (Neumorphic) */}
                <div className="h-full flex bg-[var(--bg-surface)] rounded-2xl p-1.5 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05),inset_-2px_-2px_5px_rgba(255,255,255,0.5)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2),inset_-1px_-1px_5px_rgba(255,255,255,0.02)] gap-2">
                  {[
                    { id: 'LINE', icon: TrendingUp },
                    { id: 'BAR', icon: BarChart3 },
                    { id: 'POLAR', icon: PieChart }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setChartType(t.id)}
                      className={`h-full aspect-square flex items-center justify-center rounded-xl transition-all duration-300 ${
                        chartType === t.id 
                        ? 'bg-[var(--bg-surface)] text-indigo-600 shadow-[2px_2px_5px_rgba(0,0,0,0.1),-2px_-2px_5px_rgba(255,255,255,1)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.3),-1px_-1px_5px_rgba(255,255,255,0.05)] scale-[0.98]' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                      title={`${t.id} Chart`}
                    >
                      <t.icon size={16} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-[400px] w-full relative flex items-center justify-center">
              {chartType === 'LINE' && (
                <Line 
                  data={trendData}
                  plugins={[dataLabelsPlugin]}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleFont: { family: 'Inter', size: 12, weight: 'bold' },
                        bodyFont: { family: 'Inter', size: 11 },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false
                      }
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: {
                          color: 'rgba(148, 163, 184, 0.8)',
                          font: { family: 'Inter', size: 10, weight: 'bold' }
                        }
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(148, 163, 184, 0.08)' },
                        ticks: {
                          color: 'rgba(148, 163, 184, 0.8)',
                          font: { family: 'Inter', size: 10, weight: 'bold' },
                          stepSize: 5
                        }
                      }
                    }
                  }}
                />
              )}

              {chartType === 'BAR' && (
                <Bar 
                  data={trendData}
                  plugins={[dataLabelsPlugin]}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleFont: { family: 'Inter', size: 12, weight: 'bold' },
                        bodyFont: { family: 'Inter', size: 11 },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false
                      }
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: {
                          color: 'rgba(148, 163, 184, 0.8)',
                          font: { family: 'Inter', size: 10, weight: 'bold' }
                        }
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(148, 163, 184, 0.08)' },
                        ticks: {
                          color: 'rgba(148, 163, 184, 0.8)',
                          font: { family: 'Inter', size: 10, weight: 'bold' },
                          stepSize: 5
                        }
                      }
                    }
                  }}
                />
              )}

              {chartType === 'POLAR' && (
                <div className="w-full h-full max-h-[500px] flex items-center justify-center p-4">
                  <PolarArea 
                    data={trendData}
                    plugins={[dataLabelsPlugin, polar3DPlugin]}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'left',
                          labels: {
                            color: 'rgba(148, 163, 184, 0.8)',
                            font: { family: 'Inter', size: 10, weight: 'bold' },
                            padding: 20
                          }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(15, 23, 42, 0.9)',
                          titleFont: { family: 'Inter', size: 12, weight: 'bold' },
                          bodyFont: { family: 'Inter', size: 11 },
                          padding: 12,
                          cornerRadius: 8
                        }
                      },
                      scales: {
                        r: {
                          grid: { color: 'rgba(148, 163, 184, 0.1)' },
                          angleLines: { color: 'rgba(148, 163, 184, 0.1)' },
                          ticks: {
                            display: false,
                            backdropColor: 'transparent'
                          }
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </motion.div>


      </motion.div>
    </div>
  );
};

export default Dashboard;
