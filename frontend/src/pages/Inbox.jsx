import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertCircle, CheckCircle2, ChevronRight, Filter, FileText, FileSpreadsheet, GitBranch, Eye, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import workflowService, { formatProgress, isOverdue, getStatusColor } from '@/api/services/workflowService';
import client from '@/api/client';
import financeService from '@/services/financeService';
import DocumentDetailModal from '@/components/edms/DocumentDetailModal';
import ThreadDetail from '@/components/communications/ThreadDetail';

const Inbox = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Unified State
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // all, urgent, normal
    const [processingId, setProcessingId] = useState(null);

    // Modal States
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [discussDocument, setDiscussDocument] = useState(null);

    useEffect(() => {
        fetchAllTasks();
    }, []);

    const fetchAllTasks = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch all three streams concurrently
            const [workflowRes, edmsRes, boqRes] = await Promise.allSettled([
                workflowService.getPendingForUser(),
                client.get('/edms/approvals/pending/'),
                financeService.getPendingApprovals()
            ]);

            let unifiedTasks = [];

            // 1. Process Workflow Tasks
            if (workflowRes.status === 'fulfilled') {
                const wTasks = workflowRes.value.results || [];
                unifiedTasks = [...unifiedTasks, ...wTasks.map(t => ({
                    id: `workflow-${t.id}`,
                    source: 'WORKFLOW',
                    original: t,
                    title: `${t.entity_type} #${t.entity_id.substring(0, 8)}`,
                    subtitle: t.template?.name || 'Workflow Instance',
                    initiatedBy: t.started_by?.first_name || t.started_by?.username || 'System',
                    actionRequired: t.current_step?.action_label || t.current_step?.action_type || 'Action',
                    urgency: calculateWorkflowUrgency(t),
                    icon: GitBranch,
                    date: t.started_at
                }))];
            } else {
                console.error("Workflow fetch failed:", workflowRes.reason);
            }

            // 2. Process EDMS Tasks
            if (edmsRes.status === 'fulfilled') {
                const edmsTasks = Array.isArray(edmsRes.value.data) ? edmsRes.value.data : (edmsRes.value.data?.results || []);
                unifiedTasks = [...unifiedTasks, ...edmsTasks.map(d => {
                    const statusConfig = getEdmsStatusConfig(d.status);
                    return {
                        id: `edms-${d.id}`,
                        source: 'EDMS',
                        original: d,
                        title: d.title,
                        subtitle: `${d.document_type?.replace('_', ' ')} v${d.current_version_number || 1}`,
                        initiatedBy: d.uploaded_by_name || 'System',
                        actionRequired: statusConfig.action,
                        urgency: { color: 'amber', text: statusConfig.label, isUrgent: d.status === 'REVISION_REQUESTED' },
                        icon: FileText,
                        date: d.created_at
                    };
                })];
            } else {
                console.error("EDMS fetch failed:", edmsRes.reason);
            }

            // 3. Process BOQ Tasks
            if (boqRes.status === 'fulfilled') {
                const boqTasks = boqRes.value || [];
                unifiedTasks = [...unifiedTasks, ...boqTasks.map(b => {
                    const isFreeze = b.request_type === 'BOQ_FREEZE';
                    return {
                        id: `boq-${b.id}`,
                        source: 'BOQ',
                        original: b,
                        title: b.title || 'BOQ Action',
                        subtitle: b.project_name || 'Project BOQ',
                        initiatedBy: b.requested_by_name || 'System',
                        actionRequired: isFreeze ? 'Review Freeze Request' : 'Review Unfreeze Request',
                        urgency: { color: 'blue', text: 'Financial Approval', isUrgent: false },
                        icon: FileSpreadsheet,
                        date: b.created_at
                    };
                })];
            } else {
                console.error("BOQ fetch failed:", boqRes.reason);
            }

            // Sort by Date (Newest first)
            unifiedTasks.sort((a, b) => new Date(b.date) - new Date(a.date));
            setTasks(unifiedTasks);

        } catch (err) {
            console.error("Failed to fetch inbox tasks:", err);
            setError("Failed to load your Unified Inbox. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // --- Helpers ---
    const calculateWorkflowUrgency = (task) => {
        if (!task.current_step) return { color: 'emerald', text: 'No SLA', isUrgent: false };
        const startedAt = new Date(task.started_at);
        const deadline = new Date(startedAt);
        deadline.setDate(deadline.getDate() + task.current_step.deadline_days);
        const now = new Date();
        const diffHours = (deadline - now) / (1000 * 60 * 60);

        if (diffHours < 0) return { color: 'red', text: 'Overdue', isUrgent: true };
        if (diffHours < 24) return { color: 'amber', text: `< 24h Remaining`, isUrgent: true };
        return { color: 'emerald', text: `${Math.ceil(diffHours / 24)} days left`, isUrgent: false };
    };

    const getEdmsStatusConfig = (status) => {
        const configs = {
            UNDER_REVIEW: { label: 'Under Review', action: 'Needs PMNC Review' },
            REVISION_REQUESTED: { label: 'Revision Requested', action: 'Returned for revision' },
            VALIDATED: { label: 'Validated', action: 'Needs SPV Approval' },
        };
        return configs[status] || configs.UNDER_REVIEW;
    };

    // --- Handlers ---
    const handleOpenTask = (task) => {
        if (task.source === 'WORKFLOW') {
            const t = task.original;
            switch (t.entity_type) {
                case 'Project': navigate(`/projects/${t.entity_id}`); break;
                case 'WorkPackage': navigate(`/packages/${t.entity_id}`); break;
                case 'RABill': navigate(`/finance`); break;
                default: navigate(`/projects/${t.entity_id}`); // fallback
            }
        } else if (task.source === 'EDMS') {
            setSelectedDocument(task.original);
        } else if (task.source === 'BOQ') {
            // Nothing onClick row, using inline buttons
        }
    };

    const handleApproveBoq = async (e, requestId) => {
        e.stopPropagation();
        setProcessingId(`boq-${requestId}`);
        try {
            await financeService.approveRequest(requestId);
            toast.success('BOQ Request approved successfully!');
            fetchAllTasks();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to approve request');
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectBoq = async (e, requestId) => {
        e.stopPropagation();
        setProcessingId(`boq-${requestId}`);
        try {
            await financeService.rejectRequest(requestId, 'Rejected by E-Office Admin');
            toast.success('BOQ Request rejected');
            fetchAllTasks();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to reject request');
        } finally {
            setProcessingId(null);
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'all') return true;
        if (filter === 'urgent') return task.urgency.isUrgent;
        if (filter === 'normal') return !task.urgency.isUrgent;
        return true;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                    <p className="text-sm font-medium text-app-muted">Syncing approvals...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-app-heading flex items-center gap-2">
                        Unified E-Office Inbox
                        <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full font-bold ml-2">
                            {tasks.length}
                        </span>
                    </h1>
                    <p className="text-app-muted mt-1">Manage Workflows, Documents, and Financials centrally</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-app-card rounded-lg p-1 border border-app-border flex">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'all' ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30' : 'text-app-muted hover:text-app-text'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('urgent')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${filter === 'urgent' ? 'bg-red-50 text-red-700 dark:bg-red-900/30' : 'text-app-muted hover:text-app-text'}`}
                        >
                            Urgent {tasks.filter(t => t.urgency.isUrgent).length > 0 && <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{tasks.filter(t => t.urgency.isUrgent).length}</span>}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Inbox List */}
            <div className="bg-app-card rounded-xl border border-app-border shadow-sm overflow-hidden">
                {filteredTasks.length === 0 ? (
                    <div className="p-16 text-center text-app-muted">
                        <div className="w-16 h-16 bg-emerald-100/50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-app-heading mb-1">Clear Inbox</h3>
                        <p className="">You're completely caught up across all modules.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-app-border">
                        {filteredTasks.map((task) => {
                            const Icon = task.icon;
                            const urg = task.urgency;

                            return (
                                <div
                                    key={task.id}
                                    onClick={() => handleOpenTask(task)}
                                    className={`p-4 transition-colors group flex items-start gap-4 ${task.source === 'BOQ' ? '' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer'}`}
                                >
                                    {/* Icon Badge */}
                                    <div className={`p-2 rounded-xl mt-1 flex-shrink-0 border ${urg.color === 'red' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-800' :
                                        urg.color === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800' :
                                            urg.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' :
                                                'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800'
                                        }`}>
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 py-1">
                                        <div className="flex text-xs font-medium mb-1.5 gap-2 items-center">
                                            <span className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                {task.source}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-md ${urg.color === 'red' ? 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30' :
                                                urg.color === 'amber' ? 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30' :
                                                    urg.color === 'emerald' ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30' :
                                                        'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
                                                }`}>
                                                {urg.text}
                                            </span>
                                        </div>

                                        <h3 className="text-base font-semibold text-app-heading truncate pr-4">
                                            {task.title}
                                            <span className="text-app-muted font-normal text-sm ml-2.5 inline-block">
                                                {task.subtitle}
                                            </span>
                                        </h3>

                                        <div className="mt-1 flex items-center gap-2.5 text-sm text-app-muted">
                                            <span className="font-medium text-app-text truncate max-w-sm">
                                                Awaiting: {task.actionRequired}
                                            </span>
                                            <span className="text-slate-300 dark:text-slate-600">•</span>
                                            <span className="truncate">Initiated by {task.initiatedBy}</span>
                                        </div>
                                    </div>

                                    {/* Action Area */}
                                    <div className="flex items-center gap-3 pl-4 border-l border-app-border self-stretch justify-end min-w-[140px]">
                                        {task.source === 'BOQ' ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleRejectBoq(e, task.original.id)}
                                                    disabled={processingId === task.id}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800 disabled:opacity-50"
                                                    title="Reject"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleApproveBoq(e, task.original.id)}
                                                    disabled={processingId === task.id}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all shadow-sm disabled:opacity-50"
                                                >
                                                    {processingId === task.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                                    <span className="hidden sm:inline">Approve</span>
                                                </button>
                                            </div>
                                        ) : task.source === 'EDMS' ? (
                                            <div className="flex items-center text-primary-600 group-hover:text-primary-700 font-medium text-sm">
                                                <Eye className="w-4 h-4 mr-1.5" />
                                                <span className="hidden sm:inline">Review</span>
                                                <ChevronRight className="w-5 h-5 ml-1 text-slate-300 group-hover:text-primary-500 transition-colors" />
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-primary-600 group-hover:text-primary-700 font-medium text-sm">
                                                <span className="hidden sm:inline">Open Action</span>
                                                <ChevronRight className="w-5 h-5 ml-1 text-slate-300 group-hover:text-primary-500 transition-colors" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Document Detail Modal */}
            {selectedDocument && (
                <DocumentDetailModal
                    document={selectedDocument}
                    userRole={user?.role}
                    onClose={() => setSelectedDocument(null)}
                    onUpdate={fetchAllTasks}
                    onViewWithNoting={(doc) => {
                        navigate(`/edms/view/${doc.id}`);
                    }}
                    onDiscuss={(doc) => {
                        setDiscussDocument(doc);
                        setSelectedDocument(null);
                    }}
                />
            )}

            {/* Thread Detail for Discussions */}
            {discussDocument && (
                <ThreadDetail
                    thread={{
                        id: `doc-${discussDocument.id}`,
                        title: `Discussion: ${discussDocument.title}`,
                        document_id: discussDocument.id
                    }}
                    onClose={() => setDiscussDocument(null)}
                />
            )}
        </div>
    );
};

export default Inbox;
