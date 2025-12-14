/**
 * Approvals Page - Pending document approvals dashboard
 * Shows documents requiring action from the current user
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Clock, CheckCircle, AlertTriangle, FileText,
    Eye, ChevronRight, RefreshCw, Filter, Loader2
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import client from '@/api/client';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import DocumentDetailModal from '@/components/edms/DocumentDetailModal';

const Approvals = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchPendingApprovals();
    }, []);

    const fetchPendingApprovals = async () => {
        setLoading(true);
        try {
            const res = await client.get('/edms/approvals/pending/');
            const docs = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setDocuments(docs);
        } catch (error) {
            console.error('Failed to fetch pending approvals:', error);
            toast.error('Failed to load pending approvals');
        } finally {
            setLoading(false);
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
            VALIDATED: {
                color: 'bg-blue-100 text-blue-700 border-blue-200',
                icon: CheckCircle,
                label: 'Validated',
                action: 'Needs SPV Approval'
            },
        };
        return configs[status] || configs.UNDER_REVIEW;
    };

    const filteredDocuments = documents.filter(doc => {
        if (filter === 'all') return true;
        return doc.status === filter;
    });

    const underReviewCount = documents.filter(d => d.status === 'UNDER_REVIEW').length;
    const validatedCount = documents.filter(d => d.status === 'VALIDATED').length;

    // Check if user has any pending approvals based on role
    const canValidate = ['PMNC_Team', 'SPV_Official', 'NICDC_HQ'].includes(user?.role);
    const canApprove = ['SPV_Official', 'NICDC_HQ'].includes(user?.role);

    if (!canValidate && !canApprove) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={32} className="text-slate-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">No Approval Permissions</h2>
                    <p className="text-slate-500 mt-2">
                        Your role does not have document approval permissions.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="text-amber-600" />
                    Pending Approvals
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Documents requiring your action
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Total Pending</p>
                            <p className="text-3xl font-bold text-slate-800">{documents.length}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                            <FileText size={24} className="text-slate-500" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-amber-600">Under Review</p>
                            <p className="text-3xl font-bold text-amber-700">{underReviewCount}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                            <Clock size={24} className="text-amber-600" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600">Awaiting Final Approval</p>
                            <p className="text-3xl font-bold text-blue-700">{validatedCount}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                            <CheckCircle size={24} className="text-blue-600" />
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
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    >
                        <option value="all">All Pending ({documents.length})</option>
                        <option value="UNDER_REVIEW">Under Review ({underReviewCount})</option>
                        <option value="VALIDATED">Awaiting Approval ({validatedCount})</option>
                    </select>
                </div>
                <Button variant="outline" onClick={fetchPendingApprovals} disabled={loading}>
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </Button>
            </div>

            {/* Document List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={32} className="animate-spin text-slate-400" />
                </div>
            ) : filteredDocuments.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} className="text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">All Caught Up!</h3>
                    <p className="text-slate-500 mt-1">
                        No documents require your approval right now.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
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
            )}

            {/* Document Detail Modal */}
            {selectedDocument && (
                <DocumentDetailModal
                    document={selectedDocument}
                    userRole={user?.role}
                    onClose={() => setSelectedDocument(null)}
                    onUpdate={fetchPendingApprovals}
                />
            )}
        </div>
    );
};

export default Approvals;
