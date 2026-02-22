/**
 * Workflow Action Cards Component
 * 
 * Displays pending workflow approvals for the current user
 * with quick action buttons (Approve, Revert, Reject).
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle, XCircle, RotateCcw, Clock, User,
    ChevronRight, AlertTriangle, Loader2, Workflow,
    FileText, IndianRupee, Shield, Package
} from 'lucide-react';
import { workflowService, getStatusColor } from '@/api/services/workflowService';
import { toast } from 'sonner';

const EntityIcon = ({ entityType }) => {
    const icons = {
        RABill: IndianRupee,
        Tender: Package,
        Contract: FileText,
        Risk: AlertTriangle,
        Design: FileText,
        Variation: Shield
    };
    const Icon = icons[entityType] || FileText;
    return <Icon size={18} />;
};

const WorkflowActionCard = ({ instance, onAction }) => {
    const [loading, setLoading] = useState(null);
    const statusColors = getStatusColor(instance.status);

    const handleAction = async (action) => {
        setLoading(action);
        try {
            let result;
            if (action === 'forward') {
                result = await workflowService.forward(instance.id);
            } else if (action === 'reject') {
                const remarks = prompt('Please provide rejection reason:');
                if (!remarks) {
                    setLoading(null);
                    return;
                }
                result = await workflowService.reject(instance.id, remarks);
            }

            if (result?.success) {
                toast.success(result.message || 'Action completed');
                onAction?.();
            } else {
                toast.error(result?.error || 'Action failed');
            }
        } catch (error) {
            toast.error(error.message || 'Action failed');
        } finally {
            setLoading(null);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="p-4 bg-app-surface border border-app-subtle rounded-xl hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                        <EntityIcon entityType={instance.entity_type} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-app-heading truncate">
                                {instance.entity_type} #{instance.entity_id?.slice(0, 8)}
                            </h4>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors.bg} ${statusColors.text} ${statusColors.dark}`}>
                                {instance.status_display || instance.status}
                            </span>
                        </div>
                        <p className="text-sm text-app-muted truncate">
                            {instance.template_name}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-app-muted">
                            <span className="flex items-center gap-1">
                                <Clock size={12} />
                                Step {instance.current_step_label || 'N/A'}
                            </span>
                            <span className="flex items-center gap-1">
                                <User size={12} />
                                {instance.current_step_role || 'Pending'}
                            </span>
                            {instance.is_overdue && (
                                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                    <AlertTriangle size={12} />
                                    SLA Breach
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Progress Ring */}
                <div className="flex-shrink-0">
                    <div className="relative w-12 h-12">
                        <svg className="w-12 h-12 -rotate-90">
                            <circle
                                cx="24"
                                cy="24"
                                r="20"
                                fill="none"
                                stroke="currentColor"
                                className="text-gray-200 dark:text-gray-700"
                                strokeWidth="4"
                            />
                            <circle
                                cx="24"
                                cy="24"
                                r="20"
                                fill="none"
                                stroke="currentColor"
                                className="text-primary-500"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray={`${(instance.progress_percent || 0) * 1.26} 126`}
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-app-heading">
                            {instance.progress_percent || 0}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-app-subtle">
                <button
                    onClick={() => handleAction('forward')}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                    {loading === 'forward' ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <CheckCircle size={16} />
                    )}
                    Approve
                </button>
                <button
                    onClick={() => handleAction('reject')}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                    {loading === 'reject' ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <XCircle size={16} />
                    )}
                </button>
            </div>
        </motion.div>
    );
};

const WorkflowActionCards = ({ maxItems = 5 }) => {
    const [pendingItems, setPendingItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPending = async () => {
        try {
            setLoading(true);
            const data = await workflowService.getPendingForUser();
            setPendingItems(data.results || []);
        } catch (error) {
            console.error('Failed to fetch pending workflows:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            </div>
        );
    }

    if (pendingItems.length === 0) {
        return (
            <div className="text-center py-8 text-app-muted">
                <CheckCircle size={40} className="mx-auto mb-2 text-green-500 opacity-50" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm">No pending approvals</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <AnimatePresence mode="popLayout">
                {pendingItems.slice(0, maxItems).map((instance) => (
                    <WorkflowActionCard
                        key={instance.id}
                        instance={instance}
                        onAction={fetchPending}
                    />
                ))}
            </AnimatePresence>

            {pendingItems.length > maxItems && (
                <a
                    href="/approvals"
                    className="flex items-center justify-center gap-2 py-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                    View all {pendingItems.length} pending items
                    <ChevronRight size={16} />
                </a>
            )}
        </div>
    );
};

export { WorkflowActionCard, WorkflowActionCards };
export default WorkflowActionCards;
