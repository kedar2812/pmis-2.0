const LOG_STORAGE_KEY = 'pmis_audit_logs';

export const AuditLogger = {
    /**
     * Log an action to the audit trail
     * @param {Object} user - The user performing the action
     * @param {string} action - 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc.
     * @param {string} resource - The entity being affected (e.g., 'Project', 'Contractor')
     * @param {string} details - Human readable summary
     * @param {Object} metadata - Optional technical details (e.g., diffs)
     */
    logAction: (user, action, resource, details, metadata = {}) => {
        try {
            const logs = AuditLogger.getLogs();
            const newLog = {
                id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                userId: user ? user.id : 'anonymous',
                userName: user ? user.name : 'System',
                userRole: user ? user.role : 'Unknown',
                action,
                resource,
                details,
                metadata
            };

            // Prepend new log (newest first)
            const updatedLogs = [newLog, ...logs];
            localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(updatedLogs));

            // Console backup for dev visibility
            console.log(`📝 [Audit] ${action} ${resource}: ${details}`, newLog);
        } catch (error) {
            console.error('Failed to save audit log', error);
        }
    },

    /**
     * Retrieve all logs
     * @returns {Array} List of log entries
     */
    getLogs: () => {
        try {
            const stored = localStorage.getItem(LOG_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            return [];
        }
    },

    /**
     * Export logs as CSV
     */
    exportLogs: () => {
        const logs = AuditLogger.getLogs();
        if (!logs.length) return;

        const headers = ['Timestamp', 'User Name', 'Role', 'Action', 'Resource', 'Details'];
        const csvContent = [
            headers.join(','),
            ...logs.map(log => [
                `"${log.timestamp}"`,
                `"${log.userName}"`,
                `"${log.userRole}"`,
                `"${log.action}"`,
                `"${log.resource}"`,
                `"${log.details}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }
};
