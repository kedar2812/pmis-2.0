import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, X, Loader2 } from 'lucide-react';
import searchService from '@/api/services/searchService';
import SearchResults from './SearchResults';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { useCommandPalette } from '@/hooks/useKeyboardNavigation';
import { toast } from 'sonner';

/**
 * Global Search Component - Command Palette Style
 * 
 * Features:
 * - Cmd+K / Ctrl+K keyboard shortcut
 * - Debounced search (300ms)
 * - Real-time search results
 * - Categorized results
 * - Keyboard navigation
 * - Recent searches
 * - Glass-morphic design
 * 
 * @returns {JSX.Element}
 */
const GlobalSearch = () => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState(null);
    const [recentSearches, setRecentSearches] = useState([]);

    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Load recent searches on mount
    useEffect(() => {
        const recent = searchService.getRecentSearches();
        setRecentSearches(recent);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                handleClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Debounced search function
    const { debouncedCallback: performSearch } = useDebouncedCallback(
        async (searchQuery) => {
            console.log('performSearch called with:', searchQuery);
            if (!searchQuery.trim() || searchQuery.length < 2) {
                setSearchResults(null);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);

            try {
                console.log('Calling searchService.globalSearch...');
                const results = await searchService.globalSearch(searchQuery, {
                    limit: 5
                });

                console.log('Search results received:', results);
                console.log('Total results:', results?.total_results);
                console.log('Categories:', results?.categories);

                setSearchResults(results);

                // Save to recent searches
                if (results.total_results > 0) {
                    searchService.saveRecentSearch(searchQuery);
                    setRecentSearches(searchService.getRecentSearches());
                }
            } catch (error) {
                console.error('Search failed:', error);
                console.error('Error response:', error.response?.data);
                toast.error('Search failed. Please try again.');
                setSearchResults(null);
            } finally {
                setIsSearching(false);
            }
        },
        300
    );

    // Handle query change
    const handleQueryChange = (e) => {
        const newQuery = e.target.value;
        setQuery(newQuery);

        if (newQuery.trim().length >= 2) {
            setIsSearching(true);
            performSearch(newQuery);
        } else {
            setSearchResults(null);
            setIsSearching(false);
        }
    };

    // Handle focus
    const handleFocus = () => {
        setIsFocused(true);
        setIsOpen(true);
    };

    // Handle close
    const handleClose = () => {
        setIsOpen(false);
        setIsFocused(false);
        // Don't clear query immediately to allow animations
        setTimeout(() => {
            if (!isFocused) {
                setQuery('');
                setSearchResults(null);
            }
        }, 200);
    };

    // Handle clear
    const handleClear = () => {
        setQuery('');
        setSearchResults(null);
        inputRef.current?.focus();
    };

    // Keyboard shortcut: Cmd+K / Ctrl+K
    useCommandPalette(() => {
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
    }, true);

    // Determine what to show in dropdown
    const shouldShowResults = isOpen && (searchResults || isSearching || (query.length > 0 && query.length < 2));
    const shouldShowRecents = isOpen && !query && recentSearches.length > 0;

    return (
        <div ref={containerRef} className="relative w-full max-w-2xl">
            {/* Search Input */}
            <motion.div
                animate={{
                    boxShadow: isFocused
                        ? '0 0 0 3px rgba(59, 130, 246, 0.1), 0 10px 40px rgba(0, 0, 0, 0.1)'
                        : '0 2px 8px rgba(0, 0, 0, 0.05)',
                }}
                transition={{ duration: 0.2 }}
                className={`
                    relative flex items-center gap-3
                    px-4 py-2.5 rounded-xl
                    bg-white/90 backdrop-blur-xl
                    border-2 transition-colors duration-200
                    ${isFocused ? 'border-primary-300' : 'border-slate-200/60'}
                `}
            >
                {/* Search Icon */}
                <Search
                    size={18}
                    className={`transition-colors duration-200 ${isFocused ? 'text-primary-600' : 'text-slate-400'
                        }`}
                />

                {/* Input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleQueryChange}
                    onFocus={handleFocus}
                    placeholder="Search projects, documents, users..."
                    className="flex-1 bg-transparent outline-none text-sm text-slate-900 placeholder-slate-400"
                />

                {/* Clear Button */}
                <AnimatePresence>
                    {query && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={handleClear}
                            className="p-1 rounded-md hover:bg-slate-100 transition-colors"
                        >
                            <X size={14} className="text-slate-400" />
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Loading Spinner */}
                <AnimatePresence>
                    {isSearching && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <Loader2 size={16} className="text-primary-600 animate-spin" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Keyboard Shortcut Badge */}
                {!isFocused && !query && (
                    <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md">
                        <Command size={12} className="text-slate-500" />
                        <span className="text-xs font-semibold text-slate-500">K</span>
                    </div>
                )}
            </motion.div>

            {/* Results Dropdown */}
            <AnimatePresence>
                {shouldShowResults && (
                    <SearchResults
                        searchResults={searchResults}
                        isLoading={isSearching}
                        isOpen={isOpen}
                        onClose={handleClose}
                        query={query}
                    />
                )}

                {/* Recent Searches */}
                {shouldShowRecents && !shouldShowResults && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 overflow-hidden z-50"
                    >
                        <div className="px-4 py-3 border-b border-slate-200/50 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-slate-500">Recent Searches</p>
                                <button
                                    onClick={() => {
                                        searchService.clearRecentSearches();
                                        setRecentSearches([]);
                                    }}
                                    className="text-xs text-slate-400 hover:text-slate-600"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                            {recentSearches.map((recent, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setQuery(recent.query);
                                        performSearch(recent.query);
                                    }}
                                    className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors flex items-center gap-2 group"
                                >
                                    <Search size={14} className="text-slate-400" />
                                    <span className="text-sm text-slate-700 group-hover:text-primary-600">
                                        {recent.query}
                                    </span>
                                    <span className="ml-auto text-xs text-slate-400">
                                        {new Date(recent.timestamp).toLocaleDateString()}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GlobalSearch;
