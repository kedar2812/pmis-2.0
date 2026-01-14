import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Check, FolderOpen, Calendar, DollarSign, User } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import { SmartInput } from '@/components/ui/SmartInput';

export const CreatePackageModal = ({ isOpen, onClose, projects, onSave, preSelectedProjectId }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        projectId: '',
        name: '',
        description: '', // Optional now?
        contractor: '',
        responsibleStaff: '',
        agreementNo: '',
        agreementDate: '',
        contractValue: '',
        startDate: '', // Keeping as it might be useful, but focus on requested fields
        endDate: '', // Mapped to Due Date of Completion
        status: 'Pending',
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            if (preSelectedProjectId) {
                setFormData(prev => ({ ...prev, projectId: preSelectedProjectId }));
            } else {
                setFormData({
                    projectId: '',
                    name: '',
                    description: '',
                    contractor: '',
                    responsibleStaff: '',
                    agreementNo: '',
                    agreementDate: '',
                    contractValue: '',
                    startDate: '',
                    endDate: '',
                    status: 'Pending',
                });
            }
            setErrors({});
        }
    }, [isOpen, preSelectedProjectId]);

    // Handle Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }

        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const validate = () => {
        const newErrors = {};
        if (!formData.projectId) newErrors.projectId = 'Please select a project';
        if (!formData.name.trim()) newErrors.name = 'Package Name is required';
        if (!formData.contractor.trim()) newErrors.contractor = 'Contractor Name/ID is required';
        if (!formData.responsibleStaff.trim()) newErrors.responsibleStaff = 'Responsible Staff is required';
        if (!formData.agreementNo.trim()) newErrors.agreementNo = 'Agreement No. is required';
        if (!formData.agreementDate) newErrors.agreementDate = 'Agreement Date is required';
        if (!formData.contractValue) newErrors.contractValue = 'Contractor Value is required';
        if (!formData.endDate) newErrors.endDate = 'Due Date of Completion is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            await onSave({
                ...formData,
                budget: formData.contractValue, // Mapping contract value to budget for backward compatibility
                progress: 0,
                spent: 0,
            });
            toast.success('Package created successfully');
            onClose();
        } catch (error) {
            toast.error('Failed to create package');
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
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-neutral-700 flex justify-between items-center bg-white dark:bg-neutral-900 z-10">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create Work Package</h2>
                            <p className="text-sm text-slate-500 dark:text-neutral-400">Enter contract details</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                            <X size={24} className="text-slate-500 dark:text-neutral-400" />
                        </button>
                    </div>

                    {/* Form Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {/* Project Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Select Project *</label>
                            <div className="relative">
                                <select
                                    value={formData.projectId}
                                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                    disabled={!!preSelectedProjectId}
                                    className={`w-full p-2 pl-10 border rounded-lg appearance-none bg-white ${errors.projectId ? 'border-red-500' : 'border-slate-200'
                                        } ${!!preSelectedProjectId ? 'bg-slate-50' : ''}`}
                                >
                                    <option value="">-- Select Project --</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <FolderOpen className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            </div>
                            {errors.projectId && <p className="text-xs text-red-500 mt-1">{errors.projectId}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Package Name *</label>
                                <input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className={`w-full p-2 border rounded-lg ${errors.name ? 'border-red-500' : 'border-slate-200'}`}
                                    placeholder="E.g. Civil Works - Phase 1"
                                />
                                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Contractor (Name/ID) *</label>
                                <div className="relative">
                                    <input
                                        value={formData.contractor}
                                        onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
                                        className={`w-full p-2 pl-10 border rounded-lg ${errors.contractor ? 'border-red-500' : 'border-slate-200'}`}
                                        placeholder="Contractor Name or ID"
                                    />
                                    <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                </div>
                                {errors.contractor && <p className="text-xs text-red-500 mt-1">{errors.contractor}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Staff (Responsible Person) *</label>
                                <div className="relative">
                                    <input
                                        value={formData.responsibleStaff}
                                        onChange={(e) => setFormData({ ...formData, responsibleStaff: e.target.value })}
                                        className={`w-full p-2 pl-10 border rounded-lg ${errors.responsibleStaff ? 'border-red-500' : 'border-slate-200'}`}
                                        placeholder="Responsible Staff Name"
                                    />
                                    <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                </div>
                                {errors.responsibleStaff && <p className="text-xs text-red-500 mt-1">{errors.responsibleStaff}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Agreement No. *</label>
                                <input
                                    value={formData.agreementNo}
                                    onChange={(e) => setFormData({ ...formData, agreementNo: e.target.value })}
                                    className={`w-full p-2 border rounded-lg ${errors.agreementNo ? 'border-red-500' : 'border-slate-200'}`}
                                    placeholder="Agreement Number"
                                />
                                {errors.agreementNo && <p className="text-xs text-red-500 mt-1">{errors.agreementNo}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Agreement Date *</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={formData.agreementDate}
                                        onChange={(e) => setFormData({ ...formData, agreementDate: e.target.value })}
                                        className={`w-full p-2 pl-10 border rounded-lg ${errors.agreementDate ? 'border-red-500' : 'border-slate-200'}`}
                                    />
                                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                </div>
                                {errors.agreementDate && <p className="text-xs text-red-500 mt-1">{errors.agreementDate}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Contractor Value (₹) *</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={formData.contractValue}
                                        onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
                                        className={`w-full p-2 pl-10 border rounded-lg ${errors.contractValue ? 'border-red-500' : 'border-slate-200'}`}
                                        placeholder="0.00"
                                    />
                                    <DollarSign className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                </div>
                                {errors.contractValue && <p className="text-xs text-red-500 mt-1">{errors.contractValue}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date of Completion *</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className={`w-full p-2 pl-10 border rounded-lg ${errors.endDate ? 'border-red-500' : 'border-slate-200'}`}
                                    />
                                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                </div>
                                {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date (Optional)</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className={`w-full p-2 pl-10 border rounded-lg border-slate-200`}
                                    />
                                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <SmartInput
                                    label="Description"
                                    value={formData.description}
                                    onChange={(val) => setFormData({ ...formData, description: val })}
                                    placeholder="Details about the work package..."
                                    rows={3}
                                />
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary-950 text-white hover:bg-primary-900">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Create Package'}
                        </Button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};
