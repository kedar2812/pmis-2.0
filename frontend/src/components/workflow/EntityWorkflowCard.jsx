/**
 * Entity Workflow Card Component
 * 
 * A reusable component for document detail pages that:
 * - Shows current workflow status
 * - Displays available actions (Approve, Revert, Reject)
 * - Shows workflow history timeline
 * 
 * Usage:
 * <EntityWorkflowCard 
 *   entityType="RABill" 
 *   entityId={billId} 
 *   onActionComplete={() => refetch()} 
 * />
 */
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle, XCircle, RotateCcw, Clock, User,
    AlertTriangle, Loader2, History, ChevronDown,
    ChevronUp, MessageSquare, X
} from 'lucide-react';
import { workflowService, getStatusColor } from '@/api/services/workflowService';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';

// Remarks Modal Component
const RemarksModal = ({ isOpen, onClose, onSubmit, action, loading }) => {
    const [remarks, setRemarks] = useState('');
    const [targetStep, setTargetStep] = useState(1);

    const handleSubmit = () => {
        if (action === 'REVERT' && !remarks.trim()) {
            toast.error('Remarks are required for sending back');
            return;
        }
        onSubmit(remarks, action === 'REVERT' ? targetStep : null);
    };

    if (!isOpen) return null;

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-app-overlay backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md bg-app-card rounded-xl shadow-xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-app-subtle flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-app-heading">
                        {action === 'FORWARD' ? 'Approve & Forward' :
                            action === 'REVERT' ? 'Send Back' : 'Reject Workflow'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-app-surface rounded-full transition-colors"
                    >
                        <X size={20} className="text-app-muted" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {action === 'REVERT' && (
                        <div>
                            <label className="block text-sm font-medium text-app-text mb-1.5">
                                Send Back to Step
                            </label>
                            <select
                                value={targetStep}
                                onChange={(e) => setTargetStep(parseInt(e.target.value))}
                                className="w-full px-3 py-2.5 rounded-lg border border-app bg-app-input text-app-text text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:focus:ring-indigo-500/30 outline-none transition-all"
                            >
                                <option value={1}>Step 1 (Initial)</option>
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-app-text mb-1.5">
                            Remarks {(action === 'REVERT' || action === 'REJECT') && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder={
                                action === 'FORWARD' ? 'Optional comments...' :
                                    action === 'REVERT' ? 'Explain why this needs revision...' :
                                        'Explain rejection reason...'
                            }
                            rows={4}
                            className="w-full px-3 py-2.5 rounded-lg border border-app bg-app-input text-app-text text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:focus:ring-indigo-500/30 outline-none transition-all resize-none"
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-app-subtle flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || ((action === 'REVERT' || action === 'REJECT') && !remarks.trim())}
                        className={
                            action === 'FORWARD' ? 'bg-green-600 hover:bg-green-700' :
                                action === 'REVERT' ? 'bg-amber-600 hover:bg-amber-700' :
                                    'bg-red-600 hover:bg-red-700'
                        }
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin mr-2" />
                                Processing...
                            </>
                        ) : (
                            action === 'FORWARD' ? 'Approve' :
                                action === 'REVERT' ? 'Send Back' : 'Reject'
                        )}
                    </Button>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
};

// History Timeline Component
const WorkflowHistoryTimeline = ({ history }) => {
    if (!history || history.length === 0) {
        return (
            <div className="text-center py-4 text-app-muted text-sm">
                No workflow history available
            </div>
        );
    }

    const getActionColor = (action) => {
        switch (action) {
            case 'STARTED': return 'bg-blue-500';
            case 'FORWARD': return 'bg-green-500';
            case 'REVERT': return 'bg-amber-500';
            case 'REJECT': return 'bg-red-500';
            case 'COMPLETE': return 'bg-emerald-500';
            default: return 'bg-gray-500';
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'STARTED': return Clock;
            case 'FORWARD': return CheckCircle;
            case 'REVERT': return RotateCcw;
            case 'REJECT': return XCircle;
            case 'COMPLETE': return CheckCircle;
            default: return Clock;
        }
    };

    return (
        <div className="space-y-3">
            {history.map((entry, index) => {
                const Icon = getActionIcon(entry.action);
                return (
                    <div key={entry.id || index} className="flex gap-3">
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full ${getActionColor(entry.action)} flex items-center justify-center`}>
                                <Icon size={14} className="text-white" />
                            </div>
                            {index < history.length - 1 && (
                                <div className="w-0.5 flex-1 bg-app-subtle mt-2" />
                            )}
                        </div>
                        <div className="flex-1 pb-3">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-app-heading text-sm">
                                    {entry.action_display || entry.action}
                                </span>
                                {entry.step_label && (
                                    <span className="text-xs px-2 py-0.5 bg-app-surface rounded text-app-muted">
                                        {entry.step_label}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-app-muted">
                                <User size={12} />
                                <span>{entry.performed_by || 'System'}</span>
                                <span>•</span>
                                <span>{new Date(entry.entered_at).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}</span>
                            </div>
                            {entry.remarks && (
                                <div className="mt-2 p-2 bg-app-surface rounded-lg text-sm text-app-text">
                                    <MessageSquare size={12} className="inline mr-1 text-app-muted" />
                                    {entry.remarks}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// Main Component
const EntityWorkflowCard = ({ entityType, entityId, onActionComplete }) => {
    const [actions, setActions] = useState(null);
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [modalAction, setModalAction] = useState(null);

    const fetchData = useCallback(async () => {
        if (!entityType || !entityId) return;

        try {
            setLoading(true);
            const [actionsData, historyData] = await Promise.all([
                workflowService.getActionsForEntity(entityType, entityId),
                workflowService.getEntityHistory(entityType, entityId)
            ]);
            setActions(actionsData);
            setHistory(historyData);
        } catch (error) {
            console.error('Failed to fetch workflow data:', error);
        } finally {
            setLoading(false);
        }
    }, [entityType, entityId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAction = async (remarks, toStep) => {
        if (!modalAction) return;

        setActionLoading(true);
        try {
            const result = await workflowService.performEntityAction(
                entityType,
                entityId,
                modalAction,
                remarks,
                toStep
            );

            if (result?.success) {
                toast.success(result.message || 'Action completed successfully');
                setModalAction(null);
                fetchData();
                onActionComplete?.();
            } else {
                toast.error(result?.error || 'Action failed');
            }
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message || 'Action failed';
            toast.error(errorMsg);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-app-card border border-app-subtle rounded-xl p-4">
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                </div>
            </div>
        );
    }

    if (!actions?.has_workflow) {
        return (
            <div className="bg-app-card border border-app-subtle rounded-xl p-4">
                <div className="text-center py-4">
                    <History size={32} className="mx-auto mb-2 text-app-muted opacity-50" />
                    <p className="text-sm text-app-muted">No active workflow</p>
                </div>
            </div>
        );
    }

    const statusColors = getStatusColor(actions.workflow_status);

    return (
        <>
            <div className="bg-app-card border border-app-subtle rounded-xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-app-subtle">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-app-heading flex items-center gap-2">
                            <History size={18} className="text-primary-500" />
                            Workflow Status
                        </h3>
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors.bg} ${statusColors.text} ${statusColors.dark}`}>
                            {actions.workflow_status?.replace('_', ' ')}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-app-muted">
                        <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {actions.current_step_label || 'Pending'}
                        </span>
                        <span className="flex items-center gap-1">
                            <User size={14} />
                            {actions.required_role || 'N/A'}
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                {(actions.can_approve || actions.can_revert || actions.can_reject) && (
                    <div className="p-4 border-b border-app-subtle bg-app-surface/50">
                        <p className="text-xs text-app-muted mb-3">Available Actions:</p>
                        <div className="flex flex-wrap gap-2">
                            {actions.can_approve && (
                                <Button
                                    onClick={() => setModalAction('FORWARD')}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    size="sm"
                                >
                                    <CheckCircle size={16} className="mr-1.5" />
                                    Approve
                                </Button>
                            )}
                            {actions.can_revert && (
                                <Button
                                    onClick={() => setModalAction('REVERT')}
                                    className="bg-amber-600 hover:bg-amber-700 text-white"
                                    size="sm"
                                >
                                    <RotateCcw size={16} className="mr-1.5" />
                                    Send Back
                                </Button>
                            )}
                            {actions.can_reject && (
                                <Button
                                    onClick={() => setModalAction('REJECT')}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    size="sm"
                                >
                                    <XCircle size={16} className="mr-1.5" />
                                    Reject
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* History Toggle */}
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full p-3 flex items-center justify-between text-sm text-app-muted hover:bg-app-surface transition-colors"
                >
                    <span className="flex items-center gap-2">
                        <History size={16} />
                        Workflow History
                    </span>
                    {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {/* History Timeline */}
                <AnimatePresence>
                    {showHistory && history?.has_history && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-app-subtle"
                        >
                            <div className="p-4 max-h-80 overflow-y-auto">
                                {history.workflows?.[0]?.history && (
                                    <WorkflowHistoryTimeline history={history.workflows[0].history} />
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Remarks Modal */}
            <AnimatePresence>
                {modalAction && (
                    <RemarksModal
                        isOpen={!!modalAction}
                        onClose={() => setModalAction(null)}
                        onSubmit={handleAction}
                        action={modalAction}
                        loading={actionLoading}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default EntityWorkflowCard;
