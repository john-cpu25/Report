import React from 'react';
import { Search } from 'lucide-react';

const NeumorphicSearch = ({ value, onChange, placeholder = "Search..." }) => {
  return (
    <div className="neumorphic-search-wrapper">
      <button className="neumorphic-icon-btn" aria-label="Search">
        <Search size={18} strokeWidth={2.5} />
      </button>
      <input 
        type="text" 
        className="neumorphic-search-input" 
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default NeumorphicSearch;
