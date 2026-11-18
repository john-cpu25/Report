import React, { useState, useEffect } from 'react';
import { Copy, ExternalLink, RotateCcw, Upload, Check, Plus, Trash2 } from 'lucide-react';
import {
  TRACKER_SEED,
  fmtLong,
  daysAgo,
  isPlanLate,
  isUrl,
  formatZoneLabel,
  ymd
} from '../../data/drawingTrackerSeed';

export const IssuePlanModal = ({
  modalState,
  projects,
  zones,
  issues,
  plans,
  todayStr,
  onClose,
  onSave,
  onDeleteRecord,
  onToast
}) => {
  if (!modalState) return null;

  const { zoneId, initialDate, forceType } = modalState;
  const zone = zones.find((z) => z.id === zoneId);
  if (!zone) return null;

  const project = projects.find((p) => p.id === zone.project_id);
  const existingIssue = issues.find((i) => i.zone_id === zoneId && i.date === initialDate) || null;
  const existingPlan = existingIssue
    ? null
    : plans.find((p) => p.zone_id === zoneId && p.date === initialDate) || null;

  const defaultType =
    forceType ||
    (existingIssue ? 'issue' : existingPlan ? 'plan' : initialDate > todayStr ? 'plan' : 'issue');

  const [type, setType] = useState(defaultType);
  const [date, setDate] = useState(initialDate || ymd());
  const [link, setLink] = useState(existingIssue ? existingIssue.link : '');
  const [note, setNote] = useState((existingIssue || existingPlan || {}).note || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setType(defaultType);
    setDate(initialDate || ymd());
    setLink(existingIssue ? existingIssue.link : '');
    setNote((existingIssue || existingPlan || {}).note || '');
    setConfirmDelete(false);
  }, [zoneId, initialDate, forceType]);

  const zoneHistory = issues
    .filter((i) => i.zone_id === zoneId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const zonePlans = plans
    .filter((p) => p.zone_id === zoneId)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const isIssueMode = type === 'issue';
  const modalTitle = isIssueMode
    ? existingIssue
      ? 'Bản vẽ đã phát hành'
      : existingPlan
      ? 'Xác nhận đã phát hành'
      : 'Đánh dấu phát hành'
    : existingPlan
    ? 'Kế hoạch phát hành'
    : 'Lập kế hoạch phát hành';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date) return;
    onSave({
      zoneId,
      type,
      date,
      link: link.trim(),
      note: note.trim(),
      existingIssue,
      existingPlan
    });
  };

  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDeleteRecord({ existingIssue, existingPlan });
  };

  return (
    <div className="dt-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dt-modal-box">
        <h2 className="text-[16px] font-black">{modalTitle}</h2>
        <p className="text-[12.5px] text-[var(--text-muted)] font-semibold mb-3">
          {project ? project.name : ''} · {formatZoneLabel(zone)}
        </p>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border)] mb-3.5">
          <button
            type="button"
            onClick={() => setType('issue')}
            className={`py-2 px-3 rounded-lg text-[12px] font-extrabold transition-all cursor-pointer ${
              isIssueMode
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            ✓ Đã phát hành
          </button>
          <button
            type="button"
            onClick={() => setType('plan')}
            className={`py-2 px-3 rounded-lg text-[12px] font-extrabold transition-all cursor-pointer ${
              !isIssueMode
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            ◷ Kế hoạch (chưa issue)
          </button>
        </div>

        {/* Warnings & Current Link */}
        {existingPlan && isPlanLate(existingPlan, todayStr) && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[12px] font-bold">
            ⚠ Kế hoạch {fmtLong(existingPlan.date)} đã trễ {daysAgo(existingPlan.date)} ngày – chưa issue
          </div>
        )}

        {existingIssue && existingIssue.link && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[12.5px]">
            <div className="flex items-center justify-between gap-2 break-all">
              {isUrl(existingIssue.link) ? (
                <a
                  href={existingIssue.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-500 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>{existingIssue.link}</span>
                  <ExternalLink size={13} />
                </a>
              ) : (
                <span className="font-mono text-[12px]">{existingIssue.link}</span>
              )}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(existingIssue.link);
                  onToast?.('Đã copy đường dẫn file');
                }}
                className="dt-action-btn !h-7 !px-2.5 text-[11px] shrink-0"
              >
                <Copy size={12} /> Copy
              </button>
            </div>
          </div>
        )}

        {/* Active Plans & History */}
        {zonePlans.length > 0 && (
          <div className="mb-3">
            <div className="text-[11px] font-extrabold uppercase text-[var(--text-muted)] mb-1">
              Kế hoạch chưa issue ({zonePlans.length})
            </div>
            <div className="max-h-[100px] overflow-y-auto rounded-lg border border-[var(--border)] divide-y divide-[var(--border)] text-[12px]">
              {zonePlans.map((p) => {
                const late = isPlanLate(p, todayStr);
                return (
                  <div key={p.id} className="flex justify-between px-2.5 py-1.5">
                    <span className={`font-bold ${late ? 'text-rose-500' : 'text-amber-500'}`}>
                      ◷ {fmtLong(p.date)} {late ? '– trễ' : ''}
                    </span>
                    <span className="text-[var(--text-muted)] truncate max-w-[220px]">{p.note}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {zoneHistory.length > 0 && (
          <div className="mb-3">
            <div className="text-[11px] font-extrabold uppercase text-[var(--text-muted)] mb-1">
              Lịch sử phát hành ({zoneHistory.length})
            </div>
            <div className="max-h-[120px] overflow-y-auto rounded-lg border border-[var(--border)] divide-y divide-[var(--border)] text-[12px]">
              {zoneHistory.map((h) => (
                <div key={h.id} className="flex justify-between items-center gap-2 px-2.5 py-1.5">
                  <span className="font-semibold">
                    {fmtLong(h.date)} {h.note ? `· ${h.note}` : ''}
                  </span>
                  {isUrl(h.link) ? (
                    <a
                      href={h.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-500 hover:underline truncate max-w-[200px]"
                    >
                      Mở file ↗
                    </a>
                  ) : (
                    <span className="text-[var(--text-dim)] truncate max-w-[180px]">
                      {h.link || '(chưa gắn link)'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11.5px] font-bold text-[var(--text-muted)]">
              {isIssueMode ? 'Ngày phát hành thực tế' : 'Ngày dự kiến phát hành'}
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="dt-input w-full"
            />
          </div>

          {isIssueMode && (
            <div className="flex flex-col gap-1">
              <label className="text-[11.5px] font-bold text-[var(--text-muted)]">
                Đường link lưu file (SharePoint / Google Drive / NAS – tùy chọn)
              </label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://... hoặc \\server\folder\file.pdf"
                className="dt-input w-full"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[11.5px] font-bold text-[var(--text-muted)]">
              Ghi chú (Revision, nội dung phát hành...)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Rev B – Issued for Construction (IFC)"
              className="dt-input w-full"
            />
          </div>

          <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-[var(--border)]">
            {(existingIssue || existingPlan) && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="dt-action-btn danger mr-auto"
              >
                <Trash2 size={13} />
                {confirmDelete
                  ? 'Bấm lần nữa để xóa'
                  : existingIssue
                  ? 'Bỏ phát hành'
                  : 'Xóa kế hoạch'}
              </button>
            )}
            <button type="button" onClick={onClose} className="dt-action-btn">
              Hủy
            </button>
            <button type="submit" className="dt-action-btn primary">
              <Check size={14} />
              {isIssueMode && existingPlan ? 'Xác nhận đã phát hành' : 'Lưu cập nhật'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const AddRowOrProjectModal = ({
  isOpen,
  defaultProjectId,
  trackerProjects,
  onClose,
  onAddZones
}) => {
  if (!isOpen) return null;

  const [projectId, setProjectId] = useState(
    defaultProjectId && defaultProjectId !== 'all'
      ? defaultProjectId
      : trackerProjects[0]?.id || ''
  );
  const [level, setLevel] = useState('');
  const [zonesInput, setZonesInput] = useState('');

  useEffect(() => {
    setProjectId(
      defaultProjectId && defaultProjectId !== 'all'
        ? defaultProjectId
        : trackerProjects[0]?.id || ''
    );
  }, [defaultProjectId, trackerProjects, isOpen]);

  const handleZoneSubmit = (e) => {
    e.preventDefault();
    if (!projectId || !level.trim()) return;
    onAddZones({
      projectId,
      level: level.trim(),
      zonesStr: zonesInput
    });
  };

  return (
    <div className="dt-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dt-modal-box">
        <h2 className="text-[16px] font-black mb-1">Thêm Level / Zone Theo Dõi</h2>
        <p className="text-[12px] text-[var(--text-muted)] mb-3">
          Danh sách Project Code đồng bộ trực tiếp từ bảng <b>APEX_Project</b> trên Supabase.
        </p>

        <form onSubmit={handleZoneSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11.5px] font-bold text-[var(--text-muted)]">
              Project Code (APEX_Project)
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="dt-select w-full"
              required
            >
              {trackerProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.full_name && p.full_name.toUpperCase() !== p.name ? ` — ${p.full_name}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11.5px] font-bold text-[var(--text-muted)]">Level</label>
            <input
              type="text"
              required
              autoFocus
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="VD: L3, B1, GF, RF..."
              className="dt-input w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11.5px] font-bold text-[var(--text-muted)]">
              Zone / Pour (tùy chọn – nhập nhiều zone cách nhau bởi dấu phẩy)
            </label>
            <input
              type="text"
              value={zonesInput}
              onChange={(e) => setZonesInput(e.target.value)}
              placeholder="Để trống nếu không chia zone. VD: ZONE A, ZONE B, POUR 1"
              className="dt-input w-full"
            />
          </div>

          <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-[var(--border)]">
            <button type="button" onClick={onClose} className="dt-action-btn">
              Hủy
            </button>
            <button type="submit" className="dt-action-btn primary">
              <Plus size={14} /> Thêm vào bảng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const DataManagementModal = ({
  isOpen,
  data,
  canAdminReset,
  onClose,
  onImportJson,
  onRestoreSeedZone,
  onResetToExcelSeed,
  onToast
}) => {
  if (!isOpen) return null;

  const [jsonText, setJsonText] = useState(() => JSON.stringify(data, null, 2));
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setJsonText(JSON.stringify(data, null, 2));
    setConfirmReset(false);
  }, [data, isOpen]);

  const deletedSeedZones = TRACKER_SEED.zones.filter(
    (sz) =>
      !data.zones.some(
        (z) => z.project_id === sz.project_id && z.level === sz.level && z.zone === sz.zone
      )
  );

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed.projects) || !Array.isArray(parsed.zones) || !Array.isArray(parsed.issues)) {
        throw new Error('Invalid schema');
      }
      parsed.plans = Array.isArray(parsed.plans) ? parsed.plans : [];
      onImportJson(parsed);
    } catch {
      onToast?.('JSON không hợp lệ! Cần có mảng projects, zones, issues.');
    }
  };

  return (
    <div className="dt-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dt-modal-box !w-[580px]">
        <h2 className="text-[16px] font-black">Quản Lý Dữ Liệu & Khôi Phục (JSON)</h2>
        <p className="text-[12px] text-[var(--text-muted)] mb-3">
          Cấu trúc 4 bảng đồng bộ trực tiếp với Supabase: <b>APEX_Tracker_Project</b>, <b>Zone</b>, <b>Issue</b>, <b>Plan</b>.
        </p>

        {/* Deleted Seed Rows */}
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase text-[var(--text-muted)] mb-1">
            Dòng đã xóa so với file Excel gốc ({deletedSeedZones.length})
          </div>
          <div className="max-h-[120px] overflow-y-auto rounded-lg border border-[var(--border)] divide-y divide-[var(--border)] text-[12px]">
            {deletedSeedZones.length === 0 ? (
              <div className="px-3 py-2 text-[var(--text-dim)]">Không có dòng gốc nào bị xóa</div>
            ) : (
              deletedSeedZones.map((sz) => {
                const sp = TRACKER_SEED.projects.find((p) => p.id === sz.project_id);
                return (
                  <div key={sz.id} className="flex items-center justify-between px-3 py-1.5">
                    <span className="font-semibold">
                      {sp?.name} · {formatZoneLabel(sz)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRestoreSeedZone(sz)}
                      className="dt-action-btn !h-6 !px-2 text-[11px]"
                    >
                      Khôi phục
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          className="w-full h-[200px] p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] font-mono text-[11.5px] outline-none"
        />

        <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-[var(--border)] flex-wrap">
          {canAdminReset && (
            <button
              type="button"
              onClick={() => {
                if (!confirmReset) {
                  setConfirmReset(true);
                  return;
                }
                onResetToExcelSeed();
              }}
              className="dt-action-btn danger mr-auto"
            >
              <RotateCcw size={13} />
              {confirmReset ? 'Xác nhận ghi đè gốc?' : 'Reset về Excel gốc'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(jsonText);
              onToast?.('Đã copy JSON vào Clipboard');
            }}
            className="dt-action-btn"
          >
            <Copy size={13} /> Copy JSON
          </button>
          <button type="button" onClick={handleImport} className="dt-action-btn indigo">
            <Upload size={13} /> Nạp JSON
          </button>
          <button type="button" onClick={onClose} className="dt-action-btn">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
