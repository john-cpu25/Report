import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const hashPassword = async (password) => {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Function to sync user with Supabase APEX_User table
    const syncUserWithSupabase = async (email) => {
        try {
            const { data: apexUser, error: apexErr } = await supabase
                .from('APEX_User')
                .select('*')
                .ilike('email', email)
                .maybeSingle();

            if (apexUser) return apexUser;

            const { data: nmkUser, error } = await supabase
                .from('NMK_User')
                .select('*')
                .ilike('email', email)
                .maybeSingle();

            if (error) {
                console.error('Error fetching user from Supabase:', error);
                return null;
            }

            return nmkUser;
        } catch (err) {
            console.error('Unexpected error during Supabase sync:', err);
            return null;
        }
    };

    const handleUserSync = useCallback(async (email) => {
        setLoading(true);
        email = (email || '').toLowerCase().trim();
        if (email) {
            let dbUser = await syncUserWithSupabase(email);

            if (dbUser) {
                localStorage.setItem('last_login_email', email);
                
                const roleField = dbUser.user_role || dbUser.role || dbUser.Role || dbUser.access_level || dbUser.permission || '';
                const roleValue = roleField.toString().trim().toLowerCase();
                
                const finalIsAdmin = roleValue.includes('admin');
                const finalIsLeader = roleValue.includes('leader');
                
                console.log('[AuthContext] User:', dbUser.name, '| Email:', email, '| Admin:', finalIsAdmin);
                
                setUser({
                    ...dbUser,
                    isAdmin: finalIsAdmin,
                    isLeader: finalIsLeader
                });
                setError(null);
                setLoading(false);
                return true;
            } else {
                setError(`Email ${email} không có quyền truy cập hệ thống.`);
            }
        }
        setLoading(false);
        return false;
    }, []);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const isAdminMode = queryParams.get('admin_mode') === 'true';
        const isLeaderMode = queryParams.get('leader_mode') === 'true';

        if (isAdminMode) {
            console.log('[AuthContext] Admin Bypass Mode Active');
            const savedBypassUser = localStorage.getItem('bypass_user_profile');
            if (savedBypassUser) {
                try {
                    setUser(JSON.parse(savedBypassUser));
                } catch (e) {
                    console.error('[AuthContext] Error parsing saved bypass user:', e);
                    setUser({
                        name: 'Super Admin (Bypass)',
                        email: 'admin@bypass.local',
                        isAdmin: true,
                        isLeader: true,
                        team: 'Management',
                        location: 'VIETNAM',
                        image: null
                    });
                }
            } else {
                setUser({
                    name: 'Super Admin (Bypass)',
                    email: 'admin@bypass.local',
                    isAdmin: true,
                    isLeader: true,
                    team: 'Management',
                    location: 'VIETNAM',
                    image: null
                });
            }
            setLoading(false);
            return;
        }

        if (isLeaderMode) {
            console.log('[AuthContext] Leader Bypass Mode Active');
            const savedLeaderUser = localStorage.getItem('bypass_leader_profile');
            if (savedLeaderUser) {
                try {
                    setUser(JSON.parse(savedLeaderUser));
                } catch (e) {
                    console.error('[AuthContext] Error parsing saved leader bypass user:', e);
                    setUser({
                        name: 'Nhân Nguyễn',
                        email: 'leader@bypass.local',
                        isAdmin: false,
                        isLeader: true,
                        team: 'BIM',
                        location: 'VIETNAM',
                        image: null
                    });
                }
            } else {
                setUser({
                    name: 'Nhân Nguyễn',
                    email: 'leader@bypass.local',
                    isAdmin: false,
                    isLeader: true,
                    team: 'BIM',
                    location: 'VIETNAM',
                    image: null
                });
            }
            setLoading(false);
            return;
        }

        // Fallback: localStorage email
        const lastEmail = localStorage.getItem('last_login_email');
        if (lastEmail) {
            console.log('[AuthContext] Fallback: localStorage email →', lastEmail);
            handleUserSync(lastEmail);
            return;
        }

        setLoading(false);
    }, [handleUserSync]);

    // ── LOGIN: Email & Password ──
    const login = async (email, password) => {
        setLoading(true);
        setError(null);
        email = (email || '').toLowerCase().trim();
        
        try {
            const dbUser = await syncUserWithSupabase(email);
            
            if (!dbUser) {
                setError(`Email ${email} không tồn tại trong hệ thống.`);
                setLoading(false);
                return false;
            }

            const hashedPassword = await hashPassword(password);

            // Kiểm tra mật khẩu
            if (!dbUser.password) {
                // Người dùng chưa có mật khẩu -> Lấy mật khẩu vừa nhập làm mật khẩu chính thức (đã mã hóa)
                await supabase.from('APEX_User').update({ password: hashedPassword }).ilike('email', email);
                await supabase.from('NMK_User').update({ password: hashedPassword }).ilike('email', email);
            } else if (dbUser.password !== hashedPassword && dbUser.password !== password) {
                // Cho phép pass qua nếu DB đang lưu plain-text (chưa kịp đổi)
                setError('Sai mật khẩu. Vui lòng thử lại.');
                setLoading(false);
                return false;
            } else if (dbUser.password === password) {
                // Tự động nâng cấp mật khẩu lên dạng mã hóa nếu họ nhập đúng plain-text
                await supabase.from('APEX_User').update({ password: hashedPassword }).ilike('email', email);
                await supabase.from('NMK_User').update({ password: hashedPassword }).ilike('email', email);
            }

            // Nếu đúng mật khẩu, dùng handleUserSync để hoàn tất việc set user và role
            return await handleUserSync(email);
        } catch (err) {
            setError('Lỗi kết nối khi đăng nhập.');
            setLoading(false);
            return false;
        }
    };

    // ── LOGOUT: Clear localStorage ──
    const logout = async () => {
        localStorage.removeItem('last_login_email');
        setUser(null);
    };

    const changePassword = async (oldPassword, newPassword) => {
        if (!user || !user.email) return { success: false, message: 'Chưa đăng nhập' };
        
        const hashedOld = await hashPassword(oldPassword);
        const hashedNew = await hashPassword(newPassword);

        const dbUser = await syncUserWithSupabase(user.email);
        if (!dbUser) return { success: false, message: 'Tài khoản không tồn tại' };

        if (dbUser.password !== hashedOld && dbUser.password !== oldPassword) {
            return { success: false, message: 'Mật khẩu cũ không chính xác' };
        }

        await supabase.from('APEX_User').update({ password: hashedNew }).ilike('email', user.email);
        await supabase.from('NMK_User').update({ password: hashedNew }).ilike('email', user.email);

        return { success: true, message: 'Đổi mật khẩu thành công' };
    };

    const adminResetUserPassword = async (targetEmail, randomPassword) => {
        if (!user?.isAdmin) return { success: false, message: 'Không có quyền Admin' };
        const hashedPassword = await hashPassword(randomPassword);
        await supabase.from('APEX_User').update({ password: hashedPassword }).ilike('email', targetEmail);
        await supabase.from('NMK_User').update({ password: hashedPassword }).ilike('email', targetEmail);
        return { success: true, message: 'Reset thành công' };
    };

    const updateUserProfile = async (updatedData) => {
        const queryParams = new URLSearchParams(window.location.search);
        const isAdminMode = queryParams.get('admin_mode') === 'true';

        const newUser = { ...user, ...updatedData };
        setUser(newUser);

        if (isAdminMode) {
            localStorage.setItem('bypass_user_profile', JSON.stringify(newUser));
        } else if (user?.email) {
            const profilePayload = {
                name: newUser.name,
                full_name: newUser.full_name || newUser.name,
                image: newUser.image, // base64 compressed
                location: newUser.location || 'VietNam',
                team: newUser.team || 'Management',
                position: newUser.position || 'Engineer'
            };
            await supabase.from('APEX_User').update(profilePayload).ilike('email', user.email);
            await supabase.from('NMK_User').update(profilePayload).ilike('email', user.email);
        }
    };

    const getGraphToken = async () => {
        return null;
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            error, 
            login, 
            logout,
            updateUserProfile,
            changePassword,
            adminResetUserPassword,
            getGraphToken,
            isAdmin: user?.isAdmin || false,
            isLeader: user?.isLeader || false,
            userTeam: user?.team || null
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
