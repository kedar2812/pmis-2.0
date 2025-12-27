import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { MotionCard, MotionCardContent, MotionCardHeader, MotionCardTitle } from '@/components/ui/MotionCard';
import { DynamicChart } from '@/components/ui/DynamicChart';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle, Activity, FolderOpen } from 'lucide-react';
import { CalculationRules } from '@/lib/calculations';
import MetricsDetailModal from '@/components/ui/MetricsDetailModal';
import GraphAnalysisModal from '@/components/ui/GraphAnalysisModal';
import MilestonePerformanceCard from '@/components/dashboard/MilestonePerformanceCard';
import { useNavigate } from 'react-router-dom';
import client from '@/api/client';

const SPVDashboard = ({ projects, kpis, risks }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [graphModalOpen, setGraphModalOpen] = useState(false);
  const [graphMetric, setGraphMetric] = useState('budget');
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  // EDMS Integration - Fetch real pending approvals
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await client.get('/edms/approvals/pending/');
        const docs = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setPendingApprovalsCount(docs.length);
      } catch (err) {
        console.error("Failed to load EDMS stats", err);
      }
    };
    fetchStats();
  }, []);

  // SPV Specific Metrics with Dynamic Calculations
  const runningProjects = projects.filter(p => p.status === 'In Progress');
  const totalBudget = CalculationRules.calculateTotalProjectBudget(runningProjects.map(p => ({ allocated: p.budget })));
  const totalSpent = CalculationRules.calculateTotalProjectSpent(projects.map(p => ({ spent: p.spent })));

  // Dynamic financial data for chart
  const financialData = projects.map(p => ({
    name: p.name,
    budget: p.budget / 10000000, // Convert to Crores
    spent: p.spent / 10000000,
  }));

  const activeProjectsCount = CalculationRules.filterProjectsByStatus(projects, 'In Progress').length;
  const criticalRisksCount = CalculationRules.filterRisks(risks, 'all', 'Open').filter(r => r.impact === 'Critical').length;

  // Format currency helper
  const formatBudget = (val) => `₹${(Number(val) / 10000000).toFixed(2)} Cr`;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const handleCardClick = (metricType) => {
    let data = { title: '', description: '', items: [], documents: [] };

    switch (metricType) {
      case 'budget':
        data = {
          title: t('projects.totalBudget'),
          description: "This represents the total approved capital expenditure for running projects in the Zaheerabad Industrial Area. Click a project to view full details.",
          items: runningProjects.map(p => ({
            label: p.name,
            value: formatBudget(p.budget),
            onClick: () => {
              setSelectedMetric(null); // Close modal
              navigate(`/projects/${p.id}`);
            }
          })),
          documents: [
            { name: 'Annual_Budget_FY24.pdf', date: '21 Oct 2024', type: 'pdf' },
            { name: 'Q3_Expenditure_Report.xlsx', date: '05 Dec 2024', type: 'xlsx' },
            { name: 'Fund_Release_Order_GO_112.pdf', date: '15 Sep 2024', type: 'pdf' }
          ]
        };
        break;
      case 'activeProjects':
        data = {
          title: t('projects.totalProjects'),
          description: "Count of projects currently in the 'In Progress' phase. These projects have passed the planning stage and are actively consuming resources on-site or in design. Click individual projects in the list view for detailed Gantt charts.",
          items: projects.filter(p => p.status === 'In Progress').map(p => ({ label: p.name, value: `${p.progress}% Complete` })),
          documents: [
            { name: 'Master_Project_Schedule_v4.mpp', date: '01 Nov 2024', type: 'mpp' },
            { name: 'Site_Progress_Photos_Nov.zip', date: '30 Nov 2024', type: 'zip' }
          ]
        };
        break;
      case 'approvals':
        data = {
          title: t('common.underReview'),
          description: "Pending administrative approvals required to proceed to the next workflow stage. This primarily includes Budget Approvals, Design Sign-offs, and Contractor Selection validations.",
          items: projects.filter(p => p.status === 'Planning' || p.status === 'Under Review').map(p => ({ label: p.name, value: p.status })),
          documents: [
            { name: 'Pending_Approvals_Log.xlsx', date: 'Today', type: 'xlsx' },
            { name: 'Change_Request_CR005.pdf', date: '02 Dec 2024', type: 'pdf' }
          ]
        };
        break;
      case 'risks':
        data = {
          title: t('risk.activeRisks'),
          description: "Critical risks that have a high probability of occurrence and significant impact on project timeline or cost. Immediate mitigation strategies are required for these items.",
          items: risks.filter(r => r.impact === 'Critical' && r.status !== 'Closed').map(r => ({ label: r.title, value: r.mitigationStrategy || 'No Plan' })),
          documents: [
            { name: 'Risk_Management_Plan.pdf', date: '10 Aug 2024', type: 'pdf' },
            { name: 'Mitigation_Report_Critical.docx', date: '28 Nov 2024', type: 'docx' }
          ]
        };
        break;
      default:
        return;
    }
    setSelectedMetric(data);
  };

  const handleGraphClick = (metric) => {
    setGraphMetric(metric);
    setGraphModalOpen(true);
  }

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {t('role.SPV_Official')} {t('dashboard.overview')}
            </h2>
            <p className="text-slate-500">{t('dashboard.title')}</p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium border border-emerald-200">
              {t('common.status')}: Online
            </span>
          </div>
        </motion.div>

        {/* High-Level KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MotionCard
            variants={itemVariants}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCardClick('budget')}
            className="bg-gradient-to-br from-white to-slate-50 border-l-4 border-l-emerald-500 cursor-pointer shadow-sm hover:shadow-md transition-all"
          >
            <MotionCardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">{t('projects.totalBudget')}</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-2">{formatBudget(totalBudget)}</h3>
                  <p className="text-xs text-emerald-600 flex items-center mt-1">
                    <TrendingUp size={12} className="mr-1" /> {t('common.approved')}
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <DollarSign className="text-emerald-600" size={24} />
                </div>
              </div>
            </MotionCardContent>
          </MotionCard>

          <MotionCard
            variants={itemVariants}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCardClick('activeProjects')}
            className="bg-gradient-to-br from-white to-slate-50 border-l-4 border-l-blue-500 cursor-pointer shadow-sm hover:shadow-md transition-all"
          >
            <MotionCardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">{t('projects.totalProjects')}</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-2">{activeProjectsCount}</h3>
                  <p className="text-xs text-blue-600 flex items-center mt-1">
                    <Activity size={12} className="mr-1" /> {t('common.inProgress')}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FolderOpen className="text-blue-600" size={24} />
                </div>
              </div>
            </MotionCardContent>
          </MotionCard>

          <MotionCard
            variants={itemVariants}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/approvals')}
            className="bg-gradient-to-br from-white to-slate-50 border-l-4 border-l-amber-500 cursor-pointer shadow-sm hover:shadow-md transition-all"
          >
            <MotionCardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">{t('common.underReview')}</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-2">{pendingApprovalsCount}</h3>
                  <p className="text-xs text-amber-600 flex items-center mt-1">
                    Click to review documents
                  </p>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl">
                  <CheckCircle className="text-amber-600" size={24} />
                </div>
              </div>
            </MotionCardContent>
          </MotionCard>

          <MotionCard
            variants={itemVariants}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCardClick('risks')}
            className="bg-gradient-to-br from-white to-slate-50 border-l-4 border-l-rose-500 cursor-pointer shadow-sm hover:shadow-md transition-all"
          >
            <MotionCardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">{t('risk.activeRisks')}</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-2">
                    {criticalRisksCount}
                  </h3>
                  <p className="text-xs text-rose-600 flex items-center mt-1">
                    <AlertTriangle size={12} className="mr-1" /> {t('priority.critical')}
                  </p>
                </div>
                <div className="p-3 bg-rose-100 rounded-xl">
                  <AlertTriangle className="text-rose-600" size={24} />
                </div>
              </div>
            </MotionCardContent>
          </MotionCard>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MotionCard
            variants={itemVariants}
            onClick={() => handleGraphClick('budget')}
            className="shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-200"
          >
            <MotionCardHeader>
              <MotionCardTitle>{t('dashboard.budgetVsSpent')}</MotionCardTitle>
            </MotionCardHeader>
            <MotionCardContent>
              <DynamicChart
                data={financialData}
                dataKey="budget"
                height={350}
                defaultType="bar"
                colors={['#10b981', '#3b82f6']}
                name={t('projects.budget')}
              />
            </MotionCardContent>
          </MotionCard>

          <MotionCard
            variants={itemVariants}
            onClick={() => handleGraphClick('progress')}
            className="shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-200"
          >
            <MotionCardHeader>
              <MotionCardTitle>{t('dashboard.projectTimeline')}</MotionCardTitle>
            </MotionCardHeader>
            <MotionCardContent>
              <DynamicChart
                data={projects.map(p => ({
                  name: p.name,
                  value: CalculationRules.calculateProjectProgress(p.progress, 100) * 100
                }))}
                dataKey="value"
                height={350}
                defaultType="area"
                colors={['#8b5cf6']}
                name={t('dashboard.progress')}
              />
            </MotionCardContent>
          </MotionCard>
        </div>

        {/* Milestone Performance Section */}
        {runningProjects.length > 0 && (
          <motion.div variants={itemVariants} className="mt-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity size={18} className="text-primary-500" />
              Cost Performance by Milestone
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {runningProjects.slice(0, 3).map(project => (
                <MilestonePerformanceCard
                  key={project.id}
                  projectId={project.id}
                  projectName={project.name}
                />
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      <MetricsDetailModal
        isOpen={!!selectedMetric}
        onClose={() => setSelectedMetric(null)}
        title={selectedMetric?.title}
        description={selectedMetric?.description}
        items={selectedMetric?.items}
        documents={selectedMetric?.documents}
      />

      <GraphAnalysisModal
        isOpen={graphModalOpen}
        onClose={() => setGraphModalOpen(false)}
        projects={projects}
        initialMetric={graphMetric}
      />
    </>
  );
};

export default SPVDashboard;
