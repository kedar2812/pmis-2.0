/**
 * ThreadList Component - Displays list of communication threads
 * Formal, government-style list with status indicators
 */
import { motion } from 'framer-motion';
import {
    MessageSquare, Clock, AlertTriangle, CheckCircle,
    Lock, Gavel, ChevronRight, User, MessageCircle, Users,
    Pin, BellOff
} from 'lucide-react';

const ThreadList = ({ threads, selectedThread, onSelect, isLoading }) => {

    const getStatusIcon = (status) => {
        switch (status) {
            case 'OPEN':
                return <Clock className="text-blue-500" size={16} />;
            case 'PENDING_RESPONSE':
                return <Clock className="text-amber-500" size={16} />;
            case 'ESCALATED':
                return <AlertTriangle className="text-red-500" size={16} />;
            case 'CLOSED':
                return <CheckCircle className="text-green-500" size={16} />;
            default:
                return <MessageSquare className="text-slate-400" size={16} />;
        }
    };

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
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    if (isLoading) {
        return (
            <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="animate-pulse">
                        <div className="h-20 bg-slate-200 rounded-lg"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (threads.length === 0) {
        return (
            <div className="p-8 text-center text-slate-400">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No threads found</p>
                <p className="text-sm mt-1">Create a new thread to start communicating</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-slate-200">
            {threads.map((thread, index) => (
                <motion.div
                    key={thread.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onSelect(thread)}
                    className={`
                        p-4 cursor-pointer transition-all duration-200
                        hover:bg-white hover:shadow-md
                        ${selectedThread?.id === thread.id ? 'bg-white shadow-md' : 'bg-slate-50'}
                        ${getTypeStyles(thread.thread_type)}
                    `}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getStatusIcon(thread.status)}
                            <h3 className="font-semibold text-slate-800 truncate text-sm">
                                {thread.subject}
                            </h3>
                            {thread.is_pinned && (
                                <Pin size={14} fill="currentColor" className="text-primary-600 flex-shrink-0" title="Pinned" />
                            )}
                            {thread.is_muted && (
                                <BellOff size={14} className="text-amber-600 flex-shrink-0" title="Muted" />
                            )}
                            {getTypeIcon(thread.thread_type)}
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                            {formatDate(thread.created_at)}
                        </span>
                    </div>

                    {/* Meta */}
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <User size={12} />
                            {thread.initiated_by_name}
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-200 rounded text-xs uppercase font-medium">
                            {thread.initiated_by_role?.replace('_', ' ')}
                        </span>
                        <span className="ml-auto flex items-center gap-1">
                            <MessageSquare size={12} />
                            {thread.message_count || 0}
                        </span>
                    </div>

                    {/* Preview */}
                    {thread.last_message_preview && (
                        <p className="mt-2 text-xs text-slate-600 line-clamp-2">
                            <span className="font-medium">{thread.last_message_preview.sender}:</span>{' '}
                            {thread.last_message_preview.content}
                        </p>
                    )}

                    {/* SLA Warning */}
                    {thread.status === 'ESCALATED' && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-red-600 font-medium">
                            <AlertTriangle size={12} />
                            SLA Breached - Escalated
                        </div>
                    )}
                </motion.div>
            ))}
        </div>
    );
};

export default ThreadList;
