import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, FolderOpen, Calendar, DollarSign, FileText, Upload, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import UserSelectField from '@/components/masters/UserSelectField';
import ContractorSearchDropdown from '@/components/ui/ContractorSearchDropdown';
import client from '@/api/client';

export const CreatePackageModal = ({ isOpen, onClose, projects, onSave, preSelectedProjectId }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [eligibleStaff, setEligibleStaff] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [agreementFile, setAgreementFile] = useState(null);
    const [fileError, setFileError] = useState('');

    const [formData, setFormData] = useState({
        projectId: '',
        name: '',
        description: '',
        contractor: null, // Now stores contractor object
        responsibleStaff: null, // Now stores user object
        agreementNo: '',
        agreementDate: '',
        contractValue: '',
        startDate: '',
        endDate: '',
        status: 'Pending',
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            if (preSelectedProjectId) {
                setFormData(prev => ({ ...prev, projectId: preSelectedProjectId }));
                const project = projects.find(p => p.id === preSelectedProjectId);
                setSelectedProject(project);
                if (project) {
                    fetchEligibleStaff(project.id);
                }
            } else {
                resetForm();
            }
            setErrors({});
            setFileError('');
            setAgreementFile(null);
        }
    }, [isOpen, preSelectedProjectId]);

    // Fetch eligible staff when project is selected
    useEffect(() => {
        if (formData.projectId) {
            const project = projects.find(p => p.id === formData.projectId);
            setSelectedProject(project);
            if (project) {
                fetchEligibleStaff(project.id);
            }
        }
    }, [formData.projectId, projects]);

    const fetchEligibleStaff = async (projectId) => {
        try {
            const response = await client.get(`/projects/${projectId}/eligible_staff/`);
            setEligibleStaff(response.data.eligible_staff || []);
        } catch (err) {
            console.error('Failed to fetch eligible staff:', err);
            toast.error('Failed to load eligible staff');
        }
    };

    const resetForm = () => {
        setFormData({
            projectId: '',
            name: '',
            description: '',
            contractor: null,
            responsibleStaff: null,
            agreementNo: '',
            agreementDate: '',
            contractValue: '',
            startDate: '',
            endDate: '',
            status: 'Pending',
        });
        setSelectedProject(null);
        setEligibleStaff([]);
        setAgreementFile(null);
        setFileError('');
    };

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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) {
            setAgreementFile(null);
            setFileError('');
            return;
        }

        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            setFileError('Only PDF, DOC, and DOCX files are allowed');
            setAgreementFile(null);
            return;
        }

        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            setFileError('File size cannot exceed 10MB');
            setAgreementFile(null);
            return;
        }

        setAgreementFile(file);
        setFileError('');
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.projectId) newErrors.projectId = 'Please select a project';
        if (!formData.name.trim()) newErrors.name = 'Package Name is required';
        if (!formData.contractor) newErrors.contractor = 'Contractor is required';
        if (!formData.responsibleStaff) newErrors.responsibleStaff = 'Responsible Staff is required';
        if (!formData.agreementNo.trim()) newErrors.agreementNo = 'Agreement No. is required';
        if (!formData.agreementDate) newErrors.agreementDate = 'Agreement Date is required';
        if (!formData.contractValue) newErrors.contractValue = 'Contract Value is required';
        if (!formData.endDate) newErrors.endDate = 'Due Date of Completion is required';
        if (!agreementFile) newErrors.agreementDocument = 'Agreement document is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) {
            toast.error('Please fill all required fields');
            return;
        }

        setIsSubmitting(true);
        try {
            // Create FormData for multipart upload
            const formDataToSend = new FormData();
            formDataToSend.append('project', formData.projectId);
            formDataToSend.append('name', formData.name);
            formDataToSend.append('description', formData.description || '');
            formDataToSend.append('contractor_master', formData.contractor.id); // Use contractor_master field
            formDataToSend.append('responsible_staff', formData.responsibleStaff.id);
            formDataToSend.append('agreement_no', formData.agreementNo);
            formDataToSend.append('agreement_date', formData.agreementDate);
            formDataToSend.append('agreement_document', agreementFile); // File object
            formDataToSend.append('budget', formData.contractValue);
            formDataToSend.append('start_date', formData.startDate || '');
            formDataToSend.append('end_date', formData.endDate);
            formDataToSend.append('status', formData.status);

            const response = await client.post('/projects/work-packages/', formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Show success with folder path
            toast.success(
                `Package created! Documents stored in: ${response.data.package_folder_path || 'EDMS'}`,
                { duration: 5000 }
            );

            // Call onSave callback if provided
            if (onSave) {
                await onSave(response.data);
            }

            onClose();
            resetForm();
        } catch (error) {
            console.error('Package creation failed:', error);
            toast.error(error.response?.data?.message || 'Failed to create package');
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
                    className="w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-neutral-700 flex justify-between items-center bg-gradient-to-r from-primary-50 to-white dark:from-neutral-900 dark:to-neutral-900">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create Work Package</h2>
                            <p className="text-sm text-slate-500 dark:text-neutral-400">Enter contract details and upload agreement</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                            <X size={24} className="text-slate-500 dark:text-neutral-400" />
                        </button>
                    </div>

                    {/* Form Content */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

                        {/* Project Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
                                Select Project <span className="text-red-500 dark:text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.projectId}
                                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                    disabled={!!preSelectedProjectId}
                                    className={`w-full p-2 pl-10 border rounded-lg appearance-none bg-white dark:bg-neutral-900 dark:text-white ${errors.projectId ? 'border-red-500' : 'border-slate-200 dark:border-neutral-700'
                                        } ${!!preSelectedProjectId ? 'bg-slate-50 dark:bg-neutral-800' : ''}`}
                                >
                                    <option value="">-- Select Project --</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <FolderOpen className="absolute left-3 top-2.5 text-slate-400 dark:text-neutral-500" size={18} />
                            </div>
                            {errors.projectId && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.projectId}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Package Name */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
                                    Package Name <span className="text-red-500 dark:text-red-400">*</span>
                                </label>
                                <input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className={`w-full p-2 border rounded-lg bg-white dark:bg-neutral-900 dark:text-white ${errors.name ? 'border-red-500' : 'border-slate-200 dark:border-neutral-700'}`}
                                    placeholder="E.g. Civil Works - Phase 1"
                                />
                                {errors.name && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.name}</p>}
                            </div>

                            {/* Contractor Dropdown */}
                            <div>
                                <ContractorSearchDropdown
                                    value={formData.contractor?.id}
                                    onSelect={(contractor) => setFormData({ ...formData, contractor })}
                                    label="Contractor"
                                    required
                                    error={errors.contractor}
                                />
                            </div>

                            {/* Responsible Staff Dropdown */}
                            <div>
                                <UserSelectField
                                    value={formData.responsibleStaff?.id}
                                    onChange={(userId) => {
                                        // Find user object from eligible staff or fetch it
                                        const user = eligibleStaff.find(s => s.id === userId);
                                        setFormData({ ...formData, responsibleStaff: user || { id: userId } });
                                    }}
                                    label="Responsible Staff"
                                    required
                                    placeholder="Select or invite responsible staff"
                                    error={errors.responsibleStaff}
                                    showInviteOption={true}
                                />
                            </div>

                            {/* Agreement Number */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
                                    Agreement No. <span className="text-red-500 dark:text-red-400">*</span>
                                </label>
                                <input
                                    value={formData.agreementNo}
                                    onChange={(e) => setFormData({ ...formData, agreementNo: e.target.value })}
                                    className={`w-full p-2 border rounded-lg bg-white dark:bg-neutral-900 dark:text-white ${errors.agreementNo ? 'border-red-500' : 'border-slate-200 dark:border-neutral-700'}`}
                                    placeholder="Agreement Number"
                                />
                                {errors.agreementNo && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.agreementNo}</p>}
                            </div>

                            {/* Agreement Date */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
                                    Agreement Date <span className="text-red-500 dark:text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={formData.agreementDate}
                                        onChange={(e) => setFormData({ ...formData, agreementDate: e.target.value })}
                                        className={`w-full p-2 pl-10 border rounded-lg bg-white dark:bg-neutral-900 dark:text-white ${errors.agreementDate ? 'border-red-500' : 'border-slate-200 dark:border-neutral-700'}`}
                                    />
                                    <Calendar className="absolute left-3 top-2.5 text-slate-400 dark:text-neutral-500" size={18} />
                                </div>
                                {errors.agreementDate && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.agreementDate}</p>}
                            </div>

                            {/* Agreement Document Upload */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
                                    Agreement Document <span className="text-red-500 dark:text-red-400">*</span>
                                </label>
                                <div className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${agreementFile ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : errors.agreementDocument ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-neutral-700 hover:border-primary-400'
                                    }`}>
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        accept=".pdf,.doc,.docx"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="text-center">
                                        {agreementFile ? (
                                            <>
                                                <CheckCircle className="mx-auto text-green-600 dark:text-green-400 mb-2" size={32} />
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">{agreementFile.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                                                    {(agreementFile.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="mx-auto text-slate-400 dark:text-neutral-500 mb-2" size={32} />
                                                <p className="text-sm text-slate-600 dark:text-neutral-300">
                                                    Click or drag file to upload
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                                                    PDF, DOC, or DOCX (Max 10MB)
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {(errors.agreementDocument || fileError) && (
                                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.agreementDocument || fileError}</p>
                                )}
                            </div>

                            {/* Contract Value */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
                                    Contract Value (₹) <span className="text-red-500 dark:text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={formData.contractValue}
                                        onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
                                        className={`w-full p-2 pl-10 border rounded-lg bg-white dark:bg-neutral-900 dark:text-white ${errors.contractValue ? 'border-red-500' : 'border-slate-200 dark:border-neutral-700'}`}
                                        placeholder="0.00"
                                    />
                                    <DollarSign className="absolute left-3 top-2.5 text-slate-400 dark:text-neutral-500" size={18} />
                                </div>
                                {errors.contractValue && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.contractValue}</p>}
                            </div>

                            {/* Due Date of Completion */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
                                    Due Date of Completion <span className="text-red-500 dark:text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className={`w-full p-2 pl-10 border rounded-lg bg-white dark:bg-neutral-900 dark:text-white ${errors.endDate ? 'border-red-500' : 'border-slate-200 dark:border-neutral-700'}`}
                                    />
                                    <Calendar className="absolute left-3 top-2.5 text-slate-400 dark:text-neutral-500" size={18} />
                                </div>
                                {errors.endDate && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.endDate}</p>}
                            </div>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-100 dark:border-neutral-700 flex justify-end gap-3 bg-slate-50 dark:bg-neutral-800/50">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="min-w-[120px]"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin mr-2" size={18} />
                                    Creating...
                                </>
                            ) : (
                                'Create Package'
                            )}
                        </Button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

export default CreatePackageModal;
