import client from '../client';

// Settings are stored in localStorage for now
// In future, this can be connected to a backend API
const SETTINGS_KEY = 'pmis_user_settings';

const settingsService = {
    // Get all settings
    getSettings: () => {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error loading settings:', e);
        }
        return null;
    },

    // Save all settings
    saveSettings: (settings) => {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            return true;
        } catch (e) {
            console.error('Error saving settings:', e);
            return false;
        }
    },

    // Update a single setting
    updateSetting: (key, value) => {
        const current = settingsService.getSettings() || {};
        current[key] = value;
        return settingsService.saveSettings(current);
    },

    // Get default settings
    getDefaultSettings: () => ({
        // Notification Settings
        emailNotifications: true,
        smsNotifications: false,
        inAppNotifications: true,
        approvalAlerts: true,
        deadlineReminders: true,
        paymentNotifications: true,

        // System Settings
        darkMode: false,
        compactView: false,
        showAnimations: true,
        autoLogout: true,
        autoLogoutTime: 30,

        // Security Settings
        twoFactorAuth: false,
        sessionLogging: true,

        // Integration Settings
        nicdcSync: false,
        gisEnabled: false,
        financeMisSync: false,
    }),

    // Get audit logs
    getAuditLogs: (params = {}) => client.get('/audit/logs/', { params }),

    // Get workflow configurations
    getWorkflows: () => client.get('/workflow/configs/').catch(() => ({ data: [] })),

    // Update workflow config
    updateWorkflow: (id, data) => client.patch(`/workflow/configs/${id}/`, data),
};

export default settingsService;
