/**
 * SortableDataTable - Reusable data table with sorting, filtering, and pagination
 * 
 * Features:
 * - Column sorting (asc/desc with visual indicators)
 * - Inline search filtering
 * - Pagination for large datasets
 * - Dark mode compliant
 * - Mobile responsive
 * - Keyboard accessible
 */
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronUp, ChevronDown, ChevronsUpDown, Search,
    ChevronLeft, ChevronRight, Database
} from 'lucide-react';

// Utility to deep access nested object properties like 'user.name'
const getNestedValue = (obj, path) => {
    if (!path) return undefined;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Sort comparator
const compareValues = (a, b, sortKey, sortDirection) => {
    const valA = getNestedValue(a, sortKey);
    const valB = getNestedValue(b, sortKey);

    // Handle null/undefined
    if (valA == null && valB == null) return 0;
    if (valA == null) return sortDirection === 'asc' ? 1 : -1;
    if (valB == null) return sortDirection === 'asc' ? -1 : 1;

    // Handle dates
    if (valA instanceof Date && valB instanceof Date) {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
    }

    // Handle numbers
    const numA = parseFloat(valA);
    const numB = parseFloat(valB);
    if (!isNaN(numA) && !isNaN(numB)) {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
    }

    // Handle strings (case-insensitive)
    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();

    if (sortDirection === 'asc') {
        return strA.localeCompare(strB);
    }
    return strB.localeCompare(strA);
};

const SortableDataTable = ({
    data = [],
    columns = [],
    title = '',
    className = '',
    emptyMessage = 'No records found',
    emptyIcon: EmptyIcon = Database,
    searchPlaceholder = 'Search...',
    showSearch = true,
    showPagination = true,
    pageSize = 10,
    headerActions = null,
    rowActions = null,
    onRowClick = null,
    defaultSortKey = null,
    defaultSortDirection = 'asc',
    stickyHeader = false,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState(defaultSortKey);
    const [sortDirection, setSortDirection] = useState(defaultSortDirection);
    const [currentPage, setCurrentPage] = useState(1);

    // Handle column header click for sorting
    const handleSort = useCallback((columnKey) => {
        if (sortKey === columnKey) {
            // Toggle direction
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(columnKey);
            setSortDirection('asc');
        }
        setCurrentPage(1); // Reset to first page on sort
    }, [sortKey]);

    // Filter data by search query
    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return data;

        const query = searchQuery.toLowerCase().trim();
        return data.filter(item =>
            columns.some(col => {
                const value = getNestedValue(item, col.key);
                if (value == null) return false;
                return String(value).toLowerCase().includes(query);
            })
        );
    }, [data, columns, searchQuery]);

    // Sort filtered data
    const sortedData = useMemo(() => {
        if (!sortKey) return filteredData;

        return [...filteredData].sort((a, b) =>
            compareValues(a, b, sortKey, sortDirection)
        );
    }, [filteredData, sortKey, sortDirection]);

    // Paginate sorted data
    const paginatedData = useMemo(() => {
        if (!showPagination) return sortedData;

        const startIndex = (currentPage - 1) * pageSize;
        return sortedData.slice(startIndex, startIndex + pageSize);
    }, [sortedData, currentPage, pageSize, showPagination]);

    const totalPages = Math.ceil(sortedData.length / pageSize);

    // Reset to page 1 when search changes
    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    // Render sort indicator
    const renderSortIcon = (columnKey, sortable) => {
        if (!sortable) return null;

        if (sortKey !== columnKey) {
            return <ChevronsUpDown size={14} className="text-slate-300 dark:text-neutral-600 ml-1" />;
        }

        return sortDirection === 'asc'
            ? <ChevronUp size={14} className="text-primary-600 dark:text-blue-400 ml-1" />
            : <ChevronDown size={14} className="text-primary-600 dark:text-blue-400 ml-1" />;
    };

    return (
        <div className={`bg-app-card rounded-xl border border-app-subtle overflow-hidden ${className}`}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-app-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    {title && (
                        <>
                            <h3 className="font-semibold text-app-heading">{title}</h3>
                            <span className="text-xs text-app-muted bg-app-surface px-2 py-0.5 rounded-full">
                                {sortedData.length}
                            </span>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Search */}
                    {showSearch && (
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearch}
                                placeholder={searchPlaceholder}
                                className="w-48 sm:w-56 pl-9 pr-3 py-1.5 text-sm border border-app bg-app-input text-app-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-blue-500"
                            />
                        </div>
                    )}

                    {/* Custom header actions */}
                    {headerActions}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className={`bg-app-surface ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
                        <tr>
                            {columns.map(col => {
                                const isSortable = col.sortable !== false;
                                return (
                                    <th
                                        key={col.key}
                                        className={`text-left px-4 py-3 font-medium text-app-muted ${isSortable ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-700 select-none' : ''
                                            } ${col.className || ''}`}
                                        style={{ width: col.width || 'auto' }}
                                        onClick={() => isSortable && handleSort(col.key)}
                                    >
                                        <div className="flex items-center">
                                            <span>{col.label}</span>
                                            {renderSortIcon(col.key, isSortable)}
                                        </div>
                                    </th>
                                );
                            })}
                            {rowActions && (
                                <th className="text-right px-4 py-3 font-medium text-app-muted w-24">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-app-subtle">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length + (rowActions ? 1 : 0)}
                                    className="text-center py-12 text-app-muted"
                                >
                                    <EmptyIcon size={32} className="mx-auto mb-2 opacity-30" />
                                    <p>{emptyMessage}</p>
                                </td>
                            </tr>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {paginatedData.map((item, idx) => (
                                    <motion.tr
                                        key={item.id || idx}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className={`hover:bg-app-surface transition-colors ${onRowClick ? 'cursor-pointer' : ''
                                            }`}
                                        onClick={() => onRowClick && onRowClick(item)}
                                    >
                                        {columns.map(col => (
                                            <td
                                                key={col.key}
                                                className={`px-4 py-3 text-app-text ${col.cellClassName || ''}`}
                                            >
                                                {col.render
                                                    ? col.render(getNestedValue(item, col.key), item)
                                                    : getNestedValue(item, col.key) ?? '-'
                                                }
                                            </td>
                                        ))}
                                        {rowActions && (
                                            <td className="px-4 py-3 text-right">
                                                {rowActions(item)}
                                            </td>
                                        )}
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {showPagination && totalPages > 1 && (
                <div className="px-4 py-3 border-t border-app-subtle flex items-center justify-between bg-app-surface">
                    <div className="text-sm text-app-muted">
                        Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                        {Math.min(currentPage * pageSize, sortedData.length)} of{' '}
                        {sortedData.length} entries
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-app-muted"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        {/* Page numbers */}
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                                                ? 'bg-primary-600 text-white'
                                                : 'hover:bg-slate-100 dark:hover:bg-neutral-700 text-app-muted'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-app-muted"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SortableDataTable;
