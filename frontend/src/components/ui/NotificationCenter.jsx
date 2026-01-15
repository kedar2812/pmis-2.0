import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, X, Check, CheckCheck, Trash2,
    FileText, FolderOpen, Users, IndianRupee,
    AlertTriangle, Clock, ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

/**
 * NotificationCenter Component
 * 
 * Dropdown notification center with categorized notifications,
 * mark as read, and navigation to related items.
 */
const NotificationCenter = ({ isOpen, onClose, notifications = [] }) => {
    const navigate = useNavigate();
    const [localNotifications, setLocalNotifications] = useState(notifications);

    useEffect(() => {
        setLocalNotifications(notifications);
    }, [notifications]);

    const unreadCount = localNotifications.filter(n => !n.read).length;

    const markAsRead = useCallback((id) => {
        setLocalNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    }, []);

    const markAllAsRead = useCallback(() => {
        setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const clearAll = useCallback(() => {
        setLocalNotifications([]);
    }, []);

    const handleClick = (notification) => {
        markAsRead(notification.id);
        if (notification.link) {
            navigate(notification.link);
            onClose();
        }
    };

    const getIcon = (type) => {
        const icons = {
            document: FileText,
            project: FolderOpen,
            user: Users,
            finance: IndianRupee,
            alert: AlertTriangle,
            approval: Check,
        };
        return icons[type] || Bell;
    };

    const getIconColor = (type, priority) => {
        if (priority === 'high') return 'bg-red-100 text-red-600';
        if (priority === 'medium') return 'bg-amber-100 text-amber-600';

        const colors = {
            document: 'bg-blue-100 text-blue-600',
            project: 'bg-purple-100 text-purple-600',
            user: 'bg-green-100 text-green-600',
            finance: 'bg-emerald-100 text-emerald-600',
            alert: 'bg-red-100 text-red-600',
            approval: 'bg-amber-100 text-amber-600',
        };
        return colors[type] || 'bg-slate-100 text-slate-600';
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-12 w-96 max-h-[32rem] bg-white dark:bg-neutral-900 rounded-2xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-neutral-700 overflow-hidden z-50"
            >
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-blue-600 dark:text-indigo-400" />
                            <h3 className="font-semibold text-slate-800 dark:text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {localNotifications.length > 0 && (
                                <>
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-xs text-slate-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1"
                                        title="Mark all as read"
                                    >
                                        <CheckCheck size={14} />
                                    </button>
                                    <button
                                        onClick={clearAll}
                                        className="text-xs text-slate-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1"
                                        title="Clear all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </>
                            )}
                            <button
                                onClick={onClose}
                                className="text-slate-400 dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-96 overflow-y-auto">
                    {localNotifications.length === 0 ? (
                        <div className="py-12 text-center">
                            <Bell className="w-10 h-10 text-slate-300 dark:text-neutral-600 mx-auto mb-3" />
                            <p className="text-slate-500 dark:text-neutral-400 text-sm">No notifications</p>
                            <p className="text-slate-400 dark:text-neutral-500 text-xs">You're all caught up!</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-neutral-800">
                            {localNotifications.map((notification, index) => {
                                const Icon = getIcon(notification.type);
                                const iconColor = getIconColor(notification.type, notification.priority);

                                return (
                                    <motion.div
                                        key={notification.id || index}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => handleClick(notification)}
                                        className={`p-4 hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50/30 dark:bg-indigo-900/10' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg ${iconColor}`}>
                                                <Icon size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`text-sm ${!notification.read ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-neutral-300'}`}>
                                                        {notification.title}
                                                    </p>
                                                    {!notification.read && (
                                                        <div className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0 mt-1.5" />
                                                    )}
                                                </div>
                                                {notification.message && (
                                                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                )}
                                                <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1 flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                                                </p>
                                            </div>
                                            {notification.link && (
                                                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-neutral-500 flex-shrink-0" />
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {localNotifications.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800">
                        <button
                            onClick={() => {
                                navigate('/approvals');
                                onClose();
                            }}
                            className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                            View all notifications
                        </button>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

/**
 * NotificationBell Component
 * 
 * Bell icon with unread count badge.
 */
export const NotificationBell = ({ count = 0, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
        >
            <Bell className="w-5 h-5 text-slate-600 dark:text-neutral-300" />
            {count > 0 && (
                <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
                >
                    {count > 9 ? '9+' : count}
                </motion.span>
            )}
        </button>
    );
};

export default NotificationCenter;
