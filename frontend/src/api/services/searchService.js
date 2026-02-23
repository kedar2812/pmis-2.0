import client from '@/api/client';

/**
 * Search Service — thin wrapper over the Spotlight Search API.
 *
 * Usage:
 *   import { globalSearch } from '@/api/services/searchService';
 *   const results = await globalSearch('concrete');
 */

export async function globalSearch(query) {
    if (!query || query.length < 2) return [];

    try {
        const response = await client.get('/search/', { params: { q: query.trim() } });
        return response.data.results || [];
    } catch (error) {
        console.error('Spotlight search error:', error);
        return [];
    }
}

export default { globalSearch };
