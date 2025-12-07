import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { MotionCard, MotionCardContent, MotionCardHeader, MotionCardTitle } from '@/components/ui/MotionCard';
import { useMockData } from '@/hooks/useMockData';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { KPIDetailModal } from '@/components/dashboard/KPIDetailModal';
import { kpis, risks, tasks } from '@/mock';
import Button from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { AnimatedBarChart, AnimatedLineChart, AnimatedPieChart } from '@/components/ui/AnimatedChart';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Search } from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<typeof kpis[0] | null>(null);
  const [isKPIModalOpen, setIsKPIModalOpen] = useState(false);
  const { projects, addProject } = useMockData();

  // Check if user can create projects (SPV_Official or PMNC_Team)
  const canCreateProject = user?.role === 'SPV_Official' || user?.role === 'PMNC_Team';

  const handleKPIClick = (kpi: typeof kpis[0]) => {
    if (kpi.category === 'Risk') {
      navigate('/risk');
      toast.info(t('dashboard.navigatingToRisk'), {
        description: t('dashboard.viewingRiskDetails'),
      });
    } else {
      // Open KPI detail modal for all other KPIs
      setSelectedKPI(kpi);
      setIsKPIModalOpen(true);
    }
  };

  const handleCreateProject = async (projectData: Omit<typeof projects[0], 'id'>) => {
    await addProject(projectData as typeof projects[0]);
  };

  // Prepare data for charts
  const projectProgressData = projects.map((p) => ({
    name: p.name.substring(0, 20) + '...',
    progress: p.progress,
  }));

  const budgetData = projects.map((p) => ({
    name: p.name.substring(0, 15) + '...',
    budget: p.budget / 1000000,
    spent: p.spent / 1000000,
  }));

  const riskDistribution = risks.reduce((acc, risk) => {
    acc[risk.status] = (acc[risk.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const riskPieData = Object.entries(riskDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['#2546eb', '#14b8a6', '#f59e0b', '#f97316']; // Updated to dark blue palette

  // Filter projects, tasks, and risks based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.status.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const filteredTasks = useMemo(() => {
    const baseTasks = tasks.filter((task) => task.status === 'In Progress' || task.status === 'Not Started');
    if (!searchQuery) return baseTasks.slice(0, 5);
    const query = searchQuery.toLowerCase();
    return baseTasks
      .filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.assignedTo.toLowerCase().includes(query) ||
          t.status.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [searchQuery]);

  const filteredRisks = useMemo(() => {
    const baseRisks = risks.filter((risk) => risk.status !== 'Closed');
    if (!searchQuery) return baseRisks.slice(0, 5);
    const query = searchQuery.toLowerCase();
    return baseRisks
      .filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.category.toLowerCase().includes(query) ||
          r.impact.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [searchQuery]);

  const upcomingTasks = filteredTasks;
  const activeRisks = filteredRisks;

  // Animation variants for staggered entrance
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20,
      },
    },
  };

  const chartVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay: 0.3,
      },
    },
  };

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="flex items-center justify-between" variants={itemVariants}>
        <div>
          <h1 className="text-3xl font-heading font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
            {t('dashboard.title')}
          </h1>
          <p className="text-slate-500 mt-1">{t('dashboard.overview')}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder={t('dashboard.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-600 focus:border-primary-600 bg-white/80 backdrop-blur-sm shadow-sm"
                aria-label="Search dashboard content"
              />
            </div>
          </div>
          {canCreateProject && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={18} className="mr-2" />
              {t('dashboard.createProject')}
            </Button>
          )}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" variants={itemVariants}>
        {kpis.slice(0, 4).map((kpi) => {
          const isPositive = kpi.trend === 'up' || (kpi.trend === 'stable' && kpi.value >= kpi.target);
          return (
            <MotionCard
              key={kpi.id}
              className="cursor-pointer"
              onClick={() => handleKPIClick(kpi)}
            >
              <MotionCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{kpi.name}</p>
                    <p className="text-3xl font-heading font-bold mt-2 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                      {kpi.value} {kpi.unit}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {t('common.target')}: {kpi.target} {kpi.unit}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${isPositive ? 'bg-secondary-50 shadow-teal-glow' : 'bg-error-50'}`}>
                    {isPositive ? (
                      <TrendingUp className="text-secondary-600" size={24} />
                    ) : (
                      <TrendingDown className="text-error-600" size={24} />
                    )}
                  </div>
                </div>
              </MotionCardContent>
            </MotionCard>
          );
        })}
      </motion.div>

      {/* Charts Row */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={chartVariants}>
        {/* Project Progress Chart */}
        <MotionCard>
          <MotionCardHeader>
            <MotionCardTitle>{t('dashboard.recentProjects')} - {t('dashboard.progress')}</MotionCardTitle>
          </MotionCardHeader>
          <MotionCardContent>
            <AnimatedBarChart
              data={projectProgressData}
              dataKey="progress"
              height={300}
              color="#2546eb"
            />
          </MotionCardContent>
        </MotionCard>

        {/* Budget vs Spent Chart */}
        <MotionCard>
          <MotionCardHeader>
            <MotionCardTitle>{t('dashboard.budgetVsSpent')}</MotionCardTitle>
          </MotionCardHeader>
          <MotionCardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '8px',
                  }}
                  formatter={(value: number) => [`₹${value.toFixed(2)} Cr`, '']}
                  labelFormatter={(label) => `Project: ${label}`}
                />
                <Legend />
                <Bar dataKey="budget" fill="#cbd5e1" name={t('common.budget')} radius={[8, 8, 0, 0]} animationDuration={1000} />
                <Bar dataKey="spent" fill="#14b8a6" name={t('common.spent')} radius={[8, 8, 0, 0]} animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          </MotionCardContent>
        </MotionCard>
      </motion.div>

      {/* Risk Distribution and Timeline */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={chartVariants}>
        {/* Risk Distribution Pie Chart */}
        <MotionCard>
          <MotionCardHeader>
            <MotionCardTitle>{t('dashboard.activeRisks')} - {t('dashboard.riskDistribution')}</MotionCardTitle>
          </MotionCardHeader>
          <MotionCardContent>
            <AnimatedPieChart
              data={riskPieData}
              dataKey="value"
              height={300}
              colors={COLORS}
            />
          </MotionCardContent>
        </MotionCard>

        {/* Project Timeline */}
        <MotionCard>
          <MotionCardHeader>
            <MotionCardTitle>{t('dashboard.projectTimeline')}</MotionCardTitle>
          </MotionCardHeader>
          <MotionCardContent>
            <AnimatedLineChart
              data={projects.map((p) => ({ name: p.name.substring(0, 15), progress: p.progress }))}
              dataKey="progress"
              height={300}
              color="#2546eb"
            />
          </MotionCardContent>
        </MotionCard>
      </motion.div>

      {/* Recent Projects and Active Risks */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={itemVariants}>
        {/* Recent Projects */}
        <MotionCard>
          <MotionCardHeader>
            <MotionCardTitle>
              {t('dashboard.recentProjects')}
              {searchQuery && (
                <span className="text-sm font-normal text-slate-500 ml-2">
                  ({filteredProjects.length} {t('common.found')})
                </span>
              )}
            </MotionCardTitle>
          </MotionCardHeader>
          <MotionCardContent>
            <div className="space-y-4">
              {filteredProjects.slice(0, 5).map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl hover:bg-slate-100/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-slate-900">{project.name}</p>
                    <p className="text-xs text-slate-500">{project.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{project.progress}%</p>
                    <div className="w-24 h-2 bg-slate-200 rounded-full mt-1">
                      <motion.div
                        className="h-2 bg-gradient-to-r from-primary-600 to-primary-700 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${project.progress}%` }}
                        transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </MotionCardContent>
        </MotionCard>

        {/* Active Risks */}
        <MotionCard>
          <MotionCardHeader>
            <MotionCardTitle>
              {t('dashboard.activeRisks')}
              {searchQuery && (
                <span className="text-sm font-normal text-slate-500 ml-2">
                  ({activeRisks.length} {t('common.found')})
                </span>
              )}
            </MotionCardTitle>
          </MotionCardHeader>
          <MotionCardContent>
            <div className="space-y-4">
              {activeRisks.length > 0 ? (
                activeRisks.map((risk, index) => {
                const impactColors: Record<string, string> = {
                  Low: 'bg-success-50 text-success-700',
                  Medium: 'bg-warning-50 text-warning-700',
                  High: 'bg-accent-50 text-accent-700',
                  Critical: 'bg-error-50 text-error-700',
                };

                return (
                  <motion.div
                    key={risk.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-slate-50/50 rounded-xl hover:bg-slate-100/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-slate-900">{risk.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{risk.category}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${impactColors[risk.impact]}`}
                      >
                        {risk.impact}
                      </span>
                    </div>
                  </motion.div>
                );
                })
              ) : (
                <div className="text-center py-8 text-slate-500">
                  {searchQuery ? t('dashboard.noRisksFound') : t('dashboard.noActiveRisks')}
                </div>
              )}
            </div>
          </MotionCardContent>
        </MotionCard>
      </motion.div>

      {/* Upcoming Tasks */}
      <MotionCard variants={itemVariants}>
        <MotionCardHeader>
          <MotionCardTitle>
            {t('dashboard.upcomingTasks')}
            {searchQuery && (
              <span className="text-sm font-normal text-slate-500 ml-2">
                  ({upcomingTasks.length} {t('common.found')})
              </span>
            )}
          </MotionCardTitle>
        </MotionCardHeader>
        <MotionCardContent>
          <div className="space-y-3">
            {upcomingTasks.length > 0 ? (
              upcomingTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl hover:bg-slate-100/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{task.name}</p>
                  <p className="text-sm text-slate-500">
                    {task.startDate} - {task.endDate}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-slate-900">{task.progress}%</span>
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      task.status === 'Completed'
                        ? 'bg-success-50 text-success-700'
                        : task.status === 'In Progress'
                        ? 'bg-primary-50 text-primary-700'
                        : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                {searchQuery ? t('dashboard.noTasksFound') : t('dashboard.noUpcomingTasks')}
              </div>
            )}
          </div>
        </MotionCardContent>
      </MotionCard>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateProject}
      />

      <KPIDetailModal
        isOpen={isKPIModalOpen}
        onClose={() => {
          setIsKPIModalOpen(false);
          setSelectedKPI(null);
        }}
        kpi={selectedKPI}
      />
    </motion.div>
  );
};

export default Dashboard;

