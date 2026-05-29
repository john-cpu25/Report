import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Moon, 
  Sun, 
  Monitor, 
  Check,
  TreeDeciduous,
  Orbit,
  Maximize,
} from 'lucide-react';

const Settings = ({ theme, setTheme, background, setBackground }) => {
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
