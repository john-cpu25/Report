import React from 'react';
import { motion } from 'framer-motion';
import { UserCheck } from 'lucide-react';

/**
 * StaffPerformanceWidget
 * - Bỏ chữ members ở Header
 * - Tiêu đề cột font-medium (không đậm)
 * - Phân cấp 2 cấp độ: Tiêu đề & Footer đậm, nội dung và header cột không đậm
 */
const StaffPerformanceWidget = ({
  staff = [],
  avgFinancial = 0,
  avgWorkforce = 0,
  canViewAllTeams = true,
  chartTeam = 'ALL',
  isDark = false
}) => {
  return (
    <div className="team-card flex flex-col h-full overflow-hidden relative select-none">
      {/* Header (Bỏ badge members) */}
      <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-[var(--glass-border)] shrink-0">
        <h4 className="text-[16px] font-black uppercase tracking-tight text-[var(--text-main)]">
          STAFF PERFORMANCE
        </h4>
      </div>

      {/* Table Column Headers (Cấp 1: Không đậm) */}
      <div className="grid grid-cols-12 gap-1 px-2.5 py-1.5 text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)]/60 rounded-lg shrink-0 border border-[var(--glass-border)] mb-1">
        <div className="col-span-6 flex items-center gap-1">
          <span>USER NAME</span>
        </div>
        <div className="col-span-3 text-right pr-1 flex items-center justify-end text-[var(--text-muted)]">
          <span>FINANCIAL</span>
        </div>
        <div className="col-span-3 text-right pr-1 flex items-center justify-end text-[var(--text-muted)]">
          <span>WORKFORCE</span>
        </div>
      </div>

      {/* Scrollable Staff List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0 space-y-[6px]">
        {staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-6 text-center text-[var(--text-muted)] opacity-60">
            <UserCheck size={20} className="mb-1" />
            <p className="text-[12px] font-medium uppercase tracking-wider">Không tìm thấy thành viên</p>
          </div>
        ) : (
          staff.map((u, idx) => {
            return (
              <div
                key={u.id || idx}
                className="grid grid-cols-12 gap-1 items-center px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors border border-transparent hover:border-[var(--glass-border)] text-[12px]"
              >
                {/* User Name + Team */}
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

                {/* Financial (%) */}
                <div className="col-span-3 text-right pr-1 font-medium font-mono tabular-nums text-[var(--text-main)] text-[12px]">
                  {Number(u.financial || 0).toFixed(1)}%
                </div>

                {/* Workforce Utilization (%) */}
                <div className="col-span-3 text-right pr-1 font-medium font-mono tabular-nums text-[var(--text-main)] text-[12px]">
                  {Number(u.workforceUtil || 0).toFixed(1)}%
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Average Totals (Cấp 2: ĐẬM) */}
      <div className="grid grid-cols-12 gap-1 px-2.5 py-2 mt-1 border-t border-[var(--glass-border)] text-[12px] font-black uppercase tracking-wider shrink-0 bg-[var(--bg-surface)]/40 rounded-b-lg">
        <div className="col-span-6 text-[var(--text-main)] font-black flex items-center gap-1">
          <span>TEAM AVERAGE</span>
        </div>
        <div className="col-span-3 text-right pr-1 font-mono font-black text-black dark:text-white text-[12px]">
          {Number(avgFinancial || 0).toFixed(1)}%
        </div>
        <div className="col-span-3 text-right pr-1 font-mono font-black text-black dark:text-white text-[12px]">
          {Number(avgWorkforce || 0).toFixed(1)}%
        </div>
      </div>
    </div>
  );
};

export default React.memo(StaffPerformanceWidget);
