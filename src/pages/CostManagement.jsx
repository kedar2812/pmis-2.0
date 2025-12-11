import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { budgets, costForecasts, projects } from '@/mock';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { BudgetClassificationChart } from '@/components/cost/BudgetClassificationChart';
import { calculateBudgetUtilization } from '@/lib/calculations';
import { DynamicChart } from '@/components/ui/DynamicChart';

const CostManagement = () => {
  const { t } = useLanguage();

  const formatCurrency = (amount) => {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  };

  // Prepare forecast data for chart
  const forecastChartData = costForecasts.reduce((acc, forecast) => {
    const existing = acc.find((item) => item.month === forecast.month);
    if (existing) {
      existing.forecasted += forecast.forecasted;
      existing.actual += forecast.actual;
    } else {
      acc.push({
        month: forecast.month,
        forecasted: forecast.forecasted,
        actual: forecast.actual,
      });
    }
    return acc;
  }, []);

  // Transform for DynamicChart (needs single dataKey, so we'll use actual as primary)
  const forecastChartDataForDynamic = forecastChartData.map((item) => ({
    name: item.month,
    value: item.actual,
    forecasted: item.forecasted,
  }));

  // Budget summary by project
  const budgetByProject = projects.map((project) => {
    const projectBudgets = budgets.filter((b) => b.projectId === project.id);
    const totalAllocated = projectBudgets.reduce((sum, b) => sum + b.allocated, 0);
    const totalSpent = projectBudgets.reduce((sum, b) => sum + b.spent, 0);
    const totalCommitted = projectBudgets.reduce((sum, b) => sum + b.committed, 0);
    const totalRemaining = projectBudgets.reduce((sum, b) => sum + b.remaining, 0);

    return {
      project,
      totalAllocated,
      totalSpent,
      totalCommitted,
      totalRemaining,
      utilization: calculateBudgetUtilization(totalAllocated, totalSpent),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('common.cost')}</h1>
        <p className="text-gray-600 mt-1">{t('cost.subtitle')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {budgetByProject.reduce(
          (acc, item) => {
            acc.totalAllocated += item.totalAllocated;
            acc.totalSpent += item.totalSpent;
            acc.totalCommitted += item.totalCommitted;
            acc.totalRemaining += item.totalRemaining;
            return acc;
          },
          { totalAllocated: 0, totalSpent: 0, totalCommitted: 0, totalRemaining: 0 }
        ) && (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('cost.totalBudget')}</p>
                    <p className="text-2xl font-bold mt-2">
                      {formatCurrency(
                        budgetByProject.reduce((sum, item) => sum + item.totalAllocated, 0)
                      )}
                    </p>
                  </div>
                  <DollarSign className="text-primary-600" size={32} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('cost.totalSpent')}</p>
                    <p className="text-2xl font-bold mt-2">
                      {formatCurrency(
                        budgetByProject.reduce((sum, item) => sum + item.totalSpent, 0)
                      )}
                    </p>
                  </div>
                  <TrendingDown className="text-red-600" size={32} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('cost.committed')}</p>
                    <p className="text-2xl font-bold mt-2">
                      {formatCurrency(
                        budgetByProject.reduce((sum, item) => sum + item.totalCommitted, 0)
                      )}
                    </p>
                  </div>
                  <DollarSign className="text-yellow-600" size={32} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('cost.remaining')}</p>
                    <p className="text-2xl font-bold mt-2">
                      {formatCurrency(
                        budgetByProject.reduce((sum, item) => sum + item.totalRemaining, 0)
                      )}
                    </p>
                  </div>
                  <TrendingUp className="text-green-600" size={32} />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('cost.costForecastVsActual')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DynamicChart
            data={forecastChartDataForDynamic}
            dataKey="value"
            height={400}
            defaultType="line"
            name={t('cost.actual')}
          />
        </CardContent>
      </Card>

      {/* Budget by Project */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {budgetByProject.map(({ project, totalAllocated, totalSpent, totalCommitted, totalRemaining, utilization }) => (
          <Card key={project.id}>
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">{t('cost.budgetUtilization')}</span>
                    <span className="font-medium">{utilization.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full">
                    <div
                      className={`h-3 rounded-full ${
                        utilization > 90 ? 'bg-red-600' : utilization > 75 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600">{t('cost.allocated')}</p>
                    <p className="text-lg font-semibold">{formatCurrency(totalAllocated)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('common.spent')}</p>
                    <p className="text-lg font-semibold">{formatCurrency(totalSpent)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('cost.committed')}</p>
                    <p className="text-lg font-semibold">{formatCurrency(totalCommitted)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('common.remaining')}</p>
                    <p className="text-lg font-semibold">{formatCurrency(totalRemaining)}</p>
                  </div>
                </div>

                {/* Budget breakdown by category */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium mb-3">{t('cost.budgetByCategory')}</p>
                  <div className="space-y-2">
                    {budgets
                      .filter((b) => b.projectId === project.id)
                      .map((budget) => (
                        <div key={budget.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{budget.category}</span>
                          <div className="flex items-center gap-4">
                            <span>{formatCurrency(budget.spent)}</span>
                            <span className="text-gray-400">/</span>
                            <span>{formatCurrency(budget.allocated)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CostManagement;




