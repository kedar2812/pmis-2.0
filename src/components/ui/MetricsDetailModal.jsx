import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Download, ExternalLink } from 'lucide-react';
import { createPortal } from 'react-dom';

const MetricsDetailModal = ({ isOpen, onClose, title, description, items, documents }) => {
    if (!isOpen) return null;

    // Handle Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    // Render using portal to escape parent stacking contexts
    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-2xl bg-white/90 glass-panel rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[85vh]"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-200/50 bg-white/50">
                        <h3 className="text-lg sm:text-xl font-bold text-slate-800 bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                            {title}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-red-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6 sm:space-y-8">
                        <div>
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Overview</h4>
                            <p className="text-slate-600 leading-relaxed text-base sm:text-lg">
                                {description}
                            </p>
                        </div>

                        {/* Documents Section */}
                        {documents && documents.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <FileText size={16} /> Related Documents
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {documents.map((doc, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded border border-slate-200 text-red-500">
                                                    <FileText size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-700 text-sm group-hover:text-indigo-700">{doc.name}</p>
                                                    <p className="text-xs text-slate-400">{doc.date || 'Today'}</p>
                                                </div>
                                            </div>
                                            <Download size={16} className="text-slate-400 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {items && items.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Detailed Breakdown</h4>
                                <div className="space-y-2">
                                    {items.map((item, index) => (
                                        <div
                                            key={index}
                                            onClick={item.onClick}
                                            className={`flex justify-between items-center p-3 bg-white/60 rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors ${item.onClick ? 'cursor-pointer hover:bg-indigo-50 hover:shadow-sm' : ''}`}
                                        >
                                            <span className={`font-medium ${item.onClick ? 'text-indigo-700' : 'text-slate-700'}`}>{item.label}</span>
                                            <span className="text-slate-900 font-semibold">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-slate-50/50 border-t border-slate-200/50 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium text-sm transition-all shadow-sm"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};

export default MetricsDetailModal;
