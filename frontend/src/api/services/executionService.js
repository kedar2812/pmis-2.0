import client from '../client';

const executionService = {
    /**
     * Fetch all daily site logs, with optional filters.
     * @param {Object} params - e.g. { project: id, task: id, date: 'YYYY-MM-DD' }
     */
    getLogs: async (params = {}) => {
        const response = await client.get('/execution/logs/', { params });
        return response.data?.results ?? response.data;
    },

    /**
     * Get a single site log by ID.
     */
    getLog: async (id) => {
        const response = await client.get(`/execution/logs/${id}/`);
        return response.data;
    },

    /**
     * Create a new DailySiteLog.
     * Returns the full log object including the newly assigned `id`.
     * IMPORTANT: call this FIRST, capture the returned id, then call uploadImage.
     *
     * @param {Object} logData - { project, task, achieved_quantity, remarks, latitude, longitude }
     */
    createLog: async (logData) => {
        const response = await client.post('/execution/logs/', logData);
        return response.data; // Contains id, weather fields (server-populated), etc.
    },

    /**
     * Upload a site image.
     * MUST be called AFTER createLog so site_log FK is valid.
     *
     * @param {number|string} logId - The id returned by createLog
     * @param {File}          imageFile
     * @param {boolean}       isPrimary - If true, triggers photo-sync signal
     * @param {string}        caption
     */
    uploadImage: async (logId, imageFile, isPrimary = false, caption = '') => {
        const formData = new FormData();
        formData.append('site_log', logId);
        formData.append('image', imageFile);
        formData.append('is_primary', isPrimary);
        formData.append('caption', caption);
        // client interceptor removes Content-Type for FormData so browser sets boundary
        const response = await client.post('/execution/images/', formData);
        return response.data;
    },

    /**
     * Get tasks for a specific project (used for the Task dropdown).
     * @param {string|number} projectId
     */
    getProjectTasks: async (projectId) => {
        const response = await client.get('/execution/tasks/', {
            params: { project: projectId },
        });
        return response.data?.results ?? response.data;
    },
};

export default executionService;
