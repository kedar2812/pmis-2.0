import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Clock, CheckSquare, AlertTriangle, TrendingUp, DollarSign,
    ArrowRight, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';

/**
 * Health Summary Panel
 * Quick-glance panel showing 5 key project health metrics
 * Inspired by construction dashboard reference images
 */
const HealthSummaryPanel = ({
    scheduleHealth = {},
    projectStats = {},
    financialSummary = {},
    overdueTasks = 0,
    projects = []
}) => {
    const navigate = useNavigate();

    // Calculate health metrics
    const totalTasks = scheduleHealth.total_tasks || 0;
    const onTrackTasks = scheduleHealth.on_track || 0;
    const delayedTasks = scheduleHealth.delayed || 0;

    // Time health
    const timePercentage = scheduleHealth.percentage || 0;
    const timeStatus = scheduleHealth.no_data
        ? 'No schedule data'
        : timePercentage >= 80
            ? `${timePercentage}% on track`
            : `${100 - timePercentage}% delayed`;
    const timeHealthy = timePercentage >= 80;

    // Tasks health
    const tasksRemaining = totalTasks - onTrackTasks;
    const tasksStatus = scheduleHealth.no_data
        ? 'No tasks scheduled'
        : `${tasksRemaining} tasks to complete`;
    const tasksHealthy = tasksRemaining === 0 || scheduleHealth.no_data;

    // Overdue health
    const overdueStatus = overdueTasks > 0
        ? `${overdueTasks} tasks overdue`
        : 'No overdue tasks';
    const overdueHealthy = overdueTasks === 0;

    // Progress health
    const avgProgress = projects.length > 0
        ? Math.round(projects.reduce((sum, p) => sum + (Number(p.progress) || 0), 0) / projects.length)
        : 0;
    const progressStatus = projects.length > 0
        ? `${avgProgress}% complete`
        : 'No projects';
    const progressHealthy = avgProgress >= 50;

    // Cost health
    const budget = financialSummary.total_budget || 0;
    const spent = financialSummary.total_spent || 0;
    const utilization = financialSummary.utilization || 0;
    const costStatus = budget > 0
        ? utilization <= 100
            ? `${Math.round(100 - utilization)}% under budget`
            : `${Math.round(utilization - 100)}% over budget`
        : 'No budget data';
    const costHealthy = utilization <= 90;

    const healthItems = [
        {
            id: 'time',
            icon: Clock,
            label: 'Time',
            status: timeStatus,
            healthy: timeHealthy,
            noData: scheduleHealth.no_data,
            onClick: () => navigate('/scheduling')
        },
        {
            id: 'tasks',
            icon: CheckSquare,
            label: 'Tasks',
            status: tasksStatus,
            healthy: tasksHealthy,
            noData: scheduleHealth.no_data,
            onClick: () => navigate('/scheduling')
        },
        {
            id: 'overdue',
            icon: AlertTriangle,
            label: 'Overdue',
            status: overdueStatus,
            healthy: overdueHealthy,
            noData: false,
            onClick: () => navigate('/scheduling')
        },
        {
            id: 'progress',
            icon: TrendingUp,
            label: 'Progress',
            status: progressStatus,
            healthy: progressHealthy,
            noData: projects.length === 0,
            onClick: () => navigate('/projects')
        },
        {
            id: 'cost',
            icon: DollarSign,
            label: 'Cost',
            status: costStatus,
            healthy: costHealthy,
            noData: budget === 0,
            onClick: () => navigate('/cost/budgeting')
        }
    ];

    const getStatusIcon = (healthy, noData) => {
        if (noData) return <AlertCircle size={14} className="text-slate-400 dark:text-neutral-500" />;
        if (healthy) return <CheckCircle size={14} className="text-emerald-500" />;
        return <XCircle size={14} className="text-rose-500" />;
    };

    const getStatusColor = (healthy, noData) => {
        if (noData) return 'text-slate-500 dark:text-neutral-400';
        if (healthy) return 'text-emerald-600';
        return 'text-rose-600';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-slate-200 dark:border-neutral-700 shadow-sm dark:shadow-lg p-6"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 dark:from-white/5 via-transparent to-transparent pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Project Health</h3>
                <span className="text-xs text-slate-400 dark:text-neutral-500 bg-slate-100 dark:bg-neutral-800 px-2 py-1 rounded">Quick Status</span>
            </div>

            <div className="space-y-3">
                {healthItems.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer group transition-colors"
                        onClick={item.onClick}
                    >
                        <div className="flex items-center gap-3">
                            <item.icon size={18} className="text-slate-600 dark:text-neutral-300" />
                            <span className="text-sm font-medium text-slate-700 dark:text-neutral-200 w-20">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {getStatusIcon(item.healthy, item.noData)}
                            <span className={`text-sm ${getStatusColor(item.healthy, item.noData)}`}>
                                {item.status}
                            </span>
                            <ArrowRight size={14} className="text-slate-300 dark:text-neutral-600 group-hover:text-blue-500 dark:group-hover:text-indigo-400 transition-colors" />
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default HealthSummaryPanel;
