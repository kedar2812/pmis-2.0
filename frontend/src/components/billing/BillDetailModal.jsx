/**
 * Bill Detail Modal
 * 
 * Modal to view bill details and manage workflow approvals.
 * Integrates EntityWorkflowCard for workflow actions.
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, FileText, Calendar, Building2, User, IndianRupee,
    Printer, Download, CheckCircle2, Clock, Hash
} from 'lucide-react';
import Button from '@/components/ui/Button';
import EntityWorkflowCard from '@/components/workflow/EntityWorkflowCard';

const InfoRow = ({ icon: Icon, label, value, highlight = false }) => (
    <div className="flex items-start gap-3 py-2">
        <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
            <Icon size={16} className="text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1">
            <p className="text-xs text-app-muted">{label}</p>
            <p className={`text-sm font-medium ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-app-heading'}`}>
                {value || 'N/A'}
            </p>
        </div>
    </div>
);

const BillDetailModal = ({ isOpen, onClose, bill, onBillUpdate }) => {
    if (!isOpen || !bill) return null;

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value || 0);
    };

    const getStatusColor = (status) => {
        const colors = {
            'DRAFT': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
            'SUBMITTED': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            'PENDING': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
            'IN_PROGRESS': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            'APPROVED': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
            'REJECTED': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
            'PAID': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        };
        return colors[status?.toUpperCase()] || colors['DRAFT'];
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-app-overlay backdrop-blur-sm p-4 overflow-y-auto"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-3xl my-8 bg-app-card rounded-xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-app-subtle bg-gradient-to-r from-primary-600 to-primary-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                        <FileText className="text-white" size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">
                                            Bill #{bill.billNo}
                                        </h2>
                                        <p className="text-sm text-white/70">{bill.projectName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(bill.status)}`}>
                                        {bill.status?.replace('_', ' ')}
                                    </span>
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <X size={20} className="text-white" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Column: Bill Details */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-app-heading flex items-center gap-2 border-b border-app-subtle pb-2">
                                        <FileText size={16} className="text-primary-500" />
                                        Bill Information
                                    </h3>

                                    <div className="grid grid-cols-2 gap-x-4">
                                        <InfoRow icon={Hash} label="Bill Number" value={bill.billNo} />
                                        <InfoRow icon={Calendar} label="Submission Date" value={bill.submissionDate} />
                                        <InfoRow icon={Building2} label="Project" value={bill.projectName} />
                                        <InfoRow icon={User} label="Contractor" value={bill.contractorName} />
                                    </div>

                                    <h3 className="text-sm font-semibold text-app-heading flex items-center gap-2 border-b border-app-subtle pb-2 mt-6">
                                        <IndianRupee size={16} className="text-emerald-500" />
                                        Financial Summary
                                    </h3>

                                    <div className="bg-app-surface rounded-xl p-4 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-app-muted">Gross Amount</span>
                                            <span className="font-medium text-app-heading">{formatCurrency(bill.grossAmount)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-app-muted">GST Amount</span>
                                            <span className="font-medium text-app-heading">{formatCurrency(bill.gstAmount)}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-t border-app-subtle pt-2">
                                            <span className="text-sm text-app-muted">Total Amount</span>
                                            <span className="font-semibold text-app-heading">{formatCurrency(bill.totalAmount)}</span>
                                        </div>

                                        <div className="border-t border-dashed border-app-subtle pt-3 space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-app-muted">TDS Deduction</span>
                                                <span className="text-red-600">- {formatCurrency(bill.tdsAmount)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-app-muted">Labour Cess</span>
                                                <span className="text-red-600">- {formatCurrency(bill.labourCessAmount)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-app-muted">Retention</span>
                                                <span className="text-red-600">- {formatCurrency(bill.retentionAmount)}</span>
                                            </div>
                                        </div>

                                        <div className="border-t border-app-subtle pt-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-base font-semibold text-app-heading">Net Payable</span>
                                                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                                    {formatCurrency(bill.netPayable)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Workflow Card */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-app-heading flex items-center gap-2 border-b border-app-subtle pb-2">
                                        <CheckCircle2 size={16} className="text-blue-500" />
                                        Approval Workflow
                                    </h3>

                                    <EntityWorkflowCard
                                        entityType="RABill"
                                        entityId={bill.id}
                                        onActionComplete={onBillUpdate}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-app-subtle bg-app-surface flex justify-end gap-3">
                            <Button variant="outline" onClick={onClose}>
                                Close
                            </Button>
                            <Button variant="outline" className="gap-2">
                                <Printer size={16} />
                                Print
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default BillDetailModal;
