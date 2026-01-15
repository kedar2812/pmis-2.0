/**
 * BOQMilestoneMappingModal - Link BOQ items to Schedule Milestones with % allocation
 * 
 * Enables the "No Money Without Time" principle by connecting costs to schedule.
 * A BOQ item can be split across multiple milestones (e.g., 30% Foundation, 70% Superstructure)
 */
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Link2, Target, Percent, Plus, Trash2, Loader2,
    CheckCircle2, AlertCircle, Calendar, PieChart
} from 'lucide-react';
import Button from '@/components/ui/Button';
import financeService from '@/services/financeService';
import schedulingService from '@/services/schedulingService';
import { toast } from 'sonner';

const BOQMilestoneMappingModal = ({ boqItem, projectId, onClose, onUpdated }) => {
    const [milestones, setMilestones] = useState([]);
    const [existingMappings, setExistingMappings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // New mapping form
    const [selectedMilestone, setSelectedMilestone] = useState('');
    const [percentageAllocated, setPercentageAllocated] = useState('');
    const [addingNew, setAddingNew] = useState(false);

    // Load data
    useEffect(() => {
        loadData();
    }, [boqItem.id, projectId]);

    // ESC key handler
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [milestonesData, mappingsData] = await Promise.all([
                schedulingService.getMilestones(projectId),
                financeService.getBOQMappings(boqItem.id)
            ]);
            setMilestones(milestonesData);
            setExistingMappings(mappingsData);
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load milestone data');
        } finally {
            setLoading(false);
        }
    };

    // Calculate allocated and remaining percentages
    const { totalAllocated, remaining } = useMemo(() => {
        const total = existingMappings.reduce((sum, m) => sum + parseFloat(m.percentage_allocated || 0), 0);
        return {
            totalAllocated: total,
            remaining: 100 - total
        };
    }, [existingMappings]);

    // Filter out already mapped milestones
    const availableMilestones = useMemo(() => {
        const mappedIds = new Set(existingMappings.map(m => m.milestone));
        return milestones.filter(m => !mappedIds.has(m.id));
    }, [milestones, existingMappings]);

    // Add new mapping
    const handleAddMapping = async () => {
        if (!selectedMilestone) {
            return toast.error('Please select a milestone');
        }

        const pct = parseFloat(percentageAllocated);
        if (isNaN(pct) || pct <= 0 || pct > 100) {
            return toast.error('Please enter a valid percentage (1-100)');
        }

        if (pct > remaining) {
            return toast.error(`Cannot allocate more than ${remaining.toFixed(1)}% remaining`);
        }

        setAddingNew(true);
        try {
            const newMapping = await financeService.createBOQMapping({
                boq_item: boqItem.id,
                milestone: selectedMilestone,
                percentage_allocated: pct.toFixed(2)
            });

            setExistingMappings(prev => [...prev, newMapping]);
            setSelectedMilestone('');
            setPercentageAllocated('');
            toast.success('Milestone linked successfully');

        } catch (error) {
            console.error('Failed to create mapping:', error);
            const errorMsg = error.response?.data?.detail || 'Failed to create mapping';
            toast.error(errorMsg);
        } finally {
            setAddingNew(false);
        }
    };

    // Delete mapping
    const handleDeleteMapping = async (mappingId) => {
        if (!confirm('Remove this milestone link?')) return;

        try {
            await financeService.deleteBOQMapping(mappingId);
            setExistingMappings(prev => prev.filter(m => m.id !== mappingId));
            toast.success('Mapping removed');
        } catch (error) {
            console.error('Failed to delete mapping:', error);
            toast.error('Failed to remove mapping');
        }
    };

    // Format currency
    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    // Get milestone name by ID
    const getMilestoneName = (milestoneId) => {
        const milestone = milestones.find(m => m.id === milestoneId);
        return milestone?.name || 'Unknown Milestone';
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-neutral-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-neutral-800 dark:to-neutral-800">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Link2 className="text-amber-600 dark:text-amber-400" size={20} />
                            Link to Milestones
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                            Allocate BOQ cost across schedule milestones
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/50 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-slate-500 dark:text-neutral-400" />
                    </button>
                </div>

                {/* BOQ Item Info */}
                <div className="p-4 bg-slate-50 dark:bg-neutral-800 border-b border-slate-200 dark:border-neutral-700">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                            <PieChart size={18} className="text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-amber-700">{boqItem.item_code}</span>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                    {formatCurrency(boqItem.amount)}
                                </span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-neutral-400 line-clamp-2">{boqItem.description}</p>
                        </div>
                    </div>

                    {/* Allocation Progress Bar */}
                    <div className="mt-4">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-600 dark:text-neutral-400">Allocated to Milestones</span>
                            <span className={`font-medium ${totalAllocated >= 100 ? 'text-green-600' : 'text-amber-600'}`}>
                                {totalAllocated.toFixed(1)}% / 100%
                            </span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <motion.div
                                className={`h-full ${totalAllocated >= 100 ? 'bg-green-500' : 'bg-amber-500'}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(totalAllocated, 100)}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 max-h-[50vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Existing Mappings */}
                            {existingMappings.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                                        Linked Milestones
                                    </p>
                                    {existingMappings.map((mapping) => (
                                        <div
                                            key={mapping.id}
                                            className="flex items-center justify-between p-3 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg hover:border-slate-300 dark:hover:border-neutral-600 transition-colors group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                                    <Target size={14} className="text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-800 dark:text-white">
                                                        {mapping.milestone_name || getMilestoneName(mapping.milestone)}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                                                        {formatCurrency(boqItem.amount * (parseFloat(mapping.percentage_allocated) / 100))}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="px-2 py-1 bg-green-100 text-green-700 text-sm font-bold rounded">
                                                    {parseFloat(mapping.percentage_allocated).toFixed(1)}%
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteMapping(mapping.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                    title="Remove mapping"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add New Mapping */}
                            {remaining > 0 && availableMilestones.length > 0 && (
                                <div className="p-4 bg-slate-50 dark:bg-neutral-800 rounded-xl border border-slate-200 dark:border-neutral-700 space-y-3">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                                        <Plus size={12} /> Add Milestone Link
                                    </p>

                                    <div className="flex gap-2">
                                        <select
                                            value={selectedMilestone}
                                            onChange={(e) => setSelectedMilestone(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-slate-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-neutral-900 dark:text-white"
                                        >
                                            <option value="">Select Milestone...</option>
                                            {availableMilestones.map(m => (
                                                <option key={m.id} value={m.id}>
                                                    {m.name} ({m.progress}% complete)
                                                </option>
                                            ))}
                                        </select>

                                        <div className="relative w-24">
                                            <input
                                                type="number"
                                                min="0.1"
                                                max={remaining}
                                                step="0.1"
                                                value={percentageAllocated}
                                                onChange={(e) => setPercentageAllocated(e.target.value)}
                                                placeholder={`Max ${remaining.toFixed(0)}%`}
                                                className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-neutral-900 dark:text-white pr-7"
                                            />
                                            <Percent size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        </div>

                                        <Button
                                            onClick={handleAddMapping}
                                            disabled={addingNew}
                                            size="sm"
                                            className="bg-amber-600 text-white hover:bg-amber-700"
                                        >
                                            {addingNew ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Fully Allocated Message */}
                            {remaining <= 0 && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
                                    <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                                    <div>
                                        <p className="text-sm font-medium text-green-800 dark:text-green-300">Fully Allocated</p>
                                        <p className="text-xs text-green-600 dark:text-green-400">This BOQ item is 100% linked to milestones</p>
                                    </div>
                                </div>
                            )}

                            {/* No Milestones Warning */}
                            {milestones.length === 0 && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-3">
                                    <AlertCircle size={20} className="text-amber-600 dark:text-amber-400" />
                                    <div>
                                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">No Milestones Found</p>
                                        <p className="text-xs text-amber-600 dark:text-amber-400">
                                            Import a schedule or add milestone tasks to the project first
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end p-4 border-t border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800">
                    <Button
                        onClick={() => { onUpdated && onUpdated(); onClose(); }}
                        className="bg-primary-600 text-white"
                    >
                        Done
                    </Button>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default BOQMilestoneMappingModal;
