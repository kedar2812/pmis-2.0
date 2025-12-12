import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Download, Search, Filter, Clock, User, Activity, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AuditLogger } from '@/services/AuditLogger';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Security check
        if (user && user.role !== 'SPV_Official') {
            navigate('/dashboard');
            return;
        }
        setLogs(AuditLogger.getLogs());
    }, [user, navigate]);

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.resource.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = roleFilter === 'All' || log.userRole === roleFilter;

        return matchesSearch && matchesRole;
    });

    const roles = ['All', ...new Set(logs.map(l => l.userRole))];

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-slate-900 flex items-center gap-2">
                        <Shield className="text-primary-600" /> System Audit Logs
                    </h1>
                    <p className="text-slate-500 mt-1">Immutable record of all system activities and security events</p>
                </div>
                <Button
                    onClick={AuditLogger.exportLogs}
                    className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800"
                >
                    <Download size={18} /> Export CSV
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by user, action, or details..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-slate-400" />
                        <select
                            className="p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                <th className="p-4 w-48">Timestamp</th>
                                <th className="p-4 w-48">User Identity</th>
                                <th className="p-4 w-32">Action</th>
                                <th className="p-4 w-32">Resource</th>
                                <th className="p-4">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 text-sm text-slate-500 font-mono">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} />
                                                {new Date(log.timestamp).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-900 flex items-center gap-1">
                                                    <User size={14} className="text-slate-400" /> {log.userName}
                                                </span>
                                                <span className="text-xs text-slate-500">{log.userRole}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold
                                                ${log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                                                    log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                                        log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-slate-100 text-slate-700'
                                                }
                                            `}>
                                                <Activity size={12} /> {log.action}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-700 font-medium">
                                            {log.resource}
                                        </td>
                                        <td className="p-4 text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <FileText size={14} className="text-slate-400" />
                                                {log.details}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">
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
