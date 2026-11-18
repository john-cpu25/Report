import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Table2,
  PieChart,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Database,
  Download,
  RefreshCw,
  Cloud,
  HardDrive
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import BoardView from './DrawingTracker/BoardView';
import SummaryView from './DrawingTracker/SummaryView';
import {
  IssuePlanModal,
  AddRowOrProjectModal,
  DataManagementModal
} from './DrawingTracker/TrackerModals';
import {
  TRACKER_SEED,
  LEGACY_PROJECT_ID_TO_APEX_UUID,
  getFreshTrackerSeed,
  uid,
  ymd,
  fmtShort,
  lvlSort,
  formatZoneLabel,
  PALETTE_COLORS
} from '../data/drawingTrackerSeed';
import {
  loadTrackerData,
  syncTrackerChanges,
  takeSnapshot,
  subscribeTrackerRealtime
} from '../services/drawingTrackerService';

const DrawingTracker = () => {
  const { theme, dashboardProjects } = useApp();
  const { isAdmin, isLeader } = useAuth();
  const isDark = theme === 'GALAXY' || theme === 'DARK';

  const [data, setData] = useState(() => getFreshTrackerSeed());
  const [syncStatus, setSyncStatus] = useState('loading'); // 'loading' | 'saving' | 'synced' | 'local' | 'error'
  const [subTab, setSubTab] = useState('board'); // 'board' | 'summary'
  const [filterProject, setFilterProject] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [boardMode, setBoardMode] = useState('dates'); // 'dates' | 'month'

  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => ymd(now), [now]);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [scrollToTodayTrigger, setScrollToTodayTrigger] = useState(0);

  // Modals & Toast
  const [cellModal, setCellModal] = useState(null); // { zoneId, initialDate, forceType }
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [toastInfo, setToastInfo] = useState(null); // { message, actionLabel, onAction }

  // Sync bookkeeping refs
  const snapRef = useRef(takeSnapshot(data));
  const dataRef = useRef(data);
  const busyRef = useRef(false);
  const dirtyRef = useRef(false);
  const syncTimerRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const showToast = useCallback((message, action = null) => {
    clearTimeout(toastTimerRef.current);
    setToastInfo({
      message,
      actionLabel: action?.label || null,
      onAction: action?.fn || null
    });
    toastTimerRef.current = setTimeout(
      () => setToastInfo(null),
      action ? 6000 : 2200
    );
  }, []);

  const performLoad = useCallback(async (silent = false) => {
    if (!silent) setSyncStatus('loading');
    const res = await loadTrackerData();
    setData(res.data);
    dataRef.current = res.data;
    snapRef.current = takeSnapshot(res.data);
    setSyncStatus(res.mode === 'supabase' ? 'synced' : 'local');
  }, []);

  useEffect(() => {
    performLoad(false);
    const unsubscribe = subscribeTrackerRealtime(() => {
      if (!busyRef.current && !dirtyRef.current) {
        performLoad(true);
      }
    });
    return () => {
      clearTimeout(syncTimerRef.current);
      clearTimeout(toastTimerRef.current);
      unsubscribe();
    };
  }, [performLoad]);

  const scheduleSync = useCallback(
    (nextData) => {
      setData(nextData);
      dataRef.current = nextData;
      dirtyRef.current = true;
      setSyncStatus('saving');
      clearTimeout(syncTimerRef.current);

      const executeSync = async () => {
        if (busyRef.current) {
          syncTimerRef.current = setTimeout(executeSync, 300);
          return;
        }
        busyRef.current = true;
        dirtyRef.current = false;
        try {
          const newSnap = await syncTrackerChanges(snapRef.current, dataRef.current);
          snapRef.current = newSnap;
          setSyncStatus('synced');
        } catch (err) {
          console.warn('[DrawingTracker] Supabase sync fallback to local cache:', err?.message || err);
          setSyncStatus('local');
        } finally {
          busyRef.current = false;
        }
      };

      syncTimerRef.current = setTimeout(executeSync, 300);
    },
    []
  );

  // Project color lookup linked with APEX_Project
  const apexColorMap = useMemo(() => {
    const map = {};
    (dashboardProjects || []).forEach((ap) => {
      if (!ap) return;
      if (ap.id && ap.color) map[ap.id] = ap.color;
      if (ap.key && ap.color) map[ap.key.trim().toUpperCase()] = ap.color;
      if (ap.name && ap.color) map[ap.name.trim().toUpperCase()] = ap.color;
    });
    return map;
  }, [dashboardProjects]);

  const getProjectColor = useCallback(
    (projObj) => {
      if (!projObj) return '#4F46E5';
      if (projObj.apex_project_id && apexColorMap[projObj.apex_project_id]) {
        return apexColorMap[projObj.apex_project_id];
      }
      const upper = String(projObj.name || '').trim().toUpperCase();
      if (apexColorMap[upper]) return apexColorMap[upper];
      if (projObj.color) return projObj.color;
      const idx = Math.max(0, data.projects.findIndex((p) => p.id === projObj.id));
      return PALETTE_COLORS[idx % PALETTE_COLORS.length];
    },
    [apexColorMap, data.projects]
  );

  const { trackedProjectsList, untrackedProjectsList } = useMemo(() => {
    const hasZoneSet = new Set(data.zones.map((z) => z.project_id));
    return {
      trackedProjectsList: data.projects.filter((p) => hasZoneSet.has(p.id)),
      untrackedProjectsList: data.projects.filter((p) => !hasZoneSet.has(p.id))
    };
  }, [data.projects, data.zones]);

  // Filtered scope
  const scopedData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const candidateProjs = data.projects.filter(
      (p) => filterProject === 'all' || p.id === filterProject
    );
    const pids = new Set(candidateProjs.map((p) => p.id));
    const projNameById = Object.fromEntries(data.projects.map((p) => [p.id, p.name]));

    const zones = data.zones.filter(
      (z) =>
        pids.has(z.project_id) &&
        (!q || `${z.level} ${z.zone} ${projNameById[z.project_id] || ''}`.toLowerCase().includes(q))
    );
    const zids = new Set(zones.map((z) => z.id));
    const zProjIds = new Set(zones.map((z) => z.project_id));
    const projs =
      filterProject === 'all'
        ? candidateProjs.filter((p) => zProjIds.has(p.id))
        : candidateProjs;

    const issues = data.issues.filter((i) => zids.has(i.zone_id));
    const plans = data.plans.filter((p) => zids.has(p.zone_id));

    return { projs, zones, issues, plans };
  }, [data, filterProject, searchQuery]);

  // Handlers
  const handleSaveCell = ({ zoneId, type, date, link, note, existingIssue, existingPlan }) => {
    const next = {
      projects: [...data.projects],
      zones: [...data.zones],
      issues: [...data.issues],
      plans: [...data.plans]
    };

    if (type === 'issue') {
      if (existingPlan) next.plans = next.plans.filter((p) => p.id !== existingPlan.id);
      next.plans = next.plans.filter((p) => !(p.zone_id === zoneId && p.date === date));

      const clash = next.issues.find(
        (i) => i.zone_id === zoneId && i.date === date && i.id !== existingIssue?.id
      );
      if (clash) {
        next.issues = next.issues
          .filter((i) => i.id !== existingIssue?.id)
          .map((i) => (i.id === clash.id ? { ...i, link: link || i.link, note } : i));
      } else if (existingIssue) {
        next.issues = next.issues.map((i) =>
          i.id === existingIssue.id ? { ...i, date, link, note } : i
        );
      } else {
        next.issues.push({
          id: uid(),
          zone_id: zoneId,
          date,
          link,
          note,
          created_at: Date.now()
        });
      }
      showToast(`Đã lưu phát hành ngày ${fmtShort(date)}`);
    } else {
      if (existingIssue) {
        next.issues = next.issues.filter((i) => i.id !== existingIssue.id);
      }
      if (next.issues.some((i) => i.zone_id === zoneId && i.date === date)) {
        showToast('Ngày này đã phát hành bản vẽ rồi!');
        return;
      }
      const clash = next.plans.find(
        (p) => p.zone_id === zoneId && p.date === date && p.id !== existingPlan?.id
      );
      if (clash) {
        next.plans = next.plans
          .filter((p) => p.id !== existingPlan?.id)
          .map((p) => (p.id === clash.id ? { ...p, note } : p));
      } else if (existingPlan) {
        next.plans = next.plans.map((p) =>
          p.id === existingPlan.id ? { ...p, date, note } : p
        );
      } else {
        next.plans.push({
          id: uid(),
          zone_id: zoneId,
          date,
          note,
          created_at: Date.now()
        });
      }
      showToast(`Đã lập kế hoạch ngày ${fmtShort(date)}`);
    }

    scheduleSync(next);
    setCellModal(null);
  };

  const handleDeleteRecord = ({ existingIssue, existingPlan }) => {
    const next = {
      ...data,
      issues: existingIssue
        ? data.issues.filter((i) => i.id !== existingIssue.id)
        : [...data.issues],
      plans: existingPlan
        ? data.plans.filter((p) => p.id !== existingPlan.id)
        : [...data.plans]
    };
    scheduleSync(next);
    setCellModal(null);
    showToast(existingIssue ? 'Đã bỏ đánh dấu phát hành' : 'Đã xóa kế hoạch');
  };

  const handleDeleteZone = (zoneObj) => {
    const removedIssues = data.issues.filter((i) => i.zone_id === zoneObj.id);
    const removedPlans = data.plans.filter((p) => p.zone_id === zoneObj.id);

    const next = {
      ...data,
      zones: data.zones.filter((z) => z.id !== zoneObj.id),
      issues: data.issues.filter((i) => i.zone_id !== zoneObj.id),
      plans: data.plans.filter((p) => p.zone_id !== zoneObj.id)
    };
    scheduleSync(next);

    showToast(`Đã xóa ${formatZoneLabel(zoneObj)}`, {
      label: 'Hoàn tác',
      fn: () => {
        const cur = dataRef.current;
        scheduleSync({
          ...cur,
          zones: [...cur.zones, zoneObj],
          issues: [...cur.issues, ...removedIssues],
          plans: [...cur.plans, ...removedPlans]
        });
        showToast('Đã hoàn tác dòng vừa xóa');
      }
    });
  };

  const handleAddZones = ({ projectId, level, zonesStr }) => {
    let zoneNames = zonesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (zoneNames.length === 0) zoneNames = [''];

    const nextZones = [...data.zones];
    let added = 0;

    zoneNames.forEach((zName) => {
      const exists = nextZones.some(
        (r) =>
          r.project_id === projectId &&
          r.level.toUpperCase() === level.toUpperCase() &&
          r.zone.toUpperCase() === zName.toUpperCase()
      );
      if (exists) return;
      const sortOrder = nextZones.filter(
        (r) => r.project_id === projectId && r.level.toUpperCase() === level.toUpperCase()
      ).length;
      nextZones.push({
        id: uid(),
        project_id: projectId,
        level,
        zone: zName,
        sort: sortOrder
      });
      added++;
    });

    scheduleSync({ ...data, zones: nextZones });
    setShowAddModal(false);
    showToast(`Đã thêm ${added} dòng Level/Zone`);
  };

  const handleAddProject = ({ name, apex_project_id, color }) => {
    const existing = data.projects.find(
      (p) => p.name.trim().toUpperCase() === name.trim().toUpperCase()
    );
    if (existing) {
      setFilterProject(existing.id);
      showToast(`Project ${name} đã có trong danh sách`);
      return;
    }
    const newProj = {
      id: `p_${uid()}`,
      name,
      apex_project_id,
      color
    };
    const nextProjects = [...data.projects, newProj];
    // Tạo sẵn dòng GF mặc định để Project hiển thị ngay trên bảng
    const defaultZone = {
      id: `${newProj.id}-gf`,
      project_id: newProj.id,
      level: 'GF',
      zone: '',
      sort: 1
    };
    scheduleSync({
      ...data,
      projects: nextProjects,
      zones: [...data.zones, defaultZone]
    });
    setFilterProject(newProj.id);
    showToast(`Đã tạo Project ${name} (kèm Level GF mặc định)`);
  };

  const handleRestoreSeedZone = (seedZone) => {
    const nextProjects = [...data.projects];
    if (!nextProjects.some((p) => p.id === seedZone.project_id)) {
      const sp = TRACKER_SEED.projects.find((p) => p.id === seedZone.project_id);
      if (sp) nextProjects.push({ ...sp });
    }
    const newZoneId = data.zones.some((z) => z.id === seedZone.id) ? uid() : seedZone.id;
    const nextZones = [...data.zones, { ...seedZone, id: newZoneId }];
    const restoredIssues = TRACKER_SEED.issues
      .filter((i) => i.zone_id === seedZone.id)
      .map((i) => ({ ...i, id: uid(), zone_id: newZoneId }));

    scheduleSync({
      ...data,
      projects: nextProjects,
      zones: nextZones,
      issues: [...data.issues, ...restoredIssues]
    });
    showToast(`Đã khôi phục ${formatZoneLabel(seedZone)}`);
  };

  const handleExportExcel = () => {
    const { projs, zones, issues, plans } = scopedData;
    const zids = new Set(zones.map((z) => z.id));
    const dates = [
      ...new Set(
        [...issues, ...plans].filter((x) => zids.has(x.zone_id)).map((x) => x.date)
      )
    ].sort();

    const header = ['PROJECT', 'LEVEL', 'ZONE / POUR', 'CURRENT', 'NEXT PLAN', ...dates.map(fmtShort)];
    const aoa = [header];

    projs.forEach((p) => {
      const pz = zones.filter((z) => z.project_id === p.id);
      const levels = [...new Set(pz.map((z) => z.level))].sort(lvlSort);
      levels.forEach((lv) => {
        const lz = pz.filter((z) => z.level === lv).sort((a, b) => a.sort - b.sort);
        lz.forEach((z) => {
          const zIss = issues
            .filter((i) => i.zone_id === z.id)
            .sort((a, b) => (a.date < b.date ? 1 : -1));
          const zPl = plans
            .filter((pl) => pl.zone_id === z.id)
            .sort((a, b) => (a.date < b.date ? -1 : 1));
          const issDates = new Set(zIss.map((i) => i.date));
          const plDates = new Set(zPl.map((pl) => pl.date));

          aoa.push([
            p.name,
            lv,
            z.zone || '-',
            zIss[0] ? zIss[0].date : '-',
            zPl[0] ? zPl[0].date : '-',
            ...dates.map((ds) => (issDates.has(ds) ? '✓' : plDates.has(ds) ? 'PLAN' : ''))
          ]);
        });
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, 'Drawing Tracker');
    XLSX.writeFile(wb, `APEX_Drawing_Tracker_${todayStr}.xlsx`);
  };

  return (
    <div className="dt-container">
      {/* Top Toolbar */}
      <div className="dt-toolbar-card">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Sub-view Switcher */}
          <div className="dt-pill-tabs">
            <button
              type="button"
              onClick={() => setSubTab('board')}
              className={`dt-pill-btn ${subTab === 'board' ? 'active' : ''}`}
            >
              <Table2 size={14} /> Bảng Tiến Độ
            </button>
            <button
              type="button"
              onClick={() => setSubTab('summary')}
              className={`dt-pill-btn ${subTab === 'summary' ? 'active' : ''}`}
            >
              <PieChart size={14} /> Tổng Hợp & Gantt
            </button>
          </div>

          {/* Project Filter (Direct PROJECT CODE from APEX_Project) */}
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="dt-select min-w-[180px]"
          >
            <option value="all">
              Tất cả Project ({trackedProjectsList.length}/{data.projects.length})
            </option>
            {trackedProjectsList.length > 0 && (
              <optgroup label={`Đang theo dõi (${trackedProjectsList.length})`}>
                {trackedProjectsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            )}
            {untrackedProjectsList.length > 0 && (
              <optgroup label={`APEX_Project khác (${untrackedProjectsList.length})`}>
                {untrackedProjectsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {/* Search Level / Zone */}
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm Level / Zone..."
              className="dt-input !pl-8 w-[170px]"
            />
          </div>

          {/* Board Column Mode & Month Nav */}
          {subTab === 'board' && (
            <>
              <select
                value={boardMode}
                onChange={(e) => setBoardMode(e.target.value)}
                className="dt-select"
              >
                <option value="dates">Cột = Ngày phát hành</option>
                <option value="month">Cột = Lịch tháng</option>
              </select>

              {boardMode === 'month' && (
                <div className="inline-flex items-center gap-1 bg-[var(--bg-surface)] px-1.5 py-0.5 rounded-lg border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => {
                      if (viewMonth === 0) {
                        setViewMonth(11);
                        setViewYear((y) => y - 1);
                      } else {
                        setViewMonth((m) => m - 1);
                      }
                    }}
                    className="p-1 hover:text-indigo-400 cursor-pointer"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-[12px] font-extrabold min-w-[92px] text-center">
                    Tháng {viewMonth + 1}/{viewYear}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (viewMonth === 11) {
                        setViewMonth(0);
                        setViewYear((y) => y + 1);
                      } else {
                        setViewMonth((m) => m + 1);
                      }
                    }}
                    className="p-1 hover:text-indigo-400 cursor-pointer"
                  >
                    <ChevronRight size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewYear(now.getFullYear());
                      setViewMonth(now.getMonth());
                      setTimeout(() => setScrollToTodayTrigger((n) => n + 1), 40);
                    }}
                    className="px-2 py-0.5 text-[11px] font-bold rounded bg-indigo-500/15 text-indigo-400 cursor-pointer"
                  >
                    Hôm nay
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Actions & Sync Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sync Indicator */}
          <div
            onClick={() => performLoad(false)}
            title="Click để làm mới dữ liệu từ Supabase"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border border-[var(--border)] bg-[var(--bg-surface)] cursor-pointer select-none"
          >
            {syncStatus === 'loading' || syncStatus === 'saving' ? (
              <>
                <RefreshCw size={12} className="animate-spin text-sky-500" />
                <span className="text-sky-500">
                  {syncStatus === 'loading' ? 'Đang tải…' : 'Đang lưu…'}
                </span>
              </>
            ) : syncStatus === 'synced' ? (
              <>
                <Cloud size={12} className="text-emerald-500" />
                <span className="text-emerald-500">✓ Đã đồng bộ</span>
              </>
            ) : (
              <>
                <HardDrive size={12} className="text-amber-500" />
                <span className="text-amber-500">Local Cache</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="dt-action-btn primary"
          >
            <Plus size={14} /> Thêm Level/Zone
          </button>

          <button type="button" onClick={handleExportExcel} className="dt-action-btn">
            <Download size={14} /> Excel
          </button>

          <button type="button" onClick={() => setShowDataModal(true)} className="dt-action-btn">
            <Database size={14} /> Dữ liệu
          </button>
        </div>
      </div>

      {/* Main Content */}
      {subTab === 'board' ? (
        <BoardView
          scopedData={scopedData}
          boardMode={boardMode}
          viewYear={viewYear}
          viewMonth={viewMonth}
          todayStr={todayStr}
          getProjectColor={getProjectColor}
          onOpenCell={(zoneId, initialDate, forceType = null) =>
            setCellModal({ zoneId, initialDate, forceType })
          }
          onDeleteZone={handleDeleteZone}
          scrollToTodayTrigger={scrollToTodayTrigger}
        />
      ) : (
        <SummaryView
          scopedData={scopedData}
          allZones={data.zones}
          todayStr={todayStr}
          getProjectColor={getProjectColor}
          isDark={isDark}
          onOpenCell={(zoneId, initialDate, forceType = null) =>
            setCellModal({ zoneId, initialDate, forceType })
          }
        />
      )}

      {/* Modals */}
      {cellModal && (
        <IssuePlanModal
          modalState={cellModal}
          projects={data.projects}
          zones={data.zones}
          issues={data.issues}
          plans={data.plans}
          todayStr={todayStr}
          onClose={() => setCellModal(null)}
          onSave={handleSaveCell}
          onDeleteRecord={handleDeleteRecord}
          onToast={showToast}
        />
      )}

      {showAddModal && (
        <AddRowOrProjectModal
          isOpen={showAddModal}
          defaultProjectId={filterProject}
          trackerProjects={data.projects}
          apexProjects={dashboardProjects}
          onClose={() => setShowAddModal(false)}
          onAddZones={handleAddZones}
          onAddProject={handleAddProject}
        />
      )}

      {showDataModal && (
        <DataManagementModal
          isOpen={showDataModal}
          data={data}
          canAdminReset={Boolean(isAdmin || isLeader)}
          onClose={() => setShowDataModal(false)}
          onImportJson={(imported) => {
            const importedNameMap = {};
            (imported.projects || []).forEach((ip) => {
              if (ip?.id && ip?.name) {
                importedNameMap[ip.id] = String(ip.name).trim().toUpperCase();
              }
            });
            const apexByCode = {};
            data.projects.forEach((ap) => {
              apexByCode[ap.name.trim().toUpperCase()] = ap.id;
            });
            const remappedZones = (imported.zones || []).map((z) => {
              let pid = LEGACY_PROJECT_ID_TO_APEX_UUID[z.project_id] || z.project_id;
              if (!data.projects.some((p) => p.id === pid)) {
                const code = importedNameMap[z.project_id];
                if (code === 'ENCLVE' && apexByCode['ENCLAVE']) pid = apexByCode['ENCLAVE'];
                else if (code && apexByCode[code]) pid = apexByCode[code];
              }
              return { ...z, project_id: pid };
            });
            scheduleSync({
              projects: data.projects,
              zones: remappedZones,
              issues: imported.issues || [],
              plans: imported.plans || []
            });
            setShowDataModal(false);
            showToast('Đã nạp dữ liệu JSON thành công & ánh xạ vào APEX_Project');
          }}
          onRestoreSeedZone={handleRestoreSeedZone}
          onResetToExcelSeed={() => {
            const fresh = getFreshTrackerSeed();
            scheduleSync({
              projects: data.projects,
              zones: fresh.zones,
              issues: fresh.issues,
              plans: fresh.plans
            });
            setFilterProject('all');
            setShowDataModal(false);
            showToast('Đã reset về dữ liệu chuẩn');
          }}
          onToast={showToast}
        />
      )}

      {/* Toast Notification with Optional Undo */}
      {toastInfo && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[250] flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 text-white border border-white/15 shadow-2xl text-[12.5px] font-semibold">
          <span>{toastInfo.message}</span>
          {toastInfo.actionLabel && toastInfo.onAction && (
            <button
              type="button"
              onClick={() => {
                toastInfo.onAction();
                setToastInfo(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-extrabold text-[11.5px] cursor-pointer hover:bg-emerald-400"
            >
              {toastInfo.actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DrawingTracker;
