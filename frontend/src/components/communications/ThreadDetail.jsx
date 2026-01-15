/**
 * ThreadDetail Component - Displays full conversation thread with message composer
 * Immutable message display, role-based message types
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import client from '@/api/client';
import { toast } from 'sonner';
import {
    CheckCircle, ChevronDown, CornerDownRight, FolderOpen, FileText,
    User, Send, Clock, Gavel, Lock, AlertTriangle, X,
    Pin, BellOff, Bell, UserPlus, LogOut, MoreVertical, Paperclip, MessageSquare, Users
} from 'lucide-react';
import Button from '@/components/ui/Button';
import AddParticipantsModal from './AddParticipantsModal';

const ThreadDetail = ({ thread, onMessageSent, onClose }) => {
    const { user } = useAuth();
    const [messageContent, setMessageContent] = useState('');

    const [isSending, setIsSending] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [isPinned, setIsPinned] = useState(thread?.is_pinned || false);
    const [isMuted, setIsMuted] = useState(thread?.is_muted || false);
    const [showAddParticipants, setShowAddParticipants] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [attachedFile, setAttachedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thread?.messages]);

    // Auto-mark messages as read when viewing thread
    useEffect(() => {
        const markMessagesAsRead = async () => {
            if (!thread?.id) return;

            try {
                // Bulk mark all messages in thread as read
                await client.post(`/communications/threads/${thread.id}/mark_read/`);
            } catch (error) {
                // Silent fail - not critical
                console.log('Could not mark thread as read:', error);
            }
        };

        markMessagesAsRead();
    }, [thread?.id, thread?.messages?.length]); // Run when thread changes or new messages arrive

    // Permission checks
    const canSendMessage = ['SPV_Official', 'PMNC_Team', 'Nodal_Officer', 'EPC_Contractor', 'Consultant', 'Govt_Official'].includes(user?.role);
    const canIssueRuling = user?.role === 'SPV_Official';
    const canRequestClarification = ['SPV_Official', 'PMNC_Team', 'Nodal_Officer', 'Govt_Official'].includes(user?.role);
    const canCloseThread = ['SPV_Official', 'PMNC_Team', 'Nodal_Officer'].includes(user?.role);

    // File handling
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAttachedFile(file);
        }
    };

    const handleRemoveFile = () => {
        setAttachedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSendMessage = async () => {
        if (!messageContent.trim() && !attachedFile) return;

        setIsSending(true);
        try {
            let attachmentId = null;

            // Upload file first if attached
            if (attachedFile) {
                setIsUploading(true);
                const formData = new FormData();
                formData.append('file', attachedFile);

                const uploadRes = await client.post('/communications/messages/upload_attachment/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                attachmentId = uploadRes.data.id;
                setIsUploading(false);
            }

            // Send message
            const payload = {
                content: messageContent || '📎 File attached',
                message_type: 'STANDARD'
            };

            if (attachmentId) {
                payload.attachment_id = attachmentId;
            }

            await client.post(`/communications/threads/${thread.id}/send_message/`, payload);

            setMessageContent('');

            setAttachedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            onMessageSent();
            toast.success('Message sent');
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error(error.response?.data?.error || 'Failed to send message');
        } finally {
            setIsSending(false);
            setIsUploading(false);
        }
    };

    const handleCloseThread = async () => {
        try {
            await client.post(`/communications/threads/${thread.id}/close/`);
            toast.success('Thread closed');
            onMessageSent(); // Refresh
        } catch (error) {
            console.error('Failed to close thread:', error);
            toast.error(error.response?.data?.error || 'Failed to close thread');
        }
    };

    const handlePin = async () => {
        try {
            await client.post(`/communications/threads/${thread.id}/pin/`);
            setIsPinned(!isPinned);
            toast.success(isPinned ? 'Thread unpinned' : 'Thread pinned');
            onMessageSent(); // Refresh list
        } catch (error) {
            console.error('Failed to toggle pin:', error);
            toast.error('Failed to pin/unpin thread');
        }
    };

    const handleMute = async (duration = null) => {
        try {
            if (isMuted) {
                await client.post(`/communications/threads/${thread.id}/unmute/`);
                setIsMuted(false);
                toast.success('Thread unmuted');
            } else {
                const res = await client.post(`/communications/threads/${thread.id}/mute/`, { duration });
                setIsMuted(true);
                toast.success(res.data.message);
            }
            onMessageSent(); // Refresh
        } catch (error) {
            console.error('Failed to toggle mute:', error);
            toast.error('Failed to mute/unmute thread');
        }
    };

    const handleLeaveGroup = async () => {
        if (!confirm('Are you sure you want to leave this group?')) return;

        try {
            await client.post(`/communications/threads/${thread.id}/leave_group/`);
            toast.success('Left group successfully');
            onClose(); // Close detail view  
            onMessageSent(); // Refresh list
        } catch (error) {
            console.error('Failed to leave group:', error);
            toast.error(error.response?.data?.error || 'Failed to leave group');
        }
    };

    const getMessageStyles = (msg) => {
        // Use loose equality to handle potential string/number mismatches
        const isOwn = msg.sender == user?.id;
        let baseStyles = 'rounded-lg p-4 max-w-[85%] break-words shadow-sm';

        switch (msg.message_type) {
            case 'RULING':
                return `${baseStyles} bg-yellow-50 border-l-4 border-yellow-500 dark:bg-yellow-900/20 dark:border-yellow-600 dark:text-yellow-100`;
            case 'CLARIFICATION_REQUEST':
                return `${baseStyles} bg-blue-50 border-l-4 border-blue-500 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-100`;
            case 'CLARIFICATION_RESPONSE':
                return `${baseStyles} bg-green-50 border-l-4 border-green-500 dark:bg-green-900/20 dark:border-green-600 dark:text-green-100`;
            case 'INTERNAL_NOTE':
                return `${baseStyles} bg-purple-50 border-l-4 border-purple-500 dark:bg-purple-900/20 dark:border-purple-600 dark:text-purple-100`;
            default:
                return isOwn
                    ? `${baseStyles} bg-blue-50 text-slate-900 border border-blue-100 ml-auto dark:bg-blue-900/30 dark:text-blue-100 dark:border-blue-800/50`
                    : `${baseStyles} bg-slate-100 text-slate-900 border border-slate-200 dark:bg-neutral-800 dark:text-slate-200 dark:border-neutral-800`;
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleString();
    };



    if (!thread) return null;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-neutral-900">
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800">
                {/* Top Row: Title and Close button */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white truncate">{thread.subject}</h2>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs sm:text-sm text-slate-500 dark:text-neutral-400">
                            <span className="flex items-center gap-1">
                                <User size={14} />
                                {thread.participant_count}
                            </span>
                            <span className="hidden sm:flex items-center gap-1">
                                <Clock size={14} />
                                {formatTimestamp(thread.created_at)}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${thread.status === 'OPEN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                thread.status === 'PENDING_RESPONSE' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                    thread.status === 'ESCALATED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                        'bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-gray-300'
                                }`}>
                                {thread.status}
                            </span>
                        </div>
                    </div>
                    {/* Close Panel Button - always visible */}
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-lg flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-600 dark:text-neutral-300"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 -mb-1">
                    {/* Participants Button */}
                    <button
                        onClick={() => setShowParticipants(true)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center flex-shrink-0"
                        title="View Participants"
                    >
                        <Users size={18} />
                    </button>

                    {/* Pin Button */}
                    <button
                        onClick={handlePin}
                        className={`p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center flex-shrink-0 ${isPinned ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300'
                            }`}
                        title={isPinned ? 'Unpin thread' : 'Pin thread'}
                    >
                        <Pin size={18} fill={isPinned ? 'currentColor' : 'none'} />
                    </button>

                    {/* Mute Button */}
                    <button
                        onClick={() => handleMute()}
                        className={`p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center flex-shrink-0 ${isMuted ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300'
                            }`}
                        title={isMuted ? 'Unmute thread' : 'Mute thread'}
                    >
                        {isMuted ? <BellOff size={18} /> : <Bell size={18} />}
                    </button>

                    {/* More Actions Menu (for group chats only) */}
                    {thread.thread_type === 'GROUP' && (
                        <div className="relative">
                            <button
                                onClick={() => setShowActionsMenu(!showActionsMenu)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-700 rounded-lg transition-colors text-slate-600 dark:text-neutral-300 min-w-[36px] min-h-[36px] flex items-center justify-center"
                            >
                                <MoreVertical size={18} />
                            </button>

                            <AnimatePresence>
                                {showActionsMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 z-10"
                                    >
                                        <button
                                            onClick={() => {
                                                setShowActionsMenu(false);
                                                setShowAddParticipants(true);
                                            }}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-700"
                                        >
                                            <UserPlus size={16} />
                                            Add Participants
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowActionsMenu(false);
                                                handleLeaveGroup();
                                            }}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                        >
                                            <LogOut size={16} />
                                            Leave Group
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Close Thread Button */}
                    {thread.status !== 'CLOSED' && canCloseThread && (
                        <Button variant="outline" size="sm" onClick={handleCloseThread} className="flex-shrink-0 text-xs">
                            <CheckCircle size={14} className="mr-1" /> Close
                        </Button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {thread.messages && thread.messages.length > 0 ? (
                    thread.messages.map((msg) => {
                        const isOwn = msg.sender === user?.id;

                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                                {/* Message Bubble */}
                                <div className={getMessageStyles(msg)}>
                                    {/* Sender Info */}
                                    <div className="flex items-center gap-2 mb-2 text-xs text-slate-500 dark:text-slate-400">
                                        <span className={`font-semibold ${isOwn ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>{msg.sender_name}</span>
                                        <span className="px-1.5 py-0.5 bg-slate-200/80 dark:bg-white/10 rounded text-[10px] uppercase">
                                            {msg.sender_role?.replace('_', ' ')}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <p className="text-base whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                                    {/* Reference */}
                                    {msg.references_content && (
                                        <div className="mt-2 pl-3 border-l-2 border-slate-300 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300">
                                            <CornerDownRight size={14} className="inline mr-1" />
                                            {msg.references_content}
                                        </div>
                                    )}

                                    {/* Timestamp */}
                                    <div className="text-xs text-slate-400 mt-2">
                                        {formatTimestamp(msg.created_at)}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-neutral-500">
                        <MessageSquare size={48} className="mb-2 opacity-20" />
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            {thread.status !== 'CLOSED' && canSendMessage && (
                <div className="border-t border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    {/* File Preview */}
                    {attachedFile && (
                        <div className="px-4 pt-3 pb-2">
                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-neutral-800 rounded-lg p-2">
                                <Paperclip size={16} className="text-slate-500 dark:text-neutral-400" />
                                <span className="text-sm text-slate-700 dark:text-neutral-300 flex-1 truncate">{attachedFile.name}</span>
                                <span className="text-xs text-slate-500 dark:text-neutral-400">{(attachedFile.size / 1024).toFixed(1)} KB</span>
                                <button
                                    onClick={handleRemoveFile}
                                    className="p-1 hover:bg-slate-200 rounded-full"
                                >
                                    <X size={16} className="text-slate-500" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="px-2 sm:px-4 py-2">
                        <div className="flex items-center gap-1 sm:gap-2">
                            {/* File Attachment Button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full transition-colors flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
                                title="Attach file"
                            >
                                <Paperclip size={20} />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileSelect}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                            />

                            {/* Input */}
                            <input
                                type="text"
                                value={messageContent}
                                onChange={(e) => setMessageContent(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder="Type a message"
                                className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                            />

                            {/* Send Button */}
                            <button
                                onClick={handleSendMessage}
                                disabled={(!messageContent.trim() && !attachedFile) || isSending || isUploading}
                                className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
                            >
                                {isUploading ? (
                                    <div className="w-[18px] h-[18px] border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Send size={18} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Closed Thread Notice */}
            {thread.status === 'CLOSED' && (
                <div className="p-4 bg-slate-100 dark:bg-neutral-800 border-t border-slate-200 dark:border-neutral-700 text-center text-sm text-slate-500 dark:text-neutral-400">
                    <CheckCircle className="inline-block mr-2 text-green-500" size={16} />
                    This thread was closed on {formatTimestamp(thread.closed_at)}
                </div>
            )}

            {/* Add Participants Modal */}
            {showAddParticipants && (
                <AddParticipantsModal
                    thread={thread}
                    onClose={() => setShowAddParticipants(false)}
                    onAdded={(updatedThread) => {
                        setShowAddParticipants(false);
                        onMessageSent();
                    }}
                />
            )}
            {/* Participants Modal */}
            <AnimatePresence>
                {showParticipants && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]"
                        onClick={() => setShowParticipants(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-sm max-h-[70vh] flex flex-col overflow-hidden border dark:border-neutral-700"
                        >
                            <div className="flex items-center justify-between p-4 border-b dark:border-neutral-700">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Users size={18} className="text-primary-600" />
                                    Participants ({thread.participants?.length || 0})
                                </h3>
                                <button
                                    onClick={() => setShowParticipants(false)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-slate-600 dark:text-neutral-300"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="overflow-y-auto p-4 space-y-3">
                                {thread.participants?.map((p) => (
                                    <div key={p.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-lg">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-neutral-300">
                                            {p.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-slate-900 dark:text-white">{p.full_name}</div>
                                            <div className="text-xs text-slate-500 dark:text-neutral-400 capitalize">{p.role?.replace(/_/g, ' ')}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div >
    );
};

export default ThreadDetail;
