import apiClient from '@/api/client';

const RECENT_SEARCHES_KEY = 'pmis_recent_searches';
const MAX_RECENT_SEARCHES = 10;

/**
 * Search Service
 * 
 * Handles:
 * - Global search API calls with debouncing
 * - Recent searches in localStorage
 * - Result categorization and formatting
 * - Fuzzy matching for local data
 */
class SearchService {
    /**
     * Perform a global search across all entities
     * @param {string} query - Search query
     * @param {string} filter - Category filter ('all', 'projects', 'documents', etc.)
     * @returns {Promise<Array>} - Array of search results
     */
    async globalSearch(query, filter = 'all') {
        if (!query || query.length < 2) {
            return [];
        }

        try {
            const params = {
                q: query.trim(),
                ...(filter !== 'all' && { category: filter }),
                limit: 20
            };

            const response = await apiClient.get('/api/search/', { params });

            // Format results from API
            const results = this.formatApiResults(response.data.results || []);
            return results;
        } catch (error) {
            console.error('Search API error:', error);

            // If API fails, return empty array (local navigation still works)
            // Could also implement offline search here
            return [];
        }
    }

    /**
     * Search only within a specific category
     * @param {string} query - Search query
     * @param {string} category - Category to search in
     * @returns {Promise<Array>} - Array of search results
     */
    async searchByCategory(query, category) {
        return this.globalSearch(query, category);
    }

    /**
     * Format API results to standard format
     * @param {Array} apiResults - Raw results from API
     * @returns {Array} - Formatted results
     */
    formatApiResults(apiResults) {
        return apiResults.map(result => ({
            id: result.id || `${result.type}-${Date.now()}`,
            title: result.title || result.name,
            description: result.description || result.preview,
            category: this.mapCategory(result.type),
            type: result.type,
            path: result.url || result.path,
            relevanceScore: result.score || 0,
            metadata: {
                status: result.status,
                breadcrumb: result.breadcrumb,
                createdAt: result.created_at,
                updatedAt: result.updated_at,
                author: result.author,
            }
        }));
    }

    /**
     * Map API category types to frontend categories
     * @param {string} apiType - Type from API
     * @returns {string} - Frontend category
     */
    mapCategory(apiType) {
        const categoryMap = {
            'project': 'projects',
            'document': 'documents',
            'file': 'documents',
            'user': 'users',
            'message': 'communications',
            'thread': 'communications',
            'task': 'tasks',
            'schedule': 'tasks',
            'contractor': 'contractors',
            'risk': 'risks',
            'boq': 'boq',
            'billing': 'billing',
            'fund': 'funds',
            'procurement': 'procurement',
        };
        return categoryMap[apiType] || 'other';
    }

    /**
     * Get recent searches from localStorage
     * @returns {Array<string>} - Array of recent search terms
     */
    getRecentSearches() {
        try {
            const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error reading recent searches:', error);
        }
        return [];
    }

    /**
     * Save a search term to recent searches
     * @param {string} query - Search term to save
     */
    saveRecentSearch(query) {
        if (!query || query.trim().length < 2) return;

        try {
            let recent = this.getRecentSearches();

            // Remove if already exists (to move to top)
            recent = recent.filter(term => term.toLowerCase() !== query.toLowerCase().trim());

            // Add to beginning
            recent.unshift(query.trim());

            // Limit to max
            recent = recent.slice(0, MAX_RECENT_SEARCHES);

            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
        } catch (error) {
            console.error('Error saving recent search:', error);
        }
    }

    /**
     * Clear all recent searches
     */
    clearRecentSearches() {
        try {
            localStorage.removeItem(RECENT_SEARCHES_KEY);
        } catch (error) {
            console.error('Error clearing recent searches:', error);
        }
    }

    /**
     * Remove a specific recent search
     * @param {string} query - Search term to remove
     */
    removeRecentSearch(query) {
        try {
            let recent = this.getRecentSearches();
            recent = recent.filter(term => term.toLowerCase() !== query.toLowerCase());
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
        } catch (error) {
            console.error('Error removing recent search:', error);
        }
    }

    /**
     * Simple fuzzy match for typo tolerance
     * Uses trigram-like approach for character matching
     * @param {string} text - Text to search in
     * @param {string} query - Query to match
     * @returns {boolean} - Whether there's a match
     */
    fuzzyMatch(text, query) {
        if (!text || !query) return false;

        const normalizedText = text.toLowerCase().trim();
        const normalizedQuery = query.toLowerCase().trim();

        // Direct substring match
        if (normalizedText.includes(normalizedQuery)) return true;

        // For short queries, require higher match threshold
        if (normalizedQuery.length < 3) {
            return normalizedText.startsWith(normalizedQuery);
        }

        // Count matching characters in sequence
        let matchCount = 0;
        let textIndex = 0;

        for (const char of normalizedQuery) {
            while (textIndex < normalizedText.length) {
                if (normalizedText[textIndex] === char) {
                    matchCount++;
                    textIndex++;
                    break;
                }
                textIndex++;
            }
        }

        // Require at least 70% character match for fuzzy
        return matchCount / normalizedQuery.length >= 0.7;
    }

    /**
     * Calculate similarity score between two strings
     * Higher score = better match
     * @param {string} text - Text to compare
     * @param {string} query - Query to match
     * @returns {number} - Similarity score (0-100)
     */
    getSimilarityScore(text, query) {
        if (!text || !query) return 0;

        const normalizedText = text.toLowerCase().trim();
        const normalizedQuery = query.toLowerCase().trim();

        // Exact match
        if (normalizedText === normalizedQuery) return 100;

        // Starts with query
        if (normalizedText.startsWith(normalizedQuery)) return 90;

        // Contains query
        if (normalizedText.includes(normalizedQuery)) return 70;

        // Fuzzy match
        if (this.fuzzyMatch(text, query)) return 50;

        return 0;
    }
}

// Export singleton instance
export const searchService = new SearchService();
export default searchService;
