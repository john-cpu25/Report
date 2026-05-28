import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import loginVideo from '../assets/Video_login_.mp4';
import { ShieldAlert, Loader2, Mail, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
    const { login, loading, error } = useAuth();
    const [isSimulatingLogin, setIsSimulatingLogin] = useState(false);
    const [email, setEmail] = useState('');

    const handleLocalAdmin = (e) => {
        e.stopPropagation();
        setIsSimulatingLogin(true);
        setTimeout(() => {
            window.location.href = '?admin_mode=true';
        }, 2000); 
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        
        setIsSimulatingLogin(true);
        await login(email);
        setIsSimulatingLogin(false);
    };

    const isLoading = loading || isSimulatingLogin;

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-black px-4 font-sans">
            {/* Background Video */}
            <div className="absolute inset-0 z-0">
                <video 
                    src={loginVideo} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
            </div>

            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        key="loading-overlay"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.5 }}
                        className="relative z-10 flex flex-col items-center"
                    >
                        <div className="relative flex items-center justify-center mb-8 w-[240px] h-[240px]">
                            <Loader2 size={64} className="text-white animate-spin drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="login-form"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="relative z-10 flex flex-col items-center justify-center w-full max-w-md"
                    >
                        {error && (
                            <div className="absolute -top-24 w-full p-3 rounded-lg border border-red-500/50 bg-red-500/20 text-red-100 text-xs font-semibold tracking-wide text-center z-20 backdrop-blur-md">
                                {error}
                            </div>
                        )}

                        <div className="flex flex-col items-center z-10 w-full bg-black/40 p-8 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl">
                            <h2 className="text-2xl font-bold text-white mb-2 tracking-wider">WELCOME</h2>
                            <p className="text-slate-300 text-sm mb-8 text-center">
                                Enter your Rincovitch email to view the dashboard
                            </p>

                            <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
                                <div className="relative w-full">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail size={18} className="text-slate-400" />
                                    </div>
                                    <input
                                        type="email"
                                        autoComplete="email"
                                        placeholder="Enter your email..."
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-white/5 border border-white/20 rounded-full py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || !email.trim()}
                                    className="w-full mt-2 flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-wider uppercase disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <span>Access Dashboard</span>
                                    <ArrowRight size={18} />
                                </button>
                            </form>
                        </div>

                        {/* Local Admin Bypass Button */}
                        {import.meta.env.DEV && (
                            <button
                                onClick={handleLocalAdmin}
                                disabled={isLoading}
                                className="absolute -bottom-24 group/admin flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-orange-500/40 bg-orange-500/10 text-orange-400 hover:text-white hover:border-orange-500/80 hover:bg-orange-500/30 text-xs font-bold tracking-wider uppercase transition-all duration-300 z-20 backdrop-blur-md"
                            >
                                <ShieldAlert size={14} className="group-hover/admin:rotate-12 transition-transform duration-300" />
                                <span>Local Admin Bypass</span>
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Login;
