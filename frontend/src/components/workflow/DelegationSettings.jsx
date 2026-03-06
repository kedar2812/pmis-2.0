import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import workflowService from '@/api/services/workflowService';
import usersService from '@/api/services/usersService';
import {
    Users,
    Plus,
    Trash2,
    Calendar,
    AlertCircle,
    Clock,
    Briefcase
} from 'lucide-react';
import Button from '@/components/ui/Button';

const DelegationSettings = () => {
    const { user } = useAuth();
    const [delegations, setDelegations] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Form State
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        delegate_to: '',
        valid_from: new Date().toISOString().split('T')[0],
        valid_to: '',
        reason: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [delegationsRes, usersRes] = await Promise.all([
                workflowService.getMyDelegations(),
                usersService.getUsers() // Standard user service
            ]);

            setDelegations(delegationsRes.results || delegationsRes.data || []);

            // Filter out self and superusers/inactive
            const userList = (usersRes.results || usersRes.data || []).filter(
                u => u.id !== user.id && u.is_active
            );
            setAvailableUsers(userList);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch delegation settings:", err);
            setError("Failed to load your delegation rules.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await workflowService.createDelegation(formData);
            await fetchData();
            setIsAdding(false);
            setFormData({
                delegate_to: '',
                valid_from: new Date().toISOString().split('T')[0],
                valid_to: '',
                reason: ''
            });
        } catch (err) {
            console.error("Failed to create delegation:", err);
            setError(err.response?.data?.error || "Failed to save delegation rule.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm("Are you sure you want to cancel this delegation? Action will take effect immediately.")) {
            return;
        }

        try {
            setIsSubmitting(true);
            await workflowService.cancelDelegation(id);
            await fetchData();
        } catch (err) {
            console.error("Cancel failed:", err);
            setError("Failed to cancel delegation.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-app-heading">Out of Office & Delegation</h2>
                    <p className="text-sm text-app-muted mt-1">Temporarily route your workflow approvals to another team member.</p>
                </div>
                {!isAdding && (
                    <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2">
                        <Plus size={16} /> New Delegation
                    </Button>
                )}
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-100">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Add New Rule Form */}
            {isAdding && (
                <div className="bg-app-card border border-app-border rounded-xl p-6 shadow-sm">
                    <h3 className="font-semibold text-app-heading mb-4 border-b border-app-border pb-3">Create Delegation Rule</h3>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-app-heading mb-1.5">Delegate Authority To <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm"
                                    value={formData.delegate_to}
                                    onChange={(e) => setFormData({ ...formData, delegate_to: e.target.value })}
                                >
                                    <option value="">Select a team member...</option>
                                    {availableUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.get_full_name || `${u.first_name} ${u.last_name}`} - {u.role_display || u.role}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-app-muted mt-1.5 flex items-center gap-1">
                                    <AlertCircle size={12} /> The selected user will have full authority over your Inbox.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-app-heading mb-1.5">Start Date <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm"
                                        value={formData.valid_from}
                                        onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-app-heading mb-1.5">End Date <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        required
                                        min={formData.valid_from || new Date().toISOString().split('T')[0]}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm"
                                        value={formData.valid_to}
                                        onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-app-heading mb-1.5">Reason (Visible to Delegates)</label>
                            <textarea
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm h-20"
                                placeholder="e.g. Annual Leave, Medical Leave, Site Visit etc."
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            ></textarea>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-app-border">
                            <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save Delegation Rule'}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Active Rules List */}
            <div className="bg-app-card border border-app-border rounded-xl shadow-sm overflow-hidden">
                {delegations.length === 0 ? (
                    <div className="p-12 pl-6 text-center text-app-muted">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20 text-slate-500" />
                        <h3 className="font-medium text-app-heading mb-1">No Active Delegations</h3>
                        <p className="text-sm">You are currently handling all of your own workflow approvals.</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-app-border">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-app-muted uppercase">Delegated To</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-app-muted uppercase">Period</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-app-muted uppercase">Reason</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-app-muted uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-app-muted uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border">
                            {delegations.map(del => {
                                const now = new Date();
                                const start = new Date(del.valid_from);
                                const end = new Date(del.valid_to);
                                const isActive = start <= now && end >= now;
                                const isPast = end < now;

                                return (
                                    <tr key={del.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-primary-100 dark:bg-primary-900/30 p-1.5 rounded-md">
                                                    <User size={16} className="text-primary-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-app-heading">
                                                        {del.delegate_to?.first_name} {del.delegate_to?.last_name}
                                                    </p>
                                                    <p className="text-xs text-app-muted">{del.delegate_to?.role_display}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 text-sm text-app-text">
                                                <span className="flex items-center gap-1"><Calendar size={12} className="text-app-muted" /> From: {new Date(del.valid_from).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1"><Calendar size={12} className="text-app-muted" /> To: {new Date(del.valid_to).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-app-muted max-w-xs truncate">
                                            {del.reason || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {isActive ? (
                                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium rounded-full border border-emerald-200 dark:border-emerald-800">Active</span>
                                            ) : isPast ? (
                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-700">Expired</span>
                                            ) : (
                                                <span className="px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-medium rounded-full border border-blue-200 dark:border-blue-800">Scheduled</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {!isPast && (
                                                <button
                                                    onClick={() => handleCancel(del.id)}
                                                    disabled={isSubmitting}
                                                    className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                                                >
                                                    Revoke
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default DelegationSettings;
