import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    DollarSign,
    MapPin,
    User,
    TrendingUp,
    TrendingDown,
    FolderOpen,
    Clock,
    Target,
    BarChart3,
    Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { tasks, risks } from '@/mock'; // Assuming mocked data import exists or passed via props? Original file imported from @/mock
import { DynamicChart } from '@/components/ui/DynamicChart';
import { getStatusColor } from '@/lib/colors';
import {
    calculateRemainingBudget,
    calculateBudgetUtilization,
    calculateCostVariationPercentage,
} from '@/lib/calculations';
import { EmptyState } from '@/components/ui/EmptyState'; // Assuming this exists based on previous file usage

export const ProjectDetailView = ({ project }) => {
    const [activeTab, setActiveTab] = useState('overview');

    if (!project) return null;

    const projectTasks = tasks.filter((task) => task.projectId === project.id);
    const projectRisks = risks.filter((risk) => risk.projectId === project.id);

    const budgetUtilization = calculateBudgetUtilization(project.budget, project.spent);
    const budgetRemaining = calculateRemainingBudget(project.budget, project.spent, 0);
    const costVariancePercentage = calculateCostVariationPercentage(project.budget, project.spent);

    const statusColors = getStatusColor(project.status);

    const formatCurrency = (amount) => {
        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(2)} Cr`;
        }
        return `₹${(amount / 100000).toFixed(2)} L`;
    };

    // Calculate days remaining
    const endDate = new Date(project.endDate);
    const today = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysRemaining < 0;

    // Generate progress history (last 6 months)
    const progressHistory = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        const baseProgress = project.progress;
        const variation = (Math.random() - 0.5) * 15;
        return {
            month: monthName,
            progress: Math.max(0, Math.min(100, baseProgress + variation)),
        };
    });

    // Generate budget history
    const budgetHistory = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        const monthlySpend = project.spent / 6;
        return {
            month: monthName,
            spent: monthlySpend * (i + 1),
            budget: (project.budget / 6) * (i + 1),
        };
    });

    const taskStatusCounts = projectTasks.reduce(
        (acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        },
        {}
    );

    const riskImpactCounts = projectRisks.reduce(
        (acc, risk) => {
            acc[risk.impact] = (acc[risk.impact] || 0) + 1;
            return acc;
        },
        {}
    );

    return (
        <div className="w-full h-full bg-white rounded-lg shadow-sm">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${statusColors.bg}`}>
                        <FolderOpen className={statusColors.text} size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-primary-950">{project.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">{project.category}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors.bg} ${statusColors.text}`}>
                                {project.status}
                            </span>
                        </div>
                    </div>
                </div>
                {/* Actions or close button if modal (handled by parent) */}
            </div>

            {/* Tab Navigation */}
            <div className="px-6 border-b border-slate-200 bg-white sticky top-[88px] z-10">
                <div className="flex gap-6">
                    {['Overview', 'Packages', 'Budget', 'Risks'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab.toLowerCase())}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.toLowerCase()
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>


            {/* Content */}
            <div className="p-6 space-y-6">

                {activeTab === 'overview' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        {/* Key Metrics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Project Progress</p>
                                            <p className="text-2xl font-bold text-primary-950">{project.progress}%</p>
                                        </div>
                                        <Target className="text-primary-600" size={32} />
                                    </div>
                                    <div className="mt-3 w-full h-2 bg-gray-200 rounded-full">
                                        <div
                                            className={`h-2 rounded-full ${project.progress === 100
                                                ? 'bg-success-600'
                                                : project.progress >= 50
                                                    ? 'bg-primary-600'
                                                    : 'bg-warning-500'
                                                }`}
                                            style={{ width: `${project.progress}%` }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Budget Utilization</p>
                                            <p className="text-2xl font-bold text-primary-950">{budgetUtilization.toFixed(1)}%</p>
                                        </div>
                                        <DollarSign className="text-primary-600" size={32} />
                                    </div>
                                    <div className="mt-3 w-full h-2 bg-gray-200 rounded-full">
                                        <div
                                            className={`h-2 rounded-full ${budgetUtilization > 90
                                                ? 'bg-error-600'
                                                : budgetUtilization > 75
                                                    ? 'bg-warning-500'
                                                    : 'bg-success-600'
                                                }`}
                                            style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Days Remaining</p>
                                            <p className={`text-2xl font-bold ${isOverdue ? 'text-error-600' : 'text-primary-950'}`}>
                                                {Math.abs(daysRemaining)}
                                            </p>
                                        </div>
                                        <Clock className="text-gray-600" size={32} />
                                    </div>
                                    <p className={`text-xs mt-2 ${isOverdue ? 'text-error-600' : 'text-gray-600'}`}>
                                        {isOverdue ? 'Overdue' : 'On Schedule'}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Cost Variation</p>
                                            <p
                                                className={`text-2xl font-bold ${costVariancePercentage > 0 ? 'text-error-600' : 'text-success-600'
                                                    }`}
                                            >
                                                {costVariancePercentage > 0 ? '+' : ''}
                                                {costVariancePercentage.toFixed(1)}%
                                            </p>
                                        </div>
                                        {costVariancePercentage > 0 ? (
                                            <TrendingUp className="text-error-600" size={32} />
                                        ) : (
                                            <TrendingDown className="text-success-600" size={32} />
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Project Overview */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 size={20} />
                                    Project Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-gray-700 leading-relaxed">{project.description}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-start gap-3">
                                        <Calendar className="text-gray-400 mt-1" size={18} />
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Project Timeline</p>
                                            <p className="text-sm text-gray-600">
                                                {new Date(project.startDate).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}{' '}
                                                -{' '}
                                                {new Date(project.endDate).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <User className="text-gray-400 mt-1" size={18} />
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Project Manager</p>
                                            <p className="text-sm text-gray-600">{project.manager}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <MapPin className="text-gray-400 mt-1" size={18} />
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Location</p>
                                            <p className="text-sm text-gray-600">{project.location?.address || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Users className="text-gray-400 mt-1" size={18} />
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Stakeholders</p>
                                            <p className="text-sm text-gray-600">
                                                {project.stakeholders?.length > 0
                                                    ? project.stakeholders.join(', ')
                                                    : 'No stakeholders assigned'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {activeTab === 'packages' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Work Packages</h3>
                            <button className="px-4 py-2 bg-primary-950 text-white rounded-lg text-sm font-medium hover:bg-primary-900 transition-colors">
                                + Create Package
                            </button>
                        </div>

                        {/* Empty State / Placeholder for Packages */}
                        <div className="border border-dashed border-slate-300 rounded-xl p-12 text-center bg-slate-50">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <FolderOpen size={32} />
                            </div>
                            <h4 className="text-slate-900 font-medium mb-1">No Packages Created Yet</h4>
                            <p className="text-slate-500 text-sm mb-4">Create packages to assign work to contractors.</p>
                            <button className="text-primary-600 font-medium hover:underline text-sm">
                                Create your first package
                            </button>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'budget' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        {/* Budget Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign size={20} />
                                    Budget & Financial Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    <div className="p-4 bg-primary-50 rounded-lg">
                                        <p className="text-sm text-gray-600 mb-1">Total Budget</p>
                                        <p className="text-xl font-bold text-primary-950">{formatCurrency(project.budget)}</p>
                                    </div>
                                    <div className="p-4 bg-warning-50 rounded-lg">
                                        <p className="text-sm text-gray-600 mb-1">Amount Spent</p>
                                        <p className="text-xl font-bold text-warning-700">{formatCurrency(project.spent)}</p>
                                    </div>
                                    <div className="p-4 bg-success-50 rounded-lg">
                                        <p className="text-sm text-gray-600 mb-1">Remaining Budget</p>
                                        <p className="text-xl font-bold text-success-700">{formatCurrency(budgetRemaining)}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-600 mb-1">Utilization Rate</p>
                                        <p className="text-xl font-bold text-gray-700">{budgetUtilization.toFixed(1)}%</p>
                                    </div>
                                </div>
                                <DynamicChart
                                    data={budgetHistory.map((item) => ({ name: item.month, value: item.spent, budget: item.budget }))}
                                    dataKey="value"
                                    height={300}
                                    defaultType="bar"
                                    name="Spent"
                                />
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {activeTab === 'risks' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        {/* Risks Overview */}
                        {projectRisks.length > 0 ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Risk Overview</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {Object.entries(riskImpactCounts).map(([impact, count]) => {
                                            const impactColors = {
                                                Low: 'bg-success-50 text-success-700',
                                                Medium: 'bg-warning-50 text-warning-700',
                                                High: 'bg-accent-50 text-accent-700',
                                                Critical: 'bg-error-50 text-error-700',
                                            };
                                            return (
                                                <div key={impact} className="text-center p-4 rounded-lg bg-gray-50">
                                                    <p className="text-2xl font-bold">{count}</p>
                                                    <p className={`text-sm mt-1 px-2 py-1 rounded ${impactColors[impact]}`}>
                                                        {impact}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <EmptyState
                                icon={Target}
                                title="No Risks Identified"
                                description="No risks have been recorded for this project yet."
                            />
                        )}
                    </motion.div>
                )}

            </div>
        </div>
    );
};
