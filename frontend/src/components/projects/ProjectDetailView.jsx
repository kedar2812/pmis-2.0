import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    IndianRupee,
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
    Shield,
    AlertTriangle,
    Plus,
    ExternalLink,
    Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { tasks } from '@/mock';
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
import riskService from '@/api/services/riskService';

export const ProjectDetailView = ({ project, packages = [], contractors = [], onAddContractor }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [isAddContractorModalOpen, setIsAddContractorModalOpen] = useState(false);
    const [showNewThread, setShowNewThread] = useState(false);

    // Risk state
    const [projectRisks, setProjectRisks] = useState([]);
    const [risksLoading, setRisksLoading] = useState(false);

    // Fetch project risks
    useEffect(() => {
        const fetchRisks = async () => {
            if (!project?.id) return;
            setRisksLoading(true);
            try {
                const res = await riskService.getProjectRisks(project.id);
                setProjectRisks(res.data || []);
            } catch (err) {
                console.error('Failed to fetch project risks:', err);
            } finally {
                setRisksLoading(false);
            }
        };
        fetchRisks();
    }, [project?.id]);

    if (!project) return null;

    const projectTasks = tasks.filter((task) => task.projectId === project.id);

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

    // Count risks by severity from real data
    const riskSeverityCounts = projectRisks.reduce(
        (acc, risk) => {
            const sev = risk.severity || 'LOW';
            acc[sev] = (acc[sev] || 0) + 1;
            return acc;
        },
        {}
    );

    return (
        <div className="w-full h-full bg-app-card rounded-lg shadow-sm">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-app-card border-b border-app-subtle px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${statusColors.bg}`}>
                        <FolderOpen className={statusColors.text} size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-app-heading">{project.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-app-muted">{project.category}</span>
                            <span className="w-1 h-1 bg-app-subtle rounded-full"></span>
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
                    className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/50"
                >
                    <MessageSquare size={16} className="mr-2" /> Discuss Project
                </Button>
            </div>

            {/* Tab Navigation */}
            <div className="px-6 border-b border-app-subtle bg-app-card sticky top-[88px] z-10">
                <div className="flex gap-6">
                    {['Overview', 'Packages', 'Procurements', 'Budget', 'Risks'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab.toLowerCase())}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.toLowerCase()
                                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-app-muted hover:text-app-heading'
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
                                            <p className="text-sm text-app-muted mb-1">Project Progress</p>
                                            <p className="text-2xl font-bold text-app-heading">{project.progress}%</p>
                                        </div>
                                        <Target className="text-primary-600" size={32} />
                                    </div>
                                    <div className="mt-3 w-full h-2 bg-app-secondary rounded-full">
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
                                            <p className="text-sm text-app-muted mb-1">Budget Utilization</p>
                                            <p className="text-2xl font-bold text-app-heading">{budgetUtilization.toFixed(1)}%</p>
                                        </div>
                                        <IndianRupee className="text-primary-600" size={32} />
                                    </div>
                                    <div className="mt-3 w-full h-2 bg-app-secondary rounded-full">
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
                                            <p className="text-sm text-app-muted mb-1">Days Remaining</p>
                                            <p className={`text-2xl font-bold ${isOverdue ? 'text-error-600' : 'text-app-heading'}`}>
                                                {Math.abs(daysRemaining)}
                                            </p>
                                        </div>
                                        <Clock className="text-app-muted" size={32} />
                                    </div>
                                    <p className={`text-xs mt-2 ${isOverdue ? 'text-error-600' : 'text-app-muted'}`}>
                                        {isOverdue ? 'Overdue' : 'On Schedule'}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-app-muted mb-1">Cost Variation</p>
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
                                <p className="text-app-text leading-relaxed">{project.description}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-app-subtle">
                                    <div className="flex items-start gap-3">
                                        <Calendar className="text-app-muted mt-1" size={18} />
                                        <div>
                                            <p className="text-sm font-medium text-app-heading">Project Timeline</p>
                                            <p className="text-sm text-app-muted">
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
                                        <User className="text-app-muted mt-1" size={18} />
                                        <div>
                                            <p className="text-sm font-medium text-app-heading">Project Manager</p>
                                            <p className="text-sm text-app-muted">{project.manager}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <MapPin className="text-app-muted mt-1" size={18} />
                                        <div>
                                            <p className="text-sm font-medium text-app-heading">Location</p>
                                            <p className="text-sm text-app-muted">{project.location?.address || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Users className="text-app-muted mt-1" size={18} />
                                        <div>
                                            <p className="text-sm font-medium text-app-heading">Stakeholders</p>
                                            <p className="text-sm text-app-muted">
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
                            <h3 className="text-lg font-bold text-app-heading">Contractors & Procurements</h3>
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
                                                    <h4 className="font-semibold text-app-heading">{contractor.contractorName}</h4>
                                                    <div className="flex items-center gap-1 text-xs text-app-muted mt-1">
                                                        <MapPin size={12} /> {contractor.city}, {contractor.state}
                                                    </div>
                                                </div>
                                                <span className="p-1.5 bg-app-secondary rounded-lg text-app-muted">
                                                    <Briefcase size={16} />
                                                </span>
                                            </div>

                                            <div className="space-y-2 mt-4 text-sm">
                                                <div className="flex justify-between p-2 bg-app-secondary rounded">
                                                    <span className="text-app-muted text-xs uppercase font-medium">PAN</span>
                                                    <span className="text-app-text font-mono tracking-wide">{contractor.panNo}</span>
                                                </div>
                                                <div className="flex justify-between p-2 bg-app-secondary rounded">
                                                    <span className="text-app-muted text-xs uppercase font-medium">GSTIN</span>
                                                    <span className="text-app-text font-mono tracking-wide">{contractor.gstinNo}</span>
                                                </div>
                                                <div className="pt-2 flex flex-col gap-1">
                                                    <span className="flex items-center gap-2 text-app-muted">
                                                        <User size={14} className="text-app-muted" /> {contractor.email}
                                                    </span>
                                                    <span className="flex items-center gap-2 text-app-muted">
                                                        <IndianRupee size={14} className="text-app-muted" /> {contractor.mobile}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="border border-dashed border-app-subtle rounded-xl p-12 text-center bg-app-secondary">
                                <div className="w-16 h-16 bg-app-surface rounded-full flex items-center justify-center mx-auto mb-4 text-app-muted">
                                    <Briefcase size={32} />
                                </div>
                                <h4 className="text-app-heading font-medium mb-1">No Contractors Added</h4>
                                <p className="text-app-muted text-sm mb-4">Add contractors to manage procurements for this project.</p>
                                <button
                                    onClick={() => setIsAddContractorModalOpen(true)}
                                    className="px-4 py-2 border border-app rounded-lg text-sm font-medium text-app-text hover:bg-app-surface transition-colors"
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
                            <h3 className="text-lg font-bold text-app-heading">Work Packages</h3>
                            {/* Contextual create button - we might want to reinject the create logic purely for context later, for now just view */}
                        </div>

                        {packages.filter(p => p.projectId === project.id).length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
                                {packages.filter(p => p.projectId === project.id).map((pkg) => (
                                    <Card key={pkg.id}>
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-semibold text-lg text-app-heading">{pkg.name}</h4>
                                                    {pkg.description && <p className="text-sm text-app-muted mb-2">{pkg.description}</p>}
                                                </div>
                                                <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full shrink-0">
                                                    {pkg.status}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-4 text-sm text-app-text bg-app-secondary p-3 rounded-lg">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-app-muted uppercase font-medium">Contractor</span>
                                                    <span className="flex items-center gap-1 font-medium text-app-heading">
                                                        <User size={14} className="text-app-muted" /> {pkg.contractor}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-app-muted uppercase font-medium">Responsible Staff</span>
                                                    <span className="font-medium text-app-heading">{pkg.responsibleStaff || '-'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-app-muted uppercase font-medium">Contract Value</span>
                                                    <span className="flex items-center gap-1 font-medium text-app-heading">
                                                        <IndianRupee size={14} className="text-app-muted" /> {formatCurrency(pkg.contractValue || pkg.budget)}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-app-muted uppercase font-medium">Agreement No.</span>
                                                    <span className="font-medium text-app-heading">{pkg.agreementNo || '-'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-app-muted uppercase font-medium">Agreement Date</span>
                                                    <span className="flex items-center gap-1 font-medium text-app-heading">
                                                        <Calendar size={14} className="text-app-muted" /> {pkg.agreementDate ? new Date(pkg.agreementDate).toLocaleDateString() : '-'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-app-muted uppercase font-medium">Due Date</span>
                                                    <span className="flex items-center gap-1 font-medium text-app-heading">
                                                        <Calendar size={14} className="text-app-muted" /> {pkg.endDate ? new Date(pkg.endDate).toLocaleDateString() : '-'}
                                                    </span>
                                                </div>
                                            </div>


                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="border border-dashed border-app-subtle rounded-xl p-12 text-center bg-app-secondary">
                                <div className="w-16 h-16 bg-app-surface rounded-full flex items-center justify-center mx-auto mb-4 text-app-muted">
                                    <FolderOpen size={32} />
                                </div>
                                <h4 className="text-app-heading font-medium mb-1">No Packages Created Yet</h4>
                                <p className="text-app-muted text-sm mb-4">Create packages from the Projects page to assign work.</p>
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
                                    <IndianRupee size={20} />
                                    Budget & Financial Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    <div className="p-4 bg-primary-50 dark:bg-primary-900/10 rounded-lg">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Budget</p>
                                        <p className="text-xl font-bold text-primary-950 dark:text-primary-100">{formatCurrency(project.budget)}</p>
                                    </div>
                                    <div className="p-4 bg-warning-50 dark:bg-yellow-900/10 rounded-lg">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Amount Spent</p>
                                        <p className="text-xl font-bold text-warning-700 dark:text-yellow-400">{formatCurrency(project.spent)}</p>
                                    </div>
                                    <div className="p-4 bg-success-50 dark:bg-green-900/10 rounded-lg">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Remaining Budget</p>
                                        <p className="text-xl font-bold text-success-700 dark:text-green-400">{formatCurrency(budgetRemaining)}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Utilization Rate</p>
                                        <p className="text-xl font-bold text-gray-700 dark:text-gray-200">{budgetUtilization.toFixed(1)}%</p>
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
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {/* Header */}
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-app-heading flex items-center gap-2">
                                <Shield size={20} className="text-orange-500" />
                                Project Risks
                            </h3>
                            <Button
                                onClick={() => navigate(`/risk?project=${project.id}`)}
                                className="bg-orange-600 text-white hover:bg-orange-700 flex items-center gap-2"
                            >
                                <Plus size={16} /> Add Risk
                            </Button>
                        </div>

                        {risksLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="animate-spin text-primary-600" size={32} />
                            </div>
                        ) : projectRisks.length > 0 ? (
                            <>
                                {/* Risk Summary Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => {
                                        const count = riskSeverityCounts[severity] || 0;
                                        const colors = {
                                            CRITICAL: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
                                            HIGH: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
                                            MEDIUM: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
                                            LOW: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
                                        };
                                        return (
                                            <div key={severity} className={`text-center p-4 rounded-lg border ${colors[severity]}`}>
                                                <p className="text-3xl font-bold">{count}</p>
                                                <p className="text-sm font-medium mt-1">{severity}</p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Risk List */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Active Risks</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {projectRisks.slice(0, 10).map((risk) => {
                                            const sevColors = riskService.getSeverityColor(risk.severity);
                                            const statusColors = riskService.getStatusColor(risk.status);
                                            return (
                                                <div
                                                    key={risk.id}
                                                    className="p-3 bg-app-secondary rounded-lg border border-app-subtle hover:border-primary-300 cursor-pointer transition-colors"
                                                    onClick={() => navigate(`/risk?risk=${risk.id}`)}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs text-app-muted font-mono">{risk.risk_code}</span>
                                                                <span className={`px-2 py-0.5 rounded-full text-xs ${sevColors.bg} ${sevColors.text}`}>
                                                                    {risk.severity}
                                                                </span>
                                                                <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors.bg} ${statusColors.text}`}>
                                                                    {risk.status}
                                                                </span>
                                                            </div>
                                                            <h4 className="font-medium text-app-heading">{risk.title}</h4>
                                                            <p className="text-sm text-app-muted mt-1 line-clamp-1">{risk.description}</p>
                                                        </div>
                                                        <div className="text-right ml-4">
                                                            <div className="text-2xl font-bold text-app-heading">{risk.risk_score}</div>
                                                            <div className="text-xs text-app-muted">Score</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {projectRisks.length > 10 && (
                                            <button
                                                onClick={() => navigate(`/risk?project=${project.id}`)}
                                                className="w-full py-2 text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center justify-center gap-1"
                                            >
                                                View all {projectRisks.length} risks <ExternalLink size={14} />
                                            </button>
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            <div className="border border-dashed border-app-subtle rounded-xl p-12 text-center bg-app-secondary">
                                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle size={32} className="text-orange-500" />
                                </div>
                                <h4 className="text-app-heading font-medium mb-1">No Risks Identified</h4>
                                <p className="text-app-muted text-sm mb-4">Start tracking potential risks for this project.</p>
                                <Button
                                    onClick={() => navigate(`/risk?project=${project.id}`)}
                                    variant="outline"
                                >
                                    <Plus size={16} className="mr-1" /> Add First Risk
                                </Button>
                            </div>
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
