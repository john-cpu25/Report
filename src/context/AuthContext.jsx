import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../services/authConfig';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const { instance, accounts } = useMsal();
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
                // If user not found in NMK_User, they are not authorized for this app
                return null;
            }

            return data;
        } catch (err) {
            console.error('Unexpected error during Supabase sync:', err);
            return null;
        }
    };

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

        const silentLogin = async () => {
            try {
                // Xử lý các kết quả trả về từ quá trình Redirect
                await instance.handleRedirectPromise();

                // 1. Kiểm tra xem đã có account nào trong cache chưa
                if (accounts.length > 0) {
                    const account = accounts[0];
                    await handleUserSync(account);
                } else {
                    // 2. Nếu chưa có, thử ssoSilent để lấy account từ Windows/Session
                    const lastEmail = localStorage.getItem('last_login_email');
                    const silentRequest = {
                        ...loginRequest,
                        prompt: "none",
                        ...(lastEmail ? { loginHint: lastEmail } : {}) // Dùng email cũ để "nhắc" Microsoft
                    };
                    const response = await instance.ssoSilent(silentRequest);
                    if (response.account) {
                        await handleUserSync(response.account);
                    }
                }
            } catch (err) {
                console.log("Silent login failed, waiting for user interaction:", err.name);
                // Nếu ssoSilent lỗi (do chưa đăng nhập Windows), vẫn để loading = false để hiện nút Login
            } finally {
                setLoading(false);
            }
        };

        silentLogin();
    }, [accounts, instance]);

    const handleUserSync = async (account) => {
        const email = (account.username || account.idTokenClaims?.email || '').toLowerCase();
        if (email) {
            let dbUser = await syncUserWithSupabase(email);

            if (dbUser) {
                localStorage.setItem('last_login_email', email);
                
                const roleField = dbUser.role || dbUser.Role || dbUser.access_level || dbUser.permission || '';
                const roleValue = roleField.toString().trim().toLowerCase();
                
                const finalIsAdmin = roleValue.includes('admin');
                const finalIsLeader = roleValue.includes('leader');
                
                console.log('[AuthContext] User:', dbUser.name, '| Email:', email, '| Admin:', finalIsAdmin);
                
                setUser({
                    ...account,
                    ...dbUser,
                    isAdmin: finalIsAdmin,
                    isLeader: finalIsLeader
                });
                setError(null);
            } else {
                setError(`Email ${email} không có quyền truy cập hệ thống.`);
            }
        }
    };

    const login = async () => {
        try {
            await instance.loginRedirect(loginRequest);
        } catch (e) {
            console.error(e);
            setError('Login failed. Please try again.');
        }
    };

    const logout = () => {
        instance.logoutPopup();
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
            const activeAccount = instance.getActiveAccount() || accounts[0];
            if (!activeAccount) {
                await instance.loginPopup(loginRequest);
                const updatedAccounts = instance.getAllAccounts();
                if (updatedAccounts.length === 0) throw new Error("No active MSAL account found.");
                instance.setActiveAccount(updatedAccounts[0]);
            }
            
            const tokenRequest = {
                scopes: ["User.Read", "Files.Read", "Files.ReadWrite"],
                account: instance.getActiveAccount() || accounts[0]
            };
            const response = await instance.acquireTokenSilent(tokenRequest);
            return response.accessToken;
        } catch (error) {
            console.warn("Silent token acquisition failed, acquiring token via popup...", error);
            try {
                const response = await instance.acquireTokenPopup({
                    scopes: ["User.Read", "Files.Read", "Files.ReadWrite"],
                    account: instance.getActiveAccount() || accounts[0]
                });
                return response.accessToken;
            } catch (popupErr) {
                console.error("Popup token acquisition failed:", popupErr);
                throw popupErr;
            }
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
