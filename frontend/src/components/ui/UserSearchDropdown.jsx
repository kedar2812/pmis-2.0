import { useState, useEffect, useRef } from 'react';
import { Search, User, X, Loader2, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '@/api/client';

/**
 * UserSearchDropdown - Reusable searchable dropdown for user selection
 * 
 * Government-grade component matching uploaded design with FULL dark mode:
 * - Fuzzy search with API integration
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Complete dark mode support throughout
 * - Loading states
 * - "Invite New User" action
 * - Accessibility features
 * 
 * @param {Object} props
 * @param {Function} props.onSelect - Callback when user is selected (user) => void
 * @param {Function} props.onInvite - Callback when "Invite New User" is clicked
 * @param {string} props.value - Selected user ID
 * @param {string} props.label - Label text
 * @param {boolean} props.required - Whether field is required
 * @param {string} props.roleFilter - Filter by specific role (optional)
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.error - Error message to display
 */
export const UserSearchDropdown = ({
    onSelect,
    onInvite,
    value,
    label = "Select User",
    required = false,
    roleFilter = null,
    placeholder = "Search staff by name...",
    error = null
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [selectedUser, setSelectedUser] = useState(null);

    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    // Fetch users when search query changes (debounced)
    useEffect(() => {
        if (searchQuery.length < 2) {
            setUsers([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({ q: searchQuery, limit: 20 });
                if (roleFilter) params.append('role', roleFilter);

                const response = await client.get(`/users/search/?${params.toString()}`);
                setUsers(response.data.users || []);
            } catch (err) {
                console.error('User search failed:', err);
                setUsers([]);
            } finally {
                setLoading(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery, roleFilter]);

    // Load selected user details if value is provided
    useEffect(() => {
        if (value && !selectedUser) {
            // Fetch user details by ID
            client.get(`/users/${value}/`).then(response => {
                setSelectedUser(response.data);
            }).catch(err => {
                console.error('Failed to load user:', err);
            });
        }
    }, [value, selectedUser]);

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
                    prev < users.length ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex === users.length && onInvite) {
                    // "Invite New User" selected
                    onInvite();
                    setIsOpen(false);
                } else if (users[highlightedIndex]) {
                    handleSelect(users[highlightedIndex]);
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

    const handleSelect = (user) => {
        setSelectedUser(user);
        onSelect(user);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleClear = (e) => {
        e.stopPropagation();
        setSelectedUser(null);
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
                    relative w-full p-2 pl-10 pr-10 border rounded-lg cursor-pointer
                    transition-all duration-200
                    ${error ? 'border-red-500 dark:border-red-700' : 'border-slate-200 dark:border-neutral-700'}
                    ${isOpen ? 'ring-2 ring-primary-500 dark:ring-primary-400 border-primary-500 dark:border-primary-400' : ''}
                    bg-white dark:bg-neutral-900 hover:border-slate-300 dark:hover:border-neutral-600
                `}
                tabIndex={0}
            >
                <User className="absolute left-3 top-2.5 text-slate-400 dark:text-neutral-500" size={18} />

                <div className="text-slate-900 dark:text-white truncate">
                    {selectedUser ? (
                        <span>{selectedUser.full_name || `${selectedUser.first_name} ${selectedUser.last_name}`}</span>
                    ) : (
                        <span className="text-slate-400 dark:text-neutral-500">{placeholder}</span>
                    )}
                </div>

                {selectedUser && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3 top-2.5 text-slate-400 dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300"
                    >
                        <X size={18} />
                    </button>
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
                        className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden"
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
                                    placeholder="Type to search..."
                                    className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500"
                                    autoFocus
                                />
                            </div>
                            {searchQuery.length > 0 && searchQuery.length < 2 && (
                                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">Type at least 2 characters</p>
                            )}
                        </div>

                        {/* Results */}
                        <div className="max-h-64 overflow-y-auto">
                            {loading ? (
                                <div className="p-4 text-center text-slate-500 dark:text-neutral-400">
                                    <Loader2 className="animate-spin inline-block text-primary-500 dark:text-primary-400" size={20} />
                                    <span className="ml-2">Searching...</span>
                                </div>
                            ) : users.length === 0 && searchQuery.length >= 2 ? (
                                <div className="p-4 text-center text-slate-500 dark:text-neutral-400">
                                    No users found
                                </div>
                            ) : (
                                <>
                                    {users.map((user, index) => (
                                        <div
                                            key={user.id}
                                            onClick={() => handleSelect(user)}
                                            className={`
                                                p-3 cursor-pointer border-b border-slate-100 dark:border-neutral-700 last:border-0
                                                transition-colors duration-150
                                                ${highlightedIndex === index ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-neutral-700'}
                                            `}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-medium">
                                                    {user.first_name?.[0] || user.username?.[0] || '?'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                        {user.full_name || `${user.first_name} ${user.last_name}`}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-neutral-400 truncate">
                                                        {user.email}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-neutral-700 text-slate-600 dark:text-neutral-300">
                                                        {user.role_display || user.role}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Invite New User Option */}
                                    {onInvite && (
                                        <div
                                            onClick={() => {
                                                onInvite();
                                                setIsOpen(false);
                                            }}
                                            className={`
                                                p-3 cursor-pointer border-t-2 border-primary-200 dark:border-primary-800
                                                transition-colors duration-150
                                                ${highlightedIndex === users.length ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-neutral-700'}
                                            `}
                                            onMouseEnter={() => setHighlightedIndex(users.length)}
                                        >
                                            <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
                                                <UserPlus size={20} />
                                                <span className="font-medium">Invite New User</span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserSearchDropdown;
