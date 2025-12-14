/**
 * EDMS Page - To be rebuilt
 * This is a placeholder awaiting new requirements.
 */
import { motion } from 'framer-motion';
import { FileText, Construction } from 'lucide-react';

const EDMS = () => {
    return (
        <div className="min-h-[80vh] flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-md"
            >
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center">
                    <Construction size={48} className="text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-3">
                    EDMS Under Reconstruction
                </h1>
                <p className="text-slate-600">
                    The Electronic Document Management System is being rebuilt from scratch
                    with improved functionality and a better user experience.
                </p>
                <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3 text-left">
                        <FileText size={20} className="text-slate-400" />
                        <div>
                            <p className="text-sm font-medium text-slate-700">Coming Soon</p>
                            <p className="text-xs text-slate-500">New document management features</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default EDMS;
