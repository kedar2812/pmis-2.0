/**
 * Workflow Engine API Service
 * 
 * Provides frontend API methods for interacting with the 
 * Dynamic Workflow Engine backend.
 */
import client from '../client';

const BASE_URL = '/workflow';

export const workflowService = {
    // ============================================
    // WORKFLOW TEMPLATES
    // ============================================

    /**
     * Get all workflow templates
     */
    getTemplates: async (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.module) params.append('module', filters.module);
        if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
        const response = await client.get(`${BASE_URL}/templates/?${params.toString()}`);
        return response.data;
    },

    /**
     * Get template details with steps
     */
    getTemplate: async (templateId) => {
        const response = await client.get(`${BASE_URL}/templates/${templateId}/`);
        return response.data;
    },

    /**
     * Create a new workflow template
     */
    createTemplate: async (data) => {
        const response = await client.post(`${BASE_URL}/templates/`, data);
        return response.data;
    },

    /**
     * Update a workflow template
     */
    updateTemplate: async (templateId, data) => {
        const response = await client.patch(`${BASE_URL}/templates/${templateId}/`, data);
        return response.data;
    },

    /**
     * Delete a workflow template
     */
    deleteTemplate: async (templateId) => {
        await client.delete(`${BASE_URL}/templates/${templateId}/`);
    },

    /**
     * Add a step to a template
     */
    addStep: async (templateId, stepData) => {
        const response = await client.post(`${BASE_URL}/templates/${templateId}/add_step/`, stepData);
        return response.data;
    },

    /**
     * Reorder steps in a template
     */
    reorderSteps: async (templateId, stepOrder) => {
        const response = await client.post(`${BASE_URL}/templates/${templateId}/reorder_steps/`, {
            step_order: stepOrder
        });
        return response.data;
    },

    // ============================================
    // WORKFLOW STEPS
    // ============================================

    /**
     * Get all steps (optionally filtered by template)
     */
    getSteps: async (templateId = null) => {
        const url = templateId
            ? `${BASE_URL}/steps/?template=${templateId}`
            : `${BASE_URL}/steps/`;
        const response = await client.get(url);
        return response.data;
    },

    /**
     * Update a step
     */
    updateStep: async (stepId, data) => {
        const response = await client.patch(`${BASE_URL}/steps/${stepId}/`, data);
        return response.data;
    },

    /**
     * Delete a step
     */
    deleteStep: async (stepId) => {
        await client.delete(`${BASE_URL}/steps/${stepId}/`);
    },

    // ============================================
    // TRIGGER RULES
    // ============================================

    /**
     * Get all trigger rules
     */
    getRules: async (module = null) => {
        const url = module
            ? `${BASE_URL}/rules/?module=${module}`
            : `${BASE_URL}/rules/`;
        const response = await client.get(url);
        return response.data;
    },

    /**
     * Create a trigger rule
     */
    createRule: async (data) => {
        const response = await client.post(`${BASE_URL}/rules/`, data);
        return response.data;
    },

    /**
     * Update a trigger rule
     */
    updateRule: async (ruleId, data) => {
        const response = await client.patch(`${BASE_URL}/rules/${ruleId}/`, data);
        return response.data;
    },

    /**
     * Delete a trigger rule
     */
    deleteRule: async (ruleId) => {
        await client.delete(`${BASE_URL}/rules/${ruleId}/`);
    },

    // ============================================
    // WORKFLOW INSTANCES (Active Workflows)
    // ============================================

    /**
     * Get all workflow instances
     */
    getInstances: async (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.entity_type) params.append('entity_type', filters.entity_type);
        if (filters.entity_id) params.append('entity_id', filters.entity_id);
        const response = await client.get(`${BASE_URL}/instances/?${params.toString()}`);
        return response.data;
    },

    /**
     * Get instance details
     */
    getInstance: async (instanceId) => {
        const response = await client.get(`${BASE_URL}/instances/${instanceId}/`);
        return response.data;
    },

    /**
     * Get pending approvals for current user
     */
    getPendingForUser: async () => {
        const response = await client.get(`${BASE_URL}/instances/pending/`);
        return response.data;
    },

    /**
     * Start a new workflow for an entity
     */
    startWorkflow: async (entityType, entityId, module = null) => {
        const data = {
            entity_type: entityType,
            entity_id: entityId
        };
        if (module) data.module = module;
        const response = await client.post(`${BASE_URL}/instances/start/`, data);
        return response.data;
    },

    /**
     * Forward workflow to next step
     */
    forward: async (instanceId, remarks = '') => {
        const response = await client.post(`${BASE_URL}/instances/${instanceId}/forward/`, {
            remarks
        });
        return response.data;
    },

    /**
     * Revert workflow to a previous step
     */
    revert: async (instanceId, toStep, remarks = '') => {
        const response = await client.post(`${BASE_URL}/instances/${instanceId}/revert/`, {
            to_step: toStep,
            remarks
        });
        return response.data;
    },

    /**
     * Reject workflow
     */
    reject: async (instanceId, remarks = '') => {
        const response = await client.post(`${BASE_URL}/instances/${instanceId}/reject/`, {
            remarks
        });
        return response.data;
    },

    /**
     * Get workflow history/audit trail
     */
    getHistory: async (instanceId) => {
        const response = await client.get(`${BASE_URL}/instances/${instanceId}/history/`);
        return response.data;
    },

    /**
     * Get TAT (turnaround time) statistics
     */
    getTAT: async (instanceId) => {
        const response = await client.get(`${BASE_URL}/instances/${instanceId}/tat/`);
        return response.data;
    },

    // ============================================
    // DELEGATIONS
    // ============================================

    /**
     * Get delegations given by current user
     */
    getMyDelegations: async () => {
        const response = await client.get(`${BASE_URL}/delegations/my_delegations/`);
        return response.data;
    },

    /**
     * Get delegations received by current user
     */
    getDelegatedToMe: async () => {
        const response = await client.get(`${BASE_URL}/delegations/delegated_to_me/`);
        return response.data;
    },

    /**
     * Create a new delegation
     */
    createDelegation: async (data) => {
        const response = await client.post(`${BASE_URL}/delegations/`, data);
        return response.data;
    },

    /**
     * Update a delegation
     */
    updateDelegation: async (delegationId, data) => {
        const response = await client.patch(`${BASE_URL}/delegations/${delegationId}/`, data);
        return response.data;
    },

    /**
     * Revoke/delete a delegation
     */
    deleteDelegation: async (delegationId) => {
        await client.delete(`${BASE_URL}/delegations/${delegationId}/`);
    },

    // ============================================
    // ENTITY-BASED WORKFLOW ACTIONS (Universal API)
    // ============================================

    /**
     * Get available workflow actions for an entity
     * 
     * @param {string} entityType - Model name (e.g., 'RABill', 'Tender')
     * @param {string} entityId - Document primary key
     * @returns {Object} Permission flags and current step info
     */
    getActionsForEntity: async (entityType, entityId) => {
        try {
            const response = await client.get(`${BASE_URL}/actions/actions/`, {
                params: { entity_type: entityType, entity_id: entityId }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get workflow actions:', error);
            // Return safe defaults on error
            return {
                has_workflow: false,
                can_approve: false,
                can_revert: false,
                can_reject: false,
                current_step_label: null,
                required_role: null,
                workflow_status: null,
                workflow_id: null,
                remarks_required: false
            };
        }
    },

    /**
     * Perform a workflow action on an entity
     * 
     * @param {string} entityType - Model name
     * @param {string} entityId - Document primary key  
     * @param {string} action - 'FORWARD', 'REVERT', or 'REJECT'
     * @param {string} remarks - Optional remarks/comments
     * @param {number} toStep - Target step (required for REVERT)
     * @returns {Object} Action result with success flag and message
     */
    performEntityAction: async (entityType, entityId, action, remarks = '', toStep = null) => {
        const data = {
            entity_type: entityType,
            entity_id: entityId,
            action: action,
            remarks: remarks
        };
        if (toStep !== null) {
            data.to_step = toStep;
        }
        const response = await client.post(`${BASE_URL}/actions/perform-action/`, data);
        return response.data;
    },

    /**
     * Get workflow history for an entity
     * 
     * @param {string} entityType - Model name
     * @param {string} entityId - Document primary key
     * @returns {Object} Workflow history with timeline entries
     */
    getEntityHistory: async (entityType, entityId) => {
        try {
            const response = await client.get(`${BASE_URL}/actions/entity-history/`, {
                params: { entity_type: entityType, entity_id: entityId }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get workflow history:', error);
            return { has_history: false, workflows: [] };
        }
    }
};

// ============================================
// HELPER UTILITIES
// ============================================

/**
 * Workflow module options for dropdowns
 */
export const WORKFLOW_MODULES = [
    { value: 'RA_BILL', label: 'RA Bill' },
    { value: 'TENDER', label: 'Tender' },
    { value: 'DESIGN', label: 'Design Document' },
    { value: 'VARIATION', label: 'Variation Order' },
    { value: 'CONTRACT', label: 'Contract' },
    { value: 'BOQ', label: 'BOQ Item' },
    { value: 'RISK', label: 'Risk' }
];

/**
 * Action type options for workflow steps
 */
export const ACTION_TYPES = [
    { value: 'VERIFY', label: 'Verify & Check' },
    { value: 'RECOMMEND', label: 'Recommend' },
    { value: 'APPROVE', label: 'Approve' },
    { value: 'SANCTION', label: 'Sanction' },
    { value: 'REVIEW', label: 'Review' }
];

/**
 * Role options for workflow steps
 */
export const WORKFLOW_ROLES = [
    { value: 'SPV_Official', label: 'SPV Official' },
    { value: 'PMNC_Team', label: 'PMNC Team' },
    { value: 'EPC_Contractor', label: 'EPC Contractor' },
    { value: 'Consultant_Design', label: 'Design Consultant' },
    { value: 'Govt_Department', label: 'Government Department' },
    { value: 'NICDC_HQ', label: 'NICDC HQ' },
    { value: 'AE', label: 'Assistant Engineer' },
    { value: 'EE', label: 'Executive Engineer' },
    { value: 'SE', label: 'Superintending Engineer' },
    { value: 'CE', label: 'Chief Engineer' },
    { value: 'HOD', label: 'Head of Department' },
    { value: 'DGM', label: 'Deputy General Manager' },
    { value: 'GM', label: 'General Manager' },
    { value: 'MD', label: 'Managing Director' }
];

/**
 * Workflow status colors
 */
export const getStatusColor = (status) => {
    const colors = {
        'PENDING': { bg: 'bg-slate-100', text: 'text-slate-700', dark: 'dark:bg-slate-800 dark:text-slate-300' },
        'IN_PROGRESS': { bg: 'bg-blue-100', text: 'text-blue-700', dark: 'dark:bg-blue-900/30 dark:text-blue-300' },
        'COMPLETED': { bg: 'bg-green-100', text: 'text-green-700', dark: 'dark:bg-green-900/30 dark:text-green-300' },
        'REJECTED': { bg: 'bg-red-100', text: 'text-red-700', dark: 'dark:bg-red-900/30 dark:text-red-300' },
        'REVERTED': { bg: 'bg-amber-100', text: 'text-amber-700', dark: 'dark:bg-amber-900/30 dark:text-amber-300' },
        'CANCELLED': { bg: 'bg-slate-200', text: 'text-slate-600', dark: 'dark:bg-slate-700 dark:text-slate-400' }
    };
    return colors[status] || colors['PENDING'];
};

/**
 * Format workflow progress as percentage
 */
export const formatProgress = (currentStep, totalSteps) => {
    if (!totalSteps || totalSteps === 0) return 0;
    return Math.round((currentStep / totalSteps) * 100);
};

/**
 * Check if workflow is overdue based on SLA deadline
 */
export const isOverdue = (slaDeadline) => {
    if (!slaDeadline) return false;
    return new Date(slaDeadline) < new Date();
};

export default workflowService;
