import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    Search,
    Plus,
    Filter,
    MoreVertical,
    Mail,
    Phone,
    MapPin,
    FileBadge,
    Trash2,
    Eye,
    Pencil
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMockData } from '@/hooks/useMockData';
import { AddContractorModal } from '@/components/procurement/AddContractorModal';
import { ContractorDetailModal } from '@/components/procurement/ContractorDetailModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from 'sonner';

const Procurement = () => {
    const { t } = useLanguage();
    const {
        contractors,
        projects,
        packages,
        addContractor,
        deleteContractor,
        addProject,
        addPackage,
        updateContractor
    } = useMockData();
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingContractor, setEditingContractor] = useState(null);

    // Detail Modal State
    const [selectedContractor, setSelectedContractor] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Dropdown State
    const [activeDropdown, setActiveDropdown] = useState(null);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleContractorClick = (contractor) => {
        setSelectedContractor(contractor);
        setIsDetailModalOpen(true);
    };

    const handleEditContractor = (e, contractor) => {
        e.stopPropagation();
        setEditingContractor(contractor);
        setIsAddModalOpen(true);
        setActiveDropdown(null);
    };

    const handleSaveContractor = async (data) => {
        if (editingContractor) {
            await updateContractor(editingContractor.id, data);
            toast.success('Contractor updated successfully');
        } else {
            await addContractor(data);
        }
        setEditingContractor(null);
        setIsAddModalOpen(false);
    };

    const handleModalClose = () => {
        setIsAddModalOpen(false);
        setEditingContractor(null);
    };

    const handleDeleteContractor = async (e, id) => {
        e.stopPropagation(); // Prevent card click
        if (confirm('Are you sure you want to delete this contractor? This action cannot be undone.')) {
            try {
                await deleteContractor(id);
                toast.success('Contractor deleted successfully');
                setActiveDropdown(null);
            } catch (error) {
                toast.error('Failed to delete contractor');
            }
        }
    };

    const toggleDropdown = (e, id) => {
        e.stopPropagation();
        setActiveDropdown(activeDropdown === id ? null : id);
    };

    // Filter contractors based on search
    const filteredContractors = contractors.filter(c =>
        c.contractorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.panNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.gstinNo?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeContractors = filteredContractors.filter(c => c.status === 'Active').length;

    return (
        <div className="p-6 space-y-6" onClick={() => setActiveDropdown(null)}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-slate-900">Procurement</h1>
                    <p className="text-slate-500 mt-1">Manage contractors, vendors, and suppliers</p>
                </div>
                <Button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-primary-950 text-white hover:bg-primary-900 shadow-lg shadow-primary-950/20"
                >
                    <Plus size={18} />
                    <span>Add Contractor</span>
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Contractors', value: contractors.length, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Active Contracts', value: activeContractors, icon: FileBadge, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Pending Approvals', value: '0', icon: Filter, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((stat, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="p-6 flex items-center gap-4 hover:shadow-lg transition-shadow duration-300">
                            <div className={`p-4 rounded-xl ${stat.bg}`}>
                                <stat.icon className={stat.color} size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Search and Filter Bar */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search contractors by name, PAN, or GSTIN..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex items-center gap-2">
                            <Filter size={18} />
                            <span>Filter</span>
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Contractors Grid */}
            {filteredContractors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredContractors.map((contractor, index) => (
                        <motion.div
                            key={contractor.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <div onClick={() => handleContractorClick(contractor)}>
                                <Card className="h-full hover:shadow-xl transition-all duration-300 group cursor-pointer border-slate-200/60 relative">
                                    <div className="p-6 space-y-4">
                                        <div className="flex justify-between items-start relative">
                                            <div className="p-3 rounded-lg bg-primary-50 text-primary-700 group-hover:bg-primary-600 group-hover:text-white transition-colors duration-300">
                                                <Building2 size={24} />
                                            </div>
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => toggleDropdown(e, contractor.id)}
                                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                                                >
                                                    <MoreVertical size={20} />
                                                </button>

                                                {/* Dropdown Menu */}
                                                <AnimatePresence>
                                                    {activeDropdown === contractor.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                            className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 z-20 overflow-hidden"
                                                            onClick={(e) => e.stopPropagation()}
                                                            ref={dropdownRef}
                                                        >
                                                            <div className="p-1">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleContractorClick(contractor);
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
                                                                >
                                                                    <Eye size={16} /> View Details
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleEditContractor(e, contractor)}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
                                                                >
                                                                    <Pencil size={16} /> Edit Details
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleDeleteContractor(e, contractor.id)}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                                                                >
                                                                    <Trash2 size={16} /> Delete Contractor
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-700 transition-colors">
                                                {contractor.contractorName}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    {contractor.status || 'Active'}
                                                </span>
                                                <span className="text-sm text-slate-500">• {contractor.projects || 0} Active Projects</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-4 border-t border-slate-100">
                                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                                <FileBadge size={16} className="text-slate-400" />
                                                <span className="font-mono">{contractor.gstinNo}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                                <MapPin size={16} className="text-slate-400" />
                                                <span className="truncate">{contractor.city}, {contractor.state}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                                <Mail size={16} className="text-slate-400" />
                                                <span className="truncate">{contractor.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={Building2}
                    title="No Contractors Found"
                    description={searchQuery ? "No contractors match your search." : "Get started by adding your first contractor."}
                    actionLabel="Add Contractor"
                    onAction={() => setIsAddModalOpen(true)}
                />
            )}

            <AddContractorModal
                isOpen={isAddModalOpen}
                onClose={handleModalClose}
                onSave={handleSaveContractor}
                projects={projects}
                packages={packages}
                onAddProject={addProject}
                onAddPackage={addPackage}
                contractor={editingContractor}
            />

            <ContractorDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                contractor={selectedContractor}
            />
        </div>
    );
};

export default Procurement;
