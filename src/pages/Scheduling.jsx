import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useMockData } from '@/hooks/useMockData';
import { Calendar, CheckCircle, Clock, AlertCircle, List, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { projects } from '@/mock';
import { getStatusColor, getPriorityColor } from '@/lib/colors';
import { GanttChart } from '@/components/scheduling/GanttChart';
import Button from '@/components/ui/Button';

const Scheduling = () => {
  const { t } = useLanguage();
  const { tasks, toggleTaskComplete } = useMockData();
  const [viewMode, setViewMode] = useState('gantt');
  const [selectedProjectId, setSelectedProjectId] = useState(undefined);

  const getStatusIcon = (status) => {
    const statusColors = getStatusColor(status);
    switch (status) {
      case 'Completed':
        return <CheckCircle className={statusColors.icon} size={18} />;
      case 'In Progress':
        return <Clock className={statusColors.icon} size={18} />;
      case 'Delayed':
        return <AlertCircle className={statusColors.icon} size={18} />;
      default:
        return <Calendar className={statusColors.icon} size={18} />;
    }
  };

  const getStatusBadgeColor = (status) => {
    const statusColors = getStatusColor(status);
    return `${statusColors.bg} ${statusColors.text}`;
  };

  const getPriorityBadgeColor = (priority) => {
    const priorityColors = getPriorityColor(priority);
    return `${priorityColors.bg} ${priorityColors.text}`;
  };

  // Group tasks by project
  const tasksByProject = projects.map((project) => {
    const projectTasks = tasks.filter((task) => task.projectId === project.id);
    const completedTasks = projectTasks.filter((t) => t.status === 'Completed').length;
    const totalTasks = projectTasks.length;
    const projectProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      project,
      tasks: projectTasks,
      progress: projectProgress,
    };
  });

  const handleTaskToggle = async (taskId) => {
    try {
      await toggleTaskComplete(taskId);
      toast.success(t('scheduling.taskUpdated'), {
        description: t('scheduling.taskStatusUpdated'),
      });
    } catch (error) {
      toast.error(t('scheduling.failedToUpdate'));
    }
  };

  const isCriticalPath = (task) => {
    return task.priority === 'Critical' && task.status !== 'Completed';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('common.schedule')}</h1>
          <p className="text-gray-600 mt-1">{t('scheduling.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'gantt' ? 'default' : 'outline'}
            onClick={() => setViewMode('gantt')}
          >
            <BarChart3 size={18} />
            {t('scheduling.ganttChart')}
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
          >
            <List size={18} />
            {t('scheduling.listView')}
          </Button>
        </div>
      </div>

      {/* Project Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">{t('scheduling.filterByProject')}</label>
            <select
              value={selectedProjectId || 'all'}
              onChange={(e) => setSelectedProjectId(e.target.value === 'all' ? undefined : e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
            >
              <option value="all">{t('common.allProjects')}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Gantt Chart View */}
      {viewMode === 'gantt' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('scheduling.ganttChartView')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[600px]">
              <GanttChart
                projects={projects}
                tasks={tasks}
                selectedProjectId={selectedProjectId}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {viewMode === 'list' &&
        tasksByProject
          .filter(({ project }) => !selectedProjectId || project.id === selectedProjectId)
          .map(({ project, tasks: projectTasks, progress: projectProgress }) => (
            <Card key={project.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{project.name}</CardTitle>
                <p className="text-sm text-gray-600 mt-1">{project.description}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{t('scheduling.projectProgress')}</p>
                <p className="text-2xl font-bold text-primary-600">{projectProgress.toFixed(0)}%</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projectTasks.map((task) => {
                const isCritical = isCriticalPath(task);
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isCritical
                        ? 'bg-error-50 border-error-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={task.status === 'Completed'}
                          onChange={() => handleTaskToggle(task.id)}
                          className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 cursor-pointer"
                          aria-label={`Mark ${task.name} as ${task.status === 'Completed' ? 'incomplete' : 'complete'}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(task.status)}
                            <h3 className="font-medium">{task.name}</h3>
                            {isCritical && (
                              <span className="px-2 py-1 bg-error-50 text-error-700 rounded text-xs font-medium border border-error-200">
                                {t('scheduling.criticalPath')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{t('scheduling.start')}: {new Date(task.startDate).toLocaleDateString()}</span>
                            <span>{t('scheduling.end')}: {new Date(task.endDate).toLocaleDateString()}</span>
                            <span>{t('scheduling.assigned')}: {task.assignedTo}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getPriorityBadgeColor(task.priority)}`}
                        >
                          {task.priority}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(task.status)}`}
                        >
                          {task.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">{t('common.progress')}</span>
                          <span className="font-medium">{task.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${task.progress}%` }}
                            transition={{ duration: 0.5 }}
                            className={`h-2 rounded-full transition-all ${
                              task.progress === 100 ? 'bg-success-600' : 'bg-primary-600'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
            </Card>
          ))
      }
    </div>
  );
};

export default Scheduling;




