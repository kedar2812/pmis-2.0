import React, { useState, useEffect } from 'react';
import { Plus, Filter, Calendar, FileUp } from 'lucide-react';
import Button from '@/components/ui/Button';
import { GanttChart } from '@/components/scheduling/GanttChart';
import ImportScheduleModal from '@/components/scheduling/ImportScheduleModal';
import schedulingService from '@/services/schedulingService';
import projectService from '@/api/services/projectService';
import { toast } from 'sonner';
import AddScheduleTaskModal from '@/components/scheduling/AddScheduleTaskModal';

const Scheduling = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Initial Load
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectService.getAllProjects();
      // getAllProjects already extracts results, so data is always an array
      const projectsArray = Array.isArray(data) ? data : [];
      setProjects(projectsArray);
      if (projectsArray.length > 0) {
        setSelectedProject(projectsArray[0].id);
        loadTasks(projectsArray[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load projects");
    }
  };

  const loadTasks = async (projectId) => {
    setLoading(true);
    try {
      const data = await schedulingService.getTasks(projectId);
      setTasks(data);
    } catch (error) {
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (e) => {
    const pid = e.target.value;
    setSelectedProject(pid);
    loadTasks(pid);
  };



  return (
    <div className="p-6 h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-app-heading">Project Schedule</h1>
          <p className="text-app-muted text-sm">Manage timelines, WBS, and Critical Milestones</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedProject || ''}
            onChange={handleProjectChange}
            className="px-3 py-2 border border-app rounded-lg text-sm bg-app-input text-app-text"
          >
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Button
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 sm:flex-none min-h-[44px]"
          >
            <FileUp size={18} className="mr-2" />
            <span className="hidden sm:inline">Import Schedule</span>
            <span className="sm:hidden">Import</span>
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white">
            <Plus size={18} className="mr-2" /> Add Task
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center text-app-muted">Loading Schedule...</div>
        ) : (
          <GanttChart
            tasks={tasks}
            onTaskClick={(task) => toast.info(`Viewing ${task.name} (${task.progress}%)`)}
          />
        )}
      </div>

      {/* Add Schedule Task Modal */}
      <AddScheduleTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectId={selectedProject}
        onTaskCreated={() => loadTasks(selectedProject)}
      />

      {/* Import Schedule Modal */}
      {isImportModalOpen && selectedProject && (
        <ImportScheduleModal
          projectId={selectedProject}
          onClose={() => setIsImportModalOpen(false)}
          onImported={() => loadTasks(selectedProject)}
        />
      )}
    </div>
  );
};

export default Scheduling;
