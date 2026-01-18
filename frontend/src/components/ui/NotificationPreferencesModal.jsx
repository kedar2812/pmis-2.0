/**
 * NotificationPreferencesModal - Allows users to configure notification preferences
 * 
 * Features:
 * - List of notification types with toggle switches
 * - Save/Cancel buttons
 * - Cancel restores original settings
 * - Dark mode compliant
 * - Mobile responsive
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, BellOff, Settings } from 'lucide-react';
import Button from '@/components/ui/Button';

// Notification types with default enabled status
const NOTIFICATION_TYPES = [
    { id: 'new_message', label: 'New Messages', description: 'When you receive a new message', defaultEnabled: true },
    { id: 'thread_mention', label: 'Thread Mentions', description: 'When someone mentions you in a thread', defaultEnabled: true },
    { id: 'project_update', label: 'Project Updates', description: 'When a project you are assigned to is updated', defaultEnabled: true },
    { id: 'task_assigned', label: 'Task Assignments', description: 'When a task is assigned to you', defaultEnabled: true },
    { id: 'document_upload', label: 'Document Uploads', description: 'When new documents are uploaded', defaultEnabled: false },
    { id: 'approval_request', label: 'Approval Requests', description: 'When you have pending approvals', defaultEnabled: true },
    { id: 'deadline_reminder', label: 'Deadline Reminders', description: 'Reminders for upcoming deadlines', defaultEnabled: true },
    { id: 'risk_alert', label: 'Risk Alerts', description: 'High-priority risk notifications', defaultEnabled: true },
    { id: 'system_update', label: 'System Updates', description: 'System maintenance and updates', defaultEnabled: false },
];

const STORAGE_KEY = 'pmis_notification_preferences';

const NotificationPreferencesModal = ({ isOpen, onClose }) => {
    const [preferences, setPreferences] = useState({});
    const [originalPreferences, setOriginalPreferences] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // Load preferences from localStorage on mount
    useEffect(() => {
        if (isOpen) {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                const loadedPrefs = stored ? JSON.parse(stored) : {};

                // Merge with defaults (for any new notification types)
                const mergedPrefs = {};
                NOTIFICATION_TYPES.forEach((type) => {
                    mergedPrefs[type.id] = loadedPrefs[type.id] !== undefined
                        ? loadedPrefs[type.id]
                        : type.defaultEnabled;
                });

                setPreferences(mergedPrefs);
                setOriginalPreferences({ ...mergedPrefs });
            } catch (error) {
                console.error('Error loading notification preferences:', error);
                // Fall back to defaults
                const defaultPrefs = {};
                NOTIFICATION_TYPES.forEach((type) => {
                    defaultPrefs[type.id] = type.defaultEnabled;
                });
                setPreferences(defaultPrefs);
                setOriginalPreferences({ ...defaultPrefs });
            }
        }
    }, [isOpen]);

    const handleToggle = (id) => {
        setPreferences(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Save to localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

            // TODO: Optionally send to backend API
            // await apiClient.post('/api/users/notification-preferences/', preferences);

            onClose();
        } catch (error) {
            console.error('Error saving preferences:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // Restore original preferences - don't save anything
        setPreferences({ ...originalPreferences });
        onClose();
    };

    const hasChanges = JSON.stringify(preferences) !== JSON.stringify(originalPreferences);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
                onClick={handleCancel}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', duration: 0.3 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-neutral-700"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800">
                        <div className="flex items-center gap-2">
                            <Settings size={20} className="text-primary-600 dark:text-blue-400" />
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                                Notification Preferences
                            </h2>
                        </div>
                        <button
                            onClick={handleCancel}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-700 rounded-lg transition-colors text-slate-500 dark:text-neutral-400"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <p className="text-sm text-slate-500 dark:text-neutral-400 mb-4">
                            Choose which notifications you want to receive
                        </p>

                        {NOTIFICATION_TYPES.map((type) => (
                            <div
                                key={type.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors"
                            >
                                <div className="flex-1 min-w-0 pr-3">
                                    <div className="flex items-center gap-2">
                                        {preferences[type.id] ? (
                                            <Bell size={16} className="text-primary-600 dark:text-blue-400 flex-shrink-0" />
                                        ) : (
                                            <BellOff size={16} className="text-slate-400 dark:text-neutral-500 flex-shrink-0" />
                                        )}
                                        <span className="font-medium text-slate-800 dark:text-white text-sm">
                                            {type.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 pl-6">
                                        {type.description}
                                    </p>
                                </div>

                                {/* Toggle Switch */}
                                <button
                                    onClick={() => handleToggle(type.id)}
                                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${preferences[type.id]
                                            ? 'bg-primary-600 dark:bg-blue-500'
                                            : 'bg-slate-300 dark:bg-neutral-600'
                                        }`}
                                    role="switch"
                                    aria-checked={preferences[type.id]}
                                >
                                    <motion.div
                                        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
                                        animate={{
                                            x: preferences[type.id] ? 20 : 0
                                        }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800">
                        <Button
                            variant="ghost"
                            onClick={handleCancel}
                            className="px-4"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!hasChanges || isSaving}
                            className="px-4"
                        >
                            {isSaving ? 'Saving...' : 'Save Preferences'}
                        </Button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default NotificationPreferencesModal;
