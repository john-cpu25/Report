import React, { useState, useEffect } from 'react';

const MarkupTimeInput = ({ value, onChange, onKeyDown, onBlur, autoFocus }) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [error, setError] = useState(false);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const validateAndFormat = (val) => {
    if (!val) return null;
    
    // Remove non-numeric characters except colon
    let clean = val.replace(/[^0-9:]/g, '');
    
    // Handle formats like "830", "1745", "8:30"
    if (!clean.includes(':')) {
      if (clean.length === 3) {
        clean = `0${clean[0]}:${clean.slice(1)}`;
      } else if (clean.length === 4) {
        clean = `${clean.slice(0, 2)}:${clean.slice(2)}`;
      }
    } else {
      const parts = clean.split(':');
      if (parts[0].length === 1) parts[0] = `0${parts[0]}`;
      if (parts[1] && parts[1].length === 1) parts[1] = `0${parts[1]}`;
      clean = parts.join(':');
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (timeRegex.test(clean)) {
      return clean;
    }
    return false;
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setError(false);
  };

  const handleBlur = () => {
    if (!inputValue) {
      onChange(null);
      setError(false);
      if (onBlur) onBlur();
      return;
    }

    const formatted = validateAndFormat(inputValue);
    if (formatted) {
      setInputValue(formatted);
      onChange(formatted);
      setError(false);
    } else {
      setError(true);
      // We don't call onChange here to avoid saving invalid data
    }
    if (onBlur) onBlur();
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        className={`bg-slate-950/60 border rounded-lg px-2 py-1 text-[11px] font-bold transition-all w-full placeholder:text-slate-600 focus:outline-none focus:ring-1 ${
          error 
            ? 'border-rose-500/50 text-rose-400 focus:ring-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.2)]' 
            : 'border-white/10 text-emerald-400 focus:ring-emerald-500/50'
        }`}
        placeholder="HH:mm"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
      />
      {error && (
        <div className="absolute -bottom-4 left-0 text-[8px] font-black text-rose-500 uppercase tracking-tighter">
          Invalid Time
        </div>
      )}
    </div>
  );
};

export default MarkupTimeInput;
