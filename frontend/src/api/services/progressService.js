/**
 * Progress & BOQ Execution API Service
 * 
 * Provides API calls for:
 * - Project progress metrics
 * - BOQ execution CRUD operations
 * - Verification workflow
 * - Progress history/audit logs
 */
import client from '../client';

const progressService = {
    // ========== PROGRESS METRICS ==========

    /**
     * Get current progress metrics for a project
     * @param {string} projectId 
     */
    getProjectProgress: (projectId) => {
        return client.get(`/finance/progress/project/${projectId}/`);
    },

    /**
     * Manually trigger progress recalculation
     * @param {string} projectId 
     */
    recalculateProgress: (projectId) => {
        return client.post(`/finance/progress/recalculate/${projectId}/`);
    },

    /**
     * Get detailed BOQ progress breakdown
     * @param {string} projectId 
     */
    getBOQBreakdown: (projectId) => {
        return client.get(`/finance/progress/breakdown/${projectId}/`);
    },

    /**
     * Get schedule variance metrics
     * @param {string} projectId 
     */
    getScheduleVariance: (projectId) => {
        return client.get(`/finance/progress/schedule-variance/${projectId}/`);
    },

    /**
     * Get progress calculation history/audit log
     * @param {string} projectId 
     * @param {number} limit 
     */
    getProgressHistory: (projectId, limit = 20) => {
        return client.get(`/finance/progress/history/${projectId}/?limit=${limit}`);
    },

    // ========== BOQ EXECUTIONS ==========

    /**
     * Get all executions for a project
     * @param {Object} filters - { project, boq_item, status }
     */
    getExecutions: (filters = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });
        return client.get(`/finance/executions/?${params.toString()}`);
    },

    /**
     * Get a single execution
     * @param {string} executionId 
     */
    getExecution: (executionId) => {
        return client.get(`/finance/executions/${executionId}/`);
    },

    /**
     * Create new BOQ execution entry
     * @param {Object} data - { boq_item, executed_quantity, execution_date, period_from, period_to, remarks }
     */
    createExecution: (data) => {
        return client.post('/finance/executions/', data);
    },

    /**
     * Update execution (only if DRAFT)
     * @param {string} executionId 
     * @param {Object} data 
     */
    updateExecution: (executionId, data) => {
        return client.put(`/finance/executions/${executionId}/`, data);
    },

    /**
     * Delete execution (only if DRAFT)
     * @param {string} executionId 
     */
    deleteExecution: (executionId) => {
        return client.delete(`/finance/executions/${executionId}/`);
    },

    /**
     * Submit execution for verification
     * @param {string} executionId 
     */
    submitExecution: (executionId) => {
        return client.post(`/finance/executions/${executionId}/submit/`);
    },

    /**
     * Verify execution (admin only)
     * @param {string} executionId 
     */
    verifyExecution: (executionId) => {
        return client.post(`/finance/executions/${executionId}/verify/`);
    },

    /**
     * Reject execution with reason (admin only)
     * @param {string} executionId 
     * @param {string} reason 
     */
    rejectExecution: (executionId, reason) => {
        return client.post(`/finance/executions/${executionId}/reject/`, { reason });
    },

    /**
     * Get pending executions for verification (admin only)
     */
    getPendingExecutions: () => {
        return client.get('/finance/executions/pending/');
    },

    // ========== HELPER METHODS ==========

    /**
     * Calculate progress percentage from BOQ data
     * @param {number} executed 
     * @param {number} sanctioned 
     */
    calculateProgress: (executed, sanctioned) => {
        if (!sanctioned || sanctioned === 0) return 0;
        const progress = (executed / sanctioned) * 100;
        return Math.min(progress, 100); // Cap at 100%
    },

    /**
     * Get progress status based on percentage
     * @param {number} progress 
     */
    getProgressStatus: (progress) => {
        if (progress >= 100) return { label: 'Complete', color: 'bg-green-500' };
        if (progress >= 75) return { label: 'On Track', color: 'bg-blue-500' };
        if (progress >= 50) return { label: 'In Progress', color: 'bg-yellow-500' };
        if (progress > 0) return { label: 'Started', color: 'bg-orange-500' };
        return { label: 'Not Started', color: 'bg-gray-400' };
    },

    /**
     * Get execution status info
     * @param {string} status 
     */
    getExecutionStatusInfo: (status) => {
        const statusMap = {
            DRAFT: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700' },
            SUBMITTED: { label: 'Pending Verification', bg: 'bg-blue-100', text: 'text-blue-700' },
            VERIFIED: { label: 'Verified', bg: 'bg-green-100', text: 'text-green-700' },
            REJECTED: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-700' },
            REVISED: { label: 'Revision Required', bg: 'bg-yellow-100', text: 'text-yellow-700' }
        };
        return statusMap[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-700' };
    }
};

export default progressService;
