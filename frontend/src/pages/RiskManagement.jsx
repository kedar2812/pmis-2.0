import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DynamicChart } from '@/components/ui/DynamicChart';
import riskService from '@/api/services/riskService';
import projectService from '@/api/services/projectService';
import {
  AlertTriangle, CheckCircle, Clock, XCircle, Plus, Search,
  Filter, ChevronDown, ChevronRight, FileText, Shield,
  TrendingUp, TrendingDown, Calendar, User, Building,
  AlertCircle, Target, BarChart3, Loader2, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CreateRiskModal from '@/components/risks/CreateRiskModal';
import RiskDetailPanel from '@/components/risks/RiskDetailPanel';
import Button from '@/components/ui/Button';

const RiskManagement = () => {
  const { t } = useLanguage();

  // State
  const [risks, setRisks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // UI State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState({});

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [selectedProject, selectedSeverity, selectedStatus]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (selectedProject) filters.project = selectedProject;
      if (selectedSeverity) filters.severity = selectedSeverity;
      if (selectedStatus) filters.status = selectedStatus;

      const [risksRes, projectsRes, statsRes] = await Promise.all([
        riskService.getRisks(filters),
        projectService.getProjects(),
        riskService.getRiskStats()
      ]);

      // Handle paginated responses
      setRisks(risksRes.data?.results || risksRes.data || []);
      setProjects(projectsRes.data?.results || projectsRes.data || []);
      setStats(statsRes.data || null);
    } catch (err) {
      console.error('Failed to fetch risk data:', err);
      setError('Failed to load risk data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter risks by search query
  const filteredRisks = useMemo(() => {
    if (!searchQuery) return risks;
    const query = searchQuery.toLowerCase();
    return risks.filter(risk =>
      risk.title?.toLowerCase().includes(query) ||
      risk.risk_code?.toLowerCase().includes(query) ||
      risk.description?.toLowerCase().includes(query) ||
      risk.project_name?.toLowerCase().includes(query)
    );
  }, [risks, searchQuery]);

  // Group risks by project
  const risksByProject = useMemo(() => {
    const grouped = {};
    filteredRisks.forEach(risk => {
      const projectId = risk.project;
      if (!grouped[projectId]) {
        grouped[projectId] = {
          projectName: risk.project_name || 'Unknown Project',
          risks: []
        };
      }
      grouped[projectId].risks.push(risk);
    });
    return grouped;
  }, [filteredRisks]);

  // Chart data
  const categoryData = useMemo(() => {
    const counts = {};
    risks.forEach(risk => {
      const cat = risk.category || 'OTHER';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: riskService.CATEGORIES.find(c => c.value === name)?.label || name,
      value
    }));
  }, [risks]);

  const severityData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Critical', value: stats.by_severity?.critical || 0, color: '#ef4444' },
      { name: 'High', value: stats.by_severity?.high || 0, color: '#f97316' },
      { name: 'Medium', value: stats.by_severity?.medium || 0, color: '#eab308' },
      { name: 'Low', value: stats.by_severity?.low || 0, color: '#22c55e' }
    ];
  }, [stats]);

  // Handlers
  const handleRiskClick = (risk) => {
    setSelectedRisk(risk);
    setShowDetailPanel(true);
  };

  const handleCreateSuccess = (newRisk) => {
    setRisks(prev => [newRisk, ...prev]);
    setShowCreateModal(false);
    fetchData(); // Refresh stats
  };

  const handleUpdateSuccess = (updatedRisk) => {
    setRisks(prev => prev.map(r => r.id === updatedRisk.id ? updatedRisk : r));
    setSelectedRisk(updatedRisk);
    fetchData(); // Refresh stats
  };

  const toggleProjectExpand = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  // Severity badge component
  const SeverityBadge = ({ severity }) => {
    const colors = riskService.getSeverityColor(severity);
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
        {severity}
      </span>
    );
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const colors = riskService.getStatusColor(status);
    const statusLabel = riskService.STATUSES.find(s => s.value === status)?.label || status;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
        {statusLabel}
      </span>
    );
  };

  // Loading state
  if (loading && risks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <span className="ml-2 text-app-muted">Loading risk data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-app-heading flex items-center gap-2">
            <Shield className="text-orange-600" />
            {t('common.risk') || 'Risk Management'}
          </h1>
          <p className="text-app-muted mt-1">
            {t('risk.subtitle') || 'Identify, assess, and mitigate project risks'}
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="min-h-[44px]"
        >
          <Plus size={20} />
          Add New Risk
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Risks */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 dark:border-blue-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Total Risks</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">{stats?.total || 0}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <BarChart3 className="text-blue-600" size={28} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical Risks */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 dark:from-red-900/30 dark:to-red-800/30 dark:border-red-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">Critical</p>
                <p className="text-3xl font-bold text-red-900 dark:text-red-100 mt-1">{stats?.by_severity?.critical || 0}</p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-xl">
                <AlertCircle className="text-red-600" size={28} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* High Risks */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 dark:border-orange-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">High</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100 mt-1">{stats?.by_severity?.high || 0}</p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <AlertTriangle className="text-orange-600" size={28} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 dark:border-amber-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Overdue</p>
                <p className="text-3xl font-bold text-amber-900 dark:text-amber-100 mt-1">{stats?.overdue_count || 0}</p>
              </div>
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <Clock className="text-amber-600" size={28} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mitigated */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 dark:from-green-900/30 dark:to-green-800/30 dark:border-green-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">Mitigated</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-1">
                  {(stats?.by_status?.MITIGATED || 0) + (stats?.by_status?.CLOSED || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-xl">
                <CheckCircle className="text-green-600" size={28} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Risks by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <DynamicChart
                data={categoryData}
                dataKey="value"
                height={280}
                defaultType="bar"
                name="Risks"
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-app-muted">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Risk Severity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {severityData.length > 0 && severityData.some(d => d.value > 0) ? (
              <DynamicChart
                data={severityData}
                dataKey="value"
                height={280}
                defaultType="pie"
                colors={['#ef4444', '#f97316', '#eab308', '#22c55e']}
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-app-muted">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted-light" size={18} />
              <input
                type="text"
                placeholder="Search risks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-app bg-app-input text-app-text rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Project Filter */}
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-4 py-2 border border-app bg-app-input text-app-text rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-4 py-2 border border-app bg-app-input text-app-text rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-app bg-app-input text-app-text rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              {riskService.STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* Refresh */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 border border-app rounded-lg hover:bg-app-subtle flex items-center gap-2 text-app-text"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Risk List by Project */}
      <div className="space-y-4">
        {Object.entries(risksByProject).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="mx-auto text-app-muted-light mb-4" size={48} />
              <h3 className="text-lg font-medium text-app-heading mb-2">No Risks Found</h3>
              <p className="text-app-muted mb-4">
                {searchQuery || selectedProject || selectedSeverity || selectedStatus
                  ? 'No risks match your current filters. Try adjusting your search.'
                  : 'No risks have been registered yet. Click "Add New Risk" to get started.'}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Plus size={18} />
                Add New Risk
              </button>
            </CardContent>
          </Card>
        ) : (
          Object.entries(risksByProject).map(([projectId, { projectName, risks: projectRisks }]) => (
            <Card key={projectId}>
              <CardHeader
                className="cursor-pointer hover:bg-app-surface transition-colors"
                onClick={() => toggleProjectExpand(projectId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedProjects[projectId] ? (
                      <ChevronDown className="text-app-muted" size={20} />
                    ) : (
                      <ChevronRight className="text-app-muted" size={20} />
                    )}
                    <Building className="text-primary-600" size={20} />
                    <CardTitle className="text-lg">{projectName}</CardTitle>
                    <span className="px-2 py-1 bg-app-surface rounded-full text-sm text-app-muted">
                      {projectRisks.length} {projectRisks.length === 1 ? 'risk' : 'risks'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {projectRisks.filter(r => r.severity === 'CRITICAL').length > 0 && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                        {projectRisks.filter(r => r.severity === 'CRITICAL').length} Critical
                      </span>
                    )}
                    {projectRisks.filter(r => r.severity === 'HIGH').length > 0 && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                        {projectRisks.filter(r => r.severity === 'HIGH').length} High
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>

              <AnimatePresence>
                {(expandedProjects[projectId] !== false) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {projectRisks.map((risk) => (
                          <div
                            key={risk.id}
                            onClick={() => handleRiskClick(risk)}
                            className="p-4 bg-app-surface rounded-lg border border-app-subtle hover:border-primary-300 hover:shadow-sm cursor-pointer transition-all"
                          >
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs text-app-muted font-mono">{risk.risk_code}</span>
                                  <SeverityBadge severity={risk.severity} />
                                  <StatusBadge status={risk.status} />
                                  {risk.is_overdue && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs animate-pulse">
                                      Overdue
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-medium text-app-heading mb-1">{risk.title}</h3>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-app-muted">
                                  {risk.category && (
                                    <span className="flex items-center gap-1">
                                      <Target size={14} />
                                      {riskService.CATEGORIES.find(c => c.value === risk.category)?.label}
                                    </span>
                                  )}
                                  {risk.owner_name && (
                                    <span className="flex items-center gap-1">
                                      <User size={14} />
                                      {risk.owner_name}
                                    </span>
                                  )}
                                  {risk.target_resolution && (
                                    <span className="flex items-center gap-1">
                                      <Calendar size={14} />
                                      Due: {new Date(risk.target_resolution).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-app-heading">{risk.risk_score}</div>
                                  <div className="text-xs text-app-muted">Score</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-semibold text-app-text-medium">{risk.mitigation_count || 0}</div>
                                  <div className="text-xs text-app-muted">Mitigations</div>
                                </div>
                                {risk.document_count > 0 && (
                                  <div className="text-center">
                                    <div className="text-lg font-semibold text-app-text-medium">{risk.document_count}</div>
                                    <div className="text-xs text-app-muted">Docs</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))
        )}
      </div>

      {/* Create Risk Modal */}
      {showCreateModal && (
        <CreateRiskModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
          projects={projects}
        />
      )}

      {/* Risk Detail Panel */}
      {showDetailPanel && selectedRisk && (
        <RiskDetailPanel
          isOpen={showDetailPanel}
          onClose={() => {
            setShowDetailPanel(false);
            setSelectedRisk(null);
          }}
          risk={selectedRisk}
          onUpdate={handleUpdateSuccess}
        />
      )}
    </div>
  );
};

export default RiskManagement;
