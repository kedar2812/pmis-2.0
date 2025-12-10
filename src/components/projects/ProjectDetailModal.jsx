import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
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
import { tasks, risks } from '@/mock';
import { DynamicChart } from '@/components/ui/DynamicChart';
import { getStatusColor } from '@/lib/colors';
import {
  calculateRemainingBudget,
  calculateBudgetUtilization,
  calculateCostVariationPercentage,
} from '@/lib/calculations';

export const ProjectDetailModal = ({ isOpen, onClose, project }) => {
  if (!isOpen || !project) return null;

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

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
        style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="w-full h-full max-w-7xl max-h-[95vh] overflow-y-auto bg-white rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${statusColors.bg}`}>
                <FolderOpen className={statusColors.text} size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-primary-950">{project.name}</h2>
                <p className="text-sm text-gray-600 mt-1">{project.category}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
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
                      className={`h-2 rounded-full ${
                        project.progress === 100
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
                      className={`h-2 rounded-full ${
                        budgetUtilization > 90
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
                      <p className="text-sm text-gray-600 mb-1">Status</p>
                      <p className={`text-lg font-semibold ${statusColors.text}`}>
                        {project.status}
                      </p>
                    </div>
                    <Clock className="text-gray-600" size={32} />
                  </div>
                  <p className={`text-xs mt-2 ${isOverdue ? 'text-error-600' : 'text-gray-600'}`}>
                    {isOverdue
                      ? `${Math.abs(daysRemaining)} days overdue`
                      : `${daysRemaining} days remaining`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Cost Variation</p>
                      <p
                        className={`text-2xl font-bold ${
                          costVariancePercentage > 0 ? 'text-error-600' : 'text-success-600'
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
                      <p className="text-sm text-gray-600">{project.location.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="text-gray-400 mt-1" size={18} />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Stakeholders</p>
                      <p className="text-sm text-gray-600">
                        {project.stakeholders.length > 0
                          ? project.stakeholders.join(', ')
                          : 'No stakeholders assigned'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

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

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Progress History */}
              <Card>
                <CardHeader>
                  <CardTitle>Progress History (Last 6 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                  <DynamicChart
                    data={progressHistory}
                    dataKey="progress"
                    height={300}
                    defaultType="line"
                    name="Progress %"
                  />
                </CardContent>
              </Card>

              {/* Task Status Distribution */}
              {projectTasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Task Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(taskStatusCounts).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{status}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-gray-200 rounded-full">
                              <div
                                className="h-2 bg-primary-600 rounded-full"
                                style={{
                                  width: `${(count / projectTasks.length) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Risks Overview */}
            {projectRisks.length > 0 && (
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
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};


