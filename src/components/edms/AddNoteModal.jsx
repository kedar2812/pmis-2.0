/**
 * AddNoteModal - Modal for creating new noting sheet entries
 * 
 * Features:
 * - Note type selector
 * - Content textarea
 * - Reference to previous notes
 * - Ruling action (for RULING type)
 * - Save as Draft vs Submit
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
    X, MessageSquare, AlertTriangle, CheckCircle, Gavel,
    CornerDownRight, Loader2, Save, Send
} from 'lucide-react';
import client from '@/api/client';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';

const AddNoteModal = ({
    documentId,
    document,
    onClose,
    onSuccess,
    canAddRuling = false
}) => {
    const [formData, setFormData] = useState({
        note_type: 'REMARK',
        subject: '',
        content: '',
        references_note: '',
        ruling_action: 'NONE'
    });
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // ESC key handler
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && !saving && !submitting) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose, saving, submitting]);

    const noteTypes = [
        { value: 'REMARK', label: 'Remark/Observation', icon: MessageSquare, color: 'text-slate-600' },
        { value: 'CLARIFICATION_REQUEST', label: 'Request Clarification', icon: AlertTriangle, color: 'text-amber-600' },
        { value: 'CLARIFICATION_RESPONSE', label: 'Respond to Clarification', icon: CornerDownRight, color: 'text-blue-600' },
        { value: 'RECOMMENDATION', label: 'Recommendation', icon: CheckCircle, color: 'text-purple-600' },
        ...(canAddRuling ? [{ value: 'RULING', label: 'Ruling/Decision', icon: Gavel, color: 'text-green-600' }] : [])
    ];

    const rulingActions = [
        { value: 'NONE', label: 'No action' },
        { value: 'VALIDATE', label: 'Validate Document' },
        { value: 'APPROVE', label: 'Approve Document' },
        { value: 'REJECT', label: 'Reject Document' },
        { value: 'REQUEST_REVISION', label: 'Request Revision' }
    ];

    const handleSave = async (isDraft = true) => {
        if (!formData.content.trim()) {
            toast.error('Please enter note content');
            return;
        }

        isDraft ? setSaving(true) : setSubmitting(true);

        try {
            await client.post('/edms/noting-sheets/', {
                document: documentId,
                note_type: formData.note_type,
                subject: formData.subject,
                content: formData.content,
                references_note: formData.references_note || null,
                ruling_action: formData.note_type === 'RULING' ? formData.ruling_action : 'NONE',
                is_draft: isDraft
            });

            toast.success(isDraft ? 'Draft saved' : 'Note submitted successfully');
            onSuccess();
        } catch (error) {
            console.error('Failed to save note:', error);
            toast.error(error.response?.data?.error || 'Failed to save note');
        } finally {
            setSaving(false);
            setSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-primary-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Add Noting Entry</h2>
                        <p className="text-sm text-slate-500 truncate max-w-[350px]">{document?.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-4">
                    {/* Note Type */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Note Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {noteTypes.map((type) => {
                                const TypeIcon = type.icon;
                                const isSelected = formData.note_type === type.value;
                                return (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, note_type: type.value }))}
                                        className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left ${isSelected
                                            ? 'border-primary-500 bg-primary-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <TypeIcon size={18} className={isSelected ? 'text-primary-600' : type.color} />
                                        <span className={`text-sm font-medium ${isSelected ? 'text-primary-700' : 'text-slate-700'}`}>
                                            {type.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Ruling Action (only for RULING type) */}
                    {formData.note_type === 'RULING' && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Ruling Action
                            </label>
                            <select
                                value={formData.ruling_action}
                                onChange={(e) => setFormData(prev => ({ ...prev, ruling_action: e.target.value }))}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                                {rulingActions.map(action => (
                                    <option key={action.value} value={action.value}>
                                        {action.label}
                                    </option>
                                ))}
                            </select>
                        </motion.div>
                    )}

                    {/* Subject (Optional) */}
                    <div>
                        <input
                            type="text"
                            value={formData.subject}
                            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                            placeholder="Subject line (optional)"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                            placeholder="Enter your observations, remarks, or decision..."
                            rows={5}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                            required
                        />
                    </div>

                    {/* Reference Note (Optional) */}
                    <div>
                        <input
                            type="text"
                            value={formData.references_note}
                            onChange={(e) => setFormData(prev => ({ ...prev, references_note: e.target.value }))}
                            placeholder="Reference Note ID (optional)"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <p className="text-xs text-slate-400">
                        Immutable once submitted.
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSave(true)}
                            disabled={saving || submitting}
                        >
                            {saving ? (
                                <Loader2 size={14} className="animate-spin mr-1" />
                            ) : (
                                <Save size={14} className="mr-1" />
                            )}
                            Save Draft
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => handleSave(false)}
                            disabled={saving || submitting || !formData.content.trim()}
                        >
                            {submitting ? (
                                <Loader2 size={14} className="animate-spin mr-1" />
                            ) : (
                                <Send size={14} className="mr-1" />
                            )}
                            Submit Note
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>,
        window.document.body
    );
};

export default AddNoteModal;
