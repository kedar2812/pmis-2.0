import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, ArrowRight, Loader2, Shield, Building2, Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const OtpLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [buttonHovered, setButtonHovered] = useState(false);
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const result = await login(username, password);

        if (!result.success) {
            setIsLoading(false);
        } else {
            navigate('/dashboard');
        }
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900">
            <div className="min-h-screen flex">
                {/* Left Panel - Branding */}
                <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">

                    {/* Content */}
                    <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            {/* Logo */}
                            <div className="flex items-center gap-4 mb-12">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30">
                                    <Building2 className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">PMIS</h2>
                                    <p className="text-primary-300 text-sm">Zaheerabad Industrial Area</p>
                                </div>
                            </div>

                            {/* Main Title */}
                            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
                                <span className="block">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-blue-400">P</span>
                                    <span className="text-white">rogramme</span>
                                </span>
                                <span className="block">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-blue-400">M</span>
                                    <span className="text-white">anagement</span>
                                </span>
                                <span className="block">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-blue-400">I</span>
                                    <span className="text-white">nformation</span>
                                </span>
                                <span className="block">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-blue-400">S</span>
                                    <span className="text-white">ystem</span>
                                </span>
                            </h1>

                            <p className="text-slate-400 text-lg mb-8 max-w-md pr-4">
                                Streamlining infrastructure development with integrated project tracking,
                                document management, and real-time collaboration.
                            </p>
                        </motion.div>
                    </div>
                </div>

                {/* Right Panel - Login Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="w-full max-w-md"
                    >
                        {/* Mobile Logo */}
                        <div className="lg:hidden text-center mb-8">
                            <div className="inline-flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                                    <Building2 className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-left">
                                    <h2 className="text-xl font-bold text-slate-900">PMIS</h2>
                                    <p className="text-slate-500 text-xs">Zaheerabad Industrial Area</p>
                                </div>
                            </div>
                        </div>

                        {/* Form Card */}
                        <div
                            className="bg-white rounded-3xl p-8 md:p-10 border border-slate-100"
                            style={{ boxShadow: '0 0 60px rgba(255, 255, 255, 0.15)' }}
                        >
                            <div className="text-center mb-8">
                                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                                    Welcome back
                                </h1>
                                <p className="text-slate-500">
                                    Sign in to access your dashboard
                                </p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-5">
                                {/* Username Field */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Username
                                    </label>
                                    <div className="relative">
                                        <motion.div
                                            animate={{
                                                scale: focusedField === 'username' ? 1.02 : 1,
                                            }}
                                            className="relative"
                                        >
                                            <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focusedField === 'username' ? 'text-primary-600' : 'text-slate-400'
                                                }`}>
                                                <User size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                onFocus={() => setFocusedField('username')}
                                                onBlur={() => setFocusedField(null)}
                                                placeholder="Enter your username"
                                                className={`w-full pl-12 pr-4 py-3.5 rounded-xl border-2 transition-all duration-200 font-medium text-slate-800 placeholder:text-slate-400 bg-slate-50 focus:bg-white outline-none ${focusedField === 'username'
                                                    ? 'border-primary-500 ring-4 ring-primary-500/10'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                            />
                                        </motion.div>
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <motion.div
                                            animate={{
                                                scale: focusedField === 'password' ? 1.02 : 1,
                                            }}
                                            className="relative"
                                        >
                                            <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focusedField === 'password' ? 'text-primary-600' : 'text-slate-400'
                                                }`}>
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                onFocus={() => setFocusedField('password')}
                                                onBlur={() => setFocusedField(null)}
                                                placeholder="Enter your password"
                                                className={`w-full pl-12 pr-12 py-3.5 rounded-xl border-2 transition-all duration-200 font-medium text-slate-800 placeholder:text-slate-400 bg-slate-50 focus:bg-white outline-none ${focusedField === 'password'
                                                    ? 'border-primary-500 ring-4 ring-primary-500/10'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </motion.div>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <motion.button
                                    type="submit"
                                    disabled={isLoading}
                                    onHoverStart={() => setButtonHovered(true)}
                                    onHoverEnd={() => setButtonHovered(false)}
                                    whileHover={{ scale: isLoading ? 1 : 1.01 }}
                                    whileTap={{ scale: isLoading ? 1 : 0.97 }}
                                    className={`relative w-full py-4 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 ${isLoading
                                        ? 'bg-slate-400 cursor-not-allowed'
                                        : 'shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40'
                                        }`}
                                >
                                    {/* Liquid background gradient */}
                                    {!isLoading && (
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-primary-600 via-primary-700 to-primary-600"
                                            initial={false}
                                            animate={{
                                                backgroundPosition: buttonHovered ? ['0% 50%', '100% 50%', '0% 50%'] : '0% 50%',
                                            }}
                                            transition={{
                                                duration: 1.5,
                                                repeat: buttonHovered ? Infinity : 0,
                                                ease: 'linear',
                                            }}
                                            style={{
                                                backgroundSize: '200% 100%',
                                            }}
                                        />
                                    )}

                                    {/* Shine effect */}
                                    {!isLoading && (
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                            initial={{ x: '-100%' }}
                                            animate={{ x: buttonHovered ? '100%' : '-100%' }}
                                            transition={{ duration: 0.6, ease: 'easeInOut' }}
                                        />
                                    )}

                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        <AnimatePresence mode="wait">
                                            {isLoading ? (
                                                <motion.div
                                                    key="loading"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    <span>Signing in...</span>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="submit"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="flex items-center gap-2"
                                                >
                                                    <span>Sign In</span>
                                                    <ArrowRight className="w-5 h-5" />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </span>
                                </motion.button>

                                {/* Contractor Registration Link */}
                                <div className="mt-6 text-center">
                                    <p className="text-slate-500 text-sm">
                                        Contractor?{' '}
                                        <Link
                                            to="/register"
                                            className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                                        >
                                            Register here
                                        </Link>
                                    </p>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default OtpLogin;
