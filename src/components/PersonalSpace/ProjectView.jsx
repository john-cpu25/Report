import React, { useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import { ChevronRight, ChevronDown, Layers, ArrowUpDown } from 'lucide-react';

const TEAM_COLUMNS = [
  {
    id: 'slab',
    title: 'Slab Design',
    sub: 'Number of hours',
    headerBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    headerStyle: { backgroundColor: '#E2EFDA' },
    badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    color: '#10b981'
  },
  {
    id: 'pt',
    title: 'PT&Reo',
    sub: 'Number of hours',
    headerBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    headerStyle: { backgroundColor: '#FCE4D6' },
    badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    color: '#f59e0b'
  },
  {
    id: 'modelling',
    title: 'Modelling',
    sub: 'Number of hours',
    headerBg: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
    headerStyle: { backgroundColor: '#DDEBF7' },
    badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
    color: '#0284c7'
  },
  {
    id: 'lateral',
    title: 'Lateral Design',
    sub: 'Number of hours',
    headerBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
    headerStyle: { backgroundColor: '#E8D7F1' },
    badgeBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
    color: '#8b5cf6'
  }
];

function classifyTaskTeam(rawTeam, taskName) {
  const t = (rawTeam || '').toUpperCase().trim();
  const n = (taskName || '').toUpperCase().trim();

  if (t === 'ENGINEER' || t.includes('SLAB') || t.includes('STR')) return 'slab';
  if (t === 'PT&REO' || t.includes('PT') || t.includes('REO')) return 'pt';
  if (t === 'MODELLING' || t.includes('MODEL') || t.includes('BIM')) return 'modelling';
  if (t === 'ETABS' || t.includes('LATERAL')) return 'lateral';

  // Fallback by task name keywords
  if (n.includes('PT') || n.includes('REO')) return 'pt';
  if (n.includes('ETABS') || n.includes('LATERAL') || n.includes('WIND') || n.includes('STEEL')) return 'lateral';
  if (n.includes('MODEL') || n.includes('REVIT') || n.includes('DRAWING') || n.includes('GA ')) return 'modelling';
  if (n.includes('DESIGN') || n.includes('CONCEPT') || n.includes('CALC') || n.includes('SLAB')) return 'slab';

  return 'other';
}

const TEAM_CONFIG_MAP = {
  slab: {
    title: 'Slab Design',
    badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
    hoursColor: 'text-emerald-600 dark:text-emerald-400'
  },
  pt: {
    title: 'PT&Reo',
    badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30',
    hoursColor: 'text-amber-600 dark:text-amber-400'
  },
  modelling: {
    title: 'Modelling',
    badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30',
    hoursColor: 'text-sky-600 dark:text-sky-400'
  },
  lateral: {
    title: 'Lateral Design',
    badgeBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30',
    hoursColor: 'text-purple-600 dark:text-purple-400'
  },
  other: {
    title: 'Other',
    badgeBg: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border border-slate-500/30',
    hoursColor: 'text-slate-600 dark:text-slate-400'
  }
};

const ProjectView = forwardRef(({
  filteredData = [],
  analystTasks = [],
  dashboardProjects = [],
  getProjectColor = () => '#6366f1',
  selectedTimeMetric = 't2',
  timeRange = 'week',
  currentDate = new Date(),
  searchQuery = ''
}, ref) => {
  const metricMode = selectedTimeMetric === 't1' ? 'plan' : 'user';
  const [sortKey, setSortKey] = useState('no'); // 'no' | 'key' | 'name' | 'slab' | 'pt' | 'modelling' | 'lateral' | 'total'
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'
  const [expandedRow, setExpandedRow] = useState(null);

  // 1. Tạo từ điển tra cứu Project Name và Key từ dashboardProjects
  const projectLookup = useMemo(() => {
    const byId = {};
    const byKey = {};
    const byName = {};

    (dashboardProjects || []).forEach(p => {
      if (p.id) byId[p.id] = p;
      if (p.key) byKey[p.key.trim().toUpperCase()] = p;
      if (p.name) byName[p.name.trim().toUpperCase()] = p;
    });

    return { byId, byKey, byName };
  }, [dashboardProjects]);

  // 2. Base tasks directly from filteredData (driven by top-bar date/week/year picker)
  const baseTasks = useMemo(() => {
    return filteredData || [];
  }, [filteredData]);

  // 3. Tổng hợp dữ liệu theo Project (chỉ 4 team kỹ thuật chính: Slab, PT&Reo, Modelling, Lateral)
  const { projectRows, totals } = useMemo(() => {
    const summaryMap = {};

    baseTasks.forEach(task => {
      // Xác định team của task
      const teamId = classifyTaskTeam(task.team, task.taskName || task.name);
      if (teamId === 'other') return; // Loại bỏ hoàn toàn data other

      // Xác định project key & project name
      let projRecord = null;
      if (task.project_id && projectLookup.byId[task.project_id]) {
        projRecord = projectLookup.byId[task.project_id];
      }

      const candidateKey = (task.project || (task.name || '').split(':')[0] || '').trim().toUpperCase();
      if (!projRecord && projectLookup.byKey[candidateKey]) {
        projRecord = projectLookup.byKey[candidateKey];
      }

      const pKey = projRecord ? projRecord.key : (candidateKey || 'UNASSIGNED');
      const pName = projRecord?.name ? projRecord.name : (task.projectName || '');
      const pColor = projRecord?.color || getProjectColor(pKey);

      if (!summaryMap[pKey]) {
        summaryMap[pKey] = {
          key: pKey,
          name: pName,
          color: pColor,
          slabHours: 0,
          ptHours: 0,
          modellingHours: 0,
          lateralHours: 0,
          totalHours: 0,
          tasks: []
        };
      }

      // Xác định số giờ theo metric đang chọn
      let hours = 0;
      if (metricMode === 'plan') {
        hours = Number(task.hours_planned) || (Number(task.t1) ? task.t1 / 3600 : 0);
      } else {
        hours = Number(task.hours_complete) || Number(task.hours_planned) || (Number(task.t2) ? task.t2 / 3600 : 0);
      }

      if (teamId === 'slab') summaryMap[pKey].slabHours += hours;
      else if (teamId === 'pt') summaryMap[pKey].ptHours += hours;
      else if (teamId === 'modelling') summaryMap[pKey].modellingHours += hours;
      else if (teamId === 'lateral') summaryMap[pKey].lateralHours += hours;

      summaryMap[pKey].totalHours += hours;
      summaryMap[pKey].tasks.push({
        id: task.id,
        name: task.taskName || task.name || 'Untitled Task',
        user: task.userName || task.createdBy || 'Unknown',
        team: task.team || 'Unassigned',
        teamId,
        hours
      });
    });

    // Chuyển thành mảng
    let rows = Object.values(summaryMap);

    // Tính tổng cộng toàn bộ bảng
    const tableTotals = {
      slab: 0,
      pt: 0,
      modelling: 0,
      lateral: 0,
      grandTotal: 0
    };

    rows.forEach(r => {
      tableTotals.slab += r.slabHours;
      tableTotals.pt += r.ptHours;
      tableTotals.modelling += r.modellingHours;
      tableTotals.lateral += r.lateralHours;
      tableTotals.grandTotal += r.totalHours;
    });

    return {
      projectRows: rows,
      totals: tableTotals
    };
  }, [baseTasks, projectLookup, metricMode, getProjectColor]);

  // 4. Lọc theo từ khóa tìm kiếm (Filter theo Project)
  const filteredRows = useMemo(() => {
    let result = projectRows;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r => 
        (r.key || '').toLowerCase().includes(q) || 
        (r.name || '').toLowerCase().includes(q)
      );
    }

    // Sắp xếp
    return result.sort((a, b) => {
      let vA, vB;
      switch (sortKey) {
        case 'key':
          vA = a.key.toLowerCase();
          vB = b.key.toLowerCase();
          break;
        case 'name':
          vA = (a.name || '').toLowerCase();
          vB = (b.name || '').toLowerCase();
          break;
        case 'slab':
          vA = a.slabHours;
          vB = b.slabHours;
          break;
        case 'pt':
          vA = a.ptHours;
          vB = b.ptHours;
          break;
        case 'modelling':
          vA = a.modellingHours;
          vB = b.modellingHours;
          break;
        case 'lateral':
          vA = a.lateralHours;
          vB = b.lateralHours;
          break;
        case 'total':
          vA = a.totalHours;
          vB = b.totalHours;
          break;
        default: // 'no'
          return sortDir === 'asc' ? b.totalHours - a.totalHours : a.totalHours - b.totalHours;
      }

      if (typeof vA === 'string') {
        return sortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      return sortDir === 'asc' ? vA - vB : vB - vA;
    });
  }, [projectRows, searchQuery, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'no' || key === 'key' || key === 'name' ? 'asc' : 'desc');
    }
  };

  // 5. Xuất file CSV định dạng chuẩn Excel
  const handleExportCSV = () => {
    const headers = [
      'No.',
      'Project Code Name',
      'Project Name',
      'Slab Design (Number of hours)',
      'PT&Reo (Number of hours)',
      'Modelling (Number of hours)',
      'Lateral Design (Number of hours)',
      'Total number of hours'
    ];

    const csvRows = [headers.join(',')];

    filteredRows.forEach((r, idx) => {
      const rowData = [
        idx + 1,
        `"${r.key.replace(/"/g, '""')}"`,
        `"${(r.name || 'N/A').replace(/"/g, '""')}"`,
        r.slabHours > 0 ? r.slabHours.toFixed(2) : '',
        r.ptHours > 0 ? r.ptHours.toFixed(2) : '',
        r.modellingHours > 0 ? r.modellingHours.toFixed(2) : '',
        r.lateralHours > 0 ? r.lateralHours.toFixed(2) : '',
        r.totalHours.toFixed(2)
      ];
      csvRows.push(rowData.join(','));
    });

    // Thêm dòng TOTAL ở cuối
    const totalRow = [
      'TOTAL',
      '',
      '',
      totals.slab > 0 ? totals.slab.toFixed(2) : '',
      totals.pt > 0 ? totals.pt.toFixed(2) : '',
      totals.modelling > 0 ? totals.modelling.toFixed(2) : '',
      totals.lateral > 0 ? totals.lateral.toFixed(2) : '',
      totals.grandTotal.toFixed(2)
    ];
    csvRows.push(totalRow.join(','));

    // Tạo file download kèm BOM để Excel hiển thị đúng tiếng Việt UTF-8
    const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `APEX_Project_Hours_Summary_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useImperativeHandle(ref, () => ({
    exportCSV: handleExportCSV
  }), [handleExportCSV]);

  const formatHours = (val) => {
    if (!val || val <= 0.001) return '';
    return val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
  };

  return (
    <div className="flex flex-col gap-[10px] animate-in fade-in duration-300">
      {/* MAIN SPREADSHEET FORM TABLE */}
      <div className="personal-table-wrapper rounded-2xl border border-[var(--border)] overflow-hidden shadow-md bg-[var(--bg-card)]">
        <div className="max-h-[calc(100vh-335px)] overflow-y-auto overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-0" style={{ minWidth: '1220px' }}>
            {/* Balanced Column Grouping */}
            <colgroup>
              <col style={{ width: '65px' }} />
              <col style={{ width: '280px' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>

            {/* Table Header */}
            <thead>
              <tr className="th-primary dark:text-white border-b border-[var(--border)] select-none">
                {/* 1. No. */}
                <th
                  onClick={() => handleSort('no')}
                  className="sticky top-0 z-30 bg-[var(--bg-card)] border-r border-b border-[var(--border)] h-[48px] text-center text-[14px] font-black uppercase tracking-widest text-[var(--text-contrast)] dark:text-white cursor-pointer hover:bg-[var(--bg-surface)] transition-colors align-middle"
                  style={{ paddingLeft: '20px', paddingRight: '12px' }}
                >
                  <div className="inline-flex items-center gap-1 justify-center whitespace-nowrap">
                    <span>No.</span>
                    {sortKey === 'no' && <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>

                {/* 2. Project Code Name */}
                <th
                  onClick={() => handleSort('key')}
                  className="sticky top-0 z-30 bg-[var(--bg-card)] border-r border-b border-[var(--border)] h-[48px] text-left text-[14px] font-black uppercase tracking-widest text-[var(--text-contrast)] dark:text-white cursor-pointer hover:bg-[var(--bg-surface)] transition-colors align-middle min-w-[260px]"
                  style={{ paddingLeft: '20px', paddingRight: '16px' }}
                >
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span>Project Code</span>
                    {sortKey === 'key' && <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>

                {/* 3. Project Name */}
                <th
                  onClick={() => handleSort('name')}
                  className="sticky top-0 z-30 bg-[var(--bg-card)] border-r border-b border-[var(--border)] h-[48px] text-left text-[14px] font-black uppercase tracking-widest text-[var(--text-contrast)] dark:text-white cursor-pointer hover:bg-[var(--bg-surface)] transition-colors align-middle"
                  style={{ paddingLeft: '20px', paddingRight: '16px' }}
                >
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span>Project Name</span>
                    {sortKey === 'name' && <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>

                {/* 4. Team Columns */}
                {TEAM_COLUMNS.map(col => (
                  <th
                    key={col.id}
                    onClick={() => handleSort(col.id)}
                    className="sticky top-0 z-30 bg-[var(--bg-card)] border-r border-b border-[var(--border)] h-[48px] px-[10px] text-center cursor-pointer hover:bg-[var(--bg-surface)] transition-colors align-middle"
                  >
                    <div className={`text-[14px] font-black uppercase tracking-widest flex items-center justify-center gap-1 whitespace-nowrap ${
                      col.id === 'slab' ? 'text-emerald-600 dark:text-emerald-400' :
                      col.id === 'pt' ? 'text-amber-600 dark:text-amber-400' :
                      col.id === 'modelling' ? 'text-sky-600 dark:text-sky-400' :
                      'text-purple-600 dark:text-purple-400'
                    }`}>
                      <span>{col.title}</span>
                      {sortKey === col.id && <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                    </div>
                  </th>
                ))}

                {/* 5. Total number of hours */}
                <th
                  onClick={() => handleSort('total')}
                  className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--border)] h-[48px] text-center text-[14px] font-black uppercase tracking-widest text-[var(--text-contrast)] dark:text-white cursor-pointer hover:bg-[var(--bg-surface)] transition-colors align-middle"
                  style={{ paddingRight: '20px', paddingLeft: '10px' }}
                >
                  <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <span>Total Hours</span>
                    {sortKey === 'total' && <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[var(--border)] text-[14px]">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="sys-py text-center text-[var(--text-muted)] font-medium border-b border-[var(--border)] py-8">
                    {searchQuery ? `No projects found matching "${searchQuery}"` : 'No project data found for this time range'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, idx) => {
                  const isExpanded = expandedRow === r.key;
                  const isMissingName = !r.name || r.name.trim() === '' || r.name.toUpperCase() === 'N/A' || r.name.toUpperCase() === 'KHÔNG CÓ';

                  return (
                    <React.Fragment key={r.key}>
                      <tr 
                        onClick={() => setExpandedRow(isExpanded ? null : r.key)}
                        className={`transition-all duration-200 text-[14px] align-middle hover:bg-[var(--bg-surface)] group cursor-pointer ${
                          idx % 2 === 0 ? 'bg-transparent' : 'bg-[var(--bg-surface)]/25'
                        }`}
                      >
                        {/* No. */}
                        <td 
                          className="sys-py text-center font-medium text-[var(--text-muted)] border-r border-b border-[var(--border)]"
                          style={{ paddingLeft: '20px', paddingRight: '12px', verticalAlign: 'middle' }}
                        >
                          {idx + 1}
                        </td>

                        {/* Project Code Name */}
                        <td 
                          className="sys-py uppercase border-r border-b border-[var(--border)] min-w-[260px]"
                          style={{ paddingLeft: '20px', paddingRight: '16px', verticalAlign: 'middle' }}
                        >
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span 
                              className="text-[13px] font-bold tracking-wide uppercase whitespace-nowrap"
                              style={{ color: r.color }}
                            >
                              {r.key}
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                          </div>
                        </td>

                        {/* Project Name (Full Name) */}
                        <td 
                          className={`sys-py font-medium border-r border-b border-[var(--border)] ${
                            isMissingName 
                              ? 'bg-amber-300/30 text-amber-900 dark:text-amber-300 font-bold' 
                              : 'text-[var(--text-contrast)]'
                          }`}
                          style={{ paddingLeft: '20px', paddingRight: '16px', verticalAlign: 'middle' }}
                        >
                          {isMissingName ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-400/30 text-yellow-800 dark:text-yellow-200 text-xs font-black">
                              N/A
                            </span>
                          ) : (
                            r.name
                          )}
                        </td>

                        {/* Slab Design Hours */}
                        <td className="sys-py px-[10px] text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 border-r border-b border-[var(--border)]" style={{ verticalAlign: 'middle' }}>
                          {formatHours(r.slabHours)}
                        </td>

                        {/* PT&Reo Hours */}
                        <td className="sys-py px-[10px] text-center font-mono font-bold text-amber-600 dark:text-amber-400 border-r border-b border-[var(--border)]" style={{ verticalAlign: 'middle' }}>
                          {formatHours(r.ptHours)}
                        </td>

                        {/* Modelling Hours */}
                        <td className="sys-py px-[10px] text-center font-mono font-bold text-sky-600 dark:text-sky-400 border-r border-b border-[var(--border)]" style={{ verticalAlign: 'middle' }}>
                          {formatHours(r.modellingHours)}
                        </td>

                        {/* Lateral Design Hours */}
                        <td className="sys-py px-[10px] text-center font-mono font-bold text-purple-600 dark:text-purple-400 border-r border-b border-[var(--border)]" style={{ verticalAlign: 'middle' }}>
                          {formatHours(r.lateralHours)}
                        </td>

                        {/* Total number of hours */}
                        <td 
                          className="sys-py text-center font-mono font-black text-[var(--text-contrast)] text-[14px] border-b border-[var(--border)]"
                          style={{ paddingRight: '20px', paddingLeft: '10px', verticalAlign: 'middle' }}
                        >
                          {r.totalHours.toFixed(1)}
                        </td>
                      </tr>

                      {/* Drill-down Detail: Header Row */}
                      {isExpanded && (
                        <tr className="bg-slate-200/90 dark:bg-slate-800 animate-in fade-in duration-150">
                          {/* Col 1: Empty No. */}
                          <td className="border-r border-b border-white dark:border-slate-700/80" />
                          {/* Col 2-end: Tasks title */}
                          <td 
                            colSpan={7} 
                            className="sys-py text-[12px] font-bold uppercase text-slate-600 dark:text-slate-300 tracking-wider border-b border-white dark:border-slate-700/80"
                            style={{ paddingLeft: '20px' }}
                          >
                            Tasks for [{r.key}] ({r.tasks.length} tasks)
                          </td>
                        </tr>
                      )}

                      {/* Drill-down Detail: Direct Task Rows sharing the table columns */}
                      {isExpanded && r.tasks.map((t, ti) => {
                        const teamId = t.teamId || classifyTaskTeam(t.team, t.name);
                        const isLastTask = ti === r.tasks.length - 1;

                        // Text colors mapped by Team
                        const teamTextClass = 
                          teamId === 'slab' ? 'text-emerald-700 dark:text-emerald-400' :
                          teamId === 'pt' ? 'text-amber-700 dark:text-amber-400' :
                          teamId === 'modelling' ? 'text-sky-700 dark:text-sky-400' :
                          teamId === 'lateral' ? 'text-purple-700 dark:text-purple-400' :
                          'text-slate-700 dark:text-slate-300';

                        const horizontalBorder = isLastTask 
                          ? 'border-b-2 border-slate-300 dark:border-slate-700' 
                          : 'border-b border-white dark:border-slate-800/80';

                        return (
                          <tr 
                            key={ti} 
                            className="bg-slate-100/95 dark:bg-slate-900/75 hover:bg-slate-200/80 dark:hover:bg-slate-800/80 transition-colors text-[13px] animate-in fade-in duration-150"
                          >
                            {/* 1. No. (Empty) */}
                            <td className={`border-r border-white dark:border-slate-800/80 ${horizontalBorder} text-center font-medium`} />

                            {/* 2 & 3. Project Code Name + Project Name (combined for task name & user) */}
                            <td 
                              colSpan={2} 
                              className={`sys-py pr-4 truncate text-left border-r border-white dark:border-slate-800/80 ${horizontalBorder}`}
                              style={{ paddingLeft: '20px', verticalAlign: 'middle' }}
                            >
                              <div className="flex items-center min-w-0">
                                <span className={`font-bold truncate ${teamTextClass}`}>
                                  {t.name}
                                </span>
                                <span className={`text-[12px] font-semibold ml-2 shrink-0 opacity-80 ${teamTextClass}`}>
                                  ({t.user})
                                </span>
                              </div>
                            </td>

                            {/* 4. Slab Design */}
                            <td className={`sys-py px-[10px] text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 border-r border-white dark:border-slate-800/80 ${horizontalBorder}`} style={{ verticalAlign: 'middle' }}>
                              {teamId === 'slab' && t.hours > 0 ? `${t.hours.toFixed(1)}h` : ''}
                            </td>

                            {/* 5. PT&Reo */}
                            <td className={`sys-py px-[10px] text-center font-mono font-bold text-amber-600 dark:text-amber-400 border-r border-white dark:border-slate-800/80 ${horizontalBorder}`} style={{ verticalAlign: 'middle' }}>
                              {teamId === 'pt' && t.hours > 0 ? `${t.hours.toFixed(1)}h` : ''}
                            </td>

                            {/* 6. Modelling */}
                            <td className={`sys-py px-[10px] text-center font-mono font-bold text-sky-600 dark:text-sky-400 border-r border-white dark:border-slate-800/80 ${horizontalBorder}`} style={{ verticalAlign: 'middle' }}>
                              {teamId === 'modelling' && t.hours > 0 ? `${t.hours.toFixed(1)}h` : ''}
                            </td>

                            {/* 7. Lateral Design */}
                            <td className={`sys-py px-[10px] text-center font-mono font-bold text-purple-600 dark:text-purple-400 border-r border-white dark:border-slate-800/80 ${horizontalBorder}`} style={{ verticalAlign: 'middle' }}>
                              {teamId === 'lateral' && t.hours > 0 ? `${t.hours.toFixed(1)}h` : ''}
                            </td>

                            {/* 8. Total Number of Hours Column - Empty */}
                            <td className={`sys-py text-center font-mono ${horizontalBorder}`} style={{ paddingRight: '20px', paddingLeft: '10px' }} />
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* Table Footer: TOTAL Row matching the Excel spreadsheet */}
            <tfoot>
              <tr className="bg-[var(--bg-surface)] font-black text-[14px] border-t-2 border-[var(--border)] shadow-md sticky bottom-0 z-20">
                {/* TOTAL label spanning No., Code Name and Full Name */}
                <td 
                  colSpan={3} 
                  className="sys-py text-left font-black tracking-widest uppercase border-r border-[var(--border)] text-[var(--text-contrast)]"
                  style={{ paddingLeft: '20px', paddingRight: '16px', verticalAlign: 'middle' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-black text-rose-500">TOTAL</span>
                    <span className="text-xs font-normal text-[var(--text-muted)] lowercase">
                      ({filteredRows.length} projects)
                    </span>
                  </div>
                </td>

                {/* Total Slab Design */}
                <td className="sys-py px-[10px] text-center font-mono font-black text-emerald-600 dark:text-emerald-400 border-r border-[var(--border)] bg-emerald-500/10" style={{ verticalAlign: 'middle' }}>
                  {totals.slab > 0 ? totals.slab.toFixed(1) : ''}
                </td>

                {/* Total PT&Reo */}
                <td className="sys-py px-[10px] text-center font-mono font-black text-amber-600 dark:text-amber-400 border-r border-[var(--border)] bg-amber-500/10" style={{ verticalAlign: 'middle' }}>
                  {totals.pt > 0 ? totals.pt.toFixed(1) : ''}
                </td>

                {/* Total Modelling */}
                <td className="sys-py px-[10px] text-center font-mono font-black text-sky-600 dark:text-sky-400 border-r border-[var(--border)] bg-sky-500/10" style={{ verticalAlign: 'middle' }}>
                  {totals.modelling > 0 ? totals.modelling.toFixed(1) : ''}
                </td>

                {/* Total Lateral Design */}
                <td className="sys-py px-[10px] text-center font-mono font-black text-purple-600 dark:text-purple-400 border-r border-[var(--border)] bg-purple-500/10" style={{ verticalAlign: 'middle' }}>
                  {totals.lateral > 0 ? totals.lateral.toFixed(1) : ''}
                </td>

                {/* Grand Total number of hours */}
                <td 
                  className="sys-py text-center font-mono font-black text-rose-600 dark:text-rose-400 text-[14px] bg-rose-500/10"
                  style={{ paddingRight: '20px', paddingLeft: '10px', verticalAlign: 'middle' }}
                >
                  {totals.grandTotal.toFixed(1)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
});

ProjectView.displayName = 'ProjectView';

export default ProjectView;
