import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Flag, Target, Scale, IndianRupee, AlertCircle, ChevronDown } from 'lucide-react';
import Button from '@/components/ui/Button';
import Toggle from '@/components/ui/Toggle';
import { toast } from 'sonner';
import schedulingService from '@/services/schedulingService';

// Progress measurement methods
const PROGRESS_METHODS = [
    { value: 'QUANTITY', label: 'Quantity-Based', description: 'Progress = Executed / Planned quantity' },
    { value: 'MILESTONE', label: 'Milestone-Based', description: 'Progress jumps at milestone completion' },
    { value: 'COST', label: 'Cost-Based', description: 'Progress = Actual / Budgeted cost' },
    { value: 'TIME', label: 'Time-Based', description: 'Progress = Days elapsed / Duration' },
    { value: 'MANUAL', label: 'Manual (Restricted)', description: 'Requires justification' },
];

const AddScheduleTaskModal = ({ isOpen, onClose, projectId, onTaskCreated, editTask = null }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isMilestone, setIsMilestone] = useState(editTask?.is_milestone || false);
    const [isCritical, setIsCritical] = useState(editTask?.is_critical || false);

    // Progress tracking fields
    const [progressMethod, setProgressMethod] = useState(editTask?.progress_method || 'QUANTITY');
    const [plannedQuantity, setPlannedQuantity] = useState(editTask?.planned_quantity || '');
    const [executedQuantity, setExecutedQuantity] = useState(editTask?.executed_quantity || '');
    const [uom, setUom] = useState(editTask?.uom || '');
    const [budgetedCost, setBudgetedCost] = useState(editTask?.budgeted_cost || '');
    const [actualCost, setActualCost] = useState(editTask?.actual_cost || '');
    const [weight, setWeight] = useState(editTask?.weight || '');

    // ESC key handler
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen && !isLoading) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose, isLoading]);

    // Calculate computed progress based on method
    const computedProgress = (() => {
        if (progressMethod === 'QUANTITY' && plannedQuantity > 0) {
            return Math.min(100, ((executedQuantity || 0) / plannedQuantity) * 100);
        }
        if (progressMethod === 'COST' && budgetedCost > 0) {
            return Math.min(100, ((actualCost || 0) / budgetedCost) * 100);
        }
        return 0;
    })();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const form = e.target;
        const formData = new FormData(form);

        const taskData = {
            name: formData.get('name'),
            description: formData.get('description') || '',
            start_date: formData.get('startDate'),
            end_date: formData.get('endDate'),
            is_milestone: isMilestone,
            is_critical: isCritical,

            // Progress tracking fields
            progress_method: progressMethod,
            planned_quantity: parseFloat(plannedQuantity) || null,
            executed_quantity: parseFloat(executedQuantity) || null,
            uom: uom || null,
            budgeted_cost: parseFloat(budgetedCost) || null,
            actual_cost: parseFloat(actualCost) || null,
            weight: parseFloat(weight) || null,
        };

        try {
            if (editTask) {
                await schedulingService.updateTask(editTask.id, taskData);
                toast.success("Task updated successfully");
            } else {
                await schedulingService.createTask(taskData, projectId);
                toast.success("Task created successfully");
            }
            onTaskCreated();
            onClose();
        } catch (error) {
            console.error('Task operation failed:', error);
            const msg = error.response?.data?.error || error.response?.data?.detail || "Failed to save task";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const inputClasses = "w-full border border-slate-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 dark:text-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none";
    const labelClasses = "block text-sm font-semibold text-slate-700 dark:text-neutral-300 mb-1.5";

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={!isLoading ? onClose : undefined}
                        className="fixed inset-0 z-[9999] bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm"
                    />
                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div
                            className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl pointer-events-auto w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-800/50 flex-shrink-0">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                                    {editTask ? 'Edit Task' : 'Add Schedule Task'}
                                </h2>
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-700 rounded-full transition-colors disabled:opacity-50"
                                >
                                    <X size={20} className="text-slate-500 dark:text-neutral-400" />
                                </button>
                            </div>

                            {/* Content - Scrollable */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                                {/* Basic Info */}
                                <div>
                                    <label className={labelClasses}>Task Name *</label>
                                    <input
                                        name="name"
                                        required
                                        autoFocus
                                        disabled={isLoading}
                                        defaultValue={editTask?.name || ''}
                                        className={inputClasses}
                                        placeholder="e.g. Foundation Work - Phase 1"
                                    />
                                </div>

                                <div>
                                    <label className={labelClasses}>Description</label>
                                    <textarea
                                        name="description"
                                        disabled={isLoading}
                                        defaultValue={editTask?.description || ''}
                                        rows={2}
                                        className={inputClasses}
                                        placeholder="Task description (optional)"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`${labelClasses} flex items-center gap-1.5`}>
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            Start Date *
                                        </label>
                                        <input
                                            name="startDate"
                                            type="date"
                                            required
                                            disabled={isLoading}
                                            defaultValue={editTask?.start_date || ''}
                                            className={inputClasses}
                                        />
                                    </div>
                                    <div>
                                        <label className={`${labelClasses} flex items-center gap-1.5`}>
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            End Date *
                                        </label>
                                        <input
                                            name="endDate"
                                            type="date"
                                            required
                                            disabled={isLoading}
                                            defaultValue={editTask?.end_date || ''}
                                            className={inputClasses}
                                        />
                                    </div>
                                </div>

                                {/* Progress Tracking Section */}
                                <div className="border-t border-slate-100 dark:border-neutral-700 pt-5">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                        <Target size={16} className="text-primary-600" />
                                        Progress Tracking
                                    </h3>

                                    {/* Progress Method */}
                                    <div className="mb-4">
                                        <label className={labelClasses}>Progress Measurement Method</label>
                                        <div className="relative">
                                            <select
                                                value={progressMethod}
                                                onChange={(e) => setProgressMethod(e.target.value)}
                                                disabled={isLoading}
                                                className={`${inputClasses} appearance-none cursor-pointer`}
                                            >
                                                {PROGRESS_METHODS.map(m => (
                                                    <option key={m.value} value={m.value}>{m.label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                                            {PROGRESS_METHODS.find(m => m.value === progressMethod)?.description}
                                        </p>
                                    </div>

                                    {/* Quantity Fields (shown for QUANTITY method) */}
                                    {progressMethod === 'QUANTITY' && (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800 space-y-3">
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">Planned Qty *</label>
                                                    <input
                                                        type="number"
                                                        value={plannedQuantity}
                                                        onChange={(e) => setPlannedQuantity(e.target.value)}
                                                        disabled={isLoading}
                                                        className={inputClasses}
                                                        placeholder="e.g. 100"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">Executed Qty</label>
                                                    <input
                                                        type="number"
                                                        value={executedQuantity}
                                                        onChange={(e) => setExecutedQuantity(e.target.value)}
                                                        disabled={isLoading}
                                                        className={inputClasses}
                                                        placeholder="e.g. 50"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">Unit (UOM)</label>
                                                    <input
                                                        type="text"
                                                        value={uom}
                                                        onChange={(e) => setUom(e.target.value)}
                                                        disabled={isLoading}
                                                        className={inputClasses}
                                                        placeholder="e.g. m³"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Cost Fields (shown for COST method) */}
                                    {progressMethod === 'COST' && (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-100 dark:border-emerald-800 space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1 flex items-center gap-1">
                                                        <IndianRupee size={12} /> Budgeted Cost (₹) *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={budgetedCost}
                                                        onChange={(e) => setBudgetedCost(e.target.value)}
                                                        disabled={isLoading}
                                                        className={inputClasses}
                                                        placeholder="e.g. 1000000"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">Actual Cost (₹)</label>
                                                    <input
                                                        type="number"
                                                        value={actualCost}
                                                        onChange={(e) => setActualCost(e.target.value)}
                                                        disabled={isLoading}
                                                        className={inputClasses}
                                                        placeholder="e.g. 500000"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Weight (for all methods) */}
                                    <div className="mt-4">
                                        <label className={`${labelClasses} flex items-center gap-1.5`}>
                                            <Scale size={14} className="text-slate-400" />
                                            Task Weight (0-100)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={weight}
                                            onChange={(e) => setWeight(e.target.value)}
                                            disabled={isLoading}
                                            className={`${inputClasses} max-w-[150px]`}
                                            placeholder="Auto-calculated"
                                        />
                                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                                            Leave empty for automatic weight based on duration
                                        </p>
                                    </div>

                                    {/* Computed Progress Display */}
                                    {((progressMethod === 'QUANTITY' && plannedQuantity > 0) || (progressMethod === 'COST' && budgetedCost > 0)) ? (
                                        <div className="mt-4 bg-slate-50 dark:bg-neutral-800 rounded-lg p-3 border border-slate-200 dark:border-neutral-700">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-slate-700 dark:text-neutral-300">Computed Progress</span>
                                                <span className="text-sm font-bold text-primary-600">{computedProgress.toFixed(1)}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300"
                                                    style={{ width: `${computedProgress}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                                                This value is computed automatically and cannot be manually overridden.
                                            </p>
                                        </div>
                                    ) : null}
                                </div>

                                {/* Milestone & Critical Path Toggles */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-100 dark:border-amber-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Flag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                <label className="text-sm font-medium text-slate-800 dark:text-white cursor-pointer">
                                                    Milestone
                                                </label>
                                            </div>
                                            <Toggle
                                                checked={isMilestone}
                                                onChange={() => setIsMilestone(!isMilestone)}
                                                size="sm"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                                            Required for budget allocation
                                        </p>
                                    </div>

                                    <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-3 border border-rose-100 dark:border-rose-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                                <label className="text-sm font-medium text-slate-800 dark:text-white cursor-pointer">
                                                    Critical Path
                                                </label>
                                            </div>
                                            <Toggle
                                                checked={isCritical}
                                                onChange={() => setIsCritical(!isCritical)}
                                                size="sm"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                                            Delays affect project timeline
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onClose}
                                        disabled={isLoading}
                                        className="w-full"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? 'Saving...' : (editTask ? 'Update Task' : 'Create Task')}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default AddScheduleTaskModal;
