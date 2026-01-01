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
    calculateETP: (params) => client.post('/finance/ra-bills/calculate_etp/', params),

    // ========== RA Bills ==========
    getRABills: (params = {}) => client.get('/finance/ra-bills/', { params }),
    getRABill: (id) => client.get(`/finance/ra-bills/${id}/`),
    createRABill: (data) => client.post('/finance/ra-bills/', data),
    updateRABill: (id, data) => client.put(`/finance/ra-bills/${id}/`, data),
    deleteRABill: (id) => client.delete(`/finance/ra-bills/${id}/`),
    verifyRABill: (id) => client.post(`/finance/ra-bills/${id}/verify/`),
    payRABill: (id) => client.post(`/finance/ra-bills/${id}/pay/`),

    // ========== BOQ Items ==========
    getBOQItems: (params = {}) => client.get('/finance/boq-items/', { params }),
    getBOQItem: (id) => client.get(`/finance/boq-items/${id}/`),
    createBOQItem: (data) => client.post('/finance/boq-items/', data),
    updateBOQItem: (id, data) => client.put(`/finance/boq-items/${id}/`, data),
    deleteBOQItem: (id) => client.delete(`/finance/boq-items/${id}/`),
    analyzeFile: (formData) => client.post('/finance/boq-items/analyze_file/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    importFile: (formData) => client.post('/finance/boq-items/import_file/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    requestFreeze: (data) => client.post('/finance/boq-items/request_freeze/', data),
    requestUnfreeze: (data) => client.post('/finance/boq-items/request_unfreeze/', data),

    // ========== Fund Heads ==========
    getFundHeads: () => client.get('/finance/fund-heads/'),
    getFundHead: (id) => client.get(`/finance/fund-heads/${id}/`),
    createFundHead: (data) => client.post('/finance/fund-heads/', data),
    updateFundHead: (id, data) => client.put(`/finance/fund-heads/${id}/`, data),

    // ========== Budget Line Items ==========
    getBudgetItems: (params = {}) => client.get('/finance/budget-items/', { params }),
    createBudgetItem: (data) => client.post('/finance/budget-items/', data),
    updateBudgetItem: (id, data) => client.put(`/finance/budget-items/${id}/`, data),

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
