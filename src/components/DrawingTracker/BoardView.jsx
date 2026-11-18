import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ExternalLink, Plus } from 'lucide-react';
import {
  ymd,
  fmtShort,
  fmtLong,
  isPlanLate,
  isUrl,
  lvlSort
} from '../../data/drawingTrackerSeed';

const BoardView = ({
  scopedData,
  boardMode,
  viewYear,
  viewMonth,
  todayStr,
  getProjectColor,
  onOpenCell,
  onDeleteZone,
  scrollToTodayTrigger
}) => {
  const { projs, zones, issues, plans } = scopedData;
  const [confirmDelId, setConfirmDelId] = useState(null);
  const todayThRef = useRef(null);

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

  const { rowsData, stats } = useMemo(() => {
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

    const structuredRows = [];

    projs.forEach((p) => {
      const pZones = zones.filter((z) => z.project_id === p.id);
      if (!pZones.length) return;

      const levels = [...new Set(pZones.map((z) => z.level))].sort(lvlSort);
      let isFirstInProj = true;

      levels.forEach((lv) => {
        const lZones = pZones
          .filter((z) => z.level === lv)
          .sort((a, b) => a.sort - b.sort || String(a.zone).localeCompare(String(b.zone)));

        lZones.forEach((z, idxInLevel) => {
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

          structuredRows.push({
            project: p,
            projRowSpan: isFirstInProj ? pZones.length : 0,
            level: lv,
            lvlRowSpan: idxInLevel === 0 ? lZones.length : 0,
            zone: z,
            latestIssue,
            nextPlan,
            byDateIssues,
            byDatePlans
          });

          isFirstInProj = false;
        });
      });
    });

    return {
      rowsData: structuredRows,
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

      {/* Matrix Grid */}
      <div className="dt-matrix-wrap custom-scrollbar">
        <table className="dt-matrix-table">
          <thead>
            <tr>
              <th className="dt-fix dt-col-proj">PROJECT</th>
              <th className="dt-fix dt-col-lvl">LEVEL</th>
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
            {rowsData.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 6} className="py-12 text-center text-[var(--text-muted)] font-bold">
                  Không có dữ liệu phù hợp. Bấm “+ Thêm Level/Zone” để khởi tạo dòng mới.
                </td>
              </tr>
            ) : (
              rowsData.map((row) => {
                const {
                  project,
                  projRowSpan,
                  level,
                  lvlRowSpan,
                  zone,
                  latestIssue,
                  nextPlan,
                  byDateIssues,
                  byDatePlans
                } = row;
                const nextLate = isPlanLate(nextPlan, todayStr);
                const projColor = getProjectColor(project);

                return (
                  <tr key={zone.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    {projRowSpan > 0 && (
                      <td
                        rowSpan={projRowSpan}
                        className="dt-fix dt-col-proj align-middle"
                        style={{ color: projColor }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: projColor }}
                          />
                          <span className="truncate">{project.name}</span>
                        </div>
                      </td>
                    )}

                    {lvlRowSpan > 0 && (
                      <td rowSpan={lvlRowSpan} className="dt-fix dt-col-lvl align-middle">
                        {level}
                      </td>
                    )}

                    <td className="dt-fix dt-col-zone">
                      <div className="flex items-center justify-between gap-1 px-1">
                        <span className={`truncate ${zone.zone ? 'font-semibold' : 'text-[var(--text-dim)]'}`}>
                          {zone.zone || '—'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleConfirmDelete(e, zone)}
                          className={`dt-zone-del ${confirmDelId === zone.id ? 'confirm' : ''}`}
                          title="Xóa dòng Zone này"
                        >
                          {confirmDelId === zone.id ? 'Xóa?' : '✕'}
                        </button>
                      </div>
                    </td>

                    <td className="dt-fix dt-col-cur">
                      {latestIssue ? (
                        isUrl(latestIssue.link) ? (
                          <a
                            href={latestIssue.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-500 hover:underline font-extrabold"
                            title={`${latestIssue.note ? latestIssue.note + ' · ' : ''}${fmtLong(latestIssue.date)}`}
                          >
                            <span>{fmtShort(latestIssue.date)}</span>
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span
                            className="text-emerald-500 font-extrabold"
                            title={`${latestIssue.note ? latestIssue.note + ' · ' : ''}${fmtLong(latestIssue.date)}`}
                          >
                            {fmtShort(latestIssue.date)}
                          </span>
                        )
                      ) : (
                        <span className="text-[var(--text-dim)]">—</span>
                      )}
                    </td>

                    <td
                      className={`dt-fix dt-col-plan ${
                        nextPlan ? (nextLate ? 'text-rose-500' : 'text-amber-500') : 'text-[var(--text-dim)]'
                      }`}
                      title={
                        nextPlan
                          ? `${nextLate ? 'TRỄ – ' : ''}Kế hoạch ${fmtLong(nextPlan.date)}${
                              nextPlan.note ? ' · ' + nextPlan.note : ''
                            }`
                          : ''
                      }
                    >
                      {nextPlan ? `${fmtShort(nextPlan.date)}${nextLate ? ' !' : ''}` : '—'}
                    </td>

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
          Click vào bất kỳ ô ngày nào để cập nhật Phát hành, Link bản vẽ hoặc Kế hoạch
        </span>
      </div>
    </div>
  );
};

export default BoardView;
