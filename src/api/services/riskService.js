/**
 * Risk Management API Service
 * 
 * Provides API calls for:
 * - Risk CRUD operations
 * - Risk document management
 * - Mitigation action workflow
 * - Risk statistics
 */
import client from '../client';

const riskService = {
    // ========== RISK CRUD ==========

    /**
     * Get all risks with optional filters
     * @param {Object} filters - { project, status, severity, category, owner, overdue }
     */
    getRisks: (filters = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });
        return client.get(`/projects/risks/?${params.toString()}`);
    },

    /**
     * Get risks for a specific project
     * @param {string} projectId 
     */
    getProjectRisks: (projectId) => {
        return client.get(`/projects/${projectId}/risks/`);
    },

    /**
     * Get single risk details
     * @param {string} riskId 
     */
    getRisk: (riskId) => {
        return client.get(`/projects/risks/${riskId}/`);
    },

    /**
     * Create new risk
     * @param {Object} data 
     */
    createRisk: (data) => {
        return client.post('/projects/risks/', data);
    },

    /**
     * Update risk
     * @param {string} riskId 
     * @param {Object} data 
     */
    updateRisk: (riskId, data) => {
        return client.put(`/projects/risks/${riskId}/`, data);
    },

    /**
     * Partial update risk
     * @param {string} riskId 
     * @param {Object} data 
     */
    patchRisk: (riskId, data) => {
        return client.patch(`/projects/risks/${riskId}/`, data);
    },

    /**
     * Delete risk (soft delete)
     * @param {string} riskId 
     */
    deleteRisk: (riskId) => {
        return client.delete(`/projects/risks/${riskId}/`);
    },

    // ========== RISK STATISTICS ==========

    /**
     * Get aggregated risk statistics for dashboard
     */
    getRiskStats: () => {
        return client.get('/projects/risks/stats/');
    },

    /**
     * Get audit log for a risk
     * @param {string} riskId 
     */
    getRiskAuditLog: (riskId) => {
        return client.get(`/projects/risks/${riskId}/audit_log/`);
    },

    // ========== RISK DOCUMENTS ==========

    /**
     * Get documents attached to a risk
     * @param {string} riskId 
     */
    getRiskDocuments: (riskId) => {
        return client.get(`/projects/risks/${riskId}/documents/`);
    },

    /**
     * Attach document to risk
     * @param {string} riskId 
     * @param {Object} data - { document, document_type, notes }
     */
    addRiskDocument: (riskId, data) => {
        return client.post(`/projects/risks/${riskId}/documents/`, data);
    },

    /**
     * Remove document from risk
     * @param {string} riskId 
     * @param {string} documentId 
     */
    removeRiskDocument: (riskId, documentId) => {
        return client.delete(`/projects/risks/${riskId}/documents/${documentId}/`);
    },

    // ========== MITIGATION ACTIONS ==========

    /**
     * Get mitigation actions for a risk
     * @param {string} riskId 
     */
    getMitigationActions: (riskId) => {
        return client.get(`/projects/risks/${riskId}/mitigations/`);
    },

    /**
     * Get single mitigation action details
     * @param {string} riskId 
     * @param {string} actionId 
     */
    getMitigationAction: (riskId, actionId) => {
        return client.get(`/projects/risks/${riskId}/mitigations/${actionId}/`);
    },

    /**
     * Create mitigation action
     * @param {string} riskId 
     * @param {Object} data 
     */
    createMitigationAction: (riskId, data) => {
        return client.post(`/projects/risks/${riskId}/mitigations/`, data);
    },

    /**
     * Update mitigation action
     * @param {string} riskId 
     * @param {string} actionId 
     * @param {Object} data 
     */
    updateMitigationAction: (riskId, actionId, data) => {
        return client.put(`/projects/risks/${riskId}/mitigations/${actionId}/`, data);
    },

    /**
     * Submit mitigation action for review
     * @param {string} riskId 
     * @param {string} actionId 
     */
    submitMitigationAction: (riskId, actionId) => {
        return client.post(`/projects/risks/${riskId}/mitigations/${actionId}/submit/`);
    },

    /**
     * Approve or reject mitigation action
     * @param {string} riskId 
     * @param {string} actionId 
     * @param {Object} data - { action: 'approve'|'reject', comments: string }
     */
    reviewMitigationAction: (riskId, actionId, data) => {
        return client.post(`/projects/risks/${riskId}/mitigations/${actionId}/review/`, data);
    },

    // ========== MITIGATION PROOF DOCUMENTS ==========

    /**
     * Get proof documents for a mitigation action
     * @param {string} riskId 
     * @param {string} actionId 
     */
    getMitigationProofs: (riskId, actionId) => {
        return client.get(`/projects/risks/${riskId}/mitigations/${actionId}/proofs/`);
    },

    /**
     * Upload proof document for mitigation action
     * @param {string} riskId 
     * @param {string} actionId 
     * @param {FormData} formData 
     */
    uploadMitigationProof: (riskId, actionId, formData) => {
        return client.post(
            `/projects/risks/${riskId}/mitigations/${actionId}/proofs/`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
    },

    // ========== HELPER CONSTANTS ==========

    CATEGORIES: [
        { value: 'TECHNICAL', label: 'Technical' },
        { value: 'FINANCIAL', label: 'Financial' },
        { value: 'CONTRACTUAL', label: 'Contractual' },
        { value: 'ENVIRONMENTAL', label: 'Environmental' },
        { value: 'SAFETY', label: 'Safety' },
        { value: 'POLITICAL', label: 'Political' },
        { value: 'LEGAL', label: 'Legal' },
        { value: 'OPERATIONAL', label: 'Operational' },
        { value: 'SCHEDULE', label: 'Schedule/Timeline' },
        { value: 'RESOURCE', label: 'Resource/Manpower' },
        { value: 'OTHER', label: 'Other' }
    ],

    PROBABILITIES: [
        { value: 1, label: 'Very Low (Rare)' },
        { value: 2, label: 'Low (Unlikely)' },
        { value: 3, label: 'Medium (Possible)' },
        { value: 4, label: 'High (Likely)' },
        { value: 5, label: 'Very High (Almost Certain)' }
    ],

    IMPACTS: [
        { value: 1, label: 'Negligible' },
        { value: 2, label: 'Minor' },
        { value: 3, label: 'Moderate' },
        { value: 4, label: 'Major' },
        { value: 5, label: 'Critical' }
    ],

    STATUSES: [
        { value: 'IDENTIFIED', label: 'Identified' },
        { value: 'ASSESSED', label: 'Assessed' },
        { value: 'MITIGATING', label: 'Mitigating' },
        { value: 'MITIGATED', label: 'Mitigated' },
        { value: 'CLOSED', label: 'Closed' },
        { value: 'OCCURRED', label: 'Occurred' },
        { value: 'ACCEPTED', label: 'Accepted' }
    ],

    RESPONSE_STRATEGIES: [
        { value: 'AVOID', label: 'Avoid' },
        { value: 'MITIGATE', label: 'Mitigate' },
        { value: 'TRANSFER', label: 'Transfer' },
        { value: 'ACCEPT', label: 'Accept' },
        { value: 'ESCALATE', label: 'Escalate' }
    ],

    ACTION_TYPES: [
        { value: 'PREVENTIVE', label: 'Preventive Action' },
        { value: 'CORRECTIVE', label: 'Corrective Action' },
        { value: 'DETECTIVE', label: 'Detective Control' },
        { value: 'CONTINGENCY', label: 'Contingency Measure' },
        { value: 'TRANSFER', label: 'Risk Transfer (Insurance/Contract)' },
        { value: 'ACCEPTANCE', label: 'Risk Acceptance with Justification' }
    ],

    DOCUMENT_TYPES: [
        { value: 'EVIDENCE', label: 'Evidence/Proof' },
        { value: 'ASSESSMENT', label: 'Risk Assessment Report' },
        { value: 'MITIGATION_PLAN', label: 'Mitigation Plan' },
        { value: 'MITIGATION_PROOF', label: 'Mitigation Action Proof' },
        { value: 'CLOSURE_REPORT', label: 'Closure Report' },
        { value: 'INSURANCE', label: 'Insurance Claim' },
        { value: 'MEETING_NOTES', label: 'Meeting Notes' },
        { value: 'CORRESPONDENCE', label: 'Correspondence' },
        { value: 'INCIDENT_REPORT', label: 'Incident Report' },
        { value: 'OTHER', label: 'Other' }
    ],

    /**
     * Get severity color classes
     * @param {string} severity 
     */
    getSeverityColor: (severity) => {
        switch (severity) {
            case 'CRITICAL':
                return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
            case 'HIGH':
                return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' };
            case 'MEDIUM':
                return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
            case 'LOW':
                return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
            default:
                return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
        }
    },

    /**
     * Get status color classes
     * @param {string} status 
     */
    getStatusColor: (status) => {
        switch (status) {
            case 'IDENTIFIED':
                return { bg: 'bg-blue-100', text: 'text-blue-800' };
            case 'ASSESSED':
                return { bg: 'bg-purple-100', text: 'text-purple-800' };
            case 'MITIGATING':
                return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
            case 'MITIGATED':
                return { bg: 'bg-green-100', text: 'text-green-800' };
            case 'CLOSED':
                return { bg: 'bg-gray-100', text: 'text-gray-600' };
            case 'OCCURRED':
                return { bg: 'bg-red-100', text: 'text-red-800' };
            case 'ACCEPTED':
                return { bg: 'bg-teal-100', text: 'text-teal-800' };
            default:
                return { bg: 'bg-gray-100', text: 'text-gray-800' };
        }
    },

    /**
     * Calculate risk score from probability and impact
     * @param {number} probability 
     * @param {number} impact 
     */
    calculateRiskScore: (probability, impact) => {
        return probability * impact;
    },

    /**
     * Get severity from risk score
     * @param {number} score 
     */
    getSeverityFromScore: (score) => {
        if (score >= 16) return 'CRITICAL';
        if (score >= 10) return 'HIGH';
        if (score >= 5) return 'MEDIUM';
        return 'LOW';
    }
};

export default riskService;
