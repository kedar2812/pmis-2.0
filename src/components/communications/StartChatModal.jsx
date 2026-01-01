/**
 * StartChatModal - Modal for creating direct messages and group chats
 */
import { useState, useEffect } from 'react';
import { X, Search, Users, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import client from '@/api/client';
import Button from '@/components/ui/Button';

const StartChatModal = ({ onClose, onCreated }) => {
    const [activeTab, setActiveTab] = useState('dm'); // 'dm' or 'group'
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const res = await client.get('/users/');
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error('Failed to load users');
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleUserSelection = (user) => {
        if (activeTab === 'dm') {
            // For DM, check if already selected - if so, deselect; otherwise select
            if (selectedUsers.find(u => u.id === user.id)) {
                setSelectedUsers([]);
            } else {
                setSelectedUsers([user]);
            }
        } else {
            // For group, toggle selection
            if (selectedUsers.find(u => u.id === user.id)) {
                setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
            } else {
                setSelectedUsers([...selectedUsers, user]);
            }
        }
    };

    const handleStartChat = async () => {
        if (selectedUsers.length === 0) {
            toast.error('Please select at least one user');
            return;
        }

        setIsLoading(true);
        try {
            let response;

            if (activeTab === 'dm' && selectedUsers.length === 1) {
                // Start DM
                response = await client.post('/communications/threads/start_dm/', {
                    recipient_id: selectedUsers[0].id
                });
                toast.success(`Started chat with ${selectedUsers[0].username}`);
            } else {
                // Start group chat (2+ users)
                response = await client.post('/communications/threads/start_group_chat/', {
                    participant_ids: selectedUsers.map(u => u.id),
                    chat_name: groupName || undefined
                });
                toast.success('Group chat created');
            }

            if (onCreated) {
                onCreated(response.data);
            }
            onClose();
        } catch (error) {
            console.error('Failed to start chat:', error);
            toast.error(error.response?.data?.error || 'Failed to start chat');
        } finally {
            setIsLoading(false);
        }
    };

    const getRoleBadgeColor = (role) => {
        const colors = {
            'SPV_Official': 'bg-purple-100 text-purple-700',
            'PMNC_Team': 'bg-blue-100 text-blue-700',
            'Govt_Department': 'bg-green-100 text-green-700',
            'EPC_Contractor': 'bg-orange-100 text-orange-700',
            'Consultant_Design': 'bg-cyan-100 text-cyan-700',
        };
        return colors[role] || 'bg-slate-100 text-slate-700';
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b">
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <MessageCircle className="text-primary-600" size={28} />
                            Chat with Team
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b">
                        <button
                            onClick={() => {
                                setActiveTab('dm');
                                setSelectedUsers([]);
                                setGroupName('');
                            }}
                            className={`flex-1 py-3 px-4 font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'dm'
                                ? 'border-b-2 border-primary-600 text-primary-600'
                                : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            <MessageCircle size={18} />
                            Direct Message
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('group');
                                setSelectedUsers([]);
                            }}
                            className={`flex-1 py-3 px-4 font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'group'
                                ? 'border-b-2 border-primary-600 text-primary-600'
                                : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            <Users size={18} />
                            Group Chat
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Search */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search users..."
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Group Name Input (for group chats) */}
                        {activeTab === 'group' && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Group Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter group name..."
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Selected Users Badge */}
                        {selectedUsers.length > 0 && (
                            <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                                <div className="text-sm font-medium text-primary-900 mb-2">
                                    {activeTab === 'dm' ? 'Selected User:' : `Selected (${selectedUsers.length}):`}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedUsers.map(user => (
                                        <span
                                            key={user.id}
                                            className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-primary-300 rounded-full text-sm"
                                        >
                                            {user.username}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleUserSelection(user);
                                                }}
                                                className="hover:bg-red-100 rounded-full p-0.5 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* User List */}
                        {isLoadingUsers ? (
                            <div className="text-center py-8 text-slate-500">
                                Loading users...
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                No users found
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredUsers.map((user) => {
                                    const isSelected = selectedUsers.find(u => u.id === user.id);
                                    return (
                                        <button
                                            key={user.id}
                                            onClick={() => toggleUserSelection(user)}
                                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${isSelected
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${isSelected ? 'bg-primary-600' : 'bg-slate-400'
                                                    }`}>
                                                    {user.username?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-medium text-slate-900">{user.username}</div>
                                                    <div className="text-xs text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                                                {user.role?.replace(/_/g, ' ')}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-6 border-t bg-slate-50">
                        <div className="text-sm text-slate-600">
                            {activeTab === 'dm' ? (
                                <span>Select a user to start a direct message</span>
                            ) : (
                                <span>Select 2 or more users for a group chat</span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleStartChat}
                                disabled={isLoading || selectedUsers.length === 0 || (activeTab === 'group' && selectedUsers.length < 1)}
                            >
                                {isLoading ? 'Creating...' : activeTab === 'dm' ? 'Start Chat' : 'Create Group'}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default StartChatModal;
