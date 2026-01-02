/**
 * UserSelectField Component
 * 
 * A searchable dropdown for selecting system users with:
 * - Search/filter by name or email
 * - User details display (name, email, role)
 * - "Invite New User" option at the bottom
 * - Auto-fill callback for email/phone when user selected
 * 
 * Used in Division (HOD), SubDivision (Reporting Officer), etc.
 */
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, User, Mail, Phone, ChevronDown, Check, UserPlus,
    X, Loader2, Building2
} from 'lucide-react';
import api from '@/api/client';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';

const UserSelectField = ({
    value,
    onChange,
    onUserSelect,  // Callback with full user object for auto-fill
    label = 'Select User',
    placeholder = 'Search or select user...',
    required = false,
    disabled = false,
    error = '',
    filterRoles = null,  // Array of roles to filter, e.g., ['SPV_Official', 'PMNC_Team']
    excludeRoles = ['EPC_Contractor'],  // Exclude contractors by default
    showInviteOption = true,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [inviteModalOpen, setInviteModalOpen] = useState(false);

    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Fetch users
    useEffect(() => {
        if (isOpen && users.length === 0) {
            fetchUsers();
        }
    }, [isOpen]);

    // Find selected user when value changes
    useEffect(() => {
        if (value && users.length > 0) {
            const found = users.find(u => u.id === value);
            setSelectedUser(found || null);
        } else if (!value) {
            setSelectedUser(null);
        }
    }, [value, users]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users/');
            let data = Array.isArray(response.data) ? response.data : (response.data.results || []);

            // Filter by roles if specified
            if (filterRoles && filterRoles.length > 0) {
                data = data.filter(u => filterRoles.includes(u.role));
            }

            // Exclude roles (contractors by default)
            if (excludeRoles && excludeRoles.length > 0) {
                data = data.filter(u => !excludeRoles.includes(u.role));
            }

            // Only active users
            data = data.filter(u => u.account_status === 'ACTIVE');

            setUsers(data);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(u => {
        const query = searchQuery.toLowerCase();
        return (
            (u.first_name || '').toLowerCase().includes(query) ||
            (u.last_name || '').toLowerCase().includes(query) ||
            (u.email || '').toLowerCase().includes(query) ||
            (u.username || '').toLowerCase().includes(query)
        );
    });

    const handleSelect = (user) => {
        setSelectedUser(user);
        onChange(user.id);
        if (onUserSelect) {
            onUserSelect(user);
        }
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleClear = (e) => {
        e.stopPropagation();
        setSelectedUser(null);
        onChange(null);
        if (onUserSelect) {
            onUserSelect(null);
        }
    };

    const handleInviteSuccess = async () => {
        setInviteModalOpen(false);
        toast.success('Invite sent! User will appear after activation.');
        await fetchUsers();
    };

    const getRoleBadgeColor = (role) => {
        const colors = {
            'SPV_Official': 'bg-purple-100 text-purple-700',
            'PMNC_Team': 'bg-indigo-100 text-indigo-700',
            'Consultant_Design': 'bg-cyan-100 text-cyan-700',
            'Govt_Department': 'bg-emerald-100 text-emerald-700',
            'NICDC_HQ': 'bg-pink-100 text-pink-700',
        };
        return colors[role] || 'bg-slate-100 text-slate-700';
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* Label */}
            {label && (
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            {/* Trigger Button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded-xl text-left transition-all ${error ? 'border-red-300 focus:ring-red-100' :
                        isOpen ? 'border-primary-500 ring-2 ring-primary-100' :
                            'border-slate-200 hover:border-slate-300'
                    } ${disabled ? 'bg-slate-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                {selectedUser ? (
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium flex-shrink-0">
                            {(selectedUser.first_name?.[0] || selectedUser.username?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-800 truncate">
                                {selectedUser.first_name} {selectedUser.last_name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{selectedUser.email}</p>
                        </div>
                        {!disabled && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                ) : (
                    <span className="text-slate-400">{placeholder}</span>
                )}
                <ChevronDown
                    size={18}
                    className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''} ${selectedUser ? 'ml-2' : ''}`}
                />
            </button>

            {/* Error Message */}
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
                    >
                        {/* Search */}
                        <div className="p-2 border-b border-slate-100">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name or email..."
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary-500"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* User List */}
                        <div className="max-h-60 overflow-y-auto">
                            {loading ? (
                                <div className="py-8 text-center">
                                    <Loader2 className="animate-spin mx-auto text-primary-500 mb-2" size={24} />
                                    <p className="text-sm text-slate-500">Loading users...</p>
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="py-8 text-center">
                                    <User className="mx-auto text-slate-300 mb-2" size={32} />
                                    <p className="text-sm text-slate-500">
                                        {searchQuery ? 'No users match your search' : 'No users available'}
                                    </p>
                                </div>
                            ) : (
                                filteredUsers.map((user) => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => handleSelect(user)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${selectedUser?.id === user.id ? 'bg-primary-50' : ''
                                            }`}
                                    >
                                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium flex-shrink-0">
                                            {(user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-800 truncate">
                                                {user.first_name} {user.last_name}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Mail size={12} />
                                                <span className="truncate">{user.email}</span>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                                            {user.role?.replace('_', ' ')}
                                        </span>
                                        {selectedUser?.id === user.id && (
                                            <Check size={18} className="text-primary-600 flex-shrink-0" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Invite New User Option */}
                        {showInviteOption && (
                            <div className="border-t border-slate-100 p-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        setInviteModalOpen(true);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors font-medium text-sm"
                                >
                                    <UserPlus size={18} />
                                    Invite New User
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Invite Modal */}
            {inviteModalOpen && (
                <InviteUserModal
                    isOpen={inviteModalOpen}
                    onClose={() => setInviteModalOpen(false)}
                    onSuccess={handleInviteSuccess}
                />
            )}
        </div>
    );
};

// Inline Invite Modal (same as UserManagement)
const InviteUserModal = ({ isOpen, onClose, onSuccess }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        first_name: '',
        last_name: '',
        role: 'PMNC_Team',
        department: '',
        phone_number: '',
    });
    const [errors, setErrors] = useState({});

    // ESC key handler
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.email || !formData.first_name || !formData.last_name) {
            setErrors({
                email: !formData.email ? 'Email is required' : '',
                first_name: !formData.first_name ? 'First name is required' : '',
                last_name: !formData.last_name ? 'Last name is required' : '',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/users/invite/', formData);
            toast.success(`Invite sent to ${formData.email}`);
            onSuccess();
        } catch (error) {
            console.error('Invite failed:', error);
            if (error.response?.data) {
                setErrors(error.response.data);
            }
            toast.error('Failed to send invite');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4"
            >
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <UserPlus className="text-primary-600" size={24} />
                            Invite New User
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Send an invite to a new team member</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className={`w-full px-4 py-2 rounded-lg border ${errors.email ? 'border-red-300' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
                            placeholder="user@example.com"
                        />
                        {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                                className={`w-full px-4 py-2 rounded-lg border ${errors.first_name ? 'border-red-300' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Last Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                                className={`w-full px-4 py-2 rounded-lg border ${errors.last_name ? 'border-red-300' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Role <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="SPV_Official">SPV Official</option>
                            <option value="PMNC_Team">PMNC Team</option>
                            <option value="Consultant_Design">Design Consultant</option>
                            <option value="Govt_Department">Government Department</option>
                            <option value="NICDC_HQ">NICDC HQ</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                            <input
                                type="text"
                                value={formData.department}
                                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                            <input
                                type="text"
                                value={formData.phone_number}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" size={18} /> : <Mail className="mr-2" size={18} />}
                            Send Invite
                        </Button>
                    </div>
                </form>
            </motion.div>
        </div>,
        document.body
    );
};

export default UserSelectField;
