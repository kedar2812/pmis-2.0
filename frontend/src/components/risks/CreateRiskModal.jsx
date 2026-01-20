import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, ChevronRight, ChevronLeft, Save, Loader2, Upload, Check, FileText, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import riskService from '@/api/services/riskService';
import Button from '@/components/ui/Button';
import { useModalClose } from '@/hooks/useModalClose';
import { toast } from 'sonner';

/**
 * Multi-step modal for creating or editing a risk.
 * Steps: 1. Basic Info, 2. Assessment, 3. Response Plan
 */
const CreateRiskModal = ({ isOpen, onClose, onSuccess, projects, editingRisk = null }) => {
    const isEditing = !!editingRisk;

    // Form state
    const [step, setStep] = useState(1);
    const [loading, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Use standard hook for Escape key closing
    useModalClose(isOpen, onClose);

    // Form data
    const [formData, setFormData] = useState({
        // Step 1: Basic Info
        title: '',
        description: '',
        project: '',
        category: 'OTHER',
        risk_source: 'INTERNAL',

        // Step 2: Assessment
        probability: 3,
        impact: 3,
        status: 'IDENTIFIED',
        target_resolution: '',
        owner: '',

        // Step 3: Response Plan
        response_strategy: '',
        mitigation_plan: '',
        contingency_plan: '',
        cost_impact: '',
        schedule_impact_days: '',

        // Proof document
        proofDocument: null
    });

    // Drag and drop state
    const [isDragging, setIsDragging] = useState(false);
    const dropRef = useRef(null);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setError(null);
            if (!editingRisk) {
                setFormData({
                    title: '',
                    description: '',
                    project: '',
                    category: 'OTHER',
                    risk_source: 'INTERNAL',
                    probability: 3,
                    impact: 3,
                    status: 'IDENTIFIED',
                    target_resolution: '',
                    owner: '',
                    response_strategy: '',
                    mitigation_plan: '',
                    contingency_plan: '',
                    cost_impact: '',
                    schedule_impact_days: '',
                    proofDocument: null
                });
            }
        }
    }, [isOpen, editingRisk]);

    // Initialize with editing risk data
    useEffect(() => {
        if (editingRisk) {
            setFormData({
                title: editingRisk.title || '',
                description: editingRisk.description || '',
                project: editingRisk.project || '',
                category: editingRisk.category || 'OTHER',
                risk_source: editingRisk.risk_source || 'INTERNAL',
                probability: editingRisk.probability || 3,
                impact: editingRisk.impact || 3,
                status: editingRisk.status || 'IDENTIFIED',
                target_resolution: editingRisk.target_resolution || '',
                owner: editingRisk.owner || '',
                response_strategy: editingRisk.response_strategy || '',
                mitigation_plan: editingRisk.mitigation_plan || '',
                contingency_plan: editingRisk.contingency_plan || '',
                cost_impact: editingRisk.cost_impact || '',
                schedule_impact_days: editingRisk.schedule_impact_days || ''
            });
        }
    }, [editingRisk]);

    // Calculate risk score
    const riskScore = formData.probability * formData.impact;
    const severity = riskService.getSeverityFromScore(riskScore);
    const severityColors = riskService.getSeverityColor(severity);

    // Handle input change
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    // Navigation
    const canProceed = () => {
        if (step === 1) {
            // Require proof document when creating a new risk
            return formData.title && formData.project && formData.description && (isEditing || formData.proofDocument);
        }
        if (step === 2) {
            return formData.probability && formData.impact;
        }
        return true;
    };

    const nextStep = () => {
        if (step < 3 && canProceed()) setStep(step + 1);
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    // Submit form
    const handleSubmit = async () => {
        if (!canProceed()) return;

        setSaving(true);
        setError(null);

        try {
            const payload = {
                ...formData,
                cost_impact: formData.cost_impact ? parseFloat(formData.cost_impact) : 0,
                schedule_impact_days: formData.schedule_impact_days ? parseInt(formData.schedule_impact_days) : 0
            };

            // Remove empty optional fields
            if (!payload.owner) delete payload.owner;
            if (!payload.target_resolution) delete payload.target_resolution;
            if (!payload.response_strategy) delete payload.response_strategy;

            let response;
            if (isEditing) {
                response = await riskService.updateRisk(editingRisk.id, payload);
            } else {
                response = await riskService.createRisk(payload);
            }

            onSuccess(response.data);
        } catch (err) {
            console.error('Failed to save risk:', err);
            setError(err.response?.data?.detail || 'Failed to save risk. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Common input classes matching website UI
    const inputClasses = "w-full px-3 py-2.5 rounded-lg border border-app bg-app-input text-app-text text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:focus:ring-indigo-500/30 outline-none transition-all";
    const labelClasses = "block text-sm font-medium text-app-text mb-1.5";
    const errorClasses = "text-xs text-red-500 dark:text-red-400 mt-1";

    // Risk matrix component
    const RiskMatrix = () => {
        const matrix = [];
        for (let p = 5; p >= 1; p--) {
            const row = [];
            for (let i = 1; i <= 5; i++) {
                const score = p * i;
                const sev = riskService.getSeverityFromScore(score);
                const colors = riskService.getSeverityColor(sev);
                const isSelected = formData.probability === p && formData.impact === i;
                row.push(
                    <button
                        key={`${p}-${i}`}
                        type="button"
                        onClick={() => {
                            handleChange('probability', p);
                            handleChange('impact', i);
                        }}
                        className={`
                            w-10 h-10 text-xs font-bold rounded-md transition-all
                            ${colors.bg} ${colors.text} ${colors.border}
                            ${isSelected ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : 'hover:scale-105'}
                        `}
                    >
                        {score}
                    </button>
                );
            }
            matrix.push(
                <div key={p} className="flex gap-1 items-center">
                    <span className="w-6 text-xs text-app-muted text-right">{p}</span>
                    {row}
                </div>
            );
        }
        return (
            <div className="p-4 bg-app-surface rounded-lg">
                <div className="flex flex-col gap-1">
                    {matrix}
                    <div className="flex gap-1 mt-1 pl-7">
                        {[1, 2, 3, 4, 5].map(i => (
                            <span key={i} className="w-10 text-center text-xs text-app-muted">{i}</span>
                        ))}
                    </div>
                </div>
                <div className="flex justify-between mt-4 text-xs text-app-muted">
                    <span>Impact →</span>
                    <span>↑ Probability</span>
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-app-overlay backdrop-blur-sm p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-2xl bg-app-card rounded-xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-app-subtle flex justify-between items-center bg-app-card z-10">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-app-heading flex items-center gap-2">
                            <AlertTriangle className="text-amber-500" size={24} />
                            {isEditing ? 'Edit Risk' : 'Register New Risk'}
                        </h2>
                        <p className="text-xs sm:text-sm text-app-muted">
                            Step {step} of 3: {step === 1 ? 'Basic Information' : step === 2 ? 'Risk Assessment' : 'Response Plan'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-app-surface rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                        <X size={24} className="text-app-muted" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 w-full bg-app-surface">
                    <motion.div
                        className="h-full bg-primary-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${(step / 3) * 100}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            {/* Step 1: Basic Info */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClasses}>
                                            Project <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={formData.project}
                                                onChange={(e) => handleChange('project', e.target.value)}
                                                className={`${inputClasses} appearance-none cursor-pointer`}
                                            >
                                                <option value="">Select a project</option>
                                                {projects && projects.length > 0 ? (
                                                    projects.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))
                                                ) : (
                                                    <option disabled>No projects available</option>
                                                )}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <ChevronRight size={16} className="text-app-muted rotate-90" />
                                            </div>
                                        </div>
                                        {(!projects || projects.length === 0) && (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                                No projects found. Please create a project first.
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className={labelClasses}>
                                            Risk Title <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => handleChange('title', e.target.value)}
                                            placeholder="Brief risk title (e.g., 'Monsoon delay risk')"
                                            className={inputClasses}
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClasses}>
                                            Description <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => handleChange('description', e.target.value)}
                                            placeholder="Detailed description of the risk..."
                                            rows={4}
                                            className={inputClasses}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClasses}>Category</label>
                                            <select
                                                value={formData.category}
                                                onChange={(e) => handleChange('category', e.target.value)}
                                                className={`${inputClasses} appearance-none cursor-pointer`}
                                            >
                                                {riskService.CATEGORIES.map(c => (
                                                    <option key={c.value} value={c.value}>{c.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className={labelClasses}>Risk Source</label>
                                            <select
                                                value={formData.risk_source}
                                                onChange={(e) => handleChange('risk_source', e.target.value)}
                                                className={`${inputClasses} appearance-none cursor-pointer`}
                                            >
                                                <option value="INTERNAL">Internal</option>
                                                <option value="EXTERNAL">External</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Proof Document Upload - Required */}
                                    <div>
                                        <label className={labelClasses}>
                                            Proof Document <span className="text-red-500">*</span>
                                        </label>
                                        <p className="text-xs text-app-muted mb-2">Upload photos, reports, or documents supporting the risk identification</p>
                                        <div
                                            ref={dropRef}
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setIsDragging(false);
                                                const file = e.dataTransfer.files?.[0];
                                                if (file) {
                                                    handleChange('proofDocument', file);
                                                    toast.success('Document attached successfully');
                                                }
                                            }}
                                            onClick={() => document.getElementById('risk-proof-upload').click()}
                                            className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${isDragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' :
                                                    formData.proofDocument ? 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20' :
                                                        'border-app-subtle hover:border-app-muted hover:bg-app-surface'
                                                }`}
                                        >
                                            <input
                                                id="risk-proof-upload"
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        handleChange('proofDocument', file);
                                                        toast.success('Document attached successfully');
                                                    }
                                                }}
                                            />
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${formData.proofDocument ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' :
                                                    isDragging ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400' :
                                                        'bg-app-subtle text-app-muted'
                                                }`}>
                                                {formData.proofDocument ? <Check size={24} /> : <Upload size={24} />}
                                            </div>
                                            {formData.proofDocument ? (
                                                <>
                                                    <p className="font-medium text-green-700 dark:text-green-400">Document Selected</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <FileText size={14} className="text-green-600 dark:text-green-500" />
                                                        <p className="text-sm text-green-600 dark:text-green-500">{formData.proofDocument.name}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleChange('proofDocument', null);
                                                        }}
                                                        className="mt-2 text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                                                    >
                                                        <Trash2 size={12} /> Remove
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="font-medium text-app-heading">Upload Proof Document</p>
                                                    <p className="text-sm text-app-muted mt-1">
                                                        {isDragging ? 'Drop file here' : 'Drag and drop or click to browse'}
                                                    </p>
                                                    <p className="text-xs text-app-muted mt-2">Supported: PDF, DOC, DOCX, JPG, PNG</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Risk Assessment */}
                            {step === 2 && (
                                <div className="space-y-6">
                                    <div>
                                        <label className={labelClasses}>Risk Assessment Matrix</label>
                                        <p className="text-sm text-app-muted mb-4">
                                            Click on a cell to set probability (vertical) and impact (horizontal)
                                        </p>
                                        <RiskMatrix />
                                    </div>

                                    <div className="flex items-center justify-center gap-6 py-4 bg-app-surface rounded-lg">
                                        <div className="text-center">
                                            <div className="text-sm text-app-muted mb-1">Risk Score</div>
                                            <div className={`text-4xl font-bold ${severityColors.text}`}>
                                                {riskScore}
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm text-app-muted mb-1">Severity</div>
                                            <span className={`px-4 py-2 rounded-full text-lg font-medium ${severityColors.bg} ${severityColors.text}`}>
                                                {severity}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClasses}>Status</label>
                                            <select
                                                value={formData.status}
                                                onChange={(e) => handleChange('status', e.target.value)}
                                                className={`${inputClasses} appearance-none cursor-pointer`}
                                            >
                                                {riskService.STATUSES.map(s => (
                                                    <option key={s.value} value={s.value}>{s.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className={labelClasses}>Target Resolution Date</label>
                                            <input
                                                type="date"
                                                value={formData.target_resolution}
                                                onChange={(e) => handleChange('target_resolution', e.target.value)}
                                                className={inputClasses}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Response Plan */}
                            {step === 3 && (
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClasses}>Response Strategy</label>
                                        <div className="grid grid-cols-5 gap-2">
                                            {riskService.RESPONSE_STRATEGIES.map(s => (
                                                <button
                                                    key={s.value}
                                                    type="button"
                                                    onClick={() => handleChange('response_strategy', s.value)}
                                                    className={`
                                                        px-3 py-2 text-sm rounded-lg border transition-all
                                                        ${formData.response_strategy === s.value
                                                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                                                            : 'border-app bg-app-surface text-app-muted hover:border-app-muted'}
                                                    `}
                                                >
                                                    {s.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClasses}>Mitigation Plan</label>
                                        <textarea
                                            value={formData.mitigation_plan}
                                            onChange={(e) => handleChange('mitigation_plan', e.target.value)}
                                            placeholder="Describe actions to reduce probability or impact..."
                                            rows={3}
                                            className={inputClasses}
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClasses}>Contingency Plan</label>
                                        <textarea
                                            value={formData.contingency_plan}
                                            onChange={(e) => handleChange('contingency_plan', e.target.value)}
                                            placeholder="Describe actions if risk materializes..."
                                            rows={3}
                                            className={inputClasses}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClasses}>Cost Impact (₹)</label>
                                            <input
                                                type="number"
                                                value={formData.cost_impact}
                                                onChange={(e) => handleChange('cost_impact', e.target.value)}
                                                placeholder="Estimated financial impact"
                                                className={inputClasses}
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClasses}>Schedule Impact (days)</label>
                                            <input
                                                type="number"
                                                value={formData.schedule_impact_days}
                                                onChange={(e) => handleChange('schedule_impact_days', e.target.value)}
                                                placeholder="Estimated delay in days"
                                                className={inputClasses}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t border-app-subtle bg-app-surface flex flex-col sm:flex-row justify-between gap-3">
                    <Button
                        variant="outline"
                        onClick={step === 1 ? onClose : prevStep}
                        disabled={loading}
                        className="min-h-[44px]"
                    >
                        {step === 1 ? 'Cancel' : (
                            <>
                                <ChevronLeft size={16} className="mr-1" />
                                Back
                            </>
                        )}
                    </Button>

                    {step < 3 ? (
                        <Button
                            onClick={nextStep}
                            disabled={!canProceed()}
                            className="min-h-[44px]"
                        >
                            Next Step <ChevronRight size={16} className="ml-1" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={loading || !canProceed()}
                            className="min-h-[44px]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin mr-2" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={18} className="mr-2" />
                                    {isEditing ? 'Update Risk' : 'Create Risk'}
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
};

export default CreateRiskModal;
