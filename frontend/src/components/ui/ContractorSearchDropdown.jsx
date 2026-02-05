import { useState, useEffect, useRef } from 'react';
import { Search, User, X, Loader2, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '@/api/client';

/**
 * ContractorSearchDropdown - Searchable dropdown for contractor selection
 * 
 * Government-grade component matching uploaded UI design with:
 * - Active contractors with linked accounts only
 * - Avatar circles with contractor initials
 * - Display contractor code, class, registration info
 * - Dark mode support
 * - Keyboard navigation
 * - NO Invite option (contractors self-register)
 * 
 * @param {Object} props
 * @param {Function} props.onSelect - Callback when contractor is selected
 * @param {string} props.value - Selected contractor ID
 * @param {string} props.label - Label text
 * @param {boolean} props.required - Whether field is required
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.error - Error message to display
 */
export const ContractorSearchDropdown = ({
    onSelect,
    value,
    label = "Select Contractor",
    required = false,
    placeholder = "Select or search contractors...",
    error = null
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [contractors, setContractors] = useState([]);
    const [allContractors, setAllContractors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [selectedContractor, setSelectedContractor] = useState(null);

    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    // Load active contractors with linked accounts on mount
    useEffect(() => {
        const fetchContractors = async () => {
            setLoading(true);
            try {
                const response = await client.get('/masters/contractors/active_with_accounts/');
                const contractorsList = response.data?.results || response.data || [];
                setAllContractors(contractorsList);
                setContractors(contractorsList);
            } catch (err) {
                console.error('Failed to load contractors:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchContractors();
    }, []);

    // Filter contractors based on search query (client-side for performance)
    useEffect(() => {
        if (!searchQuery) {
            setContractors(allContractors);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = allContractors.filter(contractor =>
            contractor.name?.toLowerCase().includes(query) ||
            contractor.code?.toLowerCase().includes(query) ||
            contractor.pan?.toLowerCase().includes(query) ||
            contractor.email?.toLowerCase().includes(query)
        );

        setContractors(filtered);
    }, [searchQuery, allContractors]);

    // Load selected contractor if value is provided
    useEffect(() => {
        if (value && !selectedContractor) {
            const contractor = allContractors.find(c => c.id === value);
            if (contractor) {
                setSelectedContractor(contractor);
            }
        }
    }, [value, allContractors, selectedContractor]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 100);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < contractors.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;
            case 'Enter':
                e.preventDefault();
                if (contractors[highlightedIndex]) {
                    handleSelect(contractors[highlightedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                break;
            default:
                break;
        }
    };

    const handleSelect = (contractor) => {
        setSelectedContractor(contractor);
        onSelect(contractor);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleClear = (e) => {
        e.stopPropagation();
        setSelectedContractor(null);
        onSelect(null);
        setSearchQuery('');
    };

    return (
        <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
            {/* Label */}
            <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
                {label} {required && <span className="text-red-500 dark:text-red-400">*</span>}
            </label>

            {/* Dropdown Trigger */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center justify-between px-4 py-2.5 border rounded-xl text-left transition-all
                    ${error ? 'border-red-500 dark:border-red-700' : isOpen ? 'border-primary-500 dark:border-primary-400 ring-2 ring-primary-100 dark:ring-primary-900' : 'border-slate-200 dark:border-neutral-700 hover:border-slate-300 dark:hover:border-neutral-600'}
                    bg-white dark:bg-neutral-900
                `}
                tabIndex={0}
            >
                {selectedContractor ? (
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-sm flex-shrink-0">
                            {selectedContractor.code?.slice(-2) || '??'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 dark:text-white truncate">{selectedContractor.name}</p>
                            <p className="text-xs text-slate-500 dark:text-neutral-400 truncate">{selectedContractor.code}</p>
                        </div>
                        <div
                            onClick={handleClear}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full text-slate-400 dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300 cursor-pointer"
                        >
                            <X size={16} />
                        </div>
                    </div>
                ) : (
                    <span className="text-slate-400 dark:text-neutral-500">{placeholder}</span>
                )}
            </button>

            {/* Error Message */}
            {error && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>
            )}

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden"
                    >
                        {/* Search Input */}
                        <div className="p-2 border-b border-slate-100 dark:border-neutral-700">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-neutral-500" size={16} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name, code, PAN..."
                                    className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Results */}
                        <div className="max-h-64 overflow-y-auto">
                            {loading ? (
                                <div className="p-4 text-center text-slate-500 dark:text-neutral-400">
                                    <Loader2 className="animate-spin inline-block" size={20} />
                                    <span className="ml-2">Loading contractors...</span>
                                </div>
                            ) : contractors.length === 0 ? (
                                <div className="p-4 text-center text-slate-500 dark:text-neutral-400">
                                    {searchQuery ? 'No contractors found matching your search' : 'No active contractors with user accounts'}
                                </div>
                            ) : (
                                contractors.map((contractor, index) => (
                                    <button
                                        key={contractor.id}
                                        onClick={() => handleSelect(contractor)}
                                        className={`
                                            w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                                            ${highlightedIndex === index ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-neutral-700'}
                                        `}
                                        onMouseEnter={() => setHighlightedIndex(index)}
                                    >
                                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-neutral-700 flex items-center justify-center text-slate-600 dark:text-neutral-300 font-bold text-sm flex-shrink-0">
                                            {contractor.code?.slice(-2) || '??'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                    {contractor.name}
                                                </p>
                                                <span className="text-xs font-mono text-slate-500 dark:text-neutral-400 shrink-0">
                                                    {contractor.code}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                {contractor.registration_class && (
                                                    <span className="inline-block px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-neutral-700 text-slate-600 dark:text-neutral-300">
                                                        {contractor.registration_class}
                                                    </span>
                                                )}
                                                {contractor.email && (
                                                    <span className="text-xs text-slate-500 dark:text-neutral-400 truncate">
                                                        {contractor.email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ContractorSearchDropdown;
