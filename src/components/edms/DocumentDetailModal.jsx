/**
 * DocumentDetailModal - Full document view with preview, versions, and workflow
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Download, MessageSquare, Upload, History,
    CheckCircle, XCircle, Clock, AlertTriangle, Edit,
    FileText, Eye, Send, ArrowRight, Loader2, Lock,
    BookOpen
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import client from '@/api/client';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';

const DocumentDetailModal = ({
    document: initialDoc,
    onClose,
    onUpdate,
    onDiscuss,
    onViewWithNoting, // Opens document viewer with noting sheet
    userRole = 'SPV_Official' // Default for testing
}) => {
    const [document, setDocument] = useState(initialDoc);
    const [activeTab, setActiveTab] = useState('details');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showVersionUpload, setShowVersionUpload] = useState(false);
    const [newVersionFile, setNewVersionFile] = useState(null);
    const [changeNotes, setChangeNotes] = useState('');
    const [approvalComment, setApprovalComment] = useState('');

    useEffect(() => {
        fetchDocumentDetails();
    }, [initialDoc.id]);

    const fetchDocumentDetails = async () => {
        try {
            const res = await client.get(`/edms/documents/${initialDoc.id}/`);
            setDocument(res.data);
        } catch (error) {
            console.error('Failed to fetch document:', error);
            toast.error('Failed to load document details');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        try {
            const res = await client.get(`/edms/documents/${document.id}/download/`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(res.data);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = document.current_version?.file_name || 'document';
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Download started');
        } catch (error) {
            toast.error('Failed to download');
        }
    };

    const handleVersionUpload = async () => {
        if (!newVersionFile) return;

        setActionLoading(true);
        const formData = new FormData();
        formData.append('file', newVersionFile);
        formData.append('change_notes', changeNotes);

        try {
            await client.post(`/edms/documents/${document.id}/upload_version/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('New version uploaded');
            setShowVersionUpload(false);
            setNewVersionFile(null);
            setChangeNotes('');
            fetchDocumentDetails();
            onUpdate?.();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to upload version');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSubmitForReview = async () => {
        setActionLoading(true);
        try {
            await client.post(`/edms/documents/${document.id}/submit_for_review/`);
            toast.success('Document submitted for review');
            fetchDocumentDetails();
            onUpdate?.();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to submit');
        } finally {
            setActionLoading(false);
        }
    };

    const handleValidate = async () => {
        setActionLoading(true);
        try {
            await client.post(`/edms/documents/${document.id}/validate/`,
                { comments: approvalComment },
                { headers: { 'Content-Type': 'application/json' } }
            );
            toast.success('Document validated');
            setApprovalComment('');
            fetchDocumentDetails();
            onUpdate?.();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to validate');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRequestRevision = async () => {
        if (!approvalComment.trim()) {
            toast.error('Please provide comments for the revision request');
            return;
        }
        setActionLoading(true);
        try {
            await client.post(`/edms/documents/${document.id}/request_revision/`,
                { comments: approvalComment },
                { headers: { 'Content-Type': 'application/json' } }
            );
            toast.success('Revision requested');
            setApprovalComment('');
            fetchDocumentDetails();
            onUpdate?.();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to request revision');
        } finally {
            setActionLoading(false);
        }
    };

    const handleApprove = async () => {
        setActionLoading(true);
        try {
            await client.post(`/edms/documents/${document.id}/approve/`, {
                comments: approvalComment
            });
            toast.success('Document approved');
            setApprovalComment('');
            fetchDocumentDetails();
            onUpdate?.();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to approve');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!approvalComment.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }
        setActionLoading(true);
        try {
            await client.post(`/edms/documents/${document.id}/reject/`, {
                comments: approvalComment
            });
            toast.success('Document rejected');
            setApprovalComment('');
            fetchDocumentDetails();
            onUpdate?.();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to reject');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusConfig = (status) => {
        const configs = {
            DRAFT: { color: 'bg-slate-100 text-slate-700', icon: Edit, label: 'Draft' },
            UNDER_REVIEW: { color: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Under Review' },
            REVISION_REQUESTED: { color: 'bg-orange-100 text-orange-700', icon: AlertTriangle, label: 'Revision Requested' },
            VALIDATED: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle, label: 'Validated' },
            APPROVED: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Approved' },
            REJECTED: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rejected' },
        };
        return configs[status] || configs.DRAFT;
    };

    const statusConfig = getStatusConfig(document.status);
    const StatusIcon = statusConfig.icon;

    // Determine available actions based on status and role
    const canEdit = document.can_edit;
    const canSubmit = document.status === 'DRAFT' && canEdit;
    const canValidate = document.status === 'UNDER_REVIEW' && ['PMNC_Team', 'SPV_Official', 'NICDC_HQ'].includes(userRole);
    const canApprove = document.status === 'VALIDATED' && ['SPV_Official', 'NICDC_HQ'].includes(userRole);

    if (loading) {
        return createPortal(
            <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-white" />
            </div>,
            window.document.body
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex justify-between items-start p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-lg font-bold text-slate-800 truncate">
                                {document.title}
                            </h2>
                            {document.is_confidential && (
                                <Lock size={16} className="text-amber-500" />
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                                <StatusIcon size={12} />
                                {statusConfig.label}
                            </span>
                            <span>v{document.current_version?.version_number || 1}</span>
                            <span>{document.document_type?.replace('_', ' ')}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onViewWithNoting && (
                            <Button variant="outline" size="sm" onClick={() => onViewWithNoting(document)}>
                                <BookOpen size={16} className="mr-1" />
                                View
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={handleDownload}>
                            <Download size={16} className="mr-1" />
                            Download
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onDiscuss?.(document)}>
                            <MessageSquare size={16} className="mr-1" />
                            Discuss
                        </Button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 px-4">
                    {['details', 'versions', 'workflow'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    <AnimatePresence mode="wait">
                        {/* Details Tab */}
                        {activeTab === 'details' && (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className="space-y-4"
                            >
                                {/* Document Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 mb-1">Document Number</p>
                                        <p className="font-medium text-slate-800">{document.document_number || '-'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 mb-1">Folder</p>
                                        <p className="font-medium text-slate-800">{document.folder_path || 'Root'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 mb-1">Uploaded By</p>
                                        <p className="font-medium text-slate-800">{document.uploaded_by_name}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 mb-1">Uploaded</p>
                                        <p className="font-medium text-slate-800">
                                            {format(new Date(document.created_at), 'dd MMM yyyy, HH:mm')}
                                        </p>
                                    </div>
                                </div>

                                {/* Description */}
                                {document.description && (
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 mb-1">Description</p>
                                        <p className="text-sm text-slate-700">{document.description}</p>
                                    </div>
                                )}

                                {/* Current Version Info */}
                                {document.current_version && (
                                    <div className="p-3 bg-blue-50 rounded-lg">
                                        <p className="text-xs text-blue-600 mb-1">Current Version</p>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-slate-800">{document.current_version.file_name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {document.current_version.file_size_display} • {document.current_version.mime_type}
                                                </p>
                                            </div>
                                            <span className="text-sm font-semibold text-blue-600">
                                                v{document.current_version.version_number}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Upload New Version */}
                                {canEdit && (
                                    <div className="border border-dashed border-slate-300 rounded-lg p-4">
                                        {!showVersionUpload ? (
                                            <button
                                                onClick={() => setShowVersionUpload(true)}
                                                className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                                            >
                                                <Upload size={16} />
                                                Upload New Version
                                            </button>
                                        ) : (
                                            <div className="space-y-3">
                                                <input
                                                    type="file"
                                                    onChange={(e) => setNewVersionFile(e.target.files?.[0] || null)}
                                                    className="text-sm"
                                                />
                                                <textarea
                                                    value={changeNotes}
                                                    onChange={(e) => setChangeNotes(e.target.value)}
                                                    placeholder="What changed in this version?"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                                                    rows={2}
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={handleVersionUpload}
                                                        disabled={!newVersionFile || actionLoading}
                                                    >
                                                        {actionLoading ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                                                        Upload
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setShowVersionUpload(false);
                                                            setNewVersionFile(null);
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Versions Tab */}
                        {activeTab === 'versions' && (
                            <motion.div
                                key="versions"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className="space-y-3"
                            >
                                {document.versions?.map((version, index) => (
                                    <div
                                        key={version.id}
                                        className={`p-3 rounded-lg border ${version.id === document.current_version?.id
                                            ? 'border-primary-200 bg-primary-50'
                                            : 'border-slate-200'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${version.id === document.current_version?.id
                                                    ? 'bg-primary-600 text-white'
                                                    : 'bg-slate-200 text-slate-600'
                                                    }`}>
                                                    v{version.version_number}
                                                </span>
                                                <div>
                                                    <p className="font-medium text-sm text-slate-800">{version.file_name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        By {version.uploaded_by_name} • {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={handleDownload}>
                                                <Download size={14} />
                                            </Button>
                                        </div>
                                        {version.change_notes && (
                                            <p className="text-xs text-slate-600 mt-2 italic">
                                                "{version.change_notes}"
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {/* Workflow Tab */}
                        {activeTab === 'workflow' && (
                            <motion.div
                                key="workflow"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className="space-y-4"
                            >
                                {document.workflow ? (
                                    <div className="space-y-3">
                                        {document.workflow.steps?.map((step, index) => {
                                            const isComplete = step.action !== 'PENDING';
                                            return (
                                                <div key={step.id} className="flex items-start gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isComplete ? 'bg-green-100' : 'bg-slate-100'
                                                        }`}>
                                                        {isComplete ? (
                                                            <CheckCircle size={16} className="text-green-600" />
                                                        ) : (
                                                            <Clock size={16} className="text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm text-slate-800">
                                                            {step.step_type?.replace('_', ' ')}
                                                        </p>
                                                        {isComplete ? (
                                                            <p className="text-xs text-slate-500">
                                                                {step.action} by {step.actor_name} • {formatDistanceToNow(new Date(step.acted_at), { addSuffix: true })}
                                                            </p>
                                                        ) : (
                                                            <p className="text-xs text-slate-400">Pending</p>
                                                        )}
                                                        {step.comments && (
                                                            <p className="text-xs text-slate-600 mt-1 italic">"{step.comments}"</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-400">
                                        <Clock size={32} className="mx-auto mb-2" />
                                        <p>No workflow started yet</p>
                                    </div>
                                )}

                                {/* Workflow Actions */}
                                <div className="border-t border-slate-200 pt-4 space-y-3">
                                    {/* Submit for Review */}
                                    {canSubmit && (
                                        <Button onClick={handleSubmitForReview} disabled={actionLoading} className="w-full">
                                            <Send size={16} className="mr-2" />
                                            Submit for Review
                                        </Button>
                                    )}

                                    {/* PMNC Actions */}
                                    {canValidate && (
                                        <>
                                            <textarea
                                                value={approvalComment}
                                                onChange={(e) => setApprovalComment(e.target.value)}
                                                placeholder="Add comments (required for revision/rejection)"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                                                rows={2}
                                            />
                                            <div className="flex gap-2">
                                                <Button onClick={handleValidate} disabled={actionLoading} className="flex-1">
                                                    <CheckCircle size={16} className="mr-1" />
                                                    Validate
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={handleRequestRevision}
                                                    disabled={actionLoading}
                                                    className="flex-1"
                                                >
                                                    <AlertTriangle size={16} className="mr-1" />
                                                    Request Revision
                                                </Button>
                                            </div>
                                        </>
                                    )}

                                    {/* SPV Actions */}
                                    {canApprove && (
                                        <>
                                            <textarea
                                                value={approvalComment}
                                                onChange={(e) => setApprovalComment(e.target.value)}
                                                placeholder="Add comments (required for rejection)"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                                                rows={2}
                                            />
                                            <div className="flex gap-2">
                                                <Button onClick={handleApprove} disabled={actionLoading} className="flex-1 bg-green-600 hover:bg-green-700">
                                                    <CheckCircle size={16} className="mr-1" />
                                                    Final Approval
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={handleReject}
                                                    disabled={actionLoading}
                                                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                                >
                                                    <XCircle size={16} className="mr-1" />
                                                    Reject
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>,
        window.document.body
    );
};

export default DocumentDetailModal;
