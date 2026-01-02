import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
    FolderOpen, FileText, Users, IndianRupee, CheckCircle,
    AlertTriangle, Clock, ArrowRight, Loader2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import dashboardService from '@/api/services/dashboardService';

/**
 * ActivityFeed Component
 * 
 * Displays a real-time activity feed with recent updates from all modules.
 */
const ActivityFeed = ({ limit = 10, showHeader = true, compact = false }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const data = await dashboardService.getActivity(limit);
                setActivities(data.activities);
            } catch (err) {
                console.error('Failed to fetch activities:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchActivities();
    }, [limit]);

    const getIcon = (type) => {
        const icons = {
            project: FolderOpen,
            document: FileText,
            user: Users,
            finance: IndianRupee,
            approval: CheckCircle,
            risk: AlertTriangle,
        };
        return icons[type] || Clock;
    };

    const getColor = (type) => {
        const colors = {
            project: 'bg-blue-100 text-blue-600',
            document: 'bg-green-100 text-green-600',
            user: 'bg-purple-100 text-purple-600',
            finance: 'bg-emerald-100 text-emerald-600',
            approval: 'bg-amber-100 text-amber-600',
            risk: 'bg-red-100 text-red-600',
        };
        return colors[type] || 'bg-slate-100 text-slate-600';
    };

    const formatTimestamp = (timestamp) => {
        try {
            return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
        } catch {
            return 'recently';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                    <Clock className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm">No recent activity</p>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {showHeader && (
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">Recent Activity</h3>
                    <button
                        onClick={() => navigate('/approvals')}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                        View all <ArrowRight size={14} />
                    </button>
                </div>
            )}

            <div className="space-y-3">
                {activities.map((activity, index) => {
                    const Icon = getIcon(activity.type);
                    const colorClass = getColor(activity.type);

                    return (
                        <motion.div
                            key={activity.id || index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer ${compact ? 'p-2' : 'p-3'
                                }`}
                            onClick={() => activity.link && navigate(activity.link)}
                        >
                            <div className={`p-2 rounded-lg ${colorClass}`}>
                                <Icon size={compact ? 14 : 16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`font-medium text-slate-800 truncate ${compact ? 'text-sm' : ''}`}>
                                    {activity.title}
                                </p>
                                {activity.description && !compact && (
                                    <p className="text-sm text-slate-500 truncate">{activity.description}</p>
                                )}
                                <p className="text-xs text-slate-400 mt-1">
                                    {activity.user && <span className="text-slate-600">{activity.user} • </span>}
                                    {formatTimestamp(activity.timestamp)}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default ActivityFeed;
