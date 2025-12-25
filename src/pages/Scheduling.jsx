import React, { useState, useEffect } from 'react';
import { Plus, Filter, Calendar } from 'lucide-react';
import Button from '@/components/ui/Button';
import { GanttChart } from '@/components/scheduling/GanttChart';
import schedulingService from '@/services/schedulingService';
import projectService from '@/services/projectService';
import { toast } from 'sonner';

const Scheduling = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Initial Load
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectService.getAllProjects();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProject(data[0].id);
        loadTasks(data[0].id);
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

  // Quick Add Modal (Inline for now or separate component later)
  const handleSaveTask = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const newTask = {
      name: formData.get('name'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      progress: formData.get('progress'),
      isMilestone: formData.get('isMilestone') === 'on'
    };

    try {
      await schedulingService.createTask(newTask, selectedProject);
      toast.success("Task Created");
      setIsModalOpen(false);
      loadTasks(selectedProject);
    } catch (error) {
      toast.error("Failed to create task");
    }
  };

  return (
    <div className="p-6 h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Schedule</h1>
          <p className="text-slate-500 text-sm">Manage timelines, WBS, and Critical Milestones</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedProject || ''}
            onChange={handleProjectChange}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white">
            <Plus size={18} className="mr-2" /> Add Task
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400">Loading Schedule...</div>
        ) : (
          <GanttChart
            tasks={tasks}
            onTaskClick={(task) => toast.info(`Viewing ${task.name} (${task.progress}%)`)}
          />
        )}
      </div>

      {/* Simple Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96">
            <h2 className="text-lg font-bold mb-4">Add Schedule Task</h2>
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Task Name</label>
                <input name="name" required className="w-full border rounded p-2 text-sm" placeholder="e.g. Excavation Phase 1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Start Date</label>
                  <input name="startDate" type="date" required className="w-full border rounded p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">End Date</label>
                  <input name="endDate" type="date" required className="w-full border rounded p-2 text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" name="isMilestone" id="isMilestone" className="w-4 h-4" />
                <label htmlFor="isMilestone" className="text-sm font-medium">Mark as Milestone Link?</label>
              </div>
              <p className="text-[10px] text-slate-500 ml-6">
                Milestones are required for Budget Allocation.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary-600 text-white">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scheduling;
