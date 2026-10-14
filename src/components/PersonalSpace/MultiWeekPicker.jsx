import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, Check, ChevronDown } from 'lucide-react';
import { getISOWeek } from 'date-fns';
import { getWeekDateRange } from '../../utils/timeUtils';

const MultiWeekPicker = ({
  selectedWeeks = [],
  onChange,
  year = new Date().getFullYear(),
  isDark = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);

  const today = new Date();
  const currentIsoWeek = getISOWeek(today);
  const currentIsoYear = today.getFullYear();

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Max weeks in this year (usually 52, sometimes 53)
  const totalWeeks = useMemo(() => {
    const dec28 = new Date(year, 11, 28);
    return getISOWeek(dec28) === 53 ? 53 : 52;
  }, [year]);

  const allWeeksList = useMemo(() => {
    return Array.from({ length: totalWeeks }, (_, i) => i + 1);
  }, [totalWeeks]);

  // Precomputed date range labels for tooltips
  const weekRangeMap = useMemo(() => {
    const map = {};
    for (let w = 1; w <= totalWeeks; w++) {
      map[w] = getWeekDateRange(w, year).label;
    }
    return map;
  }, [totalWeeks, year]);

  // Toggle a single week
  const handleToggleWeek = (wk) => {
    const current = new Set(selectedWeeks);
    if (current.has(wk)) {
      current.delete(wk);
    } else {
      current.add(wk);
    }
    const updated = Array.from(current).sort((a, b) => a - b);
    onChange(updated);
  };

  const applyPresetQuarter = (q) => {
    let start = 1;
    let end = 13;
    if (q === 2) { start = 14; end = 26; }
    else if (q === 3) { start = 27; end = 39; }
    else if (q === 4) { start = 40; end = totalWeeks; }
    
    const weeks = [];
    for (let w = start; w <= end; w++) {
      weeks.push(w);
    }
    onChange(weeks);
  };

  const applyClearAll = () => {
    onChange([]);
  };

  // Compact label on trigger button
  const triggerLabel = useMemo(() => {
    if (!selectedWeeks || selectedWeeks.length === 0) {
      return 'Chọn tuần (Chưa chọn)';
    }
    if (selectedWeeks.length === 1) {
      return `Tuần ${selectedWeeks[0]} (1 tuần)`;
    }
    if (selectedWeeks.length <= 4) {
      return `W${selectedWeeks.join(', W')} (${selectedWeeks.length} tuần)`;
    }
    const sorted = [...selectedWeeks].sort((a, b) => a - b);
    let isConsecutive = true;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] !== sorted[i] + 1) {
        isConsecutive = false;
        break;
      }
    }
    if (isConsecutive) {
      return `W${sorted[0]} → W${sorted[sorted.length - 1]} (${sorted.length} tuần)`;
    }
    return `W${sorted.slice(0, 3).join(', W')}... +${sorted.length - 3} (${sorted.length} tuần)`;
  }, [selectedWeeks]);

  const quarters = [
    { title: 'QUÝ 1 (W1 - W13)', weeks: allWeeksList.slice(0, 13), qNum: 1 },
    { title: 'QUÝ 2 (W14 - W26)', weeks: allWeeksList.slice(13, 26), qNum: 2 },
    { title: 'QUÝ 3 (W27 - W39)', weeks: allWeeksList.slice(26, 39), qNum: 3 },
    { title: `QUÝ 4 (W40 - W${totalWeeks})`, weeks: allWeeksList.slice(39), qNum: 4 }
  ];

  return (
    <div className="relative inline-block">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 h-[34px] px-3 rounded-[5px] border text-[13px] font-black transition-all duration-300 shadow-sm cursor-pointer select-none ${
          selectedWeeks.length > 0
            ? 'bg-gradient-to-r from-indigo-600/20 via-indigo-500/20 to-purple-600/20 text-indigo-400 border-indigo-500/50 hover:border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
            : isDark
            ? 'bg-slate-900/80 text-slate-400 border-slate-700 hover:border-slate-500'
            : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
        }`}
        title="Bấm để tick chọn các tuần tùy ý"
      >
        <Calendar size={14} className="text-indigo-400 shrink-0" />
        <span className="truncate max-w-[200px] tracking-wide">{triggerLabel}</span>
        <ChevronDown size={14} className={`opacity-70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover / Dropdown Modal: Right-aligned, max-w-md, bo góc 5px */}
      {isOpen && (
        <div
          ref={popoverRef}
          style={{
            padding: '12px 14px',
            borderRadius: '5px',
            maxHeight: '85vh',
            overflow: 'hidden'
          }}
          className={`absolute top-full mt-2 right-0 z-[100] w-[410px] sm:w-[430px] max-w-md max-w-[95vw] shadow-2xl backdrop-blur-xl border transition-all animate-in fade-in zoom-in-95 duration-200 ${
            isDark
              ? 'bg-slate-950/95 border-indigo-500/30 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
              : 'bg-white/98 border-indigo-200 text-slate-800 shadow-[0_20px_50px_rgba(99,102,241,0.15)]'
          }`}
        >
          {/* Quarters & Week Grid: 4 columns grid, max-h-[350px] overflow-y-auto, bo góc 5px */}
          <div 
            className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar"
            style={{ paddingLeft: '2px', paddingRight: '2px' }}
          >
            {quarters.map((q, idx) => (
              <div key={q.title} className={idx > 0 ? "pt-3 border-t border-[var(--border,rgba(99,102,241,0.15))]" : ""}>
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <span className="text-[12px] font-black text-indigo-500 uppercase tracking-wider">
                    {q.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => applyPresetQuarter(q.qNum)}
                    className="text-[12px] font-bold text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
                  >
                    Chọn cả quý
                  </button>
                </div>
                {/* 4 Columns Grid: W1 and W5 align cleanly with 10px-14px inset from outer border */}
                <div className="grid grid-cols-4 gap-2">
                  {q.weeks.map((wk) => {
                    const isSelected = selectedWeeks.includes(wk);
                    const isCurrent = year === currentIsoYear && wk === currentIsoWeek;
                    const dateRange = weekRangeMap[wk] || '';

                    return (
                      <button
                        key={wk}
                        type="button"
                        onClick={() => handleToggleWeek(wk)}
                        style={{ borderRadius: '5px' }}
                        className={`relative py-2 px-1 transition-all flex flex-col items-center justify-center cursor-pointer select-none group border ${
                          isSelected
                            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-[0_0_8px_rgba(99,102,241,0.4)] border-indigo-400'
                            : isDark
                            ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700/80'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                        }`}
                        title={`Tuần ${wk}: ${dateRange}`}
                      >
                        <div className="flex items-center gap-1 leading-tight">
                          <span className="text-[12px] font-black">W{wk}</span>
                          {isSelected && <Check size={12} className="text-emerald-300 stroke-[3]" />}
                        </div>
                        {isCurrent && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 ring-1 ring-slate-900" title="Tuần hiện tại" />
                        )}
                        <span className={`text-[10px] font-semibold tracking-tighter leading-tight mt-0.5 ${
                          isSelected ? 'text-indigo-200' : 'text-slate-400 group-hover:text-slate-500'
                        }`}>
                          {dateRange}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div 
            style={{ paddingTop: '10px', marginTop: '10px' }}
            className="border-t border-[var(--border,rgba(99,102,241,0.2))] flex items-center justify-between pb-0.5"
          >
            <div>
              {selectedWeeks.length > 0 && (
                <button
                  type="button"
                  onClick={applyClearAll}
                  style={{ borderRadius: '5px' }}
                  className="px-2.5 py-1 text-[12px] font-bold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer"
                >
                  Bỏ chọn
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{ borderRadius: '5px' }}
              className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-black uppercase tracking-wider shadow transition-all cursor-pointer ml-auto"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiWeekPicker;
