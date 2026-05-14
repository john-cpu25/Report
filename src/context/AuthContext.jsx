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

    // Fallback admin/leader detection when 'role' column doesn't exist in NMK_User
    const ADMIN_EMAILS = [
        'nhan.nguyen@rincovitch.com.au',
    ];
    const LEADER_EMAILS = [
        // Add leader emails here
    ];

    const handleUserSync = async (account) => {
        const email = account.username || account.idTokenClaims?.email;
        if (email) {
            const dbUser = await syncUserWithSupabase(email.toLowerCase());
            if (dbUser) {
                localStorage.setItem('last_login_email', email.toLowerCase());
                
                // Strategy: Check 'role' column first, then fallback to email list
                const roleField = dbUser.role || dbUser.Role || dbUser.access_level || dbUser.permission || '';
                const roleValue = roleField.toString().trim().toLowerCase();
                
                const isAdminByRole = roleValue.includes('admin');
                const isLeaderByRole = roleValue.includes('leader');
                const isAdminByEmail = ADMIN_EMAILS.includes(email.toLowerCase());
                const isLeaderByEmail = LEADER_EMAILS.includes(email.toLowerCase());
                
                const finalIsAdmin = isAdminByRole || isAdminByEmail;
                const finalIsLeader = isLeaderByRole || isLeaderByEmail;
                
                console.log('[AuthContext] User:', dbUser.name, '| Email:', email, '| DB role:', roleField || 'N/A', '| Admin:', finalIsAdmin, '| Leader:', finalIsLeader);
                
                setUser({
                    ...account,
                    ...dbUser,
                    isAdmin: finalIsAdmin,
                    isLeader: finalIsLeader
                });
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

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            error, 
            login, 
            logout,
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
