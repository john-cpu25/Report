
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, Layers, Users, Clock } from 'lucide-react';
import { formatDuration } from '../../utils/csvHelpers';

const StatCards = ({ filteredData }) => {
  const stats = useMemo(() => {
    const totalLogs = filteredData.length;
    const projects = new Set(filteredData.map(r => r.project)).size;
    const users = new Set(filteredData.map(r => r.createdBy || r.userName)).size;
    const totalMinutes = filteredData.reduce((acc, r) => acc + (r.time1 || 0), 0);
    
    return [
      { label: 'Total Records', value: totalLogs, icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
      { label: 'Unique Projects', value: projects, icon: Layers, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
      { label: 'Active Personnel', value: users, icon: Users, color: 'text-amber-400', bg: 'bg-amber-400/10' },
      { label: 'Total Time (T1)', value: formatDuration(totalMinutes), icon: Clock, color: 'text-rose-400', bg: 'bg-rose-400/10' },
    ];
  }, [filteredData]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[10px]">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="ocd-card relative overflow-hidden group hover:border-indigo-500/30 transition-all shadow-lg"
        >
          <div className="flex justify-between items-start relative z-10">
            <div className={`p-3 ${stat.bg} ${stat.color} rounded-[8px] border border-[var(--border)] shadow-inner`}>
              <stat.icon size={20} />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-80">{stat.label}</p>
              <p className="text-2xl font-black text-[var(--text-contrast)] mt-1">
                {stat.value}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-emerald-400/60 text-[9px] font-black uppercase tracking-widest relative z-10">
            <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            <span>Analytical Data Verified</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default StatCards;
