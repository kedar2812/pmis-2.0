import client from '../client';

const procurementService = {
    // ========== Tenders ==========
    getTenders: async (params = {}) => {
        const response = await client.get('/procurement/tenders/', { params });
        return response.data;
    },

    getTender: async (id) => {
        const response = await client.get(`/procurement/tenders/${id}/`);
        return response.data;
    },

    createTender: async (data) => {
        const response = await client.post('/procurement/tenders/', data);
        return response.data;
    },

    updateTender: async (id, data) => {
        const response = await client.put(`/procurement/tenders/${id}/`, data);
        return response.data;
    },

    deleteTender: async (id) => {
        const response = await client.delete(`/procurement/tenders/${id}/`);
        return response.data;
    },

    // Tender Actions
    publishTender: async (id) => {
        const response = await client.post(`/procurement/tenders/${id}/publish/`);
        return response.data;
    },

    openBids: async (id) => {
        const response = await client.post(`/procurement/tenders/${id}/open_bids/`);
        return response.data;
    },

    startEvaluation: async (id) => {
        const response = await client.post(`/procurement/tenders/${id}/start_evaluation/`);
        return response.data;
    },

    awardTender: async (id, winningBidId) => {
        const response = await client.post(`/procurement/tenders/${id}/award/`, { winning_bid_id: winningBidId });
        return response.data;
    },

    getTenderBids: async (tenderId) => {
        const response = await client.get(`/procurement/tenders/${tenderId}/bids/`);
        return response.data;
    },

    // ========== Bids ==========
    getBids: async (params = {}) => {
        const response = await client.get('/procurement/bids/', { params });
        return response.data;
    },

    createBid: async (data) => {
        const response = await client.post('/procurement/bids/', data);
        return response.data;
    },

    evaluateBid: async (id, scores) => {
        const response = await client.post(`/procurement/bids/${id}/evaluate/`, scores);
        return response.data;
    },

    qualifyBid: async (id) => {
        const response = await client.post(`/procurement/bids/${id}/qualify/`);
        return response.data;
    },

    disqualifyBid: async (id, reason) => {
        const response = await client.post(`/procurement/bids/${id}/disqualify/`, { reason });
        return response.data;
    },

    // ========== Contracts ==========
    getContracts: async (params = {}) => {
        const response = await client.get('/procurement/contracts/', { params });
        return response.data;
    },

    getContract: async (id) => {
        const response = await client.get(`/procurement/contracts/${id}/`);
        return response.data;
    },

    createContract: async (data) => {
        const response = await client.post('/procurement/contracts/', data);
        return response.data;
    },

    updateContract: async (id, data) => {
        const response = await client.put(`/procurement/contracts/${id}/`, data);
        return response.data;
    },

    // Contract Actions
    signContract: async (id, signingDate) => {
        const response = await client.post(`/procurement/contracts/${id}/sign/`, { signing_date: signingDate });
        return response.data;
    },

    activateContract: async (id) => {
        const response = await client.post(`/procurement/contracts/${id}/activate/`);
        return response.data;
    },

    completeContract: async (id) => {
        const response = await client.post(`/procurement/contracts/${id}/complete/`);
        return response.data;
    },

    getContractVariations: async (contractId) => {
        const response = await client.get(`/procurement/contracts/${contractId}/variations/`);
        return response.data;
    },

    getContractsSummary: async () => {
        const response = await client.get('/procurement/contracts/summary/');
        return response.data;
    },

    // ========== Variations ==========
    getVariations: async (params = {}) => {
        const response = await client.get('/procurement/variations/', { params });
        return response.data;
    },

    createVariation: async (data) => {
        const response = await client.post('/procurement/variations/', data);
        return response.data;
    },

    approveVariation: async (id) => {
        const response = await client.post(`/procurement/variations/${id}/approve/`);
        return response.data;
    },

    rejectVariation: async (id) => {
        const response = await client.post(`/procurement/variations/${id}/reject/`);
        return response.data;
    },
};

export default procurementService;
