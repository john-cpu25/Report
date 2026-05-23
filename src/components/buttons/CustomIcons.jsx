import React from 'react';

export const ListIcon = ({ size = 26 }) => (
  <svg viewBox="0 0 24 24" className="shrink-0" style={{ width: `${size}px`, height: `${size}px`, minWidth: `${size}px` }} fill="currentColor">
    <circle cx="4" cy="5" r="2.5" />
    <rect x="9" y="3" width="13" height="4" rx="2" />
    <circle cx="4" cy="12" r="2.5" />
    <rect x="9" y="10" width="13" height="4" rx="2" />
    <circle cx="4" cy="19" r="2.5" />
    <rect x="9" y="17" width="13" height="4" rx="2" />
  </svg>
);

export const GanttIcon = ({ size = 26 }) => (
  <svg viewBox="0 0 24 24" className="shrink-0" style={{ width: `${size}px`, height: `${size}px`, minWidth: `${size}px` }} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
    <path d="M3 2v20h20" />
    <rect x="6.5" y="5" width="12" height="3" />
    <rect x="6.5" y="11" width="8" height="3" />
    <rect x="6.5" y="17" width="15" height="3" />
  </svg>
);

export const DailyIcon = ({ size = 26 }) => (
  <svg viewBox="0 0 100 100" className="shrink-0" style={{ width: `${size}px`, height: `${size}px`, minWidth: `${size}px` }} fill="none">
    <rect width="100" height="100" rx="15" fill="currentColor" fillOpacity="0.05" />
    
    {/* Outline of the calendar */}
    <rect x="10" y="20" width="80" height="70" rx="8" fill="none" stroke="currentColor" strokeWidth="6" />
    
    {/* Header line */}
    <path d="M10 42 h80" fill="none" stroke="currentColor" strokeWidth="6" />
    
    {/* Rings/Binding */}
    <rect x="25" y="10" width="8" height="20" rx="4" fill="currentColor" />
    <rect x="67" y="10" width="8" height="20" rx="4" fill="currentColor" />
    
    {/* Number 22 */}
    <path d="M30 60 h15 v10 h-15 v10 h15" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter" />
    <path d="M55 60 h15 v10 h-15 v10 h15" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);

export const ProjectIcon = ({ size = 26 }) => (
  <svg viewBox="0 0 100 100" className="shrink-0" style={{ width: `${size}px`, height: `${size}px`, minWidth: `${size}px` }} fill="none">
    <rect width="100" height="100" rx="15" fill="currentColor" fillOpacity="0.05" />
    <rect x="8" y="15" width="12" height="70" rx="6" fill="none" stroke="currentColor" strokeWidth="6" />
    <rect x="80" y="15" width="12" height="70" rx="6" fill="none" stroke="currentColor" strokeWidth="6" />
    <path d="M20 20 h60 v60 h-60 z" fill="none" stroke="currentColor" strokeWidth="6" />
    <text x="50" y="42" fill="currentColor" fontSize="16" fontWeight="900" textAnchor="middle" letterSpacing="1">PROJECT</text>
    <circle cx="50" cy="65" r="22" fill="none" stroke="currentColor" strokeWidth="8" />
    <path d="M38 65 l8 8 l16 -16" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const DeepAnalysisIcon = ({ size = 26 }) => (
  <svg viewBox="0 0 100 100" className="shrink-0" style={{ width: `${size}px`, height: `${size}px`, minWidth: `${size}px` }} fill="none">
    <rect width="100" height="100" rx="15" fill="currentColor" fillOpacity="0.05" />
    <path d="M20 85 h70 v-45 a15 15 0 0 0 -15 -15 h-55 l-10 10 z" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 35 h55 a15 15 0 0 0 15 -15" fill="none" stroke="currentColor" strokeWidth="6" />
    <rect x="30" y="65" width="8" height="20" rx="4" fill="currentColor" />
    <rect x="45" y="55" width="8" height="30" rx="4" fill="currentColor" />
    <rect x="60" y="45" width="8" height="40" rx="4" fill="currentColor" />
    <rect x="75" y="35" width="8" height="50" rx="4" fill="currentColor" />
  </svg>
);

export const PerformanceIcon = ({ size = 26 }) => (
  <svg viewBox="0 0 100 100" className="shrink-0" style={{ width: `${size}px`, height: `${size}px`, minWidth: `${size}px` }} fill="none">
    <rect width="100" height="100" rx="15" fill="currentColor" fillOpacity="0.05" />
    <path d="M12 65 a45 45 0 1 1 76 0" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M25 65 a30 30 0 0 1 50 0" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="20" y1="40" x2="26" y2="44" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <line x1="50" y1="15" x2="50" y2="25" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <line x1="80" y1="40" x2="74" y2="44" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <line x1="50" y1="65" x2="75" y2="35" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    <circle cx="50" cy="55" r="8" fill="none" stroke="currentColor" strokeWidth="5" />
    <path d="M35 75 c0 -10 10 -15 15 -15 s15 5 15 15" fill="none" stroke="currentColor" strokeWidth="5" />
    <line x1="40" y1="82" x2="60" y2="82" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

export const NeuralBrainIcon = ({ size = 26 }) => (
  <svg viewBox="0 0 100 100" className="shrink-0" style={{ width: `${size}px`, height: `${size}px`, minWidth: `${size}px` }} fill="none">
    <rect width="100" height="100" rx="15" fill="currentColor" fillOpacity="0.05" />
    <path d="M45 15 c-15 0 -25 10 -25 25 c0 5 2 10 5 15 c-10 10 -10 20 -5 30 c5 10 20 10 25 5" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M30 40 q10 5 15 0 M25 60 q10 -5 15 0 M35 75 q5 -5 10 0" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="48" y1="15" x2="48" y2="90" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M48 25 h15 l10 -10 h15" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="88" cy="15" r="5" fill="none" stroke="currentColor" strokeWidth="4" />
    <path d="M48 40 h10 l10 10 h20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="88" cy="50" r="5" fill="none" stroke="currentColor" strokeWidth="4" />
    <path d="M48 55 h25" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="73" cy="55" r="5" fill="none" stroke="currentColor" strokeWidth="4" />
    <path d="M48 70 h15 l10 10 h15" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="88" cy="80" r="5" fill="none" stroke="currentColor" strokeWidth="4" />
    <path d="M48 85 h10 l5 -10 h15" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="78" cy="75" r="5" fill="none" stroke="currentColor" strokeWidth="4" />
  </svg>
);
