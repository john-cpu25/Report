import React from 'react';
import { ChevronDown } from 'lucide-react';

const NeumorphicDropdown = ({ value, onChange, options, defaultLabel, icon: Icon, className = '' }) => {
  // Find the selected label
  const selectedOption = options.find(opt => {
    if (typeof opt === 'object') return opt.value === value;
    return opt === value;
  });
  
  const displayLabel = selectedOption 
    ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption)
    : defaultLabel;

  return (
    <div className={`relative inline-flex items-center group ${className}`}>
      {/* Invisible Native Select covering the whole area for functionality */}
      <select 
        value={value} 
        onChange={onChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      >
        {defaultLabel && <option value="">{defaultLabel}</option>}
        {options.map((opt, i) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const label = typeof opt === 'object' ? opt.label : opt;
          return <option key={i} value={val}>{label}</option>;
        })}
      </select>

      {/* Visible Custom UI using Neumorphic CSS */}
      <div className="neumorphic-dropdown-wrapper w-full">
        
        <div className="flex items-center overflow-hidden ml-3 mr-2">
          {Icon && <Icon size={14} className="text-[var(--text-muted)] mr-2 shrink-0" />}
          <span className="text-[14px] font-semibold text-[var(--text-main)] truncate">
            {displayLabel}
          </span>
        </div>
        
        {/* Circular Icon Container */}
        <div className="neumorphic-dropdown-icon">
          <ChevronDown size={16} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
};

export default NeumorphicDropdown;
