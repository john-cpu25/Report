import React from 'react';

const PillSwitcher = ({ options, value, onChange, type = 'text', size = 'md' }) => {
  return (
    <div className="inline-flex items-center p-1 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-[inset_0px_2px_4px_rgba(0,0,0,0.05)]">
      {options.map((option, index) => {
        const isActive = value === option.id;
        
        // Handle spacing and dividers
        // If the user adds a "divider: true" to an option, we can render a line before it
        const renderDivider = option.divider && index > 0;

        return (
          <React.Fragment key={option.id}>
            {renderDivider && (
              <div className="w-[1px] h-[20px] bg-[var(--border)] mx-1.5" />
            )}
            <button
              onClick={() => onChange(option.id)}
              title={option.label || option.id}
              className={`
                relative flex items-center justify-center rounded-xl font-bold transition-all duration-300 ease-out
                ${type === 'text' 
                  ? (size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm')
                  : (size === 'sm' ? 'w-[36px] h-[36px]' : 'w-[46px] h-[46px]')
                }
                ${isActive 
                  ? 'bg-[var(--bg-card)] shadow-sm text-[var(--c-indigo)] scale-100 border border-[var(--border)]' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50 scale-95 hover:scale-100 border border-transparent'
                }
              `}
            >
              {type === 'text' ? (
                <span>{option.label}</span>
              ) : (
                option.icon
              )}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default PillSwitcher;
