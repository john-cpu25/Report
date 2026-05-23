import React from 'react';
import { useAuth } from '../context/AuthContext';
import loginBg from '../assets/login_bg_sign.png';
import { LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
    const { login, loading, error } = useAuth();

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#020617] px-4">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img 
                    src={loginBg} 
                    alt="Background" 
                    className="w-full h-full object-cover opacity-90 scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/40 via-[#020617]/20 to-[#020617]/80"></div>
            </div>

            {/* Circular Glassmorphism Card */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-[240px] h-[240px] rounded-full border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center text-center overflow-hidden hover:bg-white/20 transition-colors duration-500"
            >
                {error && (
                    <div className="absolute top-4 w-[80%] p-2 rounded-xl bg-red-500/20 text-red-400 text-[10px] font-bold text-center">
                        {error}
                    </div>
                )}

                <button
                    onClick={login}
                    disabled={loading}
                    className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:shadow-[0_0_50px_rgba(59,130,246,0.8)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                    <span>Sign In</span>
                </button>
            </motion.div>
        </div>
    );
};

export default Login;
