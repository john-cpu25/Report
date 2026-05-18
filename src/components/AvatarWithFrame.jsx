import React from 'react';

export default function AvatarWithFrame({ user, sizeClass = 'w-10 h-10', borderClass = 'border border-indigo-500/20' }) {
  const frame = user?.avatarFrame || 'none';
  const profileImage = user?.image || null;

  // Render the base avatar image (without frame styling itself)
  const renderAvatarContent = () => {
    if (profileImage && !profileImage.startsWith('linear-gradient')) {
      return <img src={profileImage} alt={user?.name || 'User'} className="w-full h-full object-cover" />;
    }
    
    // Gradient or fallback avatar
    return (
      <div 
        className="w-full h-full flex items-center justify-center"
        style={{ 
          background: profileImage && profileImage.startsWith('linear-gradient') 
            ? profileImage 
            : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' 
        }}
      >
        <svg className="w-[50%] h-[50%]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="white"/>
          <path d="M12 14C6.47715 14 2 18.4772 2 24H22C22 18.4772 17.5228 14 12 14Z" fill="white"/>
        </svg>
      </div>
    );
  };

  return (
    <div className={`relative shrink-0 flex items-center justify-center ${sizeClass}`}>
      {/* Self-contained CSS injection for premium keyframes and animations */}
      <style>{`
        @keyframes cyber-spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: cyber-spin-slow 20s linear infinite !important;
        }

        @keyframes crystal-pulse-slow {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.025); }
        }
        .animate-pulse-slow {
          animation: crystal-pulse-slow 4s ease-in-out infinite !important;
        }
      `}</style>

      {/* 1. Base Avatar Mask */}
      <div className={`w-full h-full rounded-[8px] overflow-hidden ${borderClass} bg-slate-950 flex items-center justify-center`}>
        {renderAvatarContent()}
      </div>

      {/* 2. Premium SVG Overlay Frames (Scaled slightly larger to overflow and fit borders exactly) */}
      {frame === 'crystal' && (
        <svg 
          className="absolute pointer-events-none z-10 w-[122%] h-[122%] left-[-11%] top-[-11%] drop-shadow-[0_0_8px_rgba(6,182,212,0.6)] animate-pulse-slow"
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="crystal-border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
            <linearGradient id="ice-shard-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>

          {/* Icy border outline */}
          <rect 
            x="9" 
            y="9" 
            width="82" 
            height="82" 
            rx="12" 
            stroke="url(#crystal-border-grad)" 
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Top Crown Icy Peaks */}
          <path d="M 50,4 L 40,11 L 44,13 L 50,7 L 56,13 L 60,11 Z" fill="url(#ice-shard-grad)" stroke="#ffffff" strokeWidth="0.5" />
          <path d="M 50,7 L 44,13 L 56,13 Z" fill="#99f6e4" opacity="0.8" />
          
          {/* Top-Left Ice Wing */}
          <path d="M 4,4 L 16,11 L 12,14 L 3,9 Z" fill="url(#ice-shard-grad)" stroke="#ffffff" strokeWidth="0.5" />
          <path d="M 8,2 L 18,9 L 16,11 L 6,4 Z" fill="#22d3ee" opacity="0.6" />
          
          {/* Top-Right Ice Wing */}
          <path d="M 96,4 L 84,11 L 88,14 L 97,9 Z" fill="url(#ice-shard-grad)" stroke="#ffffff" strokeWidth="0.5" />
          <path d="M 92,2 L 82,9 L 84,11 L 94,4 Z" fill="#22d3ee" opacity="0.6" />

          {/* Corner Ice Jewels */}
          <polygon points="9,9 15,3 21,9 15,15" fill="#ffffff" />
          <polygon points="9,9 15,3 21,9 15,15" fill="#22d3ee" opacity="0.7" />
          
          <polygon points="91,9 85,3 79,9 85,15" fill="#ffffff" />
          <polygon points="91,9 85,3 79,9 85,15" fill="#22d3ee" opacity="0.7" />

          <polygon points="9,91 15,85 21,91 15,97" fill="#ffffff" />
          <polygon points="9,91 15,85 21,91 15,97" fill="#22d3ee" opacity="0.7" />

          {/* Bottom-Right White Dragon/Stitch Creature Ornament (Highly detailed SVG styling) */}
          <g transform="translate(68, 68) scale(0.26)" className="drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]">
            {/* Little dragon/Stitch wings */}
            <path d="M 10,80 Q -10,60 -5,40 Q 5,50 15,65 Z" fill="#e2e8f0" stroke="#ffffff" strokeWidth="1" />
            <path d="M 90,80 Q 110,60 105,40 Q 95,50 85,65 Z" fill="#e2e8f0" stroke="#ffffff" strokeWidth="1" />
            
            {/* Main Body */}
            <rect x="25" y="45" width="50" height="40" rx="20" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
            
            {/* Big Head */}
            <ellipse cx="50" cy="35" rx="32" ry="25" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
            
            {/* Glowing Sapphire Eyes */}
            <circle cx="36" cy="32" r="6" fill="#0284c7" />
            <circle cx="36" cy="32" r="2" fill="#ffffff" />
            
            <circle cx="64" cy="32" r="6" fill="#0284c7" />
            <circle cx="64" cy="32" r="2" fill="#ffffff" />

            {/* Cute Ears */}
            <path d="M 22,20 Q 5,10 15,30 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
            <path d="M 20,22 Q 10,15 17,28 Z" fill="#93c5fd" opacity="0.7" />
            
            <path d="M 78,20 Q 95,10 85,30 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
            <path d="M 80,22 Q 90,15 83,28 Z" fill="#93c5fd" opacity="0.7" />

            {/* Cute Hands */}
            <circle cx="32" cy="65" r="5" fill="#ffffff" stroke="#e2e8f0" />
            <circle cx="68" cy="65" r="5" fill="#ffffff" stroke="#e2e8f0" />
          </g>
        </svg>
      )}

      {frame === 'gold' && (
        <svg 
          className="absolute pointer-events-none z-10 w-[122%] h-[122%] left-[-11%] top-[-11%] drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]"
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="gold-border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#fef08a" />
            </linearGradient>
            <linearGradient id="gold-gem-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>

          {/* Royal gold border outline */}
          <rect 
            x="9" 
            y="9" 
            width="82" 
            height="82" 
            rx="12" 
            stroke="url(#gold-border-grad)" 
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Royal Crown on Top Center */}
          <g transform="translate(35, 1) scale(0.6)">
            {/* Crown Base */}
            <path d="M 5,30 L 45,30 L 40,25 L 10,25 Z" fill="#b45309" />
            <rect x="8" y="27" width="34" height="3" rx="1.5" fill="#fef08a" />
            
            {/* Crown Spikes */}
            <path d="M 5,30 L 5,12 L 15,22 L 25,6 L 35,22 L 45,12 L 45,30 Z" fill="url(#gold-border-grad)" stroke="#d97706" strokeWidth="0.5" />
            
            {/* Crown Sunstone / Ruby Gem */}
            <circle cx="25" cy="18" r="4.5" fill="url(#gold-gem-grad)" />
            <circle cx="25" cy="18" r="1.5" fill="#ffffff" />
            
            {/* Jewels on Crown Peaks */}
            <circle cx="5" cy="12" r="2" fill="#ffffff" />
            <circle cx="25" cy="6" r="2" fill="#ffffff" />
            <circle cx="45" cy="12" r="2" fill="#ffffff" />
          </g>

          {/* Left Wing Gold Ornaments */}
          <path d="M 5,35 Q -3,50 5,65 Q 12,50 5,35 Z" fill="url(#gold-border-grad)" stroke="#b45309" strokeWidth="0.5" />
          <circle cx="4" cy="50" r="2" fill="#ffffff" />
          
          {/* Right Wing Gold Ornaments */}
          <path d="M 95,35 Q 103,50 95,65 Q 88,50 95,35 Z" fill="url(#gold-border-grad)" stroke="#b45309" strokeWidth="0.5" />
          <circle cx="96" cy="50" r="2" fill="#ffffff" />

          {/* Bottom Gold Coins / Chest Ornament */}
          <g transform="translate(36, 85) scale(0.7)">
            {/* Golden Coins piled up */}
            <ellipse cx="14" cy="12" rx="9" ry="5" fill="#d97706" stroke="#fef08a" strokeWidth="0.7" />
            <ellipse cx="26" cy="12" rx="9" ry="5" fill="#d97706" stroke="#fef08a" strokeWidth="0.7" />
            <ellipse cx="20" cy="8" rx="9" ry="5" fill="url(#gold-border-grad)" stroke="#ffffff" strokeWidth="0.7" />
            <circle cx="20" cy="8" r="2" fill="#ffffff" />
          </g>
        </svg>
      )}

      {frame === 'cyber' && (
        <svg 
          className="absolute pointer-events-none z-10 w-[122%] h-[122%] left-[-11%] top-[-11%] drop-shadow-[0_0_10px_rgba(236,72,153,0.85)]"
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="cyber-border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>

          {/* Cyberpunk matrix dashed outline */}
          <rect 
            x="9" 
            y="9" 
            width="82" 
            height="82" 
            rx="10" 
            stroke="url(#cyber-border-grad)" 
            strokeWidth="3.5"
            strokeDasharray="18 6 6 6"
            className="animate-spin-slow origin-center"
            style={{ transformOrigin: '50px 50px' }}
          />

          {/* Cyber Corner Brackets */}
          <path d="M 6,18 L 6,6 L 18,6" stroke="#ec4899" strokeWidth="3" strokeLinecap="square" />
          <path d="M 94,18 L 94,6 L 82,6" stroke="#ec4899" strokeWidth="3" strokeLinecap="square" />
          <path d="M 6,82 L 6,94 L 18,94" stroke="#06b6d4" strokeWidth="3" strokeLinecap="square" />
          <path d="M 94,82 L 94,94 L 82,94" stroke="#06b6d4" strokeWidth="3" strokeLinecap="square" />

          {/* Sci-fi tech micro ornaments */}
          <rect x="24" y="4" width="8" height="2" fill="#06b6d4" />
          <rect x="68" y="4" width="8" height="2" fill="#ec4899" />
          <circle cx="50" cy="5" r="1.5" fill="#ffffff" className="animate-ping" />

          <text 
            x="50" 
            y="93" 
            fill="#ffffff" 
            fontSize="5" 
            fontFamily="monospace" 
            fontWeight="black" 
            textAnchor="middle" 
            letterSpacing="0.1em"
            className="opacity-90 drop-shadow-[0_0_2px_#06b6d4]"
          >
            AI-SYS
          </text>
        </svg>
      )}
    </div>
  );
}
