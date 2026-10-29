import React, { useState, useMemo, useRef, useCallback } from 'react';
import { 
  FolderGit2, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  ZoomIn, 
  ZoomOut, 
  Network, 
  ListTree, 
  X
} from 'lucide-react';
import { format } from 'date-fns';

// ==========================================
// HELPER: DATE FORMATTING (DD/MM HH:mm)
// ==========================================
const formatPlanDate = (start, end) => {
  if (!start && !end) return '-';
  try {
    const sDate = start ? new Date(start) : null;
    const eDate = end ? new Date(end) : null;
    const sValid = sDate && !isNaN(sDate.getTime());
    const eValid = eDate && !isNaN(eDate.getTime());

    if (sValid && eValid) {
      return `${format(sDate, 'dd/MM HH:mm')} - ${format(eDate, 'dd/MM HH:mm')}`;
    }
    if (sValid) return format(sDate, 'dd/MM HH:mm');
    if (eValid) return format(eDate, 'dd/MM HH:mm');
    return '-';
  } catch {
    return '-';
  }
};

// ==========================================
// HELPER: STATUS PILL BADGE (Chữ không đậm)
// ==========================================
const StatusPill = ({ status }) => {
  const s = Number(status);
  if (s >= 4) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-normal border border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-600">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Completed
      </span>
    );
  }
  if (s === 3) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-normal border border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-600">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
        Checked
      </span>
    );
  }
  if (s === 1 || s === 2) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-normal border border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-600">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-normal border border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-600">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      New
    </span>
  );
};

// ==========================================
// HELPER: MINDMAP CARD COMPONENT
// Bo góc 10px, chữ cách vào 10px (p-[10px], rounded-[10px], chữ ko đậm)
// ==========================================
const MindmapCard = ({ task, isParent, childCount, isExpanded, onToggleExpand }) => {
  const planned = Number(task.hours_planned) || 0;
  const complete = Number(task.hours_complete) || 0;
  const isOnlyCheck = task.check_only || task.is_onlychecked || (task.name && String(task.name).trim().endsWith('_'));

  return (
    <div 
      className="w-[270px] rounded-[10px] p-[10px] border border-emerald-500 bg-white dark:bg-slate-900 shadow-sm select-none transition-shadow hover:shadow-md flex flex-col justify-between shrink-0"
      style={{ minHeight: '86px' }}
    >
      {/* Top Row: Status pill + Project key + OnlyCheck + Expand trigger */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusPill status={task.status} />
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {task.project || 'APEX'}
          </span>
          {isOnlyCheck && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-normal bg-rose-100 text-rose-600 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800">
              OnlyCheck
            </span>
          )}
        </div>

        {/* Expand / Collapse badge on Parent Card */}
        {isParent && (
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title={isExpanded ? 'Thu gọn task con' : 'Mở rộng task con'}
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>{childCount}</span>
          </button>
        )}
      </div>

      {/* Middle Row: Task Title (Chữ không đậm) */}
      <div className="text-[12px] font-medium uppercase text-slate-900 dark:text-white leading-tight line-clamp-2 my-1">
        {task.taskName || task.name}
      </div>

      {/* Bottom Row: User Name & Hours */}
      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800 font-normal">
        <span className="flex items-center gap-1.5 truncate max-w-[150px]">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
          <span className="truncate">{task.userName || 'Unassigned'}</span>
        </span>
        <span className="font-mono text-slate-700 dark:text-slate-300 shrink-0">
          <span>{complete.toFixed(1)}h</span> / {planned.toFixed(1)}h
        </span>
      </div>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT: ProjectTaskNetwork
// ==========================================
export default function ProjectTaskNetwork({
  tasks = [],
  dashboardProjects = [],
  dashboardUsers = [],
  getProjectColor,
  theme,
  initialProject = ''
}) {
  // Mode: 'tree' (Bảng Phân Cấp) | 'mindmap' (Sơ Đồ Mindmap)
  const [viewMode, setViewMode] = useState('mindmap');

  // Filters State
  const [selectedProject, setSelectedProject] = useState(initialProject || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Expand / Collapse State for Parent Nodes (Set of Parent Task IDs)
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Expand / Collapse State for Project Groups (Set of Project Keys)
  const [collapsedProjects, setCollapsedProjects] = useState(new Set());

  // Mindmap Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 30, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Project List for Dropdown
  const projectOptions = useMemo(() => {
    const set = new Set();
    tasks.forEach(t => {
      const p = (t.project || t.projectKey || '').trim().toUpperCase();
      if (p && p !== 'UNASSIGNED') set.add(p);
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Build Project Groups & Task Hierarchy
  const { projectGroups, totalTasksCount, rootsCount, childrenMap } = useMemo(() => {
    const tasksById = new Map();
    const childrenByParent = new Map();

    // 1. Filter tasks
    const filtered = tasks.filter(t => {
      if (!t) return false;
      const pKey = (t.project || '').trim().toUpperCase();
      if (selectedProject !== 'ALL' && pKey !== selectedProject) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (t.name || t.taskName || '').toLowerCase().includes(q);
        const matchUser = (t.userName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchUser) return false;
      }
      return true;
    });

    filtered.forEach(t => {
      tasksById.set(t.id, t);
      if (t.parent_id) {
        if (!childrenByParent.has(t.parent_id)) childrenByParent.set(t.parent_id, []);
        childrenByParent.get(t.parent_id).push(t);
      }
    });

    // 2. Group by Project
    const pMap = new Map();
    filtered.forEach(t => {
      const pKey = (t.project || t.projectKey || 'UNASSIGNED').trim().toUpperCase();
      if (!pMap.has(pKey)) {
        const color = (getProjectColor ? getProjectColor(pKey) : null) || '#6366f1';
        pMap.set(pKey, {
          key: pKey,
          color,
          roots: [],
          allTasks: []
        });
      }
      pMap.get(pKey).allTasks.push(t);
    });

    // 3. Populate roots per project
    let totalRoots = 0;
    pMap.forEach(group => {
      const groupTasksById = new Map(group.allTasks.map(t => [t.id, t]));
      group.roots = group.allTasks.filter(t => !t.parent_id || !groupTasksById.has(t.parent_id));
      totalRoots += group.roots.length;
    });

    const sortedGroups = Array.from(pMap.values()).sort((a, b) => a.key.localeCompare(b.key));

    return {
      projectGroups: sortedGroups,
      totalTasksCount: filtered.length,
      rootsCount: totalRoots,
      childrenMap: childrenByParent
    };
  }, [tasks, selectedProject, searchQuery, getProjectColor]);

  // Toggle Single Parent Task Expansion
  const toggleExpand = useCallback((id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Toggle Project Group Collapse
  const toggleProjectGroup = useCallback((pKey) => {
    setCollapsedProjects(prev => {
      const next = new Set(prev);
      if (next.has(pKey)) next.delete(pKey);
      else next.add(pKey);
      return next;
    });
  }, []);

  // Expand All
  const handleExpandAll = useCallback(() => {
    const allParentIds = new Set(Array.from(childrenMap.keys()));
    setExpandedIds(allParentIds);
    setCollapsedProjects(new Set());
  }, [childrenMap]);

  // Collapse All
  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  // Zoom Controls
  const handleZoomIn = () => setZoom(prev => Math.min(1.8, Number((prev + 0.1).toFixed(1))));
  const handleZoomOut = () => setZoom(prev => Math.max(0.4, Number((prev - 0.1).toFixed(1))));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 30, y: 30 });
  };

  // Pan Canvas Handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    // Bảng không bo góc (rounded-none)
    <div className="w-full h-full flex flex-col rounded-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-xs select-none">
      
      {/* ======================================================== */}
      {/* 1. TOP TOOLBAR & CONTROLS (Chữ không đậm, padding 10px)   */}
      {/* ======================================================== */}
      <div className="p-[10px] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-[10px]">
        
        {/* Left Section: Title + Stats */}
        <div className="flex items-center flex-wrap gap-2.5">
          <span className="text-[13px] font-medium uppercase tracking-wide text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            SƠ ĐỒ QUAN HỆ TASK & MINDMAP
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-normal bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50 uppercase">
            DEBUG MODE (SUPABASE ALL TASKS)
          </span>
          <span className="text-[12px] text-slate-600 dark:text-slate-400 font-normal">
            Tổng cộng: <span className="text-slate-900 dark:text-white font-mono">{totalTasksCount}</span> tasks
          </span>
          <span className="text-[12px] text-slate-600 dark:text-slate-400 font-normal">
            Nhánh gốc: <span className="text-slate-900 dark:text-white font-mono">{rootsCount}</span> roots
          </span>
        </div>

        {/* Right Section: View Switcher + Filters + Expand/Collapse + Zoom */}
        <div className="flex items-center flex-wrap gap-2">
          
          {/* View Switcher: Bảng Phân Cấp vs Sơ Đồ Mindmap */}
          <div className="flex items-center rounded-none p-0.5 bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-2.5 py-1 text-[12px] font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'tree'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListTree size={13} />
              <span>Bảng Phân Cấp (TreeView)</span>
            </button>
            <button
              onClick={() => setViewMode('mindmap')}
              className={`px-2.5 py-1 text-[12px] font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'mindmap'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Network size={13} />
              <span>Sơ Đồ Mindmap (Arrow Nodes)</span>
            </button>
          </div>

          {/* Project Filter Dropdown */}
          <div className="flex items-center gap-1 px-[10px] py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-[12px] font-normal text-slate-500 dark:text-slate-400">Dự án:</span>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="bg-transparent text-[12px] font-normal text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">Tất cả dự án</option>
              {projectOptions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-1.5 px-[10px] py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <Search size={12} className="text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm task..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-[12px] font-normal text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none w-28"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Expand / Collapse All */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExpandAll}
              className="px-[10px] py-1 text-[12px] font-normal bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
            >
              + Mở rộng tất cả
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-[10px] py-1 text-[12px] font-normal bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
            >
              - Thu gọn
            </button>
          </div>

          {/* Zoom Controls (for Mindmap) */}
          {viewMode === 'mindmap' && (
            <div className="flex items-center gap-1 px-[10px] py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-[12px] text-slate-500 font-normal">Thu phóng:</span>
              <button onClick={handleZoomOut} className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                <ZoomOut size={13} />
              </button>
              <button onClick={handleZoomReset} className="text-[11px] font-mono font-normal px-1 text-slate-700 dark:text-slate-200">
                {Math.round(zoom * 100)}%
              </button>
              <button onClick={handleZoomIn} className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                <ZoomIn size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. VIEW 1: BẢNG PHÂN CẤP (TREEVIEW - GROUP THEO DỰ ÁN)   */}
      {/* Chữ không đậm, Bảng không bo góc, Chữ cách vào 10px      */}
      {/* ======================================================== */}
      {viewMode === 'tree' && (
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-[12px] rounded-none">
            {/* Table Header (Chữ không đậm, cách lề 10px) */}
            <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium uppercase text-slate-600 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-[10px] w-[42%] font-medium">TÊN TASK / PHÂN CẤP (PARENT - CHILD)</th>
                <th className="py-2.5 px-[10px] w-[14%] font-medium">TRẠNG THÁI</th>
                <th className="py-2.5 px-[10px] w-[18%] font-medium">NGƯỜI THỰC HIỆN</th>
                <th className="py-2.5 px-[10px] w-[15%] font-medium">KẾ HOẠCH (START - END)</th>
                <th className="py-2.5 px-[10px] w-[7%] font-medium">SỐ GIỜ</th>
                <th className="py-2.5 px-[10px] w-[4%] font-medium">CHECK</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal text-slate-700 dark:text-slate-300">
              {projectGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-normal px-[10px]">
                    Không tìm thấy task nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                projectGroups.map(group => {
                  const isProjectCollapsed = collapsedProjects.has(group.key);

                  return (
                    <React.Fragment key={group.key}>
                      {/* --- GROUP THEO DỰ ÁN: Hàng Tiêu Đề Dự Án Đưa Ra Ngoài --- */}
                      <tr className="bg-slate-100/80 dark:bg-slate-900 border-t border-b border-slate-200 dark:border-slate-800">
                        <td colSpan={6} className="py-2 px-[10px]">
                          <button
                            onClick={() => toggleProjectGroup(group.key)}
                            className="flex items-center hover:opacity-80 transition-opacity"
                            style={{ gap: '10px' }}
                          >
                            {isProjectCollapsed ? (
                              <ChevronRight size={13} className="text-slate-500" />
                            ) : (
                              <ChevronDown size={13} className="text-slate-600 dark:text-slate-400" />
                            )}
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0" 
                              style={{ backgroundColor: group.color }} 
                            />
                            <span className="text-[12px] font-medium tracking-wide uppercase text-slate-900 dark:text-white">
                              {group.key}
                            </span>
                            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                              ({group.allTasks.length} tasks)
                            </span>
                          </button>
                        </td>
                      </tr>

                      {/* Danh sách Task thuộc Dự Án (Chỉ hiện khi group không bị collapse) */}
                      {!isProjectCollapsed && group.roots.map(root => {
                        const children = childrenMap.get(root.id) || [];
                        const hasChildren = children.length > 0;
                        const isExpanded = expandedIds.has(root.id);
                        const isOnlyCheckRoot = root.check_only || root.is_onlychecked || (root.name && String(root.name).trim().endsWith('_'));
                        const plannedH = Number(root.hours_planned) || 0;
                        const completeH = Number(root.hours_complete) || 0;

                        return (
                          <React.Fragment key={root.id}>
                            {/* Root Task Row (Chữ không đậm, padding 10px) */}
                            <tr 
                              className={`hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors ${
                                isExpanded ? 'bg-slate-50/50 dark:bg-slate-900/20' : ''
                              }`}
                            >
                              {/* Task Name & Chevron (Cách lề vào 10px) */}
                              <td className="py-2 px-[10px]">
                                <div className="flex items-center" style={{ gap: '10px' }}>
                                  {hasChildren ? (
                                    <button
                                      onClick={() => toggleExpand(root.id)}
                                      className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown size={13} className="text-slate-600 dark:text-slate-400" />
                                      ) : (
                                        <ChevronRight size={13} className="text-slate-400" />
                                      )}
                                      <span className="font-normal text-slate-900 dark:text-slate-100 uppercase">
                                        {root.taskName || root.name}
                                      </span>
                                      <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ml-1">
                                        {children.length} con
                                      </span>
                                    </button>
                                  ) : (
                                    <span className="font-normal text-slate-900 dark:text-slate-100 uppercase pl-[23px]">
                                      {root.taskName || root.name}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="py-2 px-[10px]">
                                <StatusPill status={root.status} />
                              </td>

                              {/* User */}
                              <td className="py-2 px-[10px]">
                                <span className="inline-flex items-center gap-1.5 font-normal">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                  <span>{root.userName || 'Unassigned'}</span>
                                </span>
                              </td>

                              {/* Plan Dates */}
                              <td className="py-2 px-[10px] text-slate-500 dark:text-slate-400 font-mono text-[11px] font-normal">
                                {formatPlanDate(root.planned_start || root.date_start, root.planned_end || root.date_end)}
                              </td>

                              {/* Hours */}
                              <td className="py-2 px-[10px] font-mono text-[11px] font-normal">
                                {completeH > 0 || plannedH > 0 ? `${completeH.toFixed(1)}h / ${plannedH.toFixed(1)}h` : '-'}
                              </td>

                              {/* Check */}
                              <td className="py-2 px-[10px]">
                                {isOnlyCheckRoot && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-normal bg-rose-100 text-rose-600 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800">
                                    OnlyCheck
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* Child Tasks Sub-rows (Thụt vào rõ ràng, Chữ không đậm) */}
                            {hasChildren && isExpanded && children.map(child => {
                              const childPlannedH = Number(child.hours_planned) || 0;
                              const childCompleteH = Number(child.hours_complete) || 0;
                              const isOnlyCheckChild = child.check_only || child.is_onlychecked || (child.name && String(child.name).trim().endsWith('_'));

                              return (
                                <tr 
                                  key={child.id}
                                  className="bg-slate-50/40 dark:bg-slate-900/20 hover:bg-slate-100/60 dark:hover:bg-slate-900/50 transition-colors"
                                >
                                  {/* Child Task Name (Thụt lề vào 34px, Chữ không đậm) */}
                                  <td className="py-1.5 px-[10px] pl-[34px]">
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400 dark:text-slate-600 font-mono text-[11px]">└─</span>
                                      <span className="font-normal text-slate-800 dark:text-slate-200">
                                        {child.taskName || child.name}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Status */}
                                  <td className="py-1.5 px-[10px]">
                                    <StatusPill status={child.status} />
                                  </td>

                                  {/* User */}
                                  <td className="py-1.5 px-[10px]">
                                    <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-normal">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                      <span>{child.userName || 'Unassigned'}</span>
                                    </span>
                                  </td>

                                  {/* Plan Dates */}
                                  <td className="py-1.5 px-[10px] text-slate-500 dark:text-slate-400 font-mono text-[11px] font-normal">
                                    {formatPlanDate(child.planned_start || child.date_start, child.planned_end || child.date_end)}
                                  </td>

                                  {/* Hours */}
                                  <td className="py-1.5 px-[10px] font-mono text-[11px] font-normal">
                                    {childCompleteH > 0 || childPlannedH > 0 ? `${childCompleteH.toFixed(1)}h / ${childPlannedH.toFixed(1)}h` : '-'}
                                  </td>

                                  {/* Check */}
                                  <td className="py-1.5 px-[10px]">
                                    {isOnlyCheckChild && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-normal bg-rose-100 text-rose-600 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800">
                                        OnlyCheck
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. VIEW 2: SƠ ĐỒ MINDMAP (ARROW NODES - GROUP DỰ ÁN)      */}
      {/* Thẻ card bo góc 10px, chữ cách vào 10px, chữ không đậm    */}
      {/* ======================================================== */}
      {viewMode === 'mindmap' && (
        <div 
          className="flex-1 w-full h-full relative overflow-hidden bg-slate-50 dark:bg-slate-950 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(148, 163, 184, 0.2) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        >
          {/* Draggable & Zoomable Canvas Content */}
          <div 
            className="absolute top-0 left-0 transition-transform origin-top-left"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
          >
            <div className="flex flex-col gap-10 p-6">
              {projectGroups.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-normal">
                  Không có dữ liệu task phù hợp với dự án đã chọn.
                </div>
              ) : (
                projectGroups.map(group => {
                  const isProjectCollapsed = collapsedProjects.has(group.key);

                  return (
                    <div key={group.key} className="flex flex-col gap-4">
                      {/* Tiêu đề nhóm dự án ngoài Mindmap (Chữ cách 10px, chữ ko đậm) */}
                      <div className="flex items-center gap-2.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                        <button
                          onClick={() => toggleProjectGroup(group.key)}
                          className="flex items-center hover:opacity-80 transition-opacity"
                          style={{ gap: '10px' }}
                        >
                          {isProjectCollapsed ? (
                            <ChevronRight size={14} className="text-slate-500" />
                          ) : (
                            <ChevronDown size={14} className="text-slate-600 dark:text-slate-400" />
                          )}
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: group.color }} 
                          />
                          <span className="text-[13px] font-medium tracking-wide uppercase text-slate-900 dark:text-white">
                            {group.key}
                          </span>
                          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                            ({group.allTasks.length} tasks)
                          </span>
                        </button>
                      </div>

                      {/* Danh sách Task Mindmap của Dự án */}
                      {!isProjectCollapsed && (
                        <div className="flex flex-col gap-8 pl-4">
                          {group.roots.map(root => {
                            const children = childrenMap.get(root.id) || [];
                            const hasChildren = children.length > 0;
                            const isExpanded = expandedIds.has(root.id);

                            const cardWidth = 270;
                            const cardHeight = 88;
                            const childGapY = 16;
                            const horizontalOffset = 100;

                            const totalChildHeight = hasChildren && isExpanded
                              ? children.length * cardHeight + (children.length - 1) * childGapY
                              : cardHeight;

                            const parentCenterY = cardHeight / 2;
                            const childStartY = Math.min(0, (cardHeight - totalChildHeight) / 2);

                            return (
                              <div key={root.id} className="relative flex items-center">
                                
                                {/* Parent Task Card (Bo góc 10px, padding 10px) */}
                                <div className="shrink-0 z-10">
                                  <MindmapCard 
                                    task={root} 
                                    isParent={hasChildren}
                                    childCount={children.length}
                                    isExpanded={isExpanded}
                                    onToggleExpand={() => toggleExpand(root.id)}
                                  />
                                </div>

                                {/* SVG Curved Connection Lines (Green curved arrows) */}
                                {hasChildren && isExpanded && (
                                  <>
                                    <svg 
                                      className="absolute pointer-events-none overflow-visible"
                                      style={{
                                        left: cardWidth,
                                        top: 0,
                                        width: horizontalOffset,
                                        height: totalChildHeight
                                      }}
                                    >
                                      <defs>
                                        <marker 
                                          id={`arrowhead-${root.id}`}
                                          markerWidth="8" 
                                          markerHeight="6" 
                                          refX="7" 
                                          refY="3" 
                                          orient="auto"
                                        >
                                          <polygon points="0 0, 8 3, 0 6" fill="#16a34a" />
                                        </marker>
                                      </defs>

                                      {children.map((child, idx) => {
                                        const startX = 0;
                                        const startY = parentCenterY;
                                        const targetX = horizontalOffset;
                                        const targetY = childStartY + idx * (cardHeight + childGapY) + cardHeight / 2;

                                        const controlOffset = horizontalOffset * 0.55;
                                        const pathData = `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`;

                                        return (
                                          <path
                                            key={child.id}
                                            d={pathData}
                                            fill="none"
                                            stroke="#16a34a"
                                            strokeWidth="2.2"
                                            strokeLinecap="round"
                                            markerEnd={`url(#arrowhead-${root.id})`}
                                          />
                                        );
                                      })}
                                    </svg>

                                    {/* Child Task Cards Stack on Right */}
                                    <div 
                                      className="flex flex-col z-10"
                                      style={{ 
                                        marginLeft: `${horizontalOffset}px`,
                                        gap: `${childGapY}px`
                                      }}
                                    >
                                      {children.map(child => (
                                        <MindmapCard 
                                          key={child.id}
                                          task={child}
                                          isParent={false}
                                          childCount={0}
                                          isExpanded={false}
                                          onToggleExpand={() => {}}
                                        />
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
