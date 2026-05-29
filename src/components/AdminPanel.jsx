import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const AdminPanel = () => {
  const [expandedVersion, setExpandedVersion] = useState('v5.0.0');

  const versionHistory = [
    {
      version: 'v5.0.0',
      date: 'May 17, 2026',
      title: 'Architecture Overhaul & Deep Optimization',
      changes: [
        'Decoupled monolithic PersonalSpace.jsx: reduced code size by 63% (from 1814 to 675 lines).',
        'Implemented usePersonalSpaceEngine custom hook to centralize all complex calculations.',
        'Created modular sub-components: TimesheetView, ProjectView, GanttView, DeepAnalysisView.',
        'Implemented Data Normalization Adapter in dataProcessor.js to trim and uppercase raw data.',
        'Deleted obsolete legacy CSVProcessor.jsx and PerformanceReview.jsx modules, trimming 190KB off bundle size.',
        'Applied tactile Neumorphic (3D soft UI) design templates to the Annual Leave dashboard.',
        'Redesigned the Projects Bookshelf with dynamic book sizes, 3D textures, gold foil stripes, and elegant typography.',
        'Created an immersive 3D Open Book view with leather textures, paper shadows, and handwritten signatures.'
      ],
      type: 'major'
    },
    {
      version: 'v4.9.0',
      date: 'May 17, 2026',
      title: 'Personal Workspace & Data Visibility',
      changes: [
        'Implemented Dynamic Data Access: Restricted users to view only their personal data.',
        'Enforced Self-Data Filtering on the Personal Workspace module.',
        'Added Team shielding logic: Leaders/Users only see their own team\'s active status.',
        'Updated Dashboard UI to clearly show BUSY, FREE, and LEAVE with aligned tabular numbers.'
      ],
      type: 'major'
    },
    {
      version: 'v4.8.5',
      date: 'May 16, 2026',
      title: 'Neumorphic Design & Dashboard Polish',
      changes: [
        'Implemented global tactile UI templates with Theme-Aware Shadows.',
        'Redesigned selectors using 3D Neumorphism and updated Market Intelligence to compact mode.'
      ],
      type: 'minor'
    },
    {
      version: 'v4.7.0',
      date: 'May 11, 2026',
      title: 'System Modularization & Performance Optimization',
      changes: [
        'Modularized CSVProcessor into sub-components (StatCards, FilterBar, UnifiedTable, DataUploader).',
        'Implemented Lazy Loading (300 records) for Data Analyst module to reduce lag.',
        'Integrated Global State Persistence for seamless tab switching.',
        'Standardized UI to "Sharp Design" (rounded-none) for professional aesthetics.',
        'Fixed Project Groups toggle functionality in Weekly Planner.'
      ],
      type: 'major'
    },
    {
      version: 'v4.6.1',
      date: 'May 10, 2026',
      title: 'Workflow Expansion & Refinement',
      changes: [
        'Added detailed Issue Process and Specialty Knowledge workflows.',
        'Fixed Dynamic Icon Rendering syntax errors.',
        'Resolved White-on-White contrast issues on Bamboo background.'
      ],
      type: 'minor'
    }
  ];

  const envItems = [
    { label: 'OS', value: 'Windows x64' },
    { label: 'Engine', value: 'Vite v8.0.10' },
    { label: 'Runtime', value: 'React v19.2.5' },
    { label: 'Database', value: 'Supabase v2.105.3' }
  ];

  const toggleVersion = (version) => {
    setExpandedVersion(expandedVersion === version ? null : version);
  };

  return (
    <div className="admin-page">

      {/* Current Build */}
      <div className="admin-build-card">
        <div className="admin-build-header">Current Build</div>
        <div className="admin-build-version">v5.0.0</div>
        <div className="admin-build-date">May 17, 2026</div>
        <div className="admin-build-status">
          <div className="admin-build-status-dot" />
          Production Ready
        </div>
      </div>

      {/* System Environment */}
      <p className="admin-env-label">System Environment</p>
      <div className="admin-env-group">
        {envItems.map(item => (
          <div key={item.label} className="admin-env-row">
            <span className="admin-env-key">{item.label}</span>
            <span className="admin-env-value">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Deployment History */}
      <p className="admin-history-label">Deployment History</p>
      <div className="admin-history-group">
        {versionHistory.map((item) => (
          <div key={item.version} className="admin-version-entry">
            <div 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => toggleVersion(item.version)}
            >
              <div>
                <div className="admin-version-header">
                  <span className="admin-version-tag">{item.version}</span>
                  <span className="admin-version-title">— {item.title}</span>
                </div>
                <div className="admin-version-date">{item.date}</div>
              </div>
              <motion.div
                animate={{ rotate: expandedVersion === item.version ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                style={{ color: 'var(--text-muted)', flexShrink: 0 }}
              >
                <ChevronDown size={18} />
              </motion.div>
            </div>
            
            <AnimatePresence>
              {expandedVersion === item.version && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0 4px' }}>
                    <span className={`admin-version-badge ${item.type}`}>
                      {item.type === 'major' ? 'Major Release' : 'Minor Release'}
                    </span>
                  </div>
                  <ul className="admin-change-list">
                    {item.changes.map((change, cIdx) => (
                      <li key={cIdx} className="admin-change-item">{change}</li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPanel;
