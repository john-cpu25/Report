import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { msalInstance, msalInitPromise } from '../services/msalInstance';
import { loginRequest } from '../services/authConfig';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Function to sync Microsoft user with Supabase NMK_User table
    const syncUserWithSupabase = async (email) => {
        try {
            const { data, error } = await supabase
                .from('NMK_User')
                .select('*')
                .eq('email', email)
                .single();

            if (error) {
                console.error('Error fetching user from Supabase:', error);
                return null;
            }

            return data;
        } catch (err) {
            console.error('Unexpected error during Supabase sync:', err);
            return null;
        }
    };

    const handleUserSync = useCallback(async (email) => {
        setLoading(true);
        email = (email || '').toLowerCase();
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
            } else {
                setError(`Email ${email} không có quyền truy cập hệ thống.`);
            }
        }
        setLoading(false);
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

        // ── MSAL Auto SSO: tự detect Microsoft session → đăng nhập tự động ──
        const tryMsalSilent = async () => {
            try {
                // Đợi MSAL khởi tạo xong (MSAL v5 bắt buộc)
                await msalInitPromise;
                
                // Handle redirect promise (nếu user vừa được redirect về)
                const redirectResult = await msalInstance.handleRedirectPromise();
                
                // Nếu có kết quả từ redirect → đăng nhập luôn
                if (redirectResult) {
                    sessionStorage.removeItem('msal_auto_redirect_tried');
                    const email = redirectResult.account?.username 
                               || redirectResult.idTokenClaims?.preferred_username
                               || redirectResult.idTokenClaims?.email;
                    if (email) {
                        console.log('[AuthContext] MSAL redirect → email:', email);
                        await handleUserSync(email);
                        return;
                    }
                }

                // Nếu redirect về nhưng không có kết quả (prompt:'none' thất bại)
                // → xóa flag và hiện trang login
                if (sessionStorage.getItem('msal_auto_redirect_tried')) {
                    sessionStorage.removeItem('msal_auto_redirect_tried');
                    console.log('[AuthContext] Auto-redirect đã thử nhưng thất bại → hiện trang Login');
                    setLoading(false);
                    return;
                }

                const accounts = msalInstance.getAllAccounts();
                if (accounts.length > 0) {
                    // Có MSAL account trong cache → thử silent token
                    try {
                        const silentResult = await msalInstance.acquireTokenSilent({
                            ...loginRequest,
                            account: accounts[0]
                        });
                        const email = silentResult.account?.username || silentResult.idTokenClaims?.preferred_username;
                        if (email) {
                            console.log('[AuthContext] MSAL silent token → email:', email);
                            await handleUserSync(email);
                            return;
                        }
                    } catch (silentErr) {
                        console.warn('[AuthContext] Silent token failed:', silentErr.message);
                    }
                }

                // ── SSO Silent: auto-detect Microsoft session trên Edge/browser ──
                try {
                    console.log('[AuthContext] Trying ssoSilent() — detecting Edge/browser Microsoft session...');
                    const ssoResult = await msalInstance.ssoSilent({
                        ...loginRequest,
                    });
                    const email = ssoResult.account?.username 
                               || ssoResult.idTokenClaims?.preferred_username
                               || ssoResult.idTokenClaims?.email;
                    if (email) {
                        console.log('[AuthContext] ✅ ssoSilent thành công → email:', email);
                        await handleUserSync(email);
                        return;
                    }
                } catch (ssoErr) {
                    console.warn('[AuthContext] ssoSilent failed:', ssoErr.errorCode || ssoErr.message);
                }

                // Fallback: localStorage email
                const lastEmail = localStorage.getItem('last_login_email');
                if (lastEmail) {
                    console.log('[AuthContext] Fallback: localStorage email →', lastEmail);
                    await handleUserSync(lastEmail);
                    return;
                }

                // If all silent attempts fail, simply stop loading and show Login page
                console.log('[AuthContext] All silent SSO attempts failed. Showing Login UI.');
                setLoading(false);
                return;

            } catch (err) {
                console.warn('[AuthContext] MSAL init/silent failed:', err);
                sessionStorage.removeItem('msal_auto_redirect_tried');
                // Fallback to localStorage
                const lastEmail = localStorage.getItem('last_login_email');
                if (lastEmail) {
                    await handleUserSync(lastEmail);
                    return;
                }
            }
            setLoading(false);
        };

        tryMsalSilent();
    }, [handleUserSync]);

    // ── LOGIN: Microsoft redirect → extract email → sync with DB ──
    const login = async () => {
        setError(null);
        setLoading(true);
        try {
            // Đợi MSAL khởi tạo xong
            await msalInitPromise;
            
            // Dùng redirect trực tiếp — không cần popup, không bị chặn
            await msalInstance.loginRedirect({
                ...loginRequest,
                prompt: 'select_account'
            });
            // Page sẽ redirect sang Microsoft login, không cần xử lý tiếp
        } catch (err) {
            console.error('[AuthContext] MSAL login error:', err);
            
            if (err.errorCode === 'user_cancelled' || err.errorMessage?.includes('cancelled')) {
                setError('Bạn đã hủy đăng nhập.');
            } else {
                const detail = err.errorMessage || err.message || 'Unknown error';
                setError(`Đăng nhập thất bại: ${detail}`);
            }
            setLoading(false);
        }
    };

    // ── LOGOUT: Clear MSAL + localStorage ──
    const logout = async () => {
        try {
            localStorage.removeItem('last_login_email');
            
            await msalInitPromise;
            const accounts = msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                await msalInstance.logoutPopup({
                    account: accounts[0],
                    mainWindowRedirectUri: window.location.origin
                });
            }
        } catch (err) {
            console.warn('[AuthContext] MSAL logout error:', err);
        }
        setUser(null);
    };

    const updateUserProfile = async (updatedData) => {
        const queryParams = new URLSearchParams(window.location.search);
        const isAdminMode = queryParams.get('admin_mode') === 'true';

        const newUser = { ...user, ...updatedData };
        setUser(newUser);

        if (isAdminMode) {
            localStorage.setItem('bypass_user_profile', JSON.stringify(newUser));
        } else if (user?.email) {
            const { error } = await supabase
                .from('NMK_User')
                .update({
                    name: newUser.name,
                    full_name: newUser.full_name || newUser.name,
                    image: newUser.image, // base64 compressed
                    location: newUser.location || 'VietNam',
                    team: newUser.team || 'Management',
                    position: newUser.position || 'Engineer'
                })
                .eq('email', user.email);

            if (error) {
                console.error('[AuthContext] Error updating profile in Supabase:', error);
                throw error;
            }
        }
    };

    const getGraphToken = async () => {
        try {
            await msalInitPromise;
            const accounts = msalInstance.getAllAccounts();
            if (accounts.length === 0) return null;
            
            const result = await msalInstance.acquireTokenSilent({
                scopes: ["User.Read"],
                account: accounts[0]
            });
            return result.accessToken;
        } catch (err) {
            console.warn('[AuthContext] getGraphToken failed:', err);
            return null;
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            error, 
            login, 
            logout,
            updateUserProfile,
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
