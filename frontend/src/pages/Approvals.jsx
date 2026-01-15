/**
 * Approvals Page - Pending document and BOQ approvals dashboard
 * Shows documents and BOQ freeze requests requiring action from the current user
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Clock, CheckCircle, AlertTriangle, FileText, Lock, Unlock,
    Eye, ChevronRight, RefreshCw, Filter, Loader2, Check, X, FileSpreadsheet
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import client from '@/api/client';
import financeService from '@/services/financeService';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import DocumentDetailModal from '@/components/edms/DocumentDetailModal';
import ThreadDetail from '@/components/communications/ThreadDetail';

const Approvals = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Document Approvals
    const [documents, setDocuments] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [discussDocument, setDiscussDocument] = useState(null);

    // BOQ Approvals
    const [boqRequests, setBoqRequests] = useState([]);
    const [loadingBoq, setLoadingBoq] = useState(true);
    const [selectedBoqRequest, setSelectedBoqRequest] = useState(null);
    const [processingRequest, setProcessingRequest] = useState(null);

    // Filter
    const [filter, setFilter] = useState('all'); // 'all', 'documents', 'boq'

    useEffect(() => {
        fetchPendingApprovals();
        fetchBoqRequests();
    }, []);

    const fetchPendingApprovals = async () => {
        setLoadingDocs(true);
        try {
            const res = await client.get('/edms/approvals/pending/');
            const docs = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setDocuments(docs);
        } catch (error) {
            console.error('Failed to fetch pending approvals:', error);
        } finally {
            setLoadingDocs(false);
        }
    };

    const fetchBoqRequests = async () => {
        setLoadingBoq(true);
        try {
            const requests = await financeService.getPendingApprovals();
            setBoqRequests(requests || []);
        } catch (error) {
            console.error('Failed to fetch BOQ requests:', error);
        } finally {
            setLoadingBoq(false);
        }
    };

    const handleApproveBoq = async (requestId) => {
        setProcessingRequest(requestId);
        try {
            await financeService.approveRequest(requestId);
            toast.success('Request approved successfully!');
            fetchBoqRequests();
            setSelectedBoqRequest(null);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to approve request');
        } finally {
            setProcessingRequest(null);
        }
    };

    const handleRejectBoq = async (requestId, notes = '') => {
        setProcessingRequest(requestId);
        try {
            await financeService.rejectRequest(requestId, notes || 'Rejected by admin');
            toast.success('Request rejected');
            fetchBoqRequests();
            setSelectedBoqRequest(null);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to reject request');
        } finally {
            setProcessingRequest(null);
        }
    };

    const getStatusConfig = (status) => {
        const configs = {
            UNDER_REVIEW: {
                color: 'bg-amber-100 text-amber-700 border-amber-200',
                icon: Clock,
                label: 'Under Review',
                action: 'Needs PMNC Review'
            },
            REVISION_REQUESTED: {
                color: 'bg-orange-100 text-orange-700 border-orange-200',
                icon: AlertTriangle,
                label: 'Revision Requested',
                action: 'Returned for revision'
            },
            VALIDATED: {
                color: 'bg-blue-100 text-blue-700 border-blue-200',
                icon: CheckCircle,
                label: 'Validated',
                action: 'Needs SPV Approval'
            },
        };
        return configs[status] || configs.UNDER_REVIEW;
    };

    const getBoqRequestConfig = (requestType) => {
        if (requestType === 'BOQ_FREEZE') {
            return {
                color: 'bg-blue-100 text-blue-700',
                icon: Lock,
                label: 'Freeze Request',
                action: 'Requesting to freeze BOQ items as baseline'
            };
        }
        return {
            color: 'bg-amber-100 text-amber-700',
            icon: Unlock,
            label: 'Unfreeze Request',
            action: 'Requesting to unfreeze BOQ items for modification'
        };
    };

    // Filter items
    const filteredDocuments = filter === 'boq' ? [] : documents.filter(doc => {
        if (filter === 'documents') return true;
        return true;
    });

    const filteredBoqRequests = filter === 'documents' ? [] : boqRequests;

    const totalPending = documents.length + boqRequests.length;
    const loading = loadingDocs || loadingBoq;

    // Check if user has any pending approvals based on role
    const canValidate = ['PMNC_Team', 'SPV_Official', 'NICDC_HQ'].includes(user?.role);
    const canApprove = ['SPV_Official', 'NICDC_HQ'].includes(user?.role);

    if (!canValidate && !canApprove) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={32} className="text-slate-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">No Approval Permissions</h2>
                    <p className="text-slate-500 dark:text-neutral-400 mt-2">
                        Your role does not have approval permissions.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Clock className="text-amber-600" />
                    Pending Approvals
                </h1>
                <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">
                    Documents and BOQ requests requiring your action
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-neutral-900 rounded-xl p-4 border border-slate-200 dark:border-neutral-700 shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-neutral-400">Total Pending</p>
                            <p className="text-3xl font-bold text-slate-800 dark:text-white">{totalPending}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
                            <FileText size={24} className="text-slate-500 dark:text-neutral-400" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-neutral-900 rounded-xl p-4 border border-amber-200 dark:border-amber-900 shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-amber-600">Documents</p>
                            <p className="text-3xl font-bold text-amber-700">{documents.length}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                            <FileText size={24} className="text-amber-600" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-neutral-900 rounded-xl p-4 border border-blue-200 dark:border-blue-900 shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600">BOQ Requests</p>
                            <p className="text-3xl font-bold text-blue-700">{boqRequests.length}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                            <FileSpreadsheet size={24} className="text-blue-600" />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Filter & Actions */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-slate-400" />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white rounded-lg text-sm"
                    >
                        <option value="all">All Pending ({totalPending})</option>
                        <option value="documents">Documents Only ({documents.length})</option>
                        <option value="boq">BOQ Requests Only ({boqRequests.length})</option>
                    </select>
                </div>
                <Button variant="outline" onClick={() => { fetchPendingApprovals(); fetchBoqRequests(); }} disabled={loading}>
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </Button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={32} className="animate-spin text-slate-400" />
                </div>
            ) : totalPending === 0 ? (
                <div className="bg-white dark:bg-neutral-900 rounded-xl p-8 text-center border border-slate-200 dark:border-neutral-700">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} className="text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">All Caught Up!</h3>
                    <p className="text-slate-500 dark:text-neutral-400 mt-1">
                        No items require your approval right now.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* BOQ Requests Section */}
                    {filteredBoqRequests.length > 0 && (
                        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-blue-200 dark:border-blue-900 overflow-hidden">
                            <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800">
                                <h3 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                                    <FileSpreadsheet size={18} />
                                    BOQ Approval Requests
                                </h3>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-neutral-700">
                                {filteredBoqRequests.map((req, index) => {
                                    const config = getBoqRequestConfig(req.request_type);
                                    const RequestIcon = config.icon;

                                    return (
                                        <motion.div
                                            key={req.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="p-4 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.color.split(' ')[0]}`}>
                                                    <RequestIcon size={24} className={config.color.split(' ')[1]} />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-slate-800 dark:text-white truncate">
                                                            {req.title}
                                                        </h3>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.color}`}>
                                                            {config.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
                                                        {req.project_name} • Requested by {req.requested_by_name} {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                                                    </p>
                                                    <p className="text-xs text-blue-600 mt-1 font-medium">
                                                        {req.entity_ids?.length || 0} items • {config.action}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRejectBoq(req.id)}
                                                        disabled={processingRequest === req.id}
                                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                                    >
                                                        <X size={14} className="mr-1" />
                                                        Reject
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleApproveBoq(req.id)}
                                                        disabled={processingRequest === req.id}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        {processingRequest === req.id ? (
                                                            <Loader2 size={14} className="animate-spin mr-1" />
                                                        ) : (
                                                            <Check size={14} className="mr-1" />
                                                        )}
                                                        Approve
                                                    </Button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Document Approvals Section */}
                    {filteredDocuments.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                    <FileText size={18} />
                                    Document Approvals
                                </h3>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {filteredDocuments.map((doc, index) => {
                                    const statusConfig = getStatusConfig(doc.status);
                                    const StatusIcon = statusConfig.icon;

                                    return (
                                        <motion.div
                                            key={doc.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                                            onClick={() => setSelectedDocument(doc)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusConfig.color.split(' ')[0]}`}>
                                                    <StatusIcon size={24} className={statusConfig.color.split(' ')[1]} />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-slate-800 truncate">
                                                            {doc.title}
                                                        </h3>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig.color}`}>
                                                            {statusConfig.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-500 mt-0.5">
                                                        {doc.document_type?.replace('_', ' ')} • v{doc.current_version_number || 1} •
                                                        Uploaded by {doc.uploaded_by_name} {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                                                    </p>
                                                    <p className="text-xs text-amber-600 mt-1 font-medium">
                                                        {statusConfig.action}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedDocument(doc);
                                                        }}
                                                    >
                                                        <Eye size={14} className="mr-1" />
                                                        Review
                                                    </Button>
                                                    <ChevronRight size={20} className="text-slate-400" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Document Detail Modal */}
            {selectedDocument && (
                <DocumentDetailModal
                    document={selectedDocument}
                    userRole={user?.role}
                    onClose={() => setSelectedDocument(null)}
                    onUpdate={fetchPendingApprovals}
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

export default Approvals;
