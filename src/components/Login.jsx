import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import loginVideo from '../assets/Video_login_.mp4';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TechRing = () => (
    <svg className="w-full h-full drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-transform duration-500 group-hover/btn:scale-110" viewBox="0 0 200 200">
        <defs>
            <filter id="ring-glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        
        {/* Outer intricate dashed ring */}
        <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="animate-[spin_12s_linear_infinite]" style={{ transformOrigin: 'center' }}/>
        <circle cx="100" cy="100" r="85" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="20 10 5 10" className="animate-[spin_10s_linear_infinite_reverse]" style={{ transformOrigin: 'center' }}/>

        {/* Thick segmented outer ring */}
        <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="12" strokeDasharray="180 40 60 40" strokeLinecap="square" className="animate-[spin_8s_linear_infinite]" style={{ transformOrigin: 'center' }} />
        
        {/* Inner thin dashed ring */}
        <circle cx="100" cy="100" r="55" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="10 6" className="animate-[spin_6s_linear_infinite_reverse]" style={{ transformOrigin: 'center' }} />

        {/* Central Gear shape */}
        <g className="animate-[spin_4s_linear_infinite]" style={{ transformOrigin: 'center' }}>
            {/* Gear teeth */}
            <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" strokeWidth="6" strokeDasharray="8 6" />
            {/* Gear body */}
            <circle cx="100" cy="100" r="34" fill="none" stroke="currentColor" strokeWidth="4" />
            {/* 3 spokes */}
            <path d="M 100 100 L 100 66 M 100 100 L 70 117 M 100 100 L 130 117" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            <circle cx="100" cy="100" r="10" fill="currentColor" />
            <circle cx="100" cy="100" r="4" fill="#020617" />
        </g>
    </svg>
);

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
        if (e) e.preventDefault();
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
                {/* Lớp phủ mờ rất nhẹ để chữ/icon dễ nhìn hơn */}
                <div className="absolute inset-0 bg-black/10"></div>
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
                        className="relative z-10 flex flex-col items-center justify-center"
                    >
                        {error && (
                            <div className="absolute -top-24 w-[300px] p-3 rounded-lg border border-red-500/50 bg-red-500/20 text-red-100 text-xs font-semibold tracking-wide text-center z-20 backdrop-blur-md">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="flex flex-col items-center z-10 -translate-y-4 md:-translate-y-6">
                            <input
                                type="email"
                                placeholder="Nhập email của bạn..."
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mb-6 px-6 py-3 w-72 rounded-full bg-black/40 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-[#4facfe] focus:ring-1 focus:ring-[#4facfe] backdrop-blur-sm transition-all duration-300 text-center text-sm tracking-wider"
                                required
                            />
                            
                            <button
                                type="submit"
                                disabled={isLoading || !email}
                                className="relative w-[12.5vw] h-[12.5vw] min-w-[100px] min-h-[100px] max-w-[150px] max-h-[150px] flex items-center justify-center cursor-pointer group/btn focus:outline-none rounded-full transition-all duration-300 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="w-[80%] h-[80%] text-white group-hover/btn:text-[#4facfe] transition-colors duration-300">
                                    <TechRing />
                                </div>
                            </button>
                        </form>

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
