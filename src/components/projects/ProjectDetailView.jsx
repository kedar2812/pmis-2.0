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
    Briefcase,
    MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { tasks, risks } from '@/mock';
import { DynamicChart } from '@/components/ui/DynamicChart';
import { getStatusColor } from '@/lib/colors';
import {
    calculateRemainingBudget,
    calculateBudgetUtilization,
    calculateCostVariationPercentage,
} from '@/lib/calculations';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddContractorModal } from '@/components/procurement/AddContractorModal';
import Button from '@/components/ui/Button';
import NewThreadModal from '@/components/communications/NewThreadModal';
import { toast } from 'sonner';

export const ProjectDetailView = ({ project, packages = [], contractors = [], onAddContractor }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isAddContractorModalOpen, setIsAddContractorModalOpen] = useState(false);
    const [showNewThread, setShowNewThread] = useState(false);

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
                {/* Actions */}
                <Button
                    variant="outline"
                    onClick={() => setShowNewThread(true)}
                    className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                    <MessageSquare size={16} className="mr-2" /> Discuss Project
                </Button>
            </div>

            {/* Tab Navigation */}
            <div className="px-6 border-b border-slate-200 bg-white sticky top-[88px] z-10">
                <div className="flex gap-6">
                    {['Overview', 'Packages', 'Procurements', 'Budget', 'Risks'].map((tab) => (
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

                {activeTab === 'procurements' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Contractors & Procurements</h3>
                            <Button
                                onClick={() => setIsAddContractorModalOpen(true)}
                                className="bg-primary-950 text-white hover:bg-primary-900 shadow-lg shadow-primary-950/20 flex items-center gap-2"
                            >
                                + Add Contractor
                            </Button>
                        </div>

                        {contractors && contractors.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {contractors.map((contractor) => (
                                    <Card key={contractor.id}>
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h4 className="font-semibold text-slate-900">{contractor.contractorName}</h4>
                                                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                                        <MapPin size={12} /> {contractor.city}, {contractor.state}
                                                    </div>
                                                </div>
                                                <span className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                                                    <Briefcase size={16} />
                                                </span>
                                            </div>

                                            <div className="space-y-2 mt-4 text-sm">
                                                <div className="flex justify-between p-2 bg-slate-50 rounded">
                                                    <span className="text-slate-500 text-xs uppercase font-medium">PAN</span>
                                                    <span className="text-slate-700 font-mono tracking-wide">{contractor.panNo}</span>
                                                </div>
                                                <div className="flex justify-between p-2 bg-slate-50 rounded">
                                                    <span className="text-slate-500 text-xs uppercase font-medium">GSTIN</span>
                                                    <span className="text-slate-700 font-mono tracking-wide">{contractor.gstinNo}</span>
                                                </div>
                                                <div className="pt-2 flex flex-col gap-1">
                                                    <span className="flex items-center gap-2 text-slate-600">
                                                        <User size={14} className="text-slate-400" /> {contractor.email}
                                                    </span>
                                                    <span className="flex items-center gap-2 text-slate-600">
                                                        <DollarSign size={14} className="text-slate-400" /> {contractor.mobile}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="border border-dashed border-slate-300 rounded-xl p-12 text-center bg-slate-50">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                    <Briefcase size={32} />
                                </div>
                                <h4 className="text-slate-900 font-medium mb-1">No Contractors Added</h4>
                                <p className="text-slate-500 text-sm mb-4">Add contractors to manage procurements for this project.</p>
                                <button
                                    onClick={() => setIsAddContractorModalOpen(true)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Add Your First Contractor
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'packages' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Work Packages</h3>
                            {/* Contextual create button - we might want to reinject the create logic purely for context later, for now just view */}
                        </div>

                        {packages.filter(p => p.projectId === project.id).length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
                                {packages.filter(p => p.projectId === project.id).map((pkg) => (
                                    <Card key={pkg.id}>
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-semibold text-lg text-slate-900">{pkg.name}</h4>
                                                    {pkg.description && <p className="text-sm text-slate-500 mb-2">{pkg.description}</p>}
                                                </div>
                                                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full shrink-0">
                                                    {pkg.status}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-400 uppercase font-medium">Contractor</span>
                                                    <span className="flex items-center gap-1 font-medium text-slate-700">
                                                        <User size={14} className="text-slate-400" /> {pkg.contractor}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-400 uppercase font-medium">Responsible Staff</span>
                                                    <span className="font-medium text-slate-700">{pkg.responsibleStaff || '-'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-400 uppercase font-medium">Contract Value</span>
                                                    <span className="flex items-center gap-1 font-medium text-slate-700">
                                                        <DollarSign size={14} className="text-slate-400" /> {formatCurrency(pkg.contractValue || pkg.budget)}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-400 uppercase font-medium">Agreement No.</span>
                                                    <span className="font-medium text-slate-700">{pkg.agreementNo || '-'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-400 uppercase font-medium">Agreement Date</span>
                                                    <span className="flex items-center gap-1 font-medium text-slate-700">
                                                        <Calendar size={14} className="text-slate-400" /> {pkg.agreementDate ? new Date(pkg.agreementDate).toLocaleDateString() : '-'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-400 uppercase font-medium">Due Date</span>
                                                    <span className="flex items-center gap-1 font-medium text-slate-700">
                                                        <Calendar size={14} className="text-slate-400" /> {pkg.endDate ? new Date(pkg.endDate).toLocaleDateString() : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="border border-dashed border-slate-300 rounded-xl p-12 text-center bg-slate-50">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                    <FolderOpen size={32} />
                                </div>
                                <h4 className="text-slate-900 font-medium mb-1">No Packages Created Yet</h4>
                                <p className="text-slate-500 text-sm mb-4">Create packages from the Projects page to assign work.</p>
                            </div>
                        )}
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
            {/* Add Contractor Modal */}
            <AddContractorModal
                isOpen={isAddContractorModalOpen}
                onClose={() => setIsAddContractorModalOpen(false)}
                onSave={onAddContractor}
            />

            {/* Communications Modal */}
            {showNewThread && (
                <NewThreadModal
                    onClose={() => setShowNewThread(false)}
                    onCreated={(thread) => {
                        setShowNewThread(false);
                        toast.success(`Discussion thread created: ${thread.subject}`);
                    }}
                    preselectedContext={{
                        type: 'projects.project',
                        id: project.id
                    }}
                />
            )}
        </div>
    );
};
