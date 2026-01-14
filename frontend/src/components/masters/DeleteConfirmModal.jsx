import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';

/**
 * Confirmation modal for delete operations
 * Uses createPortal to render above all layout elements
 */
const DeleteConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Delete Record',
    message = 'Are you sure you want to delete this record? This action cannot be undone.',
    itemName = '',
    loading = false
}) => {
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
                        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[9999]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    >
                        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-neutral-700">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                        <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{title}</h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                                    disabled={loading}
                                >
                                    <X size={20} className="text-slate-500 dark:text-neutral-400" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <p className="text-slate-600 dark:text-neutral-300">{message}</p>
                                {itemName && (
                                    <div className="mt-3 p-3 bg-slate-50 dark:bg-neutral-800 rounded-lg border border-slate-200 dark:border-neutral-700">
                                        <p className="text-sm font-medium text-slate-700 dark:text-neutral-200">{itemName}</p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={onConfirm}
                                    disabled={loading}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin mr-2" />
                                            Deleting...
                                        </>
                                    ) : (
                                        'Delete'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};

export default DeleteConfirmModal;
