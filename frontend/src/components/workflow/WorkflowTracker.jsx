import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    CheckCircle2, Clock, XCircle, AlertCircle,
    ChevronRight, User, FileText, ArrowRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * WorkflowTracker Component
 * 
 * Visualizes document approval workflow with step-by-step progress.
 * Shows current status, pending approvers, and completed steps.
 */
const WorkflowTracker = ({
    steps = [],
    currentStep = 0,
    variant = 'horizontal', // 'horizontal' | 'vertical'
    size = 'default', // 'small' | 'default' | 'large'
}) => {
    const getStepStatus = (index) => {
        if (index < currentStep) return 'completed';
        if (index === currentStep) return 'current';
        return 'pending';
    };

    const getStepIcon = (step, status) => {
        if (status === 'completed') {
            return <CheckCircle2 className="w-full h-full text-green-600" />;
        }
        if (status === 'current') {
            if (step.status === 'rejected') {
                return <XCircle className="w-full h-full text-red-600" />;
            }
            return <Clock className="w-full h-full text-amber-600 animate-pulse" />;
        }
        return <div className="w-full h-full rounded-full bg-slate-200" />;
    };

    const sizeClasses = {
        small: { icon: 'w-6 h-6', text: 'text-xs', gap: 'gap-2' },
        default: { icon: 'w-8 h-8', text: 'text-sm', gap: 'gap-4' },
        large: { icon: 'w-10 h-10', text: 'text-base', gap: 'gap-6' },
    };

    const sizes = sizeClasses[size] || sizeClasses.default;

    if (variant === 'vertical') {
        return (
            <div className="space-y-4">
                {steps.map((step, index) => {
                    const status = getStepStatus(index);
                    const isLast = index === steps.length - 1;

                    return (
                        <div key={step.id || index} className="relative">
                            {/* Connector line */}
                            {!isLast && (
                                <div
                                    className={`absolute left-4 top-10 w-0.5 h-8 ${status === 'completed' ? 'bg-green-500' : 'bg-slate-200'
                                        }`}
                                />
                            )}

                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`flex items-start ${sizes.gap}`}
                            >
                                {/* Icon */}
                                <div className={`${sizes.icon} flex-shrink-0`}>
                                    {getStepIcon(step, status)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className={`font-medium ${sizes.text} ${status === 'pending' ? 'text-slate-400' : 'text-slate-800'
                                        }`}>
                                        {step.title}
                                    </p>
                                    {step.assignee && (
                                        <p className={`${sizes.text} text-slate-500 flex items-center gap-1`}>
                                            <User size={12} /> {step.assignee}
                                        </p>
                                    )}
                                    {step.completedAt && status === 'completed' && (
                                        <p className="text-xs text-slate-400">
                                            {formatDistanceToNow(new Date(step.completedAt), { addSuffix: true })}
                                        </p>
                                    )}
                                    {step.comment && (
                                        <p className="text-xs text-slate-500 mt-1 italic">"{step.comment}"</p>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Horizontal variant
    return (
        <div className="flex items-center justify-between overflow-x-auto pb-2">
            {steps.map((step, index) => {
                const status = getStepStatus(index);
                const isLast = index === steps.length - 1;

                return (
                    <div key={step.id || index} className="flex items-center flex-shrink-0">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex flex-col items-center"
                        >
                            {/* Icon */}
                            <div className={`${sizes.icon} mb-2`}>
                                {getStepIcon(step, status)}
                            </div>

                            {/* Label */}
                            <p className={`${sizes.text} text-center font-medium ${status === 'pending' ? 'text-slate-400' : 'text-slate-800'
                                }`}>
                                {step.title}
                            </p>

                            {step.assignee && (
                                <p className="text-xs text-slate-500 text-center">{step.assignee}</p>
                            )}
                        </motion.div>

                        {/* Connector */}
                        {!isLast && (
                            <div className={`mx-3 flex-shrink-0 ${status === 'completed' ? 'text-green-500' : 'text-slate-300'
                                }`}>
                                <ChevronRight size={20} />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

/**
 * DocumentApprovalChain Component
 * 
 * Shows the full approval workflow for a document with status badges.
 */
export const DocumentApprovalChain = ({ document }) => {
    if (!document) return null;

    // Generate workflow steps from document metadata
    const workflowSteps = document.approvalChain || [
        { id: 1, title: 'Submitted', assignee: document.uploadedBy, status: 'completed' },
        { id: 2, title: 'Technical Review', assignee: 'PMNC Team', status: document.status === 'approved' ? 'completed' : 'current' },
        { id: 3, title: 'Final Approval', assignee: 'SPV Official', status: 'pending' },
    ];

    const getCurrentStep = () => {
        const currentIdx = workflowSteps.findIndex(s => s.status === 'current');
        return currentIdx >= 0 ? currentIdx : workflowSteps.length;
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary-600" />
                <h4 className="font-semibold text-slate-800">Approval Workflow</h4>
            </div>

            <WorkflowTracker
                steps={workflowSteps}
                currentStep={getCurrentStep()}
                variant="vertical"
                size="small"
            />
        </div>
    );
};

/**
 * WorkflowStatusBadge Component
 * 
 * Compact status badge for workflow items.
 */
export const WorkflowStatusBadge = ({ status }) => {
    const statusConfig = {
        draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600', icon: FileText },
        pending: { label: 'Pending Review', color: 'bg-amber-100 text-amber-700', icon: Clock },
        under_review: { label: 'Under Review', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
        approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
        rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
        revision_required: { label: 'Revision Required', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
            <Icon size={12} />
            {config.label}
        </span>
    );
};

export default WorkflowTracker;
