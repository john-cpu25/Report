import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Camera, MapPin, Briefcase, Mail, 
  MessageSquare, Building2, Users2, 
  Phone, Video, ChevronDown, ShieldCheck, Share2, ExternalLink, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import AvatarWithFrame from './AvatarWithFrame';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateUserProfile, logout, changePassword } = useAuth();
  const { theme, dashboardUsers, dashboardTasks } = useApp();
  
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [isUploading, setIsUploading] = useState(false);
  const [viewedUser, setViewedUser] = useState(null);
  const fileInputRef = useRef(null);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMessage, setPwdMessage] = useState('');
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwdMessage('Mật khẩu xác nhận không khớp');
      return;
    }
    if (newPassword.length < 6) {
      setPwdMessage('Mật khẩu phải từ 6 ký tự trở lên');
      return;
    }
    setIsChangingPwd(true);
    setPwdMessage('');
    const res = await changePassword(oldPassword, newPassword);
    setPwdMessage(res.message);
    setIsChangingPwd(false);
    if (res.success) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setViewedUser(null);
      setActiveTab('OVERVIEW');
    }
  }, [isOpen]);

  const currentUser = viewedUser || user;

  const isDark = theme === 'GALAXY';
  const fullName = currentUser?.full_name || currentUser?.displayName || currentUser?.name || 'User Profile';
  const position = currentUser?.position || 'BIM Manager';
  const team = currentUser?.team || 'MODELLING';
  const email = currentUser?.email || 'nhan.nguyen@rincovitch.com.au';
  const location = currentUser?.location || 'Vietnam';
  const company = 'Rincovitch Consultants Pty Ltd.';

  // Lấy danh sách những người liên quan (CONTACTS)
  const contacts = useMemo(() => {
    if (!dashboardTasks || !dashboardUsers || !currentUser) return [];

    const relatedUserIds = new Set();
    const taskRelations = [];

    dashboardTasks.forEach(task => {
      if (task.user_id === currentUser.id && task.create_by && task.create_by !== currentUser.id) {
        relatedUserIds.add(task.create_by);
        taskRelations.push({ userId: task.create_by, type: 'received' });
      }
      if (task.create_by === currentUser.id && task.user_id && task.user_id !== currentUser.id) {
        relatedUserIds.add(task.user_id);
        taskRelations.push({ userId: task.user_id, type: 'assigned' });
      }
    });

    return Array.from(relatedUserIds).map(id => {
      const contactUser = dashboardUsers.find(u => u.id === id) || { id, full_name: 'Unknown User' };
      const isReceived = taskRelations.some(r => r.userId === id && r.type === 'received');
      const isAssigned = taskRelations.some(r => r.userId === id && r.type === 'assigned');
      
      let interactionType = '';
      if (isReceived && isAssigned) interactionType = 'Trao đổi qua lại';
      else if (isReceived) interactionType = 'Nhận task từ người này';
      else if (isAssigned) interactionType = 'Đã giao task cho';

      return {
        ...contactUser,
        interactionType
      };
    }).filter(u => u.full_name || u.email || u.name);
  }, [dashboardTasks, dashboardUsers, currentUser]);

  // Lấy danh sách thành viên trong team (ORGANISATION)
  const teamMembers = useMemo(() => {
    if (!dashboardUsers || !currentUser) return [];
    return dashboardUsers.filter(u => u.team === team && u.id !== currentUser.id);
  }, [dashboardUsers, currentUser, team]);

  if (!isOpen || !currentUser) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        await updateUserProfile({
          ...user,
          image: base64String,
          avatarFrame: 'none'
        });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to upload image:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const tabs = ['OVERVIEW', 'CONTACT', 'ORGANISATION', 'LINKEDIN'];
  if (!viewedUser) {
    tabs.push('SECURITY');
  }

  return (
    <AnimatePresence>
      <div className="profile-modal-container fixed inset-0 z-[999] flex justify-center items-center p-4">
        {/* Backdrop overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="profile-backdrop"
        />

        {/* Modal card Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className={`profile-card ${isDark ? 'profile-dark' : ''}`}
        >
          {/* Main Content Area */}
          <div className="profile-content-wrapper">
            
            {/* Top Right Utilities */}
            <div className="profile-top-utilities flex items-center gap-2">
              {viewedUser && (
                <button 
                  onClick={() => setViewedUser(null)} 
                  className="mr-2 text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 hover:underline transition-all"
                >
                  My Profile
                </button>
              )}

              <button 
                onClick={async () => { onClose(); await logout(); }}
                className="profile-icon-btn text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" 
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>

              <button onClick={onClose} className="profile-icon-btn">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Header Section */}
            <div className="profile-header-section">
              <div className="profile-avatar-group">
                
                {/* Avatar with Gradient Border and Badge */}
                <div className="relative shrink-0 group">
                  <div className="profile-avatar-gradient-ring">
                    <div className="profile-avatar-inner">
                      <AvatarWithFrame 
                        user={currentUser} 
                        sizeClass="w-[84px] h-[84px]" 
                        frameClass="w-[108px] h-[108px]" 
                      />
                    </div>
                  </div>
                  
                  {/* Shield Badge */}
                  <div className="profile-shield-badge">
                    <ShieldCheck size={16} strokeWidth={2.5} />
                  </div>
                  
                  {/* File picker button - visible on hover */}
                  {!viewedUser && (
                    <>
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="profile-camera-btn"
                      >
                        <Camera size={14} />
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </>
                  )}
                </div>

                {/* Name & Title */}
                <div>
                  <h2 className="profile-name">{fullName}</h2>
                  <div className="profile-subtitle-group">
                    <span className="profile-job-title">{position}</span>
                    <span className="profile-dot-separator"></span>
                    <span className="profile-team-badge">
                      {team}
                    </span>
                  </div>
                </div>
              </div>


            </div>

            {/* Navigation Tabs */}
            <div className="profile-tabs-container">
              <nav className="profile-tabs-nav">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`profile-tab-button ${activeTab === tab ? 'active' : ''}`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content Section */}
            <div className="profile-tab-content-area">
              {activeTab === 'OVERVIEW' && (
                <div className="profile-tab-pane">
                  
                  {/* Section Header */}
                  <div className="profile-section-header">
                    <h3 className="profile-section-title">
                      Contact Information
                    </h3>

                  </div>
                  
                  {/* Grid Information */}
                  <div className="profile-info-grid">
                    
                    {/* Email */}
                    <div className="profile-info-item">
                      <div className="profile-info-icon-box email">
                        <Mail className="w-[22px] h-[22px]" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="profile-info-label">Email / Chat</p>
                        <p className="profile-info-value link">
                          {email}
                        </p>
                      </div>
                    </div>

                    {/* Company */}
                    <div className="profile-info-item">
                      <div className="profile-info-icon-box company">
                        <Building2 className="w-[22px] h-[22px]" strokeWidth={2} />
                      </div>
                      <div>
                        <p className="profile-info-label">Company</p>
                        <p className="profile-info-value">{company}</p>
                      </div>
                    </div>

                    {/* Work Location */}
                    <div className="profile-info-item">
                      <div className="profile-info-icon-box location">
                        <MapPin className="w-[22px] h-[22px]" strokeWidth={2} />
                      </div>
                      <div>
                        <p className="profile-info-label">Work location</p>
                        <p className="profile-info-value">{location}</p>
                      </div>
                    </div>

                    {/* Department */}
                    <div className="profile-info-item">
                      <div className="profile-info-icon-box department">
                        <Users2 className="w-[22px] h-[22px]" strokeWidth={2} />
                      </div>
                      <div>
                        <p className="profile-info-label">Department</p>
                        <p className="profile-info-value">{team}</p>
                      </div>
                    </div>

                    {/* Job Title */}
                    <div className="profile-info-item">
                      <div className="profile-info-icon-box job">
                        <Briefcase className="w-[22px] h-[22px]" strokeWidth={2} />
                      </div>
                      <div>
                        <p className="profile-info-label">Job title</p>
                        <p className="profile-info-value">{position}</p>
                      </div>
                    </div>

                  </div>


                </div>
              )}
              
              {activeTab === 'CONTACT' && (
                <div className="profile-tab-pane">
                  <div className="profile-section-header">
                    <h3 className="profile-section-title">Recent Contacts</h3>
                  </div>
                  <div className="profile-info-grid">
                    {contacts.length > 0 ? contacts.map(contact => (
                      <div key={contact.id} onClick={() => setViewedUser(contact)} className="profile-info-item cursor-pointer">
                        <div className="profile-info-icon-box">
                          {contact.image && contact.image !== 'none' ? (
                            <img src={contact.image} alt="Avatar" className="w-full h-full rounded-2xl object-cover p-1" />
                          ) : (
                            <Users2 className="w-[22px] h-[22px]" strokeWidth={2} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="profile-info-label">{contact.interactionType}</p>
                          <p className="profile-info-value">{contact.full_name || contact.name || contact.email}</p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-slate-400 col-span-2">Chưa có tương tác nào trong tuần này.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'ORGANISATION' && (
                <div className="profile-tab-pane">
                  <div className="profile-section-header">
                    <h3 className="profile-section-title">Team Members ({team})</h3>
                  </div>
                  <div className="profile-info-grid">
                    {teamMembers.length > 0 ? teamMembers.map(member => (
                      <div key={member.id} onClick={() => setViewedUser(member)} className="profile-info-item group relative cursor-pointer">
                        <div className="profile-info-icon-box">
                          {member.image && member.image !== 'none' ? (
                            <img src={member.image} alt="Avatar" className="w-full h-full rounded-2xl object-cover p-1" />
                          ) : (
                            <Building2 className="w-[22px] h-[22px]" strokeWidth={2} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="profile-info-label">{member.position || 'Thành viên'}</p>
                          <p className="profile-info-value">{member.full_name || member.name || member.email}</p>
                        </div>
                        <button className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100">
                          <MessageSquare className="w-5 h-5" />
                        </button>
                      </div>
                    )) : (
                      <p className="text-sm text-slate-400 col-span-2">Không tìm thấy thành viên nào cùng team.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'LINKEDIN' && (
                <div className="profile-tab-pane" style={{ textAlign: 'center', opacity: 0.6, padding: '48px' }}>
                  <Briefcase size={48} className="mx-auto mb-4" style={{ color: '#94a3b8' }} />
                  <p style={{ color: '#64748b' }}>LinkedIn integration is currently under development.</p>
                </div>
              )}

              {activeTab === 'SECURITY' && (
                <div className="profile-tab-pane">
                  <div className="profile-section-header">
                    <h3 className="profile-section-title">Đổi mật khẩu</h3>
                  </div>
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm mt-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mật khẩu cũ</label>
                      <input 
                        type="password" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-600 dark:text-white"
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mật khẩu mới</label>
                      <input 
                        type="password" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-600 dark:text-white"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Xác nhận mật khẩu</label>
                      <input 
                        type="password" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-600 dark:text-white"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    {pwdMessage && <p className={`text-sm ${pwdMessage.includes('thành công') ? 'text-emerald-500' : 'text-rose-500'}`}>{pwdMessage}</p>}
                    <button 
                      type="submit" 
                      disabled={isChangingPwd}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isChangingPwd ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Gradient Border Effect */}
          <div className="profile-bottom-border"></div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
