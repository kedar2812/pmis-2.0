/**
 * EVM (Earned Value Management) API Service
 * 
 * Provides API calls for:
 * - EVM metrics (CPI, SPI, CV, SV, EAC, etc.)
 * - S-Curve chart data
 * - Historical snapshots
 */
import client from '../client';

const evmService = {
    /**
     * Get current EVM metrics for a project
     * @param {string} projectId 
     */
    getMetrics: (projectId) => {
        return client.get(`/finance/evm/metrics/${projectId}/`);
    },

    /**
     * Get S-Curve time-series data for charting
     * @param {string} projectId 
     * @param {Object} options - { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
     */
    getSCurveData: (projectId, options = {}) => {
        const params = new URLSearchParams();
        if (options.start) params.append('start', options.start);
        if (options.end) params.append('end', options.end);
        return client.get(`/finance/evm/s-curve/${projectId}/?${params.toString()}`);
    },

    /**
     * Get EVM snapshot history
     * @param {string} projectId 
     * @param {number} limit 
     */
    getHistory: (projectId, limit = 50) => {
        return client.get(`/finance/evm/history/${projectId}/?limit=${limit}`);
    },

    /**
     * Create EVM snapshot for a project
     * @param {string} projectId 
     */
    createSnapshot: (projectId) => {
        return client.post(`/finance/evm/snapshot/${projectId}/`);
    },

    /**
     * Create EVM snapshots for all projects (admin only)
     */
    createAllSnapshots: () => {
        return client.post('/finance/evm/snapshot-all/');
    },

    // ========== HELPER METHODS ==========

    /**
     * Get status color based on CPI/SPI value
     * @param {number} value 
     */
    getPerformanceColor: (value) => {
        if (value >= 1.0) return { bg: 'bg-green-100', text: 'text-green-700', label: 'Good' };
        if (value >= 0.9) return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Warning' };
        return { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' };
    },

    /**
     * Format currency in Indian notation (Lakhs/Crores)
     * @param {number} value 
     */
    formatIndianCurrency: (value) => {
        if (value >= 10000000) {
            return `₹${(value / 10000000).toFixed(2)} Cr`;
        } else if (value >= 100000) {
            return `₹${(value / 100000).toFixed(2)} L`;
        }
        return `₹${value.toLocaleString('en-IN')}`;
    },

    /**
     * Get variance status
     * @param {number} variance 
     */
    getVarianceStatus: (variance) => {
        if (variance > 0) return { color: 'text-green-600', icon: '↑', label: 'Favorable' };
        if (variance < 0) return { color: 'text-red-600', icon: '↓', label: 'Unfavorable' };
        return { color: 'text-gray-600', icon: '→', label: 'On Target' };
    }
};

export default evmService;
