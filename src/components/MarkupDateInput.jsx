import React from 'react';

const MarkupDateInput = ({ value, onChange, onKeyDown, autoFocus }) => {
  return (
    <input
      type="date"
      className="bg-slate-950/60 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-bold text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all w-full cursor-pointer appearance-none"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      autoFocus={autoFocus}
    />
  );
};

export default MarkupDateInput;
