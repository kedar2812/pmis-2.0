import { useState, useEffect } from 'react';
import { Shield, Download, Search, Filter, Clock, User, Activity, FileText, Database, HardDrive, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AuditLogger } from '@/services/AuditLogger';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '@/api/client';

const AuditLogs = () => {
    const [localLogs, setLocalLogs] = useState([]);
    const [backendLogs, setBackendLogs] = useState([]);
    const [isLoadingBackend, setIsLoadingBackend] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [activeTab, setActiveTab] = useState('backend'); // 'backend' or 'frontend'
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Security check
        if (user && user.role !== 'SPV_Official' && user.role !== 'NICDC_HQ') {
            navigate('/dashboard');
            return;
        }

        // Load local logs
        setLocalLogs(AuditLogger.getLogs());

        // Load backend logs
        fetchBackendLogs();
    }, [user, navigate]);

    const fetchBackendLogs = async () => {
        setIsLoadingBackend(true);
        try {
            const response = await api.get('/audit/logs/');
            const formattedLogs = response.data.results ? response.data.results : response.data;
            setBackendLogs(formattedLogs.map(log => ({
                id: log.id,
                timestamp: log.timestamp,
                userName: log.actor_name || log.actor?.username || 'System',
                userRole: log.actor_role || 'Unknown',
                action: log.action,
                resource: log.resource_type,
                module: log.module || 'Unknown',
                details: formatDetails(log),
                ipAddress: log.ip_address
            })));
        } catch (error) {
            console.error('Failed to fetch backend audit logs:', error);
        } finally {
            setIsLoadingBackend(false);
        }
    };

    const formatDetails = (log) => {
        if (log.details && typeof log.details === 'object') {
            const parts = [];
            if (log.details.title) parts.push(`Title: ${log.details.title}`);
            if (log.details.file_name) parts.push(`File: ${log.details.file_name}`);
            if (log.details.version) parts.push(`Version: ${log.details.version}`);
            if (log.details.comments) parts.push(`Comments: ${log.details.comments}`);
            return parts.join(' | ') || JSON.stringify(log.details);
        }
        return String(log.details || '');
    };

    // Get current logs based on active tab
    const currentLogs = activeTab === 'backend' ? backendLogs : localLogs;

    const filteredLogs = currentLogs.filter(log => {
        const matchesSearch =
            (log.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.details || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.resource || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.action || '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = roleFilter === 'All' || log.userRole === roleFilter;

        return matchesSearch && matchesRole;
    });

    const roles = ['All', ...new Set(currentLogs.map(l => l.userRole).filter(Boolean))];

    const getActionColor = (action) => {
        const actionUpper = (action || '').toUpperCase();
        if (actionUpper.includes('CREATE') || actionUpper.includes('UPLOAD')) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
        if (actionUpper.includes('DELETE') || actionUpper.includes('REJECT') || actionUpper.includes('ARCHIVE')) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
        if (actionUpper.includes('UPDATE') || actionUpper.includes('VERSION') || actionUpper.includes('MOVE')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
        if (actionUpper.includes('APPROVE') || actionUpper.includes('VALIDATE')) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
        if (actionUpper.includes('VIEW') || actionUpper.includes('DOWNLOAD')) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
        if (actionUpper.includes('SUBMIT') || actionUpper.includes('REVISION')) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
        return 'bg-app-surface text-app-muted';
    };

    // Export current visible logs as CSV
    const handleExportCSV = () => {
        const logsToExport = filteredLogs;
        if (!logsToExport.length) {
            alert('No logs to export.');
            return;
        }

        const headers = ['Timestamp', 'User Name', 'Role', 'Action', 'Resource', 'Details', 'IP Address'];
        const csvContent = [
            headers.join(','),
            ...logsToExport.map(log => [
                `"${log.timestamp || ''}"`,
                `"${(log.userName || '').replace(/"/g, '""')}"`,
                `"${(log.userRole || '').replace(/"/g, '""')}"`,
                `"${(log.action || '').replace(/"/g, '""')}"`,
                `"${(log.resource || '').replace(/"/g, '""')}"`,
                `"${(log.details || '').replace(/"/g, '""')}"`,
                `"${log.ipAddress || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `audit_logs_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-app-heading flex items-center gap-2">
                        <Shield className="text-primary-600" /> System Audit Logs
                    </h1>
                    <p className="text-app-muted mt-1">Immutable record of all system activities and security events</p>
                </div>
                <div className="flex items-center gap-3">
                    {activeTab === 'backend' && (
                        <Button
                            variant="outline"
                            onClick={fetchBackendLogs}
                            className="flex items-center gap-2"
                            disabled={isLoadingBackend}
                        >
                            <RefreshCw size={18} className={isLoadingBackend ? 'animate-spin' : ''} />
                            Refresh
                        </Button>
                    )}
                    <Button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 bg-app-text text-app-card hover:opacity-90"
                    >
                        <Download size={18} /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Tab Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab('backend')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'backend'
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                        : 'bg-app-card text-app-muted border border-app hover:bg-app-surface'
                        }`}
                >
                    <Database size={20} />
                    Backend Logs (All Modules)
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'backend' ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-700'
                        }`}>
                        {backendLogs.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('frontend')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'frontend'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                        : 'bg-app-card text-app-muted border border-app hover:bg-app-surface'
                        }`}
                >
                    <HardDrive size={20} />
                    Frontend Logs (Local)
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'frontend' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                        }`}>
                        {localLogs.length}
                    </span>
                </button>
            </div>

            {/* Info Banner */}
            <div className={`p-4 rounded-xl flex items-center gap-3 ${activeTab === 'backend'
                ? 'bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800'
                : 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800'
                }`}>
                {activeTab === 'backend' ? (
                    <>
                        <Database className="text-primary-600 dark:text-primary-400" size={24} />
                        <div>
                            <p className="font-medium text-primary-900 dark:text-primary-100">Backend Audit Logs (All System Modules)</p>
                            <p className="text-sm text-primary-700 dark:text-primary-300">Permanent, immutable records of all system activities (EDMS, Users, Projects, Communications) stored in the database.</p>
                        </div>
                    </>
                ) : (
                    <>
                        <HardDrive className="text-amber-600 dark:text-amber-400" size={24} />
                        <div>
                            <p className="font-medium text-amber-900 dark:text-amber-100">Frontend Audit Logs (Browser Storage)</p>
                            <p className="text-sm text-amber-700 dark:text-amber-300">Local logs stored in browser's localStorage. These are cleared when browser data is cleared.</p>
                        </div>
                    </>
                )}
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" size={20} />
                        <input
                            type="text"
                            placeholder="Search by user, action, or details..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-app bg-app-input text-app-text focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-app-muted" />
                        <select
                            className="p-2 border border-app bg-app-input text-app-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            {roles.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Logs Table */}
            <div className="bg-app-card rounded-xl shadow-sm border border-app-subtle overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-app-surface border-b border-app-subtle text-xs uppercase text-app-muted font-semibold">
                                <th className="p-4 w-48">Timestamp</th>
                                <th className="p-4 w-48">User Identity</th>
                                <th className="p-4 w-40">Action</th>
                                <th className="p-4 w-32">Resource</th>
                                <th className="p-4 w-24">Module</th>
                                <th className="p-4">Details</th>
                                {activeTab === 'backend' && <th className="p-4 w-32">IP Address</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
                            {(activeTab === 'backend' && isLoadingBackend) ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-app-muted">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Loading backend logs...
                                    </td>
                                </tr>
                            ) : filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-app-surface transition-colors">
                                        <td className="p-4 text-sm text-app-muted font-mono">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} />
                                                {new Date(log.timestamp).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-app-heading flex items-center gap-1">
                                                    <User size={14} className="text-app-muted" /> {log.userName}
                                                </span>
                                                <span className="text-xs text-app-muted">{log.userRole}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${getActionColor(log.action)}`}>
                                                <Activity size={12} /> {log.action}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-app-text font-medium">
                                            {log.resource}
                                        </td>
                                        <td className="p-4">
                                            {log.module && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                                                    {log.module}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-app-text-medium">
                                            <div className="flex items-center gap-2 max-w-md truncate" title={log.details}>
                                                <FileText size={14} className="text-app-muted flex-shrink-0" />
                                                <span className="truncate">{log.details}</span>
                                            </div>
                                        </td>
                                        {activeTab === 'backend' && (
                                            <td className="p-4 text-sm text-app-muted font-mono">
                                                {log.ipAddress || '-'}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-app-muted">
                                        No audit logs found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AuditLogs;
