import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    Shield, Lock, Eye, EyeOff, CheckCircle2,
    AlertCircle, Loader2, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/api/client';

const AcceptInvite = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [inviteInfo, setInviteInfo] = useState(null);
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
            const response = await api.get(`/users/accept-invite/?token=${token}`);
            setInviteInfo(response.data);
        } catch (err) {
            console.error('Token validation failed:', err);
            setError(err.response?.data?.error || 'Invalid or expired invite link');
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
            await api.post('/users/accept-invite/', {
                token,
                password,
                confirm_password: confirmPassword
            });
            setIsSuccess(true);
            toast.success('Account activated successfully!');
        } catch (err) {
            console.error('Accept invite failed:', err);
            if (err.response?.data) {
                // Show specific validation errors
                const errors = err.response.data;
                setErrors(errors);

                // Show specific error message
                if (errors.password) {
                    toast.error(errors.password[0] || errors.password);
                } else if (errors.token) {
                    toast.error(errors.token[0] || errors.token);
                } else if (errors.confirm_password) {
                    toast.error(errors.confirm_password[0] || errors.confirm_password);
                } else {
                    toast.error('Failed to activate account. Please check your password and try again.');
                }
            } else {
                toast.error('Failed to activate account. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex items-center justify-center">
                <div className="text-center text-white">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" />
                    <p>Validating invite link...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
                >
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-3">Invalid Invite Link</h1>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
                    >
                        <ArrowLeft size={18} /> Back to Login
                    </Link>
                </motion.div>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
                >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-3">Account Activated!</h1>
                    <p className="text-slate-600 mb-6">
                        Your account has been successfully activated. You can now log in with your email and password.
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
                style={{ boxShadow: '0 0 60px rgba(255, 255, 255, 0.15)' }}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-white">Complete Your Registration</h1>
                    <p className="text-white text-sm mt-2 opacity-90">PMIS - Zaheerabad Industrial Area</p>
                </div>

                {/* User Info */}
                <div className="p-6 bg-primary-50 border-b border-primary-100">
                    <div className="text-center">
                        <p className="text-slate-600 text-sm">You've been invited as</p>
                        <p className="text-lg font-semibold text-slate-900 mt-1">
                            {inviteInfo?.first_name} {inviteInfo?.last_name}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">{inviteInfo?.email}</p>
                        <div className="mt-2 text-sm text-slate-600">
                            <span className="font-medium">Username:</span> <span className="text-slate-900 font-semibold">{inviteInfo?.username}</span>
                        </div>
                        <span className="inline-block mt-2 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                            {inviteInfo?.role}
                        </span>
                    </div>
                </div>

                {/* Password Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-slate-600 text-sm mb-4">
                        Please set a password to activate your account.
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Password <span className="text-red-500">*</span>
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
                                placeholder="Enter password (min 8 characters)"
                                className={`w-full px-4 py-2.5 pl-10 pr-10 rounded-xl border transition-all outline-none focus:ring-2 ${errors.password
                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                                    : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100'
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
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
                                placeholder="Confirm password"
                                className={`w-full px-4 py-2.5 pl-10 pr-10 rounded-xl border transition-all outline-none focus:ring-2 ${errors.confirmPassword
                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                                    : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100'
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
                        className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 hover:shadow-lg active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" /> Activating...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={18} /> Activate Account
                            </>
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default AcceptInvite;
