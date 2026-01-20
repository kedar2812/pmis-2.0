/**
 * MilestonePerformanceCard - Dashboard widget showing physical vs financial progress
 * 
 * Implements the "No Money Without Time" visualization:
 * - Compares actual physical progress (from schedule) with financial spend (from bills)
 * - Flags overspend situations (financial > physical)
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { MotionCard, MotionCardContent, MotionCardHeader, MotionCardTitle } from '@/components/ui/MotionCard';
import financeService from '@/services/financeService';

const MilestonePerformanceCard = ({ projectId, projectName }) => {
    const [milestones, setMilestones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (projectId) {
            fetchData();
        }
    }, [projectId]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch milestones (tasks marked as milestones)
            const tasksData = await financeService.getScheduleTasks(projectId);
            const milestonesOnly = tasksData.filter(t => t.is_milestone);

            // Fetch budget allocations
            const budgetsData = await financeService.getBudgets(projectId);

            // Fetch bills
            const billsData = await financeService.getBills(projectId);

            // Calculate financial spend per milestone
            const spendByMilestone = {};
            billsData.forEach(b => {
                if (b.milestoneId) {
                    spendByMilestone[b.milestoneId] = (spendByMilestone[b.milestoneId] || 0) + (b.netPayable || 0);
                }
            });

            // Calculate budget per milestone
            const budgetByMilestone = {};
            budgetsData.forEach(b => {
                if (b.milestone) {
                    budgetByMilestone[b.milestone] = (budgetByMilestone[b.milestone] || 0) + parseFloat(b.amount || 0);
                }
            });

            // Combine data
            const enhancedMilestones = milestonesOnly
                .filter(m => budgetByMilestone[m.id] > 0) // Only show milestones with budget
                .map(m => {
                    const budget = budgetByMilestone[m.id] || 0;
                    const spent = spendByMilestone[m.id] || 0;
                    const physicalProgress = m.progress || 0;
                    const financialProgress = budget > 0 ? (spent / budget) * 100 : 0;
                    const variance = physicalProgress - financialProgress;

                    return {
                        id: m.id,
                        name: m.name,
                        physicalProgress,
                        financialProgress: Math.min(financialProgress, 100),
                        budget,
                        spent,
                        variance,
                        status: variance >= 0 ? 'healthy' : variance > -10 ? 'caution' : 'overspend'
                    };
                })
                .sort((a, b) => a.variance - b.variance); // Show overspend first

            setMilestones(enhancedMilestones);
        } catch (err) {
            console.error('Failed to fetch milestone performance:', err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
        return `₹${val.toLocaleString('en-IN')}`;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy': return 'text-green-600 bg-green-50';
            case 'caution': return 'text-amber-600 bg-amber-50';
            case 'overspend': return 'text-red-600 bg-red-50';
            default: return 'text-slate-600 bg-slate-50';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'healthy': return <CheckCircle size={14} />;
            case 'caution': return <TrendingUp size={14} />;
            case 'overspend': return <AlertTriangle size={14} />;
            default: return <Target size={14} />;
        }
    };

    if (loading) {
        return (
            <MotionCard className="shadow-lg">
                <MotionCardContent className="p-8 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                </MotionCardContent>
            </MotionCard>
        );
    }

    if (error || milestones.length === 0) {
        return (
            <MotionCard className="shadow-lg border-l-4 border-l-slate-300">
                <MotionCardHeader>
                    <MotionCardTitle className="flex items-center gap-2">
                        <Target size={18} className="text-slate-500" />
                        Milestone Performance
                    </MotionCardTitle>
                </MotionCardHeader>
                <MotionCardContent className="p-6 text-center text-slate-500">
                    {error || 'No milestones with budget allocations found'}
                </MotionCardContent>
            </MotionCard>
        );
    }

    const overspendCount = milestones.filter(m => m.status === 'overspend').length;

    return (
        <MotionCard className={`shadow-lg border-l-4 ${overspendCount > 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
            <MotionCardHeader className="pb-3">
                <div className="flex justify-between items-center">
                    <MotionCardTitle className="flex items-center gap-2">
                        <Target size={18} className={overspendCount > 0 ? 'text-red-500' : 'text-green-500'} />
                        Milestone Performance
                    </MotionCardTitle>
                    {overspendCount > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1">
                            <AlertTriangle size={12} />
                            {overspendCount} Overspend
                        </span>
                    )}
                </div>
                <p className="text-xs text-slate-500 mt-1">Physical Progress vs Financial Spend</p>
            </MotionCardHeader>
            <MotionCardContent className="p-4 pt-0 space-y-3 max-h-[300px] overflow-y-auto">
                {milestones.slice(0, 5).map((m, idx) => (
                    <motion.div
                        key={m.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`p-3 rounded-lg border ${m.status === 'overspend' ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20' : m.status === 'caution' ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-sm text-slate-800 dark:text-white line-clamp-1 flex-1">{m.name}</span>
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${getStatusColor(m.status)}`}>
                                {getStatusIcon(m.status)}
                                {m.status === 'overspend' ? 'Over' : m.status === 'caution' ? 'Watch' : 'OK'}
                            </span>
                        </div>

                        {/* Dual Progress Bars */}
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 w-14">Physical</span>
                                <div className="flex-1 h-2 bg-slate-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-blue-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${m.physicalProgress}%` }}
                                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                                    />
                                </div>
                                <span className="text-[10px] font-mono text-slate-700 dark:text-slate-300 w-10 text-right">{m.physicalProgress}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 w-14">Financial</span>
                                <div className="flex-1 h-2 bg-slate-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                    <motion.div
                                        className={`h-full ${m.status === 'overspend' ? 'bg-red-500' : m.status === 'caution' ? 'bg-amber-500' : 'bg-green-500'}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${m.financialProgress}%` }}
                                        transition={{ duration: 0.5, delay: idx * 0.1 + 0.1 }}
                                    />
                                </div>
                                <span className="text-[10px] font-mono text-slate-700 dark:text-slate-300 w-10 text-right">{m.financialProgress.toFixed(0)}%</span>
                            </div>
                        </div>

                        {/* Budget Summary */}
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-neutral-700 flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                            <span>Budget: {formatCurrency(m.budget)}</span>
                            <span>Spent: {formatCurrency(m.spent)}</span>
                        </div>
                    </motion.div>
                ))}

                {milestones.length > 5 && (
                    <p className="text-xs text-center text-slate-400 pt-2">
                        +{milestones.length - 5} more milestones
                    </p>
                )}
            </MotionCardContent>
        </MotionCard>
    );
};

export default MilestonePerformanceCard;
