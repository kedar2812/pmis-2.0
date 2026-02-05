import api from '@/api/client';

const projectService = {
    getAllProjects: async () => {
        const response = await api.get('/projects/');
        const data = response.data;
        return data?.results || data || [];
    },

    getProject: async (id) => {
        const response = await api.get(`/projects/${id}/`);
        return response.data;
    },

    // Stubs for future use
    createProject: async (data) => {
        const response = await api.post('/projects/', data);
        return response.data;
    },

    updateProject: async (id, data) => {
        const response = await api.patch(`/projects/${id}/`, data);
        return response.data;
    }
};

export default projectService;
