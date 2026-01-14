import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Search,
    LayoutDashboard,
    Briefcase,
    FileText,
    Users,
    MessageSquare,
    Calendar,
    X
} from 'lucide-react';

// Filter categories configuration
const FILTER_CATEGORIES = [
    { id: 'all', label: 'All', icon: Search },
    { id: 'pages', label: 'Pages', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'communications', label: 'Messages', icon: MessageSquare },
    { id: 'tasks', label: 'Tasks', icon: Calendar },
];

/**
 * SearchFilters - Category filter pills for search results
 * 
 * Props:
 * - activeFilter: string - Currently active filter ID
 * - onFilterChange: (filterId: string) => void
 * - resultCounts?: { [category]: number } - Optional counts per category
 */
const SearchFilters = memo(({ activeFilter, onFilterChange, resultCounts = {} }) => {
    return (
        <motion.div
            className="flex flex-wrap gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
        >
            {FILTER_CATEGORIES.map((filter) => {
                const Icon = filter.icon;
                const count = resultCounts[filter.id];
                const isActive = activeFilter === filter.id;

                return (
                    <motion.button
                        key={filter.id}
                        onClick={() => onFilterChange(filter.id)}
                        className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-150
              ${isActive
                                ? 'bg-primary-100 text-primary-700 border border-primary-200 shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }
            `}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Icon size={14} />
                        <span>{filter.label}</span>
                        {count !== undefined && count > 0 && (
                            <span className={`
                ml-1 px-1.5 py-0.5 text-xs rounded-full
                ${isActive
                                    ? 'bg-primary-200 text-primary-800'
                                    : 'bg-slate-100 text-slate-500'
                                }
              `}>
                                {count > 99 ? '99+' : count}
                            </span>
                        )}
                    </motion.button>
                );
            })}
        </motion.div>
    );
});

SearchFilters.displayName = 'SearchFilters';

export default SearchFilters;
