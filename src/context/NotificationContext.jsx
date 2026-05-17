import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const queryParams = new URLSearchParams(window.location.search);
  const isAdminMode = queryParams.get('admin_mode') === 'true';

  // Seed default notifications for bypass mode to immediately showcase visual quality
  const seedDefaultNotifications = () => {
    const defaultNotifs = [
      {
        id: 'seed-1',
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        recipient: 'admin@bypass.local',
        sender: 'nhan.nguyen@rincovitch.com.au',
        senderName: 'Nhan Nguyen',
        type: 'TASK_COMPLETED',
        title: 'Nhiệm vụ hoàn thành 🎉',
        content: 'Thành viên **Khoa Le** đã hoàn thành nhiệm vụ **"Column Detailing L2"** thuộc dự án **"FGWB"**.',
        is_read: false,
        link: '?tab=dashboard'
      },
      {
        id: 'seed-2',
        created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        recipient: 'admin@bypass.local',
        sender: 'quy.huynh@rincovitch.com.au',
        senderName: 'Quý Huỳnh',
        type: 'TASK_INTERRUPTED',
        title: 'Nhiệm vụ bị gián đoạn 🚨',
        content: 'Thành viên **Quý Huỳnh** báo cáo **GIÁN ĐOẠN** nhiệm vụ **"Slab Design"** do: *Đợi phản hồi RFI bản vẽ*.',
        is_read: false,
        link: '?tab=dashboard'
      },
      {
        id: 'seed-3',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        recipient: 'admin@bypass.local',
        sender: 'khoa.le@rincovitch.com.au',
        senderName: 'Khoa Le',
        type: 'LEAVE_REQUESTED',
        title: 'Đăng ký nghỉ phép 📅',
        content: 'Thành viên **Khoa Le** đăng ký nghỉ phép ngày **19/05/2026** (1 ngày).',
        is_read: true,
        link: '?tab=annual_leave'
      }
    ];
    localStorage.setItem('bypass_notifications', JSON.stringify(defaultNotifs));
    return defaultNotifs;
  };

  const fetchNotifications = async () => {
    if (!user) return;
    setIsLoading(true);

    if (isAdminMode) {
      const saved = localStorage.getItem('bypass_notifications');
      if (saved) {
        try {
          setNotifications(JSON.parse(saved));
        } catch (e) {
          console.error('[NotificationContext] Error parsing notifications:', e);
          setNotifications(seedDefaultNotifications());
        }
      } else {
        setNotifications(seedDefaultNotifications());
      }
      setIsLoading(false);
    } else {
      // Real database fetch with robust error fallback
      try {
        const { data, error } = await supabase
          .from('NMK_Notification')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          // If table doesn't exist yet, gracefully fall back to local storage
          if (error.code === '42P01') {
            console.warn('[NotificationContext] NMK_Notification table not found in Supabase. Falling back to local storage.');
            const savedLocal = localStorage.getItem('app_notifications');
            setNotifications(savedLocal ? JSON.parse(savedLocal) : []);
          } else {
            throw error;
          }
        } else {
          setNotifications(data || []);
        }
      } catch (err) {
        console.error('[NotificationContext] Supabase fetch error:', err);
        // Fallback to local storage on general error
        const savedLocal = localStorage.getItem('app_notifications');
        setNotifications(savedLocal ? JSON.parse(savedLocal) : []);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const sendNotification = async ({ recipient, sender, senderName, type, title, content, link }) => {
    const newNotif = {
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      recipient: recipient || 'admin@bypass.local',
      sender: sender || user?.email || 'system',
      senderName: senderName || user?.name || 'Hệ thống',
      type: type || 'SYSTEM',
      title: title,
      content: content,
      is_read: false,
      link: link || ''
    };

    if (isAdminMode) {
      setNotifications(prev => {
        const updated = [newNotif, ...prev];
        localStorage.setItem('bypass_notifications', JSON.stringify(updated));
        return updated;
      });
    } else {
      try {
        const { data, error } = await supabase
          .from('NMK_Notification')
          .insert([
            {
              recipient_id: recipient,
              sender_id: sender || user?.id,
              sender_name: senderName || user?.name,
              type,
              title,
              content,
              is_read: false,
              link
            }
          ])
          .select();

        if (error) {
          if (error.code === '42P01') {
            // Fallback for missing table
            setNotifications(prev => {
              const updated = [newNotif, ...prev];
              localStorage.setItem('app_notifications', JSON.stringify(updated));
              return updated;
            });
          } else {
            throw error;
          }
        } else {
          setNotifications(prev => [data[0], ...prev]);
        }
      } catch (err) {
        console.warn('[NotificationContext] Failed to insert notification in Supabase. Appending locally:', err);
        setNotifications(prev => {
          const updated = [newNotif, ...prev];
          localStorage.setItem('app_notifications', JSON.stringify(updated));
          return updated;
        });
      }
    }
  };

  const markAsRead = async (id) => {
    if (isAdminMode) {
      setNotifications(prev => {
        const updated = prev.map(n => n.id === id ? { ...n, is_read: true } : n);
        localStorage.setItem('bypass_notifications', JSON.stringify(updated));
        return updated;
      });
    } else {
      try {
        const { error } = await supabase
          .from('NMK_Notification')
          .update({ is_read: true })
          .eq('id', id);

        if (error) {
          if (error.code === '42P01') {
            setNotifications(prev => {
              const updated = prev.map(n => n.id === id ? { ...n, is_read: true } : n);
              localStorage.setItem('app_notifications', JSON.stringify(updated));
              return updated;
            });
          } else {
            throw error;
          }
        } else {
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        }
      } catch (err) {
        console.warn('[NotificationContext] Failed to update read state in Supabase. Updating locally:', err);
        setNotifications(prev => {
          const updated = prev.map(n => n.id === id ? { ...n, is_read: true } : n);
          localStorage.setItem('app_notifications', JSON.stringify(updated));
          return updated;
        });
      }
    }
  };

  const markAllAsRead = async () => {
    if (isAdminMode) {
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, is_read: true }));
        localStorage.setItem('bypass_notifications', JSON.stringify(updated));
        return updated;
      });
    } else {
      try {
        const { error } = await supabase
          .from('NMK_Notification')
          .update({ is_read: true })
          .eq('is_read', false); // Mark all unread as read

        if (error) {
          if (error.code === '42P01') {
            setNotifications(prev => {
              const updated = prev.map(n => ({ ...n, is_read: true }));
              localStorage.setItem('app_notifications', JSON.stringify(updated));
              return updated;
            });
          } else {
            throw error;
          }
        } else {
          setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }
      } catch (err) {
        console.warn('[NotificationContext] Failed to update all read states in Supabase. Updating locally:', err);
        setNotifications(prev => {
          const updated = prev.map(n => ({ ...n, is_read: true }));
          localStorage.setItem('app_notifications', JSON.stringify(updated));
          return updated;
        });
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        sendNotification,
        markAsRead,
        markAllAsRead,
        fetchNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
