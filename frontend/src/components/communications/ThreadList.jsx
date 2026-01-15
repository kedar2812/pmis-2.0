/**
 * ThreadList Component - Displays list of communication threads
 * Formal, government-style list with status indicators
 */
import { motion } from 'framer-motion';
import {
    MessageSquare, AlertTriangle, CheckCircle,
    Lock, Gavel, MessageCircle, Users,
    Pin, BellOff
} from 'lucide-react';

const ThreadList = ({ threads, selectedThread, onSelect, isLoading }) => {



    const getTypeStyles = (type) => {
        switch (type) {
            case 'DIRECT_MESSAGE':
                return 'border-l-4 border-l-indigo-500';
            case 'GROUP_CHAT':
                return 'border-l-4 border-l-purple-500';
            case 'CLARIFICATION':
                return 'border-l-4 border-l-amber-500 bg-amber-50/50';
            case 'INTERNAL_NOTE':
                return 'border-l-4 border-l-slate-500 bg-slate-100';
            case 'RULING':
                return 'border-l-4 border-l-red-500 bg-red-50/50';
            default:
                return 'border-l-4 border-l-blue-500';
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'DIRECT_MESSAGE':
                return <MessageCircle size={14} className="text-indigo-600" />;
            case 'GROUP_CHAT':
                return <Users size={14} className="text-purple-600" />;
            case 'INTERNAL_NOTE':
                return <Lock size={14} className="text-slate-500" />;
            case 'RULING':
                return <Gavel size={14} className="text-red-600" />;
            case 'CLARIFICATION':
                return <AlertTriangle size={14} className="text-amber-600" />;
            default:
                return null;
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';

        // Ensure robust parsing by creating Date object
        const date = new Date(dateStr);
        const now = new Date();

        // Reset times for date comparison
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        // WhatsApp Style Logic
        if (messageDate.getTime() === today.getTime()) {
            // Today: Show Time (e.g., 10:30 AM)
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } else if (messageDate.getTime() === yesterday.getTime()) {
            // Yesterday: Show "Yesterday"
            return 'Yesterday';
        } else {
            // Older: Show Date (e.g., 24/12/24)
            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: '2-digit' });
        }
    };

    if (isLoading) {
        return (
            <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="animate-pulse">
                        <div className="h-20 bg-slate-200 dark:bg-neutral-700 rounded-lg"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (threads.length === 0) {
        return (
            <div className="p-8 text-center text-slate-400 dark:text-neutral-500">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No threads found</p>
                <p className="text-sm mt-1">Create a new thread to start communicating</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {threads.map((thread, index) => (
                <motion.div
                    key={thread.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onSelect(thread)}
                    className={`
                        p-4 cursor-pointer transition-all duration-200
                        hover:bg-slate-50 dark:hover:bg-neutral-800
                        ${selectedThread?.id === thread.id ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'bg-white dark:bg-neutral-900'}
                        border-l-4 ${getTypeStyles(thread.thread_type).split(' ')[0]}
                    `}
                >
                    <div className="flex items-start gap-3">
                        {/* Avatar / Icon */}
                        <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                            ${thread.thread_type === 'GROUP_CHAT' ? 'bg-purple-100 text-purple-600' :
                                thread.thread_type === 'DIRECT_MESSAGE' ? 'bg-indigo-100 text-indigo-600' :
                                    thread.thread_type === 'INTERNAL_NOTE' ? 'bg-slate-100 text-slate-600' :
                                        'bg-blue-100 text-blue-600'}
                        `}>
                            {getTypeIcon(thread.thread_type) || <MessageSquare size={18} />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            {/* Top Row: Title + Date */}
                            <div className="flex justify-between items-start mb-0.5">
                                <h3 className={`font-semibold truncate text-sm pr-2 ${selectedThread?.id === thread.id ? 'text-primary-700 dark:text-primary-400' : 'text-slate-800 dark:text-white'
                                    }`}>
                                    {thread.subject}
                                </h3>
                                <span className="text-[10px] text-slate-400 dark:text-neutral-500 whitespace-nowrap flex-shrink-0 mt-0.5">
                                    {formatDate(thread.updated_at)}
                                </span>
                            </div>

                            {/* Bottom Row: Last Message + Icons */}
                            <div className="flex justify-between items-end gap-2">
                                <p className="text-xs text-slate-500 truncate min-h-[1.25em]">
                                    {thread.last_message_preview ? (
                                        <>
                                            <span className="font-medium text-slate-700">
                                                {thread.last_message_preview.sender}:
                                            </span> {thread.last_message_preview.content}
                                        </>
                                    ) : (
                                        <span className="italic text-slate-400">No messages yet</span>
                                    )}
                                </p>

                                {/* Icons Row */}
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {thread.unread_count > 0 && (
                                        <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 bg-blue-500 text-white text-[10px] font-bold rounded-full">
                                            {thread.unread_count}
                                        </span>
                                    )}
                                    {thread.is_pinned && <Pin size={12} fill="currentColor" className="text-blue-500" />}
                                    {thread.is_muted && <BellOff size={12} className="text-amber-500" />}
                                    {thread.status === 'CLOSED' && <CheckCircle size={12} className="text-green-500" />}
                                    {thread.status === 'ESCALATED' && <AlertTriangle size={12} className="text-red-500" />}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default ThreadList;
