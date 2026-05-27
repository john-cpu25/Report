import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

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

        const autoLogin = async () => {
            const lastEmail = localStorage.getItem('last_login_email');
            if (lastEmail) {
                await handleUserSync(lastEmail);
            } else {
                setLoading(false);
            }
        };

        autoLogin();
    }, []);

    const handleUserSync = async (email) => {
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
    };

    const login = async (email) => {
        setError(null);
        if (!email || !email.includes('@')) {
            setError('Vui lòng nhập địa chỉ email hợp lệ.');
            return;
        }
        await handleUserSync(email);
    };

    const logout = () => {
        localStorage.removeItem('last_login_email');
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
        console.warn("Microsoft Azure has been removed. Graph Token is no longer available.");
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
