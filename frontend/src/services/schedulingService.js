import api from '@/api/client';

const schedulingService = {
    getTasks: async (projectId) => {
        const response = await api.get('/scheduling/tasks/', { params: { project: projectId } });
        return response.data.map(transformTaskToFrontend);
    },

    createTask: async (data, projectId) => {
        const payload = transformTaskToBackend(data, projectId);
        // Use FormData to support potential file uploads or backend expectations
        const formData = new FormData();
        Object.keys(payload).forEach(key => {
            formData.append(key, payload[key]);
        });
        const response = await api.post('/scheduling/tasks/', formData);
        return transformTaskToFrontend(response.data);
    },

    updateTask: async (id, data, projectId) => {
        const payload = transformTaskToBackend(data, projectId);
        const response = await api.patch(`/scheduling/tasks/${id}/`, payload);
        return transformTaskToFrontend(response.data);
    },

    deleteTask: async (id) => {
        await api.delete(`/scheduling/tasks/${id}/`);
    },

    /**
     * Analyze uploaded schedule file and return headers for column mapping.
     * Supports: .xlsx (Excel), .xml (MS Project), .xer (Primavera P6)
     * @param {File} file - The schedule file to analyze
     * @returns {Promise<{headers: string[], filename: string}>}
     */
    analyzeFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/scheduling/tasks/analyze_file/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000, // 30s timeout for large files
        });
        return response.data;
    },

    /**
     * Import schedule data from file using the provided column mapping.
     * @param {File} file - The schedule file to import
     * @param {string} projectId - Target project UUID
     * @param {Object} mapping - Column mapping { dbField: fileHeader }
     * @param {Function} onProgress - Optional progress callback
     * @returns {Promise<{status: string, created: number, updated: number}>}
     */
    importFile: async (file, projectId, mapping, onProgress = null) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', projectId);
        formData.append('mapping', JSON.stringify(mapping));

        const config = {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000, // 2min timeout for large imports
        };

        if (onProgress) {
            config.onUploadProgress = (progressEvent) => {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percent);
            };
        }

        const response = await api.post('/scheduling/tasks/import_file/', formData, config);
        return response.data;
    },

    /**
     * Get only milestone tasks (for budget/billing linkage)
     */
    getMilestones: async (projectId) => {
        const response = await api.get('/scheduling/tasks/', {
            params: { project: projectId }
        });
        return response.data
            .filter(t => t.is_milestone)
            .map(transformTaskToFrontend);
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
