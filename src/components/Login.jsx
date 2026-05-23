import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import loginVideo from '../assets/Video_login_.mp4';
import { LogIn, ShieldAlert, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
    const { login, loading, error } = useAuth();
    const [isSimulatingLogin, setIsSimulatingLogin] = useState(false);

    const handleLocalAdmin = () => {
        setIsSimulatingLogin(true);
        setTimeout(() => {
            window.location.href = '?admin_mode=true';
        }, 2000); // Hiển thị hiệu ứng loading 2s rồi mới chuyển
    };

    const handleLogin = () => {
        setIsSimulatingLogin(true);
        setTimeout(() => {
            login();
        }, 1500);
    };

    const isLoading = loading || isSimulatingLogin;

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#020617] px-4">
            {/* Background Video - Luôn hiển thị */}
            <div className="absolute inset-0 z-0">
                <video 
                    src={loginVideo} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/60 via-[#020617]/30 to-[#020617]/90"></div>
            </div>

            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        key="loading-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="relative z-10 flex flex-col items-center"
                    >
                        <Loader2 size={64} className="text-blue-500 animate-spin mb-6 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                        <p className="text-white text-xl font-bold tracking-[0.3em] animate-pulse drop-shadow-lg uppercase">
                            Đang đăng nhập...
                        </p>
                    </motion.div>
                ) : (
                    /* Circular Glassmorphism Card */
                    <motion.div 
                        key="login-form"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="relative z-10 w-[280px] h-[300px] rounded-[40px] border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center text-center overflow-hidden hover:bg-white/20 transition-all duration-500 p-6 gap-6"
                    >
                        {error && (
                            <div className="absolute top-2 w-[90%] p-2 rounded-xl bg-red-500/20 text-red-400 text-[10px] font-bold text-center">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleLogin}
                            disabled={isLoading}
                            className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:shadow-[0_0_50px_rgba(59,130,246,0.8)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden w-full mt-4"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                            <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                            <span>Sign In</span>
                        </button>

                        {/* Local Admin Bypass Button */}
                        {import.meta.env.DEV && (
                            <button
                                onClick={handleLocalAdmin}
                                disabled={isLoading}
                                className="group flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-orange-500/40 text-orange-400 hover:text-white hover:bg-orange-500/30 text-xs font-bold tracking-wider transition-all w-full"
                            >
                                <ShieldAlert size={16} className="group-hover:rotate-12 transition-transform" />
                                <span>Local Admin</span>
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Login;
