import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { projects, kpis, risks, tasks } from '@/mock';
import {
  LineChart,
  Line,
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
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleKPIClick = (kpi: typeof kpis[0]) => {
    if (kpi.category === 'Risk') {
      navigate('/risk');
      toast.info('Navigating to Risk Management', {
        description: 'Viewing risk details and mitigation plans.',
      });
    }
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

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const upcomingTasks = tasks
    .filter((task) => task.status === 'In Progress' || task.status === 'Not Started')
    .slice(0, 5);

  const activeRisks = risks.filter((risk) => risk.status !== 'Closed').slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-600 mt-1">{t('dashboard.overview')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.slice(0, 4).map((kpi) => {
          const isPositive = kpi.trend === 'up' || (kpi.trend === 'stable' && kpi.value >= kpi.target);
          const isClickable = kpi.category === 'Risk';
          return (
            <motion.div
              key={kpi.id}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`transition-all duration-200 ${
                  isClickable
                    ? 'cursor-pointer hover:shadow-lg hover:border-primary-600'
                    : ''
                }`}
                onClick={() => isClickable && handleKPIClick(kpi)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{kpi.name}</p>
                      <p className="text-2xl font-bold mt-2">
                        {kpi.value} {kpi.unit}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Target: {kpi.target} {kpi.unit}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
                      {isPositive ? (
                        <TrendingUp className="text-green-600" size={24} />
                      ) : (
                        <TrendingDown className="text-red-600" size={24} />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recentProjects')} - Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectProgressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="progress" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Budget vs Spent Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Budget vs Spent (in Crores)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px',
                  }}
                  formatter={(value: number) => [`₹${value.toFixed(2)} Cr`, '']}
                  labelFormatter={(label) => `Project: ${label}`}
                />
                <Legend />
                <Bar dataKey="budget" fill="#94a3b8" name="Budget" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" fill="#3b82f6" name="Spent" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution and Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.activeRisks')} - Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={projects.map((p) => ({ name: p.name.substring(0, 15), progress: p.progress }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="progress" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects and Active Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recentProjects')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projects.slice(0, 5).map((project) => (
                <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{project.name}</p>
                    <p className="text-xs text-gray-600">{project.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{project.progress}%</p>
                    <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
                      <div
                        className="h-2 bg-primary-600 rounded-full"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Risks */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.activeRisks')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeRisks.map((risk) => {
                const impactColors: Record<string, string> = {
                  Low: 'bg-green-100 text-green-800',
                  Medium: 'bg-yellow-100 text-yellow-800',
                  High: 'bg-orange-100 text-orange-800',
                  Critical: 'bg-red-100 text-red-800',
                };

                return (
                  <div key={risk.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{risk.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{risk.category}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${impactColors[risk.impact]}`}
                      >
                        {risk.impact}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.upcomingTasks')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{task.name}</p>
                  <p className="text-sm text-gray-600">
                    {task.startDate} - {task.endDate}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">{task.progress}%</span>
                  <span
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      task.status === 'Completed'
                        ? 'bg-green-100 text-green-800'
                        : task.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

