import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as CaretRight } from 'lucide-react';
import {
  ymd,
  fmtLong,
  toDate,
  daysAgo,
  isPlanLate,
  isUrl,
  lvlSort,
  formatZoneLabel,
  PALETTE_COLORS
} from '../../data/drawingTrackerSeed';

ChartJS.register(ArcElement, Tooltip, Legend);

const DAY_MS = 86400000;

const SummaryView = ({ scopedData, allZones, todayStr, getProjectColor, isDark, onOpenCell }) => {
  const { projs, zones, issues, plans } = scopedData;

  const [pieRange, setPieRange] = useState('all'); // 'all' | 'month' | '30' | '90'
  const [gGroup, setGGroup] = useState('zone'); // 'zone' | 'level' | 'project'
  const [gSpan, setGSpan] = useState(6); // 3 | 6 | 12
  const [gStart, setGStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 4, 1);
  });
  const [openProjects, setOpenProjects] = useState(() => new Set());
  const ganttRef = useRef(null);

  const today = useMemo(() => new Date(), []);
  const monthStartStr = useMemo(
    () => ymd(new Date(today.getFullYear(), today.getMonth(), 1)),
    [today]
  );

  const lastIssueDateByZone = useMemo(() => {
    const map = {};
    issues.forEach((i) => {
      if (!map[i.zone_id] || i.date > map[i.zone_id]) {
        map[i.zone_id] = i.date;
      }
    });
    return map;
  }, [issues]);

  const kpis = useMemo(() => {
    const issuedZones = zones.filter((z) => lastIssueDateByZone[z.id]).length;
    const pct = zones.length ? Math.round((issuedZones / zones.length) * 100) : 0;
    const latestAll = issues.reduce((m, i) => (i.date > m ? i.date : m), '');
    const thisMonthCount = issues.filter((i) => i.date >= monthStartStr).length;
    const lateCount = plans.filter((p) => isPlanLate(p, todayStr)).length;

    return {
      projCount: projs.length,
      zoneCount: zones.length,
      issuedZones,
      pct,
      totalIssues: issues.length,
      thisMonthCount,
      latestAll,
      planCount: plans.length,
      lateCount
    };
  }, [projs, zones, issues, plans, lastIssueDateByZone, monthStartStr, todayStr]);

  // Pie 1: Zone Status Breakdown
  const pie1Data = useMemo(() => {
    let fresh = 0;
    let old = 0;
    let planned = 0;
    let late = 0;
    let none = 0;

    const plansByZone = {};
    plans.forEach((p) => {
      if (!plansByZone[p.zone_id]) plansByZone[p.zone_id] = [];
      plansByZone[p.zone_id].push(p);
    });

    zones.forEach((z) => {
      const last = lastIssueDateByZone[z.id];
      if (!last) {
        const ps = plansByZone[z.id];
        if (!ps || ps.length === 0) none++;
        else if (ps.some((p) => isPlanLate(p, todayStr))) late++;
        else planned++;
      } else if (daysAgo(last, today) <= 30) {
        fresh++;
      } else {
        old++;
      }
    });

    const labels = [
      'Phát hành ≤ 30 ngày',
      'Phát hành > 30 ngày',
      'Chưa issue – có kế hoạch',
      'Chưa issue – trễ kế hoạch',
      'Chưa issue – chưa có KH'
    ];
    const values = [fresh, old, planned, late, none];
    const colors = ['#22c55e', '#86efac', '#fb923c', '#f43f5e', isDark ? '#334155' : '#e2e8f0'];

    return { labels, values, colors, total: values.reduce((a, b) => a + b, 0) };
  }, [zones, plans, lastIssueDateByZone, today, todayStr, isDark]);

  // Pie 2: By Project (or Level when 1 project selected)
  const pie2Data = useMemo(() => {
    const inRange = (iss) => {
      if (pieRange === 'all') return true;
      if (pieRange === 'month') return iss.date >= monthStartStr;
      const dAgo = daysAgo(iss.date, today);
      return dAgo >= 0 && dAgo <= Number(pieRange);
    };

    const filteredIssues = issues.filter(inRange);
    const zMap = Object.fromEntries(zones.map((z) => [z.id, z]));

    if (projs.length === 1) {
      const levels = [...new Set(zones.map((z) => z.level))].sort(lvlSort);
      const values = levels.map(
        (lv) => filteredIssues.filter((i) => zMap[i.zone_id]?.level === lv).length
      );
      const colors = levels.map((_, idx) => PALETTE_COLORS[idx % PALETTE_COLORS.length]);
      return {
        modeLabel: 'Level',
        labels: levels,
        values,
        colors,
        total: values.reduce((a, b) => a + b, 0)
      };
    }

    const labels = projs.map((p) => p.name);
    const values = projs.map(
      (p) => filteredIssues.filter((i) => zMap[i.zone_id]?.project_id === p.id).length
    );
    const colors = projs.map((p) => getProjectColor(p));
    return {
      modeLabel: 'Project',
      labels,
      values,
      colors,
      total: values.reduce((a, b) => a + b, 0)
    };
  }, [projs, zones, issues, pieRange, monthStartStr, today, getProjectColor]);

  // Gantt Timeline computation
  const ganttModel = useMemo(() => {
    const ppd = gSpan === 3 ? 14 : gSpan === 6 ? 7 : 3.5;
    const start = gStart;
    const end = new Date(start.getFullYear(), start.getMonth() + gSpan, 1);
    const totalDays = Math.round((end - start) / DAY_MS);
    const width = Math.max(400, Math.round(totalDays * ppd));
    const xOf = (d) => Math.round(((d - start) / DAY_MS) * ppd);
    const startStr = ymd(start);
    const endStr = ymd(new Date(end - DAY_MS));

    const months = [];
    const grids = [];
    for (let i = 0; i < gSpan; i++) {
      const ms = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const me = new Date(start.getFullYear(), start.getMonth() + i + 1, 1);
      months.push({
        key: `${ms.getFullYear()}-${ms.getMonth()}`,
        label: `T${ms.getMonth() + 1}/${ms.getFullYear()}`,
        left: xOf(ms),
        width: xOf(me) - xOf(ms)
      });
      grids.push({ key: `m-${i}`, left: xOf(ms), strong: true });
      if (gSpan <= 6) {
        for (let d = 8; d <= 28; d += 7) {
          const dd = new Date(ms.getFullYear(), ms.getMonth(), d);
          grids.push({ key: `w-${i}-${d}`, left: xOf(dd), strong: false });
        }
      }
    }

    const todayX = today >= start && today < end ? xOf(today) : null;
    const zoneLookup = Object.fromEntries((allZones || zones).map((z) => [z.id, z]));

    const buildRow = (key, label, rowIssues, rowPlans, color, isGroup = false, indent = false) => {
      let bar = null;
      if (rowIssues.length > 0) {
        const sortedDates = rowIssues.map((i) => i.date).sort();
        const firstD = sortedDates[0];
        const lastD = sortedDates[sortedDates.length - 1];
        if (lastD >= startStr && firstD <= endStr) {
          const l = Math.max(0, xOf(toDate(firstD)));
          const r = Math.min(width, xOf(toDate(lastD)));
          bar = { left: l, width: Math.max(r - l, 6), color };
        }
      }

      const dots = rowIssues
        .filter((i) => i.date >= startStr && i.date <= endStr)
        .map((i) => {
          const z = zoneLookup[i.zone_id];
          return {
            id: i.id,
            zoneId: i.zone_id,
            date: i.date,
            left: xOf(toDate(i.date)) + ppd / 2,
            color,
            link: i.link,
            tip: `${fmtLong(i.date)} · ${formatZoneLabel(z)}${i.note ? ' · ' + i.note : ''}${
              i.link ? '\n' + i.link : ''
            }`
          };
        });

      const planDots = rowPlans
        .filter((p) => p.date >= startStr && p.date <= endStr)
        .map((p) => {
          const z = zoneLookup[p.zone_id];
          const late = isPlanLate(p, todayStr);
          return {
            id: p.id,
            zoneId: p.zone_id,
            date: p.date,
            left: xOf(toDate(p.date)) + ppd / 2,
            late,
            tip: `${late ? 'TRỄ – ' : ''}Kế hoạch ${fmtLong(p.date)} · ${formatZoneLabel(z)}${
              p.note ? ' · ' + p.note : ''
            }`
          };
        });

      return { key, label, bar, dots, planDots, isGroup, indent, color };
    };

    const rows = [];
    projs.forEach((p) => {
      const pz = zones.filter((z) => z.project_id === p.id);
      if (!pz.length) return;
      const pzIds = new Set(pz.map((z) => z.id));
      const col = getProjectColor(p);
      const pIss = issues.filter((i) => pzIds.has(i.zone_id));
      const pPl = plans.filter((pl) => pzIds.has(pl.zone_id));

      if (gGroup === 'project') {
        rows.push(buildRow(`p-${p.id}`, p.name, pIss, pPl, col, false, false));
        return;
      }

      rows.push(buildRow(`grp-${p.id}`, p.name, pIss, pPl, col, true, false));
      const lvls = [...new Set(pz.map((z) => z.level))].sort(lvlSort);
      lvls.forEach((lv) => {
        const lz = pz.filter((z) => z.level === lv).sort((a, b) => a.sort - b.sort);
        const lzIds = new Set(lz.map((z) => z.id));
        if (gGroup === 'level') {
          rows.push(
            buildRow(
              `lv-${p.id}-${lv}`,
              lv,
              issues.filter((i) => lzIds.has(i.zone_id)),
              plans.filter((pl) => lzIds.has(pl.zone_id)),
              col,
              false,
              true
            )
          );
          return;
        }
        lz.forEach((z) => {
          rows.push(
            buildRow(
              `z-${z.id}`,
              formatZoneLabel(z),
              issues.filter((i) => i.zone_id === z.id),
              plans.filter((pl) => pl.zone_id === z.id),
              col,
              false,
              true
            )
          );
        });
      });
    });

    return { width, months, grids, todayX, rows };
  }, [projs, zones, allZones, issues, plans, gSpan, gStart, gGroup, today, todayStr, getProjectColor]);

  useEffect(() => {
    if (ganttRef.current && ganttModel.todayX !== null) {
      ganttRef.current.scrollLeft = Math.max(0, ganttModel.todayX - ganttRef.current.clientWidth + 280);
    }
  }, [gSpan, gGroup]);

  const toggleProjectExpand = (projId) => {
    setOpenProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projId)) next.delete(projId);
      else next.add(projId);
      return next;
    });
  };

  const renderDoughnutBlock = (chartModel) => {
    const dataObj = {
      labels: chartModel.labels,
      datasets: [
        {
          data: chartModel.total ? chartModel.values : [1],
          backgroundColor: chartModel.total
            ? chartModel.colors
            : [isDark ? '#1e293b' : '#e2e8f0'],
          borderWidth: 2,
          borderColor: isDark ? '#111827' : '#ffffff'
        }
      ]
    };

    return (
      <div className="flex items-center gap-5 flex-wrap sm:flex-nowrap">
        <div className="w-[165px] h-[165px] shrink-0">
          <Doughnut
            data={dataObj}
            options={{
              cutout: '62%',
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: { display: false },
                tooltip: { enabled: chartModel.total > 0 }
              }
            }}
          />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5 text-[12.5px]">
          {chartModel.labels.length === 0 ? (
            <span className="text-[var(--text-muted)]">Không có dữ liệu</span>
          ) : (
            chartModel.labels.map((lbl, idx) => {
              const val = chartModel.values[idx];
              const pct = chartModel.total ? Math.round((val / chartModel.total) * 100) : 0;
              return (
                <div key={lbl} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: chartModel.colors[idx] }}
                  />
                  <span className="truncate text-[var(--text-main)] font-medium">{lbl}</span>
                  <b className="ml-auto font-extrabold">{val}</b>
                  <span className="w-10 text-right text-[var(--text-muted)] text-[11.5px] font-semibold">
                    {pct}%
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const summarizeZoneSet = (zList) => {
    const ids = new Set(zList.map((z) => z.id));
    const subIssues = issues.filter((i) => ids.has(i.zone_id));
    const done = zList.filter((z) => lastIssueDateByZone[z.id]).length;
    const pct = zList.length ? Math.round((done / zList.length) * 100) : 0;
    const latest = subIssues.slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
    const missing = zList.filter((z) => !lastIssueDateByZone[z.id]).map(formatZoneLabel);
    const subPlans = plans
      .filter((p) => ids.has(p.zone_id))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    const lateCount = subPlans.filter((p) => isPlanLate(p, todayStr)).length;
    const thisMonth = subIssues.filter((i) => i.date >= monthStartStr).length;

    return {
      zoneCount: zList.length,
      done,
      pct,
      issueCount: subIssues.length,
      thisMonth,
      latest,
      missing,
      subPlans,
      lateCount
    };
  };

  return (
    <div className="dt-summary-scroll custom-scrollbar">
      {/* 8 KPI Cards */}
      <div className="dt-stats-grid">
        <div className="dt-stat-card">
          <span className="dt-stat-val">{kpis.projCount}</span>
          <span className="dt-stat-lbl">Projects</span>
        </div>
        <div className="dt-stat-card">
          <span className="dt-stat-val">{kpis.zoneCount}</span>
          <span className="dt-stat-lbl">Zone / Pour</span>
        </div>
        <div className="dt-stat-card">
          <span className="dt-stat-val text-emerald-500">{kpis.pct}%</span>
          <span className="dt-stat-lbl">
            Zone đã phát hành ({kpis.issuedZones}/{kpis.zoneCount})
          </span>
        </div>
        <div className="dt-stat-card">
          <span className="dt-stat-val text-sky-500">{kpis.totalIssues}</span>
          <span className="dt-stat-lbl">Tổng lần phát hành</span>
        </div>
        <div className="dt-stat-card">
          <span className="dt-stat-val text-indigo-500">{kpis.thisMonthCount}</span>
          <span className="dt-stat-lbl">Phát hành tháng {today.getMonth() + 1}</span>
        </div>
        <div className="dt-stat-card">
          <span className="dt-stat-val text-[16px]">
            {kpis.latestAll ? fmtLong(kpis.latestAll) : '—'}
          </span>
          <span className="dt-stat-lbl">Lần phát hành gần nhất</span>
        </div>
        <div className="dt-stat-card">
          <span className="dt-stat-val text-amber-500">{kpis.planCount}</span>
          <span className="dt-stat-lbl">Kế hoạch chưa issue</span>
        </div>
        <div className="dt-stat-card">
          <span className="dt-stat-val text-rose-500">{kpis.lateCount}</span>
          <span className="dt-stat-lbl">Kế hoạch đã trễ</span>
        </div>
      </div>

      {/* 2 Doughnut Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="dt-panel-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13.5px] font-extrabold uppercase tracking-wide">
              Trạng Thái Zone / Pour
            </h3>
          </div>
          {renderDoughnutBlock(pie1Data)}
        </div>

        <div className="dt-panel-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13.5px] font-extrabold uppercase tracking-wide">
              Số Lần Phát Hành Theo {pie2Data.modeLabel}
            </h3>
            <select
              value={pieRange}
              onChange={(e) => setPieRange(e.target.value)}
              className="dt-select !h-7 !text-[11.5px]"
            >
              <option value="all">Toàn bộ</option>
              <option value="month">Tháng này</option>
              <option value="30">30 ngày gần đây</option>
              <option value="90">90 ngày gần đây</option>
            </select>
          </div>
          {renderDoughnutBlock(pie2Data)}
        </div>
      </div>

      {/* Gantt Release Timeline */}
      <div className="dt-panel-card">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <h3 className="text-[13.5px] font-extrabold uppercase tracking-wide">
            Biểu Đồ Gantt – Lịch Sử & Kế Hoạch Phát Hành
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={gGroup}
              onChange={(e) => setGGroup(e.target.value)}
              className="dt-select !h-7 !text-[11.5px]"
            >
              <option value="zone">Theo Zone</option>
              <option value="level">Theo Level</option>
              <option value="project">Theo Project</option>
            </select>
            <select
              value={gSpan}
              onChange={(e) => {
                const span = Number(e.target.value);
                setGSpan(span);
                setGStart(new Date(today.getFullYear(), today.getMonth() - span + 2, 1));
              }}
              className="dt-select !h-7 !text-[11.5px]"
            >
              <option value={3}>3 tháng</option>
              <option value={6}>6 tháng</option>
              <option value={12}>12 tháng</option>
            </select>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setGStart(
                    new Date(
                      gStart.getFullYear(),
                      gStart.getMonth() - (gSpan > 3 ? 3 : 1),
                      1
                    )
                  )
                }
                className="dt-action-btn !h-7 !px-2"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() =>
                  setGStart(
                    new Date(
                      gStart.getFullYear(),
                      gStart.getMonth() + (gSpan > 3 ? 3 : 1),
                      1
                    )
                  )
                }
                className="dt-action-btn !h-7 !px-2"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        <div ref={ganttRef} className="dt-gantt-wrap custom-scrollbar">
          {/* Header Row */}
          <div className="dt-g-row head">
            <div className="dt-g-lbl">
              {gGroup === 'zone'
                ? 'PROJECT / LEVEL · ZONE'
                : gGroup === 'level'
                ? 'PROJECT / LEVEL'
                : 'PROJECT'}
            </div>
            <div className="dt-g-track" style={{ width: `${ganttModel.width}px` }}>
              {ganttModel.months.map((m) => (
                <div
                  key={m.key}
                  className="absolute top-0 bottom-0 border-l border-[var(--border)] px-2 flex items-center text-[11px] font-extrabold"
                  style={{ left: `${m.left}px`, width: `${m.width}px` }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Gantt Rows */}
          {ganttModel.rows.length === 0 ? (
            <div className="py-10 text-center text-[var(--text-muted)] text-sm">
              Không có dữ liệu hiển thị
            </div>
          ) : (
            ganttModel.rows.map((r) => (
              <div key={r.key} className={`dt-g-row ${r.isGroup ? 'grp' : ''}`}>
                <div
                  className="dt-g-lbl"
                  style={{
                    paddingLeft: r.indent ? '28px' : '12px',
                    color: r.isGroup ? r.color : 'var(--text-main)'
                  }}
                  title={r.label}
                >
                  {r.label}
                </div>
                <div className="dt-g-track" style={{ width: `${ganttModel.width}px` }}>
                  {ganttModel.grids.map((g) => (
                    <div
                      key={g.key}
                      className={`absolute top-0 bottom-0 ${
                        g.strong
                          ? 'border-l border-[var(--border)]'
                          : 'border-l border-dashed border-[var(--border)] opacity-50'
                      }`}
                      style={{ left: `${g.left}px` }}
                    />
                  ))}

                  {ganttModel.todayX !== null && (
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-amber-400 z-[2]"
                      style={{ left: `${ganttModel.todayX}px` }}
                      title="Hôm nay"
                    />
                  )}

                  {r.bar && (
                    <div
                      className="absolute top-[10px] h-[12px] rounded-full opacity-35"
                      style={{
                        left: `${r.bar.left}px`,
                        width: `${r.bar.width}px`,
                        backgroundColor: r.bar.color
                      }}
                    />
                  )}

                  {r.dots.map((d) =>
                    isUrl(d.link) ? (
                      <a
                        key={d.id}
                        href={d.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="dt-g-dot"
                        style={{ left: `${d.left}px`, backgroundColor: d.color }}
                        title={d.tip}
                      />
                    ) : (
                      <span
                        key={d.id}
                        onClick={() => onOpenCell(d.zoneId, d.date, 'issue')}
                        className="dt-g-dot"
                        style={{ left: `${d.left}px`, backgroundColor: d.color }}
                        title={d.tip}
                      />
                    )
                  )}

                  {r.planDots.map((pd) => (
                    <span
                      key={pd.id}
                      onClick={() => onOpenCell(pd.zoneId, pd.date, 'plan')}
                      className={`dt-g-dot plan ${pd.late ? 'late' : ''}`}
                      style={{ left: `${pd.left}px` }}
                      title={pd.tip}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 text-[11.5px] text-[var(--text-muted)] mt-2.5 flex-wrap">
          <span>● Chấm màu = 1 lần phát hành (click để mở file / chỉnh sửa)</span>
          <span>▬ Dải màu = khoảng từ lần phát hành đầu tiên → mới nhất</span>
          <span>○ Vòng cam = kế hoạch chưa issue (hồng đỏ = đã trễ)</span>
          <span className="inline-flex items-center gap-1">
            <i className="w-2.5 h-2.5 bg-amber-400 inline-block rounded-xs" /> Hôm nay
          </span>
        </div>
      </div>

      {/* Collapsible Summary Table */}
      <div className="dt-panel-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13.5px] font-extrabold uppercase tracking-wide">
            Bảng Tổng Hợp Tiến Độ Theo Dự Án
          </h3>
          <span className="text-[11.5px] text-[var(--text-muted)]">
            Click vào tên Project để xem chi tiết từng Level
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-surface)] text-[11px] font-extrabold uppercase text-[var(--text-muted)]">
                <th className="py-2.5 px-3">Project / Level</th>
                <th className="py-2.5 px-3 text-right">Số Zone</th>
                <th className="py-2.5 px-3">Tỷ Lệ Phát Hành</th>
                <th className="py-2.5 px-3 text-right">Lần PH</th>
                <th className="py-2.5 px-3 text-right">Tháng Này</th>
                <th className="py-2.5 px-3">Mới Nhất</th>
                <th className="py-2.5 px-3">Kế Hoạch Tới</th>
                <th className="py-2.5 px-3">Chưa Phát Hành</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {projs.map((p) => {
                const pz = zones.filter((z) => z.project_id === p.id);
                if (!pz.length) return null;
                const isOpen = openProjects.has(p.id);
                const sum = summarizeZoneSet(pz);
                const levels = [...new Set(pz.map((z) => z.level))].sort(lvlSort);
                const pColor = getProjectColor(p);

                return (
                  <React.Fragment key={p.id}>
                    <tr
                      onClick={() => toggleProjectExpand(p.id)}
                      className="cursor-pointer hover:bg-[var(--bg-hover)] transition-colors font-bold"
                    >
                      <td className="py-2.5 px-3 flex items-center gap-1.5" style={{ color: pColor }}>
                        {isOpen ? <ChevronDown size={15} /> : <CaretRight size={15} />}
                        <span>{p.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right">{sum.zoneCount}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full bg-[var(--bg-surface)] overflow-hidden border border-[var(--border)]">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${sum.pct}%` }}
                            />
                          </div>
                          <span className="text-[12px]">
                            {sum.done}/{sum.zoneCount} · {sum.pct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">{sum.issueCount}</td>
                      <td className="py-2.5 px-3 text-right">{sum.thisMonth}</td>
                      <td className="py-2.5 px-3">
                        {sum.latest ? (
                          isUrl(sum.latest.link) ? (
                            <a
                              href={sum.latest.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-emerald-500 hover:underline"
                            >
                              {fmtLong(sum.latest.date)}
                            </a>
                          ) : (
                            fmtLong(sum.latest.date)
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {sum.subPlans.length > 0 ? (
                          <span>
                            <span
                              className={
                                sum.lateCount > 0 ? 'text-rose-500 font-extrabold' : 'text-amber-500 font-bold'
                              }
                            >
                              {fmtLong(sum.subPlans[0].date)}
                            </span>{' '}
                            <span className="text-[11px] text-[var(--text-muted)] font-normal">
                              ({sum.subPlans.length} KH
                              {sum.lateCount > 0 ? `, ${sum.lateCount} trễ` : ''})
                            </span>
                          </span>
                        ) : (
                          <span className="text-[var(--text-dim)]">—</span>
                        )}
                      </td>
                      <td
                        className="py-2.5 px-3 max-w-[240px] truncate text-[12px] font-medium text-[var(--text-muted)]"
                        title={sum.missing.join(', ')}
                      >
                        {sum.missing.length > 0 ? (
                          sum.missing.join(', ')
                        ) : (
                          <span className="text-emerald-500 font-bold">Đủ 100%</span>
                        )}
                      </td>
                    </tr>

                    {isOpen &&
                      levels.map((lv) => {
                        const lvSum = summarizeZoneSet(pz.filter((z) => z.level === lv));
                        return (
                          <tr
                            key={`${p.id}-${lv}`}
                            className="bg-[var(--bg-surface)]/40 text-[var(--text-muted)] text-[12px]"
                          >
                            <td className="py-2 pl-9 pr-3 font-semibold">{lv}</td>
                            <td className="py-2 px-3 text-right">{lvSum.zoneCount}</td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-1.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500/80 rounded-full"
                                    style={{ width: `${lvSum.pct}%` }}
                                  />
                                </div>
                                <span>
                                  {lvSum.done}/{lvSum.zoneCount} · {lvSum.pct}%
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right">{lvSum.issueCount}</td>
                            <td className="py-2 px-3 text-right">{lvSum.thisMonth}</td>
                            <td className="py-2 px-3">
                              {lvSum.latest ? fmtLong(lvSum.latest.date) : '—'}
                            </td>
                            <td className="py-2 px-3">
                              {lvSum.subPlans.length > 0 ? fmtLong(lvSum.subPlans[0].date) : '—'}
                            </td>
                            <td className="py-2 px-3 max-w-[240px] truncate" title={lvSum.missing.join(', ')}>
                              {lvSum.missing.length > 0 ? (
                                lvSum.missing.join(', ')
                              ) : (
                                <span className="text-emerald-500 font-semibold">Đủ</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })}

              {projs.length > 1 && zones.length > 0 && (() => {
                const total = summarizeZoneSet(zones);
                return (
                  <tr className="bg-[var(--bg-surface)] font-black text-[var(--text-main)]">
                    <td className="py-2.5 px-3">TỔNG CỘNG</td>
                    <td className="py-2.5 px-3 text-right">{total.zoneCount}</td>
                    <td className="py-2.5 px-3">
                      {total.done}/{total.zoneCount} · {total.pct}%
                    </td>
                    <td className="py-2.5 px-3 text-right">{total.issueCount}</td>
                    <td className="py-2.5 px-3 text-right">{total.thisMonth}</td>
                    <td className="py-2.5 px-3">{total.latest ? fmtLong(total.latest.date) : '—'}</td>
                    <td className="py-2.5 px-3">
                      {total.subPlans.length > 0 ? `${total.subPlans.length} KH` : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      {total.missing.length > 0 ? `${total.missing.length} zone chưa PH` : 'Đủ'}
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SummaryView;
