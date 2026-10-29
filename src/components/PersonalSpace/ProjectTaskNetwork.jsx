import React, { useState, useMemo, useRef, useCallback } from 'react';
import { 
  FolderGit2, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  GitFork,
  Network,
  ListTree,
  User,
  CheckCircle2,
  Clock,
  Sparkles,
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
// HELPER: STATUS PILL BADGE
// ==========================================
const StatusPill = ({ status }) => {
  const s = Number(status);
  if (s >= 4) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-600 shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Completed
      </span>
    );
  }
  if (s === 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-600 shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
        Checked
      </span>
    );
  }
  if (s === 1 || s === 2) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-600 shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-600 shadow-xs">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      New
    </span>
  );
};

// ==========================================
// HELPER: MINDMAP CARD COMPONENT
// Bo góc 10px, chữ cách vào 10px (p-[10px], rounded-[10px])
// ==========================================
const MindmapCard = ({ task, isParent, childCount, isExpanded, onToggleExpand }) => {
  const planned = Number(task.hours_planned) || 0;
  const complete = Number(task.hours_complete) || 0;
  const isOnlyCheck = task.check_only || task.is_onlychecked || (task.name && String(task.name).trim().endsWith('_'));

  return (
    <div 
      className="w-[270px] rounded-[10px] p-[10px] border-2 border-emerald-500 bg-white dark:bg-slate-900 shadow-md select-none transition-shadow hover:shadow-lg flex flex-col justify-between shrink-0"
      style={{ minHeight: '86px' }}
    >
      {/* Top Row: Status pill + Project key + OnlyCheck + Expand trigger */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusPill status={task.status} />
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
            {task.project || 'APEX'}
          </span>
          {isOnlyCheck && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-600 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800">
              OnlyCheck
            </span>
          )}
        </div>

        {/* Expand / Collapse badge on Parent Card */}
        {isParent && (
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title={isExpanded ? 'Thu gọn task con' : 'Mở rộng task con'}
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>{childCount}</span>
          </button>
        )}
      </div>

      {/* Middle Row: Task Title */}
      <div className="text-[12px] font-black uppercase text-slate-900 dark:text-white leading-tight line-clamp-2 my-1">
        {task.taskName || task.name}
      </div>

      {/* Bottom Row: User Name & Hours */}
      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800 font-medium">
        <span className="flex items-center gap-1 truncate max-w-[150px]">
          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
          <span className="truncate">{task.userName || 'Unassigned'}</span>
        </span>
        <span className="font-mono text-slate-700 dark:text-slate-200 shrink-0">
          <b>{complete.toFixed(1)}h</b> / {planned.toFixed(1)}h
        </span>
      </div>
    </div>
  );
};

// ==========================================
// 3. MAIN COMPONENT: ProjectTaskNetwork
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

  // Mindmap Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
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

  // Build Hierarchy Tree Structure: Roots and Children
  const { roots, childrenMap, totalTasksCount, rootsCount } = useMemo(() => {
    const tasksById = new Map();
    const childrenByParent = new Map();

    // Filter tasks by project and search query
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

    // Root tasks are those without parent_id OR whose parent_id is not in current dataset
    const rootList = filtered.filter(t => !t.parent_id || !tasksById.has(t.parent_id));

    return {
      roots: rootList,
      childrenMap: childrenByParent,
      totalTasksCount: filtered.length,
      rootsCount: rootList.length
    };
  }, [tasks, selectedProject, searchQuery]);

  // Toggle Single Parent Expansion
  const toggleExpand = useCallback((id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Expand All
  const handleExpandAll = useCallback(() => {
    const allParentIds = new Set(Array.from(childrenMap.keys()));
    setExpandedIds(allParentIds);
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
    setPan({ x: 40, y: 40 });
  };

  // Pan Canvas Handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left mouse drag
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
    <div className="w-full h-full flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm select-none">
      
      {/* ======================================================== */}
      {/* 1. TOP TOOLBAR & CONTROLS (Exact layout from user image) */}
      {/* ======================================================== */}
      <div className="p-[10px] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-[10px]">
        
        {/* Left Section: Title + Debug Badge + Stats */}
        <div className="flex items-center flex-wrap gap-2.5">
          <span className="text-[13px] font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
            SƠ ĐỒ QUAN HỆ TASK & MINDMAP
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50 uppercase">
            DEBUG MODE (SUPABASE ALL TASKS)
          </span>
          <span className="text-[12px] text-slate-600 dark:text-slate-400 font-medium">
            Tổng cộng: <b className="text-slate-900 dark:text-white font-mono">{totalTasksCount}</b> tasks
          </span>
          <span className="text-[12px] text-slate-600 dark:text-slate-400 font-medium">
            Nhánh gốc: <b className="text-slate-900 dark:text-white font-mono">{rootsCount}</b> roots
          </span>
        </div>

        {/* Right Section: View Switcher + Project Filter + Expand/Collapse + Zoom */}
        <div className="flex items-center flex-wrap gap-2">
          
          {/* View Switcher: Bảng Phân Cấp vs Sơ Đồ Mindmap */}
          <div className="flex items-center rounded-xl p-0.5 bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-2.5 py-1 rounded-lg text-[12px] font-bold flex items-center gap-1.5 transition-all ${
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
              className={`px-2.5 py-1 rounded-lg text-[12px] font-bold flex items-center gap-1.5 transition-all ${
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
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Dự án:</span>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="bg-transparent text-[12px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">Tất cả dự án</option>
              {projectOptions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <Search size={12} className="text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm task..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-[12px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none w-28"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Expand / Collapse All Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExpandAll}
              className="px-2 py-1 rounded-xl text-[12px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
            >
              + Mở rộng tất cả
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-2 py-1 rounded-xl text-[12px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
            >
              - Thu gọn
            </button>
          </div>

          {/* Zoom Controls (for Mindmap) */}
          {viewMode === 'mindmap' && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-[12px] text-slate-500 font-medium">Thu phóng:</span>
              <button onClick={handleZoomOut} className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                <ZoomOut size={13} />
              </button>
              <button onClick={handleZoomReset} className="text-[11px] font-mono font-bold px-1 text-slate-700 dark:text-slate-200">
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
      {/* 2. VIEW 1: BẢNG PHÂN CẤP (TREEVIEW)                      */}
      {/* ======================================================== */}
      {viewMode === 'tree' && (
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-[12px]">
            {/* Table Header */}
            <thead className="sticky top-0 z-10 bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-600 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-3 w-[36%]">TÊN TASK / PHÂN CẤP (PARENT - CHILD)</th>
                <th className="py-2.5 px-3 w-[12%]">TRẠNG THÁI</th>
                <th className="py-2.5 px-3 w-[13%]">DỰ ÁN</th>
                <th className="py-2.5 px-3 w-[13%]">NGƯỜI THỰC HIỆN</th>
                <th className="py-2.5 px-3 w-[14%]">KẾ HOẠCH (START - END)</th>
                <th className="py-2.5 px-3 w-[8%]">SỐ GIỜ</th>
                <th className="py-2.5 px-3 w-[4%]">CHECK</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-800 dark:text-slate-200">
              {roots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Không tìm thấy task nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                roots.map(root => {
                  const children = childrenMap.get(root.id) || [];
                  const hasChildren = children.length > 0;
                  const isExpanded = expandedIds.has(root.id);
                  const isOnlyCheckRoot = root.check_only || root.is_onlychecked || (root.name && String(root.name).trim().endsWith('_'));
                  const plannedH = Number(root.hours_planned) || 0;
                  const completeH = Number(root.hours_complete) || 0;

                  return (
                    <React.Fragment key={root.id}>
                      {/* Root Task Row */}
                      <tr 
                        className={`hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors ${
                          isExpanded ? 'bg-slate-50/70 dark:bg-slate-900/30' : ''
                        }`}
                      >
                        {/* Name & Chevron */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            {hasChildren ? (
                              <button
                                onClick={() => toggleExpand(root.id)}
                                className="flex items-center gap-1.5 font-bold hover:text-emerald-600 transition-colors"
                              >
                                {isExpanded ? <ChevronDown size={14} className="text-slate-700 dark:text-slate-300" /> : <ChevronRight size={14} className="text-slate-400" />}
                                <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                  {root.taskName || root.name}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ml-1">
                                  {children.length} con
                                </span>
                              </button>
                            ) : (
                              <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight pl-5">
                                {root.taskName || root.name}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-2 px-3">
                          <StatusPill status={root.status} />
                        </td>

                        {/* Project */}
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100 uppercase">
                          {root.project || '-'}
                        </td>

                        {/* User */}
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <span>{root.userName || 'Unassigned'}</span>
                          </span>
                        </td>

                        {/* Plan Dates */}
                        <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {formatPlanDate(root.planned_start || root.date_start, root.planned_end || root.date_end)}
                        </td>

                        {/* Hours */}
                        <td className="py-2 px-3 font-mono text-[11px]">
                          {completeH > 0 || plannedH > 0 ? `${completeH.toFixed(1)}h / ${plannedH.toFixed(1)}h` : '-'}
                        </td>

                        {/* Check */}
                        <td className="py-2 px-3">
                          {isOnlyCheckRoot && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-600 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800">
                              OnlyCheck
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Child Tasks Sub-rows (Indented) */}
                      {hasChildren && isExpanded && children.map(child => {
                        const childPlannedH = Number(child.hours_planned) || 0;
                        const childCompleteH = Number(child.hours_complete) || 0;
                        const isOnlyCheckChild = child.check_only || child.is_onlychecked || (child.name && String(child.name).trim().endsWith('_'));

                        return (
                          <tr 
                            key={child.id}
                            className="bg-slate-50/40 dark:bg-slate-900/20 hover:bg-slate-100/60 dark:hover:bg-slate-900/60 transition-colors"
                          >
                            {/* Child Task Name Indented */}
                            <td className="py-1.5 px-3 pl-9">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-300 dark:text-slate-600 font-mono text-[11px]">└─</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {child.taskName || child.name}
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-1.5 px-3">
                              <StatusPill status={child.status} />
                            </td>

                            {/* Project */}
                            <td className="py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-300 uppercase">
                              {child.project || '-'}
                            </td>

                            {/* User */}
                            <td className="py-1.5 px-3">
                              <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                <span>{child.userName || 'Unassigned'}</span>
                              </span>
                            </td>

                            {/* Plan Dates */}
                            <td className="py-1.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                              {formatPlanDate(child.planned_start || child.date_start, child.planned_end || child.date_end)}
                            </td>

                            {/* Hours */}
                            <td className="py-1.5 px-3 font-mono text-[11px]">
                              {childCompleteH > 0 || childPlannedH > 0 ? `${childCompleteH.toFixed(1)}h / ${childPlannedH.toFixed(1)}h` : '-'}
                            </td>

                            {/* Check */}
                            <td className="py-1.5 px-3">
                              {isOnlyCheckChild && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-600 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800">
                                  OnlyCheck
                                </span>
                              )}
                            </td>
                          </tr>
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
      {/* 3. VIEW 2: SƠ ĐỒ MINDMAP (ARROW NODES)                   */}
      {/* Exact layout as Image 2 & 3: Cards with green curved SVG */}
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
            <div className="flex flex-col gap-8 p-6">
              {roots.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-medium">
                  Không có dữ liệu task phù hợp với dự án đã chọn.
                </div>
              ) : (
                roots.map(root => {
                  const children = childrenMap.get(root.id) || [];
                  const hasChildren = children.length > 0;
                  const isExpanded = expandedIds.has(root.id);

                  // Card dimensions & spacing for SVG curved lines calculation
                  const cardWidth = 270;
                  const cardHeight = 88;
                  const childGapY = 16;
                  const horizontalOffset = 100; // Distance between parent right edge and children left edge

                  // Calculate total height of child stack
                  const totalChildHeight = hasChildren && isExpanded
                    ? children.length * cardHeight + (children.length - 1) * childGapY
                    : cardHeight;

                  // Center children vertically with respect to parent
                  const parentCenterY = cardHeight / 2;
                  const childStartY = Math.min(0, (cardHeight - totalChildHeight) / 2);

                  return (
                    <div key={root.id} className="relative flex items-center">
                      
                      {/* Parent Task Card */}
                      <div className="shrink-0 z-10">
                        <MindmapCard 
                          task={root} 
                          isParent={hasChildren}
                          childCount={children.length}
                          isExpanded={isExpanded}
                          onToggleExpand={() => toggleExpand(root.id)}
                        />
                      </div>

                      {/* SVG Curved Connection Lines (Green curved arrows as in user images) */}
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

                              // Smooth Cubic Bezier Curve from parent right to child left
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
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
