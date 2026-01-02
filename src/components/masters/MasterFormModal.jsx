import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import UserSelectField from '@/components/masters/UserSelectField';

/**
 * Reusable modal for creating/editing master data records
 * @param {boolean} isOpen - Whether modal is open
 * @param {function} onClose - Close handler
 * @param {function} onSubmit - Submit handler (receives form data)
 * @param {string} title - Modal title
 * @param {array} fields - Field configuration array
 * @param {object} initialData - Initial form data for editing
 * @param {boolean} loading - Whether submission is in progress
 */
const MasterFormModal = ({
    isOpen,
    onClose,
    onSubmit,
    title,
    fields,
    initialData = null,
    loading = false
}) => {
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});

    // Initialize form data when modal opens or initialData changes
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData(initialData);
            } else {
                // Set default values from field config
                const defaults = {};
                fields.forEach(field => {
                    defaults[field.name] = field.defaultValue ?? '';
                });
                setFormData(defaults);
            }
            setErrors({});
        }
    }, [isOpen, initialData, fields]);

    // ESC key handler
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen && !loading) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose, loading]);

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};
        fields.forEach(field => {
            if (field.required && !formData[field.name]) {
                newErrors[field.name] = `${field.label} is required`;
            }
            if (field.pattern && formData[field.name]) {
                if (!field.pattern.test(formData[field.name])) {
                    newErrors[field.name] = field.patternMessage || 'Invalid format';
                }
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSubmit(formData);
        }
    };

    const renderField = (field) => {
        const commonClasses = `w-full px-4 py-2.5 rounded-lg border ${errors[field.name]
            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
            : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100'
            } focus:ring-2 outline-none transition-all text-sm`;

        switch (field.type) {
            case 'select':
                return (
                    <select
                        value={formData[field.name] || ''}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        className={commonClasses}
                        disabled={loading}
                    >
                        <option value="">Select {field.label}</option>
                        {field.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                );

            case 'textarea':
                return (
                    <textarea
                        value={formData[field.name] || ''}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className={commonClasses}
                        disabled={loading}
                    />
                );

            case 'number':
                return (
                    <input
                        type="number"
                        value={formData[field.name] || ''}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        step={field.step || 1}
                        min={field.min}
                        max={field.max}
                        className={commonClasses}
                        disabled={loading}
                    />
                );

            case 'date':
                return (
                    <input
                        type="date"
                        value={formData[field.name] || ''}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        className={commonClasses}
                        disabled={loading}
                    />
                );

            case 'checkbox':
                return (
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData[field.name] || false}
                            onChange={(e) => handleChange(field.name, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            disabled={loading}
                        />
                        <span className="text-sm text-slate-600">{field.checkboxLabel || field.label}</span>
                    </label>
                );

            case 'user-select':
                return (
                    <UserSelectField
                        value={formData[field.name] || null}
                        onChange={(userId) => handleChange(field.name, userId)}
                        onUserSelect={(user) => {
                            // Auto-fill related fields if specified
                            if (user && field.autoFillFields) {
                                if (field.autoFillFields.includes('contact_email') && user.email) {
                                    handleChange('contact_email', user.email);
                                }
                                if (field.autoFillFields.includes('contact_phone') && user.phone_number) {
                                    handleChange('contact_phone', user.phone_number);
                                }
                                // Also fill legacy text field with user's full name
                                const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                                if (field.name === 'hod_user') {
                                    handleChange('hod', fullName);
                                } else if (field.name === 'reporting_officer_user') {
                                    handleChange('reporting_officer', fullName);
                                }
                            }
                        }}
                        label=""
                        placeholder={field.placeholder}
                        disabled={loading}
                        error={errors[field.name]}
                    />
                );

            case 'hidden':
                return null;

            default: // text, email, etc.
                return (
                    <input
                        type={field.type || 'text'}
                        value={formData[field.name] || ''}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className={commonClasses}
                        disabled={loading}
                    />
                );
        }
    };

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                    disabled={loading}
                                >
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                                <div className="space-y-4">
                                    {fields.map(field => (
                                        <div key={field.name}>
                                            {field.type !== 'checkbox' && (
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                    {field.label}
                                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                                </label>
                                            )}
                                            {renderField(field)}
                                            {errors[field.name] && (
                                                <p className="mt-1 text-xs text-red-500">{errors[field.name]}</p>
                                            )}
                                            {field.helpText && (
                                                <p className="mt-1 text-xs text-slate-400">{field.helpText}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onClose}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={loading}>
                                        {loading ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin mr-2" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={16} className="mr-2" />
                                                {initialData ? 'Update' : 'Create'}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};

export default MasterFormModal;

