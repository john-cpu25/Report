import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Mail, ArrowRight, Lock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


/* ─── Spinner SVG ─── */
const Spinner = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
);

const Login = () => {
    const { login, loading: authLoading, error } = useAuth();
    const [isSimulatingLogin, setIsSimulatingLogin] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passFocused, setPassFocused] = useState(false);
    const loading = authLoading || isSimulatingLogin;

    const handleLocalAdmin = (e) => {
        e.stopPropagation();
        setIsSimulatingLogin(true);
        setTimeout(() => {
            window.location.href = '?admin_mode=true';
        }, 2000);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) return;
        setIsSimulatingLogin(true);
        await login(email, password);
        setIsSimulatingLogin(false);
    };

    /* ─── Encode circuit pattern as data URI for CSS background ─── */
    const circuitSvgStr = `<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="20" x2="80" y2="20" stroke="%2300c8ff" stroke-width="0.8"/>
        <line x1="0" y1="60" x2="80" y2="60" stroke="%231a6fff" stroke-width="0.8"/>
        <line x1="20" y1="0" x2="20" y2="80" stroke="%231a6fff" stroke-width="0.8"/>
        <line x1="60" y1="0" x2="60" y2="80" stroke="%2300c8ff" stroke-width="0.8"/>
        <line x1="20" y1="20" x2="35" y2="40" stroke="%231a6fff" stroke-width="0.8"/>
        <line x1="60" y1="60" x2="45" y2="40" stroke="%2300c8ff" stroke-width="0.8"/>
        <circle cx="20" cy="20" r="2.5" fill="%2300c8ff"/>
        <circle cx="60" cy="20" r="2.5" fill="%231a6fff"/>
        <circle cx="20" cy="60" r="2.5" fill="%231a6fff"/>
        <circle cx="60" cy="60" r="2.5" fill="%2300c8ff"/>
        <circle cx="40" cy="40" r="3" fill="none" stroke="%2300c8ff" stroke-width="0.8"/>
        <circle cx="40" cy="10" r="1.5" fill="none" stroke="%231a6fff" stroke-width="0.8"/>
        <circle cx="40" cy="70" r="1.5" fill="none" stroke="%2300c8ff" stroke-width="0.8"/>
        <rect x="28" y="18" width="8" height="4" rx="1.5" fill="none" stroke="%231a6fff" stroke-width="0.8"/>
        <rect x="48" y="58" width="8" height="4" rx="1.5" fill="none" stroke="%2300c8ff" stroke-width="0.8"/>
        <rect x="16" y="38" width="8" height="4" rx="1.5" fill="none" stroke="%2300c8ff" stroke-width="0.8"/>
        <rect x="58" y="38" width="8" height="4" rx="1.5" fill="none" stroke="%231a6fff" stroke-width="0.8"/>
        <line x1="36" y1="20" x2="48" y2="20" stroke="%2300c8ff" stroke-width="0.5" stroke-dasharray="2 3"/>
        <line x1="20" y1="28" x2="20" y2="52" stroke="%2300c8ff" stroke-width="0.5" stroke-dasharray="2 3"/>
    </svg>`;
    const circuitBg = `url("data:image/svg+xml,${circuitSvgStr.replace(/\n\s*/g, '')}")`;

    return (
        <div
            className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
            style={{
                background: `
                    radial-gradient(ellipse 80% 60% at 50% 40%, rgba(10,40,110,0.55), transparent),
                    #04091a
                `,
                fontFamily: "'Inter', sans-serif",
            }}
        >
            {/* ═══ LAYER 1: Pulse Circles ═══ */}
            <div
                className="absolute animate-pulse"
                style={{
                    top: '-10%',
                    left: '-10%',
                    width: '520px',
                    height: '520px',
                    background: 'radial-gradient(circle, #1a6fff 0%, transparent 70%)',
                    opacity: 0.2,
                    borderRadius: '50%',
                }}
            />
            <div
                className="absolute animate-pulse"
                style={{
                    bottom: '-15%',
                    right: '-10%',
                    width: '600px',
                    height: '600px',
                    background: 'radial-gradient(circle, #00c8ff 0%, transparent 70%)',
                    opacity: 0.15,
                    borderRadius: '50%',
                    animationDelay: '1.5s',
                }}
            />

            {/* ═══ LAYER 2: Circuit Board Pattern ═══ */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: circuitBg,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '80px 80px',
                    opacity: 0.07,
                }}
            />

            {/* ═══ LAYER 3: Scanline Overlay ═══ */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
                    opacity: 0.03,
                }}
            />

            {/* ═══ ERROR TOAST ═══ */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-8 z-50 w-full max-w-sm mx-4 px-4 py-3 rounded-xl border border-red-500/40 bg-red-500/15 backdrop-blur-xl text-red-200 text-xs font-medium tracking-wide text-center"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ LOGIN CARD ═══ */}
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-[400px] mx-4"
            >
                <div
                    className="relative"
                    style={{
                        padding: '20px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(24px)',
                        border: '1px solid rgba(0,0,0,0.08)',
                        boxShadow: `
                            0 24px 64px rgba(0,0,0,0.15),
                            0 8px 24px rgba(0,0,0,0.08)
                        `,
                    }}
                >
                    {/* ── Bottom Glow Bar ── */}
                    <div
                        className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full"
                        style={{
                            background: 'linear-gradient(90deg, #1a6fff, #00c8ff)',
                            filter: 'blur(24px)',
                            opacity: 0.3,
                        }}
                    />

                    {/* ══════ LOGO SECTION ══════ */}
                    <div className="flex flex-col items-center mb-6">
                        <img
                            src={`${import.meta.env.BASE_URL}apex-logo.png`}
                            alt="APEX Southern Cross Engineering"
                            className="w-auto object-contain"
                            style={{ height: '80px' }}
                        />
                    </div>

                    {/* ══════ DIVIDER ══════ */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #e2e8f0)' }} />
                        <div className="w-1 h-1 rounded-full" style={{ background: '#1a6fff', opacity: 0.5 }} />
                        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #e2e8f0)' }} />
                    </div>

                    {/* ══════ HEADINGS ══════ */}
                    <div className="text-center mb-6">
                        <h1
                            className="text-gray-900 uppercase font-bold mb-1"
                            style={{
                                fontFamily: "'Rajdhani', sans-serif",
                                fontSize: '24px',
                                letterSpacing: '0.12em',
                            }}
                        >
                            APEX SOUTHERN CROSS
                        </h1>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: '#64748b' }}>
                            Đăng nhập bằng Email & Mật khẩu
                        </p>
                        <p
                            className="mt-1"
                            style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: '11px',
                                fontStyle: 'italic',
                                color: '#94a3b8',
                            }}
                        >
                            (Nếu là lần đầu đăng nhập, mật khẩu bạn nhập sẽ trở thành mật khẩu chính thức)
                        </p>
                    </div>

                    {/* ══════ FORM ══════ */}
                    <form onSubmit={handleLogin} className="flex flex-col gap-3">
                        {/* Email field */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none" style={{ paddingLeft: '10px' }}>
                                <Mail
                                    size={18}
                                    style={{
                                        color: emailFocused ? '#1a6fff' : '#94a3b8',
                                        transition: 'color 0.25s',
                                    }}
                                />
                            </div>
                            <input
                                type="email"
                                autoComplete="email"
                                placeholder="Email..."
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setEmailFocused(true)}
                                onBlur={() => setEmailFocused(false)}
                                required
                                className="w-full pr-4 text-gray-900 placeholder-[#94a3b8] outline-none"
                                style={{
                                    height: '48px',
                                    borderRadius: '5px',
                                    paddingLeft: '38px',
                                    background: '#f8fafc',
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '14px',
                                    border: emailFocused
                                        ? '1.5px solid #1a6fff'
                                        : '1.5px solid #e2e8f0',
                                    boxShadow: emailFocused
                                        ? '0 0 0 3px rgba(26,111,255,0.12)'
                                        : 'none',
                                    transition: 'border 0.25s, box-shadow 0.25s',
                                }}
                            />
                        </div>

                        {/* Password field */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none" style={{ paddingLeft: '10px' }}>
                                <Lock
                                    size={18}
                                    style={{
                                        color: passFocused ? '#1a6fff' : '#94a3b8',
                                        transition: 'color 0.25s',
                                    }}
                                />
                            </div>
                            <input
                                type={showPass ? 'text' : 'password'}
                                autoComplete="current-password"
                                placeholder="Mật khẩu..."
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setPassFocused(true)}
                                onBlur={() => setPassFocused(false)}
                                required
                                className="w-full pr-12 text-gray-900 placeholder-[#94a3b8] outline-none"
                                style={{
                                    height: '48px',
                                    borderRadius: '5px',
                                    paddingLeft: '38px',
                                    background: '#f8fafc',
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '14px',
                                    border: passFocused
                                        ? '1.5px solid #1a6fff'
                                        : '1.5px solid #e2e8f0',
                                    boxShadow: passFocused
                                        ? '0 0 0 3px rgba(26,111,255,0.12)'
                                        : 'none',
                                    transition: 'border 0.25s, box-shadow 0.25s',
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center group"
                            >
                                {showPass ? (
                                    <EyeOff size={18} className="text-[#94a3b8] group-hover:text-[#1a6fff] transition-colors" />
                                ) : (
                                    <Eye size={18} className="text-[#94a3b8] group-hover:text-[#1a6fff] transition-colors" />
                                )}
                            </button>
                        </div>

                        {/* Forgot password */}
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => alert("Vui lòng liên hệ Admin của hệ thống để được cấp lại mật khẩu.")}
                                className="hover:text-[#0a4fd6] transition-colors"
                                style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '12px',
                                    color: '#1a6fff',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                Quên mật khẩu?
                            </button>
                        </div>

                        {/* Login button */}
                        <button
                            type="submit"
                            disabled={loading || !email.trim() || !password.trim()}
                            className="w-full flex items-center justify-center gap-2 text-white uppercase font-semibold disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
                            style={{
                                height: '44px',
                                borderRadius: '12px',
                                fontFamily: "'Rajdhani', sans-serif",
                                fontSize: '13px',
                                letterSpacing: '0.18em',
                                border: 'none',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                ...(loading
                                    ? {
                                          background: 'rgba(26,111,255,0.5)',
                                          opacity: 0.7,
                                      }
                                    : {
                                          background: 'linear-gradient(135deg, #1a6fff 0%, #0ea5ff 100%)',
                                          boxShadow: '0 4px 20px rgba(26,111,255,0.4), inset 0 1px 0 rgba(255,255,255,0.12)',
                                      }),
                            }}
                        >
                            {loading ? (
                                <Spinner />
                            ) : (
                                <>
                                    <span>ĐĂNG NHẬP</span>
                                    <ArrowRight size={15} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* ══════ BOTTOM DETAIL BAR ══════ */}
                    <div className="flex items-center justify-between mt-6" style={{ opacity: 0.3 }}>
                        {/* Left bracket */}
                        <div className="relative" style={{ width: '12px', height: '12px' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '12px', height: '3px', background: '#1a6fff' }} />
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '12px', background: '#1a6fff' }} />
                        </div>
                        {/* Center text */}
                        <span
                            style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: '9px',
                                letterSpacing: '0.25em',
                                color: '#475569',
                            }}
                        >
                            SECURE ACCESS
                        </span>
                        {/* Right bracket (rotated 180°) */}
                        <div className="relative" style={{ width: '12px', height: '12px', transform: 'rotate(180deg)' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '12px', height: '3px', background: '#1a6fff' }} />
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '12px', background: '#1a6fff' }} />
                        </div>
                    </div>
                </div>

                {/* ═══ DEV-ONLY: Local Admin Bypass ═══ */}
                {import.meta.env.DEV && (
                    <div className="flex flex-col gap-2 items-center mt-8">
                        <button
                            onClick={handleLocalAdmin}
                            disabled={loading}
                            className="group/admin flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-orange-500/40 bg-orange-500/10 text-orange-400 hover:text-white hover:border-orange-500/80 hover:bg-orange-500/30 text-xs font-bold tracking-wider uppercase transition-all duration-300 backdrop-blur-md"
                        >
                            <ShieldAlert size={14} className="group-hover/admin:rotate-12 transition-transform duration-300" />
                            <span>Local Admin Bypass</span>
                        </button>
                        <button
                            onClick={async () => {
                                const { supabase } = await import('../supabaseClient');
                                const { hashPassword } = await import('../context/AuthContext');
                                const { data: users } = await supabase.from('NMK_User').select('*');
                                let output = "";
                                for (let u of users) {
                                    if (!u.password) {
                                        const pwd = Math.random().toString(36).slice(-8);
                                        const h = await hashPassword(pwd);
                                        await supabase.from('NMK_User').update({ password: h }).eq('id', u.id);
                                        output += `${u.email}: ${pwd}\n`;
                                    }
                                }
                                if (output) alert("Passwords generated:\n" + output);
                                else alert("All users already have passwords.");
                            }}
                            className="flex items-center justify-center px-4 py-2 rounded-full border border-blue-500/40 bg-blue-500/10 text-blue-400 hover:text-white hover:bg-blue-500/30 text-xs font-bold tracking-wider uppercase transition-all duration-300 backdrop-blur-md"
                        >
                            Init Passwords (DEV)
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default Login;
