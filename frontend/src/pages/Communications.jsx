/**
 * Communications Page - Main container for the Messaging Center
 * Government-grade, formal UI - no informal styling or chat app metaphors
 * 
 * Mobile Responsive Design:
 * - Desktop: Two-column layout (thread list + detail)
 * - Mobile: Single view toggle (list OR detail with back button)
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import client from '@/api/client';
import { toast } from 'sonner';
import { MessageSquare, Filter, Search, AlertTriangle, ArrowLeft, FileText } from 'lucide-react';
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
            {/* Header - Compact */}
            <div className="bg-app-card border-b border-app-subtle px-3 py-2 sm:px-4 sm:py-3">
                {/* Title + Actions Row */}
                <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Mobile back button when viewing thread detail */}
                        {showThreadDetailOnMobile && (
                            <button
                                onClick={handleMobileBack}
                                className="p-1.5 -ml-1 hover:bg-app-surface rounded-lg transition-colors flex-shrink-0"
                                aria-label="Back to thread list"
                            >
                                <ArrowLeft size={20} className="text-app-muted" />
                            </button>
                        )}
                        <h1 className="text-base sm:text-xl font-bold text-app-heading flex items-center gap-2 truncate">
                            <MessageSquare className="text-primary-600 dark:text-primary-400 hidden sm:block flex-shrink-0" size={22} />
                            <span className="truncate">
                                {showThreadDetailOnMobile && selectedThread
                                    ? selectedThread.subject || 'Conversation'
                                    : 'Communications'
                                }
                            </span>
                        </h1>
                    </div>

                    {/* Action Buttons - On same line as title */}
                    {!showThreadDetailOnMobile && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Stats Pills */}
                            <span className="hidden sm:inline-flex px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                                {stats.open} Open
                            </span>
                            {stats.escalated > 0 && (
                                <span className="hidden sm:inline-flex px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium items-center gap-1">
                                    <AlertTriangle size={12} /> {stats.escalated}
                                </span>
                            )}
                            {canInitiateThread && (
                                <Button
                                    onClick={() => setShowNewThread(true)}
                                    className="text-xs px-2 py-1.5"
                                    size="sm"
                                >
                                    <FileText size={14} className="sm:mr-1" />
                                    <span className="hidden sm:inline">New</span>
                                </Button>
                            )}
                            <Button
                                onClick={() => setShowStartChat(true)}
                                className="text-xs px-2 py-1.5"
                                size="sm"
                            >
                                <MessageSquare size={14} className="sm:mr-1" />
                                <span className="hidden sm:inline">Chat</span>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Filters Row - Compact */}
                {!showThreadDetailOnMobile && (
                    <div className="flex flex-col sm:flex-row gap-2">
                        {/* Mobile filter toggle */}
                        <button
                            onClick={() => setShowMobileFilters(!showMobileFilters)}
                            className="sm:hidden flex items-center gap-2 text-xs text-app-muted py-1"
                        >
                            <Filter size={14} />
                            {showMobileFilters ? 'Hide Filters' : 'Filters'}
                        </button>

                        {/* Filter controls */}
                        <div className={`flex-col sm:flex-row gap-2 ${showMobileFilters ? 'flex' : 'hidden sm:flex'} flex-1`}>
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-app-muted" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="w-full pl-8 pr-3 py-1.5 border border-app bg-app-input text-app-text rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    className="flex-1 sm:flex-none px-2 py-1.5 border border-app bg-app-input text-app-text rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                                    className="flex-1 sm:flex-none px-2 py-1.5 border border-app bg-app-input text-app-text rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
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

                {/* Thread List Panel - 35% width with border */}
                <div
                    className={`
                        ${isMobile
                            ? (showThreadListOnMobile ? 'w-full' : 'hidden')
                            : 'w-[35%] min-w-[280px] max-w-[400px]'
                        }
                        border-r-2 border-slate-200 dark:border-neutral-700 bg-app-surface overflow-y-auto
                    `}
                >
                    <ThreadList
                        threads={threads}
                        selectedThread={selectedThread}
                        onSelect={handleThreadSelect}
                        isLoading={isLoading}
                    />
                </div>

                {/* Thread Detail Panel - 65% width with subtle left shadow */}
                <div
                    className={`
                        ${isMobile
                            ? (showThreadDetailOnMobile ? 'w-full' : 'hidden')
                            : 'flex-1'
                        }
                        bg-app-card overflow-hidden shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.3)]
                    `}
                >
                    {selectedThread ? (
                        <ThreadDetail
                            thread={selectedThread}
                            onMessageSent={handleMessageSent}
                            onClose={handleMobileBack}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-app-muted p-4">
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
