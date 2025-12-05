import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { risks, projects } from '@/mock';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const RiskManagement = () => {
  const { t } = useLanguage();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Closed':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'Mitigated':
        return <CheckCircle className="text-blue-600" size={20} />;
      case 'Assessed':
        return <Clock className="text-yellow-600" size={20} />;
      default:
        return <AlertTriangle className="text-orange-600" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Closed':
        return 'bg-green-100 text-green-800';
      case 'Mitigated':
        return 'bg-blue-100 text-blue-800';
      case 'Assessed':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-orange-100 text-orange-800';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'Critical':
        return 'bg-red-100 text-red-800';
      case 'High':
        return 'bg-orange-100 text-orange-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getProbabilityColor = (probability: string) => {
    switch (probability) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  // Risk distribution by category
  const riskByCategory = risks.reduce((acc, risk) => {
    acc[risk.category] = (acc[risk.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryData = Object.entries(riskByCategory).map(([name, value]) => ({
    name,
    value,
  }));

  // Risk distribution by status
  const riskByStatus = risks.reduce((acc, risk) => {
    acc[risk.status] = (acc[risk.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(riskByStatus).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // Group risks by project
  const risksByProject = projects.map((project) => ({
    project,
    projectRisks: risks.filter((risk) => risk.projectId === project.id),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('common.risk')}</h1>
        <p className="text-gray-600 mt-1">Risk Register and Mitigation Planning</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Risks</p>
                <p className="text-2xl font-bold mt-2">{risks.length}</p>
              </div>
              <AlertTriangle className="text-orange-600" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Risks</p>
                <p className="text-2xl font-bold mt-2">
                  {risks.filter((r) => r.status !== 'Closed').length}
                </p>
              </div>
              <Clock className="text-yellow-600" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Impact</p>
                <p className="text-2xl font-bold mt-2">
                  {risks.filter((r) => r.impact === 'High' || r.impact === 'Critical').length}
                </p>
              </div>
              <XCircle className="text-red-600" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Mitigated</p>
                <p className="text-2xl font-bold mt-2">
                  {risks.filter((r) => r.status === 'Mitigated' || r.status === 'Closed').length}
                </p>
              </div>
              <CheckCircle className="text-green-600" size={32} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Risks by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Risk Register */}
      <div className="space-y-6">
        {risksByProject.map(({ project, projectRisks }) => {
          if (projectRisks.length === 0) return null;

          return (
            <Card key={project.id}>
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projectRisks.map((risk) => (
                    <div
                      key={risk.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(risk.status)}
                            <h3 className="font-medium text-lg">{risk.title}</h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{risk.description}</p>
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-gray-500">Category:</span>
                            <span className="px-2 py-1 bg-gray-200 rounded text-xs">{risk.category}</span>
                            <span className="text-xs text-gray-500 ml-2">Owner:</span>
                            <span className="px-2 py-1 bg-gray-200 rounded text-xs">{risk.owner}</span>
                            <span className="text-xs text-gray-500 ml-2">Identified:</span>
                            <span className="px-2 py-1 bg-gray-200 rounded text-xs">
                              {new Date(risk.identifiedDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span
                            className={`px-3 py-1 rounded text-xs font-medium ${getImpactColor(risk.impact)}`}
                          >
                            Impact: {risk.impact}
                          </span>
                          <span
                            className={`px-3 py-1 rounded text-xs font-medium ${getProbabilityColor(risk.probability)}`}
                          >
                            Probability: {risk.probability}
                          </span>
                          <span
                            className={`px-3 py-1 rounded text-xs font-medium ${getStatusColor(risk.status)}`}
                          >
                            {risk.status}
                          </span>
                        </div>
                      </div>
                      {risk.mitigationPlan && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm font-medium mb-1">Mitigation Plan:</p>
                          <p className="text-sm text-gray-600">{risk.mitigationPlan}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default RiskManagement;


