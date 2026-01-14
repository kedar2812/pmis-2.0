/**
 * NewThreadModal - Enhanced with dynamic context selection and recipients
 * - Select context type → fetches available items → select from dropdown
 * - Select recipients (individuals or groups) like WhatsApp
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import client from '@/api/client';
import { toast } from 'sonner';
import {
    X, MessageSquare, Link2, AlertTriangle, Lock, Gavel,
    FileText, FolderOpen, Users, User, Search, Check, Loader2
} from 'lucide-react';
import Button from '@/components/ui/Button';

const NewThreadModal = ({ onClose, onCreated, preselectedContext = null }) => {
    const { user } = useAuth();
    const [step, setStep] = useState(1); // 1: Context, 2: Recipients, 3: Details
    const [subject, setSubject] = useState('');
    const [threadType, setThreadType] = useState('DISCUSSION');
    const [contextType, setContextType] = useState(preselectedContext?.type || '');
    const [contextId, setContextId] = useState(preselectedContext?.id || '');
    const [contextName, setContextName] = useState(preselectedContext?.name || '');
    const [initialMessage, setInitialMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Context items (fetched from API)
    const [contextItems, setContextItems] = useState([]);
    const [isLoadingContextItems, setIsLoadingContextItems] = useState(false);
    const [contextSearch, setContextSearch] = useState('');

    // Recipients
    const [recipientType, setRecipientType] = useState('individual'); // 'individual' or 'group'
    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [userSearch, setUserSearch] = useState('');

    // Available context types with icons
    const contextOptions = [
        { value: 'edms.document', label: 'Document', icon: FileText, apiEndpoint: '/edms/documents/' },
        { value: 'projects.project', label: 'Project', icon: FolderOpen, apiEndpoint: '/projects/' },
    ];

    // Thread type options based on role
    const threadTypeOptions = [
        { value: 'DISCUSSION', label: 'Discussion', icon: MessageSquare, description: 'General discussion' },
        { value: 'CLARIFICATION', label: 'Clarification', icon: AlertTriangle, description: 'Request clarification' },
        {
            value: 'INTERNAL_NOTE', label: 'Internal Note', icon: Lock, description: 'Hidden from contractors',
            enabled: ['SPV_Official', 'PMNC_Team', 'Govt_Department', 'NICDC_HQ'].includes(user?.role)
        },
        {
            value: 'RULING', label: 'Ruling', icon: Gavel, description: 'Authoritative decision',
            enabled: ['SPV_Official', 'NICDC_HQ'].includes(user?.role)
        },
    ].filter(opt => opt.enabled !== false);

    // Fetch context items when type changes
    useEffect(() => {
        if (contextType && !preselectedContext) {
            fetchContextItems();
        }
    }, [contextType]);

    // Fetch users for recipient selection
    useEffect(() => {
        fetchAvailableUsers();
    }, []);

    const fetchContextItems = async () => {
        const contextConfig = contextOptions.find(c => c.value === contextType);
        if (!contextConfig) return;

        setIsLoadingContextItems(true);
        try {
            const res = await client.get(contextConfig.apiEndpoint);
            const items = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setContextItems(items.map(item => ({
                id: item.id,
                name: item.title || item.name || `${contextConfig.label} ${item.id.substring(0, 8)}`,
                subtitle: item.status || item.category || ''
            })));
        } catch (error) {
            console.error('Failed to fetch context items:', error);
            toast.error('Failed to load items');
        } finally {
            setIsLoadingContextItems(false);
        }
    };

    const fetchAvailableUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const res = await client.get('/users/');
            const users = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setAvailableUsers(users.filter(u => u.id !== user?.id)); // Exclude current user
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const handleContextSelect = (item) => {
        setContextId(item.id);
        setContextName(item.name);
    };

    const toggleRecipient = (recipient) => {
        setSelectedRecipients(prev => {
            const exists = prev.find(r => r.id === recipient.id);
            if (exists) {
                return prev.filter(r => r.id !== recipient.id);
            }
            return [...prev, recipient];
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!subject.trim()) {
            toast.error('Subject is required');
            return;
        }

        if (!contextType || !contextId) {
            toast.error('Please select a context');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await client.post('/communications/threads/', {
                subject,
                context_type: contextType,
                context_id: contextId,
                thread_type: threadType,
                initial_message: initialMessage,
                recipients: selectedRecipients.map(r => r.id) // Send recipient IDs
            });

            toast.success('Thread created successfully');
            onCreated(res.data);
        } catch (error) {
            console.error('Failed to create thread:', error);
            toast.error(error.response?.data?.error || 'Failed to create thread');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter context items by search
    const filteredContextItems = contextItems.filter(item =>
        item.name.toLowerCase().includes(contextSearch.toLowerCase())
    );

    // Filter users by search
    const filteredUsers = availableUsers.filter(u =>
        u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.first_name + ' ' + u.last_name).toLowerCase().includes(userSearch.toLowerCase())
    );

    // Role display helper
    const getRoleLabel = (role) => {
        const labels = {
            'SPV_Official': 'SPV Official',
            'PMNC_Team': 'PMNC Team',
            'EPC_Contractor': 'Contractor',
            'Consultant_Design': 'Consultant',
            'Govt_Department': 'Govt. Dept.',
            'NICDC_HQ': 'NICDC HQ'
        };
        return labels[role] || role;
    };

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-neutral-700 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-neutral-800 dark:to-neutral-800">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <MessageSquare className="text-primary-600" size={20} />
                                New Conversation
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                                Step {step} of 3 • {step === 1 ? 'Select Context' : step === 2 ? 'Add Recipients' : 'Message Details'}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/50 dark:hover:bg-neutral-700 rounded-lg transition-colors">
                            <X size={20} className="text-slate-500 dark:text-neutral-400" />
                        </button>
                    </div>

                    {/* Step 1: Context Selection */}
                    {step === 1 && (
                        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                            {/* Context Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    What is this conversation about?
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {contextOptions.map(opt => {
                                        const Icon = opt.icon;
                                        const isSelected = contextType === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => {
                                                    setContextType(opt.value);
                                                    setContextId('');
                                                    setContextName('');
                                                }}
                                                className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected
                                                    ? 'border-primary-500 bg-primary-50 shadow-md'
                                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <Icon size={24} className={isSelected ? 'text-primary-600' : 'text-slate-400'} />
                                                <span className={`block mt-2 font-semibold ${isSelected ? 'text-primary-700' : 'text-slate-700'}`}>
                                                    {opt.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Context Item Selection */}
                            {contextType && !preselectedContext && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Select {contextOptions.find(c => c.value === contextType)?.label}
                                    </label>

                                    {/* Search */}
                                    <div className="relative mb-3">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={contextSearch}
                                            onChange={(e) => setContextSearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>

                                    {/* Items List */}
                                    <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                                        {isLoadingContextItems ? (
                                            <div className="p-4 text-center text-slate-400">
                                                <Loader2 size={20} className="animate-spin mx-auto" />
                                                <p className="text-sm mt-2">Loading...</p>
                                            </div>
                                        ) : filteredContextItems.length === 0 ? (
                                            <div className="p-4 text-center text-slate-400 text-sm">
                                                No items found
                                            </div>
                                        ) : (
                                            filteredContextItems.map(item => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => handleContextSelect(item)}
                                                    className={`w-full text-left p-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors flex items-center justify-between ${contextId === item.id ? 'bg-primary-50' : ''
                                                        }`}
                                                >
                                                    <div>
                                                        <p className="font-medium text-sm text-slate-800">{item.name}</p>
                                                        {item.subtitle && (
                                                            <p className="text-xs text-slate-500">{item.subtitle}</p>
                                                        )}
                                                    </div>
                                                    {contextId === item.id && (
                                                        <Check size={18} className="text-primary-600" />
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Preselected Context Display */}
                            {preselectedContext && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-green-800">
                                        <strong>Linked to:</strong> {preselectedContext.name || `${contextType.split('.')[1]} (${contextId.substring(0, 8)}...)`}
                                    </p>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end">
                                <Button
                                    onClick={() => setStep(2)}
                                    disabled={!contextType || !contextId}
                                >
                                    Next: Add Recipients
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Recipient Selection */}
                    {step === 2 && (
                        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                            {/* Recipient Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Who do you want to start this conversation with?
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setRecipientType('individual')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${recipientType === 'individual'
                                            ? 'border-primary-500 bg-primary-50 shadow-md'
                                            : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <User size={24} className={recipientType === 'individual' ? 'text-primary-600' : 'text-slate-400'} />
                                        <span className={`block mt-2 font-semibold ${recipientType === 'individual' ? 'text-primary-700' : 'text-slate-700'}`}>
                                            Individual(s)
                                        </span>
                                        <p className="text-xs text-slate-500 mt-1">Select specific people</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRecipientType('group')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${recipientType === 'group'
                                            ? 'border-primary-500 bg-primary-50 shadow-md'
                                            : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <Users size={24} className={recipientType === 'group' ? 'text-primary-600' : 'text-slate-400'} />
                                        <span className={`block mt-2 font-semibold ${recipientType === 'group' ? 'text-primary-700' : 'text-slate-700'}`}>
                                            Group/Role
                                        </span>
                                        <p className="text-xs text-slate-500 mt-1">Notify entire team</p>
                                    </button>
                                </div>
                            </div>

                            {/* User Search */}
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search users by name or email..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>

                            {/* Selected Recipients Pills */}
                            {selectedRecipients.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {selectedRecipients.map(r => (
                                        <span
                                            key={r.id}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                                        >
                                            {r.username || r.email}
                                            <button
                                                type="button"
                                                onClick={() => toggleRecipient(r)}
                                                className="hover:bg-primary-200 rounded-full p-0.5"
                                            >
                                                <X size={14} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Users List */}
                            <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                                {isLoadingUsers ? (
                                    <div className="p-4 text-center text-slate-400">
                                        <Loader2 size={20} className="animate-spin mx-auto" />
                                    </div>
                                ) : filteredUsers.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400 text-sm">
                                        No users found
                                    </div>
                                ) : (
                                    filteredUsers.map(u => {
                                        const isSelected = selectedRecipients.find(r => r.id === u.id);
                                        return (
                                            <button
                                                key={u.id}
                                                type="button"
                                                onClick={() => toggleRecipient(u)}
                                                className={`w-full text-left p-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors flex items-center gap-3 ${isSelected ? 'bg-primary-50' : ''
                                                    }`}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                                                    {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm text-slate-800">
                                                        {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{getRoleLabel(u.role)}</p>
                                                </div>
                                                {isSelected && (
                                                    <Check size={18} className="text-primary-600" />
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            <div className="pt-4 flex justify-between">
                                <Button variant="outline" onClick={() => setStep(1)}>
                                    Back
                                </Button>
                                <Button onClick={() => setStep(3)}>
                                    Next: Add Details
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Subject & Message */}
                    {step === 3 && (
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            {/* Thread Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Conversation Type
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {threadTypeOptions.map(opt => {
                                        const Icon = opt.icon;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setThreadType(opt.value)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${threadType === opt.value
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                                    }`}
                                            >
                                                <Icon size={16} />
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Subject <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Brief description of the conversation"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                    required
                                />
                            </div>

                            {/* Initial Message */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Message
                                </label>
                                <textarea
                                    value={initialMessage}
                                    onChange={(e) => setInitialMessage(e.target.value)}
                                    placeholder="Start the conversation..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                    rows={4}
                                />
                            </div>

                            {/* Summary */}
                            <div className="p-3 bg-slate-50 rounded-lg text-sm">
                                <p className="text-slate-600">
                                    <strong>Context:</strong> {contextName || contextId?.substring(0, 8)}
                                </p>
                                <p className="text-slate-600">
                                    <strong>Recipients:</strong> {selectedRecipients.length > 0
                                        ? selectedRecipients.map(r => r.username || r.email).join(', ')
                                        : 'All participants will be notified'}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-between pt-2">
                                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                                    Back
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin mr-2" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Start Conversation'
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};

export default NewThreadModal;
