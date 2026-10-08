import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  Shield
} from 'lucide-react';

const AdminPanel = () => {
  const [expandedVersion, setExpandedVersion] = useState('v5.0.0');

  const versionHistory = [
    {
      version: 'v5.0.0',
      title: 'Universal Identity & Data Alignment',
      date: 'May 17, 2026',
      type: 'major',
      changes: [
        'Hợp nhất bảng quản trị người dùng (NMK_User) sang APEX_User.',
        'Hỗ trợ cấu trúc xác thực thống nhất, phân quyền theo nhóm và cấp độ.',
        'Tối ưu hóa hiệu năng tải dữ liệu 3 tháng gần nhất cho hệ thống.',
        'Đồng bộ dữ liệu Realtime đa nền tảng và nâng cấp bảo mật.'
      ]
    },
    {
      version: 'v4.2.1',
      title: 'Performance & Architecture Enhancement',
      date: 'May 14, 2026',
      type: 'minor',
      changes: [
        'Tối ưu hóa hiệu năng render cây sơ đồ tổ chức OrgChart và Virtual Scroll.',
        'Cải thiện thuật toán gom nhóm dự án và thống kê số liệu Weekly Report.',
        'Sửa lỗi đồng bộ dữ liệu thời gian thực giữa các trình duyệt.'
      ]
    },
    {
      version: 'v4.0.0',
      title: 'Next-Gen Dashboard & Neumorphic Design',
      date: 'April 28, 2026',
      type: 'major',
      changes: [
        'Ra mắt giao diện Neumorphic phong cách hiện đại kết hợp hiệu ứng mùa lễ hội.',
        'Hỗ trợ chế độ nền Bamboo Zen thiên nhiên thanh lịch.',
        'Bổ sung phân hệ quản lý bản vẽ và tài liệu kỹ thuật nâng cao.'
      ]
    },
    {
      version: 'v3.5.0',
      title: 'Leave & Timesheet Intelligence',
      date: 'March 15, 2026',
      type: 'minor',
      changes: [
        'Tích hợp tính năng quản lý nghỉ phép và bù giờ (Overtime Leave).',
        'Tự động đối soát bảng chấm công hàng tuần với tiến độ công việc.',
        'Hỗ trợ xuất báo cáo định dạng Excel chuẩn doanh nghiệp.'
      ]
    }
  ];

  const envItems = [
    { label: 'Environment', value: 'Production (Cloud)' },
    { label: 'Frontend Framework', value: 'React 19 + Vite 8' },
    { label: 'UI Architecture', value: 'Tailwind CSS v4 + Vanilla CSS Tokens' },
    { label: 'Database Host', value: 'Supabase Cloud (cvecpplwoduujrvoduku)' },
    { label: 'Data Retention Scope', value: '3 Tháng gần nhất (Last 90 Days)' }
  ];

  const toggleVersion = (version) => {
    setExpandedVersion(expandedVersion === version ? null : version);
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'rgba(0, 113, 227, 0.1)',
          color: '#0071e3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Shield size={22} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-contrast)', margin: 0 }}>
            Thông tin Hệ thống & Phiên bản
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            Tổng quan môi trường hoạt động, cấu hình máy chủ và lịch sử phát hành phiên bản
          </p>
        </div>
      </div>

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
