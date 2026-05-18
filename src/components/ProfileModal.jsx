import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, MapPin, Briefcase, Mail, Users, Award, Shield, Loader2, Check, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import AvatarWithFrame from './AvatarWithFrame';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateUserProfile } = useAuth();
  const { theme } = useApp();
  
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [selectedFrame, setSelectedFrame] = useState('none');
  const [formData, setFormData] = useState({
    shortName: '',
    fullName: '',
    team: 'STR MODELING TEAM',
    location: 'VIETNAM',
    position: 'Engineer',
    email: ''
  });
  
  const [profileImage, setProfileImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const fileInputRef = useRef(null);

  const presetAvatars = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  ];

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        shortName: user.name || '',
        fullName: user.full_name || user.displayName || user.name || '',
        team: user.team || 'STR MODELING TEAM',
        location: user.location || 'VIETNAM',
        position: user.position || 'Engineer',
        email: user.email || ''
      });
      setProfileImage(user.image || null);
      setSelectedFrame(user.avatarFrame || 'none');
      
      // Try to find if user's current image matches a gradient preset
      if (user.image && !user.image.startsWith('data:image')) {
        const foundIdx = presetAvatars.indexOf(user.image);
        if (foundIdx !== -1) {
          setSelectedAvatar(foundIdx);
        }
      }
      setErrorMessage('');
      setSaveSuccess(false);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePresetSelect = (index) => {
    setSelectedAvatar(index);
    setProfileImage(presetAvatars[index]);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size too large. Please select an image under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 128, 128);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setProfileImage(compressedBase64);
        setErrorMessage('');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.shortName.trim()) {
      setErrorMessage('Short Name field cannot be empty.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    
    try {
      await updateUserProfile({
        name: formData.shortName.trim(),
        full_name: formData.fullName.trim(),
        team: formData.team,
        location: formData.location,
        position: formData.position,
        image: profileImage || presetAvatars[selectedAvatar],
        avatarFrame: selectedFrame // Stage and save selected frame!
      });
      
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setErrorMessage('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isDark = theme === 'GALAXY';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-md z-40"
        />

        {/* Modal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className={`w-full rounded-[8px] shadow-2xl overflow-hidden z-50 ${
            isDark 
              ? 'bg-slate-900 border border-white/10 text-slate-100' 
              : 'bg-white text-stone-800'
          }`}
          style={{ maxWidth: '768px', width: '100%' }}
        >
          {/* Header (Tall Gradient Banner with inline padding & height) */}
          <div 
            className="relative bg-gradient-to-r from-indigo-600 to-purple-600"
            style={{ paddingTop: '32px', paddingBottom: '96px', paddingLeft: '32px', paddingRight: '32px', minHeight: '180px' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={24} />
            </button>
            <h1 className="text-3xl font-bold text-white">User Profile</h1>
            <p className="text-indigo-100 mt-2">Manage your personal information and avatar</p>
          </div>

          {/* Avatar Section */}
          <div className="relative z-10" style={{ paddingLeft: '32px', paddingRight: '32px', marginTop: '-64px', marginBottom: '32px' }}>
            <div className="flex items-end gap-6">
              {/* BIG AVATAR PREVIEW WITH FRAME */}
              <div className="relative">
                <AvatarWithFrame 
                  user={{ 
                    ...user, 
                    image: profileImage || presetAvatars[selectedAvatar], 
                    avatarFrame: selectedFrame 
                  }} 
                  sizeClass="w-32 h-32" 
                  borderClass="border-2 border-white shadow-lg"
                />
                
                {/* File picker button */}
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`absolute bottom-0 right-0 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-colors cursor-pointer border z-20 bg-white hover:bg-slate-50 border-slate-200 text-slate-700`}
                >
                  <Camera size={18} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              <div className="flex-1 mb-2">
                <h2 className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{formData.fullName || 'User Profile'}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-xs font-black uppercase tracking-wider">
                    <Award size={13} className="mb-0.5" />
                    {user.isAdmin ? 'System Admin' : user.isLeader ? 'Leader' : 'User'}
                  </span>
                  
                  {user.level !== undefined && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 bg-slate-500/10 border border-slate-500/20 rounded-full text-xs font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                      Level {user.level}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Avatar customization panels side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginTop: '24px' }}>
              {/* Preset Avatars */}
              <div>
                <p className={isDark ? "text-xs font-black uppercase tracking-widest text-indigo-400" : "text-xs font-black uppercase tracking-widest text-emerald-600"} style={{ marginBottom: '12px' }}>Preset Avatars</p>
                <div className="flex flex-wrap gap-2.5">
                  {presetAvatars.map((gradient, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handlePresetSelect(index)}
                      className={`w-12 h-12 rounded-[8px] shadow border border-white/5 active:scale-95 transition-all overflow-hidden relative group/preset ${
                        selectedAvatar === index && (!profileImage || profileImage.startsWith('linear-gradient'))
                          ? 'ring-4 ring-indigo-500 ring-offset-2 scale-105'
                          : 'hover:scale-105 opacity-70 hover:opacity-100'
                      }`}
                      style={{ background: gradient }}
                      aria-label={`Select avatar ${index + 1}`}
                    >
                      <span className="absolute inset-0 bg-black/10 opacity-0 group-hover/preset:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>

              {/* PREMIUM AVATAR FRAMES */}
              <div>
                <p className={isDark ? "text-xs font-black uppercase tracking-widest text-indigo-400" : "text-xs font-black uppercase tracking-widest text-emerald-600"} style={{ marginBottom: '12px' }}>
                  <Sparkles size={12} className="inline mr-1 mb-0.5 animate-pulse" />
                  Avatar Frames
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { id: 'none', label: 'None', style: 'bg-slate-800' },
                    { id: 'crystal', label: 'Glacier', style: 'bg-gradient-to-br from-cyan-400 to-indigo-500 border-cyan-300' },
                    { id: 'gold', label: 'Royal', style: 'bg-gradient-to-br from-yellow-400 to-amber-600 border-amber-300' },
                    { id: 'cyber', label: 'Cyber', style: 'bg-gradient-to-br from-pink-500 to-purple-600 border-pink-400' }
                  ].map((frm) => (
                    <button
                      key={frm.id}
                      type="button"
                      onClick={() => setSelectedFrame(frm.id)}
                      className={`w-12 h-12 rounded-[8px] border active:scale-95 transition-all flex flex-col items-center justify-center relative ${
                        selectedFrame === frm.id
                          ? 'ring-4 ring-indigo-500 ring-offset-2 scale-105 border-white'
                          : 'border-white/5 opacity-70 hover:opacity-100 hover:scale-105'
                      } ${isDark ? 'bg-slate-950/60' : 'bg-stone-50'}`}
                      aria-label={`Select frame ${frm.label}`}
                    >
                      <div className={`w-5 h-5 rounded ${frm.style} flex items-center justify-center text-[7px] font-black text-white`}>
                        {frm.label.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[8px] font-black uppercase mt-1 text-slate-400 leading-none">{frm.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className={`text-[10px] font-bold mt-3 ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>
              Select a gradient background, choose a premium avatar frame, or upload your own custom picture!
            </p>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSave} style={{ paddingLeft: '32px', paddingRight: '32px', paddingBottom: '32px' }}>
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold rounded-lg uppercase tracking-wide" style={{ marginBottom: '24px' }}>
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '24px' }}>
              {/* Short Name */}
              <div>
                <label className={`block text-xs font-black uppercase tracking-widest ${isDark ? 'text-indigo-400' : 'text-emerald-600'}`} style={{ marginBottom: '8px' }}>
                  Short Name
                </label>
                <input
                  type="text"
                  value={formData.shortName}
                  onChange={(e) => handleInputChange('shortName', e.target.value)}
                  className={`w-full border rounded-[6px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-bold ${
                    isDark 
                      ? 'bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600' 
                      : 'bg-stone-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
                  style={{ height: '48px', paddingLeft: '16px', paddingRight: '16px' }}
                />
              </div>

              {/* Full Name */}
              <div>
                <label className={`block text-xs font-black uppercase tracking-widest ${isDark ? 'text-indigo-400' : 'text-emerald-600'}`} style={{ marginBottom: '8px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className={`w-full border rounded-[6px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-bold ${
                    isDark 
                      ? 'bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600' 
                      : 'bg-stone-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
                  style={{ height: '48px', paddingLeft: '16px', paddingRight: '16px' }}
                />
              </div>

              {/* Team */}
              <div>
                <label className={`block text-xs font-black uppercase tracking-widest ${isDark ? 'text-indigo-400' : 'text-emerald-600'}`} style={{ marginBottom: '8px' }}>
                  <Users size={14} className="inline mr-1.5 mb-0.5" />
                  Team
                </label>
                <select
                  value={formData.team}
                  onChange={(e) => handleInputChange('team', e.target.value)}
                  className={`w-full border rounded-[6px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-bold ${
                    isDark 
                      ? 'bg-slate-950/60 border-white/10 text-white bg-slate-900' 
                      : 'bg-stone-50 border-slate-200 text-slate-900 bg-white'
                  }`}
                  style={{ height: '48px', paddingLeft: '16px', paddingRight: '16px' }}
                >
                  <option value="STR MODELING TEAM">STR MODELING TEAM</option>
                  <option value="QA CHECK TEAM">QA CHECK TEAM</option>
                  <option value="SLAB DESIGN TEAM">SLAB DESIGN TEAM</option>
                  <option value="DETAILING TEAM">DETAILING TEAM</option>
                  <option value="MANAGEMENT">MANAGEMENT</option>
                  <option value="DEVELOPER">DEVELOPER</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className={`block text-xs font-black uppercase tracking-widest ${isDark ? 'text-indigo-400' : 'text-emerald-600'}`} style={{ marginBottom: '8px' }}>
                  <MapPin size={14} className="inline mr-1.5 mb-0.5" />
                  Location
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className={`w-full border rounded-[6px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-bold ${
                    isDark 
                      ? 'bg-slate-950/60 border-white/10 text-white bg-slate-900' 
                      : 'bg-stone-50 border-slate-200 text-slate-900 bg-white'
                  }`}
                  style={{ height: '48px', paddingLeft: '16px', paddingRight: '16px' }}
                >
                  <option value="VIETNAM">VIETNAM</option>
                  <option value="AUSTRALIA">AUSTRALIA</option>
                </select>
              </div>

              {/* Position */}
              <div>
                <label className={`block text-xs font-black uppercase tracking-widest ${isDark ? 'text-indigo-400' : 'text-emerald-600'}`} style={{ marginBottom: '8px' }}>
                  <Briefcase size={14} className="inline mr-1.5 mb-0.5" />
                  Position
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  className={`w-full border rounded-[6px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-bold ${
                    isDark 
                      ? 'bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600' 
                      : 'bg-stone-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
                  style={{ height: '48px', paddingLeft: '16px', paddingRight: '16px' }}
                />
              </div>

              {/* Email */}
              <div>
                <label className={`block text-xs font-black uppercase tracking-widest ${isDark ? 'text-indigo-400' : 'text-emerald-600'}`} style={{ marginBottom: '8px' }}>
                  <Mail size={14} className="inline mr-1.5 mb-0.5" />
                  Email Address
                </label>
                <div 
                  className={`text-sm font-mono border rounded-[6px] flex items-center select-all select-none ${
                    isDark 
                      ? 'bg-slate-950/20 border-white/5 text-slate-500' 
                      : 'bg-stone-100 border-stone-200/50 text-stone-400'
                  }`}
                  style={{ height: '48px', paddingLeft: '16px', paddingRight: '16px' }}
                >
                  {formData.email}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div 
              className="flex justify-end gap-3 border-t border-slate-200 dark:border-white/5" 
              style={{ marginTop: '32px', paddingTop: '24px' }}
            >
              <button 
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-6 font-semibold text-sm transition-all duration-200 cursor-pointer hover:opacity-90 disabled:opacity-50"
                style={{ 
                  height: '44px', 
                  borderRadius: '14px', 
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f0f4f9', 
                  color: isDark ? '#f8fafc' : '#1e3a8a',
                  border: 'none'
                }}
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSaving || saveSuccess}
                className="px-7 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ 
                  height: '44px', 
                  borderRadius: '14px',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : saveSuccess ? (
                  <span>Saved!</span>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
