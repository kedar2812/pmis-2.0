import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Mail, User as UserIcon, Send } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import client from '@/api/client';

/**
 * InviteUserModal - Universal user invitation flow
 * 
 * Sends email invitation to new user with role selection
 */
export const InviteUserModal = ({ isOpen, onClose, onSuccess }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        role: '',
    });
    const [errors, setErrors] = useState({});

    const roles = [
        { value: 'SPV_Official', label: 'SPV Official' },
        { value: 'NICDC_HQ', label: 'NICDC HQ' },
        { value: 'PMNC_Team', label: 'PMNC Team' },
        { value: 'NICDC_Staff', label: 'NICDC Staff' },
        { value: 'GOVT_DEPARTMENT', label: 'Government Department' },
    ];

    const resetForm = () => {
        setFormData({ email: '', firstName: '', lastName: '', role: '' });
        setErrors({});
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.role) newErrors.role = 'Role is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            await client.post('/users/invite/', {
                email: formData.email,
                first_name: formData.firstName,
                last_name: formData.lastName,
                role: formData.role,
            });

            toast.success(`Invitation sent to ${formData.email}`);
            resetForm();
            onClose();
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Invitation failed:', error);
            toast.error(error.response?.data?.message || 'Failed to send invitation');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-neutral-700 flex justify-between items-center bg-gradient-to-r from-primary-50 to-white dark:from-neutral-900 dark:to-neutral-900">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Invite User</h2>
                            <p className="text-sm text-slate-500 dark:text-neutral-400">Send invitation email</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                            <X size={24} className="text-slate-500 dark:text-neutral-400" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
                                Email Address <span className="text-red-500 dark:text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className={`w-full p-2 pl-10 border rounded-lg bg-white dark:bg-neutral-900 dark:text-white ${errors.email ? 'border-red-500' : 'border-slate-200 dark:border-neutral-700'}`}
                                    placeholder="user@example.com"
                                />
                                <Mail className="absolute left-3 top-2.5 text-slate-400 dark:text-neutral-500" size={18} />
                            </div>
                            {errors.email && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.email}</p>}
                        </div>

                        {/* First Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
                                First Name <span className="text-red-500 dark:text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className={`w-full p-2 pl-10 border rounded-lg bg-white dark:bg-neutral-900 dark:text-white ${errors.firstName ? 'border-red-500' : 'border-slate-200 dark:border-neutral-700'}`}
                                    placeholder="John"
                                />
                                <UserIcon className="absolute left-3 top-2.5 text-slate-400 dark:text-neutral-500" size={18} />
                            </div>
                            {errors.firstName && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.firstName}</p>}
                        </div>

                        {/* Last Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
                                Last Name <span className="text-red-500 dark:text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className={`w-full p-2 border rounded-lg bg-white dark:bg-neutral-900 dark:text-white ${errors.lastName ? 'border-red-500' : 'border-slate-200 dark:border-neutral-700'}`}
                                placeholder="Doe"
                            />
                            {errors.lastName && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.lastName}</p>}
                        </div>

                        {/* Role */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
                                Role <span className="text-red-500 dark:text-red-400">*</span>
                            </label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className={`w-full p-2 border rounded-lg bg-white dark:bg-neutral-900 dark:text-white ${errors.role ? 'border-red-500' : 'border-slate-200 dark:border-neutral-700'}`}
                            >
                                <option value="">-- Select Role --</option>
                                {roles.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                            {errors.role && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.role}</p>}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                variant="secondary"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2" size={18} />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2" size={18} />
                                        Send Invitation
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

export default InviteUserModal;
