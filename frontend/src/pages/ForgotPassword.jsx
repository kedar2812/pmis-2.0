import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2, KeyRound
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/api/client';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            setError('Email is required');
            return;
        }

        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await api.post('/users/password-reset/', { email });
            setIsSuccess(true);
            toast.success('Password reset email sent!');
        } catch (err) {
            console.error('Password reset request failed:', err);
            // Still show success to prevent email enumeration
            setIsSuccess(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
                >
                    <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Mail className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Check Your Email</h1>
                    <p className="text-slate-600 dark:text-neutral-400 mb-6">
                        If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
                    </p>
                    <p className="text-sm text-slate-500 dark:text-neutral-500 mb-6">
                        The link will expire in 1 hour. Check your spam folder if you don't see the email.
                    </p>
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
                    <h1 className="text-xl font-bold text-white">Forgot Password?</h1>
                    <p className="text-white text-sm mt-2 opacity-90">PMIS - Zaheerabad Industrial Area</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <p className="text-slate-600 dark:text-neutral-400 text-sm">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1.5">
                            Email Address <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (error) setError('');
                                }}
                                placeholder="Enter your registered email"
                                className={`w-full px-4 py-2.5 pl-10 rounded-xl border transition-all outline-none focus:ring-2 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white ${error
                                    ? 'border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-red-100'
                                    : 'border-slate-200 dark:border-neutral-700 focus:border-amber-500 focus:ring-amber-100 dark:focus:ring-amber-900/30'
                                    }`}
                            />
                        </div>
                        {error && (
                            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle size={14} /> {error}
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
                                <Loader2 size={18} className="animate-spin" /> Sending...
                            </>
                        ) : (
                            <>
                                <Mail size={18} /> Send Reset Link
                            </>
                        )}
                    </button>

                    <div className="text-center">
                        <Link
                            to="/login"
                            className="text-sm text-slate-600 hover:text-primary-600 inline-flex items-center gap-1"
                        >
                            <ArrowLeft size={14} /> Back to Login
                        </Link>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default ForgotPassword;
