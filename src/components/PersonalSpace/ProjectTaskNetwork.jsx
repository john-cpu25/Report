import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  Panel,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { 
  Users, 
  Layers, 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronRight, 
  ChevronDown, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  ArrowRight, 
  FolderGit2, 
  Maximize2,
  GitFork,
  ArrowDownRight,
  ShieldCheck,
  Check
} from 'lucide-react';

// ==========================================
// 1. CUSTOM NODE COMPONENTS
// ==========================================

// --- PERSON NODE (Manager, Leader, Engineer, Modeller) ---
const PersonNode = ({ data, selected }) => {
  const isAssigner = data.roleType === 'assigner' || data.isLeader || data.isManager;
  const initials = (data.name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className={`px-3 py-2 rounded-xl transition-all duration-200 select-none shadow-sm min-w-[190px] max-w-[220px] ${
        selected
          ? 'ring-2 ring-purple-500 shadow-md bg-purple-500/10'
          : 'hover:border-purple-400'
      }`}
      style={{
        backgroundColor: 'var(--bg-card, #ffffff)',
        border: `1.5px solid ${selected ? '#a855f7' : isAssigner ? '#c084fc' : 'var(--border, #e2e8f0)'}`,
        boxShadow: selected ? '0 4px 14px rgba(168,85,247,0.25)' : '0 2px 6px rgba(0,0,0,0.04)'
      }}
    >
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-purple-500 !border-2 !border-white" />
      
      <div className="flex items-center gap-2.5">
        {/* Avatar */}
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-white shadow-inner"
          style={{
            background: isAssigner 
              ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' 
              : 'linear-gradient(135deg, #0ea5e9, #0284c7)'
          }}
        >
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-[var(--text-primary,#0f172a)] truncate block leading-tight">
              {data.name}
            </span>
          </div>
          
          <div className="flex items-center gap-1 mt-0.5">
            <span 
              className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                isAssigner 
                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400' 
                  : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
              }`}
            >
              {data.roleTitle || (isAssigner ? 'DELEGATOR' : 'MEMBER')}
            </span>
            {data.team && (
              <span className="text-[10px] text-[var(--text-muted,#64748b)] truncate">
                · {data.team}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mini metric counters */}
      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted,#64748b)] pt-1.5 mt-1.5 border-t border-[var(--border,#e2e8f0)] font-mono">
        <span title="Tasks assigned">Giao: <b className="text-[var(--text-primary,#0f172a)]">{data.assignedCount || 0}</b></span>
        <span title="Tasks executing">Làm: <b className="text-[var(--text-primary,#0f172a)]">{data.executingCount || 0}</b></span>
      </div>

      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-purple-500 !border-2 !border-white" />
    </div>
  );
};

// --- TASK NODE (Parent, Child, Standalone) ---
const TaskNode = ({ data, selected }) => {
  const isParent = data.isParent;
  const isChild = Boolean(data.parent_id);
  const status = Number(data.status);

  // Status mapping
  const statusMeta = useMemo(() => {
    if (status >= 4) return { label: 'Done', bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', border: '#10b981' };
    if (status === 3) return { label: 'Review', bg: 'bg-rose-500/15', text: 'text-rose-600 dark:text-rose-400', border: '#f43f5e' };
    if (status === 1 || status === 2) return { label: 'WIP', bg: 'bg-sky-500/15', text: 'text-sky-600 dark:text-sky-400', border: '#0284c7' };
    return { label: 'Pending', bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400', border: '#f59e0b' };
  }, [status]);

  const planned = Number(data.hours_planned) || 0;
  const complete = Number(data.hours_complete) || 0;
  const progressPercent = planned > 0 ? Math.min(100, Math.round((complete / planned) * 100)) : (status >= 4 ? 100 : 0);

  return (
    <div
      className={`px-3 py-2 rounded-xl transition-all duration-200 select-none shadow-sm min-w-[210px] max-w-[240px] ${
        selected
          ? 'ring-2 ring-indigo-500 shadow-md'
          : 'hover:border-indigo-400'
      }`}
      style={{
        backgroundColor: 'var(--bg-card, #ffffff)',
        border: `1.5px solid ${selected ? '#6366f1' : isParent ? '#f59e0b' : 'var(--border, #e2e8f0)'}`,
        boxShadow: selected ? '0 4px 14px rgba(99,102,241,0.25)' : '0 2px 6px rgba(0,0,0,0.04)'
      }}
    >
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-indigo-500 !border-2 !border-white" />
      <Handle type="target" id="top" position={Position.Top} className="!w-2 !h-2 !bg-amber-500 !border-2 !border-white" />

      {/* Header: Project Dot (10px gap) + Type Tag + Status */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center" style={{ gap: '10px' }}>
          <span 
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: data.projectColor || '#6366f1' }}
          />
          <span className="text-[11px] font-bold tracking-wider text-[var(--text-muted,#64748b)] uppercase truncate max-w-[80px]">
            {data.projectKey || data.project || 'TASK'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isParent && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              PARENT
            </span>
          )}
          {isChild && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              SUB
            </span>
          )}
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${statusMeta.bg} ${statusMeta.text}`}>
            {statusMeta.label}
          </span>
        </div>
      </div>

      {/* Task Name */}
      <div className="text-[12px] font-bold text-[var(--text-primary,#0f172a)] leading-snug line-clamp-2 min-h-[32px]">
        {data.taskName || data.name}
      </div>

      {/* Footer: Hours & Progress */}
      <div className="mt-2 pt-1.5 border-t border-[var(--border,#e2e8f0)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted,#64748b)]">
        <span>
          <b className="text-[var(--text-primary,#0f172a)]">{complete.toFixed(1)}h</b> / {planned.toFixed(1)}h
        </span>
        <span className="font-bold text-[var(--text-primary,#0f172a)]">
          {progressPercent}%
        </span>
      </div>

      {/* Mini Progress Bar */}
      <div className="w-full h-1 bg-[var(--border,#e2e8f0)] rounded-full mt-1 overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-300"
          style={{ 
            width: `${progressPercent}%`,
            backgroundColor: statusMeta.border
          }}
        />
      </div>

      {/* Subtask count badge if parent has children */}
      {isParent && data.childCount > 0 && (
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded">
          <span className="flex items-center gap-1">
            <GitFork size={11} /> {data.childCount} subtasks
          </span>
          <span className="text-[9px] opacity-75">{data.collapsed ? 'Expand' : 'Collapse'}</span>
        </div>
      )}

      <Handle type="source" id="bottom" position={Position.Bottom} className="!w-2 !h-2 !bg-amber-500 !border-2 !border-white" />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-indigo-500 !border-2 !border-white" />
    </div>
  );
};

// --- PROJECT GROUP BACKGROUND / FRAME NODE ---
const ProjectGroupNode = ({ data }) => {
  return (
    <div
      className="w-full h-full rounded-2xl p-3 border-2 border-dashed pointer-events-none transition-all duration-300"
      style={{
        borderColor: `${data.color || '#6366f1'}44`,
        backgroundColor: `${data.color || '#6366f1'}08`
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span 
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: data.color || '#6366f1' }}
        />
        <span className="text-[13px] font-black uppercase tracking-wider text-[var(--text-primary,#0f172a)]">
          {data.projectKey}
        </span>
        <span className="text-[11px] font-mono text-[var(--text-muted,#64748b)]">
          · {data.taskCount || 0} tasks · {data.memberCount || 0} members
        </span>
      </div>
    </div>
  );
};

const nodeTypes = {
  personNode: PersonNode,
  taskNode: TaskNode,
  projectGroupNode: ProjectGroupNode
};

// ==========================================
// 2. DAGRE HIERARCHICAL LAYOUT ALGORITHM
// ==========================================
function getLayoutedElements(nodes, edges, direction = 'LR') {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ 
    rankdir: direction, 
    nodesep: 40, 
    ranksep: 90,
    marginx: 30,
    marginy: 30
  });

  nodes.forEach((node) => {
    // Only layout non-group nodes
    if (node.type !== 'projectGroupNode') {
      const width = node.type === 'personNode' ? 220 : 240;
      const height = node.type === 'personNode' ? 76 : 110;
      dagreGraph.setNode(node.id, { width, height });
    }
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    if (node.type === 'projectGroupNode') return node;
    const nodeWithPosition = dagreGraph.node(node.id);
    if (!nodeWithPosition) return node;

    const width = node.type === 'personNode' ? 220 : 240;
    const height = node.type === 'personNode' ? 76 : 110;

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// ==========================================
// 3. MAIN COMPONENT
// ==========================================
const ProjectTaskNetworkInner = ({
  tasks = [],
  filteredData = [],
  dashboardProjects = [],
  dashboardUsers = [],
  getProjectColor,
  theme,
  initialProject = '',
  initialUser = ''
}) => {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // Filters State
  const [selectedProject, setSelectedProject] = useState(initialProject || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupByProject, setGroupByProject] = useState(true);
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [highlightScope, setHighlightScope] = useState('all'); // 'all' | 'assignment' | 'hierarchy'
  
  // Selection Drawer State
  const [selectedItem, setSelectedItem] = useState(null); // node or edge
  const [collapsedParentIds, setCollapsedParentIds] = useState(new Set());

  // User Lookup Map
  const userMap = useMemo(() => {
    const map = new Map();
    if (dashboardUsers) {
      dashboardUsers.forEach(u => {
        if (!u) return;
        if (u.id) map.set(u.id, u);
        if (u.id) map.set(u.id.toLowerCase(), u);
        if (u.name) map.set(u.name.toLowerCase().trim(), u);
        if (u.email) map.set(u.email.toLowerCase().trim(), u);
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

  // Project List for dropdown
  const projectOptions = useMemo(() => {
    const set = new Set();
    tasks.forEach(t => {
      const p = (t.project || t.projectKey || '').trim().toUpperCase();
      if (p && p !== 'UNASSIGNED') set.add(p);
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Data processing: Build Graph Model (Person Nodes, Task Nodes, Edges)
  const rawGraphData = useMemo(() => {
    const candidateTasks = tasks.filter(t => {
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

    // Detect Parent vs Child relationships
    const tasksById = new Map();
    const childrenByParent = new Map();
    candidateTasks.forEach(t => {
      tasksById.set(t.id, t);
      if (t.parent_id) {
        if (!childrenByParent.has(t.parent_id)) childrenByParent.set(t.parent_id, []);
        childrenByParent.get(t.parent_id).push(t.id);
      }
    });

    const personMap = new Map(); // id -> { user, assignedCount, executingCount, isAssigner }
    const nodes = [];
    const edges = [];

    // 1. Process Tasks & Person Nodes
    candidateTasks.forEach(t => {
      // If subtasks hidden and task has parent, check if parent is collapsed
      if (!showSubtasks && t.parent_id) return;
      if (t.parent_id && collapsedParentIds.has(t.parent_id)) return;

      const pKey = (t.project || 'APEX').trim().toUpperCase();
      const pColor = (getProjectColor ? getProjectColor(pKey) : null) || projectMap.get(pKey)?.color || '#6366f1';
      const isParent = childrenByParent.has(t.id);
      const childCount = (childrenByParent.get(t.id) || []).length;

      // Add Task Node
      const taskNodeId = `task-${t.id}`;
      nodes.push({
        id: taskNodeId,
        type: 'taskNode',
        data: {
          id: t.id,
          task: t,
          name: t.name,
          taskName: t.taskName || t.name,
          project: t.project,
          projectKey: pKey,
          projectColor: pColor,
          status: t.status,
          hours_planned: t.hours_planned,
          hours_complete: t.hours_complete,
          parent_id: t.parent_id,
          isParent,
          childCount,
          collapsed: collapsedParentIds.has(t.id)
        },
        position: { x: 0, y: 0 }
      });

      // Assigner (Người giao việc)
      const assignerId = t.assigned_by_id || t.create_by_id;
      const assignerName = t.createdBy || (assignerId ? userMap.get(assignerId)?.name : null);
      if (assignerId || assignerName) {
        const pKeyId = assignerId ? `person-${assignerId}` : `person-${assignerName.replace(/\s+/g, '_')}`;
        if (!personMap.has(pKeyId)) {
          const uObj = assignerId ? userMap.get(assignerId) : userMap.get(assignerName?.toLowerCase());
          personMap.set(pKeyId, {
            id: pKeyId,
            rawId: assignerId,
            name: assignerName || uObj?.name || 'Manager',
            roleTitle: uObj?.role || 'MANAGER / LEADER',
            team: uObj?.team || t.team || '',
            roleType: 'assigner',
            assignedCount: 0,
            executingCount: 0
          });
        }
        personMap.get(pKeyId).assignedCount += 1;

        // Edge: Assigner -> Task (Giao việc)
        if (highlightScope === 'all' || highlightScope === 'assignment') {
          edges.push({
            id: `assign-${pKeyId}-${taskNodeId}`,
            source: pKeyId,
            target: taskNodeId,
            type: 'smoothstep',
            label: 'Giao',
            labelStyle: { fill: '#8b5cf6', fontSize: 10, fontWeight: 700 },
            style: { stroke: '#8b5cf6', strokeWidth: 1.8 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6', width: 14, height: 14 }
          });
        }
      }

      // Assignee (Người nhận việc / Chịu trách nhiệm)
      const assigneeId = t.assigned_to_id || t.user_id;
      const assigneeName = t.userName || (assigneeId ? userMap.get(assigneeId)?.name : null);
      if (assigneeId || assigneeName) {
        const pKeyId = assigneeId ? `person-${assigneeId}` : `person-${assigneeName.replace(/\s+/g, '_')}`;
        if (!personMap.has(pKeyId)) {
          const uObj = assigneeId ? userMap.get(assigneeId) : userMap.get(assigneeName?.toLowerCase());
          personMap.set(pKeyId, {
            id: pKeyId,
            rawId: assigneeId,
            name: assigneeName || uObj?.name || 'Assignee',
            roleTitle: uObj?.role || uObj?.team || 'ENGINEER',
            team: uObj?.team || t.team || '',
            roleType: 'assignee',
            assignedCount: 0,
            executingCount: 0
          });
        }
        personMap.get(pKeyId).executingCount += 1;

        // Edge: Task -> Assignee (Nhận việc / Chịu trách nhiệm)
        if (highlightScope === 'all' || highlightScope === 'assignment') {
          const isWip = Number(t.status) === 1 || Number(t.status) === 2;
          edges.push({
            id: `resp-${taskNodeId}-${pKeyId}`,
            source: taskNodeId,
            target: pKeyId,
            type: 'smoothstep',
            animated: isWip,
            label: 'Làm',
            labelStyle: { fill: '#06b6d4', fontSize: 10, fontWeight: 700 },
            style: { stroke: '#06b6d4', strokeWidth: 1.8, strokeDasharray: isWip ? '4 2' : undefined },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4', width: 14, height: 14 }
          });
        }
      }

      // Parent-Child Edge: Parent Task -> Child Task
      if (t.parent_id && (highlightScope === 'all' || highlightScope === 'hierarchy')) {
        const parentNodeId = `task-${t.parent_id}`;
        // Verify parent node is included
        if (tasksById.has(t.parent_id)) {
          edges.push({
            id: `parent-${parentNodeId}-${taskNodeId}`,
            source: parentNodeId,
            sourceHandle: 'bottom',
            target: taskNodeId,
            targetHandle: 'top',
            type: 'smoothstep',
            label: 'Subtask',
            labelStyle: { fill: '#f59e0b', fontSize: 9, fontWeight: 800 },
            style: { stroke: '#f59e0b', strokeWidth: 2.2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b', width: 14, height: 14 }
          });
        }
      }
    });

    // Add all unique person nodes
    personMap.forEach(person => {
      nodes.push({
        id: person.id,
        type: 'personNode',
        data: person,
        position: { x: 0, y: 0 }
      });
    });

    return { nodes, edges, candidateTasks };
  }, [tasks, selectedProject, selectedStatus, searchQuery, showSubtasks, highlightScope, collapsedParentIds, userMap, projectMap, getProjectColor]);

  // Layout with Dagre
  const { layoutedNodes, layoutedEdges } = useMemo(() => {
    if (!rawGraphData.nodes || rawGraphData.nodes.length === 0) {
      return { layoutedNodes: [], layoutedEdges: [] };
    }
    const { nodes, edges } = getLayoutedElements(rawGraphData.nodes, rawGraphData.edges, 'LR');
    return { layoutedNodes: nodes, layoutedEdges: edges };
  }, [rawGraphData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Sync state when layout recalculates
  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    // Auto fit view smoothly after recalculating
    const timer = setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 });
    }, 100);
    return () => clearTimeout(timer);
  }, [layoutedNodes, layoutedEdges, fitView]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const list = rawGraphData.candidateTasks || [];
    let pending = 0;
    let wip = 0;
    let review = 0;
    let done = 0;
    let totalPlannedHours = 0;
    let totalCompleteHours = 0;

    list.forEach(t => {
      const s = Number(t.status);
      if (s >= 4) done++;
      else if (s === 3) review++;
      else if (s === 1 || s === 2) wip++;
      else pending++;

      totalPlannedHours += Number(t.hours_planned) || 0;
      totalCompleteHours += Number(t.hours_complete) || 0;
    });

    const uniqueMembers = new Set();
    list.forEach(t => {
      if (t.userName) uniqueMembers.add(t.userName);
      if (t.createdBy) uniqueMembers.add(t.createdBy);
    });

    return {
      total: list.length,
      pending,
      wip,
      review,
      done,
      members: uniqueMembers.size,
      totalPlannedHours,
      totalCompleteHours
    };
  }, [rawGraphData]);

  // Node Selection Handler
  const onNodeClick = useCallback((event, node) => {
    setSelectedItem(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedItem(null);
  }, []);

  // Toggle Collapse Parent Task
  const toggleCollapseParent = useCallback((taskId) => {
    setCollapsedParentIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  return (
    <div className="w-full h-full flex flex-col rounded-2xl border border-[var(--border,#e2e8f0)] bg-[var(--bg-card,#ffffff)] overflow-hidden shadow-sm">
      
      {/* ======================================================== */}
      {/* 1. TOP BAR & SUMMARY METRIC BAR (Strict 10px padding & 12px text) */}
      {/* ======================================================== */}
      <div className="p-[10px] border-b border-[var(--border,#e2e8f0)] bg-[var(--bg-surface,#f8fafc)] flex flex-wrap items-center justify-between gap-[10px]">
        
        {/* Controls Toolbar */}
        <div className="flex items-center flex-wrap gap-[6px]">
          {/* Project Switcher */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--bg-card,#ffffff)] border border-[var(--border,#e2e8f0)] shadow-sm">
            <FolderGit2 size={13} className="text-purple-500 shrink-0" />
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="bg-transparent text-[12px] font-bold text-[var(--text-primary,#0f172a)] focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">ALL PROJECTS</option>
              {projectOptions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--bg-card,#ffffff)] border border-[var(--border,#e2e8f0)] shadow-sm">
            <Filter size={12} className="text-sky-500 shrink-0" />
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="bg-transparent text-[12px] font-medium text-[var(--text-primary,#0f172a)] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="pending">Pending</option>
              <option value="wip">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Completed</option>
            </select>
          </div>

          {/* Highlight Scope */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--bg-card,#ffffff)] border border-[var(--border,#e2e8f0)] shadow-sm">
            <GitFork size={12} className="text-amber-500 shrink-0" />
            <select
              value={highlightScope}
              onChange={e => setHighlightScope(e.target.value)}
              className="bg-transparent text-[12px] font-medium text-[var(--text-primary,#0f172a)] focus:outline-none cursor-pointer"
            >
              <option value="all">Full Network</option>
              <option value="assignment">Assignment Flow</option>
              <option value="hierarchy">Task Hierarchy</option>
            </select>
          </div>

          {/* Subtasks Toggle */}
          <button
            onClick={() => setShowSubtasks(!showSubtasks)}
            className={`px-2.5 py-1 rounded-xl text-[12px] font-medium transition-colors border shadow-sm flex items-center gap-1.5 ${
              showSubtasks
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400'
                : 'bg-[var(--bg-card,#ffffff)] border-[var(--border,#e2e8f0)] text-[var(--text-muted,#64748b)]'
            }`}
          >
            <GitFork size={12} />
            <span>Subtasks</span>
          </button>

          {/* Search Box */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--bg-card,#ffffff)] border border-[var(--border,#e2e8f0)] shadow-sm">
            <Search size={12} className="text-[var(--text-muted,#64748b)]" />
            <input
              type="text"
              placeholder="Search task or person..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-[12px] text-[var(--text-primary,#0f172a)] placeholder:text-[var(--text-muted,#94a3b8)] focus:outline-none w-36"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[var(--text-muted,#64748b)] hover:text-black dark:hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Right Summary Metrics (Strict 12px text, font-mono numbers) */}
        <div className="flex items-center gap-[6px] shrink-0">
          <div className="px-2.5 py-1 rounded-xl bg-[var(--bg-card,#ffffff)] border border-[var(--border,#e2e8f0)] flex items-center gap-1.5 shadow-sm">
            <span className="text-[11px] font-bold text-[var(--text-muted,#64748b)] uppercase">TOTAL</span>
            <span className="text-[12px] font-mono font-bold text-[var(--text-primary,#0f172a)]">{summaryMetrics.total}</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center gap-1.5 shadow-sm">
            <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase">WIP</span>
            <span className="text-[12px] font-mono font-bold text-sky-700 dark:text-sky-300">{summaryMetrics.wip}</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">DONE</span>
            <span className="text-[12px] font-mono font-bold text-emerald-700 dark:text-emerald-300">{summaryMetrics.done}</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-1.5 shadow-sm">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">PENDING</span>
            <span className="text-[12px] font-mono font-bold text-amber-700 dark:text-amber-300">{summaryMetrics.pending}</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-[var(--bg-card,#ffffff)] border border-[var(--border,#e2e8f0)] flex items-center gap-1.5 shadow-sm">
            <Users size={12} className="text-purple-500" />
            <span className="text-[12px] font-mono font-bold text-[var(--text-primary,#0f172a)]">{summaryMetrics.members}</span>
          </div>

          <button
            onClick={() => fitView({ padding: 0.2, duration: 400 })}
            title="Reset layout & fit view"
            className="p-1.5 rounded-xl bg-[var(--bg-card,#ffffff)] border border-[var(--border,#e2e8f0)] hover:bg-[var(--bg-surface,#f1f5f9)] text-[var(--text-muted,#64748b)] transition-colors shadow-sm ml-1"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MAIN GRAPH CANVAS & SIDE INSPECTOR DRAWER */}
      {/* ======================================================== */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.15}
          maxZoom={2.5}
          className="bg-[var(--bg-surface,#f8fafc)]"
        >
          <Background color="var(--border, #cbd5e1)" gap={20} size={1} />
          <Controls showInteractive={false} className="!left-3 !bottom-3 !bg-[var(--bg-card,#ffffff)] !border-[var(--border,#e2e8f0)] !shadow-sm !rounded-xl" />
          <MiniMap 
            zoomable 
            pannable 
            nodeStrokeWidth={2}
            className="!right-3 !bottom-3 !rounded-xl !border !border-[var(--border,#e2e8f0)] !bg-[var(--bg-card,#ffffff)]/80 !backdrop-blur !shadow-sm" 
            style={{ width: 140, height: 90 }}
          />

          {/* Minimal Bottom-Left Edge Legend */}
          <Panel position="bottom-left" className="!ml-14 !mb-3">
            <div className="flex items-center gap-3 px-2.5 py-1 rounded-xl bg-[var(--bg-card,#ffffff)]/90 backdrop-blur border border-[var(--border,#e2e8f0)] shadow-sm text-[11px] font-medium text-[var(--text-muted,#64748b)]">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#8b5cf6]" /> Giao việc (Assign)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-[#06b6d4]" /> Thực hiện (Execute)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#f59e0b]" /> Task con (Subtask)
              </span>
            </div>
          </Panel>
        </ReactFlow>

        {/* Slide-out Inspector Drawer on Right (300px) */}
        {selectedItem && (
          <div className="absolute top-2.5 right-2.5 bottom-2.5 w-[300px] rounded-2xl bg-[var(--bg-card,#ffffff)] border border-[var(--border,#e2e8f0)] shadow-xl p-[10px] flex flex-col z-20 backdrop-blur-md animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border,#e2e8f0)]">
              <span className="text-[13px] font-black text-[var(--text-primary,#0f172a)] uppercase tracking-wider flex items-center gap-1.5">
                {selectedItem.type === 'personNode' ? <User size={14} className="text-purple-500" /> : <Layers size={14} className="text-indigo-500" />}
                {selectedItem.type === 'personNode' ? 'MEMBER DETAILS' : 'TASK DETAILS'}
              </span>
              <button 
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg text-[var(--text-muted,#64748b)] hover:bg-[var(--bg-surface,#f1f5f9)] hover:text-black dark:hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-2 space-y-2.5 text-[12px]">
              {selectedItem.type === 'taskNode' && (
                <>
                  {/* Task Name & Project */}
                  <div className="p-2 rounded-xl bg-[var(--bg-surface,#f8fafc)] border border-[var(--border,#e2e8f0)]">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: selectedItem.data.projectColor || '#6366f1' }}
                      />
                      <span className="text-[11px] font-black uppercase text-[var(--text-muted,#64748b)]">
                        {selectedItem.data.projectKey}
                      </span>
                    </div>
                    <div className="text-[13px] font-bold text-[var(--text-primary,#0f172a)] leading-snug">
                      {selectedItem.data.taskName || selectedItem.data.name}
                    </div>
                  </div>

                  {/* Flow Relationships (Giao & Nhận) */}
                  <div className="space-y-1.5">
                    <div className="p-2 rounded-xl border border-purple-500/20 bg-purple-500/5">
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                        NGƯỜI GIAO (ASSIGNER)
                      </span>
                      <span className="text-[12px] font-bold text-[var(--text-primary,#0f172a)]">
                        {selectedItem.data.task?.createdBy || 'Project Manager'}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl border border-sky-500/20 bg-sky-500/5">
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">
                        NGƯỜI THỰC HIỆN (ASSIGNEE)
                      </span>
                      <span className="text-[12px] font-bold text-[var(--text-primary,#0f172a)]">
                        {selectedItem.data.task?.userName || 'Unassigned'}
                      </span>
                      {selectedItem.data.task?.team && (
                        <span className="text-[10px] text-[var(--text-muted,#64748b)] block">
                          Team: {selectedItem.data.task.team}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Parent Task Link if subtask */}
                  {selectedItem.data.parent_id && (
                    <div className="p-2 rounded-xl border border-amber-500/20 bg-amber-500/5">
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                        TASK CHA (PARENT TASK)
                      </span>
                      <span className="text-[11px] font-mono text-[var(--text-primary,#0f172a)] truncate block">
                        ID: {selectedItem.data.parent_id}
                      </span>
                    </div>
                  )}

                  {/* Hours & Progress */}
                  <div className="p-2 rounded-xl bg-[var(--bg-surface,#f8fafc)] border border-[var(--border,#e2e8f0)] space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted,#64748b)]">Planned Hours:</span>
                      <b className="text-[var(--text-primary,#0f172a)]">{(Number(selectedItem.data.hours_planned) || 0).toFixed(2)}h</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted,#64748b)]">Actual Hours:</span>
                      <b className="text-[var(--text-primary,#0f172a)]">{(Number(selectedItem.data.hours_complete) || 0).toFixed(2)}h</b>
                    </div>
                  </div>

                  {/* Details / Notes */}
                  {selectedItem.data.task?.detail && (
                    <div className="p-2 rounded-xl bg-[var(--bg-surface,#f8fafc)] border border-[var(--border,#e2e8f0)]">
                      <span className="text-[10px] font-bold text-[var(--text-muted,#64748b)] uppercase tracking-wider block mb-0.5">
                        DESCRIPTION
                      </span>
                      <p className="text-[11px] text-[var(--text-primary,#0f172a)] whitespace-pre-wrap leading-relaxed">
                        {selectedItem.data.task.detail}
                      </p>
                    </div>
                  )}
                </>
              )}

              {selectedItem.type === 'personNode' && (
                <>
                  <div className="p-2 rounded-xl bg-[var(--bg-surface,#f8fafc)] border border-[var(--border,#e2e8f0)]">
                    <div className="text-[13px] font-bold text-[var(--text-primary,#0f172a)]">
                      {selectedItem.data.name}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted,#64748b)] mt-0.5">
                      {selectedItem.data.roleTitle} {selectedItem.data.team ? `· ${selectedItem.data.team}` : ''}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase block">GIAO VIỆC</span>
                      <span className="text-[14px] font-mono font-black text-purple-700 dark:text-purple-300">
                        {selectedItem.data.assignedCount || 0}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-center">
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase block">THỰC HIỆN</span>
                      <span className="text-[14px] font-mono font-black text-sky-700 dark:text-sky-300">
                        {selectedItem.data.executingCount || 0}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Action */}
            <div className="pt-2 border-t border-[var(--border,#e2e8f0)]">
              <button
                onClick={() => {
                  fitView({ nodes: [selectedItem], padding: 0.8, duration: 400 });
                }}
                className="w-full py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[12px] flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Maximize2 size={12} /> Focus on Graph
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ProjectTaskNetwork(props) {
  return (
    <ReactFlowProvider>
      <ProjectTaskNetworkInner {...props} />
    </ReactFlowProvider>
  );
}
