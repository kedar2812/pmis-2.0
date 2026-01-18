/**
 * Calendar API Service
 */
import client from '../client';

export const calendarService = {
    /**
     * Get calendar events within date range
     */
    getEvents: async (startDate, endDate, filters = {}) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start', startDate);
        if (endDate) params.append('end', endDate);
        if (filters.event_types?.length) params.append('event_types', filters.event_types.join(','));
        if (filters.projects?.length) params.append('projects', filters.projects.join(','));

        const response = await client.get(`/projects/dashboard/calendar/?${params.toString()}`);
        return response.data;
    },

    /**
     * Get upcoming events (next 7 days)
     */
    getUpcoming: async (days = 7) => {
        const start = new Date().toISOString().split('T')[0];
        const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        return calendarService.getEvents(start, end);
    }
};

/**
 * Event type colors
 */
export const EVENT_COLORS = {
    MILESTONE: '#3b82f6',
    BILLING: '#10b981',
    RISK: '#ef4444',
    COMPLIANCE: '#f97316',
    WORKFLOW: '#8b5cf6',
    MEETING: '#06b6d4'
};

/**
 * Get event type label
 */
export const getEventTypeLabel = (type) => {
    const labels = {
        MILESTONE: 'Milestone',
        BILLING: 'Billing',
        RISK: 'Risk',
        COMPLIANCE: 'Compliance',
        WORKFLOW: 'Approval',
        MEETING: 'Meeting'
    };
    return labels[type] || type;
};

export default calendarService;
