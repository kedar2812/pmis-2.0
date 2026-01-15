import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Plus, Search, Filter, Calendar, DollarSign,
    Building2, CheckCircle2, Clock, AlertCircle, ChevronRight,
    Gavel, FileSignature, TrendingUp, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import procurementService from '@/api/services/procurementService';
import projectService from '@/api/services/projectService';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from 'sonner';

const EProcurement = () => {
    const { t } = useLanguage();
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState('tenders');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Data State
    const [tenders, setTenders] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [summary, setSummary] = useState({ total_contracts: 0, active_contracts: 0, total_value: 0, total_variations: 0 });
    const [projects, setProjects] = useState([]);

    // Fetch data on mount
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [tendersRes, contractsRes, summaryRes, projectsData] = await Promise.all([
                procurementService.getTenders(),
                procurementService.getContracts(),
                procurementService.getContractsSummary(),
                projectService.getAllProjects()
            ]);
            setTenders(tendersRes.results || tendersRes || []);
            setContracts(contractsRes.results || contractsRes || []);
            setSummary(summaryRes || { total_contracts: 0, active_contracts: 0, total_value: 0, total_variations: 0 });
            setProjects(projectsData || []);
        } catch (error) {
            console.error('Failed to fetch procurement data:', error);
            toast.error('Failed to load procurement data');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusColors = {
            DRAFT: 'bg-slate-100 text-slate-700',
            PUBLISHED: 'bg-blue-100 text-blue-700',
            BID_OPEN: 'bg-purple-100 text-purple-700',
            EVALUATION: 'bg-amber-100 text-amber-700',
            AWARDED: 'bg-green-100 text-green-700',
            CANCELLED: 'bg-red-100 text-red-700',
            CLOSED: 'bg-slate-200 text-slate-600',
            ACTIVE: 'bg-green-100 text-green-700',
            SIGNED: 'bg-blue-100 text-blue-700',
            COMPLETED: 'bg-emerald-100 text-emerald-700',
            TERMINATED: 'bg-red-100 text-red-700',
        };
        return statusColors[status] || 'bg-slate-100 text-slate-700';
    };

    const formatCurrency = (amount) => {
        const num = Number(amount) || 0;
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
        return `₹${num.toLocaleString('en-IN')}`;
    };

    const tabs = [
        { id: 'tenders', label: 'Tenders', icon: Gavel, count: tenders.length },
        { id: 'contracts', label: 'Contracts', icon: FileSignature, count: contracts.length },
    ];

    const filteredTenders = tenders.filter(t =>
        t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tender_no?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredContracts = contracts.filter(c =>
        c.contract_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contractor_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white">e-Procurement</h1>
                    <p className="text-slate-500 dark:text-neutral-400 mt-1">Tendering, Bid Evaluation, Contract Lifecycle & Variation Management</p>
                </div>
                <Button className="flex items-center gap-2 bg-primary-950 text-white hover:bg-primary-900">
                    <Plus size={18} />
                    <span>New Tender</span>
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Active Tenders', value: tenders.filter(t => t.status !== 'CLOSED' && t.status !== 'CANCELLED').length, icon: Gavel, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Active Contracts', value: summary.active_contracts, icon: FileSignature, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Total Value', value: formatCurrency(summary.total_value), icon: DollarSign, color: 'text-primary-600', bg: 'bg-primary-50' },
                    { label: 'Variations', value: formatCurrency(summary.total_variations), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((stat, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                        <Card className="p-4 hover:shadow-lg transition-shadow">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-xl ${stat.bg}`}>
                                    <stat.icon className={stat.color} size={20} />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-neutral-400">{stat.label}</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 dark:border-neutral-700">
                <div className="flex gap-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 py-3 px-1 border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <tab.icon size={18} />
                            <span className="font-medium dark:text-white">{tab.label}</span>
                            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 dark:bg-neutral-700 text-slate-600 dark:text-neutral-300'
                                }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Search */}
            <Card className="p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder={`Search ${activeTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            </Card>

            {/* Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'tenders' && (
                    <motion.div
                        key="tenders"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                    >
                        {filteredTenders.length > 0 ? (
                            filteredTenders.map((tender, idx) => (
                                <motion.div
                                    key={tender.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <Card className="p-4 hover:shadow-lg transition-all cursor-pointer group">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-sm font-mono text-slate-500 dark:text-neutral-400">{tender.tender_no}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(tender.status)}`}>
                                                        {tender.status_display}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">
                                                    {tender.title}
                                                </h3>
                                                <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">{tender.project_name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(tender.estimated_value)}</p>
                                                <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">
                                                    {tender.bids_count || 0} bids
                                                </p>
                                                {tender.submission_deadline && (
                                                    <p className="text-xs text-slate-400 mt-2 flex items-center justify-end gap-1">
                                                        <Clock size={12} />
                                                        {new Date(tender.submission_deadline).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))
                        ) : (
                            <EmptyState
                                icon={Gavel}
                                title="No Tenders Found"
                                description="Create your first tender to start the procurement process."
                                actionLabel="Create Tender"
                                onAction={() => toast.info('Tender creation modal coming soon')}
                            />
                        )}
                    </motion.div>
                )}

                {activeTab === 'contracts' && (
                    <motion.div
                        key="contracts"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                    >
                        {filteredContracts.length > 0 ? (
                            filteredContracts.map((contract, idx) => (
                                <motion.div
                                    key={contract.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <Card className="p-4 hover:shadow-lg transition-all cursor-pointer group">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-sm font-mono text-slate-500 dark:text-neutral-400">{contract.contract_no}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(contract.status)}`}>
                                                        {contract.status_display}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors flex items-center gap-2">
                                                    <Building2 size={18} className="text-slate-400" />
                                                    {contract.contractor_name}
                                                </h3>
                                                <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">{contract.project_name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(contract.contract_value)}</p>
                                                {contract.variations_count > 0 && (
                                                    <p className="text-sm text-amber-600 mt-1">
                                                        {contract.variations_count} variations
                                                    </p>
                                                )}
                                                <p className="text-xs text-slate-400 dark:text-neutral-500 mt-2">
                                                    {contract.start_date} → {contract.end_date}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))
                        ) : (
                            <EmptyState
                                icon={FileSignature}
                                title="No Contracts Found"
                                description="Contracts are created when a tender is awarded."
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EProcurement;
