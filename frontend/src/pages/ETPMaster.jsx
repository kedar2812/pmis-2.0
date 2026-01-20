/**
 * ETP Master Reference Page
 * 
 * Read-only view for contractors to reference current ETP charges.
 * Shows only ACTIVE charges that are currently effective.
 * 
 * Accessible by all roles for transparency.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Calculator, Search, Info, Calendar, FileText,
    TrendingDown, TrendingUp, RefreshCw, HelpCircle
} from 'lucide-react';
import mastersService from '@/api/services/mastersService';
import { useAuth } from '@/contexts/AuthContext';

const ETPMaster = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [charges, setCharges] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');

    // Fetch active ETP charges
    useEffect(() => {
        fetchCharges();
    }, []);

    const fetchCharges = async () => {
        setLoading(true);
        try {
            const response = await mastersService.getActiveETPCharges();
            setCharges(response.data || []);
        } catch (error) {
            console.error('Failed to fetch ETP charges:', error);
            // Try fallback to all charges
            try {
                const fallback = await mastersService.getETPCharges();
                // Filter only active and effective ones
                const today = new Date();
                const activeCharges = (fallback.data || []).filter(c => {
                    if (!c.is_active) return false;
                    if (!c.effective_date) return true;
                    return new Date(c.effective_date) <= today;
                });
                setCharges(activeCharges);
            } catch (e) {
                setCharges([]);
            }
        } finally {
            setLoading(false);
        }
    };

    // Filter charges
    const filteredCharges = charges.filter(charge => {
        const matchesSearch =
            charge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            charge.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || charge.charge_type === filterType;
        return matchesSearch && matchesType;
    });

    // Group by type for summary
    const chargesByType = {
        Deduction: filteredCharges.filter(c => c.charge_type === 'Deduction'),
        Recovery: filteredCharges.filter(c => c.charge_type === 'Recovery'),
        Levy: filteredCharges.filter(c => c.charge_type === 'Levy'),
        Addition: filteredCharges.filter(c => c.charge_type === 'Addition'),
    };

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Get type icon and color
    const getTypeStyle = (type) => {
        switch (type) {
            case 'Deduction':
                return {
                    icon: TrendingDown,
                    bg: 'bg-red-50 dark:bg-red-900/10',
                    border: 'border-red-200 dark:border-red-800',
                    text: 'text-red-700 dark:text-red-400',
                    iconColor: 'text-red-500 dark:text-red-400'
                };
            case 'Recovery':
                return {
                    icon: TrendingDown,
                    bg: 'bg-amber-50 dark:bg-amber-900/10',
                    border: 'border-amber-200 dark:border-amber-800',
                    text: 'text-amber-700 dark:text-amber-400',
                    iconColor: 'text-amber-500 dark:text-amber-400'
                };
            case 'Levy':
                return {
                    icon: FileText,
                    bg: 'bg-blue-50 dark:bg-blue-900/10',
                    border: 'border-blue-200 dark:border-blue-800',
                    text: 'text-blue-700 dark:text-blue-400',
                    iconColor: 'text-blue-500 dark:text-blue-400'
                };
            case 'Addition':
                return {
                    icon: TrendingUp,
                    bg: 'bg-emerald-50 dark:bg-emerald-900/10',
                    border: 'border-emerald-200 dark:border-emerald-800',
                    text: 'text-emerald-700 dark:text-emerald-400',
                    iconColor: 'text-emerald-500 dark:text-emerald-400'
                };
            default:
                return {
                    icon: Calculator,
                    bg: 'bg-app-surface',
                    border: 'border-app-subtle',
                    text: 'text-app-text',
                    iconColor: 'text-app-muted'
                };
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-app-heading flex items-center gap-2">
                        <Calculator className="text-primary-600" size={28} />
                        ETP Charges Reference
                    </h1>
                    <p className="text-app-muted mt-1">
                        Current statutory deductions, levies, and recoveries applicable to bills
                    </p>
                </div>
                <button
                    onClick={fetchCharges}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-app-text bg-app-card border border-app rounded-lg hover:bg-app-surface transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex-shrink-0">
                    <Info size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <p className="font-medium text-blue-800 dark:text-blue-300">Reference Information</p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-0.5">
                        This page displays all currently active ETP charges that will be applied to your bills.
                        Rates are set by the SPV administration as per government circulars.
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(chargesByType).map(([type, items]) => {
                    const style = getTypeStyle(type);
                    const Icon = style.icon;
                    return (
                        <motion.div
                            key={type}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`${style.bg} ${style.border} border rounded-xl p-4`}
                        >
                            <div className="flex items-center justify-between">
                                <span className={`text-xs font-semibold ${style.text} uppercase tracking-wider`}>
                                    {type}s
                                </span>
                                <Icon size={16} className={style.iconColor} />
                            </div>
                            <p className={`text-2xl font-bold ${style.text} mt-2`}>
                                {items.length}
                            </p>
                            <p className="text-xs text-app-muted mt-1">
                                {items.length === 1 ? 'charge' : 'charges'}
                            </p>
                        </motion.div>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search charges..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-app bg-app-input text-app-text focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                    />
                </div>

                {/* Type Filter */}
                <div className="flex gap-2 flex-wrap">
                    {['all', 'Deduction', 'Recovery', 'Levy', 'Addition'].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${filterType === type
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'bg-app-card text-app-text border border-app hover:bg-app-surface'
                                }`}
                        >
                            {type === 'all' ? 'All Types' : type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Charges Table */}
            <div className="bg-app-card rounded-xl border border-app-subtle overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-app-surface border-b border-app-subtle">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-app-text">Code</th>
                                <th className="text-left px-4 py-3 font-semibold text-app-text">Charge Name</th>
                                <th className="text-left px-4 py-3 font-semibold text-app-text">Type</th>
                                <th className="text-center px-4 py-3 font-semibold text-app-text">Rate</th>
                                <th className="text-left px-4 py-3 font-semibold text-app-text">Applied On</th>
                                <th className="text-left px-4 py-3 font-semibold text-app-text">Effective From</th>
                                <th className="text-left px-4 py-3 font-semibold text-app-text">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12">
                                        <RefreshCw className="animate-spin mx-auto text-primary-500 mb-2" size={28} />
                                        <p className="text-app-muted">Loading charges...</p>
                                    </td>
                                </tr>
                            ) : filteredCharges.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12">
                                        <Calculator size={32} className="mx-auto text-app-muted-light mb-2" />
                                        <p className="text-app-muted">No charges found</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredCharges.map((charge, idx) => {
                                    const style = getTypeStyle(charge.charge_type);
                                    return (
                                        <motion.tr
                                            key={charge.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="hover:bg-app-surface transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-app-heading font-medium">
                                                    {charge.code}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-medium text-app-heading">
                                                    {charge.name}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${style.bg} ${style.text} ${style.border} border`}>
                                                    {charge.charge_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center justify-center min-w-[60px] px-3 py-1 bg-app-surface rounded font-mono font-bold text-app-heading">
                                                    {charge.rate_percentage}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-app-muted">
                                                {charge.basis_of_calculation}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1 text-app-muted">
                                                    <Calendar size={14} className="text-app-muted" />
                                                    {formatDate(charge.effective_date)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-app-muted text-xs">
                                                {charge.govt_reference || '-'}
                                            </td>
                                        </motion.tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Help Section */}
            <div className="bg-app-surface rounded-xl p-6 border border-app-subtle">
                <h3 className="font-semibold text-app-heading flex items-center gap-2 mb-4">
                    <HelpCircle size={18} className="text-primary-600" />
                    Understanding ETP Charges
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-app-muted">
                    <div>
                        <h4 className="font-medium text-app-text mb-2">Charge Types</h4>
                        <ul className="space-y-1.5">
                            <li className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                <strong>Deduction:</strong> Subtracted from bill (e.g., TDS)
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                <strong>Recovery:</strong> Recovered amounts (e.g., Advances)
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                <strong>Levy:</strong> Government levies (e.g., Labour Cess)
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <strong>Addition:</strong> Added to bill (e.g., Price Escalation)
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-medium text-app-text mb-2">Calculation Basis</h4>
                        <ul className="space-y-1.5">
                            <li><strong>Gross Bill Value:</strong> Percentage on total bill amount</li>
                            <li><strong>Works Component:</strong> Percentage on works portion only</li>
                            <li><strong>Material/Labour Cost:</strong> Percentage on specific cost heads</li>
                            <li><strong>Net Payable:</strong> Percentage on final payable amount</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ETPMaster;
