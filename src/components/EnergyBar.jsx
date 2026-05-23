import React from 'react';
import { motion } from 'framer-motion';

const EnergyBar = ({ used, total }) => {
  const percentage = total > 0 ? Math.max(0, Math.min(100, ((total - used) / total) * 100)) : 0;
  const remainingDays = total - used;

  const getColor = () => {
    if (percentage >= 70) return '#10b981'; // Emerald
    if (percentage >= 30) return '#f59e0b'; // Amber
    return '#f43f5e'; // Rose
  };

  const color = getColor();
  const radius = 60;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8">
      {/* Sleek Circular Gauge */}
      <div className="relative flex items-center justify-center w-[160px] h-[160px]">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90"
        >
          {/* Background Ring */}
          <circle
            stroke="var(--border)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            strokeLinecap="round"
          />
          {/* Progress Ring */}
          <motion.circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="drop-shadow-sm"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-[var(--text-main)] leading-none tracking-tight">
            {remainingDays.toFixed(1)}
          </span>
          <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mt-1">
            Days Left
          </span>
        </div>
      </div>

      {/* Consumption Stats */}
      <div className="flex w-full px-6 justify-between items-center bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border)]">
        <div className="flex flex-col items-start">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Used</span>
          <span className="text-[16px] font-bold text-[var(--c-rose)]">{used.toFixed(1)}</span>
        </div>
        <div className="w-[1px] h-8 bg-[var(--border)] mx-4"></div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Total</span>
          <span className="text-[16px] font-bold text-[var(--text-main)]">{total.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};

export default EnergyBar;
