import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    FileText,
    Users,
    FolderOpen,
    Calendar,
    MessageSquare,
    Building2,
    LayoutDashboard,
    ChevronRight,
    Briefcase,
    Receipt,
    Map,
    Box,
    Workflow,
    CreditCard,
    Shield,
    Settings,
    CheckCircle2,
    BookOpen,
    ArrowRight
} from 'lucide-react';

// Icon map for different result types
const ICON_MAP = {
    page: LayoutDashboard,
    pages: LayoutDashboard,
    project: Briefcase,
    projects: Briefcase,
    document: FileText,
    documents: FileText,
    user: Users,
    users: Users,
    message: MessageSquare,
    communications: MessageSquare,
    task: Calendar,
    tasks: Calendar,
    contractor: Building2,
    contractors: Building2,
    approval: CheckCircle2,
    approvals: CheckCircle2,
    default: FileText,
};

// Category color map
const CATEGORY_COLORS = {
    pages: 'bg-blue-100 text-blue-600',
    projects: 'bg-emerald-100 text-emerald-600',
    documents: 'bg-amber-100 text-amber-600',
    users: 'bg-purple-100 text-purple-600',
    communications: 'bg-pink-100 text-pink-600',
    tasks: 'bg-cyan-100 text-cyan-600',
    contractors: 'bg-orange-100 text-orange-600',
    default: 'bg-slate-100 text-slate-600',
};

/**
 * Highlights matching text in the title
 */
const highlightMatch = (text, query) => {
    if (!query || !text) return text;

    const normalizedQuery = query.toLowerCase().trim();
    const normalizedText = text.toLowerCase();
    const index = normalizedText.indexOf(normalizedQuery);

    if (index === -1) return text;

    return (
        <>
            {text.slice(0, index)}
            <mark className="bg-primary-100 text-primary-700 rounded px-0.5">
                {text.slice(index, index + query.length)}
            </mark>
            {text.slice(index + query.length)}
        </>
    );
};

/**
 * SearchResultItem - Individual search result with icon, title, description
 * 
 * Props:
 * - result: { id, title, description, category, path, icon?, metadata? }
 * - isSelected: boolean - Currently selected via keyboard
 * - onClick: () => void
 * - query: string - Search query for highlighting
 */
const SearchResultItem = memo(({ result, isSelected, onClick, query }) => {
    // Get icon component
    const IconComponent = useMemo(() => {
        if (result.icon) return result.icon;
        return ICON_MAP[result.type] || ICON_MAP[result.category] || ICON_MAP.default;
    }, [result.icon, result.type, result.category]);

    // Get category color
    const categoryColor = useMemo(() => {
        return CATEGORY_COLORS[result.category] || CATEGORY_COLORS.default;
    }, [result.category]);

    return (
        <motion.button
            onClick={onClick}
            className={`
        w-full flex items-center gap-3 px-4 py-3 text-left
        transition-all duration-150 group
        ${isSelected
                    ? 'bg-primary-50 border-l-2 border-l-primary-500'
                    : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                }
      `}
            initial={false}
            animate={{
                backgroundColor: isSelected ? 'rgb(239 246 255)' : 'transparent'
            }}
            transition={{ duration: 0.1 }}
        >
            {/* Icon */}
            <div className={`
        flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
        transition-colors duration-150
        ${isSelected ? 'bg-primary-100' : categoryColor}
      `}>
                <IconComponent
                    size={18}
                    className={isSelected ? 'text-primary-600' : ''}
                />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`
            font-medium text-sm truncate
            ${isSelected ? 'text-primary-900' : 'text-slate-800'}
          `}>
                        {highlightMatch(result.title, query)}
                    </span>
                    {result.metadata?.status && (
                        <span className={`
              text-xs px-2 py-0.5 rounded-full
              ${result.metadata.status === 'active' ? 'bg-green-100 text-green-700' :
                                result.metadata.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-slate-100 text-slate-600'}
            `}>
                            {result.metadata.status}
                        </span>
                    )}
                </div>
                {result.description && (
                    <p className={`
            text-xs truncate mt-0.5
            ${isSelected ? 'text-primary-600' : 'text-slate-500'}
          `}>
                        {result.description}
                    </p>
                )}
                {result.metadata?.breadcrumb && (
                    <p className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1">
                        {result.metadata.breadcrumb.map((crumb, i) => (
                            <span key={i} className="flex items-center">
                                {i > 0 && <ChevronRight size={10} className="mx-0.5" />}
                                {crumb}
                            </span>
                        ))}
                    </p>
                )}
            </div>

            {/* Arrow indicator */}
            <div className={`
        flex-shrink-0 transition-all duration-150
        ${isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
      `}>
                <ArrowRight size={16} className="text-primary-500" />
            </div>
        </motion.button>
    );
});

SearchResultItem.displayName = 'SearchResultItem';

export default SearchResultItem;
