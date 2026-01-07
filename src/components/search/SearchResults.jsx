import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Inbox } from 'lucide-react';
import SearchResultItem from './SearchResultItem';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

/**
 * Search results dropdown component
 * Displays categorized search results with keyboard navigation
 * 
 * @param {Object} props
 * @param {Object} props.searchResults - Search results from API
 * @param {boolean} props.isLoading - Loading state
 * @param {boolean} props.isOpen - Whether dropdown is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.query - Search query
 * @returns {JSX.Element}
 */
const SearchResults = ({
    searchResults,
    isLoading = false,
    isOpen = false,
    onClose,
    query = ''
}) => {
    const navigate = useNavigate();

    // Flatten all results for keyboard navigation
    const allResults = useMemo(() => {
        if (!searchResults || !searchResults.categories) return [];

        const results = [];
        Object.entries(searchResults.categories).forEach(([categoryKey, categoryData]) => {
            categoryData.results.forEach(result => {
                results.push({ ...result, categoryKey });
            });
        });
        return results;
    }, [searchResults]);

    // Handle result selection
    const handleSelect = (result) => {
        navigate(result.route);
        onClose();
    };

    // Keyboard navigation
    const {
        selectedIndex,
        hoveredIndex,
        setHoveredIndex,
        listRef
    } = useKeyboardNavigation(allResults, handleSelect, onClose, isOpen);

    // Render loading state
    if (isLoading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 overflow-hidden z-50"
            >
                <div className="p-8 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-3"></div>
                    <p className="text-sm text-slate-500">Searching...</p>
                </div>
            </motion.div>
        );
    }

    // Render empty state
    if (!searchResults || !searchResults.categories || Object.keys(searchResults.categories).length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 overflow-hidden z-50"
            >
                <div className="p-8 flex flex-col items-center justify-center">
                    <Inbox className="text-slate-300 mb-3" size={48} />
                    <p className="text-sm font-medium text-slate-700">No results found</p>
                    <p className="text-xs text-slate-500 mt-1">
                        Try different keywords or check spelling
                    </p>
                </div>
            </motion.div>
        );
    }

    // Calculate result index mapping
    let globalIndex = 0;
    const categoryIndexMap = {};

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 overflow-hidden z-50"
        >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200/50 bg-slate-50/50">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">
                        Found {searchResults.total_results} results for "{query}"
                    </p>
                    <kbd className="px-2 py-1 text-xs font-semibold text-slate-600 bg-white rounded border border-slate-200">
                        ESC
                    </kbd>
                </div>
            </div>

            {/* Results */}
            <div
                className="max-h-[500px] overflow-y-auto custom-scrollbar"
                ref={listRef}
            >
                <AnimatePresence>
                    {Object.entries(searchResults.categories).map(([categoryKey, categoryData]) => {
                        const startIndex = globalIndex;
                        categoryIndexMap[categoryKey] = {
                            start: startIndex,
                            end: startIndex + categoryData.results.length - 1
                        };

                        const categoryResults = categoryData.results.map((result, index) => {
                            const currentIndex = globalIndex++;
                            return (
                                <SearchResultItem
                                    key={result.id}
                                    result={result}
                                    isSelected={selectedIndex === currentIndex}
                                    isHovered={hoveredIndex === currentIndex}
                                    onClick={() => handleSelect(result)}
                                    onMouseEnter={() => setHoveredIndex(currentIndex)}
                                />
                            );
                        });

                        return (
                            <div key={categoryKey} className="border-b border-slate-100 last:border-0">
                                {/* Category Header */}
                                <div className="px-4 py-2 bg-slate-50/80 flex items-center justify-between sticky top-0 z-10">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                            {categoryKey.replace(/_/g, ' ')}
                                        </span>
                                        <span className="px-1.5 py-0.5 text-xs font-bold bg-primary-100 text-primary-700 rounded">
                                            {categoryData.count}
                                        </span>
                                    </div>
                                    {categoryData.count > 5 && (
                                        <button
                                            onClick={() => {
                                                navigate(categoryData.route);
                                                onClose();
                                            }}
                                            className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                                        >
                                            View all
                                            <ChevronRight size={12} />
                                        </button>
                                    )}
                                </div>

                                {/* Category Results */}
                                {categoryResults}
                            </div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-200/50 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-white rounded border border-slate-200">↑</kbd>
                        <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-white rounded border border-slate-200">↓</kbd>
                        <span>Navigate</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-white rounded border border-slate-200">↵</kbd>
                        <span>Select</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default SearchResults;
