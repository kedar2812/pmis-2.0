/**
 * Service for IFSC code validation and bank lookup
 * Uses our self-hosted IFSC database - NO external API dependencies
 * Government-grade security and privacy
 */
import client from './client';

/**
 * Fetch list of all banks for dropdown
 * @returns {Promise<string[]>} Array of bank names
 */
export const fetchBankList = async () => {
    try {
        const response = await client.get('/banks/list/');
        return response.data.banks || [];
    } catch (error) {
        console.error('Failed to fetch bank list:', error);
        throw new Error('Unable to load bank list');
    }
};

/**
 * Validate IFSC code and fetch branch details
 * @param {string} ifscCode - 11-character IFSC code
 * @returns {Promise<Object>} Branch details
 */
export const fetchIFSCDetails = async (ifscCode) => {
    // Validate format locally first
    if (!isValidIFSCFormat(ifscCode)) {
        throw new Error('Invalid IFSC format. Expected: ABCD0123456');
    }

    try {
        const response = await client.get(`/banks/ifsc/${ifscCode.toUpperCase()}/`);
        return response.data;
    } catch (error) {
        if (error.response?.status === 404) {
            throw new Error('IFSC code not found in database');
        }
        if (error.response?.status === 400) {
            throw new Error(error.response.data.message || 'Invalid IFSC code');
        }
        console.error('IFSC lookup failed:', error);
        throw new Error('Failed to verify IFSC code');
    }
};

/**
 * Validate IFSC code format
 * Format: ABCD0123456 (4 letters, 0, then 6 alphanumeric)
 * @param {string} ifsc - IFSC code to validate
 * @returns {boolean} Whether format is valid
 */
export const isValidIFSCFormat = (ifsc) => {
    if (!ifsc) return false;
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase());
};

/**
 * Get IFSC statistics (admin only)
 * @returns {Promise<Object>} Database statistics
 */
export const getIFSCStats = async () => {
    try {
        const response = await client.get('/banks/stats/');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch IFSC stats:', error);
        throw error;
    }
};
