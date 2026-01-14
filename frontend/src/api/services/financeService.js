import client from '../client';

/**
 * Finance Service
 * 
 * Handles billing, ETP calculations, and financial operations.
 */
const financeService = {
    // ========== ETP Calculations ==========

    /**
     * Calculate ETP deductions for a bill
     * @param {Object} params - Calculation parameters
     * @param {number} params.gross_amount - Gross bill value
     * @param {number} params.gst_percentage - GST percentage (default 18)
     * @param {number} params.retention_percentage - Security deposit percentage
     * @param {number} params.other_deductions - Manual deductions
     * @param {number} params.advances_recovery - Advance recovery amount
     * @param {number} params.works_component - Optional works component
     * @param {number} params.material_cost - Optional material cost
     * @param {number} params.labour_cost - Optional labour cost
     * @returns {Promise} Complete bill summary with all calculated charges
     */
    calculateETP: (params) => client.post('/finance/bills/calculate_etp/', params),

    // ========== RA Bills ==========
    getRABills: (params = {}) => client.get('/finance/bills/', { params }),
    getRABill: (id) => client.get(`/finance/bills/${id}/`),
    createBill: (data) => client.post('/finance/bills/', data),
    updateBill: (id, data) => client.put(`/finance/bills/${id}/`, data),
    deleteBill: (id) => client.delete(`/finance/bills/${id}/`),
    verifyBill: (id) => client.post(`/finance/bills/${id}/verify/`),
    payBill: (id) => client.post(`/finance/bills/${id}/pay/`),

    // ========== BOQ Items ==========
    getBOQItems: (params = {}) => client.get('/finance/boq/', { params }),
    getBOQItem: (id) => client.get(`/finance/boq/${id}/`),
    createBOQItem: (data) => client.post('/finance/boq/', data),
    updateBOQItem: (id, data) => client.put(`/finance/boq/${id}/`, data),
    deleteBOQItem: (id) => client.delete(`/finance/boq/${id}/`),
    analyzeFile: (formData) => client.post('/finance/boq/analyze_file/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    importFile: (formData) => client.post('/finance/boq/import_file/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    requestFreeze: (data) => client.post('/finance/boq/request_freeze/', data),
    requestUnfreeze: (data) => client.post('/finance/boq/request_unfreeze/', data),

    // ========== Fund Heads ==========
    getFundHeads: () => client.get('/finance/funds/'),
    getFundHead: (id) => client.get(`/finance/funds/${id}/`),
    createFundHead: (data) => client.post('/finance/funds/', data),
    updateFundHead: (id, data) => client.put(`/finance/funds/${id}/`, data),

    // ========== Budget Line Items ==========
    getBudgetItems: (params = {}) => client.get('/finance/budgets/', { params }),
    createBudgetItem: (data) => client.post('/finance/budgets/', data),
    updateBudgetItem: (id, data) => client.put(`/finance/budgets/${id}/`, data),

    // ========== Schedule Tasks (for milestone linking) ==========
    getScheduleTasks: (projectId) => client.get(`/scheduling/tasks/`, { params: { project: projectId } }),

    // ========== Active ETP Charges ==========
    getActiveEtpCharges: () => client.get('/masters/etp-charges/'),

    // ========== Approval Requests ==========
    getApprovalRequests: (params = {}) => client.get('/finance/approval-requests/', { params }),
    getPendingApprovals: () => client.get('/finance/approval-requests/pending/'),
    approveRequest: (id, notes = '') => client.post(`/finance/approval-requests/${id}/approve/`, { notes }),
    rejectRequest: (id, notes = '') => client.post(`/finance/approval-requests/${id}/reject/`, { notes }),

    // ========== Notifications ==========
    getNotifications: () => client.get('/finance/notifications/'),
    getUnreadCount: () => client.get('/finance/notifications/unread_count/'),
    markRead: (id) => client.post(`/finance/notifications/${id}/mark_read/`),
    markAllRead: () => client.post('/finance/notifications/mark_all_read/'),
};

export default financeService;
