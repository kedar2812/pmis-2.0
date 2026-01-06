import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import dashboardService from '@/api/services/dashboardService';
import projectService from '@/api/services/projectService';
import { DynamicChart } from '@/components/ui/DynamicChart';
import { PageLoading } from '@/components/ui/Loading';
import {
    TrendingUp, TrendingDown, DollarSign, FolderOpen, Clock, AlertTriangle,
    FileText, CheckCircle, Calendar, ChevronRight, Bell, Gavel, FileSignature,
    Activity, ArrowRight, Loader2, Users, Building2, Briefcase
} from 'lucide-react';

// Glass Card Component
const GlassCard = ({ children, className = '', onClick, hoverable = true }) => (
    <motion.div
        className={`
            relative overflow-hidden rounded-2xl
            bg-white/70 backdrop-blur-xl
            border border-white/20
            shadow-[0_8px_32px_rgba(0,0,0,0.08)]
            ${hoverable ? 'hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)] hover:bg-white/80 cursor-pointer' : ''}
            transition-all duration-300
            ${className}
        `}
        onClick={onClick}
        whileHover={hoverable ? { y: -2, scale: 1.01 } : {}}
        whileTap={hoverable ? { scale: 0.99 } : {}}
    >
        {/* Glass highlight */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
        {children}
    </motion.div>
);

// KPI Card with gradient
const KPICard = ({ kpi, index, onClick }) => {
    const colorMap = {
        emerald: { bg: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-100', text: 'text-emerald-600', icon: 'text-emerald-500' },
        blue: { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-100', text: 'text-blue-600', icon: 'text-blue-500' },
        amber: { bg: 'from-amber-500 to-amber-600', light: 'bg-amber-100', text: 'text-amber-600', icon: 'text-amber-500' },
        violet: { bg: 'from-violet-500 to-violet-600', light: 'bg-violet-100', text: 'text-violet-600', icon: 'text-violet-500' },
        rose: { bg: 'from-rose-500 to-rose-600', light: 'bg-rose-100', text: 'text-rose-600', icon: 'text-rose-500' },
    };

    const colors = colorMap[kpi.color] || colorMap.blue;
    const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Activity;

    const iconMap = {
        total_budget: DollarSign,
        active_projects: FolderOpen,
        pending_approvals: Clock,
        schedule_health: Calendar,
        active_contracts: FileSignature,
    };
    const Icon = iconMap[kpi.id] || Activity;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={onClick}
        >
            <GlassCard className="p-5 group">
                <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${colors.bg} shadow-lg`}>
                        <Icon className="text-white" size={22} />
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${colors.light}`}>
                        <TrendIcon size={14} className={colors.icon} />
                        <span className={`text-xs font-medium ${colors.text}`}>{kpi.change}</span>
                    </div>
                </div>
                <div className="mt-4">
                    <p className="text-sm text-slate-500 font-medium">{kpi.label}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{kpi.formatted}</p>
                </div>
            </GlassCard>
        </motion.div>
    );
};

// Alert Card
const AlertCard = ({ alert, onClick }) => {
    const severityColors = {
        critical: 'border-l-rose-500 bg-rose-50/50',
        warning: 'border-l-amber-500 bg-amber-50/50',
        info: 'border-l-blue-500 bg-blue-50/50',
    };

    return (
        <motion.div
            className={`p-4 rounded-lg border-l-4 ${severityColors[alert.severity]} cursor-pointer hover:shadow-md transition-all`}
            onClick={onClick}
            whileHover={{ x: 4 }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <AlertTriangle size={18} className={alert.severity === 'critical' ? 'text-rose-500' : 'text-amber-500'} />
                    <span className="text-sm font-medium text-slate-700">{alert.message}</span>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
            </div>
        </motion.div>
    );
};

// Activity Item
const ActivityItem = ({ activity, onClick }) => {
    const iconMap = {
        project_update: FolderOpen,
        document_upload: FileText,
    };
    const colorMap = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
    };

    const Icon = iconMap[activity.type] || Activity;
    const colorClass = colorMap[activity.color] || 'bg-slate-100 text-slate-600';

    return (
        <motion.div
            className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
            onClick={onClick}
            whileHover={{ x: 2 }}
        >
            <div className={`p-2 rounded-lg ${colorClass}`}>
                <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{activity.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(activity.timestamp).toLocaleString()}
                </p>
            </div>
        </motion.div>
    );
};

// Project Row
const ProjectRow = ({ project, onClick }) => {
    const statusColors = {
        'In Progress': 'bg-blue-100 text-blue-700',
        'Planning': 'bg-amber-100 text-amber-700',
        'Completed': 'bg-green-100 text-green-700',
        'On Hold': 'bg-slate-100 text-slate-700',
    };

    return (
        <motion.tr
            className="hover:bg-slate-50/50 cursor-pointer transition-colors"
            onClick={onClick}
            whileHover={{ backgroundColor: 'rgba(248, 250, 252, 0.8)' }}
        >
            <td className="py-3 pl-4">
                <p className="font-medium text-slate-800 truncate max-w-[200px]">{project.name}</p>
            </td>
            <td className="py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
                    {project.status}
                </span>
            </td>
            <td className="py-3 text-right text-sm font-medium text-slate-700">
                ₹{(project.budget / 10000000).toFixed(2)} Cr
            </td>
            <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${project.progress}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                        />
                    </div>
                    <span className="text-xs font-medium text-slate-500 w-10 text-right">{project.progress}%</span>
                </div>
            </td>
        </motion.tr>
    );
};

// Quick Action Card
const QuickActionCard = ({ icon: Icon, label, count, color, onClick }) => (
    <GlassCard className="p-4" onClick={onClick}>
        <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${color}`}>
                <Icon size={20} className="text-white" />
            </div>
            <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">{label}</p>
                {count !== undefined && (
                    <p className="text-lg font-bold text-slate-900">{count}</p>
                )}
            </div>
            <ChevronRight size={18} className="text-slate-300" />
        </div>
    </GlassCard>
);

const UnifiedDashboard = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, projectsData] = await Promise.all([
                    dashboardService.getStats(),
                    projectService.getAllProjects()
                ]);
                setStats(statsData);
                setProjects(projectsData || []);
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <PageLoading text="Loading Dashboard..." />;
    }

    const kpis = stats?.kpis || [];
    const alerts = stats?.alerts || [];
    const recentActivity = stats?.recent_activity || [];
    const topProjects = stats?.top_projects || [];
    const projectStats = stats?.project_stats || {};
    const financialSummary = stats?.financial_summary || {};
    const procurementSummary = stats?.procurement_summary || {};

    // Chart data
    const financialChartData = projects.slice(0, 6).map(p => ({
        name: p.name?.substring(0, 15) || 'Project',
        budget: (p.budget || 0) / 10000000,
        spent: (p.spent || 0) / 10000000,
    }));

    const projectStatusData = [
        { name: 'In Progress', value: projectStats.in_progress || 0 },
        { name: 'Planning', value: projectStats.planning || 0 },
        { name: 'Completed', value: projectStats.completed || 0 },
        { name: 'On Hold', value: projectStats.on_hold || 0 },
    ].filter(d => d.value > 0);

    const formatCurrency = (amount) => {
        const num = Number(amount) || 0;
        return `₹${(num / 10000000).toFixed(2)} Cr`;
    };

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <div className="min-h-screen space-y-6 pb-8">
            {/* Welcome Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-heading font-bold text-slate-900">
                        {greeting()}, {user?.first_name || 'User'}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {alerts.length > 0 && (
                        <motion.button
                            className="relative p-2.5 bg-rose-100 text-rose-600 rounded-xl hover:bg-rose-200 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Bell size={20} />
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                                {alerts.length}
                            </span>
                        </motion.button>
                    )}
                </div>
            </motion.div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {kpis.map((kpi, idx) => (
                    <KPICard key={kpi.id} kpi={kpi} index={idx} onClick={() => navigate(`/projects`)} />
                ))}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Financial Overview - 2 cols */}
                <GlassCard className="lg:col-span-2 p-6" hoverable={false}>
                    <DynamicChart
                        title="Budget vs Spent (in Crores)"
                        data={financialChartData}
                        dataKey="budget"
                        height={280}
                        colors={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4']}
                        name="Budget"
                        defaultType="bar"
                    />
                </GlassCard>

                {/* Project Status - 1 col */}
                <GlassCard className="p-6" hoverable={false}>
                    <DynamicChart
                        title="Project Status"
                        data={projectStatusData}
                        dataKey="value"
                        height={280}
                        colors={['#3b82f6', '#f59e0b', '#10b981', '#64748b']}
                        nameKey="name"
                        defaultType="pie"
                    />
                </GlassCard>
            </div>

            {/* Alerts and Activity Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Alerts */}
                <GlassCard className="p-6" hoverable={false}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <AlertTriangle size={20} className="text-amber-500" />
                            Critical Alerts
                        </h3>
                        {alerts.length > 0 && (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-700 text-xs font-medium rounded-full">
                                {alerts.length} items
                            </span>
                        )}
                    </div>
                    <div className="space-y-3">
                        {alerts.length > 0 ? (
                            alerts.map((alert, idx) => (
                                <AlertCard key={idx} alert={alert} onClick={() => navigate(alert.link)} />
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                                <p className="text-sm">All systems operational</p>
                            </div>
                        )}
                    </div>
                </GlassCard>

                {/* Activity */}
                <GlassCard className="p-6" hoverable={false}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <Activity size={20} className="text-blue-500" />
                            Recent Activity
                        </h3>
                        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                            View all
                        </button>
                    </div>
                    <div className="space-y-1 max-h-[280px] overflow-y-auto">
                        {recentActivity.length > 0 ? (
                            recentActivity.slice(0, 6).map((activity, idx) => (
                                <ActivityItem key={idx} activity={activity} onClick={() => navigate(activity.link || '/')} />
                            ))
                        ) : (
                            <p className="text-center py-8 text-slate-400 text-sm">No recent activity</p>
                        )}
                    </div>
                </GlassCard>
            </div>

            {/* Quick Access */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickActionCard
                    icon={Clock}
                    label="Pending Approvals"
                    count={stats?.pending_approvals || 0}
                    color="bg-gradient-to-br from-amber-500 to-amber-600"
                    onClick={() => navigate('/approvals')}
                />
                <QuickActionCard
                    icon={Gavel}
                    label="Active Tenders"
                    count={procurementSummary.active_tenders || 0}
                    color="bg-gradient-to-br from-violet-500 to-violet-600"
                    onClick={() => navigate('/e-procurement')}
                />
                <QuickActionCard
                    icon={FileText}
                    label="Documents"
                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                    onClick={() => navigate('/edms')}
                />
                <QuickActionCard
                    icon={Calendar}
                    label="Schedule"
                    color="bg-gradient-to-br from-emerald-500 to-emerald-600"
                    onClick={() => navigate('/scheduling')}
                />
            </div>

            {/* Top Projects Table */}
            <GlassCard className="overflow-hidden" hoverable={false}>
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <Briefcase size={20} className="text-primary-600" />
                            Top Projects by Value
                        </h3>
                        <button
                            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
                            onClick={() => navigate('/projects')}
                        >
                            View all <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50/50">
                            <tr className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                <th className="py-3 pl-6 text-left">Project</th>
                                <th className="py-3 text-left">Status</th>
                                <th className="py-3 text-right">Budget</th>
                                <th className="py-3 pr-6 text-left">Progress</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(topProjects.length > 0 ? topProjects : projects.slice(0, 5)).map((project, idx) => (
                                <ProjectRow
                                    key={project.id || idx}
                                    project={project}
                                    onClick={() => navigate(`/projects/${project.id}`)}
                                />
                            ))}
                            {topProjects.length === 0 && projects.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-slate-400">
                                        No projects found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
};

export default UnifiedDashboard;
