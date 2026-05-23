import React, { useState, useEffect, memo } from 'react';
import MarkupDateInput from './MarkupDateInput';
import MarkupTimeInput from './MarkupTimeInput';

const MarkupCell = memo(({ 
  id, 
  markupDate, 
  markupTime, 
  onSave, 
  isEditing, 
  onStartEdit, 
  onCancelEdit 
}) => {
  const [tempDate, setTempDate] = useState(markupDate);
  const [tempTime, setTempTime] = useState(markupTime);

  useEffect(() => {
    if (isEditing) {
      setTempDate(markupDate);
      setTempTime(markupTime);
    }
  }, [isEditing, markupDate, markupTime]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSave(id, { date: tempDate, time: tempTime });
    }
    if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  const handleBlur = () => {
    // We delay blur slightly to allow clicking between date and time inputs
    setTimeout(() => {
      if (document.activeElement.closest('.markup-edit-container')) return;
      onSave(id, { date: tempDate, time: tempTime });
    }, 100);
  };

  if (isEditing) {
    return (
      <div 
        className="markup-edit-container flex flex-col gap-1 p-1 min-w-[120px]"
        onKeyDown={handleKeyDown}
      >
        <MarkupDateInput 
          value={tempDate} 
          onChange={setTempDate} 
          autoFocus 
        />
        <MarkupTimeInput 
          value={tempTime} 
          onChange={setTempTime} 
          onBlur={handleBlur}
        />
      </div>
    );
  }

  const hasData = markupDate || markupTime;
  
  // Format date for display: YYYY-MM-DD -> DD/MM/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div 
      className={`group/markup cursor-pointer p-2 rounded-lg transition-all border border-transparent hover:border-[var(--border)] hover:bg-indigo-500/5 min-h-[40px] flex flex-col justify-center items-center text-center ${hasData ? 'bg-indigo-500/5' : ''}`}
      onClick={onStartEdit}
      title="Click to edit Markup Time"
    >
      {hasData ? (
        <>
          {markupDate && (
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">
              {formatDate(markupDate)}
            </span>
          )}
          {markupTime && (
            <span className="text-[11px] font-bold text-emerald-500">
              {markupTime}
            </span>
          )}
        </>
      ) : (
        <span className="text-[var(--text-muted)] group-hover/markup:text-[var(--text-main)] text-xs font-black italic">—</span>
      )}
    </div>
  );
});

export default MarkupCell;
