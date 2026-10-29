import React, { useState, useMemo, useRef, useCallback } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  ZoomIn, 
  ZoomOut, 
  Network, 
  ListTree
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
// Bo góc 10px, chữ cách vào 10px (style={{ padding: '10px', borderRadius: '10px' }})
// ==========================================
const MindmapCard = ({ task, isParent, childCount, isExpanded, onToggleExpand }) => {
  const planned = Number(task.hours_planned) || 0;
  const complete = Number(task.hours_complete) || 0;
  const isOnlyCheck = task.check_only || task.is_onlychecked || (task.name && String(task.name).trim().endsWith('_'));

  return (
    <div 
      className="w-[270px] border border-emerald-500 bg-white dark:bg-slate-900 shadow-sm select-none transition-shadow hover:shadow-md flex flex-col justify-between shrink-0"
      style={{ 
        minHeight: '86px',
        borderRadius: '10px',
        padding: '10px'
      }}
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

        {/* Expand / Collapse badge on Parent Card (iOS Pill Style) */}
        {isParent && (
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-95 transition-all cursor-pointer shadow-2xs"
            title={isExpanded ? 'Thu gọn task con' : 'Mở rộng task con'}
          >
            {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
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
  tasks = [], // Filtered directly by the Personal Space Filter Bar (Team, Projects, Members, Date, Search)
  allTasks = [],
  dashboardProjects = [],
  dashboardUsers = [],
  getProjectColor,
  theme
}) {
  // Mode: 'tree' (TREEVIEW) | 'mindmap' (MINDMAP)
  const [viewMode, setViewMode] = useState('mindmap');

  // Expand / Collapse State for Parent Nodes (Set of Parent Task IDs)
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Expand / Collapse State for Project Groups (Set of Project Keys)
  const [collapsedProjects, setCollapsedProjects] = useState(new Set());

  // Mindmap Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 30, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Build Project Groups & Task Hierarchy from the Filtered Tasks (tasks)
  const { projectGroups, totalTasksCount, rootsCount, childrenMap } = useMemo(() => {
    const tasksById = new Map();
    const childrenByParent = new Map();

    const taskList = tasks || [];
    taskList.forEach(t => {
      if (!t) return;
      tasksById.set(t.id, t);
      if (t.parent_id) {
        if (!childrenByParent.has(t.parent_id)) childrenByParent.set(t.parent_id, []);
        childrenByParent.get(t.parent_id).push(t);
      }
    });

    // Group by Project
    const pMap = new Map();
    taskList.forEach(t => {
      if (!t) return;
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

    // Populate roots for each project
    let totalRoots = 0;
    pMap.forEach(group => {
      const groupTasksById = new Map(group.allTasks.map(t => [t.id, t]));
      group.roots = group.allTasks.filter(t => !t.parent_id || !groupTasksById.has(t.parent_id));
      totalRoots += group.roots.length;
    });

    const sortedGroups = Array.from(pMap.values()).sort((a, b) => a.key.localeCompare(b.key));

    return {
      projectGroups: sortedGroups,
      totalTasksCount: taskList.length,
      rootsCount: totalRoots,
      childrenMap: childrenByParent
    };
  }, [tasks, getProjectColor]);

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
    // Bảng không bo góc (borderRadius: 0), có viền rõ ràng
    <div 
      className="w-full h-full flex flex-col border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-xs select-none"
      style={{ borderRadius: '0px' }}
    >
      
      {/* ======================================================== */}
      {/* 1. TOP TOOLBAR: CÁC NÚT CHỨC NĂNG PHONG CÁCH IPHONE (iOS) */}
      {/* ======================================================== */}
      <div 
        className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-[10px]"
        style={{ padding: '10px 16px' }}
      >
        
        {/* Left Section: Title + Stats Badges (iOS Style) */}
        <div className="flex items-center flex-wrap gap-2.5">
          <span className="text-[13px] font-medium uppercase tracking-wide text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            SƠ ĐỒ QUAN HỆ TASK & MINDMAP
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-normal bg-slate-200/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-black/5 dark:border-white/10 shadow-2xs">
            Tổng cộng: <span className="font-mono font-medium text-slate-900 dark:text-white">{totalTasksCount}</span> tasks
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-normal bg-slate-200/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-black/5 dark:border-white/10 shadow-2xs">
            Nhánh gốc: <span className="font-mono font-medium text-slate-900 dark:text-white">{rootsCount}</span> roots
          </span>
        </div>

        {/* Right Section: CÁC NÚT CHỨC NĂNG GIỐNG IPHONE */}
        <div className="flex items-center flex-wrap gap-2.5">
          
          {/* iOS Segmented Control: TREEVIEW / MINDMAP */}
          <div className="inline-flex items-center p-[3px] rounded-full bg-slate-200/80 dark:bg-slate-800/90 border border-black/5 dark:border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3.5 py-1 rounded-full text-[12px] font-medium flex items-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer ${
                viewMode === 'tree'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-[0_2px_6px_rgba(0,0,0,0.12)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListTree size={13} />
              <span>TREEVIEW</span>
            </button>
            <button
              onClick={() => setViewMode('mindmap')}
              className={`px-3.5 py-1 rounded-full text-[12px] font-medium flex items-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer ${
                viewMode === 'mindmap'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-[0_2px_6px_rgba(0,0,0,0.12)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Network size={13} />
              <span>MINDMAP</span>
            </button>
          </div>

          {/* iOS Pill Buttons: + Mở rộng tất cả / - Thu gọn */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExpandAll}
              className="px-3.5 py-1 rounded-full text-[12px] font-medium bg-slate-200/70 dark:bg-slate-800/80 hover:bg-slate-300/80 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-black/5 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:scale-95 transition-all duration-150 cursor-pointer"
            >
              + Mở rộng tất cả
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-3.5 py-1 rounded-full text-[12px] font-medium bg-slate-200/70 dark:bg-slate-800/80 hover:bg-slate-300/80 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-black/5 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:scale-95 transition-all duration-150 cursor-pointer"
            >
              - Thu gọn
            </button>
          </div>

          {/* iOS Zoom Segmented Control (chỉ hiện khi xem Mindmap) */}
          {viewMode === 'mindmap' && (
            <div className="inline-flex items-center p-[3px] rounded-full bg-slate-200/80 dark:bg-slate-800/90 border border-black/5 dark:border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]">
              <button 
                onClick={handleZoomOut} 
                title="Thu nhỏ"
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-90 transition-all cursor-pointer shadow-2xs"
              >
                <ZoomOut size={13} />
              </button>
              <button 
                onClick={handleZoomReset} 
                title="Đặt lại 100%"
                className="px-2 text-[11px] font-mono font-medium text-slate-800 dark:text-slate-200 cursor-pointer hover:underline"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button 
                onClick={handleZoomIn} 
                title="Phóng to"
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-90 transition-all cursor-pointer shadow-2xs"
              >
                <ZoomIn size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. VIEW 1: BẢNG PHÂN CẤP (TREEVIEW - GROUP THEO DỰ ÁN)   */}
      {/* Bảng không bo góc, chữ cách lề 16px, không bị dính mép  */}
      {/* ======================================================== */}
      {viewMode === 'tree' && (
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-[12px]" style={{ borderRadius: '0px' }}>
            {/* Table Header (Chữ cách lề 16px, font-medium) */}
            <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium uppercase text-slate-600 dark:text-slate-400">
              <tr>
                <th style={{ padding: '10px 12px 10px 16px', width: '42%' }}>TÊN TASK / PHÂN CẤP (PARENT - CHILD)</th>
                <th style={{ padding: '10px 12px', width: '14%' }}>TRẠNG THÁI</th>
                <th style={{ padding: '10px 12px', width: '18%' }}>NGƯỜI THỰC HIỆN</th>
                <th style={{ padding: '10px 12px', width: '15%' }}>KẾ HOẠCH (START - END)</th>
                <th style={{ padding: '10px 12px', width: '7%' }}>SỐ GIỜ</th>
                <th style={{ padding: '10px 12px', width: '4%' }}>CHECK</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal text-slate-700 dark:text-slate-300">
              {projectGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-normal" style={{ padding: '24px 16px' }}>
                    Không tìm thấy task nào phù hợp bộ lọc đang chọn trên thanh điều khiển.
                  </td>
                </tr>
              ) : (
                projectGroups.map(group => {
                  const isProjectCollapsed = collapsedProjects.has(group.key);

                  return (
                    <React.Fragment key={group.key}>
                      {/* --- GROUP THEO DỰ ÁN: Hàng Tiêu Đề Dự Án Đưa Ra Ngoài (Cách lề 16px) --- */}
                      <tr className="bg-slate-100/80 dark:bg-slate-900 border-t border-b border-slate-200 dark:border-slate-800">
                        <td colSpan={6} style={{ padding: '8px 16px' }}>
                          <button
                            onClick={() => toggleProjectGroup(group.key)}
                            className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
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
                            {/* Root Task Row (Cách lề vào 16px, không bị dính mép) */}
                            <tr 
                              className={`hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors ${
                                isExpanded ? 'bg-slate-50/50 dark:bg-slate-900/20' : ''
                              }`}
                            >
                              {/* Task Name & Chevron (Cách lề 16px nếu có con, 38px nếu standalone) */}
                              <td style={{ padding: '8px 12px 8px 16px' }}>
                                <div className="flex items-center" style={{ gap: '8px' }}>
                                  {hasChildren ? (
                                    <button
                                      onClick={() => toggleExpand(root.id)}
                                      className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors cursor-pointer"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown size={13} className="text-slate-600 dark:text-slate-400" />
                                      ) : (
                                        <ChevronRight size={13} className="text-slate-400" />
                                      )}
                                      <span className="font-normal text-slate-900 dark:text-slate-100 uppercase">
                                        {root.taskName || root.name}
                                      </span>
                                      <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ml-1">
                                        {children.length} con
                                      </span>
                                    </button>
                                  ) : (
                                    // Task gốc đứng một mình: thụt lề 22px để thẳng hàng với text của task cha
                                    <span 
                                      className="font-normal text-slate-900 dark:text-slate-100 uppercase"
                                      style={{ paddingLeft: '22px' }}
                                    >
                                      {root.taskName || root.name}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Status */}
                              <td style={{ padding: '8px 12px' }}>
                                <StatusPill status={root.status} />
                              </td>

                              {/* User */}
                              <td style={{ padding: '8px 12px' }}>
                                <span className="inline-flex items-center gap-1.5 font-normal">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                  <span>{root.userName || 'Unassigned'}</span>
                                </span>
                              </td>

                              {/* Plan Dates */}
                              <td style={{ padding: '8px 12px' }} className="text-slate-500 dark:text-slate-400 font-mono text-[11px] font-normal">
                                {formatPlanDate(root.planned_start || root.date_start, root.planned_end || root.date_end)}
                              </td>

                              {/* Hours */}
                              <td style={{ padding: '8px 12px' }} className="font-mono text-[11px] font-normal">
                                {completeH > 0 || plannedH > 0 ? `${completeH.toFixed(1)}h / ${plannedH.toFixed(1)}h` : '-'}
                              </td>

                              {/* Check */}
                              <td style={{ padding: '8px 12px' }}>
                                {isOnlyCheckRoot && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-rose-100 text-rose-600 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800">
                                    OnlyCheck
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* Child Tasks Sub-rows (Thụt lề vào 46px rõ ràng) */}
                            {hasChildren && isExpanded && children.map(child => {
                              const childPlannedH = Number(child.hours_planned) || 0;
                              const childCompleteH = Number(child.hours_complete) || 0;
                              const isOnlyCheckChild = child.check_only || child.is_onlychecked || (child.name && String(child.name).trim().endsWith('_'));

                              return (
                                <tr 
                                  key={child.id}
                                  className="bg-slate-50/40 dark:bg-slate-900/20 hover:bg-slate-100/60 dark:hover:bg-slate-900/50 transition-colors"
                                >
                                  {/* Child Task Name (Thụt lề vào 46px) */}
                                  <td style={{ padding: '6px 12px 6px 46px' }}>
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400 dark:text-slate-600 font-mono text-[11px]">└─</span>
                                      <span className="font-normal text-slate-800 dark:text-slate-200">
                                        {child.taskName || child.name}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Status */}
                                  <td style={{ padding: '6px 12px' }}>
                                    <StatusPill status={child.status} />
                                  </td>

                                  {/* User */}
                                  <td style={{ padding: '6px 12px' }}>
                                    <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-normal">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                      <span>{child.userName || 'Unassigned'}</span>
                                    </span>
                                  </td>

                                  {/* Plan Dates */}
                                  <td style={{ padding: '6px 12px' }} className="text-slate-500 dark:text-slate-400 font-mono text-[11px] font-normal">
                                    {formatPlanDate(child.planned_start || child.date_start, child.planned_end || child.date_end)}
                                  </td>

                                  {/* Hours */}
                                  <td style={{ padding: '6px 12px' }} className="font-mono text-[11px] font-normal">
                                    {childCompleteH > 0 || childPlannedH > 0 ? `${childCompleteH.toFixed(1)}h / ${childPlannedH.toFixed(1)}h` : '-'}
                                  </td>

                                  {/* Check */}
                                  <td style={{ padding: '6px 12px' }}>
                                    {isOnlyCheckChild && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-rose-100 text-rose-600 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800">
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
      {/* Thẻ card bo góc 10px, padding 10px, chữ không đậm         */}
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
            <div className="flex flex-col gap-10" style={{ padding: '24px 30px' }}>
              {projectGroups.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-normal">
                  Không có dữ liệu task phù hợp với bộ lọc đang chọn trên thanh điều khiển.
                </div>
              ) : (
                projectGroups.map(group => {
                  const isProjectCollapsed = collapsedProjects.has(group.key);

                  return (
                    <div key={group.key} className="flex flex-col gap-4">
                      {/* Tiêu đề nhóm dự án ngoài Mindmap (Cách lề 16px, chữ ko đậm) */}
                      <div className="flex items-center gap-2.5 pb-1 border-b border-slate-200 dark:border-slate-800" style={{ paddingLeft: '8px' }}>
                        <button
                          onClick={() => toggleProjectGroup(group.key)}
                          className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
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
                        <div className="flex flex-col gap-8" style={{ paddingLeft: '16px' }}>
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
