import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ExternalLink, Plus, Check, Calendar, Link2, X } from 'lucide-react';
import {
  ymd,
  fmtShort,
  fmtLong,
  isPlanLate,
  isUrl,
  lvlSort
} from '../../data/drawingTrackerSeed';

/**
 * Editable cell for Level (e.g. GF, L1, L2, B1, ROOF)
 * Includes multi-select checkbox (supports Shift+Click range selection).
 */
const EditableLevelCell = ({ zone, onUpdate, isSelected, onToggleSelect }) => {
  const [val, setVal] = useState(zone.level || '');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setVal(zone.level || '');
  }, [zone.level]);

  const handleCommit = () => {
    setIsEditing(false);
    const trimmed = (val || '').trim().toUpperCase();
    if (!trimmed) {
      setVal(zone.level || '');
      return;
    }
    if (trimmed !== (zone.level || '').toUpperCase()) {
      onUpdate?.(zone.id, { level: trimmed });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    } else if (e.key === 'Escape') {
      setVal(zone.level || '');
      setIsEditing(false);
      e.target.blur();
    }
  };

  return (
    <td className="dt-fix dt-col-lvl align-middle p-0">
      <div className="flex items-center gap-0.5 pl-1.5 pr-1 h-full w-full">
        <input
          type="checkbox"
          checked={isSelected}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(zone.id, e);
          }}
          onChange={() => {}}
          title="Chọn tầng này (Giữ Shift + Click để chọn nhanh nhiều tầng liên tiếp)"
          className="dt-row-chk shrink-0"
        />
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onFocus={() => setIsEditing(true)}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          title="Nhấp để sửa Level (Enter để lưu)"
          className={`dt-cell-input dt-level-input text-center font-extrabold uppercase flex-1 min-w-0 ${
            isEditing ? 'dt-cell-editing' : ''
          }`}
        />
      </div>
    </td>
  );
};

/**
 * Editable cell for Zone / Pour (e.g. Pour 1, Pour 2, Zone A, or empty)
 * Has a subtle hover delete button so user can delete the row.
 */
const EditableZoneCell = ({ zone, onUpdate, confirmDelId, onConfirmDelete }) => {
  const [val, setVal] = useState(zone.zone || '');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setVal(zone.zone || '');
  }, [zone.zone]);

  const handleCommit = () => {
    setIsEditing(false);
    const trimmed = (val || '').trim();
    if (trimmed !== (zone.zone || '').trim()) {
      onUpdate?.(zone.id, { zone: trimmed });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    } else if (e.key === 'Escape') {
      setVal(zone.zone || '');
      setIsEditing(false);
      e.target.blur();
    }
  };

  return (
    <td className="dt-fix dt-col-zone align-middle p-0">
      <div className="flex items-center justify-between gap-1 px-1 h-full w-full group/zone">
        <input
          type="text"
          value={val}
          placeholder={isEditing ? 'Pour / Zone...' : '—'}
          onChange={(e) => setVal(e.target.value)}
          onFocus={() => setIsEditing(true)}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          title="Nhấp để nhập / sửa Zone hoặc Pour (Enter để lưu)"
          className={`dt-cell-input dt-zone-input text-center font-semibold flex-1 ${
            !val && !isEditing ? 'text-[var(--text-dim)]' : 'text-[var(--text-main)]'
          } ${isEditing ? 'dt-cell-editing' : ''}`}
        />
        <button
          type="button"
          onClick={(e) => onConfirmDelete(e, zone)}
          className={`dt-zone-del ${confirmDelId === zone.id ? '!opacity-100 confirm' : ''}`}
          title="Xóa dòng Zone này"
        >
          {confirmDelId === zone.id ? 'Xóa?' : '✕'}
        </button>
      </div>
    </td>
  );
};

/**
 * Quick Add row at the bottom of each project to add Level / Pour instantly
 */
const QuickAddProjectRow = ({ project, cols, monthMode, onQuickAdd }) => {
  const [level, setLevel] = useState('');
  const [zone, setZone] = useState('');

  const handleAdd = () => {
    if (!level.trim() && !zone.trim()) return;
    const added = onQuickAdd?.(project.id, level || 'GF', zone);
    if (added) {
      setZone('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <tr className="dt-quick-add-tr group/add bg-indigo-500/[0.02] hover:bg-indigo-500/[0.05] transition-colors">
      <td className="dt-fix dt-col-lvl p-0 align-middle">
        <input
          type="text"
          placeholder="+ Level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          onKeyDown={handleKeyDown}
          className="dt-cell-input text-center uppercase text-indigo-500 placeholder:text-indigo-400/50 font-bold"
          title="Gõ Level (VD: L1, GF, B1) rồi nhấn Enter để thêm dòng"
        />
      </td>
      <td className="dt-fix dt-col-zone p-0 align-middle">
        <div className="flex items-center gap-1 px-1 h-full">
          <input
            type="text"
            placeholder="+ Pour / Zone"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            onKeyDown={handleKeyDown}
            className="dt-cell-input text-center text-indigo-500 placeholder:text-indigo-400/50 font-semibold flex-1"
            title="Gõ Pour / Zone (VD: Pour 1, Zone A) rồi nhấn Enter để thêm dòng"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="p-1 rounded bg-indigo-500/15 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all text-xs shrink-0"
            title="Thêm dòng mới cho dự án này"
          >
            <Plus size={12} />
          </button>
        </div>
      </td>
      <td className="dt-fix dt-col-cur text-center text-[var(--text-dim)] text-xs">—</td>
      <td className="dt-fix dt-col-plan text-center text-[var(--text-dim)] text-xs">—</td>
      {cols.map((c) => (
        <td key={c.ds} className="dt-day-cell bg-transparent pointer-events-none" />
      ))}
      {!monthMode && <td className="dt-day-cell bg-transparent pointer-events-none" />}
    </tr>
  );
};

const BoardView = ({
  scopedData,
  boardMode,
  viewYear,
  viewMonth,
  todayStr,
  getProjectColor,
  onOpenCell,
  onDeleteZone,
  onUpdateZone,
  onQuickAddZone,
  onOpenAddModal,
  onBatchApply,
  onOpenBatchModal,
  scrollToTodayTrigger
}) => {
  const { projs, zones, issues, plans } = scopedData;
  const [confirmDelId, setConfirmDelId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [lastClickedId, setLastClickedId] = useState(null);
  const [batchDate, setBatchDate] = useState(todayStr);
  const todayThRef = useRef(null);
  const selectAllRef = useRef(null);

  useEffect(() => {
    if (scrollToTodayTrigger > 0 && todayThRef.current) {
      todayThRef.current.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }, [scrollToTodayTrigger]);

  const monthMode = boardMode === 'month';

  const cols = useMemo(() => {
    if (monthMode) {
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const arr = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(viewYear, viewMonth, d);
        arr.push({
          ds: ymd(dt),
          label: d === 1 ? `1/${viewMonth + 1}` : String(d),
          wk: dt.getDay() === 0 || dt.getDay() === 6
        });
      }
      return arr;
    }
    const zids = new Set(zones.map((z) => z.id));
    const dateSet = new Set();
    issues.forEach((i) => { if (zids.has(i.zone_id)) dateSet.add(i.date); });
    plans.forEach((p) => { if (zids.has(p.zone_id)) dateSet.add(p.date); });
    return [...dateSet].sort().map((ds) => ({ ds, label: fmtShort(ds), wk: false }));
  }, [monthMode, viewYear, viewMonth, zones, issues, plans]);

  const { projectGroups, stats } = useMemo(() => {
    const issuesByZone = new Map();
    issues.forEach((iss) => {
      if (!issuesByZone.has(iss.zone_id)) issuesByZone.set(iss.zone_id, []);
      issuesByZone.get(iss.zone_id).push(iss);
    });
    issuesByZone.forEach((arr) => arr.sort((a, b) => (a.date < b.date ? 1 : -1)));

    const plansByZone = new Map();
    plans.forEach((pl) => {
      if (!plansByZone.has(pl.zone_id)) plansByZone.set(pl.zone_id, []);
      plansByZone.get(pl.zone_id).push(pl);
    });
    plansByZone.forEach((arr) => arr.sort((a, b) => (a.date < b.date ? -1 : 1)));

    let totalZones = 0;
    let zonesIssued = 0;
    let visibleIssuedCells = 0;
    let totalPlans = 0;
    let latePlans = 0;

    const groups = [];

    projs.forEach((p) => {
      const pZones = zones.filter((z) => z.project_id === p.id);

      // If this is a single filtered project with no zones, still show it with QuickAdd
      if (!pZones.length) {
        if (projs.length === 1) {
          groups.push({ project: p, rows: [] });
        }
        return;
      }

      const levels = [...new Set(pZones.map((z) => z.level))].sort(lvlSort);
      const pRows = [];

      levels.forEach((lv) => {
        const lZones = pZones
          .filter((z) => z.level === lv)
          .sort((a, b) => a.sort - b.sort || String(a.zone).localeCompare(String(b.zone)));

        lZones.forEach((z) => {
          totalZones++;
          const zIssues = issuesByZone.get(z.id) || [];
          const latestIssue = zIssues[0] || null;
          if (latestIssue) zonesIssued++;

          const byDateIssues = {};
          zIssues.forEach((x) => {
            if (!byDateIssues[x.date]) byDateIssues[x.date] = [];
            byDateIssues[x.date].push(x);
          });

          const zPlans = plansByZone.get(z.id) || [];
          const byDatePlans = {};
          zPlans.forEach((x) => { byDatePlans[x.date] = x; });

          totalPlans += zPlans.length;
          latePlans += zPlans.filter((x) => isPlanLate(x, todayStr)).length;

          const nextPlan = zPlans[0] || null;

          cols.forEach((c) => {
            if (byDateIssues[c.ds]) visibleIssuedCells++;
          });

          pRows.push({
            project: p,
            level: lv,
            zone: z,
            latestIssue,
            nextPlan,
            byDateIssues,
            byDatePlans
          });
        });
      });

      groups.push({ project: p, rows: pRows });
    });

    return {
      projectGroups: groups,
      stats: {
        projCount: projs.length,
        totalZones,
        zonesIssued,
        visibleIssuedCells,
        totalPlans,
        latePlans
      }
    };
  }, [projs, zones, issues, plans, cols, todayStr]);

  const flatVisibleIds = useMemo(
    () => projectGroups.flatMap((g) => g.rows.map((r) => r.zone.id)),
    [projectGroups]
  );

  useEffect(() => {
    const validSet = new Set(flatVisibleIds);
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set();
      prev.forEach((id) => {
        if (validSet.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [flatVisibleIds]);

  const allSelected = flatVisibleIds.length > 0 && selectedIds.size === flatVisibleIds.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < flatVisibleIds.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const handleToggleSelect = (zoneId, e) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (e?.shiftKey && lastClickedId && flatVisibleIds.includes(lastClickedId)) {
        const startIdx = flatVisibleIds.indexOf(lastClickedId);
        const endIdx = flatVisibleIds.indexOf(zoneId);
        if (startIdx !== -1 && endIdx !== -1) {
          const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
          for (let i = from; i <= to; i++) {
            next.add(flatVisibleIds[i]);
          }
          return next;
        }
      }
      if (next.has(zoneId)) next.delete(zoneId);
      else next.add(zoneId);
      return next;
    });
    setLastClickedId(zoneId);
  };

  const handleToggleAllVisible = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(flatVisibleIds));
    }
  };

  const handleToggleProjectRows = (projRows) => {
    const ids = projRows.map((r) => r.zone.id);
    if (!ids.length) return;
    const allInProjSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allInProjSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleBatchQuickApply = (type) => {
    if (!selectedIds.size || !batchDate) return;
    onBatchApply?.({
      zoneIds: Array.from(selectedIds),
      type,
      date: batchDate
    });
    setSelectedIds(new Set());
  };

  const handleConfirmDelete = (e, zoneObj) => {
    e.stopPropagation();
    if (confirmDelId !== zoneObj.id) {
      setConfirmDelId(zoneObj.id);
      setTimeout(() => {
        setConfirmDelId((prev) => (prev === zoneObj.id ? null : prev));
      }, 2500);
      return;
    }
    setConfirmDelId(null);
    onDeleteZone(zoneObj);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-[10px]">
      {/* 6 KPI Stat Cards */}
      <div className="dt-stats-grid">
        <div className="dt-stat-card">
          <span className="dt-stat-val">{stats.projCount}</span>
          <span className="dt-stat-lbl">Projects</span>
        </div>
        <div className="dt-stat-card">
          <span className="dt-stat-val">{stats.totalZones}</span>
          <span className="dt-stat-lbl">Level / Zone</span>
        </div>
        <div className="dt-stat-card">
          <span className="dt-stat-val text-emerald-500">
            {stats.zonesIssued}/{stats.totalZones}
          </span>
          <span className="dt-stat-lbl">Đã có phát hành</span>
        </div>
        <div className="dt-stat-card">
          <span className="dt-stat-val text-sky-500">{stats.visibleIssuedCells}</span>
          <span className="dt-stat-lbl">
            {monthMode ? `Lần phát hành T${viewMonth + 1}` : 'Lần phát hành (hiển thị)'}
          </span>
        </div>
        <div className="dt-stat-card">
          <span className="dt-stat-val text-amber-500">{stats.totalPlans}</span>
          <span className="dt-stat-lbl">Kế hoạch chưa issue</span>
        </div>
        <div className="dt-stat-card">
          <span className="dt-stat-val text-rose-500">{stats.latePlans}</span>
          <span className="dt-stat-lbl">Kế hoạch đã trễ</span>
        </div>
      </div>

      {/* Batch Action Bar when rows are selected */}
      {selectedIds.size > 0 && (
        <div className="dt-batch-bar">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-500 text-white text-[12px] font-extrabold">
            Đã chọn {selectedIds.size} dòng
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-[11.5px] font-bold text-[var(--text-muted)]">Chọn ngày:</span>
            <input
              type="date"
              value={batchDate}
              onChange={(e) => setBatchDate(e.target.value)}
              className="dt-input !py-1 !px-2 text-[12px] font-bold"
            />
          </div>

          <button
            type="button"
            onClick={() => handleBatchQuickApply('issue')}
            className="dt-action-btn primary !py-1.5 !px-3 text-[12px]"
            title="Đánh dấu Đã phát hành (Issue) cho tất cả dòng đã chọn"
          >
            <Check size={13} /> Phát hành ({selectedIds.size})
          </button>

          <button
            type="button"
            onClick={() => handleBatchQuickApply('plan')}
            className="dt-action-btn amber !py-1.5 !px-3 text-[12px]"
            title="Đặt Kế hoạch (Plan) cho tất cả dòng đã chọn"
          >
            <Calendar size={13} /> Kế hoạch ({selectedIds.size})
          </button>

          <button
            type="button"
            onClick={() =>
              onOpenBatchModal?.({
                zoneIds: Array.from(selectedIds),
                initialDate: batchDate,
                defaultType: 'issue'
              })
            }
            className="dt-action-btn !py-1.5 !px-2.5 text-[12px]"
            title="Mở bảng nhập thêm Link bản vẽ & Ghi chú chung"
          >
            <Link2 size={13} /> + Link / Ghi chú
          </button>

          <span className="text-[11px] text-[var(--text-muted)] hidden xl:inline ml-1">
            Mẹo: Giữ <b>Shift</b> + click để chọn nhanh từ tầng đầu đến tầng cuối
          </span>

          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="dt-action-btn !py-1.5 !px-2.5 text-[12px] ml-auto"
          >
            <X size={13} /> Bỏ chọn
          </button>
        </div>
      )}

      {/* Matrix Grid */}
      <div className="dt-matrix-wrap custom-scrollbar">
        <table className="dt-matrix-table">
          <thead>
            <tr>
              <th className="dt-fix dt-col-proj">PROJECT</th>
              <th className="dt-fix dt-col-lvl">
                <div className="flex items-center justify-center gap-1.5">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleToggleAllVisible}
                    title="Chọn / Bỏ chọn tất cả dòng đang hiển thị"
                    className="dt-row-chk"
                  />
                  <span>LEVEL</span>
                </div>
              </th>
              <th className="dt-fix dt-col-zone">ZONE / POUR</th>
              <th className="dt-fix dt-col-cur">CURRENT</th>
              <th className="dt-fix dt-col-plan">KẾ HOẠCH</th>
              {cols.map((c) => {
                const isToday = c.ds === todayStr;
                return (
                  <th
                    key={c.ds}
                    ref={isToday ? todayThRef : null}
                    className={isToday ? 'dt-th-today' : ''}
                    title={fmtLong(c.ds)}
                  >
                    {c.label}
                  </th>
                );
              })}
              {!monthMode && <th title="Thêm ngày phát hành / kế hoạch mới">+ NGÀY</th>}
            </tr>
          </thead>
          <tbody>
            {projectGroups.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 6} className="py-12 text-center text-[var(--text-muted)] font-bold">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <p className="text-[14px]">Chưa có dữ liệu Level / Zone nào trong phạm vi lọc.</p>
                    <button
                      type="button"
                      onClick={onOpenAddModal}
                      className="dt-action-btn primary !px-4 !py-2 text-[13px] flex items-center gap-2"
                    >
                      <Plus size={16} /> Thêm Dự Án / Level / Zone Ngay
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              projectGroups.map(({ project, rows }) => {
                const projColor = getProjectColor(project);
                const projRowSpan = rows.length + 1; // Existing rows + 1 quick add row
                const projAllSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.zone.id));
                const projSomeSelected = rows.some((r) => selectedIds.has(r.zone.id));

                return (
                  <React.Fragment key={project.id}>
                    {rows.map((row, rowIdx) => {
                      const {
                        zone,
                        latestIssue,
                        nextPlan,
                        byDateIssues,
                        byDatePlans
                      } = row;
                      const nextLate = isPlanLate(nextPlan, todayStr);
                      const isRowSelected = selectedIds.has(zone.id);

                      return (
                        <tr
                          key={zone.id}
                          className={`hover:bg-[var(--bg-hover)] transition-colors ${
                            isRowSelected ? 'dt-row-selected' : ''
                          }`}
                        >
                          {rowIdx === 0 && (
                            <td
                              rowSpan={projRowSpan}
                              className="dt-fix dt-col-proj align-middle group/proj"
                              style={{ color: projColor }}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <input
                                  type="checkbox"
                                  checked={projAllSelected}
                                  onChange={() => handleToggleProjectRows(rows)}
                                  title={`Chọn / Bỏ chọn tất cả tầng của ${project.name}`}
                                  className={`dt-row-chk shrink-0 transition-opacity ${
                                    projSomeSelected ? 'opacity-100' : 'opacity-0 group-hover/proj:opacity-100'
                                  }`}
                                />
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: projColor }}
                                />
                                <span className="truncate">{project.name}</span>
                              </div>
                            </td>
                          )}

                          {/* LEVEL Cell - Editable directly on every row + multi-select checkbox */}
                          <EditableLevelCell
                            zone={zone}
                            onUpdate={onUpdateZone}
                            isSelected={isRowSelected}
                            onToggleSelect={handleToggleSelect}
                          />

                          {/* ZONE / POUR Cell - Editable directly on every row */}
                          <EditableZoneCell
                            zone={zone}
                            onUpdate={onUpdateZone}
                            confirmDelId={confirmDelId}
                            onConfirmDelete={handleConfirmDelete}
                          />

                          {/* CURRENT Cell - Clickable to open Issue modal & input/edit issue date */}
                          <td
                            className="dt-fix dt-col-cur cursor-pointer hover:bg-emerald-500/15 transition-colors group/cur"
                            onClick={() => onOpenCell(zone.id, latestIssue?.date || todayStr, 'issue')}
                            title={
                              latestIssue
                                ? `Đã phát hành ${fmtLong(latestIssue.date)}${
                                    latestIssue.note ? ' · ' + latestIssue.note : ''
                                  }\n(Nhấp để chỉnh sửa / cập nhật ngày phát hành)`
                                : 'Nhấp để nhập ngày phát hành hiện tại'
                            }
                          >
                            <div className="flex items-center justify-center gap-1">
                              {latestIssue ? (
                                <>
                                  <span className="text-emerald-500 font-extrabold">
                                    {fmtShort(latestIssue.date)}
                                  </span>
                                  {isUrl(latestIssue.link) && (
                                    <a
                                      href={latestIssue.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-emerald-500 hover:text-emerald-400"
                                      title="Mở link bản vẽ"
                                    >
                                      <ExternalLink size={10} />
                                    </a>
                                  )}
                                </>
                              ) : (
                                <span className="text-[var(--text-dim)] group-hover/cur:text-emerald-500 group-hover/cur:font-bold text-xs">
                                  —
                                </span>
                              )}
                            </div>
                          </td>

                          {/* KẾ HOẠCH Cell - Clickable to open Plan modal & input/edit plan date */}
                          <td
                            className={`dt-fix dt-col-plan cursor-pointer hover:bg-amber-500/15 transition-colors group/plan ${
                              nextPlan
                                ? nextLate
                                  ? 'text-rose-500'
                                  : 'text-amber-500'
                                : 'text-[var(--text-dim)]'
                            }`}
                            onClick={() => onOpenCell(zone.id, nextPlan?.date || todayStr, 'plan')}
                            title={
                              nextPlan
                                ? `${nextLate ? 'TRỄ – ' : ''}Kế hoạch ${fmtLong(nextPlan.date)}${
                                    nextPlan.note ? ' · ' + nextPlan.note : ''
                                  }\n(Nhấp để chỉnh sửa kế hoạch)`
                                : 'Nhấp để đặt ngày kế hoạch'
                            }
                          >
                            <div className="flex items-center justify-center gap-1 font-bold">
                              {nextPlan ? (
                                <span>
                                  {fmtShort(nextPlan.date)}
                                  {nextLate ? ' !' : ''}
                                </span>
                              ) : (
                                <span className="text-[var(--text-dim)] group-hover/plan:text-amber-500 text-xs">—</span>
                              )}
                            </div>
                          </td>

                          {/* Matrix Day Cells */}
                          {cols.map((c) => {
                            const hitList = byDateIssues[c.ds];
                            const planHit = !hitList ? byDatePlans[c.ds] : null;
                            const late = isPlanLate(planHit, todayStr);
                            const isToday = c.ds === todayStr;

                            const cellClasses = [
                              'dt-day-cell',
                              hitList ? 'dt-day-issued' : '',
                              planHit && !late ? 'dt-day-plan' : '',
                              planHit && late ? 'dt-day-late' : '',
                              !hitList && !planHit && isToday ? 'dt-day-today' : '',
                              !hitList && !planHit && c.wk ? 'dt-day-wk' : ''
                            ]
                              .filter(Boolean)
                              .join(' ');

                            const tip = planHit
                              ? `${late ? 'TRỄ – ' : ''}Kế hoạch phát hành ${fmtLong(c.ds)}${
                                  planHit.note ? ' · ' + planHit.note : ''
                                }`
                              : hitList
                              ? `Đã phát hành ${fmtLong(c.ds)}${hitList
                                  .map((x) => `${x.note ? ' · ' + x.note : ''}${x.link ? '\n' + x.link : ''}`)
                                  .join('')}`
                              : `Click để đánh dấu phát hành / kế hoạch ngày ${fmtLong(c.ds)}`;

                            return (
                              <td
                                key={c.ds}
                                className={cellClasses}
                                title={tip}
                                onClick={() => onOpenCell(zone.id, c.ds)}
                              >
                                {hitList ? '✓' : planHit && late ? '!' : ''}
                                {hitList && hitList.length > 1 && (
                                  <span className="dt-day-cnt">{hitList.length}</span>
                                )}
                              </td>
                            );
                          })}

                          {!monthMode && (
                            <td
                              className="dt-day-cell w-[60px] min-w-[60px] text-[var(--text-muted)] hover:text-emerald-500"
                              title="Thêm kế hoạch / ngày phát hành mới (+7 ngày)"
                              onClick={() => {
                                const d = new Date();
                                d.setDate(d.getDate() + 7);
                                onOpenCell(zone.id, ymd(d), 'plan');
                              }}
                            >
                              <Plus size={14} className="inline" />
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {/* Quick Add row for this Project */}
                    <QuickAddProjectRow
                      project={project}
                      cols={cols}
                      monthMode={monthMode}
                      onQuickAdd={onQuickAddZone}
                    />
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11.5px] text-[var(--text-muted)] font-medium flex-wrap px-1 shrink-0">
        <span className="inline-flex items-center gap-1.5">
          <i className="w-3.5 h-3.5 rounded bg-[#22c55e] inline-block" /> Đã phát hành (✓)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="w-3.5 h-3.5 rounded bg-[#fb923c] inline-block" /> Kế hoạch – chưa issue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="w-3.5 h-3.5 rounded bg-[#f43f5e] inline-block" /> Kế hoạch đã trễ (!)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="w-3.5 h-3.5 rounded bg-yellow-400/40 border border-yellow-500/40 inline-block" /> Hôm nay
        </span>
        <span className="ml-auto opacity-80">
          💡 Nhấp trực tiếp vào <b>Level</b> hoặc <b>Zone/Pour</b> để chỉnh sửa · Nhấp vào <b>CURRENT</b> hoặc <b>KẾ HOẠCH</b> để nhập/sửa ngày
        </span>
      </div>
    </div>
  );
};

export default BoardView;
