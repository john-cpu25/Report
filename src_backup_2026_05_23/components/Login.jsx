import React from 'react';
import { useAuth } from '../context/AuthContext';
import CelestialBackground from '../CelestialBackground';
import RincovitchLogo from '../RincovitchLogo';
import { LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
    const { login, loading, error } = useAuth();

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#020617] px-4">
            {/* Background Animation */}
            <div className="absolute inset-0 z-0">
                <CelestialBackground />
            </div>

            {/* Centered Glassmorphism Card */}
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md p-10 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center"
            >
                {/* Logo Section */}
                <div className="mb-8 scale-[1.3] hover:scale-[1.35] transition-transform duration-300">
                    <RincovitchLogo />
                </div>

                <h1 className="text-3xl font-black text-white mb-2 tracking-tight uppercase bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
                    Weekly Report
                </h1>
                <p className="text-blue-200/60 mb-8 font-light text-xs uppercase tracking-[0.15em]">
                    Intelligence & Operational Management
                </p>

                {error && (
                    <div className="w-full mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold text-left">
                        {error}
                    </div>
                )}

                <button
                    onClick={login}
                    disabled={loading}
                    className="group relative w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs uppercase tracking-[0.15em] shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <LogIn size={16} className="group-hover:translate-x-1 transition-transform" />
                    <span>Sign in with Outlook</span>
                </button>

                <div className="mt-8 flex items-center gap-4 text-[9px] text-white/30 uppercase tracking-[0.25em]">
                    <div className="h-px w-6 bg-white/10"></div>
                    Corporate Authentication
                    <div className="h-px w-6 bg-white/10"></div>
                </div>

                {/* Footer Attribution (Inside login card for cleaner layout) */}
                <div className="text-center text-white/20 text-[9px] font-bold tracking-widest uppercase mt-8 pt-6 border-t border-white/5 w-full">
                    © 2026 Rincovitch Operations.
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
