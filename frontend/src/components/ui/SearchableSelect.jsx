/**
 * SearchableSelect Component
 * Searchable dropdown with keyboard navigation
 * Used for bank selection
 */
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SearchableSelect = ({
    options = [],
    value,
    onChange,
    placeholder = 'Search...',
    label,
    required = false,
    disabled = false,
    error = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredOptions, setFilteredOptions] = useState(options);
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);

    useEffect(() => {
        // Filter options based on search term
        if (searchTerm) {
            const filtered = options.filter(option =>
                option.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredOptions(filtered);
        } else {
            setFilteredOptions(options);
        }
    }, [searchTerm, options]);

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        // Focus search input when dropdown opens
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (option) => {
        onChange(option);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClear = () => {
        onChange('');
        setSearchTerm('');
    };

    return (
        <div ref={containerRef} className="relative">
            {label && (
                <label className="block text-sm font-medium text-app-heading mb-1.5">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={`w-full px-4 py-2.5 pr-10 text-left rounded-xl border transition-all outline-none focus:ring-2 ${error
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/50'
                        : isOpen
                            ? 'border-app-focus ring-2 ring-primary-100 dark:ring-primary-900/30'
                            : 'border-app focus:border-app-focus focus:ring-primary-100 dark:focus:ring-primary-900/30'
                        } ${disabled ? 'bg-app-hover cursor-not-allowed' : 'bg-app-card'}`}
                >
                    <span className={value ? 'text-app-heading' : 'text-app-muted'}>
                        {value || placeholder}
                    </span>
                </button>

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {value && !disabled && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClear();
                            }}
                            className="p-1 hover:bg-app-hover rounded transition-colors"
                        >
                            <X size={16} className="text-app-muted" />
                        </button>
                    )}
                    <ChevronDown
                        size={18}
                        className={`text-app-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>
            </div>

            {error && (
                <p className="mt-1 text-sm text-red-500">{error}</p>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-2 bg-app-card border border-app rounded-xl shadow-lg overflow-hidden"
                    >
                        {/* Search Input */}
                        <div className="p-3 border-b border-app-subtle">
                            <div className="relative">
                                <Search
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted"
                                />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Type to search..."
                                    className="w-full pl-10 pr-3 py-2 border border-app bg-app-card text-app-heading rounded-lg outline-none focus:border-app-focus focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/30 transition-all"
                                />
                            </div>
                        </div>

                        {/* Options List */}
                        <div className="max-h-64 overflow-y-auto">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => handleSelect(option)}
                                        className={`w-full px-4 py-2.5 text-left hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors ${value === option ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium' : 'text-app-heading'
                                            }`}
                                    >
                                        {option}
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-app-muted">
                                    <p>No results found</p>
                                    {searchTerm && (
                                        <p className="text-sm mt-1">Try a different search term</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SearchableSelect;
