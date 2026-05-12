import React from 'react';
import { useAuth } from '../context/AuthContext';
import CelestialBackground from '../CelestialBackground';
import RincovitchLogo from '../RincovitchLogo';
import { LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
    const { login, loading, error } = useAuth();

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#020617]">
            {/* Background Animation */}
            <div className="absolute inset-0 z-0">
                <CelestialBackground />
            </div>

            {/* Glassmorphism Card */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md p-8 mx-4 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl"
            >
                <div className="flex flex-col items-center text-center">
                    {/* Logo Section */}
                    <div className="mb-8 scale-125">
                        <RincovitchLogo />
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Weekly Report</h1>
                    <p className="text-blue-200/60 mb-8 font-light">Intelligence & Operational Management System</p>

                    {error && (
                        <div className="w-full mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={login}
                        disabled={loading}
                        className="group relative w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                        <LogIn size={20} className="group-hover:rotate-12 transition-transform" />
                        <span>Sign in with Outlook</span>
                    </button>

                    <div className="mt-8 flex items-center gap-2 text-xs text-white/30 uppercase tracking-[0.2em]">
                        <div className="h-px w-8 bg-white/10"></div>
                        Corporate Authentication
                        <div className="h-px w-8 bg-white/10"></div>
                    </div>
                </div>
            </motion.div>

            {/* Footer Attribution */}
            <div className="absolute bottom-8 left-0 right-0 text-center text-white/20 text-xs font-light tracking-widest uppercase">
                © 2026 Rincovitch Operations. All Rights Reserved.
            </div>
        </div>
    );
};

export default Login;
