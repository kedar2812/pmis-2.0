import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Flag } from 'lucide-react';
import Button from '@/components/ui/Button';
import Toggle from '@/components/ui/Toggle';
import { toast } from 'sonner';
import schedulingService from '@/services/schedulingService';

const AddScheduleTaskModal = ({ isOpen, onClose, projectId, onTaskCreated }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isMilestone, setIsMilestone] = useState(false);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const form = e.target;
        const formData = new FormData(form);

        const newTask = {
            name: formData.get('name'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            progress: 0,
            isMilestone: isMilestone
        };

        try {
            await schedulingService.createTask(newTask, projectId);
            toast.success("Task Created successfully");
            onTaskCreated();
            onClose();
        } catch (error) {
            console.error('Create task failed:', error);
            const msg = error.response?.data?.error || error.response?.data?.detail || "Failed to create task";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

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
                        className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm"
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
                            className="bg-white rounded-xl shadow-2xl pointer-events-auto w-full max-w-md overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header with close button */}
                            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-lg font-bold text-slate-800">Add Schedule Task</h2>
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="p-1 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
                                >
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>

                            {/* Content */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Task Name</label>
                                    <input
                                        name="name"
                                        required
                                        autoFocus
                                        disabled={isLoading}
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                                        placeholder="e.g. Foundation Work - Phase 1"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            Start Date
                                        </label>
                                        <input
                                            name="startDate"
                                            type="date"
                                            required
                                            disabled={isLoading}
                                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            End Date
                                        </label>
                                        <input
                                            name="endDate"
                                            type="date"
                                            required
                                            disabled={isLoading}
                                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 flex items-start gap-3">
                                    <div className="pt-0.5">
                                        <Flag className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-slate-800 cursor-pointer">
                                                Mark as Milestone Link?
                                            </label>
                                            <Toggle
                                                checked={isMilestone}
                                                onChange={() => setIsMilestone(!isMilestone)}
                                                size="sm"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Milestones are required for Budget Allocation.
                                        </p>
                                    </div>
                                </div>

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
                                        {isLoading ? 'Creating...' : 'Create Task'}
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
