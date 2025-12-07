import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Minus, Calendar, Target, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DynamicChart } from '@/components/ui/DynamicChart';
import type { KPI } from '@/mock/interfaces';
import { projects } from '@/mock';
import { calculateCostVariationPercentage } from '@/lib/calculations';

interface KPIDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpi: KPI | null;
}

export const KPIDetailModal = ({ isOpen, onClose, kpi }: KPIDetailModalProps) => {
  if (!isOpen || !kpi) return null;

  const isPositive = kpi.trend === 'up' || (kpi.trend === 'stable' && kpi.value >= kpi.target);
  const variance = kpi.value - kpi.target;

  // Generate historical data for the last 6 months
  const historicalData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    const baseValue = kpi.value;
    const variation = (Math.random() - 0.5) * 20;
    return {
      month: monthName,
      value: Math.max(0, Math.min(100, baseValue + variation)),
      target: kpi.target,
    };
  });

  // Get project-specific data based on KPI category
  const getProjectData = () => {
    if (kpi.category === 'Schedule') {
      return projects.map((p) => ({
        name: p.name.substring(0, 15) + '...',
        progress: p.progress,
        target: 70,
      }));
    } else if (kpi.category === 'Cost') {
      return projects.map((p) => ({
        name: p.name.substring(0, 15) + '...',
        utilization: p.budget > 0 ? (p.spent / p.budget) * 100 : 0,
        target: 75,
      }));
    }
    return [];
  };

  const projectData = getProjectData();

  const getKPIDescription = () => {
    switch (kpi.id) {
      case 'kpi-1':
        return {
          title: 'Overall Project Progress',
          description:
            'This metric represents the average completion percentage across all active projects in the PMIS ZIA Programme. It provides a high-level view of how well the entire programme is progressing toward its objectives.',
          details: [
            `Current Progress: ${kpi.value}% completion across all projects`,
            `Target Achievement: ${kpi.target}% is the programme target`,
            `Variance: ${variance < 0 ? 'Behind' : 'Ahead of'} target by ${Math.abs(variance)}%`,
            `Trend: ${kpi.trend === 'up' ? 'Improving' : kpi.trend === 'down' ? 'Declining' : 'Stable'}`,
            `Last Updated: ${new Date(kpi.lastUpdated).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}`,
          ],
          insights: [
            'Several projects are contributing to the overall progress',
            'Focus areas include accelerating completion of delayed projects',
            'Resource allocation may need adjustment to meet targets',
          ],
        };
      case 'kpi-2':
        return {
          title: 'Budget Utilization',
          description:
            'Budget Utilization measures the percentage of allocated budget that has been spent across all projects. This helps track financial performance and ensures projects stay within their allocated resources.',
          details: [
            `Current Utilization: ${kpi.value}% of total allocated budget has been spent`,
            `Target Utilization: ${kpi.target}% is the expected utilization rate`,
            `Variance: ${variance < 0 ? 'Under' : 'Over'} budget by ${Math.abs(variance)}%`,
            `Trend: ${kpi.trend === 'up' ? 'Increasing' : kpi.trend === 'down' ? 'Decreasing' : 'Stable'} spending rate`,
            `Last Updated: ${new Date(kpi.lastUpdated).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}`,
          ],
          insights: [
            'Current spending is within acceptable range',
            'Monitor projects with high utilization rates closely',
            'Consider budget reallocation if needed',
          ],
        };
      case 'kpi-3':
        return {
          title: 'Project Timeline',
          description:
            'Project Timeline tracks the planned and actual project timelines. A negative value means projects are behind schedule, while a positive value indicates projects are ahead of schedule.',
          details: [
            `Current Timeline: ${kpi.value > 0 ? '+' : ''}${kpi.value} days ${kpi.value < 0 ? 'behind' : 'ahead of'} schedule`,
            `Target: ${kpi.target} days (on schedule)`,
            `Timeline Deviation: ${Math.abs(variance)} days deviation from target`,
            `Trend: ${kpi.trend === 'up' ? 'Improving' : kpi.trend === 'down' ? 'Worsening' : 'Stable'} timeline performance`,
            `Last Updated: ${new Date(kpi.lastUpdated).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}`,
          ],
          insights: [
            'Some projects are experiencing delays',
            'Critical path activities may need acceleration',
            'Resource constraints could be impacting timelines',
          ],
        };
      case 'kpi-4':
        return {
          title: 'Cost Variation',
          description:
            'Cost Variation measures the difference between budgeted and actual costs as a percentage. This metric helps identify cost overruns or savings and enables proactive financial management.',
          details: [
            `Current Variation: ${kpi.value > 0 ? '+' : ''}${kpi.value}% ${kpi.value < 0 ? 'under' : 'over'} budget`,
            `Target: ${kpi.target}% (no variation)`,
            `Variation: ${Math.abs(variance)}% deviation from budget`,
            `Trend: ${kpi.trend === 'up' ? 'Increasing' : kpi.trend === 'down' ? 'Decreasing' : 'Stable'} cost variation`,
            `Last Updated: ${new Date(kpi.lastUpdated).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}`,
          ],
          insights: [
            'Cost performance is within acceptable limits',
            'Monitor high-variance projects for cost control',
            'Review procurement and contract management processes',
          ],
        };
      default:
        return {
          title: kpi.name,
          description: `Detailed information about ${kpi.name}`,
          details: [],
          insights: [],
        };
    }
  };

  const kpiInfo = getKPIDescription();

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
              <div
                className={`p-3 rounded-full ${isPositive ? 'bg-success-50' : 'bg-error-50'}`}
              >
                {isPositive ? (
                  <TrendingUp className="text-success-600" size={28} />
                ) : kpi.trend === 'stable' ? (
                  <Minus className="text-gray-600" size={28} />
                ) : (
                  <TrendingDown className="text-error-600" size={28} />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-primary-950">{kpiInfo.title}</h2>
                <p className="text-sm text-gray-600 mt-1">{kpi.category} Category</p>
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
            {/* Key Metrics Card */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center md:text-left">
                    <p className="text-sm text-gray-600 mb-1">Current Value</p>
                    <p className="text-3xl font-bold text-primary-950">
                      {kpi.value} {kpi.unit}
                    </p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-sm text-gray-600 mb-1">Target Value</p>
                    <p className="text-3xl font-bold text-gray-700">
                      {kpi.target} {kpi.unit}
                    </p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-sm text-gray-600 mb-1">Variance</p>
                    <p
                      className={`text-3xl font-bold ${
                        variance < 0 ? 'text-error-600' : variance > 0 ? 'text-success-600' : 'text-gray-700'
                      }`}
                    >
                      {variance > 0 ? '+' : ''}
                      {variance} {kpi.unit}
                    </p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <p
                      className={`text-lg font-semibold ${
                        isPositive ? 'text-success-600' : 'text-error-600'
                      }`}
                    >
                      {isPositive ? 'On Track' : 'Needs Attention'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 size={20} />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">{kpiInfo.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  {kpiInfo.details.map((detail, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-600 mt-2 flex-shrink-0" />
                      <p className="text-sm text-gray-600">{detail}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Historical Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Historical Trend (Last 6 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                  <DynamicChart
                    data={historicalData}
                    dataKey="value"
                    height={300}
                    defaultType="line"
                    name="Actual"
                  />
                </CardContent>
              </Card>

              {/* Project Breakdown */}
              {projectData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Project Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DynamicChart
                      data={projectData}
                      dataKey={kpi.category === 'Schedule' ? 'progress' : 'utilization'}
                      height={300}
                      defaultType="bar"
                      name={kpi.category === 'Schedule' ? 'Progress %' : 'Utilization %'}
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Insights Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target size={20} />
                  Key Insights & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {kpiInfo.insights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary-600 mt-2 flex-shrink-0" />
                      <p className="text-gray-700">{insight}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Metadata Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={16} />
                  <span>
                    Last Updated:{' '}
                    {new Date(kpi.lastUpdated).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

