import React from 'react';
import { motion } from 'framer-motion';
import {
    FolderOpen, FileText, User, IndianRupee, Gavel, FileSignature,
    Building2, CheckSquare, Flag, MessageSquare, Folder, ListOrdered
} from 'lucide-react';

// Icon mapping for categories
const CATEGORY_ICONS = {
    projects: FolderOpen,
    documents: FileText,
    folders: Folder,
    users: User,
    bills: IndianRupee,
    boq_items: ListOrdered,
    tenders: Gavel,
    contracts: FileSignature,
    contractors: Building2,
    tasks: CheckSquare,
    milestones: Flag,
    threads: MessageSquare,
};

/**
 * Individual search result item component
 *  
 * @param {Object} props
 * @param {Object} props.result - Search result object
 * @param {boolean} props.isSelected - Whether item is selected via keyboard
 * @param {boolean} props.isHovered - Whether item is hovered
 * @param {Function} props.onClick - Click handler
 * @param {Function} props.onMouseEnter - Mouse enter handler
 * @returns {JSX.Element}
 */
const SearchResultItem = ({
    result,
    isSelected = false,
    isHovered = false,
    onClick,
    onMouseEnter
}) => {
    const Icon = CATEGORY_ICONS[result.category] || FileText;
    const isActive = isSelected || isHovered;

    // Format metadata based on category
    const formatMetadata = () => {
        const { metadata } = result;
        if (!metadata) return null;

        if (metadata.status) {
            const statusColors = {
                'In Progress': 'text-blue-600',
                'Completed': 'text-green-600',
                'Planning': 'text-amber-600',
                'On Hold': 'text-gray-600',
                'Pending': 'text-amber-600',
                'verified': 'text-green-600',
                'draft': 'text-gray-600',
            };
            const color = statusColors[metadata.status] || 'text-gray-600';
            return (
                <span className={`text-xs font-medium ${color}`}>
                    {metadata.status}
                </span>
            );
        }

        if (metadata.progress !== undefined) {
            return (
                <span className="text-xs text-gray-500">
                    {metadata.progress}% complete
                </span>
            );
        }

        if (metadata.amount) {
            return (
                <span className="text-xs font-medium text-emerald-600">
                    ₹{(metadata.amount / 100000).toFixed(2)}L
                </span>
            );
        }

        return null;
    };

    return (
        <motion.div
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className={`
                px-4 py-3 flex items-center gap-3 cursor-pointer
                transition-all duration-150
                ${isActive
                    ? 'bg-primary-50 border-l-4 border-primary-500'
                    : 'border-l-4 border-transparent hover:bg-slate-50'
                }
            `}
        >
            {/* Icon */}
            <div className={`
                p-2 rounded-lg transition-colors
                ${isActive ? 'bg-primary-100' : 'bg-slate-100'}
            `}>
                <Icon
                    size={16}
                    className={isActive ? 'text-primary-600' : 'text-slate-600'}
                />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className={`
                        text-sm font-medium truncate
                        ${isActive ? 'text-primary-900' : 'text-slate-900'}
                    `}>
                        {result.title}
                    </p>
                    {formatMetadata()}
                </div>
                {result.subtitle && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                        {result.subtitle}
                    </p>
                )}
            </div>

            {/* Keyboard hint */}
            {isSelected && !isHovered && (
                <kbd className="px-2 py-1 text-xs font-semibold text-primary-600 bg-primary-100 rounded">
                    ↵
                </kbd>
            )}
        </motion.div>
    );
};

export default SearchResultItem;
