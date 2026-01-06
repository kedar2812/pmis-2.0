import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import projectService from '@/api/services/projectService';
import mastersService from '@/api/services/mastersService';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { ProjectDetailModal } from '@/components/projects/ProjectDetailModal';
import { CreatePackageModal } from '@/components/packages/CreatePackageModal';
import { LandStats } from '@/components/projects/LandStats';
import { EmptyState } from '@/components/ui/EmptyState';
import { FolderOpen, Plus, Search, DollarSign, TrendingUp, Package } from 'lucide-react';
import Button from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { getStatusColor } from '@/lib/colors';
import { calculateBudgetUtilization } from '@/lib/calculations';
import { toast } from 'sonner';

const Projects = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatePackageModalOpen, setIsCreatePackageModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch all data from Backend
  const fetchData = async () => {
    try {
      const [projectsData, contractorsRes, packagesRes] = await Promise.all([
        projectService.getAllProjects(),
        mastersService.getActiveContractors(),
        projectService.getWorkPackages ? projectService.getWorkPackages() : Promise.resolve({ data: [] })
      ]);
      setProjects(projectsData || []);
      setContractors(contractorsRes.data || []);
      setPackages(packagesRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Check if user can create projects
  const canCreateProject = user?.role === 'SPV_Official' || user?.role === 'PMNC_Team';

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Safe checks for potentially missing fields in new data
      const name = project.name || '';
      const desc = project.description || '';
      const cat = project.category || '';
      const mgr = project.manager || '';

      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mgr.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  const handleCreateProject = async (projectData) => {
    try {
      await projectService.createProject(projectData);
      toast.success('Project created successfully');
      setIsCreateModalOpen(false);
      fetchProjects(); // Reload list
    } catch (error) {
      console.error('Create project failed:', error);
      toast.error('Failed to create project');
    }
  };

  const getStatusBadgeColor = (status) => {
    const statusColors = getStatusColor(status);
    return `${statusColors.bg} ${statusColors.text}`;
  };

  const formatCurrency = (amount) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(amount / 100000).toFixed(2)} L`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-950">{t('projects.title')}</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">{t('projects.subtitle')}</p>
        </div>
        {canCreateProject && (
          <div className="flex gap-2 sm:gap-3">
            <Button
              onClick={() => setIsCreatePackageModalOpen(true)}
              variant="outline"
              className="flex-1 sm:flex-none border-primary-950 text-primary-950 hover:bg-primary-50 min-h-[44px]"
            >
              <Package size={18} />
              <span className="hidden sm:inline ml-2">Create Package</span>
              <span className="sm:hidden ml-1">Package</span>
            </Button>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 sm:flex-none bg-primary-950 hover:bg-primary-900 min-h-[44px]"
            >
              <Plus size={18} />
              <span className="hidden sm:inline ml-2">{t('projects.createProject')}</span>
              <span className="sm:hidden ml-1">Project</span>
            </Button>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {projects.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <motion.div
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary-600"
              onClick={() => {
                setStatusFilter('all');
                setSearchQuery('');
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('projects.totalProjects')}</p>
                    <p className="text-2xl font-bold mt-1">{projects.length}</p>
                  </div>
                  <FolderOpen className="text-primary-600" size={32} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary-600"
              onClick={() => {
                setStatusFilter('In Progress');
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('common.inProgress')}</p>
                    <p className="text-2xl font-bold mt-1">
                      {projects.filter((p) => p.status === 'In Progress').length}
                    </p>
                  </div>
                  <TrendingUp className="text-blue-600" size={32} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary-600"
              onClick={() => {
                setStatusFilter('Completed');
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('common.completed')}</p>
                    <p className="text-2xl font-bold mt-1">
                      {projects.filter((p) => p.status === 'Completed').length}
                    </p>
                  </div>
                  <TrendingUp className="text-green-600" size={32} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary-600"
              onClick={() => {
                setStatusFilter('all');
                setSearchQuery('');
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('projects.totalBudget')}</p>
                    <p className="text-lg font-bold mt-1">
                      {formatCurrency(projects.filter(p => p.status === 'In Progress' || p.status === 'Completed').reduce((sum, p) => sum + Number(p.budget || 0), 0))}
                    </p>
                  </div>
                  <DollarSign className="text-primary-600" size={32} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder={t('projects.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
                aria-label="Search projects"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
              aria-label="Filter by status"
            >
              <option value="all">{t('projects.allStatus')}</option>
              <option value="Planning">{t('status.planning')}</option>
              <option value="In Progress">{t('status.inProgress')}</option>
              <option value="On Hold">{t('status.onHold')}</option>
              <option value="Completed">{t('status.completed')}</option>
              <option value="Cancelled">{t('status.cancelled')}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={FolderOpen}
              title={t('projects.noProjectsFound')}
              description={
                searchQuery || statusFilter !== 'all'
                  ? t('projects.adjustFilters')
                  : canCreateProject
                    ? t('projects.getStarted')
                    : t('projects.noProjectsAvailable')
              }
              actionLabel={canCreateProject && !searchQuery && statusFilter === 'all' ? t('projects.createProject') : undefined}
              onAction={canCreateProject && !searchQuery && statusFilter === 'all' ? () => setIsCreateModalOpen(true) : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                className="h-full hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedProject(project);
                  setIsDetailModalOpen(true);
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{project.name}</CardTitle>
                      <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(project.status)}`}
                    >
                      {project.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Project Progress */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">{t('common.progress')}</span>
                        <span className="font-semibold text-primary-600">{project.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${project.progress}%` }}
                          transition={{ duration: 0.5 }}
                          className={`h-2 rounded-full transition-all ${project.progress === 100
                            ? 'bg-success-600'
                            : project.progress >= 50
                              ? 'bg-primary-600'
                              : 'bg-warning-500'
                            }`}
                        />
                      </div>
                    </div>

                    {/* Budget Utilization */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">{t('projects.budgetUtilization')}</span>
                        <span className="font-semibold text-primary-600">
                          {calculateBudgetUtilization(project.budget, project.spent).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((project.spent / project.budget) * 100, 100)}%` }}
                          transition={{ duration: 0.5 }}
                          className={`h-2 rounded-full transition-all ${(project.spent / project.budget) * 100 > 90
                            ? 'bg-error-600'
                            : (project.spent / project.budget) * 100 > 75
                              ? 'bg-warning-500'
                              : 'bg-success-600'
                            }`}
                        />
                      </div>
                    </div>

                    {/* Land Acquisition Status */}
                    {project.land_data ? (
                      <LandStats project={project} />
                    ) : project.landAcquisitionStatus !== undefined ? (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600">Land Acquisition Status</span>
                          <span className="font-semibold text-primary-600">
                            {project.landAcquisitionStatus}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${project.landAcquisitionStatus}%` }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className={`h-2 rounded-full transition-all ${project.landAcquisitionStatus > 90
                              ? 'bg-green-600'
                              : project.landAcquisitionStatus > 50
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                              }`}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateProject}
      />

      <ProjectDetailModal
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        project={selectedProject}
        packages={packages.filter(p => p.project === selectedProject?.id)}
        contractors={contractors}
      />

      <CreatePackageModal
        isOpen={isCreatePackageModalOpen}
        onClose={() => setIsCreatePackageModalOpen(false)}
        projects={projects}
        onSave={async (packageData) => {
          try {
            await projectService.createWorkPackage(packageData);
            toast.success('Work package created');
            setIsCreatePackageModalOpen(false);
            fetchData();
          } catch (error) {
            console.error('Failed to create package:', error);
            toast.error('Failed to create work package');
          }
        }}
      />
    </div>
  );
};

export default Projects;

