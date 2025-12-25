import api from '@/api/client';

const schedulingService = {
    getTasks: async (projectId) => {
        const response = await api.get('/scheduling/tasks/', { params: { project: projectId } });
        return response.data.map(transformTaskToFrontend);
    },

    createTask: async (data, projectId) => {
        const payload = transformTaskToBackend(data, projectId);
        const response = await api.post('/scheduling/tasks/', payload);
        return transformTaskToFrontend(response.data);
    },

    updateTask: async (id, data, projectId) => {
        const payload = transformTaskToBackend(data, projectId);
        const response = await api.patch(`/scheduling/tasks/${id}/`, payload);
        return transformTaskToFrontend(response.data);
    },

    deleteTask: async (id) => {
        await api.delete(`/scheduling/tasks/${id}/`);
    }
};

const transformTaskToBackend = (data, pId) => ({
    project: pId,
    name: data.name,
    start_date: data.startDate,
    end_date: data.endDate,
    progress: data.progress || 0,
    is_milestone: data.isMilestone || false,
    status: data.status || 'PLANNED'
});

const transformTaskToFrontend = (data) => ({
    id: data.id,
    name: data.name,
    startDate: data.start_date,
    endDate: data.end_date,
    progress: data.progress,
    isMilestone: data.is_milestone,
    status: data.status,
    project: data.project
});

export default schedulingService;
