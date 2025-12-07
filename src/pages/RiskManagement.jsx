import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { risks, projects } from '@/mock';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { getStatusColor, getImpactColor, getPriorityColor } from '@/lib/colors';
import { DynamicChart } from '@/components/ui/DynamicChart';

const RiskManagement = () => {
  const { t } = useLanguage();

  const getStatusIcon = (status) => {
    const statusColors = getStatusColor(status);
    switch (status) {
      case 'Closed':
        return <CheckCircle className={statusColors.icon} size={20} />;
      case 'Mitigated':
        return <CheckCircle className={statusColors.icon} size={20} />;
      case 'Assessed':
        return <Clock className={statusColors.icon} size={20} />;
      default:
        return <AlertTriangle className={statusColors.icon} size={20} />;
    }
  };

  const getStatusBadgeColor = (status) => {
    const statusColors = getStatusColor(status);
    return `${statusColors.bg} ${statusColors.text}`;
  };

  // Risk distribution by category
  const riskByCategory = risks.reduce((acc, risk) => {
    acc[risk.category] = (acc[risk.category] || 0) + 1;
    return acc;
  }, {});

  const categoryData = Object.entries(riskByCategory).map(([name, value]) => ({
    name,
    value,
  }));

  // Risk distribution by status
  const riskByStatus = risks.reduce((acc, risk) => {
    acc[risk.status] = (acc[risk.status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(riskByStatus).map(([name, value]) => ({
    name,
    value,
  }));

  // High-contrast vibrant color palette: Emerald, Violet, Amber, Rose, Cyan
  const COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4'];

  // Group risks by project
  const risksByProject = projects.map((project) => ({
    project,
    projectRisks: risks.filter((risk) => risk.projectId === project.id),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('common.risk')}</h1>
        <p className="text-gray-600 mt-1">{t('risk.subtitle')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('risk.totalRisks')}</p>
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
                <p className="text-sm text-gray-600">{t('risk.activeRisks')}</p>
                <p className="text-2xl font-bold mt-2">
                  {risks.filter((r) => r.status !== 'Closed').length}
                </p>
              </div>
              <Clock className="text-warning-600" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('risk.highImpact')}</p>
                <p className="text-2xl font-bold mt-2">
                  {risks.filter((r) => r.impact === 'High' || r.impact === 'Critical').length}
                </p>
              </div>
              <XCircle className="text-error-600" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('risk.mitigated')}</p>
                <p className="text-2xl font-bold mt-2">
                  {risks.filter((r) => r.status === 'Mitigated' || r.status === 'Closed').length}
                </p>
              </div>
              <CheckCircle className="text-success-600" size={32} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('risk.risksByCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <DynamicChart
              data={categoryData}
              dataKey="value"
              height={300}
              defaultType="bar"
              name="Risks"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('risk.risksByStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <DynamicChart
              data={statusData}
              dataKey="value"
              height={300}
              defaultType="pie"
              colors={COLORS}
            />
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
                            <span className="text-xs text-gray-500">{t('common.category')}:</span>
                            <span className="px-2 py-1 bg-gray-200 rounded text-xs">{risk.category}</span>
                            <span className="text-xs text-gray-500 ml-2">{t('common.owner')}:</span>
                            <span className="px-2 py-1 bg-gray-200 rounded text-xs">{risk.owner}</span>
                            <span className="text-xs text-gray-500 ml-2">{t('common.identified')}:</span>
                            <span className="px-2 py-1 bg-gray-200 rounded text-xs">
                              {new Date(risk.identifiedDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span
                            className={`px-3 py-1 rounded text-xs font-medium ${getImpactColor(risk.impact)}`}
                          >
                            {t('common.impact')}: {risk.impact}
                          </span>
                          <span
                            className={`px-3 py-1 rounded text-xs font-medium ${getPriorityColor(risk.probability).bg} ${getPriorityColor(risk.probability).text}`}
                          >
                            {t('common.probability')}: {risk.probability}
                          </span>
                          <span
                            className={`px-3 py-1 rounded text-xs font-medium ${getStatusBadgeColor(risk.status)}`}
                          >
                            {risk.status}
                          </span>
                        </div>
                      </div>
                      {risk.mitigationPlan && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm font-medium mb-1">{t('risk.mitigationPlan')}</p>
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

