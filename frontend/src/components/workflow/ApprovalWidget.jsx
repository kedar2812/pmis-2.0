import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import workflowService from '@/api/services/workflowService';
import {
    CheckCircle,
    XCircle,
    RotateCcw,
    Clock,
    User,
    FileText,
    AlertCircle
} from 'lucide-react';

const ApprovalWidget = ({ entityType, entityId, onLockStatusChange }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State from backend
    const [workflowData, setWorkflowData] = useState(null);
    const [history, setHistory] = useState([]);

    // Form State
    const [actionRemarks, setActionRemarks] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (entityType && entityId) {
            fetchWorkflowState();
        }
    }, [entityType, entityId]);

    const fetchWorkflowState = async () => {
        try {
            setLoading(true);
            setError(null);

            const [actionsRes, historyRes] = await Promise.all([
                workflowService.getActionsForEntity(entityType, entityId),
                workflowService.getEntityHistory(entityType, entityId) // Using explicit path matching backend method
            ]);

            setWorkflowData(actionsRes);

            if (historyRes.has_history && historyRes.workflows.length > 0) {
                // Get the latest workflow history timeline entries
                setHistory(historyRes.workflows[0].history || []);
            }

            // CRITICAL: Determine Form Locking
            // Rule: If an active workflow exists, the form is locked for ALL users 
            // EXCEPT the person currently holding the 'can_approve' role.
            if (actionsRes.has_workflow &&
                ['PENDING', 'IN_PROGRESS', 'REVERTED'].includes(actionsRes.workflow_status)) {

                // If the current user CAN act on it, they might need to edit. But typically, 
                // e-Office rules dictate that even approvers can only append remarks, not edit the payload.
                // For PMIS, we lock it completely once it's in the pipeline unless explicit.
                const shouldLockForm = !actionsRes.can_approve;

                if (onLockStatusChange) {
                    onLockStatusChange(shouldLockForm);
                }
            } else {
                // Not in an active workflow, form is unlocked mapping
                if (onLockStatusChange) onLockStatusChange(false);
            }

        } catch (err) {
            console.error("Error fetching Approval Widget state:", err);
            setError("Failed to load workflow state.");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (actionType, toStep = null) => {
        if (workflowData.remarks_required && !actionRemarks.trim()) {
            setError("Remarks are mandatory for this action.");
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);

            await workflowService.performEntityAction(
                entityType,
                entityId,
                actionType,
                actionRemarks,
                toStep
            );

            setActionRemarks('');
            await fetchWorkflowState(); // Refresh widget state

        } catch (err) {
            console.error(`Workflow ${actionType} failed:`, err);
            setError(err.response?.data?.error || `Failed to ${actionType.toLowerCase()}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-app-card border border-app-border rounded-xl p-6 flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (error && !workflowData) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                <AlertCircle className="w-5 h-5 mb-2" />
                <p className="text-sm">{error}</p>
                <button
                    onClick={fetchWorkflowState}
                    className="mt-3 text-sm font-medium underline"
                >
                    Retry
                </button>
            </div>
        );
    }

    // If no workflow is attached to this entity
    if (!workflowData?.has_workflow && history.length === 0) {
        return (
            <div className="bg-app-card border border-app-border rounded-xl p-6 text-center">
                <Shield className="w-8 h-8 mx-auto text-app-muted mb-3 opacity-50" />
                <h3 className="text-sm font-medium text-app-heading">No Active Workflow</h3>
                <p className="text-xs text-app-muted mt-1">This document is not currently in an approval pipeline.</p>
            </div>
        );
    }

    return (
        <div className="bg-app-card border border-app-border rounded-xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-app-border flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-app-heading flex items-center gap-2">
                        <Workflow className="w-4 h-4 text-primary-600" />
                        Approval Status
                    </h3>
                    <p className="text-xs text-app-muted mt-0.5">
                        {workflowData.has_workflow ? 'Active in Pipeline' : 'Workflow Completed'}
                    </p>
                </div>

                {/* Status Badge */}
                {workflowData.has_workflow && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shadow-sm border ${workflowData.workflow_status === 'REVERTED' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:border-amber-800 dark:text-amber-400' :
                            'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-400'
                        }`}>
                        {workflowData.current_step_label}
                    </span>
                )}
            </div>

            {/* Action Area (Only visible if user has rights to act) */}
            {workflowData.has_workflow && workflowData.can_approve && (
                <div className="p-4 border-b border-app-border bg-primary-50/30 dark:bg-primary-900/10">

                    {error && (
                        <div className="mb-4 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 p-2.5 rounded-lg border border-red-100 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-app-heading mb-1.5 flex justify-between">
                            Your Remarks
                            {workflowData.remarks_required && <span className="text-red-500 text-xs">* Required</span>}
                        </label>
                        <textarea
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow resize-y min-h-[100px]"
                            placeholder="Add your notes or justification here..."
                            value={actionRemarks}
                            onChange={(e) => setActionRemarks(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {workflowData.can_revert && (
                            <button
                                onClick={() => handleAction('REVERT', Math.max(1, workflowData.current_step_sequence - 1))}
                                disabled={isSubmitting}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded-lg font-medium text-sm transition-colors border border-amber-200 dark:border-amber-800/50"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Return
                            </button>
                        )}

                        {workflowData.can_reject && (
                            <button
                                onClick={() => handleAction('REJECT')}
                                disabled={isSubmitting}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg font-medium text-sm transition-colors border border-red-200 dark:border-red-800/50"
                            >
                                <XCircle className="w-4 h-4" />
                                Reject
                            </button>
                        )}

                        <button
                            onClick={() => handleAction('FORWARD')}
                            disabled={isSubmitting}
                            className={`flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-lg font-medium text-sm transition-colors ${!workflowData.can_revert && !workflowData.can_reject ? 'col-span-2' : ''}`}
                        >
                            <CheckCircle className="w-4 h-4" />
                            {isSubmitting ? 'Processing...' : 'Approve'}
                        </button>
                    </div>
                </div>
            )}

            {/* Lock Notification Area */}
            {workflowData.has_workflow && !workflowData.can_approve && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 text-xs border-b border-app-border flex items-start gap-2">
                    <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p>This form is locked. It is currently awaiting action by: <strong className="text-slate-700 dark:text-slate-300">{workflowData.required_role}</strong>.</p>
                </div>
            )}

            {/* Audit Timeline */}
            <div className="p-4 flex-1">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-1">Audit Trail</h4>

                {history.length === 0 ? (
                    <p className="text-sm text-app-muted italic text-center py-4">No actions recorded yet.</p>
                ) : (
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">

                        {history.map((log, index) => {
                            // Determine visual styling based on action
                            const isReject = log.action === 'REJECT';
                            const isRevert = log.action === 'REVERT';
                            const isComplete = log.action === 'COMPLETE';
                            const isDelegate = log.action === 'DELEGATE';

                            const dotColor = isComplete ? 'bg-emerald-500' :
                                isReject ? 'bg-red-500' :
                                    isRevert ? 'bg-amber-500' :
                                        isDelegate ? 'bg-purple-500' : 'bg-primary-500';

                            return (
                                <div key={log.id || index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    {/* Timeline Dot */}
                                    <div className={`flex items-center justify-center w-3 h-3 rounded-full border-4 box-content ${dotColor} border-white dark:border-slate-900 shadow absolute left-5 md:left-1/2 -mt-1.5 md:-mt-1.5 -translate-x-1/2`}></div>

                                    {/* Content Card */}
                                    <div className="w-full ml-10 p-3 bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                                        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-1 mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-full">
                                                    <User className="w-3 h-3 text-slate-500" />
                                                </div>
                                                <h4 className="text-sm font-semibold text-app-heading">{log.performed_by?.name || log.performed_by?.username || 'System'}</h4>
                                            </div>
                                            <time className="text-xs text-app-muted flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(log.entered_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </time>
                                        </div>

                                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            Action: <span className="text-slate-800 dark:text-slate-200 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] tracking-wide uppercase">{log.action_display}</span>
                                        </p>

                                        {log.remarks && (
                                            <div className="mt-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded border border-slate-100 dark:border-slate-800 whitespace-pre-line break-words flex items-start gap-2">
                                                <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                                <span className="italic">"{log.remarks}"</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

// Also import Workflow icon at top
import { Shield, Workflow } from 'lucide-react';

export default ApprovalWidget;
