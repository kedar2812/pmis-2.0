import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import riskService from '@/api/services/riskService';
import {
    X, AlertTriangle, AlertCircle, CheckCircle, Clock, FileText, Plus,
    Edit2, Save, ChevronDown, ChevronRight, Loader2, Upload, Trash2,
    User, Calendar, Target, DollarSign, Timer, Shield, History,
    Send, ThumbsUp, ThumbsDown, ExternalLink
} from 'lucide-react';

/**
 * Side panel for viewing and managing a single risk.
 * Includes:
 * - Risk details and editing
 * - Document attachments
 * - Mitigation actions with mandatory proof uploads
 */
const RiskDetailPanel = ({ isOpen, onClose, risk: initialRisk, onUpdate }) => {
    const [risk, setRisk] = useState(initialRisk);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [mitigationActions, setMitigationActions] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);

    // Mitigation modal state
    const [showAddMitigation, setShowAddMitigation] = useState(false);
    const [selectedMitigation, setSelectedMitigation] = useState(null);

    // Fetch full risk details
    const fetchRiskDetails = useCallback(async () => {
        if (!risk?.id) return;
        setLoading(true);
        try {
            const [riskRes, mitigationsRes, docsRes] = await Promise.all([
                riskService.getRisk(risk.id),
                riskService.getMitigationActions(risk.id),
                riskService.getRiskDocuments(risk.id)
            ]);
            setRisk(riskRes.data);
            setMitigationActions(mitigationsRes.data || []);
            setDocuments(docsRes.data || []);
        } catch (err) {
            console.error('Failed to fetch risk details:', err);
        } finally {
            setLoading(false);
        }
    }, [risk?.id]);

    useEffect(() => {
        if (isOpen && risk?.id) {
            fetchRiskDetails();
        }
    }, [isOpen, risk?.id, fetchRiskDetails]);

    // Fetch audit logs when tab changes
    const fetchAuditLogs = async () => {
        if (!risk?.id || auditLogs.length > 0) return;
        try {
            const res = await riskService.getRiskAuditLog(risk.id);
            setAuditLogs(res.data || []);
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
        }
    };

    useEffect(() => {
        if (activeTab === 'history') {
            fetchAuditLogs();
        }
    }, [activeTab]);

    // Get colors
    const severityColors = riskService.getSeverityColor(risk?.severity);
    const statusColors = riskService.getStatusColor(risk?.status);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex justify-end">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/40"
                    onClick={onClose}
                />

                {/* Panel */}
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 shadow-2xl flex flex-col h-full"
                >
                    {/* Header */}
                    <div className={`px-6 py-4 bg-gradient-to-r ${risk?.severity === 'CRITICAL' ? 'from-red-500 to-red-600' :
                        risk?.severity === 'HIGH' ? 'from-orange-500 to-orange-600' :
                            risk?.severity === 'MEDIUM' ? 'from-yellow-500 to-yellow-600' :
                                'from-green-500 to-green-600'
                        } text-white`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white/80 text-sm font-mono">{risk?.risk_code}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors.bg} ${statusColors.text}`}>
                                        {riskService.STATUSES.find(s => s.value === risk?.status)?.label}
                                    </span>
                                </div>
                                <h2 className="text-xl font-semibold">{risk?.title}</h2>
                                <p className="text-white/80 text-sm mt-1">{risk?.project_name}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Risk Score Display */}
                        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/20">
                            <div className="text-center">
                                <div className="text-3xl font-bold">{risk?.risk_score}</div>
                                <div className="text-xs text-white/70">Risk Score</div>
                            </div>
                            <div className="text-center">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div
                                            key={i}
                                            className={`w-3 h-6 rounded ${i <= risk?.probability ? 'bg-white' : 'bg-white/30'}`}
                                        />
                                    ))}
                                </div>
                                <div className="text-xs text-white/70 mt-1">Probability</div>
                            </div>
                            <div className="text-center">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div
                                            key={i}
                                            className={`w-3 h-6 rounded ${i <= risk?.impact ? 'bg-white' : 'bg-white/30'}`}
                                        />
                                    ))}
                                </div>
                                <div className="text-xs text-white/70 mt-1">Impact</div>
                            </div>
                            {risk?.residual_risk_score && (
                                <div className="text-center border-l border-white/20 pl-6">
                                    <div className="text-2xl font-bold">{risk.residual_risk_score}</div>
                                    <div className="text-xs text-white/70">Residual</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 dark:border-neutral-700">
                        {[
                            { id: 'details', label: 'Details', icon: AlertTriangle },
                            { id: 'mitigations', label: 'Mitigations', icon: Shield, count: mitigationActions.length },
                            { id: 'documents', label: 'Documents', icon: FileText, count: documents.length },
                            { id: 'history', label: 'History', icon: History }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === tab.id
                                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full text-xs bg-gray-200 text-gray-700">
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-40">
                                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                            </div>
                        ) : (
                            <>
                                {/* Details Tab */}
                                {activeTab === 'details' && (
                                    <DetailsTab risk={risk} onUpdate={onUpdate} onRefresh={fetchRiskDetails} />
                                )}

                                {/* Mitigations Tab */}
                                {activeTab === 'mitigations' && (
                                    <MitigationsTab
                                        risk={risk}
                                        mitigationActions={mitigationActions}
                                        onRefresh={fetchRiskDetails}
                                        showAddModal={showAddMitigation}
                                        setShowAddModal={setShowAddMitigation}
                                        selectedMitigation={selectedMitigation}
                                        setSelectedMitigation={setSelectedMitigation}
                                    />
                                )}

                                {/* Documents Tab */}
                                {activeTab === 'documents' && (
                                    <DocumentsTab
                                        risk={risk}
                                        documents={documents}
                                        onRefresh={fetchRiskDetails}
                                    />
                                )}

                                {/* History Tab */}
                                {activeTab === 'history' && (
                                    <HistoryTab auditLogs={auditLogs} />
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

/**
 * Details Tab Component
 */
const DetailsTab = ({ risk, onUpdate, onRefresh }) => {
    return (
        <div className="space-y-6">
            {/* Description */}
            <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</h3>
                <p className="text-gray-900 dark:text-white">{risk?.description || 'No description provided'}</p>
            </div>

            {/* Key Information */}
            <div className="grid grid-cols-2 gap-4">
                <InfoItem
                    icon={Target}
                    label="Category"
                    value={riskService.CATEGORIES.find(c => c.value === risk?.category)?.label || risk?.category}
                />
                <InfoItem
                    icon={User}
                    label="Owner"
                    value={risk?.owner_name || 'Not assigned'}
                />
                <InfoItem
                    icon={Calendar}
                    label="Identified"
                    value={risk?.identified_date ? new Date(risk.identified_date).toLocaleDateString() : '-'}
                />
                <InfoItem
                    icon={Clock}
                    label="Target Resolution"
                    value={risk?.target_resolution ? new Date(risk.target_resolution).toLocaleDateString() : 'Not set'}
                    highlight={risk?.is_overdue}
                />
                <InfoItem
                    icon={DollarSign}
                    label="Cost Impact"
                    value={risk?.cost_impact ? `₹${parseFloat(risk.cost_impact).toLocaleString()}` : '-'}
                />
                <InfoItem
                    icon={Timer}
                    label="Schedule Impact"
                    value={risk?.schedule_impact_days ? `${risk.schedule_impact_days} days` : '-'}
                />
            </div>

            {/* Response Strategy */}
            {risk?.response_strategy && (
                <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Response Strategy</h3>
                    <span className="px-3 py-1 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 rounded-full text-sm font-medium">
                        {riskService.RESPONSE_STRATEGIES.find(s => s.value === risk.response_strategy)?.label}
                    </span>
                </div>
            )}

            {/* Mitigation Plan */}
            {risk?.mitigation_plan && (
                <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Mitigation Plan</h3>
                    <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">{risk.mitigation_plan}</p>
                </div>
            )}

            {/* Contingency Plan */}
            {risk?.contingency_plan && (
                <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Contingency Plan</h3>
                    <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">{risk.contingency_plan}</p>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-neutral-700">
                <div className="text-center p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{risk?.days_open || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Days Open</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{risk?.mitigation_count || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Mitigations</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{risk?.risk_documents?.length || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Documents</div>
                </div>
            </div>
        </div>
    );
};

/**
 * Info Item Component
 */
const InfoItem = ({ icon: Icon, label, value, highlight = false }) => (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${highlight ? 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-gray-50 dark:bg-neutral-800'}`}>
        <Icon size={18} className={highlight ? 'text-red-500' : 'text-gray-400'} />
        <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
            <div className={`text-sm font-medium ${highlight ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{value}</div>
        </div>
    </div>
);

/**
 * Mitigations Tab Component
 */
const MitigationsTab = ({ risk, mitigationActions, onRefresh, showAddModal, setShowAddModal }) => {
    const [expandedAction, setExpandedAction] = useState(null);
    const [showProofUpload, setShowProofUpload] = useState(null);
    const [proofFile, setProofFile] = useState(null);
    const [proofDescription, setProofDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Handle proof upload
    const handleProofUpload = async (actionId) => {
        if (!proofFile) return;

        setSubmitting(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', proofFile);
            formData.append('description', proofDescription);

            await riskService.uploadMitigationProof(risk.id, actionId, formData);
            setShowProofUpload(null);
            setProofFile(null);
            setProofDescription('');
            onRefresh();
        } catch (err) {
            setError('Failed to upload proof document');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle submit for review
    const handleSubmitForReview = async (actionId) => {
        setSubmitting(true);
        try {
            await riskService.submitMitigationAction(risk.id, actionId);
            onRefresh();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit. Ensure proof documents are attached.');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle review (approve/reject)
    const handleReview = async (actionId, action, comments = '') => {
        setSubmitting(true);
        try {
            await riskService.reviewMitigationAction(risk.id, actionId, { action, comments });
            onRefresh();
        } catch (err) {
            setError('Failed to process review');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Add Button */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Mitigation Actions</h3>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                >
                    <Plus size={16} />
                    Add Mitigation
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Actions List */}
            {mitigationActions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Shield className="mx-auto mb-3 text-gray-400" size={40} />
                    <p>No mitigation actions yet.</p>
                    <p className="text-sm">Click "Add Mitigation" to record your first action.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {mitigationActions.map(action => (
                        <div key={action.id} className="border rounded-lg overflow-hidden">
                            {/* Action Header */}
                            <div
                                className="p-4 bg-gray-50 dark:bg-neutral-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                                onClick={() => setExpandedAction(expandedAction === action.id ? null : action.id)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        {expandedAction === action.id ? (
                                            <ChevronDown className="text-gray-400 mt-1" size={18} />
                                        ) : (
                                            <ChevronRight className="text-gray-400 mt-1" size={18} />
                                        )}
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs text-gray-500">#{action.action_number}</span>
                                                <StatusBadge status={action.status} />
                                                {!action.has_proof && action.status === 'DRAFT' && (
                                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                                                        Needs Proof
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="font-medium text-gray-900 dark:text-white">{action.title}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {riskService.ACTION_TYPES.find(t => t.value === action.action_type)?.label}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right text-sm text-gray-500">
                                        {action.action_date && new Date(action.action_date).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            <AnimatePresence>
                                {expandedAction === action.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-gray-200 dark:border-neutral-700"
                                    >
                                        <div className="p-4 space-y-4">
                                            <p className="text-gray-700 dark:text-gray-300">{action.description}</p>

                                            {/* Effectiveness */}
                                            {action.effectiveness_rating && (
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm text-gray-500">Effectiveness:</span>
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4, 5].map(i => (
                                                            <div
                                                                key={i}
                                                                className={`w-6 h-6 rounded ${i <= action.effectiveness_rating ? 'bg-green-500' : 'bg-gray-200'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Proof Documents */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Proof Documents {action.status === 'DRAFT' && <span className="text-red-500">*</span>}
                                                    </h5>
                                                    {action.status === 'DRAFT' && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowProofUpload(action.id);
                                                            }}
                                                            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                                                        >
                                                            <Upload size={14} />
                                                            Upload Proof
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Upload Form */}
                                                {showProofUpload === action.id && (
                                                    <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg mb-3 space-y-3">
                                                        <input
                                                            type="file"
                                                            onChange={(e) => setProofFile(e.target.files[0])}
                                                            className="w-full text-sm"
                                                        />
                                                        <textarea
                                                            placeholder="Description of what this document proves..."
                                                            value={proofDescription}
                                                            onChange={(e) => setProofDescription(e.target.value)}
                                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                                            rows={2}
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleProofUpload(action.id)}
                                                                disabled={!proofFile || submitting}
                                                                className="px-3 py-1.5 bg-primary-600 text-white rounded text-sm disabled:opacity-50"
                                                            >
                                                                {submitting ? <Loader2 className="animate-spin" size={14} /> : 'Upload'}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setShowProofUpload(null);
                                                                    setProofFile(null);
                                                                }}
                                                                className="px-3 py-1.5 text-gray-600 hover:text-gray-900 text-sm"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Document List */}
                                                {action.proof_documents?.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {action.proof_documents.map(doc => (
                                                            <div key={doc.id} className="flex items-center gap-2 p-2 bg-green-50 rounded text-sm">
                                                                <FileText size={16} className="text-green-600" />
                                                                <span className="flex-1">{doc.document_title}</span>
                                                                <a
                                                                    href={doc.document_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-primary-600 hover:text-primary-700"
                                                                >
                                                                    <ExternalLink size={14} />
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                                                        ⚠️ No proof documents attached. Required before submission.
                                                    </p>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2 pt-3 border-t">
                                                {action.status === 'DRAFT' && (
                                                    <button
                                                        onClick={() => handleSubmitForReview(action.id)}
                                                        disabled={!action.has_proof || submitting}
                                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-blue-700"
                                                    >
                                                        <Send size={14} />
                                                        Submit for Review
                                                    </button>
                                                )}
                                                {action.status === 'SUBMITTED' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleReview(action.id, 'approve')}
                                                            disabled={submitting}
                                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                                                        >
                                                            <ThumbsUp size={14} />
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const reason = prompt('Enter rejection reason:');
                                                                if (reason) handleReview(action.id, 'reject', reason);
                                                            }}
                                                            disabled={submitting}
                                                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                                                        >
                                                            <ThumbsDown size={14} />
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                            </div>

                                            {/* Review Comments */}
                                            {action.review_comments && (
                                                <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                                                    <div className="text-xs text-gray-500 mb-1">
                                                        Review by {action.reviewed_by_name} on {new Date(action.reviewed_at).toLocaleDateString()}
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">{action.review_comments}</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Mitigation Modal */}
            {showAddModal && (
                <AddMitigationModal
                    risk={risk}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        onRefresh();
                    }}
                />
            )}
        </div>
    );
};

/**
 * Mitigation Status Badge
 */
const StatusBadge = ({ status }) => {
    const colors = {
        DRAFT: 'bg-gray-100 text-gray-700',
        SUBMITTED: 'bg-blue-100 text-blue-700',
        APPROVED: 'bg-green-100 text-green-700',
        REJECTED: 'bg-red-100 text-red-700'
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs ${colors[status] || colors.DRAFT}`}>
            {status}
        </span>
    );
};

/**
 * Add Mitigation Modal
 */
const AddMitigationModal = ({ risk, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        action_type: 'CORRECTIVE',
        title: '',
        description: '',
        action_date: new Date().toISOString().split('T')[0],
        target_completion: '',
        effectiveness_rating: '',
        residual_probability: '',
        residual_impact: '',
        cost_incurred: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.description) {
            setError('Title and description are required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await riskService.createMitigationAction(risk.id, {
                ...formData,
                effectiveness_rating: formData.effectiveness_rating || null,
                residual_probability: formData.residual_probability || null,
                residual_impact: formData.residual_impact || null,
                cost_incurred: formData.cost_incurred || 0
            });
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create mitigation action');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Mitigation Action</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <X size={20} />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Action Type</label>
                            <select
                                value={formData.action_type}
                                onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                            >
                                {riskService.ACTION_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Title *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Brief action title"
                                className="w-full px-4 py-2 border rounded-lg"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Description *</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe the mitigation action taken..."
                                rows={3}
                                className="w-full px-4 py-2 border rounded-lg"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Action Date</label>
                                <input
                                    type="date"
                                    value={formData.action_date}
                                    onChange={(e) => setFormData({ ...formData, action_date: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Target Completion</label>
                                <input
                                    type="date"
                                    value={formData.target_completion}
                                    onChange={(e) => setFormData({ ...formData, target_completion: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Cost Incurred (₹)</label>
                            <input
                                type="number"
                                value={formData.cost_incurred}
                                onChange={(e) => setFormData({ ...formData, cost_incurred: e.target.value })}
                                placeholder="0"
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-700">
                                <strong>Note:</strong> After creating this action, you must upload proof documents before submitting for review.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                Create Action
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

/**
 * Documents Tab Component
 */
const DocumentsTab = ({ risk, documents, onRefresh }) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Risk Documents</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
                    <Upload size={16} />
                    Upload Document
                </button>
            </div>

            {documents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <FileText className="mx-auto mb-3 text-gray-400" size={40} />
                    <p>No documents attached yet.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {documents.map(doc => (
                        <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                            <FileText className="text-primary-600" size={20} />
                            <div className="flex-1">
                                <div className="font-medium text-gray-900">{doc.document_title}</div>
                                <div className="text-sm text-gray-500">
                                    {riskService.DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label}
                                    {doc.uploaded_by_name && ` • Uploaded by ${doc.uploaded_by_name}`}
                                </div>
                            </div>
                            {doc.document_url && (
                                <a
                                    href={doc.document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-gray-400 hover:text-primary-600"
                                >
                                    <ExternalLink size={18} />
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * History/Audit Tab Component
 */
const HistoryTab = ({ auditLogs }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Audit Trail</h3>

            {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <History className="mx-auto mb-3 text-gray-400" size={40} />
                    <p>No audit history available.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {auditLogs.map((log, index) => (
                        <div key={log.id} className="flex gap-3">
                            <div className="relative">
                                <div className="w-3 h-3 bg-primary-500 rounded-full mt-1.5" />
                                {index < auditLogs.length - 1 && (
                                    <div className="absolute top-4 left-1.5 w-0.5 h-full bg-gray-200" />
                                )}
                            </div>
                            <div className="flex-1 pb-4">
                                <div className="text-sm font-medium text-gray-900">{log.action}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {log.actor_name || 'System'} • {new Date(log.timestamp).toLocaleString()}
                                </div>
                                {log.details && Object.keys(log.details).length > 0 && (
                                    <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                        {JSON.stringify(log.details)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RiskDetailPanel;
