/**
 * ThreadList Component - Displays list of communication threads
 * Formal, government-style list with status indicators
 * 
 * OPTIMIZED: Readable design with balanced proportions
 */
import {
    MessageSquare, AlertTriangle, CheckCircle,
    Lock, Gavel, MessageCircle, Users,
    Pin, BellOff
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ThreadList = ({ threads, selectedThread, onSelect, isLoading }) => {
    const { user } = useAuth();

    /**
     * Get display name for thread - shows OTHER participant for DMs
     * This ensures Kedar sees "Sahil" and Sahil sees "Kedar"
     */
    const getDisplayName = (thread) => {
        // For Direct Messages, show the OTHER person's name
        if (thread.thread_type === 'DIRECT_MESSAGE' && thread.participants) {
            const otherParticipant = thread.participants.find(p => p.id !== user?.id);
            if (otherParticipant) {
                return otherParticipant.full_name || otherParticipant.username || 'User';
            }
        }
        // For all other types, show the subject
        return thread.subject || 'Untitled Thread';
    };

    const getTypeIcon = (type) => {
        const iconClass = "flex-shrink-0";
        switch (type) {
            case 'DIRECT_MESSAGE':
                return <MessageCircle size={16} className={`${iconClass} text-indigo-500`} />;
            case 'GROUP_CHAT':
                return <Users size={16} className={`${iconClass} text-purple-500`} />;
            case 'INTERNAL_NOTE':
                return <Lock size={16} className={`${iconClass} text-slate-500 dark:text-neutral-400`} />;
            case 'RULING':
                return <Gavel size={16} className={`${iconClass} text-red-500`} />;
            case 'CLARIFICATION':
                return <AlertTriangle size={16} className={`${iconClass} text-amber-500`} />;
            default:
                return <MessageSquare size={16} className={`${iconClass} text-blue-500`} />;
        }
    };

    const getTypeBorderColor = (type) => {
        switch (type) {
            case 'DIRECT_MESSAGE': return 'border-l-indigo-500';
            case 'GROUP_CHAT': return 'border-l-purple-500';
            case 'CLARIFICATION': return 'border-l-amber-500';
            case 'INTERNAL_NOTE': return 'border-l-slate-400 dark:border-l-neutral-500';
            case 'RULING': return 'border-l-red-500';
            default: return 'border-l-blue-500';
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (messageDate.getTime() === today.getTime()) {
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } else if (messageDate.getTime() === yesterday.getTime()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        }
    };

    if (isLoading) {
        return (
            <div className="p-3 space-y-2">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="animate-pulse">
                        <div className="h-16 bg-slate-200 dark:bg-neutral-700 rounded-lg"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (threads.length === 0) {
        return (
            <div className="p-6 text-center text-slate-400 dark:text-neutral-500">
                <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-base font-medium">No threads found</p>
                <p className="text-sm mt-1">Create a new thread to start</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {threads.map((thread) => (
                <div
                    key={thread.id}
                    onClick={() => onSelect(thread)}
                    className={`
                        px-3 py-3 cursor-pointer transition-colors duration-100
                        hover:bg-slate-50 dark:hover:bg-neutral-800/50
                        ${selectedThread?.id === thread.id
                            ? 'bg-primary-50 dark:bg-primary-900/20 border-l-3 border-l-primary-500'
                            : `bg-app-card border-l-3 ${getTypeBorderColor(thread.thread_type)}`
                        }
                    `}
                >
                    <div className="flex items-start gap-3">
                        {/* Avatar/Icon */}
                        <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                            ${thread.thread_type === 'GROUP_CHAT' ? 'bg-purple-100 dark:bg-purple-900/30' :
                                thread.thread_type === 'DIRECT_MESSAGE' ? 'bg-indigo-100 dark:bg-indigo-900/30' :
                                    thread.thread_type === 'INTERNAL_NOTE' ? 'bg-slate-100 dark:bg-neutral-700' :
                                        'bg-blue-100 dark:bg-blue-900/30'}
                        `}>
                            {getTypeIcon(thread.thread_type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 overflow-hidden">
                            {/* Row 1: Subject + Time */}
                            <div className="flex items-center justify-between gap-2">
                                <h3 className={`text-sm font-semibold truncate flex-1 ${selectedThread?.id === thread.id
                                    ? 'text-primary-700 dark:text-primary-400'
                                    : 'text-slate-800 dark:text-white'
                                    }`}>
                                    {getDisplayName(thread)}
                                </h3>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {thread.unread_count > 0 && (
                                        <span className="min-w-[20px] h-5 px-1.5 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                            {thread.unread_count > 99 ? '99+' : thread.unread_count}
                                        </span>
                                    )}
                                    <span className="text-xs text-slate-400 dark:text-neutral-500">
                                        {formatDate(thread.updated_at)}
                                    </span>
                                </div>
                            </div>

                            {/* Row 2: Preview */}
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    {thread.last_message_preview ? (
                                        <p className="text-sm text-slate-500 dark:text-neutral-400 truncate">
                                            <span className="font-medium text-slate-600 dark:text-neutral-300">
                                                {thread.last_message_preview.sender}:
                                            </span>{' '}
                                            {thread.last_message_preview.content}
                                        </p>
                                    ) : (
                                        <p className="text-sm italic text-slate-400 dark:text-neutral-500">No messages yet</p>
                                    )}
                                </div>

                                {/* Status Icons */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {thread.is_pinned && <Pin size={12} fill="currentColor" className="text-blue-500" />}
                                    {thread.is_muted && <BellOff size={12} className="text-amber-500" />}
                                    {thread.status === 'ESCALATED' && <AlertTriangle size={12} className="text-red-500" />}
                                    {thread.status === 'CLOSED' && <CheckCircle size={12} className="text-green-500" />}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ThreadList;
