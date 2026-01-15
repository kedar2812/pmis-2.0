import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import dashboardService from '@/api/services/dashboardService';
import projectService from '@/api/services/projectService';
import { DynamicChart } from '@/components/ui/DynamicChart';
import { PageLoading } from '@/components/ui/Loading';
import GraphAnalysisModal from '@/components/ui/GraphAnalysisModal';
import HealthSummaryPanel from './HealthSummaryPanel';
import RadialProgressCard from './RadialProgressCard';
import PhaseProgressCard from './PhaseProgressCard';
import MiniCalendarWidget from './MiniCalendarWidget';
import { AnimatedNumber } from '@/hooks/useAnimatedCounter';
import {
    TrendingUp, TrendingDown, DollarSign, FolderOpen, Clock, AlertTriangle,
    FileText, CheckCircle, Calendar, ChevronRight, Bell, Activity, ArrowRight,
    Target, MapPin, Flag, AlertCircle, FileSignature, BarChart3, Maximize2,
    Map, Box, Shield, GitPullRequest, Wallet, CircleDollarSign
} from 'lucide-react';

// Glass Card Component
const GlassCard = ({ children, className = '', onClick, hoverable = false }) => (
    <motion.div
        className={`
            relative overflow-hidden rounded-2xl
            bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl
            border border-slate-200 dark:border-neutral-800
            shadow-sm dark:shadow-lg
            ${hoverable ? 'hover:shadow-lg dark:hover:shadow-xl hover:bg-white dark:hover:bg-neutral-800/90 cursor-pointer' : ''}
            transition-all duration-300
            ${className}
        `}
        onClick={onClick}
        whileHover={hoverable ? { y: -2, scale: 1.005 } : {}}
        whileTap={hoverable ? { scale: 0.995 } : {}}
    >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 dark:from-white/5 via-transparent to-transparent pointer-events-none" />
        {children}
    </motion.div>
);

// KPI Card - Architecture compliant
const KPICard = ({ icon: Icon, label, value, subtext, color, trend, onClick }) => {
    const colorClasses = {
        blue: 'from-blue-500 to-blue-600',
        emerald: 'from-emerald-500 to-emerald-600',
        amber: 'from-amber-500 to-amber-600',
        violet: 'from-violet-500 to-violet-600',
        rose: 'from-rose-500 to-rose-600',
    };

    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity;

    return (
        <GlassCard className="p-5" hoverable onClick={onClick}>
            <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
                    <Icon className="text-white" size={20} />
                </div>
                {trend && (
                    <TrendIcon size={16} className={trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-slate-400'} />
                )}
            </div>
            <div className="mt-4">
                <p className="text-sm text-slate-500 dark:text-neutral-400 font-medium">{label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
                {subtext && <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1">{subtext}</p>}
            </div>
        </GlassCard>
    );
};

// Milestone Item
const MilestoneItem = ({ milestone, onClick }) => (
    <motion.div
        className="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
        onClick={onClick}
        whileHover={{ x: 4 }}
    >
        <div className="w-3 h-3 rounded-full bg-primary-500 ring-4 ring-primary-100" />
        <div className="flex-1">
            <p className="text-sm font-medium text-slate-700 dark:text-neutral-200">{milestone.name}</p>
            <p className="text-xs text-slate-400 dark:text-neutral-500">{milestone.project}</p>
        </div>
        <div className="text-right">
            <p className="text-xs font-medium text-slate-600 dark:text-neutral-400">
                {milestone.date ? new Date(milestone.date).toLocaleDateString() : 'TBD'}
            </p>
        </div>
    </motion.div>
);

// Alert Item
const AlertItem = ({ alert, onClick }) => {
    const severityColors = {
        critical: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
        warning: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
        info: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    };

    return (
        <motion.div
            className={`p-3 rounded-lg border ${severityColors[alert.severity]} cursor-pointer`}
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
        >
            <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                <span className="text-sm font-medium">{alert.message}</span>
            </div>
        </motion.div>
    );
};

// Risk Badge
const RiskBadge = ({ level, count }) => {
    const colors = {
        high: 'bg-rose-500',
        medium: 'bg-amber-500',
        low: 'bg-emerald-500',
    };
    return (
        <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${colors[level]}`} />
            <span className="text-sm font-medium text-slate-600 dark:text-neutral-300 capitalize">{level}</span>
            <span className="text-sm font-bold text-slate-800 dark:text-white">{count}</span>
        </div>
    );
};

// EVM Gauge
const EVMGauge = ({ label, value, isGood }) => (
    <div className="text-center">
        <div className={`text-3xl font-bold ${isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {value.toFixed(2)}
        </div>
        <div className="text-xs text-slate-500 dark:text-neutral-400 mt-1">{label}</div>
        <div className={`text-xs mt-1 ${isGood ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
            {isGood ? '✓ On Track' : '⚠ Attention'}
        </div>
    </div>
);

const UnifiedDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [projects, setProjects] = useState([]);
    const [graphModalOpen, setGraphModalOpen] = useState(false);
    const [graphModalMetric, setGraphModalMetric] = useState('budget');
    const [error, setError] = useState(null);

    // Default stats to prevent crashes
    const defaultStats = {
        project_stats: { total: 0, in_progress: 0, completed: 0, planning: 0, on_hold: 0 },
        financial_summary: { total_budget: 0, total_spent: 0, remaining: 0, utilization: 0 },
        schedule_health: { on_track: 0, delayed: 0, critical: 0 },
        alerts: [],
        milestones: [],
        critical_path_tasks: [],
        risk_summary: { high: 0, medium: 0, low: 0 },
        change_requests: [],
        earned_value: { cpi: 1.0, spi: 1.0 },
        cash_flow: [],
        recent_activity: [],
        top_projects: [],
        // New progress tracking data
        portfolio_progress: {
            physical_progress: 0,
            financial_progress: 0,
            earned_value: 0,
            schedule_variance: 0,
            active_projects: 0
        },
        progress_state_counts: { claimed: 0, verified: 0, flagged: 0 }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setError(null);

                // Create a timeout promise
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), 10000)
                );

                // Race between actual fetch and timeout
                const [statsData, projectsData] = await Promise.race([
                    Promise.all([
                        dashboardService.getStats().catch(err => {
                            console.warn('Stats fetch failed:', err);
                            return defaultStats;
                        }),
                        projectService.getAllProjects().catch(err => {
                            console.warn('Projects fetch failed:', err);
                            return [];
                        })
                    ]),
                    timeoutPromise.then(() => [defaultStats, []])
                ]);

                setStats(statsData || defaultStats);
                setProjects(Array.isArray(projectsData) ? projectsData : projectsData?.results || []);
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
                setError('Failed to load dashboard data');
                // Set defaults to prevent crash
                setStats(defaultStats);
                setProjects([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <PageLoading text="Loading Command Center..." />;
    }

    // Extract data
    const projectStats = stats?.project_stats || {};
    const financialSummary = stats?.financial_summary || {};
    const scheduleHealth = stats?.schedule_health || {};
    const alerts = stats?.alerts || [];
    const milestones = stats?.milestones || [];
    const criticalPathTasks = stats?.critical_path_tasks || [];
    const riskSummary = stats?.risk_summary || { high: 0, medium: 0, low: 0 };
    const changeRequests = stats?.change_requests || [];
    const earnedValue = stats?.earned_value || { cpi: 1.0, spi: 1.0 };
    const cashFlow = stats?.cash_flow || [];
    const recentActivity = stats?.recent_activity || [];
    const topProjects = stats?.top_projects || [];

    // NEW: Aggregated Progress from computed backend values
    const portfolioProgress = stats?.portfolio_progress || {
        physical_progress: 0,
        financial_progress: 0,
        earned_value: 0,
        schedule_variance: 0,
        active_projects: 0
    };
    const progressStateCounts = stats?.progress_state_counts || { claimed: 0, verified: 0, flagged: 0 };

    // Chart data
    const financialChartData = projects.slice(0, 8).map(p => ({
        name: (p.name || 'Project').substring(0, 12),
        budget: (Number(p.budget) || 0) / 10000000,
        spent: (Number(p.spent) || 0) / 10000000,
    }));

    const cashFlowChartData = cashFlow.map(c => ({
        name: c.month,
        inflow: c.inflow,
        outflow: c.outflow,
    }));

    // KPIs from computed backend values (not calculated client-side)
    // These are now aggregated from task-level progress data
    const physicalProgress = Math.round(portfolioProgress.physical_progress || 0);
    const financialProgress = Math.round(portfolioProgress.financial_progress || 0);
    const portfolioEarnedValue = portfolioProgress.earned_value || 0;
    const scheduleVariance = portfolioProgress.schedule_variance || 0;
    const flaggedProjects = progressStateCounts.flagged || 0;

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <div className="min-h-screen space-y-6 pb-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white">
                        {greeting()}, {user?.first_name || 'Admin'}
                    </h1>
                    <p className="text-slate-500 dark:text-neutral-400 mt-1">
                        PMIS Command Center • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                {alerts.length > 0 && (
                    <motion.div
                        className="flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-xl"
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                    >
                        <Bell size={18} />
                        <span className="font-medium">{alerts.length} alerts require attention</span>
                    </motion.div>
                )}
            </motion.div>

            {/* Section 1: KPI Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                    icon={Target}
                    label="Physical Progress"
                    value={`${physicalProgress}%`}
                    subtext={`${projectStats.in_progress || 0} active projects`}
                    color="blue"
                    trend={physicalProgress >= 50 ? 'up' : 'down'}
                    onClick={() => navigate('/projects')}
                />
                <KPICard
                    icon={CircleDollarSign}
                    label="Financial Progress"
                    value={`${financialProgress}%`}
                    subtext={`₹${((financialSummary.total_spent || 0) / 10000000).toFixed(1)} Cr spent`}
                    color="emerald"
                    trend={financialProgress <= 80 ? 'up' : 'down'}
                    onClick={() => navigate('/cost/budgeting')}
                />
                <KPICard
                    icon={Clock}
                    label="Schedule Health"
                    value={scheduleHealth.no_data ? 'No Data' : `${scheduleHealth.percentage || 0}%`}
                    subtext={scheduleHealth.no_data ? 'No schedules created yet' : `${scheduleHealth.on_track || 0} on track`}
                    color={scheduleHealth.no_data ? 'violet' : (scheduleHealth.percentage >= 80 ? 'emerald' : 'amber')}
                    trend={scheduleHealth.no_data ? null : (scheduleHealth.percentage >= 80 ? 'up' : 'down')}
                    onClick={() => navigate('/scheduling')}
                />
                <KPICard
                    icon={FileSignature}
                    label="Pending Approvals"
                    value={stats?.pending_approvals || 0}
                    subtext="documents awaiting review"
                    color={stats?.pending_approvals > 0 ? 'amber' : 'emerald'}
                    onClick={() => navigate('/approvals')}
                />
            </div>

            {/* Section 1.5: Health Summary + Phase Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Health Summary Panel */}
                <HealthSummaryPanel
                    scheduleHealth={scheduleHealth}
                    projectStats={projectStats}
                    financialSummary={financialSummary}
                    overdueTasks={stats?.overdue_tasks || 0}
                    projects={projects}
                />

                {/* Phase Progress */}
                <PhaseProgressCard
                    title="Progress by Phase"
                    phases={[
                        { id: 'design', name: 'Design', progress: Math.min(physicalProgress * 1.5, 100), color: '#3b82f6' },
                        { id: 'procurement', name: 'Procurement', progress: Math.min(physicalProgress * 1.2, 100), color: '#8b5cf6' },
                        { id: 'construction', name: 'Construction', progress: physicalProgress, color: '#f59e0b' },
                        { id: 'testing', name: 'Testing', progress: Math.max(physicalProgress - 30, 0), color: '#10b981' },
                        { id: 'closeout', name: 'Closeout', progress: Math.max(physicalProgress - 60, 0), color: '#64748b' }
                    ]}
                />
            </div>

            {/* Section 1.6: Budget vs Spent & Project Status Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Budget vs Spent Chart */}
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <DollarSign size={20} className="text-emerald-600" />
                            Budget vs Spent
                        </h3>
                        <button
                            className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                            onClick={(e) => { e.stopPropagation(); setGraphModalMetric('budget'); setGraphModalOpen(true); }}
                        >
                            <Maximize2 size={16} className="text-slate-400 hover:text-primary-500" />
                        </button>
                    </div>
                    <DynamicChart
                        data={financialChartData}
                        dataKey="budget"
                        secondaryDataKey="spent"
                        height={280}
                        colors={['#10b981', '#3b82f6']}
                        name="Budget"
                        secondaryName="Spent"
                        defaultType="bar"
                    />
                </GlassCard>

                {/* Project Status Chart */}
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <Activity size={20} className="text-blue-600" />
                            Project Status Distribution
                        </h3>
                        <button
                            className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                            onClick={(e) => { e.stopPropagation(); setGraphModalMetric('count'); setGraphModalOpen(true); }}
                        >
                            <Maximize2 size={16} className="text-slate-400 hover:text-primary-500" />
                        </button>
                    </div>
                    <DynamicChart
                        data={[
                            { name: 'In Progress', value: projectStats.in_progress || 0 },
                            { name: 'Planning', value: projectStats.planning || 0 },
                            { name: 'Completed', value: projectStats.completed || 0 },
                            { name: 'On Hold', value: projectStats.on_hold || 0 },
                        ]}
                        dataKey="value"
                        height={280}
                        colors={['#3b82f6', '#f59e0b', '#10b981', '#64748b']}
                        name="Projects"
                        defaultType="pie"
                    />
                </GlassCard>
            </div>

            {/* Section 2: Schedule & Timeline + Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Milestones */}
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <Flag size={20} className="text-primary-600" />
                            Upcoming Milestones
                        </h3>
                        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium" onClick={() => navigate('/scheduling')}>
                            View Schedule →
                        </button>
                    </div>
                    <div className="space-y-1">
                        {milestones.length > 0 ? (
                            milestones.slice(0, 5).map((m, idx) => (
                                <MilestoneItem key={m.id || idx} milestone={m} onClick={() => navigate('/scheduling')} />
                            ))
                        ) : (
                            <p className="text-center py-8 text-slate-400 dark:text-neutral-500 text-sm">No upcoming milestones</p>
                        )}
                    </div>
                </GlassCard>

                {/* Alerts & Critical Path */}
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <AlertTriangle size={20} className="text-amber-500" />
                            Alerts & Critical Items
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {alerts.length > 0 ? (
                            alerts.slice(0, 4).map((alert, idx) => (
                                <AlertItem key={idx} alert={alert} onClick={() => navigate(alert.link || '/')} />
                            ))
                        ) : (
                            <div className="text-center py-6">
                                <CheckCircle size={32} className="mx-auto text-emerald-400 mb-2" />
                                <p className="text-sm text-slate-500 dark:text-neutral-400">All systems operational</p>
                            </div>
                        )}
                        {criticalPathTasks.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <p className="text-xs font-medium text-slate-400 uppercase mb-2">Critical Path Tasks</p>
                                {criticalPathTasks.slice(0, 2).map((t, idx) => (
                                    <div key={idx} className={`text-sm py-1 ${t.is_overdue ? 'text-rose-600' : 'text-slate-600 dark:text-neutral-400'}`}>
                                        • {t.name} ({t.project})
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </GlassCard>
            </div>

            {/* Section 3: Calendar + GIS Map */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Mini Calendar Widget */}
                <MiniCalendarWidget milestones={milestones} />

                {/* GIS Map Placeholder */}
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <Map size={20} className="text-blue-600" />
                            Project Locations (GIS)
                        </h3>
                        <span className="text-xs text-slate-400 dark:text-neutral-500 bg-slate-100 dark:bg-neutral-800 px-2 py-1 rounded">Phase 2</span>
                    </div>
                    <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300">
                        <div className="text-center">
                            <MapPin size={40} className="mx-auto text-slate-400 mb-2" />
                            <p className="text-slate-500 font-medium">Interactive GIS Map</p>
                            <p className="text-xs text-slate-400">Project sites, utilities & boundaries</p>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Section 4: Risk & Compliance + Change Requests */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Risk Summary */}
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <Shield size={20} className="text-rose-500" />
                            Risk Summary
                        </h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <RiskBadge level="high" count={riskSummary.high || 0} />
                        <RiskBadge level="medium" count={riskSummary.medium || 0} />
                        <RiskBadge level="low" count={riskSummary.low || 0} />
                    </div>
                    {riskSummary.top_risks?.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-xs font-medium text-slate-400 uppercase mb-2">Top Risks</p>
                            {riskSummary.top_risks.map((r, idx) => (
                                <div key={idx} className="text-sm text-rose-600 py-1">• {r.title}</div>
                            ))}
                        </div>
                    )}
                </GlassCard>

                {/* Change Requests */}
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <GitPullRequest size={20} className="text-violet-500" />
                            Change Requests / Variations
                        </h3>
                        <button
                            className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                            onClick={() => navigate('/e-procurement')}
                        >
                            View All →
                        </button>
                    </div>
                    <div className="space-y-2">
                        {changeRequests.length > 0 ? (
                            changeRequests.slice(0, 3).map((cr, idx) => (
                                <motion.div
                                    key={idx}
                                    className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-100 dark:border-violet-800 cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                                    onClick={() => navigate('/e-procurement')}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-medium text-slate-700 dark:text-neutral-300">{cr.title}</p>
                                            <p className="text-xs text-slate-400">{cr.contract}</p>
                                        </div>
                                        <span className="text-xs px-2 py-1 bg-violet-200 text-violet-700 dark:bg-violet-800 dark:text-violet-200 rounded">
                                            {cr.status}
                                        </span>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <p className="text-center py-6 text-slate-400 text-sm">No pending variations</p>
                        )}
                    </div>
                </GlassCard>
            </div>

            {/* Section 5: Financial Overview - EVM + Cash Flow */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* EVM Metrics */}
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <BarChart3 size={20} className="text-emerald-600" />
                            Earned Value Analysis
                        </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                        <EVMGauge label="CPI (Cost Performance)" value={earnedValue.cpi || 1.0} isGood={(earnedValue.cpi || 1.0) >= 1.0} />
                        <EVMGauge label="SPI (Schedule Performance)" value={earnedValue.spi || 1.0} isGood={(earnedValue.spi || 1.0) >= 1.0} />
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-neutral-800 text-center">
                        <span className={`text-sm font-medium ${earnedValue.status === 'on_budget' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {earnedValue.status === 'on_budget' ? '✓ Project Portfolio On Budget' : '⚠ Budget Variance Detected'}
                        </span>
                    </div>
                </GlassCard>

                {/* Cash Flow Chart */}
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <Wallet size={20} className="text-blue-600" />
                            Cash Flow Trend
                        </h3>
                        <button
                            className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                            onClick={() => { setGraphModalMetric('spent'); setGraphModalOpen(true); }}
                        >
                            <Maximize2 size={16} className="text-slate-400 hover:text-primary-500" />
                        </button>
                    </div>
                    <DynamicChart
                        data={cashFlowChartData}
                        dataKey="inflow"
                        height={200}
                        colors={['#10b981', '#3b82f6', '#8b5cf6']}
                        name="Inflow"
                        defaultType="area"
                    />
                </GlassCard>
            </div>

            {/* Section 6: Projects Table */}
            <GlassCard className="overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-neutral-800">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <FolderOpen size={20} className="text-primary-600" />
                            Project Portfolio
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
                        <thead className="bg-slate-50 dark:bg-neutral-800/50">
                            <tr className="text-xs font-medium text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                                <th className="py-3 pl-6 text-left">Project</th>
                                <th className="py-3 text-left">Status</th>
                                <th className="py-3 text-right">Budget</th>
                                <th className="py-3 text-right">Spent</th>
                                <th className="py-3 pr-6">Progress</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                            {(topProjects.length > 0 ? topProjects : projects.slice(0, 5)).map((project, idx) => {
                                const budget = Number(project.budget) || 0;
                                const spent = Number(project.spent) || 0;
                                const progress = Number(project.progress) || 0;
                                const statusColors = {
                                    'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                                    'Planning': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                                    'Completed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                                    'On Hold': 'bg-slate-100 text-slate-700 dark:bg-neutral-700 dark:text-slate-300',
                                };
                                return (
                                    <tr key={project.id || idx} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                                        <td className="py-3 pl-6">
                                            <p className="font-medium text-slate-800 dark:text-white">{project.name}</p>
                                        </td>
                                        <td className="py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[project.status] || 'bg-slate-100 text-slate-700 dark:bg-neutral-700 dark:text-slate-300'}`}>
                                                {project.status || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="py-3 text-right text-sm font-medium text-slate-700 dark:text-neutral-300">
                                            ₹{(budget / 10000000).toFixed(2)} Cr
                                        </td>
                                        <td className="py-3 text-right text-sm text-slate-600 dark:text-neutral-400">
                                            ₹{(spent / 10000000).toFixed(2)} Cr
                                        </td>
                                        <td className="py-3 pr-6">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-medium text-slate-500 dark:text-neutral-400 w-10 text-right">{progress}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {topProjects.length === 0 && projects.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-neutral-500">No projects found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            {/* Graph Analysis Modal */}
            <GraphAnalysisModal
                isOpen={graphModalOpen}
                onClose={() => setGraphModalOpen(false)}
                projects={projects}
                initialMetric={graphModalMetric}
            />
        </div>
    );
};

export default UnifiedDashboard;
