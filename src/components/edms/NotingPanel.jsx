/**
 * NotingPanel - Displays chronological noting sheet entries
 * 
 * Features:
 * - Color-coded note types
 * - Draft vs submitted distinction
 * - Click to view referenced page
 * - Submit draft notes
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare, AlertTriangle, CheckCircle, Gavel,
    Clock, Edit, CornerDownRight, User, Calendar,
    Loader2, Send, Trash2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import client from '@/api/client';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';

const NotingPanel = ({
    notings,
    documentId,
    onRefresh,
    canAddNoting,
    canAddRuling
}) => {
    const [submittingId, setSubmittingId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);

    // Get current user
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const getNoteTypeConfig = (type) => {
        const configs = {
            REMARK: {
                color: 'border-l-slate-400 bg-slate-50',
                icon: MessageSquare,
                label: 'Remark'
            },
            CLARIFICATION_REQUEST: {
                color: 'border-l-amber-400 bg-amber-50',
                icon: AlertTriangle,
                label: 'Clarification Request'
            },
            CLARIFICATION_RESPONSE: {
                color: 'border-l-blue-400 bg-blue-50',
                icon: CornerDownRight,
                label: 'Clarification Response'
            },
            RECOMMENDATION: {
                color: 'border-l-purple-400 bg-purple-50',
                icon: CheckCircle,
                label: 'Recommendation'
            },
            RULING: {
                color: 'border-l-green-500 bg-green-50',
                icon: Gavel,
                label: 'Ruling/Decision'
            }
        };
        return configs[type] || configs.REMARK;
    };

    const getRulingActionLabel = (action) => {
        const labels = {
            VALIDATE: 'Validated Document',
            APPROVE: 'Approved Document',
            REJECT: 'Rejected Document',
            REQUEST_REVISION: 'Requested Revision'
        };
        return labels[action] || null;
    };

    const handleSubmit = async (noteId) => {
        setSubmittingId(noteId);
        try {
            await client.post(`/edms/noting-sheets/${noteId}/submit/`);
            toast.success('Note submitted successfully');
            onRefresh();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to submit note');
        } finally {
            setSubmittingId(null);
        }
    };

    const handleDelete = async (noteId) => {
        if (!window.confirm('Are you sure you want to delete this draft?')) return;

        try {
            await client.delete(`/edms/noting-sheets/${noteId}/`);
            toast.success('Draft deleted');
            onRefresh();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete');
        }
    };

    const submittedNotes = notings.filter(n => !n.is_draft);
    const draftNotes = notings.filter(n => n.is_draft && n.author === user?.id);

    if (notings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare size={32} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700">No Notes Yet</h3>
                <p className="text-sm text-slate-500 mt-1">
                    {canAddNoting
                        ? 'Add the first noting entry to this document.'
                        : 'No noting entries have been added to this document.'}
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            {/* My Drafts Section */}
            {draftNotes.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Edit size={14} />
                        My Drafts ({draftNotes.length})
                    </h3>
                    <div className="space-y-3">
                        {draftNotes.map((note) => {
                            const config = getNoteTypeConfig(note.note_type);
                            const NoteIcon = config.icon;
                            const isSubmitting = submittingId === note.id;

                            return (
                                <motion.div
                                    key={note.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`border-l-4 ${config.color} rounded-lg p-3 border border-amber-200`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                                DRAFT
                                            </span>
                                            <span className="text-xs text-slate-500">{config.label}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleDelete(note.id)}
                                                className="p-1 hover:bg-red-100 rounded text-red-500"
                                                title="Delete Draft"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {note.subject && (
                                        <p className="font-medium text-slate-700 text-sm mb-1">{note.subject}</p>
                                    )}
                                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{note.content}</p>

                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-amber-200">
                                        <span className="text-xs text-slate-400">
                                            Created {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                                        </span>
                                        <Button
                                            size="sm"
                                            onClick={() => handleSubmit(note.id)}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <Loader2 size={14} className="animate-spin mr-1" />
                                            ) : (
                                                <Send size={14} className="mr-1" />
                                            )}
                                            Submit
                                        </Button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Submitted Notes */}
            <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Official Notes ({submittedNotes.length})
                </h3>
                <div className="space-y-3">
                    {submittedNotes.map((note, index) => {
                        const config = getNoteTypeConfig(note.note_type);
                        const NoteIcon = config.icon;
                        const isExpanded = expandedId === note.id;
                        const rulingLabel = getRulingActionLabel(note.ruling_action);

                        return (
                            <motion.div
                                key={note.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`border-l-4 ${config.color} rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow`}
                                onClick={() => setExpandedId(isExpanded ? null : note.id)}
                            >
                                {/* Note Header */}
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
                                            #{note.note_number}
                                        </span>
                                        <NoteIcon size={14} className="text-slate-500" />
                                        <span className="text-xs text-slate-500">{config.label}</span>
                                    </div>
                                    {note.references_note && (
                                        <span className="text-xs text-blue-500 flex items-center gap-1">
                                            <CornerDownRight size={12} />
                                            Re: #{note.references_note}
                                        </span>
                                    )}
                                </div>

                                {/* Subject */}
                                {note.subject && (
                                    <p className="font-medium text-slate-700 text-sm mb-1">{note.subject}</p>
                                )}

                                {/* Content - truncated unless expanded */}
                                <p className={`text-sm text-slate-600 whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
                                    {note.content}
                                </p>

                                {/* Ruling Action */}
                                {rulingLabel && (
                                    <div className="mt-2 inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                                        <Gavel size={12} />
                                        {rulingLabel}
                                    </div>
                                )}

                                {/* Author & Timestamp */}
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <User size={12} />
                                        <span className="font-medium text-slate-700">{note.author_name}</span>
                                        <span>({note.author_role})</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                        <Calendar size={12} />
                                        {note.submitted_at && format(new Date(note.submitted_at), 'dd MMM yyyy, HH:mm')}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default NotingPanel;
