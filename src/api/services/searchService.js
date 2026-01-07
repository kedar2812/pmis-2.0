/**
 * Search API Service - Frontend integration
 * 
 * Provides methods to interact with the global search backend
 */

import api from '@/api/client';

const searchService = {
    /**
     * Perform global search across all entities
     * 
     * @param {string} query - Search query (minimum 2 characters)
     * @param {Object} options - Search options
     * @param {Array<string>} options.categories - Categories to search (optional)
     * @param {number} options.limit - Results per category (default: 5)
     * @returns {Promise<Object>} Search results
     */
    globalSearch: async (query, options = {}) => {
        const params = new URLSearchParams({
            q: query.trim(),
        });

        if (options.categories && options.categories.length > 0) {
            params.append('categories', options.categories.join(','));
        }

        if (options.limit) {
            params.append('limit', options.limit);
        }

        const response = await api.get(`/search/global/?${params}`);
        console.log('Search API response:', response.data);
        return response.data;
    },

    /**
     * Get search suggestions (autocomplete)
     * 
     * @param {string} query - Partial query
     * @param {number} limit - Maximum suggestions
     * @returns {Promise<Array<string>>} Suggestions
     */
    getSuggestions: async (query, limit = 5) => {
        const params = new URLSearchParams({
            q: query.trim(),
            limit: limit.toString(),
        });

        const response = await api.get(`/search/suggestions/?${params}`);
        return response.data.suggestions || [];
    },

    /**
     * Get recent searches from local storage
     * 
     * @returns {Array<Object>} Recent search history
     */
    getRecentSearches: () => {
        try {
            const recent = localStorage.getItem('pmis_recent_searches');
            return recent ? JSON.parse(recent) : [];
        } catch (error) {
            console.error('Failed to load recent searches:', error);
            return [];
        }
    },

    /**
     * Save a search to recent history
     * 
     * @param {string} query - Search query
     * @param {Object} result - Selected result (optional)
     */
    saveRecentSearch: (query, result = null) => {
        try {
            const recent = searchService.getRecentSearches();

            // Create new entry
            const entry = {
                query: query.trim(),
                result: result,
                timestamp: Date.now(),
            };

            // Remove duplicates
            const filtered = recent.filter(r => r.query !== entry.query);

            // Add new entry at the beginning
            filtered.unshift(entry);

            // Keep only last 10
            const updated = filtered.slice(0, 10);

            localStorage.setItem('pmis_recent_searches', JSON.stringify(updated));
        } catch (error) {
            console.error('Failed to save recent search:', error);
        }
    },

    /**
     * Clear all recent searches
     */
    clearRecentSearches: () => {
        try {
            localStorage.removeItem('pmis_recent_searches');
        } catch (error) {
            console.error('Failed to clear recent searches:', error);
        }
    },
};

export default searchService;
