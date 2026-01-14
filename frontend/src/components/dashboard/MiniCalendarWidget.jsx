import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

/**
 * Mini Calendar Widget
 * Displays current month with milestone dates highlighted
 * Click on dates with milestones to view details
 */
const MiniCalendarWidget = ({ milestones = [], onDateClick }) => {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());

    const today = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Get first day of month and total days
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Convert milestones to date set for quick lookup
    const milestoneDates = new Set(
        milestones
            .filter(m => m.date)
            .map(m => {
                const d = new Date(m.date);
                return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            })
    );

    const hasMilestone = (day) => {
        return milestoneDates.has(`${currentYear}-${currentMonth}-${day}`);
    };

    const isToday = (day) => {
        return today.getDate() === day &&
            today.getMonth() === currentMonth &&
            today.getFullYear() === currentYear;
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    };

    const handleDateClick = (day) => {
        if (hasMilestone(day)) {
            if (onDateClick) {
                onDateClick(new Date(currentYear, currentMonth, day));
            } else {
                navigate('/scheduling');
            }
        }
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    // Generate calendar grid
    const calendarDays = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-slate-200 dark:border-neutral-700 shadow-sm dark:shadow-lg p-5"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 dark:from-white/5 via-transparent to-transparent pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-blue-600 dark:text-indigo-400" />
                    <h3 className="text-md font-semibold text-slate-800 dark:text-white">
                        {monthNames[currentMonth]} {currentYear}
                    </h3>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={prevMonth}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded transition-colors"
                    >
                        <ChevronLeft size={18} className="text-slate-500 dark:text-neutral-400" />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded transition-colors"
                    >
                        <ChevronRight size={18} className="text-slate-500 dark:text-neutral-400" />
                    </button>
                </div>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day, i) => (
                    <div className="text-center text-xs font-medium text-slate-400 dark:text-neutral-500 py-1">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => (
                    <motion.div
                        key={i}
                        whileHover={day && hasMilestone(day) ? { scale: 1.1 } : {}}
                        whileTap={day && hasMilestone(day) ? { scale: 0.95 } : {}}
                        className={`
                            relative aspect-square flex items-center justify-center text-sm rounded-lg
                            ${!day ? '' : 'cursor-pointer'}
                            ${isToday(day) ? 'bg-primary-500 text-white font-bold' : ''}
                            ${hasMilestone(day) && !isToday(day) ? 'bg-amber-100 text-amber-700 font-medium' : ''}
                            ${!isToday(day) && !hasMilestone(day) && day ? 'text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800' : ''}
                        `}
                        onClick={() => day && handleDateClick(day)}
                    >
                        {day}
                        {hasMilestone(day) && (
                            <span className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span className="text-xs text-slate-500 dark:text-neutral-400">Today</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-xs text-slate-500 dark:text-neutral-400">Milestone</span>
                </div>
            </div>
        </motion.div>
    );
};

export default MiniCalendarWidget;
