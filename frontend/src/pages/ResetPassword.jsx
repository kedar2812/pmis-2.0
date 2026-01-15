import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
    Lock, Eye, EyeOff, CheckCircle2,
    AlertCircle, Loader2, ArrowLeft, KeyRound
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/api/client';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [tokenInfo, setTokenInfo] = useState(null);
    const [error, setError] = useState(null);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState({});

    useEffect(() => {
        validateToken();
    }, [token]);

    const validateToken = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/users/password-reset/confirm/?token=${token}`);
            setTokenInfo(response.data);
        } catch (err) {
            console.error('Token validation failed:', err);
            setError(err.response?.data?.error || 'Invalid or expired reset link');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = {};
        if (!password) newErrors.password = 'Password is required';
        else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
        if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/users/password-reset/confirm/', {
                token,
                password,
                confirm_password: confirmPassword
            });
            setIsSuccess(true);
            toast.success('Password reset successfully!');
        } catch (err) {
            console.error('Password reset failed:', err);
            if (err.response?.data) {
                const errors = err.response.data;
                setErrors(errors);

                if (errors.password) {
                    toast.error(Array.isArray(errors.password) ? errors.password[0] : errors.password);
                } else if (errors.token) {
                    toast.error(Array.isArray(errors.token) ? errors.token[0] : errors.token);
                } else if (errors.confirm_password) {
                    toast.error(Array.isArray(errors.confirm_password) ? errors.confirm_password[0] : errors.confirm_password);
                } else {
                    toast.error('Failed to reset password. Please try again.');
                }
            } else {
                toast.error('Failed to reset password. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 flex items-center justify-center">
                <div className="text-center text-white">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" />
                    <p>Validating reset link...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
                >
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Invalid Reset Link</h1>
                    <p className="text-slate-600 dark:text-neutral-400 mb-6">{error}</p>
                    <div className="space-y-3">
                        <Link
                            to="/forgot-password"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors"
                        >
                            Request New Link
                        </Link>
                        <br />
                        <Link
                            to="/login"
                            className="text-sm text-slate-600 hover:text-primary-600 inline-flex items-center gap-1"
                        >
                            <ArrowLeft size={14} /> Back to Login
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
                >
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Password Reset!</h1>
                    <p className="text-slate-600 dark:text-neutral-400 mb-6">
                        Your password has been successfully reset. You can now log in with your new password.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
                    >
                        Go to Login
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
                style={{ boxShadow: '0 0 60px rgba(251, 191, 36, 0.15)' }}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <KeyRound className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-white">Reset Your Password</h1>
                    <p className="text-white text-sm mt-2 opacity-90">PMIS - Zaheerabad Industrial Area</p>
                </div>

                {/* User Info */}
                {tokenInfo && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/30 text-center">
                        <p className="text-sm text-slate-600 dark:text-neutral-400">Resetting password for</p>
                        <p className="text-slate-900 dark:text-white font-semibold">{tokenInfo.email}</p>
                    </div>
                )}

                {/* Password Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-slate-600 dark:text-neutral-400 text-sm mb-4">
                        Please enter your new password below.
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1.5">
                            New Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                                }}
                                placeholder="Enter new password (min 8 characters)"
                                className={`w-full px-4 py-2.5 pl-10 pr-10 rounded-xl border transition-all outline-none focus:ring-2 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white ${errors.password
                                    ? 'border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-red-100'
                                    : 'border-slate-200 dark:border-neutral-700 focus:border-amber-500 focus:ring-amber-100 dark:focus:ring-amber-900/30'
                                    }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle size={14} /> {errors.password}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1.5">
                            Confirm Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                                }}
                                placeholder="Confirm new password"
                                className={`w-full px-4 py-2.5 pl-10 pr-10 rounded-xl border transition-all outline-none focus:ring-2 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white ${errors.confirmPassword
                                    ? 'border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-red-100'
                                    : 'border-slate-200 dark:border-neutral-700 focus:border-amber-500 focus:ring-amber-100 dark:focus:ring-amber-900/30'
                                    }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle size={14} /> {errors.confirmPassword}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 hover:shadow-lg active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" /> Resetting...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={18} /> Reset Password
                            </>
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default ResetPassword;
