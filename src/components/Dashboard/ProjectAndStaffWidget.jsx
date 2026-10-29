import React from 'react';
import { motion } from 'framer-motion';
import { Clock, UserCheck } from 'lucide-react';

/**
 * ProjectAndStaffWidget (CỘT 1 - 1/3 Dashboard)
 * Bảng Đôi Hợp Nhất theo tỷ lệ 1/2 : 1/2:
 * - Nửa trái (1/2): PROJECT HOURS (Chấm màu + chữ đen/theme, List (h), Timesheet)
 * - Nửa phải (1/2): STAFF PERFORMANCE (Bỏ chữ 7 members, User Name, Financial %, Workforce %)
 * - Phân cấp đậm chữ chỉ còn 2 cấp:
 *   + Cấp 1 (Không đậm): Tiêu đề cột (PROJECT KEY, LIST, TIMESHEET, USER NAME, FINANCIAL, WORKFORCE) & các dòng dữ liệu (font-medium / normal).
 *   + Cấp 2 (Đậm): Tiêu đề bảng (PROJECT HOURS, STAFF PERFORMANCE) & Dòng tổng kết (TOTAL HOURS, TEAM AVERAGE).
 */
const ProjectAndStaffWidget = ({
  projects = [],
  totalListHours = 0,
  totalTimesheetHours = 0,
  staff = [],
  avgFinancial = 0,
  avgWorkforce = 0,
  timeRange = 'WEEK',
  isDark = false
}) => {
  const formatHours = (val) => {
    const num = Number(val) || 0;
    if (num === 0) return '0.0h';
    return num >= 1000 ? `${Math.round(num).toLocaleString('vi-VN')}h` : `${num.toFixed(1)}h`;
  };

  return (
    <div 
      className="team-card flex flex-col h-full overflow-hidden relative select-none !p-[10px]"
      style={{ padding: '10px' }}
    >
      <div 
        className="grid grid-cols-2 h-full overflow-hidden"
        style={{ gap: '10px' }}
      >
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CỘT 1 (NỬA TRÁI - 1/2): PROJECT HOURS                           */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div 
          className="flex flex-col h-full overflow-hidden border-r border-slate-200/80 dark:border-white/10"
          style={{ paddingRight: '10px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200/80 dark:border-white/10 shrink-0 px-2.5">
            <h4 className="text-[13px] 2xl:text-[14px] font-black uppercase tracking-tight text-[var(--text-main)] truncate">
              PROJECT HOURS
            </h4>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-slate-200/60 dark:border-white/10 text-[var(--text-muted)] shrink-0">
              {projects.length} PROJECTS
            </span>
          </div>

          {/* Table Column Headers (Cấp 1: Không còn đậm nữa) */}
          <div className="grid grid-cols-12 gap-1 px-2.5 py-1.5 text-[11px] 2xl:text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)]/70 rounded-md shrink-0 border border-slate-200/60 dark:border-white/10 mb-1.5">
            <div className="col-span-6 flex items-center min-w-0">
              <span className="truncate">PROJECT KEY</span>
            </div>
            <div className="col-span-3 text-right flex items-center justify-end text-[var(--text-muted)]">
              <span>LIST (h)</span>
            </div>
            <div className="col-span-3 text-right flex items-center justify-end text-[var(--text-muted)] pr-2.5">
              <span>TIMESHEET</span>
            </div>
          </div>

          {/* Scrollable Project List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0 space-y-[6px]">
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-4 text-center text-[var(--text-muted)] opacity-60">
                <Clock size={18} className="mb-1" />
                <p className="text-[11px] font-medium uppercase tracking-wider">Không có dữ liệu</p>
              </div>
            ) : (
              projects.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="grid grid-cols-12 gap-1 items-center px-2.5 py-1 rounded-md hover:bg-[var(--bg-hover)] transition-colors border border-transparent hover:border-slate-200/60 dark:hover:border-white/10 text-[12px]"
                >
                  {/* Chữ project không còn màu nữa, chỉ thể hiện chấm màu ở phía trước */}
                  <div className="col-span-6 flex items-center min-w-0 pr-1">
                    <span 
                      className="w-2 h-2 rounded-full shrink-0 mr-2"
                      style={{ backgroundColor: p.color || '#6366f1' }}
                    />
                    <span
                      className="font-medium truncate text-[12px] text-[var(--text-main)]"
                      title={p.name && p.name !== p.key ? `${p.key} — ${p.name}` : (p.key || p.name)}
                    >
                      {p.key || p.name}
                    </span>
                  </div>

                  {/* Cột 1: Giờ từ PERSONAL \ list (Cấp 1: font-medium bình thường) */}
                  <div className="col-span-3 text-right font-medium font-mono tabular-nums text-[var(--text-main)] text-[12px]">
                    {formatHours(p.listHours)}
                  </div>

                  {/* Cột 2: Giờ từ PERSONAL \ time sheet (Cấp 1: font-medium bình thường, lùi vào 10px) */}
                  <div className="col-span-3 text-right font-medium font-mono tabular-nums pr-2.5 text-[var(--text-main)] text-[12px]">
                    {formatHours(p.timesheetHours)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Totals (Cấp 2: ĐẬM - font-black) */}
          <div className="grid grid-cols-12 gap-1 px-2.5 py-1.5 mt-1 border-t border-slate-200/80 dark:border-white/10 text-[11px] 2xl:text-[12px] font-black uppercase tracking-wider shrink-0 bg-[var(--bg-surface)]/50 rounded-b-md">
            <div className="col-span-6 text-[var(--text-main)] font-black flex items-center min-w-0">
              <span className="truncate">TOTAL HOURS</span>
            </div>
            <div className="col-span-3 text-right font-mono font-black text-black dark:text-white text-[11px] 2xl:text-[12px]">
              {formatHours(totalListHours)}
            </div>
            <div className="col-span-3 text-right pr-2.5 font-mono font-black text-black dark:text-white text-[11px] 2xl:text-[12px]">
              {formatHours(totalTimesheetHours)}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CỘT 2 (NỬA PHẢI - 1/2): STAFF PERFORMANCE                       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div 
          className="flex flex-col h-full overflow-hidden"
          style={{ paddingLeft: '10px', paddingRight: '4px' }}
        >
          {/* Header (Đã bỏ chữ 7 MEMBERS theo yêu cầu hình 1) */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200/80 dark:border-white/10 shrink-0 px-2.5">
            <h4 className="text-[13px] 2xl:text-[14px] font-black uppercase tracking-tight text-[var(--text-main)] truncate">
              STAFF PERFORMANCE
            </h4>
          </div>

          {/* Table Column Headers (Cấp 1: Không còn đậm nữa) */}
          <div className="grid grid-cols-12 gap-1 px-2.5 py-1.5 text-[11px] 2xl:text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)]/70 rounded-md shrink-0 border border-slate-200/60 dark:border-white/10 mb-1.5">
            <div className="col-span-6 flex items-center min-w-0">
              <span className="truncate">USER NAME</span>
            </div>
            <div className="col-span-3 text-right flex items-center justify-end text-[var(--text-muted)]">
              <span>FINANCIAL</span>
            </div>
            <div className="col-span-3 text-right flex items-center justify-end text-[var(--text-muted)] pr-2.5">
              <span>WORKFORCE</span>
            </div>
          </div>

          {/* Scrollable Staff List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 min-h-0 space-y-[6px]">
            {staff.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-4 text-center text-[var(--text-muted)] opacity-60">
                <UserCheck size={18} className="mb-1" />
                <p className="text-[11px] font-medium uppercase tracking-wider">Không tìm thấy</p>
              </div>
            ) : (
              staff.map((u, idx) => (
                <div
                  key={u.id || idx}
                  className="grid grid-cols-12 gap-1 items-center px-2.5 py-1 rounded-md hover:bg-[var(--bg-hover)] transition-colors border border-transparent hover:border-slate-200/60 dark:hover:border-white/10 text-[12px]"
                >
                  {/* User Name + Team (Cấp 1: font-medium bình thường) */}
                  <div className="col-span-6 flex flex-col justify-center min-w-0 pr-1">
                    <span className="font-medium text-[var(--text-main)] truncate text-[12px]" title={u.name}>
                      {u.name}
                    </span>
                    {u.team && (
                      <span className="text-[10px] font-mono font-normal text-[var(--text-dim)] uppercase tracking-wider truncate">
                        {u.team}
                      </span>
                    )}
                  </div>

                  {/* Financial (%) (Cấp 1: font-medium bình thường) */}
                  <div className="col-span-3 text-right font-medium font-mono tabular-nums text-[var(--text-main)] text-[12px]">
                    {Number(u.financial || 0).toFixed(1)}%
                  </div>

                  {/* Workforce Utilization (%) (Cấp 1: font-medium bình thường, lùi vào 10px) */}
                  <div className="col-span-3 text-right font-medium font-mono tabular-nums pr-2.5 text-[var(--text-main)] text-[12px]">
                    {Number(u.workforceUtil || 0).toFixed(1)}%
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Average Totals (Cấp 2: ĐẬM - font-black) */}
          <div className="grid grid-cols-12 gap-1 px-2.5 py-1.5 mt-1 border-t border-slate-200/80 dark:border-white/10 text-[11px] 2xl:text-[12px] font-black uppercase tracking-wider shrink-0 bg-[var(--bg-surface)]/50 rounded-b-md">
            <div className="col-span-6 text-[var(--text-main)] font-black flex items-center min-w-0">
              <span className="truncate">TEAM AVERAGE</span>
            </div>
            <div className="col-span-3 text-right font-mono font-black text-black dark:text-white text-[11px] 2xl:text-[12px]">
              {Number(avgFinancial || 0).toFixed(1)}%
            </div>
            <div className="col-span-3 text-right pr-2.5 font-mono font-black text-black dark:text-white text-[11px] 2xl:text-[12px]">
              {Number(avgWorkforce || 0).toFixed(1)}%
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default React.memo(ProjectAndStaffWidget);
