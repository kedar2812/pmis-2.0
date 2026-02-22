/**
 * Project Calendar Widget
 * 
 * Displays aggregated events from multiple modules in a calendar/list view.
 * Supports milestones, billing, risks, compliance, and workflow events.
 */
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, ChevronLeft, ChevronRight, Clock, AlertTriangle,
    CheckCircle, IndianRupee, Shield, Workflow, CalendarDays,
    Filter, ChevronDown, ExternalLink
} from 'lucide-react';
import { calendarService, EVENT_COLORS, getEventTypeLabel } from '@/api/services/calendarService';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const EventIcon = ({ type, size = 14 }) => {
    const icons = {
        MILESTONE: Calendar,
        BILLING: IndianRupee,
        RISK: AlertTriangle,
        COMPLIANCE: Shield,
        WORKFLOW: Workflow,
        MEETING: CalendarDays
    };
    const Icon = icons[type] || Calendar;
    return <Icon size={size} />;
};

const EventBadge = ({ event, onClick }) => (
    <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => onClick?.(event)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium cursor-pointer truncate ${event.is_overdue
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}
        style={{
            borderLeft: `3px solid ${event.color || EVENT_COLORS[event.type] || '#6b7280'}`,
        }}
        title={event.title}
    >
        <EventIcon type={event.type} size={12} />
        <span className="truncate">{event.title}</span>
    </motion.div>
);

const EventCard = ({ event, onClose }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute z-50 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 w-72 right-0 top-full mt-2"
    >
        <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
                <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${event.color || EVENT_COLORS[event.type]}20` }}
                >
                    <EventIcon type={event.type} size={20} style={{ color: event.color || EVENT_COLORS[event.type] }} />
                </div>
                <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {getEventTypeLabel(event.type)}
                    </span>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">
                        {event.title}
                    </h4>
                </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>

        <div className="space-y-2 text-sm">
            {event.project_name && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Calendar size={14} />
                    <span>{event.project_name}</span>
                </div>
            )}
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <Clock size={14} />
                <span>{new Date(event.start).toLocaleDateString()}</span>
            </div>
            {event.status && (
                <div className="flex items-center gap-2">
                    <CheckCircle size={14} className={event.is_overdue ? 'text-red-500' : 'text-green-500'} />
                    <span className={event.is_overdue ? 'text-red-600' : 'text-gray-600 dark:text-gray-300'}>
                        {event.is_overdue ? 'Overdue' : event.status}
                    </span>
                </div>
            )}
        </div>

        {event.link_url && (
            <a
                href={event.link_url}
                className="mt-3 flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
                View Details <ExternalLink size={12} />
            </a>
        )}
    </motion.div>
);

const CalendarDay = ({ date, events, isToday, isCurrentMonth, onEventClick }) => {
    const dayEvents = events.slice(0, 3);
    const moreCount = events.length - 3;

    return (
        <div className={`min-h-[80px] p-1 border-b border-r border-gray-100 dark:border-slate-700 ${!isCurrentMonth ? 'bg-gray-50 dark:bg-slate-800/50' : ''
            }`}>
            <div className={`text-xs font-medium mb-1 ${isToday
                    ? 'w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center'
                    : isCurrentMonth ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'
                }`}>
                {date.getDate()}
            </div>
            <div className="space-y-0.5">
                {dayEvents.map((event, idx) => (
                    <EventBadge key={event.id || idx} event={event} onClick={onEventClick} />
                ))}
                {moreCount > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                        +{moreCount} more
                    </div>
                )}
            </div>
        </div>
    );
};

const ProjectCalendar = ({ height = 400, showFilters = true }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [view, setView] = useState('month'); // 'month' | 'list'
    const [filters, setFilters] = useState({
        event_types: []
    });
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    // Fetch events when month changes
    useEffect(() => {
        fetchEvents();
    }, [currentDate, filters]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);

            const data = await calendarService.getEvents(
                start.toISOString().split('T')[0],
                end.toISOString().split('T')[0],
                filters
            );
            setEvents(data.events || []);
        } catch (error) {
            console.error('Failed to fetch calendar events:', error);
        } finally {
            setLoading(false);
        }
    };

    // Navigate between months
    const navigate = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    // Generate calendar grid
    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const grid = [];
        const current = new Date(startDate);

        while (current <= lastDay || grid.length < 35) {
            grid.push(new Date(current));
            current.setDate(current.getDate() + 1);
            if (grid.length >= 42) break; // Max 6 weeks
        }

        return grid;
    }, [currentDate]);

    // Group events by date
    const eventsByDate = useMemo(() => {
        const grouped = {};
        events.forEach(event => {
            const dateKey = event.start?.split('T')[0];
            if (dateKey) {
                if (!grouped[dateKey]) grouped[dateKey] = [];
                grouped[dateKey].push(event);
            }
        });
        return grouped;
    }, [events]);

    // Upcoming events for list view
    const upcomingEvents = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return events
            .filter(e => e.start >= today)
            .sort((a, b) => new Date(a.start) - new Date(b.start))
            .slice(0, 10);
    }, [events]);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const eventTypes = ['MILESTONE', 'BILLING', 'RISK', 'COMPLIANCE', 'WORKFLOW'];

    const toggleFilter = (type) => {
        setFilters(prev => {
            const types = prev.event_types.includes(type)
                ? prev.event_types.filter(t => t !== type)
                : [...prev.event_types, type];
            return { ...prev, event_types: types };
        });
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden" style={{ height }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <h3 className="font-semibold text-gray-900 dark:text-white min-w-[140px] text-center">
                        {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h3>
                    <button
                        onClick={() => navigate(1)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300"
                    >
                        <ChevronRight size={18} />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
                    >
                        Today
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
                        <button
                            onClick={() => setView('month')}
                            className={`px-3 py-1 text-xs font-medium rounded ${view === 'month'
                                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            Month
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`px-3 py-1 text-xs font-medium rounded ${view === 'list'
                                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            List
                        </button>
                    </div>

                    {/* Filters */}
                    {showFilters && (
                        <div className="relative">
                            <button
                                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
                            >
                                <Filter size={14} />
                                Filter
                                {filters.event_types.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 text-xs rounded-full">
                                        {filters.event_types.length}
                                    </span>
                                )}
                                <ChevronDown size={14} />
                            </button>

                            <AnimatePresence>
                                {showFilterDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 p-2 min-w-[160px]"
                                    >
                                        {eventTypes.map(type => (
                                            <label
                                                key={type}
                                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 rounded cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={filters.event_types.length === 0 || filters.event_types.includes(type)}
                                                    onChange={() => toggleFilter(type)}
                                                    className="rounded text-primary-600"
                                                />
                                                <div className="w-3 h-3 rounded" style={{ backgroundColor: EVENT_COLORS[type] }} />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {getEventTypeLabel(type)}
                                                </span>
                                            </label>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* Calendar/List Content */}
            <div className="overflow-auto" style={{ height: height - 60 }}>
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
                    </div>
                ) : view === 'month' ? (
                    <>
                        {/* Day Headers */}
                        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-slate-700">
                            {DAYS.map(day => (
                                <div key={day} className="py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7">
                            {calendarGrid.map((date, idx) => {
                                const dateStr = date.toISOString().split('T')[0];
                                const dayEvents = eventsByDate[dateStr] || [];
                                const isToday = dateStr === todayStr;
                                const isCurrentMonth = date.getMonth() === currentDate.getMonth();

                                return (
                                    <CalendarDay
                                        key={idx}
                                        date={date}
                                        events={dayEvents}
                                        isToday={isToday}
                                        isCurrentMonth={isCurrentMonth}
                                        onEventClick={setSelectedEvent}
                                    />
                                );
                            })}
                        </div>
                    </>
                ) : (
                    /* List View */
                    <div className="p-4 space-y-3">
                        {upcomingEvents.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <CalendarDays size={40} className="mx-auto mb-2 opacity-50" />
                                <p>No upcoming events</p>
                            </div>
                        ) : (
                            upcomingEvents.map(event => (
                                <div
                                    key={event.id}
                                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                                    onClick={() => setSelectedEvent(event)}
                                >
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                        style={{ backgroundColor: `${event.color || EVENT_COLORS[event.type]}20` }}
                                    >
                                        <EventIcon
                                            type={event.type}
                                            size={18}
                                            style={{ color: event.color || EVENT_COLORS[event.type] }}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                            {event.title}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                            <span>{new Date(event.start).toLocaleDateString()}</span>
                                            {event.project_name && (
                                                <>
                                                    <span>•</span>
                                                    <span className="truncate">{event.project_name}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {event.is_overdue && (
                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs font-medium rounded">
                                            Overdue
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Event Detail Popup */}
            <AnimatePresence>
                {selectedEvent && (
                    <div className="fixed inset-0 z-50" onClick={() => setSelectedEvent(null)}>
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute top-1/4 left-1/2 -translate-x-1/2" onClick={e => e.stopPropagation()}>
                            <EventCard event={selectedEvent} onClose={() => setSelectedEvent(null)} />
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProjectCalendar;
