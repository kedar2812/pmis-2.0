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
    CheckCircle, ChevronDown, CornerDownRight, FolderOpen, FileText, Download,
    User, Send, Clock, Gavel, Lock, AlertTriangle, X, File,
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
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    /**
     * Get display name for thread - shows OTHER participant for DMs
     * This ensures each user sees the other person's name, not their own
     */
    const getDisplayName = () => {
        if (!thread) return 'Chat';
        // For Direct Messages, show the OTHER person's name
        if (thread.thread_type === 'DIRECT_MESSAGE' && thread.participants) {
            const otherParticipant = thread.participants.find(p => p.id !== user?.id);
            if (otherParticipant) {
                return otherParticipant.full_name || otherParticipant.username || 'User';
            }
        }
        // For all other types, show the subject
        return thread.subject || 'Thread';
    };

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

    // File handling - supports multiple files
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setAttachedFiles(prev => [...prev, ...files]);
        }
        // Reset input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveFile = (index) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleClearAllFiles = () => {
        setAttachedFiles([]);
    };

    const handleSendMessage = async () => {
        if (!messageContent.trim() && attachedFiles.length === 0) return;

        setIsSending(true);
        try {
            let attachmentIds = [];

            // Upload all files first
            if (attachedFiles.length > 0) {
                setIsUploading(true);

                // Upload each file and collect IDs
                for (const file of attachedFiles) {
                    const formData = new FormData();
                    formData.append('file', file);

                    const uploadRes = await client.post('/communications/attachments/upload/', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    attachmentIds.push(uploadRes.data.id);
                }
                setIsUploading(false);
            }

            // Send message
            const payload = {
                content: messageContent || `📎 ${attachedFiles.length} file(s) attached`,
                message_type: 'STANDARD'
            };

            if (attachmentIds.length > 0) {
                payload.attachment_ids = attachmentIds;
            }

            await client.post(`/communications/threads/${thread.id}/send_message/`, payload);

            setMessageContent('');
            setAttachedFiles([]);
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
        let baseStyles = 'rounded-xl px-4 py-3 max-w-[75%] break-words';

        switch (msg.message_type) {
            case 'RULING':
                return `${baseStyles} bg-yellow-50 border-l-3 border-yellow-500 dark:bg-yellow-900/20 dark:border-yellow-600 dark:text-yellow-100`;
            case 'CLARIFICATION_REQUEST':
                return `${baseStyles} bg-blue-50 border-l-3 border-blue-500 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-100`;
            case 'CLARIFICATION_RESPONSE':
                return `${baseStyles} bg-green-50 border-l-3 border-green-500 dark:bg-green-900/20 dark:border-green-600 dark:text-green-100`;
            case 'INTERNAL_NOTE':
                return `${baseStyles} bg-purple-50 border-l-3 border-purple-500 dark:bg-purple-900/20 dark:border-purple-600 dark:text-purple-100`;
            default:
                return isOwn
                    ? `${baseStyles} bg-primary-600 text-white ml-auto`
                    : `${baseStyles} bg-slate-100 text-slate-900 dark:bg-neutral-800 dark:text-slate-200`;
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
            {/* Header - Single row with glassmorphism effect */}
            <div className="px-3 py-3 border-b border-white/20 dark:border-white/10 bg-gradient-to-r from-slate-100/90 via-white/80 to-slate-100/90 dark:from-neutral-800/90 dark:via-neutral-900/80 dark:to-neutral-800/90 backdrop-blur-md shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    {/* Title + Meta */}
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base font-bold text-slate-800 dark:text-white truncate">{getDisplayName()}</h2>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                            <span className="flex items-center gap-1">
                                <User size={12} />
                                {thread.participant_count}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {formatTimestamp(thread.created_at)}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${thread.status === 'OPEN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                thread.status === 'PENDING_RESPONSE' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                    thread.status === 'ESCALATED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                        'bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-gray-300'
                                }`}>
                                {thread.status}
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons - Inline */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            onClick={() => setShowParticipants(true)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300"
                            title="View Participants"
                        >
                            <Users size={16} />
                        </button>
                        <button
                            onClick={handlePin}
                            className={`p-1.5 rounded-lg ${isPinned ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300'}`}
                            title={isPinned ? 'Unpin' : 'Pin'}
                        >
                            <Pin size={16} fill={isPinned ? 'currentColor' : 'none'} />
                        </button>
                        <button
                            onClick={() => handleMute()}
                            className={`p-1.5 rounded-lg ${isMuted ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300'}`}
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? <BellOff size={16} /> : <Bell size={16} />}
                        </button>

                        {/* More Actions (group chats) */}
                        {thread.thread_type === 'GROUP' && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-neutral-700 rounded-lg text-slate-600 dark:text-neutral-300"
                                >
                                    <MoreVertical size={16} />
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

                        {/* Close Thread */}
                        {thread.status !== 'CLOSED' && canCloseThread && (
                            <Button variant="outline" size="sm" onClick={handleCloseThread} className="text-xs px-2 py-1 h-7">
                                <CheckCircle size={12} className="mr-1" /> Close
                            </Button>
                        )}

                        {/* Close Panel */}
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-lg text-slate-600 dark:text-neutral-300 ml-1"
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages - Compact Layout */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
                {thread.messages && thread.messages.length > 0 ? (
                    thread.messages.map((msg) => {
                        const isOwn = msg.sender === user?.id;

                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                                {/* Message Bubble */}
                                <div className={getMessageStyles(msg)}>
                                    {/* Sender + Role Row */}
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-sm font-semibold ${isOwn ? 'text-white/90' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {msg.sender_name}
                                        </span>
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${isOwn ? 'bg-white/20 text-white/80' : 'bg-slate-200/80 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}>
                                            {msg.sender_role?.replace('_', ' ')}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <p className={`text-base whitespace-pre-wrap leading-relaxed ${isOwn ? 'text-white' : ''}`}>{msg.content}</p>

                                    {/* Attachments */}
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {msg.attachments.map((att) => (
                                                <button
                                                    key={att.id}
                                                    onClick={async (e) => {
                                                        e.preventDefault();
                                                        try {
                                                            // Download via authenticated API
                                                            const response = await client.get(
                                                                `/communications/attachments/${att.id}/download/`,
                                                                { responseType: 'blob' }
                                                            );
                                                            // Create blob URL and trigger download
                                                            const blob = new Blob([response.data], { type: att.content_type });
                                                            const url = window.URL.createObjectURL(blob);
                                                            const link = document.createElement('a');
                                                            link.href = url;
                                                            link.download = att.filename;
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                            window.URL.revokeObjectURL(url);
                                                        } catch (error) {
                                                            console.error('Download failed:', error);
                                                            toast.error('Failed to download file');
                                                        }
                                                    }}
                                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors cursor-pointer w-full text-left ${isOwn
                                                        ? 'bg-white/20 hover:bg-white/30 text-white'
                                                        : 'bg-slate-200 dark:bg-neutral-700 hover:bg-slate-300 dark:hover:bg-neutral-600 text-slate-700 dark:text-slate-200'
                                                        }`}
                                                >
                                                    <File size={14} />
                                                    <span className="text-sm flex-1 truncate">{att.filename}</span>
                                                    <span className="text-xs opacity-70">{formatFileSize(att.file_size)}</span>
                                                    <Download size={14} className="opacity-70" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Reference */}
                                    {msg.references_content && (
                                        <div className="mt-2 pl-3 border-l-2 border-slate-300 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300">
                                            <CornerDownRight size={14} className="inline mr-1" />
                                            {msg.references_content}
                                        </div>
                                    )}

                                    {/* Timestamp */}
                                    <div className={`text-xs mt-2 ${isOwn ? 'text-white/70' : 'text-slate-400'}`}>
                                        {formatTimestamp(msg.created_at)}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-neutral-500">
                        <MessageSquare size={40} className="mb-2 opacity-20" />
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Composer - Compact design for more message visibility */}
            {thread.status !== 'CLOSED' && canSendMessage && (
                <div className="border-t border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    {/* File Preview - Multiple files */}
                    {attachedFiles.length > 0 && (
                        <div className="px-3 pt-2 pb-1 space-y-1">
                            {attachedFiles.map((file, index) => (
                                <div key={index} className="flex items-center gap-2 bg-slate-100 dark:bg-neutral-800 rounded-lg px-2 py-1.5">
                                    <File size={14} className="text-slate-500 dark:text-neutral-400 flex-shrink-0" />
                                    <span className="text-xs text-slate-700 dark:text-neutral-300 flex-1 truncate">{file.name}</span>
                                    <span className="text-[10px] text-slate-500 dark:text-neutral-400 flex-shrink-0">{formatFileSize(file.size)}</span>
                                    <button
                                        onClick={() => handleRemoveFile(index)}
                                        className="p-0.5 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-full flex-shrink-0"
                                    >
                                        <X size={14} className="text-slate-500 dark:text-neutral-400" />
                                    </button>
                                </div>
                            ))}
                            {attachedFiles.length > 1 && (
                                <button
                                    onClick={handleClearAllFiles}
                                    className="text-xs text-red-500 hover:text-red-600 transition-colors"
                                >
                                    Clear all ({attachedFiles.length} files)
                                </button>
                            )}
                        </div>
                    )}

                    {/* Input Area - Compact */}
                    <div className="px-2 sm:px-3 py-1.5">
                        <div className="flex items-center gap-1">
                            {/* File Attachment Button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-1.5 text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full transition-colors flex-shrink-0"
                                title="Attach files (multiple allowed)"
                            >
                                <Paperclip size={18} />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileSelect}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip,.rar"
                                multiple
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
                                className="flex-1 min-w-0 px-3 py-1.5 border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                            />

                            {/* Send Button */}
                            <button
                                onClick={handleSendMessage}
                                disabled={(!messageContent.trim() && attachedFiles.length === 0) || isSending || isUploading}
                                className="p-1.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                            >
                                {isUploading ? (
                                    <div className="w-[16px] h-[16px] border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Send size={16} />
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
