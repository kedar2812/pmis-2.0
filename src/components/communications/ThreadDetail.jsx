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
    X, Send, Clock, User, Gavel, Lock, AlertTriangle,
    CheckCircle, ChevronDown, CornerDownRight
} from 'lucide-react';
import Button from '@/components/ui/Button';

const ThreadDetail = ({ thread, onMessageSent, onClose }) => {
    const { user } = useAuth();
    const [messageContent, setMessageContent] = useState('');
    const [messageType, setMessageType] = useState('STANDARD');
    const [isSending, setIsSending] = useState(false);
    const [showTypeMenu, setShowTypeMenu] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thread?.messages]);

    // Permission checks
    const canSendMessage = ['SPV_Official', 'PMNC_Team', 'Nodal_Officer', 'EPC_Contractor', 'Consultant', 'Govt_Official'].includes(user?.role);
    const canIssueRuling = user?.role === 'SPV_Official';
    const canRequestClarification = ['SPV_Official', 'PMNC_Team', 'Nodal_Officer', 'Govt_Official'].includes(user?.role);
    const canCloseThread = ['SPV_Official', 'PMNC_Team', 'Nodal_Officer'].includes(user?.role);

    const handleSendMessage = async () => {
        if (!messageContent.trim()) return;

        setIsSending(true);
        try {
            await client.post(`/communications/threads/${thread.id}/send_message/`, {
                content: messageContent,
                message_type: messageType
            });
            setMessageContent('');
            setMessageType('STANDARD');
            onMessageSent();
            toast.success('Message sent');
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error(error.response?.data?.error || 'Failed to send message');
        } finally {
            setIsSending(false);
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

    const getMessageStyles = (msg) => {
        const isOwn = msg.sender === user?.id;
        let baseStyles = 'rounded-lg p-4 max-w-[80%] break-words';

        switch (msg.message_type) {
            case 'RULING':
                return `${baseStyles} bg-red-50 border-2 border-red-400 text-red-900`;
            case 'INTERNAL':
                return `${baseStyles} bg-slate-100 border border-slate-300 text-slate-700`;
            case 'CLARIFICATION_REQUEST':
                return `${baseStyles} bg-amber-50 border border-amber-300 text-amber-900`;
            case 'CLARIFICATION_RESPONSE':
                return `${baseStyles} bg-amber-50/50 border border-amber-200 text-amber-800`;
            default:
                return `${baseStyles} ${isOwn ? 'bg-primary-50 border border-primary-200 ml-auto' : 'bg-white border border-slate-200'}`;
        }
    };

    const getMessageTypeLabel = (type) => {
        switch (type) {
            case 'RULING': return { label: 'RULING', icon: Gavel, color: 'text-red-600' };
            case 'INTERNAL': return { label: 'INTERNAL NOTE', icon: Lock, color: 'text-slate-600' };
            case 'CLARIFICATION_REQUEST': return { label: 'CLARIFICATION REQUESTED', icon: AlertTriangle, color: 'text-amber-600' };
            case 'CLARIFICATION_RESPONSE': return { label: 'CLARIFICATION RESPONSE', icon: CornerDownRight, color: 'text-amber-600' };
            default: return null;
        }
    };

    const formatTimestamp = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const messageTypeOptions = [
        { value: 'STANDARD', label: 'Standard Message', enabled: true },
        { value: 'CLARIFICATION_REQUEST', label: 'Request Clarification', enabled: canRequestClarification },
        { value: 'CLARIFICATION_RESPONSE', label: 'Respond to Clarification', enabled: true },
        { value: 'RULING', label: 'Issue Ruling', enabled: canIssueRuling },
        { value: 'INTERNAL', label: 'Internal Note', enabled: ['SPV_Official', 'PMNC_Team', 'Nodal_Officer', 'Govt_Official'].includes(user?.role) },
    ].filter(opt => opt.enabled);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{thread.subject}</h2>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                                <User size={14} />
                                {thread.initiated_by_name}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-200 rounded text-xs uppercase font-medium">
                                {thread.thread_type?.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs uppercase font-bold ${thread.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                                    thread.status === 'ESCALATED' ? 'bg-red-100 text-red-700' :
                                        thread.status === 'CLOSED' ? 'bg-green-100 text-green-700' :
                                            'bg-amber-100 text-amber-700'
                                }`}>
                                {thread.status?.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {thread.status !== 'CLOSED' && canCloseThread && (
                            <Button variant="outline" size="sm" onClick={handleCloseThread}>
                                <CheckCircle size={16} className="mr-1" /> Close
                            </Button>
                        )}
                        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100/50">
                {thread.messages?.map((msg, index) => {
                    const typeInfo = getMessageTypeLabel(msg.message_type);
                    const isOwn = msg.sender === user?.id;

                    return (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                        >
                            {/* Type Badge */}
                            {typeInfo && (
                                <div className={`flex items-center gap-1 text-xs font-bold mb-1 ${typeInfo.color}`}>
                                    <typeInfo.icon size={12} />
                                    {typeInfo.label}
                                </div>
                            )}

                            {/* Message Bubble */}
                            <div className={getMessageStyles(msg)}>
                                {/* Sender Info */}
                                <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
                                    <span className="font-semibold text-slate-700">{msg.sender_name}</span>
                                    <span className="px-1.5 py-0.5 bg-slate-200/80 rounded text-[10px] uppercase">
                                        {msg.sender_role?.replace('_', ' ')}
                                    </span>
                                </div>

                                {/* Content */}
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                                {/* Reference */}
                                {msg.references_content && (
                                    <div className="mt-2 p-2 bg-slate-100 rounded text-xs text-slate-500 border-l-2 border-slate-300">
                                        <span className="font-medium">Re:</span> {msg.references_content}
                                    </div>
                                )}

                                {/* Timestamp */}
                                <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                                    <Clock size={10} />
                                    {formatTimestamp(msg.created_at)}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            {thread.status !== 'CLOSED' && canSendMessage && (
                <div className="p-4 border-t border-slate-200 bg-white">
                    {/* Message Type Selector */}
                    <div className="mb-2 relative">
                        <button
                            onClick={() => setShowTypeMenu(!showTypeMenu)}
                            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100"
                        >
                            <span className="font-medium">
                                {messageTypeOptions.find(o => o.value === messageType)?.label || 'Standard Message'}
                            </span>
                            <ChevronDown size={14} />
                        </button>

                        <AnimatePresence>
                            {showTypeMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[200px] z-10"
                                >
                                    {messageTypeOptions.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                setMessageType(opt.value);
                                                setShowTypeMenu(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${messageType === opt.value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-slate-700'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Input */}
                    <div className="flex gap-2">
                        <textarea
                            value={messageContent}
                            onChange={(e) => setMessageContent(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 px-4 py-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                            rows={3}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey) {
                                    handleSendMessage();
                                }
                            }}
                        />
                        <Button
                            onClick={handleSendMessage}
                            disabled={!messageContent.trim() || isSending}
                            className="self-end"
                        >
                            <Send size={18} />
                        </Button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Press Ctrl+Enter to send</p>
                </div>
            )}

            {/* Closed Thread Notice */}
            {thread.status === 'CLOSED' && (
                <div className="p-4 bg-slate-100 border-t border-slate-200 text-center text-sm text-slate-500">
                    <CheckCircle className="inline-block mr-2 text-green-500" size={16} />
                    This thread was closed on {formatTimestamp(thread.closed_at)}
                </div>
            )}
        </div>
    );
};

export default ThreadDetail;
