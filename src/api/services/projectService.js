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
    },

    // Work Packages
    getPackages: async (projectId) => {
        const response = await client.get(`/projects/packages/?project=${projectId}`);
        return response.data;
    },

    getWorkPackages: async () => {
        const response = await client.get('/projects/packages/');
        return response;
    },

    createPackage: async (packageData) => {
        const response = await client.post('/projects/packages/', packageData);
        return response.data;
    },

    createWorkPackage: async (packageData) => {
        const response = await client.post('/projects/packages/', packageData);
        return response.data;
    },

    updatePackage: async (id, packageData) => {
        const response = await client.put(`/projects/packages/${id}/`, packageData);
        return response.data;
    },

    deletePackage: async (id) => {
        const response = await client.delete(`/projects/packages/${id}/`);
        return response.data;
    }
};

export default projectService;

