import { useState, useEffect } from 'react';
import { X, AlertTriangle, ChevronRight, ChevronLeft, Save, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import riskService from '@/api/services/riskService';

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
        schedule_impact_days: ''
    });

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
            return formData.title && formData.project && formData.description;
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
                    <span className="w-6 text-xs text-gray-500 dark:text-neutral-400 text-right">{p}</span>
                    {row}
                </div>
            );
        }
        return (
            <div className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                <div className="flex flex-col gap-1">
                    {matrix}
                    <div className="flex gap-1 mt-1 pl-7">
                        {[1, 2, 3, 4, 5].map(i => (
                            <span key={i} className="w-10 text-center text-xs text-gray-500 dark:text-neutral-400">{i}</span>
                        ))}
                    </div>
                </div>
                <div className="flex justify-between mt-4 text-xs text-gray-500 dark:text-neutral-400">
                    <span>Impact →</span>
                    <span>↑ Probability</span>
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 dark:bg-black/70"
                    onClick={onClose}
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-red-500">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="text-white" size={24} />
                                <h2 className="text-xl font-semibold text-white">
                                    {isEditing ? 'Edit Risk' : 'Register New Risk'}
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="text-white" size={20} />
                            </button>
                        </div>

                        {/* Step Indicator */}
                        <div className="flex items-center gap-2 mt-4">
                            {[1, 2, 3].map((s) => (
                                <div key={s} className="flex items-center">
                                    <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm
                    ${step === s ? 'bg-white text-orange-600' :
                                            step > s ? 'bg-white/80 text-orange-600' : 'bg-white/30 text-white'}
                  `}>
                                        {s}
                                    </div>
                                    {s < 3 && (
                                        <div className={`w-12 h-1 mx-1 rounded ${step > s ? 'bg-white/80' : 'bg-white/30'}`} />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex mt-2 text-white/80 text-xs">
                            <span className="w-8 text-center">Info</span>
                            <span className="w-12"></span>
                            <span className="w-8 text-center">Assess</span>
                            <span className="w-12"></span>
                            <span className="w-8 text-center">Plan</span>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Step 1: Basic Info */}
                        {step === 1 && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                        Project <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.project}
                                        onChange={(e) => handleChange('project', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="">Select a project</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                        Risk Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => handleChange('title', e.target.value)}
                                        placeholder="Brief risk title (e.g., 'Monsoon delay risk')"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                        Description <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        placeholder="Detailed description of the risk..."
                                        rows={4}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                            Category
                                        </label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => handleChange('category', e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            {riskService.CATEGORIES.map(c => (
                                                <option key={c.value} value={c.value}>{c.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                            Risk Source
                                        </label>
                                        <select
                                            value={formData.risk_source}
                                            onChange={(e) => handleChange('risk_source', e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            <option value="INTERNAL">Internal</option>
                                            <option value="EXTERNAL">External</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Risk Assessment */}
                        {step === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-3">
                                        Risk Assessment Matrix
                                    </label>
                                    <p className="text-sm text-gray-500 dark:text-neutral-400 mb-4">
                                        Click on a cell to set probability (vertical) and impact (horizontal)
                                    </p>
                                    <RiskMatrix />
                                </div>

                                <div className="flex items-center justify-center gap-6 py-4 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                                    <div className="text-center">
                                        <div className="text-sm text-gray-500 dark:text-neutral-400 mb-1">Risk Score</div>
                                        <div className={`text-4xl font-bold ${severityColors.text}`}>
                                            {riskScore}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm text-gray-500 dark:text-neutral-400 mb-1">Severity</div>
                                        <span className={`px-4 py-2 rounded-full text-lg font-medium ${severityColors.bg} ${severityColors.text}`}>
                                            {severity}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                            Status
                                        </label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => handleChange('status', e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            {riskService.STATUSES.map(s => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                            Target Resolution Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.target_resolution}
                                            onChange={(e) => handleChange('target_resolution', e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Response Plan */}
                        {step === 3 && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                        Response Strategy
                                    </label>
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
                                                        : 'border-gray-300 dark:border-neutral-600 dark:text-neutral-300 hover:border-gray-400'}
                        `}
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                        Mitigation Plan
                                    </label>
                                    <textarea
                                        value={formData.mitigation_plan}
                                        onChange={(e) => handleChange('mitigation_plan', e.target.value)}
                                        placeholder="Describe actions to reduce probability or impact..."
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                        Contingency Plan
                                    </label>
                                    <textarea
                                        value={formData.contingency_plan}
                                        onChange={(e) => handleChange('contingency_plan', e.target.value)}
                                        placeholder="Describe actions if risk materializes..."
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                            Cost Impact (₹)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.cost_impact}
                                            onChange={(e) => handleChange('cost_impact', e.target.value)}
                                            placeholder="Estimated financial impact"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                            Schedule Impact (days)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.schedule_impact_days}
                                            onChange={(e) => handleChange('schedule_impact_days', e.target.value)}
                                            placeholder="Estimated delay in days"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 flex items-center justify-between">
                        <div>
                            {step > 1 && (
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                    Previous
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            {step < 3 ? (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    disabled={!canProceed()}
                                    className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                    <ChevronRight size={18} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            {isEditing ? 'Update Risk' : 'Create Risk'}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CreateRiskModal;
