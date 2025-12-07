import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { MotionCard, MotionCardContent, MotionCardHeader, MotionCardTitle } from '@/components/ui/MotionCard';
import { useMockData } from '@/hooks/useMockData';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { KPIDetailModal } from '@/components/dashboard/KPIDetailModal';
import { kpis, risks, tasks } from '@/mock';
import Button from '@/components/ui/Button';
import { Plus, Search, FolderOpen, Calendar, AlertTriangle, X } from 'lucide-react';
import { DynamicChart } from '@/components/ui/DynamicChart';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { canCreateProject as canCreateProjectRule } from '@/lib/calculations';

const Dashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<typeof kpis[0] | null>(null);
  const [isKPIModalOpen, setIsKPIModalOpen] = useState(false);
  const { projects, addProject } = useMockData();
  const searchRef = useRef<HTMLDivElement>(null);

  // Check if user can create projects (SPV_Official or PMNC_Team) - using rule-based function
  const userCanCreateProject = canCreateProjectRule(user?.role || '');

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

  // Prepare data for charts (filtered by selected project)
  const projectProgressData = useMemo(() => {
    const filtered = selectedProjectId === 'all' ? projects : projects.filter((p) => p.id === selectedProjectId);
    return filtered.map((p) => ({
      name: p.name.substring(0, 20) + '...',
      progress: p.progress,
    }));
  }, [selectedProjectId, projects]);

  const budgetData = useMemo(() => {
    const filtered = selectedProjectId === 'all' ? projects : projects.filter((p) => p.id === selectedProjectId);
    return filtered.map((p) => ({
      name: p.name.substring(0, 15) + '...',
      budget: p.budget / 1000000,
      spent: p.spent / 1000000,
    }));
  }, [selectedProjectId, projects]);

  const riskDistribution = useMemo(() => {
    let filteredRisks = risks;
    if (selectedProjectId !== 'all') {
      filteredRisks = filteredRisks.filter((risk) => risk.projectId === selectedProjectId);
    }
    return filteredRisks.reduce((acc, risk) => {
      acc[risk.status] = (acc[risk.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [selectedProjectId]);

  const riskPieData = useMemo(() => {
    return Object.entries(riskDistribution).map(([name, value]) => ({
      name,
      value,
    }));
  }, [riskDistribution]);

  // High-contrast vibrant color palette: Emerald, Violet, Amber, Rose, Cyan
  const COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4'];

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
    let baseTasks = tasks.filter((task) => task.status === 'In Progress' || task.status === 'Not Started');
    
    // Filter by selected project
    if (selectedProjectId !== 'all') {
      baseTasks = baseTasks.filter((task) => task.projectId === selectedProjectId);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      baseTasks = baseTasks.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.assignedTo.toLowerCase().includes(query) ||
          t.status.toLowerCase().includes(query)
      );
    }
    
    return baseTasks.slice(0, 5);
  }, [searchQuery, selectedProjectId]);

  const filteredRisks = useMemo(() => {
    let baseRisks = risks.filter((risk) => risk.status !== 'Closed');
    
    // Filter by selected project
    if (selectedProjectId !== 'all') {
      baseRisks = baseRisks.filter((risk) => risk.projectId === selectedProjectId);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      baseRisks = baseRisks.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.category.toLowerCase().includes(query) ||
          r.impact.toLowerCase().includes(query)
      );
    }
    
    return baseRisks.slice(0, 5);
  }, [searchQuery, selectedProjectId]);

  const upcomingTasks = filteredTasks;
  const activeRisks = filteredRisks;

  // Generate search suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    
    const query = searchQuery.toLowerCase();
    const suggestions: Array<{
      id: string;
      type: 'project' | 'task' | 'risk';
      title: string;
      subtitle: string;
      icon: typeof FolderOpen;
    }> = [];

    // Add matching projects
    projects
      .filter((p) => 
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.status.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      )
      .slice(0, 3)
      .forEach((project) => {
        suggestions.push({
          id: project.id,
          type: 'project',
          title: project.name,
          subtitle: `${project.status} • ${project.category}`,
          icon: FolderOpen,
        });
      });

    // Add matching tasks
    tasks
      .filter((t) =>
        t.name.toLowerCase().includes(query) ||
        t.assignedTo.toLowerCase().includes(query) ||
        t.status.toLowerCase().includes(query)
      )
      .slice(0, 3)
      .forEach((task) => {
        suggestions.push({
          id: task.id,
          type: 'task',
          title: task.name,
          subtitle: `${task.status} • ${task.assignedTo}`,
          icon: Calendar,
        });
      });

    // Add matching risks
    risks
      .filter((r) =>
        r.title.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query) ||
        r.impact.toLowerCase().includes(query)
      )
      .slice(0, 3)
      .forEach((risk) => {
        suggestions.push({
          id: risk.id,
          type: 'risk',
          title: risk.title,
          subtitle: `${risk.impact} • ${risk.category}`,
          icon: AlertTriangle,
        });
      });

    return suggestions.slice(0, 8); // Limit to 8 suggestions
  }, [searchQuery, projects, tasks, risks]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    if (isSearchFocused) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchFocused]);

  const handleSuggestionClick = (suggestion: typeof searchSuggestions[0]) => {
    setSearchQuery(suggestion.title);
    setIsSearchFocused(false);
    
    if (suggestion.type === 'project') {
      navigate('/projects');
      toast.info('Navigating to project', {
        description: `Viewing details for ${suggestion.title}`,
      });
    } else if (suggestion.type === 'risk') {
      navigate('/risk');
      toast.info('Navigating to risk', {
        description: `Viewing details for ${suggestion.title}`,
      });
    }
  };

  // Animation variants for staggered entrance - optimized for performance
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  };

  const chartVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
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
            <div className="relative" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 z-10" size={18} />
              <input
                type="text"
                placeholder={t('dashboard.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className={cn(
                  'w-full pl-10 pr-10 py-2 border rounded-xl',
                  'bg-white/80 backdrop-blur-sm shadow-sm',
                  'focus:outline-none transition-all duration-200',
                  isSearchFocused
                    ? 'border-primary-600 ring-2 ring-primary-600/20'
                    : 'border-slate-300 focus:ring-2 focus:ring-primary-600 focus:border-primary-600'
                )}
                aria-label="Search dashboard content"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchFocused(false);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 transition-colors"
                  aria-label="Clear search"
                >
                  <X size={16} className="text-slate-400" />
                </button>
              )}
              
              {/* Search Suggestions Dropdown */}
              <AnimatePresence>
                {isSearchFocused && searchSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-glass border border-slate-200/50 z-[60] max-h-96 overflow-y-auto"
                  >
                    <div className="p-2">
                      <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {t('dashboard.searchSuggestions') || 'Suggestions'}
                      </div>
                      {searchSuggestions.map((suggestion) => {
                        const Icon = suggestion.icon;
                        return (
                          <button
                            key={`${suggestion.type}-${suggestion.id}`}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-left"
                          >
                            <div className="p-2 rounded-lg bg-primary-50">
                              <Icon size={18} className="text-primary-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {suggestion.title}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {suggestion.subtitle}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          {userCanCreateProject && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={18} />
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
            <DynamicChart
              data={projectProgressData}
              dataKey="progress"
              height={300}
              defaultType="bar"
              name={t('dashboard.progress')}
            />
          </MotionCardContent>
        </MotionCard>

        {/* Budget vs Spent Chart */}
        <MotionCard>
          <MotionCardHeader>
            <MotionCardTitle>{t('dashboard.budgetVsSpent')}</MotionCardTitle>
          </MotionCardHeader>
          <MotionCardContent>
            <DynamicChart
              data={budgetData}
              dataKey="spent"
              height={300}
              defaultType="bar"
              name={t('common.spent')}
            />
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
            <DynamicChart
              data={riskPieData}
              dataKey="value"
              height={300}
              defaultType="pie"
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
            <DynamicChart
              data={projectProgressData}
              dataKey="progress"
              height={300}
              defaultType="line"
              name={t('dashboard.progress')}
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

