import React from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

/**
 * ProjectTimeBreakdownWidget
 * - Chấm màu ở phía trước, chữ project không màu (text-[var(--text-main)])
 * - Tiêu đề cột font-medium (không đậm)
 * - Riêng Tiêu đề bảng & Total in đậm (phân cấp 2 cấp độ)
 */
const ProjectTimeBreakdownWidget = ({
  projects = [],
  totalListHours = 0,
  totalTimesheetHours = 0,
  timeRange = 'WEEK',
  isDark = false
}) => {
  const formatHours = (val) => {
    const num = Number(val) || 0;
    if (num === 0) return '0.0h';
    return num >= 1000 ? `${Math.round(num).toLocaleString('vi-VN')}h` : `${num.toFixed(1)}h`;
  };

  return (
    <div className="team-card flex flex-col h-full overflow-hidden relative select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-[var(--glass-border)] shrink-0">
        <h4 className="text-[16px] font-black uppercase tracking-tight text-[var(--text-main)]">
          PROJECT HOURS
        </h4>

        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-medium px-2.5 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--glass-border)] text-[var(--text-muted)]">
            {projects.length} PROJECTS
          </span>
        </div>
      </div>

      {/* Table Column Headers (Cấp 1: Không đậm) */}
      <div className="grid grid-cols-12 gap-1 px-2.5 py-1.5 text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)]/60 rounded-lg shrink-0 border border-[var(--glass-border)] mb-1">
        <div className="col-span-6 flex items-center gap-1">
          <span>PROJECT KEY</span>
        </div>
        <div className="col-span-3 text-right pr-1 flex items-center justify-end text-[var(--text-muted)]">
          <span>LIST (h)</span>
        </div>
        <div className="col-span-3 text-right pr-1 flex items-center justify-end text-[var(--text-muted)]">
          <span>TIMESHEET</span>
        </div>
      </div>

      {/* Scrollable Project List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0 space-y-[6px]">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-6 text-center text-[var(--text-muted)] opacity-60">
            <Clock size={20} className="mb-1" />
            <p className="text-[12px] font-medium uppercase tracking-wider">Không có dữ liệu dự án</p>
          </div>
        ) : (
          projects.map((p, idx) => (
            <div
              key={p.id || idx}
              className="grid grid-cols-12 gap-1 items-center px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors border border-transparent hover:border-[var(--glass-border)] text-[12px]"
            >
              {/* Chấm màu phía trước + chữ màu theme không màu */}
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

              {/* Cột 1: Giờ từ PERSONAL \ list */}
              <div className="col-span-3 text-right font-medium font-mono tabular-nums pr-1 text-[var(--text-main)] text-[12px]">
                {formatHours(p.listHours)}
              </div>

              {/* Cột 2: Giờ từ PERSONAL \ time sheet */}
              <div className="col-span-3 text-right font-medium font-mono tabular-nums pr-1 text-[var(--text-main)] text-[12px]">
                {formatHours(p.timesheetHours)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Totals (Cấp 2: ĐẬM) */}
      <div className="grid grid-cols-12 gap-1 px-2.5 py-2 mt-1 border-t border-[var(--glass-border)] text-[12px] font-black uppercase tracking-wider shrink-0 bg-[var(--bg-surface)]/40 rounded-b-lg">
        <div className="col-span-6 text-[var(--text-main)] font-black flex items-center gap-1">
          <span>TOTAL HOURS</span>
        </div>
        <div className="col-span-3 text-right pr-1 font-mono font-black text-black dark:text-white text-[12px]">
          {formatHours(totalListHours)}
        </div>
        <div className="col-span-3 text-right pr-1 font-mono font-black text-black dark:text-white text-[12px]">
          {formatHours(totalTimesheetHours)}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProjectTimeBreakdownWidget);
