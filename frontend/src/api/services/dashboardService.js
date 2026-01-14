import client from '../client';

/**
 * Dashboard Service
 * 
 * Provides API endpoints for dashboard statistics and activity feed.
 */

const dashboardService = {
    /**
     * Get aggregated dashboard statistics
     * Returns: KPIs, financial summary, project stats, pending approvals, recent activity
     */
    getStats: async () => {
        const response = await client.get('/projects/dashboard/stats/');
        return response.data;
    },

    /**
     * Get recent activity feed
     * @param {number} limit - Maximum number of activities to return
     */
    getActivity: async (limit = 20) => {
        const response = await client.get('/projects/dashboard/activity/', {
            params: { limit }
        });
        return response.data;
    },

    /**
     * Get project status distribution for charts
     */
    getProjectDistribution: async () => {
        const stats = await dashboardService.getStats();
        return [
            { name: 'In Progress', value: stats.project_stats.in_progress, color: '#3b82f6' },
            { name: 'Planning', value: stats.project_stats.planning, color: '#f59e0b' },
            { name: 'Completed', value: stats.project_stats.completed, color: '#10b981' },
            { name: 'On Hold', value: stats.project_stats.on_hold, color: '#6b7280' },
        ].filter(item => item.value > 0);
    },

    /**
     * Get financial summary for charts
     */
    getFinancialSummary: async () => {
        const stats = await dashboardService.getStats();
        return {
            budget: stats.financial_summary.total_budget,
            spent: stats.financial_summary.total_spent,
            remaining: stats.financial_summary.remaining,
            utilization: stats.financial_summary.utilization,
        };
    },
};

export default dashboardService;
