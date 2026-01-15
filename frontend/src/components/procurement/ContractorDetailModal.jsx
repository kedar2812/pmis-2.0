import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, MapPin, Phone, Mail, FileText } from 'lucide-react';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import { useModalClose } from '@/hooks/useModalClose';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const ContractorDetailModal = ({ isOpen, onClose, contractor, onUpdate }) => {
    useModalClose(isOpen, onClose);
    const { user } = useAuth();

    // Check if user is Admin (SPV_Official has accessLevel: Admin)
    const isAdmin = user?.role === 'SPV_Official';

    if (!isOpen || !contractor) return null;

    const handleStatusChange = async (newStatus) => {
        if (!isAdmin) return;

        try {
            await onUpdate(contractor.id, { status: newStatus ? 'Active' : 'Inactive' });
            toast.success(`Contractor marked as ${newStatus ? 'Active' : 'Inactive'}`);
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const isActive = contractor.status === 'Active' || !contractor.status; // Default to Active if undefined

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-800/50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-xl">
                                <Building2 size={28} />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{contractor.contractorName}</h2>
                                    {isAdmin && (
                                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-neutral-800 rounded-full border border-slate-200 dark:border-neutral-700">
                                            <span className={`text-xs font-semibold uppercase ${isActive ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-neutral-500'}`}>
                                                {isActive ? 'Active' : 'Inactive'}
                                            </span>
                                            <Switch
                                                checked={isActive}
                                                onChange={handleStatusChange}
                                                className={isActive ? 'bg-green-500' : 'bg-slate-300'}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    {!isAdmin && (
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {contractor.status || 'Active'}
                                        </span>
                                    )}
                                    <span className="text-slate-400 dark:text-neutral-500">•</span>
                                    <span className="text-sm text-slate-500 dark:text-neutral-400">{contractor.projects || 0} Active Projects</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-slate-400 dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-8 overflow-y-auto space-y-8">

                        {/* 1. Legal Identification */}
                        <section>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-neutral-800 pb-2 mb-4 flex items-center gap-2 uppercase tracking-wide">
                                <FileText size={16} className="text-slate-400 dark:text-neutral-500" /> Identity & Taxes
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-50 dark:bg-neutral-800 p-4 rounded-lg border border-slate-100 dark:border-neutral-700">
                                    <span className="text-xs text-slate-500 dark:text-neutral-400 uppercase font-bold block mb-1">PAN Number</span>
                                    <span className="font-mono text-slate-700 dark:text-neutral-300 font-medium text-lg tracking-wide">{contractor.panNo || 'N/A'}</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-neutral-800 p-4 rounded-lg border border-slate-100 dark:border-neutral-700">
                                    <span className="text-xs text-slate-500 dark:text-neutral-400 uppercase font-bold block mb-1">GSTIN</span>
                                    <span className="font-mono text-slate-700 dark:text-neutral-300 font-medium text-lg tracking-wide">{contractor.gstinNo || 'N/A'}</span>
                                </div>
                            </div>
                        </section>

                        {/* 2. Contact Information */}
                        <section>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-neutral-800 pb-2 mb-4 flex items-center gap-2 uppercase tracking-wide">
                                <Phone size={16} className="text-slate-400 dark:text-neutral-500" /> Contact Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-center gap-3 p-2">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                        <Mail size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-neutral-400 font-medium">Email Address</p>
                                        <p className="text-slate-900 dark:text-white">{contractor.email || 'N/A'} (Login ID)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-2">
                                    <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
                                        <Phone size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-neutral-400 font-medium">Mobile Number</p>
                                        <p className="text-slate-900 dark:text-white">{contractor.mobile || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 3. Address */}
                        <section>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-neutral-800 pb-2 mb-4 flex items-center gap-2 uppercase tracking-wide">
                                <MapPin size={16} className="text-slate-400 dark:text-neutral-500" /> Registered Address
                            </h3>
                            <div className="bg-slate-50 dark:bg-neutral-800 p-5 rounded-xl border border-slate-100 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 leading-relaxed">
                                {contractor.address ? (
                                    <p>{contractor.address}</p>
                                ) : (
                                    <div className="space-y-1">
                                        <p>{contractor.buildingNumber} {contractor.contractorStreet}</p>
                                        <p>{contractor.area}</p>
                                        <p>{contractor.city}, {contractor.state} - {contractor.zipCode}</p>
                                        <p>{contractor.country}</p>
                                    </div>
                                )}
                            </div>
                        </section>

                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/50 flex justify-end">
                        <Button onClick={onClose} variant="outline" className="dark:text-white dark:border-neutral-700 dark:hover:bg-neutral-700">Close Details</Button>
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};
