import React from 'react';
import '../../UI/buttons/neumorphic_switcher.css';

const GridIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="3" width="7" height="7" rx="2" />
    <rect x="3" y="14" width="7" height="7" rx="2" />
    <rect x="14" y="14" width="7" height="7" rx="2" />
  </svg>
);

const BookshelfIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Left book */}
    <rect x="3" y="6" width="5" height="14" />
    <path d="M3 9h5 M3 17h5" />
    <rect x="4.5" y="11" width="2" height="2" />

    {/* Middle book */}
    <rect x="8" y="3" width="5" height="17" />
    <path d="M8 6h5 M8 17h5" />

    {/* Right leaning book */}
    <g transform="translate(14.5, 6.5) rotate(18)">
      <rect x="0" y="0" width="5" height="14" />
      <path d="M0 3h5 M0 11h5" />
    </g>
  </svg>
);

const NeumorphicViewSwitcher = ({ viewMode, setViewMode }) => {
  return (
    <div className="neumorphic-switcher-wrapper">
      <button
        onClick={() => setViewMode('grid')}
        className={`neumorphic-switcher-btn ${viewMode === 'grid' ? 'active' : ''}`}
        title="Grid View"
      >
        <GridIcon />
      </button>
      <button
        onClick={() => setViewMode('bookshelf')}
        className={`neumorphic-switcher-btn ${viewMode === 'bookshelf' ? 'active' : ''}`}
        title="Bookshelf View"
      >
        <BookshelfIcon />
      </button>
    </div>
  );
};

export default NeumorphicViewSwitcher;
