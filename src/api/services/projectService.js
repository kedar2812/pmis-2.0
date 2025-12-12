import client from '../client';

const projectService = {
    getAllProjects: async () => {
        const response = await client.get('/projects/');
        return response.data;
    },

    getProjectById: async (id) => {
        const response = await client.get(`/projects/${id}/`);
        return response.data;
    },

    createProject: async (projectData) => {
        const response = await client.post('/projects/', projectData);
        return response.data;
    },

    updateProject: async (id, projectData) => {
        const response = await client.put(`/projects/${id}/`, projectData);
        return response.data;
    },

    deleteProject: async (id) => {
        const response = await client.delete(`/projects/${id}/`);
        return response.data;
    }
};

export default projectService;
