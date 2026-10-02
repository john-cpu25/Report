import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Moon, 
  Sun, 
  Check,
  TreeDeciduous,
  Orbit,
  Maximize,
  Snowflake,
  Flower2,
  Heart,
  Sparkles,
  Calendar,
  Ban
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const Settings = ({ theme, setTheme, background, setBackground }) => {
  const { 
    seasonalEffect, 
    setSeasonalEffect, 
    seasonalIntensity, 
    setSeasonalIntensity 
  } = useApp();

  const themes = [
    {
      id: 'GALAXY',
      name: 'Galaxy Dark Mode',
      description: 'Classic dark aesthetic with celestial animations.',
      icon: Moon,
      bgIcon: Orbit,
      previewBg: '#0f172a',
      defaultBg: 'GALAXY',
    },
    {
      id: 'NEWS',
      name: 'News Mode',
      description: 'Clean light theme with bamboo nature background.',
      icon: Sun,
      bgIcon: TreeDeciduous,
      previewBg: '#f8fafc',
      defaultBg: 'BAMBOO',
    }
  ];

  const backgrounds = [
    { id: 'GALAXY', name: 'Celestial Orbit', icon: Orbit, color: '#818cf8' },
    { id: 'BAMBOO', name: 'Bamboo Zen', icon: TreeDeciduous, color: '#34d399' },
    { id: 'MINIMAL', name: 'Minimalist', icon: Maximize, color: '#94a3b8' },
  ];

  const seasonalList = [
    { 
      id: 'AUTO', 
      name: 'Tự Động (Auto)', 
      desc: 'Tự đổi theo lịch mùa trong năm', 
      icon: Calendar, 
      color: '#38bdf8', 
      bg: 'rgba(56, 189, 248, 0.15)' 
    },
    { 
      id: 'NOEL', 
      name: 'Giáng Sinh (Noel)', 
      desc: 'Tuyết rơi lấp lánh mùa đông', 
      icon: Snowflake, 
      color: '#60a5fa', 
      bg: 'rgba(96, 165, 250, 0.15)' 
    },
    { 
      id: 'TET', 
      name: 'Tết Cổ Truyền', 
      desc: 'Cánh hoa đào & hoa mai bay', 
      icon: Flower2, 
      color: '#f43f5e', 
      bg: 'rgba(244, 63, 94, 0.15)' 
    },
    { 
      id: 'VALENTINE', 
      name: 'Lễ Tình Nhân', 
      desc: 'Trái tim tình yêu bay bổng', 
      icon: Heart, 
      color: '#ec4899', 
      bg: 'rgba(236, 72, 153, 0.15)' 
    },
    { 
      id: 'FIREWORKS', 
      name: 'Pháo Hoa Lễ Hội', 
      desc: 'Pháo hoa rực rỡ chào mừng', 
      icon: Sparkles, 
      color: '#f59e0b', 
      bg: 'rgba(245, 158, 11, 0.15)' 
    },
    { 
      id: 'NONE', 
      name: 'Tắt Hiệu Ứng', 
      desc: 'Giao diện tĩnh cơ bản', 
      icon: Ban, 
      color: '#94a3b8', 
      bg: 'rgba(148, 163, 184, 0.15)' 
    }
  ];

  return (
    <div className="settings-page">
      {/* Interface Style */}
      <div className="settings-section">
        <p className="settings-section-label">Interface Style</p>
        <div className="settings-group">
          {themes.map((t) => (
            <div
              key={t.id}
              className="settings-theme-card"
              onClick={() => {
                setTheme(t.id);
                setBackground(t.defaultBg);
              }}
            >
              {/* Preview thumbnail */}
              <div className="settings-theme-preview" style={{ backgroundColor: t.previewBg }}>
                <div className="settings-theme-preview-inner">
                  <t.bgIcon size={28} />
                </div>
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="settings-theme-name">{t.name}</div>
                <div className="settings-theme-desc">{t.description}</div>
              </div>

              {/* Checkmark */}
              <AnimatePresence>
                {theme === t.id && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', duration: 0.3 }}
                  >
                    <Check className="settings-checkmark" strokeWidth={2.5} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Seasonal & Holiday Events */}
      <div className="settings-section">
        <div className="flex items-center justify-between px-4 mb-2">
          <p className="settings-section-label !mb-0 !p-0">Hiệu Ứng Sự Kiện & Lễ Hội (Seasonal Events)</p>
          {seasonalEffect !== 'NONE' && (
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-[var(--border)]">
              {[
                { key: 'LOW', label: 'Nhẹ' },
                { key: 'MEDIUM', label: 'Vừa' },
                { key: 'HIGH', label: 'Dày' }
              ].map(lvl => (
                <button
                  key={lvl.key}
                  onClick={() => setSeasonalIntensity(lvl.key)}
                  className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                    seasonalIntensity === lvl.key
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="settings-group">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-0">
            {seasonalList.map((item, idx) => {
              const isSelected = seasonalEffect === item.id;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => setSeasonalEffect(item.id)}
                  className={`p-4 flex flex-col items-center text-center cursor-pointer transition-colors relative hover:bg-black/[0.02] dark:hover:bg-white/[0.02] ${
                    idx % 3 !== 2 ? 'border-r border-[var(--border)]' : ''
                  } ${idx >= 3 ? 'border-t border-[var(--border)]' : ''}`}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-2.5 transition-transform hover:scale-110 shadow-sm"
                    style={{ backgroundColor: item.bg, color: item.color }}
                  >
                    <Icon size={22} />
                  </div>
                  <div className="text-[13px] font-bold text-[var(--text-contrast)] tracking-tight">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-1">
                    {item.desc}
                  </div>
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="mt-2 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                      >
                        Đang chọn
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Background Environment */}
      <div className="settings-section">
        <p className="settings-section-label">Background</p>
        <div className="settings-group">
          <div className="settings-bg-grid">
            {backgrounds.map((bg) => (
              <div
                key={bg.id}
                className="settings-bg-card"
                onClick={() => setBackground(bg.id)}
              >
                <div className="settings-bg-icon" style={{ color: bg.color }}>
                  <bg.icon size={22} />
                </div>
                <div className="settings-bg-name">{bg.name}</div>
                <AnimatePresence>
                  {background === bg.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="settings-bg-active"
                    >
                      Active
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Settings;
