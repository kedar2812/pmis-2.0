import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';

/**
 * StatusBadge - Interactive status indicator with confirmation modal
 * 
 * @param {string} status - Current status value (e.g., 'ACTIVE', 'DISABLED')
 * @param {function} onToggle - Async function(newStatus) to update status
 * @param {string} entityName - Name of the entity being modified (for modal text)
 * @param {string} activeValue - Value representing active state (default: 'ACTIVE')
 * @param {string} inactiveValue - Value representing inactive state (default: 'DISABLED')
 * @param {object} customLabels - Map of status values to display labels
 * @param {object} customStyles - Map of status values to tailwind classes
 * @param {boolean} readOnly - If true, disables interaction
 */
const StatusBadge = ({
    status,
    onToggle,
    entityName = 'this item',
    activeValue = 'ACTIVE',
    inactiveValue = 'DISABLED',
    customLabels = {},
    customStyles = {},
    readOnly = false
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Normalize status to uppercase for consistent key lookups if needed, 
    // but keep original for values
    const normalizedStatus = String(status).toUpperCase();
    const isActive = String(status) === activeValue;

    // Determine next status
    const nextStatus = isActive ? inactiveValue : activeValue;

    // Default labels
    const labels = {
        [activeValue]: 'Active',
        [inactiveValue]: 'Inactive',
        ...customLabels
    };

    // Default styles - Removed specific hover:bg colors to use generic brightness filter
    const styles = {
        [activeValue]: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
        [inactiveValue]: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
        'PENDING': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
        ...customStyles
    };

    // Get current display values
    const displayLabel = labels[status] || status;
    const badgeStyle = styles[status] || styles[isActive ? activeValue : inactiveValue] || 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700';

    const handleConfirm = async () => {
        setIsUpdating(true);
        try {
            await onToggle(nextStatus);
            setIsModalOpen(false);
        } catch (error) {
            console.error('Status toggle failed:', error);
            // Error handling usually done in parent, but we ensure modal doesn't stick
        } finally {
            setIsUpdating(false);
            setIsModalOpen(false);
        }
    };

    if (readOnly) {
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeStyle} cursor-default`}>
                {displayLabel}
            </span>
        );
    }

    return (
        <>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsModalOpen(true);
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all duration-200 ${badgeStyle} cursor-pointer hover:shadow-md hover:brightness-95 active:scale-95`}
                title={`Click to mark as ${labels[nextStatus] || nextStatus}`}
            >
                <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    {displayLabel}
                </div>
            </button>

            {/* Confirmation Modal Portal */}
            {isModalOpen && createPortal(
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
                        onClick={() => !isUpdating && setIsModalOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl dark:shadow-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-full flex-shrink-0 ${isActive ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                                        <AlertCircle size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                            {isActive ? 'Deactivate' : 'Activate'} {entityName}?
                                        </h3>
                                        <p className="text-slate-500 dark:text-neutral-400 text-sm mt-1">
                                            Are you sure you want to declare <strong>{entityName}</strong> as <strong>{labels[nextStatus] || nextStatus}</strong>?
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 flex gap-3 justify-end">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setIsModalOpen(false)}
                                        disabled={isUpdating}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleConfirm}
                                        disabled={isUpdating}
                                        className={isActive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
                                    >
                                        {isUpdating ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin mr-2" />
                                                Updating...
                                            </>
                                        ) : (
                                            isActive ? 'Deactivate' : 'Activate'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </>
    );
};

export default StatusBadge;
