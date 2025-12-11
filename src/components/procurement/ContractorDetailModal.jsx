import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, MapPin, Phone, Mail, FileText, BadgeCheck } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useModalClose } from '@/hooks/useModalClose';

export const ContractorDetailModal = ({ isOpen, onClose, contractor }) => {
    useModalClose(isOpen, onClose);

    if (!isOpen || !contractor) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[50] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary-100 text-primary-700 rounded-xl">
                                <Building2 size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{contractor.contractorName}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${contractor.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                                        }`}>
                                        {contractor.status || 'Active'}
                                    </span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-sm text-slate-500">{contractor.projects || 0} Active Projects</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-8 overflow-y-auto space-y-8">

                        {/* 1. Legal Identification */}
                        <section>
                            <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 mb-4 flex items-center gap-2 uppercase tracking-wide">
                                <FileText size={16} className="text-slate-400" /> Identity & Taxes
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <span className="text-xs text-slate-500 uppercase font-bold block mb-1">PAN Number</span>
                                    <span className="font-mono text-slate-700 font-medium text-lg tracking-wide">{contractor.panNo || 'N/A'}</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <span className="text-xs text-slate-500 uppercase font-bold block mb-1">GSTIN</span>
                                    <span className="font-mono text-slate-700 font-medium text-lg tracking-wide">{contractor.gstinNo || 'N/A'}</span>
                                </div>
                            </div>
                        </section>

                        {/* 2. Contact Information */}
                        <section>
                            <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 mb-4 flex items-center gap-2 uppercase tracking-wide">
                                <Phone size={16} className="text-slate-400" /> Contact Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-center gap-3 p-2">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <Mail size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium">Email Address</p>
                                        <p className="text-slate-900">{contractor.email || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-2">
                                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                        <Phone size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium">Mobile Number</p>
                                        <p className="text-slate-900">{contractor.mobile || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 3. Address */}
                        <section>
                            <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 mb-4 flex items-center gap-2 uppercase tracking-wide">
                                <MapPin size={16} className="text-slate-400" /> Registered Address
                            </h3>
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 text-slate-700 leading-relaxed">
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
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                        <Button onClick={onClose} variant="outline">Close Details</Button>
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};
