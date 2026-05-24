import React from 'react';
import { useApp } from '../../context/AppContext';

export default function ModalCancelButton({ onClick, disabled, children = 'Cancel' }) {
  const { theme } = useApp();
  const isDark = theme === 'GALAXY';

  return (
    <button 
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`btn-modal-cancel ${isDark ? 'bg-white/10 text-slate-50' : 'bg-[#f0f4f9] text-[#1e3a8a]'}`}
    >
      {children}
    </button>
  );
}
