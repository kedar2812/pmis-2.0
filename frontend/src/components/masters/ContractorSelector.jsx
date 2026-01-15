/**
 * ContractorSelector Component
 * 
 * A smart dropdown for selecting contractors with blacklist guardrails.
 * - Fetches contractors from /api/masters/contractors/
 * - Shows status badges (Active, Blacklisted, Expired)
 * - BLOCKS selection of blacklisted or expired contractors
 * - Optionally can filter to show only active contractors
 */
import { useState, useEffect } from 'react';
import { AlertTriangle, Ban, Clock, CheckCircle2, Search, X } from 'lucide-react';
import mastersService from '@/api/services/mastersService';

const ContractorSelector = ({
    value,
    onChange,
    onContractorSelect,
    showOnlyActive = false,
    disabled = false,
    className = '',
    label = 'Contractor',
    required = false,
    error = null,
}) => {
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedContractor, setSelectedContractor] = useState(null);

    // Fetch contractors on mount
    useEffect(() => {
        const fetchContractors = async () => {
            setLoading(true);
            try {
                // Use active endpoint if showOnlyActive, else fetch all
                const response = showOnlyActive
                    ? await mastersService.getActiveContractors()
                    : await mastersService.getContractors();
                setContractors(response.data || []);
            } catch (err) {
                console.error('Failed to fetch contractors:', err);
                setContractors([]);
            } finally {
                setLoading(false);
            }
        };
        fetchContractors();
    }, [showOnlyActive]);

    // Set selected contractor when value changes
    useEffect(() => {
        if (value && contractors.length > 0) {
            const found = contractors.find(c => c.id === value);
            setSelectedContractor(found || null);
        } else {
            setSelectedContractor(null);
        }
    }, [value, contractors]);

    // Filter contractors by search term
    const filteredContractors = contractors.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get status color and icon
    const getStatusStyle = (contractor) => {
        if (contractor.blacklisted) {
            return {
                bg: 'bg-red-100 dark:bg-red-900/30',
                text: 'text-red-700 dark:text-red-300',
                icon: Ban,
                label: 'Blacklisted',
                blocked: true
            };
        }
        if (contractor.is_valid === false) {
            return {
                bg: 'bg-amber-100 dark:bg-amber-900/30',
                text: 'text-amber-700 dark:text-amber-300',
                icon: Clock,
                label: 'Expired',
                blocked: true
            };
        }
        return {
            bg: 'bg-emerald-100 dark:bg-emerald-900/30',
            text: 'text-emerald-700 dark:text-emerald-300',
            icon: CheckCircle2,
            label: 'Active',
            blocked: false
        };
    };

    // Handle contractor selection
    const handleSelect = (contractor) => {
        const status = getStatusStyle(contractor);

        // Block if blacklisted or expired
        if (status.blocked) {
            return; // Don't allow selection
        }

        setSelectedContractor(contractor);
        onChange?.(contractor.id);
        onContractorSelect?.(contractor);
        setIsOpen(false);
        setSearchTerm('');
    };

    // Clear selection
    const handleClear = () => {
        setSelectedContractor(null);
        onChange?.('');
        onContractorSelect?.(null);
    };

    return (
        <div className={`relative ${className}`}>
            {/* Label */}
            {label && (
                <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            {/* Selected Value Display */}
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`
                    w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900 cursor-pointer
                    flex items-center justify-between
                    ${disabled ? 'bg-slate-100 dark:bg-neutral-800 cursor-not-allowed' : 'hover:border-primary-400 dark:hover:border-primary-500'}
                    ${error ? 'border-red-300 dark:border-red-500/50' : 'border-slate-300 dark:border-neutral-700'}
                    ${isOpen ? 'border-primary-500 ring-2 ring-primary-100 dark:ring-primary-900/30' : ''}
                `}
            >
                {selectedContractor ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="truncate text-sm">
                            {selectedContractor.code} - {selectedContractor.name}
                        </span>
                        {(() => {
                            const status = getStatusStyle(selectedContractor);
                            const Icon = status.icon;
                            return (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.text}`}>
                                    <Icon size={12} />
                                    {status.label}
                                </span>
                            );
                        })()}
                    </div>
                ) : (
                    <span className="text-slate-400 dark:text-neutral-500 text-sm">Select contractor...</span>
                )}

                <div className="flex items-center gap-1">
                    {selectedContractor && !disabled && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleClear(); }}
                            className="p-1 hover:bg-slate-100 rounded"
                        >
                            <X size={14} className="text-slate-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-80 overflow-hidden">
                    {/* Search */}
                    <div className="p-2 border-b border-slate-100 dark:border-neutral-800">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name or code..."
                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/30 focus:border-primary-500"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Options */}
                    <div className="max-h-60 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-slate-500 text-sm">Loading...</div>
                        ) : filteredContractors.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 text-sm">No contractors found</div>
                        ) : (
                            filteredContractors.map((contractor) => {
                                const status = getStatusStyle(contractor);
                                const Icon = status.icon;

                                return (
                                    <div
                                        key={contractor.id}
                                        onClick={() => handleSelect(contractor)}
                                        className={`
                                            px-3 py-2 flex items-center justify-between
                                            ${status.blocked
                                                ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-neutral-800'
                                                : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800'
                                            }
                                            ${value === contractor.id ? 'bg-primary-50 dark:bg-primary-900/30' : ''}
                                        `}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                {contractor.code} - {contractor.name}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-neutral-400">
                                                {contractor.contractor_type} • {contractor.registration_class || 'Unclassified'}
                                            </p>
                                            {contractor.blacklisted && contractor.blacklist_reason && (
                                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                                    <AlertTriangle size={10} />
                                                    {contractor.blacklist_reason}
                                                </p>
                                            )}
                                        </div>

                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.text} ml-2 flex-shrink-0`}>
                                            <Icon size={12} />
                                            {status.label}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Guardrail Notice */}
                    {!showOnlyActive && (
                        <div className="p-2 bg-slate-50 dark:bg-neutral-800 border-t border-slate-100 dark:border-neutral-700">
                            <p className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-1">
                                <Ban size={10} className="text-red-400" />
                                Blacklisted and expired contractors cannot be selected
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Backdrop to close dropdown */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

export default ContractorSelector;
