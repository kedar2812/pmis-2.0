/**
 * Communications Page - Main container for the Messaging Center
 * Government-grade, formal UI - no informal styling or chat app metaphors
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import client from '@/api/client';
import { toast } from 'sonner';
import {
    MessageSquare, Filter, Search, Plus, Bell, ChevronRight,
    Clock, AlertTriangle, CheckCircle, Lock, Gavel, FileText
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

    const fetchThreads = async () => {
        setIsLoading(true);
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
            toast.error('Failed to load communications');
        } finally {
            setIsLoading(false);
        }
    };

    const handleThreadSelect = async (thread) => {
        try {
            const res = await client.get(`/communications/threads/${thread.id}/`);
            setSelectedThread(res.data);
        } catch (error) {
            console.error('Failed to load thread:', error);
            toast.error('Failed to load conversation');
        }
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

    // Permission checks
    const canInitiateThread = ['SPV_Official', 'PMNC_Team', 'Nodal_Officer', 'Govt_Official'].includes(user?.role);

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <MessageSquare className="text-primary-600" size={28} />
                            Communications Center
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Official, auditable communication system
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Stats Pills */}
                        <div className="flex gap-2">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                {stats.open} Open
                            </span>
                            {stats.escalated > 0 && (
                                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-1">
                                    <AlertTriangle size={14} /> {stats.escalated} Escalated
                                </span>
                            )}
                        </div>

                        {/* New Thread Button */}
                        {canInitiateThread && (
                            <Button onClick={() => setShowNewThread(true)}>
                                <FileText size={18} className="mr-2" />
                                New Discussion Thread
                            </Button>
                        )}

                        {/* Start Chat Button - Available to all users */}
                        <Button onClick={() => setShowStartChat(true)}>
                            <MessageSquare size={18} className="mr-2" />
                            Chat with Team
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-4 mt-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search threads..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>
                    <select
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="">All Status</option>
                        <option value="OPEN">Open</option>
                        <option value="PENDING_RESPONSE">Pending Response</option>
                        <option value="ESCALATED">Escalated</option>
                        <option value="CLOSED">Closed</option>
                    </select>
                    <select
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={filters.type}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    >
                        <option value="">All Types</option>
                        <option value="DISCUSSION">Discussion</option>
                        <option value="CLARIFICATION">Clarification</option>
                        <option value="INTERNAL_NOTE">Internal Note</option>
                        <option value="RULING">Ruling</option>
                    </select>
                </div>
            </div>

            {/* Main Content - Split View - Takes all remaining height */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Left Panel - Thread List - Wider for better visibility */}
                <div className="w-[380px] border-r border-slate-200 bg-slate-50 overflow-y-auto">
                    <ThreadList
                        threads={threads}
                        selectedThread={selectedThread}
                        onSelect={handleThreadSelect}
                        isLoading={isLoading}
                    />
                </div>

                {/* Right Panel - Thread Detail */}
                <div className="flex-1 bg-white overflow-hidden">
                    {selectedThread ? (
                        <ThreadDetail
                            thread={selectedThread}
                            onMessageSent={handleMessageSent}
                            onClose={() => setSelectedThread(null)}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <MessageSquare size={64} className="opacity-30 mb-4" />
                            <p className="text-lg">Select a thread to view</p>
                            <p className="text-sm mt-1">or create a new communication thread</p>
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
