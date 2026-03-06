import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, Calendar, FileText, CheckCircle, SlidersHorizontal, ArrowDownAZ, ArrowUpAZ, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';
import { TextShimmer } from '@/components/ui/TextShimmer';
import GradientLoadingBar from '@/components/ui/GradientLoadingBar';

// Document statuses and types from EDMS.jsx
const documentStatuses = [
    { value: '', label: 'All Status' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'UNDER_REVIEW', label: 'Under Review' },
    { value: 'REVISION_REQUESTED', label: 'Revision Requested' },
    { value: 'VALIDATED', label: 'Validated' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
];

const documentTypes = [
    { value: '', label: 'All Types' },
    { value: 'DRAWING', label: 'Drawing' },
    { value: 'REPORT', label: 'Report' },
    { value: 'CONTRACT', label: 'Contract' },
    { value: 'CORRESPONDENCE', label: 'Correspondence' },
    { value: 'SPECIFICATION', label: 'Specification' },
    { value: 'INVOICE', label: 'Invoice' },
    { value: 'MEDIA', label: 'Media' },
    { value: 'OTHER', label: 'Other' },
];

const EDMSAdvancedSearch = ({ onSearch, isSearching }) => {
    const [query, setQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Filter states
    const [searchType, setSearchType] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [status, setStatus] = useState('');
    const [docType, setDocType] = useState('');
    const [sortBy, setSortBy] = useState('date_desc');

    const filterRef = useRef(null);

    // Close filters on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowFilters(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Active filter count
    const activeFiltersCount = [
        searchType !== 'all',
        dateFrom !== '',
        dateTo !== '',
        status !== '',
        docType !== '',
        sortBy !== 'date_desc' // default
    ].filter(Boolean).length;

    const handleSearch = () => {
        onSearch({
            q: query,
            type: searchType,
            date_from: dateFrom,
            date_to: dateTo,
            status,
            document_type: docType,
            sort_by: sortBy
        });
        setShowFilters(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const clearFilters = () => {
        setSearchType('all');
        setDateFrom('');
        setDateTo('');
        setStatus('');
        setDocType('');
        setSortBy('date_desc');
    };

    return (
        <div className="relative w-full max-w-3xl z-40">
            {/* Search Bar Container */}
            <div className={`relative flex items-center bg-app-card border rounded-2xl shadow-sm transition-all duration-300 ${isSearching ? 'border-primary-500 shadow-primary-500/20' : 'border-app hover:border-blue-300 hover:shadow-md'} overflow-hidden`}>
                <div className="pl-4 pr-2 text-primary-500 flex-shrink-0">
                    <Search size={20} className={isSearching ? 'animate-pulse' : ''} />
                </div>

                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search projects, documents, folders... (Press Enter to search)"
                    className="w-full bg-transparent py-3.5 pr-4 text-app-text text-[15px] focus:outline-none placeholder:text-app-muted"
                />

                <div className="flex items-center gap-2 pr-2">
                    {query && (
                        <button
                            onClick={() => { setQuery(''); onSearch({ q: '', type: searchType, status, document_type: docType, sort_by: sortBy }) }}
                            className="p-1.5 text-app-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <X size={16} />
                        </button>
                    )}

                    <div className="h-6 w-px bg-app hidden sm:block mx-1"></div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${showFilters || activeFiltersCount > 0
                                ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30'
                                : 'text-app-muted hover:bg-app-surface hover:text-app-text'
                            }`}
                    >
                        <SlidersHorizontal size={16} />
                        <span className="text-sm font-medium hidden sm:inline">Filters</span>
                        {activeFiltersCount > 0 && (
                            <span className="flex items-center justify-center w-5 h-5 text-[11px] font-bold bg-primary-600 text-white rounded-full">
                                {activeFiltersCount}
                            </span>
                        )}
                    </button>

                    <Button
                        onClick={handleSearch}
                        className="rounded-xl px-5 shadow-md shadow-primary-500/20"
                        disabled={isSearching}
                    >
                        {isSearching ? 'Searching...' : 'Search'}
                    </Button>
                </div>

                {/* Loading Bar at the bottom of input */}
                <div className="absolute bottom-0 left-0 right-0">
                    {isSearching ? <GradientLoadingBar /> : <div className="h-[2px] w-full bg-transparent"></div>}
                </div>
            </div>

            {/* Advanced Filters Dropdown */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        ref={filterRef}
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 8, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 right-0 bg-app-card rounded-2xl shadow-xl border border-app shadow-app-muted/10 p-5 z-50 overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-5 border-b border-app-subtle pb-3">
                            <h3 className="font-bold text-app-heading flex items-center gap-2">
                                <Filter size={18} className="text-primary-500" />
                                Advanced Filters
                            </h3>
                            <button
                                onClick={clearFilters}
                                className="text-xs font-medium text-app-muted hover:text-red-500 transition-colors"
                            >
                                Clear All
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                            {/* Search Scope */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-app-muted uppercase tracking-wider">Search In</label>
                                <div className="flex bg-app-surface p-1 rounded-xl">
                                    {['all', 'project', 'document', 'folder'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setSearchType(type)}
                                            className={`flex-1 text-xs py-1.5 px-2 rounded-lg font-medium capitalize transition-all ${searchType === type
                                                    ? 'bg-white dark:bg-slate-800 text-app-heading shadow-sm'
                                                    : 'text-app-muted hover:text-app-text'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sorting */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-app-muted uppercase tracking-wider flex items-center gap-1">
                                    <Clock size={12} /> Sort By
                                </label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full px-3 py-2 bg-app-input border border-app rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-app-text"
                                >
                                    <option value="date_desc">Newest First</option>
                                    <option value="date_asc">Oldest First</option>
                                    <option value="name_asc">Name (A-Z)</option>
                                    <option value="name_desc">Name (Z-A)</option>
                                </select>
                            </div>

                            {/* Document Specific Filters */}
                            <div className={`space-y-1.5 ${searchType !== 'all' && searchType !== 'document' ? 'opacity-50 pointer-events-none' : ''}`}>
                                <label className="text-xs font-semibold text-app-muted uppercase tracking-wider flex items-center gap-1">
                                    <CheckCircle size={12} /> Document Status
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full px-3 py-2 bg-app-input border border-app rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-app-text"
                                >
                                    {documentStatuses.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className={`space-y-1.5 ${searchType !== 'all' && searchType !== 'document' ? 'opacity-50 pointer-events-none' : ''}`}>
                                <label className="text-xs font-semibold text-app-muted uppercase tracking-wider flex items-center gap-1">
                                    <FileText size={12} /> Document Type
                                </label>
                                <select
                                    value={docType}
                                    onChange={(e) => setDocType(e.target.value)}
                                    className="w-full px-3 py-2 bg-app-input border border-app rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-app-text"
                                >
                                    {documentTypes.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Date Range */}
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-semibold text-app-muted uppercase tracking-wider flex items-center gap-1">
                                    <Calendar size={12} /> Date Range
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="flex-1 px-3 py-2 bg-app-input border border-app rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-app-text"
                                    />
                                    <span className="text-app-muted text-sm">to</span>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="flex-1 px-3 py-2 bg-app-input border border-app rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-app-text"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-app-subtle flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setShowFilters(false)}>Cancel</Button>
                            <Button onClick={handleSearch} className="px-6">Apply & Search</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Shimmer Text overlay - shown optionally below when loading */}
            {isSearching && (
                <div className="absolute top-full left-0 right-0 mt-3 text-center">
                    <TextShimmer className="text-sm font-medium" duration={1.5} spread={3}>
                        Searching across projects, documents, and folders...
                    </TextShimmer>
                </div>
            )}
        </div>
    );
};

export default EDMSAdvancedSearch;
