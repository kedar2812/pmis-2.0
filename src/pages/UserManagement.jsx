import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Users, UserPlus, Search, Filter, RefreshCw, Mail, Phone, Building2,
    CheckCircle2, XCircle, Clock, Shield, AlertCircle, Eye, Loader2,
    ChevronDown, MoreVertical, UserCheck, UserX
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import api from '@/api/client';

// Invite User Modal
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
            onClose();
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4"
            >
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <UserPlus className="text-primary-600" size={24} />
                        Invite Internal User
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Send an invite to a new team member</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">First Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                                className={`w-full px-4 py-2 rounded-lg border ${errors.first_name ? 'border-red-300' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                                className={`w-full px-4 py-2 rounded-lg border ${errors.last_name ? 'border-red-300' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Role <span className="text-red-500">*</span></label>
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

// User Detail Modal
const UserDetailModal = ({ isOpen, onClose, user, onApprove, onReject }) => {
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);

    if (!isOpen || !user) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden"
            >
                {/* Fixed Header */}
                <div className="p-6 border-b border-slate-200 flex justify-between items-start flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{user.first_name} {user.last_name}</h2>
                        <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <XCircle size={24} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Status Banner */}
                    {user.account_status === 'PENDING_APPROVAL' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                            <Clock className="text-amber-600" size={24} />
                            <div>
                                <p className="font-semibold text-amber-900">Pending Approval</p>
                                <p className="text-sm text-amber-700">This user is awaiting admin approval to access the system.</p>
                            </div>
                        </div>
                    )}

                    {/* User Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-medium">Role</p>
                            <p className="text-slate-900 font-medium">{user.role?.replace('_', ' ')}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-medium">Status</p>
                            <p className="text-slate-900 font-medium">{user.account_status}</p>
                        </div>
                        {user.company_name && (
                            <div className="col-span-2">
                                <p className="text-xs text-slate-500 uppercase font-medium">Company</p>
                                <p className="text-slate-900 font-medium">{user.company_name}</p>
                            </div>
                        )}
                        {user.pan_number && (
                            <>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-medium">PAN</p>
                                    <p className="text-slate-900 font-mono">{user.pan_number}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-medium">GSTIN</p>
                                    <p className="text-slate-900 font-mono">{user.gstin_number}</p>
                                </div>
                            </>
                        )}
                        {user.bank_name && (
                            <>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-medium">Bank</p>
                                    <p className="text-slate-900">{user.bank_name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-medium">IFSC</p>
                                    <p className="text-slate-900 font-mono">{user.ifsc_code}</p>
                                </div>
                            </>
                        )}
                        {user.full_address && (
                            <div className="col-span-2">
                                <p className="text-xs text-slate-500 uppercase font-medium">Address</p>
                                <p className="text-slate-900">{user.full_address}</p>
                            </div>
                        )}
                    </div>

                    {/* Approval Actions */}
                    {user.account_status === 'PENDING_APPROVAL' && (
                        <div className="border-t border-slate-200 pt-4">
                            {!showRejectForm ? (
                                <div className="flex gap-3">
                                    <Button onClick={() => onApprove(user.id)} className="flex-1 bg-green-600 hover:bg-green-700">
                                        <UserCheck className="mr-2" size={18} /> Approve
                                    </Button>
                                    <Button variant="outline" onClick={() => setShowRejectForm(true)} className="flex-1 text-red-600 border-red-200 hover:bg-red-50">
                                        <UserX className="mr-2" size={18} /> Reject
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Enter reason for rejection..."
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                                        rows={3}
                                    />
                                    <div className="flex gap-3">
                                        <Button variant="outline" onClick={() => setShowRejectForm(false)}>Cancel</Button>
                                        <Button
                                            onClick={() => onReject(user.id, rejectionReason)}
                                            disabled={!rejectionReason.trim()}
                                            className="bg-red-600 hover:bg-red-700"
                                        >
                                            Confirm Rejection
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

const UserManagement = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('all'); // 'all' or 'pending'
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        // Access control
        if (user && !['SPV_Official', 'NICDC_HQ'].includes(user.role)) {
            navigate('/dashboard');
            return;
        }
        fetchUsers();
        fetchPendingUsers();
    }, [user, navigate]);

    const fetchUsers = async () => {
        try {
            console.log("Fetching users...");
            const response = await api.get(`/users/?t=${new Date().getTime()}`);
            console.log("Users fetched response:", response.data);
            const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
            console.log("Users processed:", data.length);
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error("Failed to load users list");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPendingUsers = async () => {
        try {
            const response = await api.get('/users/pending/');
            setPendingUsers(response.data.results || response.data);
        } catch (error) {
            console.error('Failed to fetch pending users:', error);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([fetchUsers(), fetchPendingUsers()]);
        setIsRefreshing(false);
        toast.success("List refreshed");
    };

    const handleApprove = async (userId) => {
        try {
            await api.post(`/users/${userId}/approve/`);
            toast.success('User approved successfully');
            await fetchUsers();
            await fetchPendingUsers();
            setSelectedUser(null);
        } catch (error) {
            toast.error('Failed to approve user');
        }
    };

    const handleReject = async (userId, reason) => {
        try {
            await api.post(`/users/${userId}/reject/`, { reason });
            toast.success('User rejected');
            await fetchUsers();
            await fetchPendingUsers();
            setSelectedUser(null);
        } catch (error) {
            toast.error('Failed to reject user');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            'ACTIVE': 'bg-green-100 text-green-700 border-green-200',
            'PENDING_INVITE': 'bg-blue-100 text-blue-700 border-blue-200',
            'PENDING_APPROVAL': 'bg-amber-100 text-amber-700 border-amber-200',
            'DISABLED': 'bg-red-100 text-red-700 border-red-200',
        };
        return styles[status] || 'bg-slate-100 text-slate-700';
    };

    const getRoleBadge = (role) => {
        const styles = {
            'SPV_Official': 'bg-purple-100 text-purple-700',
            'PMNC_Team': 'bg-indigo-100 text-indigo-700',
            'EPC_Contractor': 'bg-orange-100 text-orange-700',
            'Consultant_Design': 'bg-cyan-100 text-cyan-700',
            'Govt_Department': 'bg-emerald-100 text-emerald-700',
            'NICDC_HQ': 'bg-pink-100 text-pink-700',
        };
        return styles[role] || 'bg-slate-100 text-slate-700';
    };

    const displayUsers = activeTab === 'pending' ? pendingUsers : users;
    const filteredUsers = displayUsers.filter(u => {
        const matchesSearch =
            (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.first_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.last_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.company_name || '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || u.account_status === statusFilter;
        const matchesRole = roleFilter === 'all' || u.role === roleFilter;

        return matchesSearch && matchesStatus && matchesRole;
    });

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-slate-900 flex items-center gap-2">
                        <Users className="text-primary-600" /> User Management
                    </h1>
                    <p className="text-slate-500 mt-1">Manage system users, roles, and approvals</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                        <RefreshCw size={18} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                    <Button onClick={() => setIsInviteModalOpen(true)}>
                        <UserPlus size={18} className="mr-2" /> Invite User
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-primary-100">
                            <Users className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
                            <p className="text-sm text-slate-500">Total Users</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-green-100">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{users.filter(u => u.account_status === 'ACTIVE').length}</p>
                            <p className="text-sm text-slate-500">Active</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 cursor-pointer hover:bg-amber-50 transition-colors" onClick={() => { setActiveTab('pending'); fetchPendingUsers(); }}>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-amber-100">
                            <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{pendingUsers.length}</p>
                            <p className="text-sm text-slate-500">Pending Approval</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-orange-100">
                            <Building2 className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{users.filter(u => u.role === 'EPC_Contractor').length}</p>
                            <p className="text-sm text-slate-500">Contractors</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => { setActiveTab('all'); fetchUsers(); }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'all' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                >
                    All Users
                </button>
                <button
                    onClick={() => { setActiveTab('pending'); fetchPendingUsers(); }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                >
                    Pending Approval
                    {pendingUsers.length > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'pending' ? 'bg-white/20' : 'bg-amber-500 text-white'}`}>
                            {pendingUsers.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name, email, or company..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="all">All Roles</option>
                        <option value="SPV_Official">SPV Official</option>
                        <option value="PMNC_Team">PMNC Team</option>
                        <option value="EPC_Contractor">EPC Contractor</option>
                        <option value="Consultant_Design">Design Consultant</option>
                        <option value="Govt_Department">Government</option>
                        <option value="NICDC_HQ">NICDC HQ</option>
                    </select>
                    <select
                        className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="PENDING_INVITE">Pending Invite</option>
                        <option value="PENDING_APPROVAL">Pending Approval</option>
                        <option value="DISABLED">Disabled</option>
                    </select>
                </div>
            </Card>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-600" />
                        <p className="text-slate-500">Loading users...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                    <th className="p-4">User</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Contact</th>
                                    <th className="p-4">Joined</th>
                                    <th className="p-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                                                        {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900">
                                                            {u.first_name} {u.last_name}
                                                        </p>
                                                        <p className="text-sm text-slate-500">{u.username}</p>
                                                        {u.company_name && (
                                                            <p className="text-xs text-slate-400 flex items-center gap-1">
                                                                <Building2 size={12} /> {u.company_name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleBadge(u.role)}`}>
                                                    {u.role?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(u.account_status)}`}>
                                                    {u.account_status?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm">
                                                    <p className="text-slate-600 flex items-center gap-1">
                                                        <Mail size={14} className="text-slate-400" /> {u.email}
                                                    </p>
                                                    {u.phone_number && (
                                                        <p className="text-slate-500 flex items-center gap-1 mt-1">
                                                            <Phone size={14} className="text-slate-400" /> {u.phone_number}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-slate-500">
                                                {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedUser(u)}
                                                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    {u.account_status === 'PENDING_APPROVAL' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(u.id)}
                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="Approve"
                                                            >
                                                                <CheckCircle2 size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="p-12 text-center text-slate-500">
                                            No users found matching your criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
            <InviteUserModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onSuccess={fetchUsers}
            />

            <UserDetailModal
                isOpen={!!selectedUser}
                onClose={() => setSelectedUser(null)}
                user={selectedUser}
                onApprove={handleApprove}
                onReject={handleReject}
            />
        </div>
    );
};

export default UserManagement;
