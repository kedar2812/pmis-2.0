import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Search,
    X,
    ArrowRight,
    FileText,
    Users,
    FolderOpen,
    Calendar,
    MessageSquare,
    Building2,
    LayoutDashboard,
    Clock,
    Filter,
    ChevronRight,
    ArrowUp,
    ArrowDown,
    CornerDownLeft,
    Loader2,
    Settings,
    CheckCircle2,
    Briefcase,
    Receipt,
    Map,
    Box,
    Workflow,
    CreditCard,
    Shield,
    BookOpen
} from 'lucide-react';
import SearchResultItem from './SearchResultItem';
import SearchFilters from './SearchFilters';
import { searchService } from '@/services/searchService';

// Navigation pages for quick access
const NAVIGATION_PAGES = [
    { id: 'nav-dashboard', title: 'Dashboard', description: 'View your dashboard', path: '/dashboard', icon: LayoutDashboard, category: 'pages', keywords: ['dashboard', 'home', 'main'] },
    { id: 'nav-projects', title: 'Projects', description: 'Manage all projects', path: '/projects', icon: Briefcase, category: 'pages', keywords: ['projects', 'proj', 'project list'] },
    { id: 'nav-edms', title: 'EDMS', description: 'Document management system', path: '/edms', icon: FolderOpen, category: 'pages', keywords: ['documents', 'docs', 'edms', 'files', 'file manager'], noTranslate: true },
    { id: 'nav-scheduling', title: 'Scheduling', description: 'View schedules and Gantt charts', path: '/scheduling', icon: Calendar, category: 'pages', keywords: ['schedule', 'scheduling', 'gantt', 'timeline', 'tasks'] },
    { id: 'nav-communications', title: 'Communications', description: 'Messages and threads', path: '/communications', icon: MessageSquare, category: 'pages', keywords: ['communications', 'messages', 'chat', 'inbox'] },
    { id: 'nav-billing', title: 'RA Billing', description: 'Running account bills', path: '/cost/billing', icon: Receipt, category: 'pages', keywords: ['billing', 'ra billing', 'bills', 'invoices'], noTranslate: true },
    { id: 'nav-funds', title: 'Fund Management', description: 'Manage project funds', path: '/cost/funds', icon: CreditCard, category: 'pages', keywords: ['funds', 'fund management', 'finance'] },
    { id: 'nav-budgeting', title: 'Budgeting', description: 'Budget planning and tracking', path: '/cost/budgeting', icon: CreditCard, category: 'pages', keywords: ['budget', 'budgeting', 'cost planning'] },
    { id: 'nav-boq', title: 'BOQ Management', description: 'Bill of quantities', path: '/cost/boq', icon: FileText, category: 'pages', keywords: ['boq', 'bill of quantities', 'quantities'], noTranslate: true },
    { id: 'nav-users', title: 'User Management', description: 'Manage users and permissions', path: '/users', icon: Users, category: 'pages', keywords: ['users', 'user management', 'people', 'team'] },
    { id: 'nav-approvals', title: 'Approvals', description: 'Pending approvals', path: '/approvals', icon: CheckCircle2, category: 'pages', keywords: ['approvals', 'pending', 'approve', 'review'] },
    { id: 'nav-procurement', title: 'E-Procurement', description: 'Tenders and contracts', path: '/e-procurement', icon: Briefcase, category: 'pages', keywords: ['procurement', 'e-procurement', 'tenders', 'contracts'] },
    { id: 'nav-gis', title: 'GIS', description: 'Geographic information system', path: '/gis', icon: Map, category: 'pages', keywords: ['gis', 'map', 'location', 'geo'], noTranslate: true },
    { id: 'nav-bim', title: 'BIM', description: 'Building information modeling', path: '/bim', icon: Box, category: 'pages', keywords: ['bim', 'building', '3d model'], noTranslate: true },
    { id: 'nav-workflow', title: 'Workflow Config', description: 'Configure workflows', path: '/workflow', icon: Workflow, category: 'pages', keywords: ['workflow', 'workflows', 'automation'] },
    { id: 'nav-risk', title: 'Risk Management', description: 'Manage project risks', path: '/risk', icon: Shield, category: 'pages', keywords: ['risk', 'risks', 'risk management'] },
    { id: 'nav-etp', title: 'ETP Master', description: 'ETP configuration', path: '/etp-master', icon: Settings, category: 'pages', keywords: ['etp', 'etp master', 'configuration'], noTranslate: true },
    { id: 'nav-audit', title: 'Audit Logs', description: 'View system audit logs', path: '/admin/audit-logs', icon: BookOpen, category: 'pages', keywords: ['audit', 'logs', 'audit logs', 'history'] },
    { id: 'nav-master-data', title: 'Master Data', description: 'Manage master data', path: '/admin/master-data', icon: Settings, category: 'pages', keywords: ['master data', 'masters', 'configuration'] },
];

// Filter categories - comprehensive system-wide search
const FILTER_CATEGORIES = [
    { id: 'all', label: 'All', icon: Search },
    { id: 'pages', label: 'Pages', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'communications', label: 'Messages', icon: MessageSquare },
    { id: 'tasks', label: 'Tasks', icon: Calendar },
    { id: 'risks', label: 'Risks', icon: Shield },
    { id: 'billing', label: 'Billing', icon: Receipt },
    { id: 'boq', label: 'BOQ', icon: FileText },
    { id: 'funds', label: 'Funds', icon: CreditCard },
    { id: 'procurement', label: 'Procurement', icon: Briefcase },
];

/**
 * SearchModal - Full-screen search modal with filters and keyboard navigation
 * 
 * Features:
 * - Fuzzy search with typo tolerance
 * - Category filters
 * - Recent searches
 * - Keyboard navigation (arrow keys, Enter, Escape)
 * - Debounced API calls
 * - Highlighted matching text
 */
const SearchModal = ({ isOpen, onClose, onResultSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentSearches, setRecentSearches] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const inputRef = useRef(null);
    const resultsContainerRef = useRef(null);

    // Load recent searches on mount
    useEffect(() => {
        const recent = searchService.getRecentSearches();
        setRecentSearches(recent);
    }, []);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Fuzzy match helper for local navigation pages
    const fuzzyMatch = useCallback((text, searchQuery) => {
        if (!searchQuery) return false;
        const normalizedText = text.toLowerCase();
        const normalizedQuery = searchQuery.toLowerCase().trim();

        // Direct match
        if (normalizedText.includes(normalizedQuery)) return true;

        // Simple Levenshtein-like tolerance for short queries
        if (normalizedQuery.length >= 3) {
            // Check if at least 70% of characters match in order
            let queryIndex = 0;
            for (const char of normalizedText) {
                if (char === normalizedQuery[queryIndex]) {
                    queryIndex++;
                    if (queryIndex === normalizedQuery.length) return true;
                }
            }
        }

        return false;
    }, []);

    // Search navigation pages locally
    const searchNavigationPages = useCallback((searchQuery) => {
        if (!searchQuery || searchQuery.length < 1) return [];

        const normalizedQuery = searchQuery.toLowerCase().trim();

        return NAVIGATION_PAGES.filter(page => {
            // Match title
            if (fuzzyMatch(page.title, normalizedQuery)) return true;
            // Match description
            if (fuzzyMatch(page.description, normalizedQuery)) return true;
            // Match keywords
            return page.keywords.some(keyword =>
                fuzzyMatch(keyword, normalizedQuery) || keyword.includes(normalizedQuery)
            );
        }).map(page => ({
            ...page,
            type: 'page',
            relevanceScore: page.title.toLowerCase().startsWith(normalizedQuery) ? 100 : 50
        }));
    }, [fuzzyMatch]);

    // Debounced search
    useEffect(() => {
        if (!query || query.length < 2) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const debounceTimer = setTimeout(async () => {
            try {
                // Search navigation pages locally (instant)
                const pageResults = searchNavigationPages(query);

                // Search backend for other entities
                const apiResults = await searchService.globalSearch(query, activeFilter);

                // Combine and sort results
                const allResults = [...pageResults, ...apiResults];

                // Sort by relevance score (higher first), then by category priority
                allResults.sort((a, b) => {
                    // Pages always first if they match well
                    if (a.category === 'pages' && a.relevanceScore >= 100) return -1;
                    if (b.category === 'pages' && b.relevanceScore >= 100) return 1;

                    return (b.relevanceScore || 0) - (a.relevanceScore || 0);
                });

                // Filter by active category if not 'all'
                const filteredResults = activeFilter === 'all'
                    ? allResults
                    : allResults.filter(r => r.category === activeFilter);

                setResults(filteredResults.slice(0, 20)); // Limit to 20 results
                setSelectedIndex(0);
            } catch (error) {
                console.error('Search error:', error);
                // Still show local navigation results on error
                const pageResults = searchNavigationPages(query);
                setResults(pageResults);
            } finally {
                setIsLoading(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(debounceTimer);
    }, [query, activeFilter, searchNavigationPages]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (results[selectedIndex]) {
                        handleSelectResult(results[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex, onClose]);

    // Scroll selected item into view
    useEffect(() => {
        if (resultsContainerRef.current && results.length > 0) {
            const selectedElement = resultsContainerRef.current.children[selectedIndex];
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedIndex, results.length]);

    const handleSelectResult = useCallback((result) => {
        // Save to recent searches
        if (query) {
            searchService.saveRecentSearch(query);
        }
        onResultSelect(result);
    }, [query, onResultSelect]);

    const handleRecentSearchClick = useCallback((searchTerm) => {
        setQuery(searchTerm);
        inputRef.current?.focus();
    }, []);

    const clearRecentSearches = useCallback(() => {
        searchService.clearRecentSearches();
        setRecentSearches([]);
    }, []);

    // Group results by category for display
    const groupedResults = useMemo(() => {
        const groups = {};
        results.forEach(result => {
            const category = result.category || 'other';
            if (!groups[category]) groups[category] = [];
            groups[category].push(result);
        });
        return groups;
    }, [results]);

    if (!isOpen) return null;

    return (
        <motion.div
            className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
        >
            {/* Backdrop */}
            <motion.div
                className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
                onClick={onClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            />

            {/* Modal Content */}
            <motion.div
                className="relative w-full max-w-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/60 dark:border-neutral-700/60 overflow-hidden"
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
                {/* Search Input Section */}
                <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-neutral-700">
                    <Search size={20} className="text-slate-400 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search projects, documents, users, pages..."
                        className="flex-1 bg-transparent text-slate-900 dark:text-white text-base placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none"
                        autoComplete="off"
                        spellCheck="false"
                    />
                    {isLoading && (
                        <Loader2 size={18} className="text-primary-500 animate-spin flex-shrink-0" />
                    )}
                    {query && !isLoading && (
                        <button
                            onClick={() => setQuery('')}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                            <X size={16} className="text-slate-400" />
                        </button>
                    )}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400'}`}
                        title="Toggle filters"
                    >
                        <Filter size={16} />
                    </button>
                </div>

                {/* Filter Pills */}
                {showFilters && (
                    <motion.div
                        className="px-4 py-3 border-b border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-800/50"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        <div className="flex flex-wrap gap-2">
                            {FILTER_CATEGORIES.map((filter) => {
                                const Icon = filter.icon;
                                return (
                                    <button
                                        key={filter.id}
                                        onClick={() => setActiveFilter(filter.id)}
                                        className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                      transition-all duration-150
                      ${activeFilter === filter.id
                                                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-700'
                                                : 'bg-white dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border border-slate-200 dark:border-neutral-700 hover:border-slate-300 dark:hover:border-neutral-600 hover:bg-slate-50 dark:hover:bg-neutral-700'
                                            }
                    `}
                                    >
                                        <Icon size={14} />
                                        {filter.label}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* Results Section */}
                <div
                    ref={resultsContainerRef}
                    className="max-h-[60vh] overflow-y-auto overscroll-contain"
                >
                    {/* No query - show recent searches */}
                    {!query && recentSearches.length > 0 && (
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wide">
                                    Recent Searches
                                </h3>
                                <button
                                    onClick={clearRecentSearches}
                                    className="text-xs text-slate-400 dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300 transition-colors"
                                >
                                    Clear all
                                </button>
                            </div>
                            <div className="space-y-1">
                                {recentSearches.slice(0, 5).map((term, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleRecentSearchClick(term)}
                                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors text-left group"
                                    >
                                        <Clock size={14} className="text-slate-400" />
                                        <span className="text-sm text-slate-600 dark:text-neutral-300 flex-1">{term}</span>
                                        <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No query and no recent - show quick navigation */}
                    {!query && recentSearches.length === 0 && (
                        <div className="p-4">
                            <h3 className="text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
                                Quick Navigation
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {NAVIGATION_PAGES.slice(0, 8).map((page) => {
                                    const Icon = page.icon;
                                    return (
                                        <button
                                            key={page.id}
                                            onClick={() => handleSelectResult(page)}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors text-left group"
                                        >
                                            <div className="p-1.5 rounded-md bg-slate-100 dark:bg-neutral-700 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors">
                                                <Icon size={14} className="text-slate-500 dark:text-neutral-400 group-hover:text-primary-600" />
                                            </div>
                                            <span className={`text-sm font-medium text-slate-700 dark:text-neutral-200 ${page.noTranslate ? 'notranslate' : ''}`}>{page.title}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Search Results */}
                    {query && results.length > 0 && (
                        <div className="py-2">
                            {Object.entries(groupedResults).map(([category, items]) => (
                                <div key={category} className="mb-4">
                                    <h3 className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wide bg-slate-50/50 dark:bg-neutral-800/50">
                                        {category === 'pages' ? 'Navigation Pages' :
                                            category === 'projects' ? 'Projects' :
                                                category === 'documents' ? 'Documents' :
                                                    category === 'users' ? 'Users' :
                                                        category === 'communications' ? 'Messages' :
                                                            category === 'tasks' ? 'Tasks' :
                                                                category}
                                    </h3>
                                    <div>
                                        {items.map((result, index) => {
                                            const globalIndex = results.indexOf(result);
                                            return (
                                                <SearchResultItem
                                                    key={result.id}
                                                    result={result}
                                                    isSelected={globalIndex === selectedIndex}
                                                    onClick={() => handleSelectResult(result)}
                                                    query={query}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No results */}
                    {query && query.length >= 2 && results.length === 0 && !isLoading && (
                        <div className="py-12 text-center">
                            <Search size={40} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500 dark:text-neutral-400 font-medium">No results found for "{query}"</p>
                            <p className="text-slate-400 dark:text-neutral-500 text-sm mt-1">Try a different search term</p>
                        </div>
                    )}

                    {/* Loading shimmer */}
                    {isLoading && query && (
                        <div className="p-4 space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-10 h-10 bg-slate-200 dark:bg-neutral-700 rounded-lg" />
                                    <div className="flex-1">
                                        <div className="h-4 bg-slate-200 dark:bg-neutral-700 rounded w-1/3 mb-2" />
                                        <div className="h-3 bg-slate-100 dark:bg-neutral-800 rounded w-2/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer with keyboard hints */}
                <div className="px-4 py-3 border-t border-slate-200/60 dark:border-neutral-700/60 bg-slate-50/50 dark:bg-neutral-800/50">
                    <div className="flex items-center justify-between text-xs text-slate-400 dark:text-neutral-500">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 rounded border border-slate-200 dark:border-neutral-700 font-mono">
                                    <ArrowUp size={10} />
                                </kbd>
                                <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 rounded border border-slate-200 dark:border-neutral-700 font-mono">
                                    <ArrowDown size={10} />
                                </kbd>
                                <span className="ml-1">Navigate</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 rounded border border-slate-200 dark:border-neutral-700 font-mono text-[10px]">
                                    Enter
                                </kbd>
                                <span className="ml-1">Select</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 rounded border border-slate-200 dark:border-neutral-700 font-mono text-[10px]">
                                    Esc
                                </kbd>
                                <span className="ml-1">Close</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Filter size={12} />
                            <span>Press Tab to filter</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SearchModal;
