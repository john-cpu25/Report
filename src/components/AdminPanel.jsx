import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  Key, 
  Search, 
  RefreshCw, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Shield, 
  Users, 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth, hashPassword } from '../context/AuthContext';

const AdminPanel = () => {
  const { user: currentAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'system'

  // ── User Management & Reset Password States ──
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('ALL');

  // Modal states
  const [targetUser, setTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [copiedQuick, setCopiedQuick] = useState(false);

  // System Environment & Version states
  const [expandedVersion, setExpandedVersion] = useState('v5.0.0');

  // ── Fetch Users from Supabase ──
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('NMK_User')
        .select('id, name, full_name, email, team, position, user_role, password, color, image')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading users:', error);
      } else if (data) {
        setUsers(data);
      }
    } catch (err) {
      console.error('Unexpected error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.team && u.team.toLowerCase().includes(q));

      const matchTeam = selectedTeam === 'ALL' || u.team === selectedTeam;
      return matchSearch && matchTeam;
    });
  }, [users, searchQuery, selectedTeam]);

  // Unique teams
  const availableTeams = useMemo(() => {
    const teams = new Set();
    users.forEach(u => {
      if (u.team && u.team.trim()) teams.add(u.team.trim());
    });
    return Array.from(teams).sort();
  }, [users]);

  // Generate random 8-character secure password
  const generateRandomPassword = () => {
    const chars = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
    let res = '';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(res);
    setShowPassword(true);
  };

  // Open reset modal
  const openResetModal = (user) => {
    setTargetUser(user);
    setResetSuccess(false);
    setCopiedTemplate(false);
    setCopiedQuick(false);
    generateRandomPassword();
  };

  // Close reset modal
  const closeResetModal = () => {
    setTargetUser(null);
    setNewPassword('');
    setResetSuccess(false);
  };

  // Execute password reset
  const handleConfirmReset = async () => {
    if (!targetUser || !newPassword.trim()) return;
    setResetLoading(true);
    try {
      const hashed = await hashPassword(newPassword.trim());
      const { error } = await supabase
        .from('NMK_User')
        .update({ password: hashed })
        .eq('id', targetUser.id);

      if (error) {
        alert('Lỗi cập nhật mật khẩu: ' + error.message);
      } else {
        setResetSuccess(true);
        // Update local state immediately
        setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, password: hashed } : u));
      }
    } catch (err) {
      alert('Đã xảy ra lỗi: ' + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  // Copy template text
  const copyMessageTemplate = () => {
    if (!targetUser) return;
    const name = targetUser.full_name || targetUser.name || 'bạn';
    const text = `Xin chào ${name},\n\nMật khẩu đăng nhập hệ thống Weekly Report của bạn đã được quản trị viên đặt lại:\n- Tài khoản: ${targetUser.email}\n- Mật khẩu mới: ${newPassword}\n\nVui lòng truy cập https://report.apexscengineering.com/ để đăng nhập và có thể tự đổi mật khẩu cá nhân tại phần Cài đặt.`;
    navigator.clipboard.writeText(text);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  const copyQuickPassword = () => {
    navigator.clipboard.writeText(newPassword);
    setCopiedQuick(true);
    setTimeout(() => setCopiedQuick(false), 2000);
  };

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

      {/* Segmented Navigation Tabs */}
      <div className="admin-tab-bar">
        <button 
          className={`admin-tab-item ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} />
          Quản lý Tài khoản & Mật khẩu
        </button>
        <button 
          className={`admin-tab-item ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          <Shield size={16} />
          Thông tin Hệ thống & Phiên bản
        </button>
      </div>

      {/* ── TAB 1: USER MANAGEMENT & PASSWORD RESET ── */}
      {activeTab === 'users' && (
        <div>
          {/* Search & Team Filter Bar */}
          <div className="admin-search-wrapper">
            <div className="admin-search-input-box">
              <Search size={16} />
              <input 
                type="text"
                className="admin-search-input"
                placeholder="Tìm kiếm nhân viên theo tên, email, bộ phận..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: 12, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <select 
              className="admin-team-select"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <option value="ALL">Tất cả bộ phận ({users.length})</option>
              {availableTeams.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <button 
              onClick={fetchUsers} 
              className="admin-btn-gen"
              title="Tải lại danh sách"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={14} className={loadingUsers ? 'animate-spin' : ''} />
              Làm mới
            </button>
          </div>

          {/* Users List Card */}
          <div className="admin-users-group">
            {loadingUsers && users.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                Đang tải danh sách người dùng từ hệ thống...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Không tìm thấy nhân viên nào phù hợp với bộ lọc.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const role = (u.user_role || 'User').toString().trim();
                const isAdmin = role.toLowerCase().includes('admin');
                const isLeader = role.toLowerCase().includes('leader');
                const hasPassword = Boolean(u.password && u.password.trim() !== '');

                const firstLetter = (u.name || u.email || '?').charAt(0).toUpperCase();

                return (
                  <div key={u.id} className="admin-user-card">
                    <div className="admin-user-left">
                      <div 
                        className="admin-user-avatar"
                        style={{ backgroundColor: u.color || '#0071e3' }}
                      >
                        {firstLetter}
                      </div>

                      <div className="admin-user-meta">
                        <div className="admin-user-name">
                          {u.full_name || u.name}
                          {u.position && (
                            <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>
                              • {u.position}
                            </span>
                          )}
                        </div>
                        <div className="admin-user-email">{u.email}</div>
                      </div>
                    </div>

                    <div className="admin-user-right">
                      {/* Team tag */}
                      {u.team && (
                        <span className="admin-user-tag">{u.team}</span>
                      )}

                      {/* Role tag */}
                      <span className={`admin-user-tag ${isAdmin ? 'admin' : isLeader ? 'leader' : ''}`}>
                        {role}
                      </span>

                      {/* Password Status tag */}
                      <span className={`admin-user-tag ${hasPassword ? 'active-pwd' : 'no-pwd'}`}>
                        {hasPassword ? '● Đã đặt MK' : '○ Chưa có MK'}
                      </span>

                      {/* Action Button */}
                      <button 
                        className="admin-btn-reset-trigger"
                        onClick={() => openResetModal(u)}
                        title="Đặt lại mật khẩu cho nhân viên này"
                      >
                        <Key size={14} />
                        Reset Mật khẩu
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: SYSTEM ENVIRONMENT & RELEASES ── */}
      {activeTab === 'system' && (
        <div>
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
      )}

      {/* ── RESET PASSWORD MODAL ── */}
      {targetUser && (
        <div className="admin-modal-backdrop" onClick={closeResetModal}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="admin-modal-title">
                <Key size={18} color="#0071e3" />
                Cấp lại Mật khẩu cho Người dùng
              </div>
              <button className="admin-modal-close" onClick={closeResetModal}>
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              {/* Target User Banner */}
              <div className="admin-user-target-banner">
                <div 
                  className="admin-user-avatar" 
                  style={{ backgroundColor: targetUser.color || '#0071e3', width: 42, height: 42 }}
                >
                  {(targetUser.name || targetUser.email || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-contrast)' }}>
                    {targetUser.full_name || targetUser.name}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {targetUser.email}
                  </div>
                </div>
              </div>

              {!resetSuccess ? (
                <>
                  <label className="admin-field-label">Mật khẩu mới:</label>
                  <div className="admin-input-with-actions">
                    <div className="admin-pwd-input-wrap">
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        className="admin-pwd-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nhập hoặc tạo mật khẩu mới..."
                      />
                      <button 
                        type="button" 
                        className="admin-pwd-eye-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    <button 
                      type="button" 
                      className="admin-btn-gen"
                      onClick={generateRandomPassword}
                      title="Tạo chuỗi ngẫu nhiên 8 ký tự"
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Sparkles size={14} color="#0071e3" />
                      Tạo ngẫu nhiên
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                    <AlertCircle size={14} />
                    Mật khẩu sẽ được băm mã hóa an toàn SHA-256 trước khi lưu lên Database.
                  </div>

                  <div className="admin-modal-actions">
                    <button className="admin-btn-cancel" onClick={closeResetModal}>
                      Hủy bỏ
                    </button>
                    <button 
                      className="admin-btn-submit"
                      disabled={!newPassword.trim() || resetLoading}
                      onClick={handleConfirmReset}
                    >
                      {resetLoading ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Đang cập nhật...
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          Xác nhận & Cập nhật
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                /* Success State */
                <div className="admin-success-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34c759', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                    <CheckCircle2 size={20} />
                    Đã cập nhật mật khẩu mới thành công!
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px' }}>
                    Mật khẩu mới đã có hiệu lực ngay lập tức trên hệ thống Supabase.
                  </p>

                  <div style={{ background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mật khẩu vừa tạo:</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, color: 'var(--text-contrast)' }}>
                        {newPassword}
                      </div>
                    </div>
                    <button 
                      onClick={copyQuickPassword}
                      className="admin-btn-gen"
                      style={{ padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      {copiedQuick ? <Check size={14} color="#34c759" /> : <Copy size={14} />}
                      {copiedQuick ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>

                  <button 
                    className="admin-copy-template-btn"
                    onClick={copyMessageTemplate}
                  >
                    {copiedTemplate ? <Check size={16} /> : <Copy size={16} />}
                    {copiedTemplate ? 'Đã sao chép tin nhắn thông báo!' : 'Sao chép tin nhắn gửi cho nhân viên'}
                  </button>

                  <div style={{ marginTop: 14, textAlign: 'right' }}>
                    <button className="admin-btn-cancel" onClick={closeResetModal}>
                      Đóng
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;
