import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useMockData } from '@/hooks/useMockData';
import { Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { projects } from '@/mock';

const Scheduling = () => {
  const { t } = useLanguage();
  const { tasks, toggleTaskComplete, updateTask } = useMockData();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="text-green-600" size={18} />;
      case 'In Progress':
        return <Clock className="text-blue-600" size={18} />;
      case 'Delayed':
        return <AlertCircle className="text-red-600" size={18} />;
      default:
        return <Calendar className="text-gray-600" size={18} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Delayed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-800';
      case 'High':
        return 'bg-orange-100 text-orange-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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

  const handleTaskToggle = async (taskId: string) => {
    try {
      await toggleTaskComplete(taskId);
      toast.success('Task updated', {
        description: 'Task status has been updated.',
      });
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const isCriticalPath = (task: typeof tasks[0]) => {
    return task.priority === 'Critical' && task.status !== 'Completed';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('common.schedule')}</h1>
        <p className="text-gray-600 mt-1">Project Scheduling and Timeline Tracking</p>
      </div>

      {/* Gantt Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Gantt Chart View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            <div className="text-center">
              <Calendar size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Gantt Chart Visualization</p>
              <p className="text-sm text-gray-500 mt-2">
                Interactive Gantt chart with critical path analysis will be displayed here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks by Project */}
      {tasksByProject.map(({ project, tasks: projectTasks, progress: projectProgress }) => (
        <Card key={project.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{project.name}</CardTitle>
                <p className="text-sm text-gray-600 mt-1">{project.description}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Project Progress</p>
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
                        ? 'bg-red-50 border-red-200'
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
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                                Critical Path
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Start: {new Date(task.startDate).toLocaleDateString()}</span>
                            <span>End: {new Date(task.endDate).toLocaleDateString()}</span>
                            <span>Assigned: {task.assignedTo}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}
                        >
                          {task.priority}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}
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
                            className={`h-2 rounded-full ${
                              task.progress === 100 ? 'bg-green-600' : 'bg-primary-600'
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
      ))}
    </div>
  );
};

export default Scheduling;

