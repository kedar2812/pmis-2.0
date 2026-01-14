/**
 * Communications Page - Main container for the Messaging Center
 * Government-grade, formal UI - no informal styling or chat app metaphors
 * 
 * Mobile Responsive Design:
 * - Desktop: Two-column layout (thread list + detail)
 * - Mobile: Single view toggle (list OR detail with back button)
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import client from '@/api/client';
import { toast } from 'sonner';
import {
    MessageSquare, Filter, Search, Plus, Bell, ChevronRight,
    Clock, AlertTriangle, CheckCircle, Lock, Gavel, FileText,
    ArrowLeft, Menu
} from 'lucide-react';
import Button from '@/components/ui/Button';
import ThreadList from '@/components/communications/ThreadList';
import ThreadDetail from '@/components/communications/ThreadDetail';
import NewThreadModal from '@/components/communications/NewThreadModal';
import StartChatModal from '@/components/communications/StartChatModal';

import { useParams, useNavigate } from 'react-router-dom';

const Communications = () => {
    const { threadId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useLanguage();
    const [threads, setThreads] = useState([]);
    const [selectedThread, setSelectedThread] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showNewThread, setShowNewThread] = useState(false);
    const [showStartChat, setShowStartChat] = useState(false);
    const [filters, setFilters] = useState({
        status: '',
        type: '',
        search: ''
    });
    const [stats, setStats] = useState({
        open: 0,
        pending: 0,
        escalated: 0
    });

    // Mobile responsive state
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // Track viewport size for responsive behavior
    const checkMobile = useCallback(() => {
        setIsMobile(window.innerWidth < 768);
    }, []);

    useEffect(() => {
        checkMobile();

        let timeoutId;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(checkMobile, 100);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, [checkMobile]);

    // Initial load and URL param handling
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                // Fetch all threads first
                const params = new URLSearchParams();
                if (filters.status) params.append('status', filters.status);
                if (filters.type) params.append('type', filters.type);

                const res = await client.get(`/communications/threads/?${params.toString()}`);
                const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setThreads(data);

                // Calculate stats
                setStats({
                    open: data.filter(t => t.status === 'OPEN').length,
                    pending: data.filter(t => t.status === 'PENDING_RESPONSE').length,
                    escalated: data.filter(t => t.status === 'ESCALATED').length
                });

                // If threadId is provided in URL, fetch and select it
                if (threadId) {
                    try {
                        const threadRes = await client.get(`/communications/threads/${threadId}/`);
                        setSelectedThread(threadRes.data);
                    } catch (error) {
                        console.error('Failed to load deep-linked thread:', error);
                        toast.error('Thread not found or access denied');
                        navigate('/communications'); // Fallback
                    }
                }
            } catch (error) {
                console.error('Failed to fetch threads:', error);
                toast.error('Failed to load communications');
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, [filters.status, filters.type, threadId]); // Re-run if filters or ID change

    const fetchThreads = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.type) params.append('type', filters.type);

            const res = await client.get(`/communications/threads/?${params.toString()}`);
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setThreads(data);

            // Calculate stats
            setStats({
                open: data.filter(t => t.status === 'OPEN').length,
                pending: data.filter(t => t.status === 'PENDING_RESPONSE').length,
                escalated: data.filter(t => t.status === 'ESCALATED').length
            });
        } catch (error) {
            console.error('Failed to fetch threads:', error);
            // Don't toast on silent poll failure to avoid spamming user
            if (!silent) toast.error('Failed to load communications');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    // Poll for sidebar updates (new threads, unread counts, sorting)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchThreads(true); // Silent poll
        }, 2000);
        return () => clearInterval(interval);
    }, [filters]); // Re-create interval if filters change

    const handleThreadSelect = async (thread) => {
        try {
            const res = await client.get(`/communications/threads/${thread.id}/`);
            setSelectedThread(res.data);

            // Optimistically mark as read in the local list list momentarily
            // The real sync happens when ThreadDetail triggers onThreadRead
            setThreads(prev => prev.map(t =>
                t.id === thread.id ? { ...t, unread_count: 0 } : t
            ));
        } catch (error) {
            console.error('Failed to load thread:', error);
            toast.error('Failed to load conversation');
        }
    };

    // Mobile back button handler
    const handleMobileBack = () => {
        setSelectedThread(null);
    };

    const handleThreadCreated = (newThread) => {
        setShowNewThread(false);
        fetchThreads();
        setSelectedThread(newThread);
    };

    const handleMessageSent = () => {
        // Refresh the selected thread
        if (selectedThread) {
            handleThreadSelect(selectedThread);
        }
    };

    // Real-time updates: Poll for new messages every 3 seconds
    useEffect(() => {
        if (!selectedThread) return;

        const pollInterval = setInterval(async () => {
            try {
                // Silent fetch to update messages without showing loading state
                const res = await client.get(`/communications/threads/${selectedThread.id}/`);

                // Only update if there are changes (optimization)
                // For now, simpler to just update the state to ensure new messages appear
                setSelectedThread(prev => {
                    // Prevent update if user closed thread in the meantime
                    if (!prev || prev.id !== res.data.id) return prev;

                    // Simple check to avoid unnecessary re-renders if nothing changed
                    // (Deep comparison would be better but this is a basic safe check)
                    if (JSON.stringify(prev.messages) === JSON.stringify(res.data.messages)) {
                        return prev;
                    }
                    return res.data;
                });
            } catch (error) {
                // Silent failure is intended here - don't disrupt user
                // Just log to console for debugging
                console.debug('Background poll failed:', error);
            }
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [selectedThread?.id]); // Re-run only when thread ID changes


    // Permission checks - Allow all authenticated users to initiate threads
    const canInitiateThread = !!user;

    // Determine what to show on mobile
    const showThreadListOnMobile = isMobile && !selectedThread;
    const showThreadDetailOnMobile = isMobile && selectedThread;

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-3 sm:p-4">
                {/* Title Row */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        {/* Mobile back button when viewing thread detail */}
                        {showThreadDetailOnMobile && (
                            <button
                                onClick={handleMobileBack}
                                className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
                                aria-label="Back to thread list"
                            >
                                <ArrowLeft size={24} className="text-slate-600" />
                            </button>
                        )}
                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
                                <MessageSquare className="text-primary-600 hidden sm:block flex-shrink-0" size={28} />
                                <span className="truncate">
                                    {showThreadDetailOnMobile && selectedThread
                                        ? selectedThread.subject || 'Conversation'
                                        : 'Communications'
                                    }
                                </span>
                            </h1>
                            <p className="text-slate-500 text-xs sm:text-sm mt-0.5 hidden sm:block">
                                Official, auditable communication system
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions Row - Only show when NOT viewing thread detail on mobile */}
                {!showThreadDetailOnMobile && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Stats Pills */}
                        <div className="flex gap-2">
                            <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                                {stats.open} Open
                            </span>
                            {stats.escalated > 0 && (
                                <span className="px-2 sm:px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1 whitespace-nowrap">
                                    <AlertTriangle size={14} /> {stats.escalated}
                                </span>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            {canInitiateThread && (
                                <Button
                                    onClick={() => setShowNewThread(true)}
                                    className="min-h-[40px] text-xs sm:text-sm px-3"
                                    size="sm"
                                >
                                    <FileText size={16} className="sm:mr-1" />
                                    <span className="hidden sm:inline">New Thread</span>
                                </Button>
                            )}
                            <Button
                                onClick={() => setShowStartChat(true)}
                                className="min-h-[40px] text-xs sm:text-sm px-3"
                                size="sm"
                            >
                                <MessageSquare size={16} className="sm:mr-1" />
                                <span className="hidden sm:inline">Chat</span>
                            </Button>
                        </div>
                    </div>
                )}

                {/* Filters - Collapsible on mobile */}
                {!showThreadDetailOnMobile && (
                    <div className="mt-3 sm:mt-4">
                        {/* Mobile filter toggle */}
                        <button
                            onClick={() => setShowMobileFilters(!showMobileFilters)}
                            className="sm:hidden flex items-center gap-2 text-sm text-slate-600 mb-2"
                        >
                            <Filter size={16} />
                            {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
                        </button>

                        {/* Filter controls */}
                        <div className={`flex-col sm:flex-row gap-3 sm:gap-4 ${showMobileFilters ? 'flex' : 'hidden sm:flex'}`}>
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search threads..."
                                    className="w-full pl-10 pr-4 py-2 min-h-[44px] border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-2 sm:gap-4">
                                <select
                                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 min-h-[44px] border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                >
                                    <option value="">All Status</option>
                                    <option value="OPEN">Open</option>
                                    <option value="PENDING_RESPONSE">Pending</option>
                                    <option value="ESCALATED">Escalated</option>
                                    <option value="CLOSED">Closed</option>
                                </select>
                                <select
                                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 min-h-[44px] border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    value={filters.type}
                                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                >
                                    <option value="">All Types</option>
                                    <option value="DISCUSSION">Discussion</option>
                                    <option value="CLARIFICATION">Clarification</option>
                                    <option value="INTERNAL_NOTE">Internal</option>
                                    <option value="RULING">Ruling</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content - Responsive Layout */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Desktop: Always show both panels */}
                {/* Mobile: Show one panel at a time */}

                {/* Thread List Panel */}
                <div
                    className={`
                        ${isMobile
                            ? (showThreadListOnMobile ? 'w-full' : 'hidden')
                            : 'w-[320px] lg:w-[380px]'
                        }
                        border-r border-slate-200 bg-slate-50 overflow-y-auto
                        transition-all duration-200
                    `}
                >
                    <ThreadList
                        threads={threads}
                        selectedThread={selectedThread}
                        onSelect={handleThreadSelect}
                        isLoading={isLoading}
                    />
                </div>

                {/* Thread Detail Panel */}
                <div
                    className={`
                        ${isMobile
                            ? (showThreadDetailOnMobile ? 'w-full' : 'hidden')
                            : 'flex-1'
                        }
                        bg-white overflow-hidden
                    `}
                >
                    {selectedThread ? (
                        <ThreadDetail
                            thread={selectedThread}
                            onMessageSent={handleMessageSent}
                            onClose={handleMobileBack}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4">
                            <MessageSquare size={64} className="opacity-30 mb-4" />
                            <p className="text-lg text-center">Select a thread to view</p>
                            <p className="text-sm mt-1 text-center">or create a new communication thread</p>
                        </div>
                    )}
                </div>
            </div>

            {/* New Thread Modal */}
            {showNewThread && (
                <NewThreadModal
                    onClose={() => setShowNewThread(false)}
                    onCreated={handleThreadCreated}
                />
            )}

            {/* Start Chat Modal */}
            {showStartChat && (
                <StartChatModal
                    onClose={() => setShowStartChat(false)}
                    onCreated={handleThreadCreated}
                />
            )}
        </div>
    );
};

export default Communications;
