import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Building2, MapPin, FileText, Users, Calculator,
    Plus, Search, Edit2, Trash2, RefreshCw, Database
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import mastersService from '@/api/services/mastersService';
import Button from '@/components/ui/Button';
import MasterFormModal from '@/components/masters/MasterFormModal';
import DeleteConfirmModal from '@/components/masters/DeleteConfirmModal';
import * as fieldConfigs from '@/components/masters/fieldConfigs';
import { toast } from 'sonner';

// Tab Configuration
const TABS = [
    { id: 'hierarchy', label: 'Hierarchy', icon: Building2, color: 'emerald' },
    { id: 'geography', label: 'Geography', icon: MapPin, color: 'blue' },
    { id: 'classification', label: 'Classification', icon: FileText, color: 'purple' },
    { id: 'entities', label: 'Contractors', icon: Users, color: 'amber' },
    { id: 'etp', label: 'ETP Charges', icon: Calculator, color: 'rose' },
];

// Master type definitions for each tab
const MASTER_TYPES = {
    hierarchy: ['zones', 'circles', 'divisions', 'subdivisions'],
    geography: ['districts', 'towns'],
    classification: ['schemeTypes', 'schemes', 'workTypes', 'projectCategories'],
    entities: ['contractors'],
    etp: ['etpCharges'],
};

const MasterData = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('hierarchy');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [currentMasterType, setCurrentMasterType] = useState(null);
    const [currentItem, setCurrentItem] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Data states
    const [data, setData] = useState({
        zones: [],
        circles: [],
        divisions: [],
        subdivisions: [],
        districts: [],
        towns: [],
        schemeTypes: [],
        schemes: [],
        workTypes: [],
        projectCategories: [],
        contractors: [],
        etpCharges: [],
    });

    // Check if user can edit
    const canEdit = user?.is_superuser || user?.role === 'SPV_Official';

    // Fetch data
    useEffect(() => {
        fetchTabData(activeTab);
    }, [activeTab]);

    const fetchTabData = async (tab) => {
        setLoading(true);
        try {
            const fetchMap = {
                hierarchy: async () => {
                    const [z, c, d, s] = await Promise.all([
                        mastersService.getZones(),
                        mastersService.getCircles(),
                        mastersService.getDivisions(),
                        mastersService.getSubDivisions(),
                    ]);
                    return { zones: z.data, circles: c.data, divisions: d.data, subdivisions: s.data };
                },
                geography: async () => {
                    const [d, t] = await Promise.all([
                        mastersService.getDistricts(),
                        mastersService.getTowns(),
                    ]);
                    return { districts: d.data, towns: t.data };
                },
                classification: async () => {
                    const [st, s, wt, pc] = await Promise.all([
                        mastersService.getSchemeTypes(),
                        mastersService.getSchemes(),
                        mastersService.getWorkTypes(),
                        mastersService.getProjectCategories(),
                    ]);
                    return { schemeTypes: st.data, schemes: s.data, workTypes: wt.data, projectCategories: pc.data };
                },
                entities: async () => {
                    const c = await mastersService.getContractors();
                    return { contractors: c.data };
                },
                etp: async () => {
                    const e = await mastersService.getETPCharges();
                    return { etpCharges: e.data };
                },
            };

            const newData = await fetchMap[tab]();
            setData(prev => ({ ...prev, ...newData }));
        } catch (error) {
            console.error('Failed to fetch:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    // CRUD handlers
    const handleAdd = (masterType) => {
        setCurrentMasterType(masterType);
        setCurrentItem(null);
        setFormModalOpen(true);
    };

    const handleEdit = (masterType, item) => {
        setCurrentMasterType(masterType);
        setCurrentItem(item);
        setFormModalOpen(true);
    };

    const handleDelete = (masterType, item) => {
        setCurrentMasterType(masterType);
        setCurrentItem(item);
        setDeleteModalOpen(true);
    };

    const handleFormSubmit = async (formData) => {
        setSubmitting(true);
        try {
            const serviceMap = {
                zones: { create: mastersService.createZone, update: mastersService.updateZone },
                circles: { create: mastersService.createCircle, update: mastersService.updateCircle },
                divisions: { create: mastersService.createDivision, update: mastersService.updateDivision },
                subdivisions: { create: mastersService.createSubDivision, update: mastersService.updateSubDivision },
                districts: { create: mastersService.createDistrict, update: mastersService.updateDistrict },
                towns: { create: mastersService.createTown, update: mastersService.updateTown },
                schemeTypes: { create: mastersService.createSchemeType, update: mastersService.updateSchemeType },
                schemes: { create: mastersService.createScheme, update: mastersService.updateScheme },
                workTypes: { create: mastersService.createWorkType, update: mastersService.updateWorkType },
                projectCategories: { create: mastersService.createProjectCategory, update: mastersService.updateProjectCategory },
                contractors: { create: mastersService.createContractor, update: mastersService.updateContractor },
                etpCharges: { create: mastersService.createETPCharge, update: mastersService.updateETPCharge },
            };

            const service = serviceMap[currentMasterType];
            if (currentItem) {
                await service.update(currentItem.id, formData);
                toast.success('Record updated successfully');
            } else {
                await service.create(formData);
                toast.success('Record created successfully');
            }

            setFormModalOpen(false);
            fetchTabData(activeTab);
        } catch (error) {
            console.error('Save failed:', error);
            toast.error(error.response?.data?.detail || 'Failed to save record');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        setSubmitting(true);
        try {
            const deleteMap = {
                zones: mastersService.deleteZone,
                circles: mastersService.deleteCircle,
                divisions: mastersService.deleteDivision,
                subdivisions: mastersService.deleteSubDivision,
                districts: mastersService.deleteDistrict,
                towns: mastersService.deleteTown,
                schemeTypes: mastersService.deleteSchemeType,
                schemes: mastersService.deleteScheme,
                workTypes: mastersService.deleteWorkType,
                projectCategories: mastersService.deleteProjectCategory,
                contractors: mastersService.deleteContractor,
                etpCharges: mastersService.deleteETPCharge,
            };

            await deleteMap[currentMasterType](currentItem.id);
            toast.success('Record deleted successfully');
            setDeleteModalOpen(false);
            fetchTabData(activeTab);
        } catch (error) {
            console.error('Delete failed:', error);
            const msg = error.response?.status === 403
                ? 'You do not have permission to delete this record'
                : error.response?.data?.detail || 'Cannot delete: record may be in use';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // Get field config for current master type
    const getFieldConfig = (masterType) => {
        const configMap = {
            zones: fieldConfigs.zoneFields,
            circles: fieldConfigs.circleFields(data.zones),
            divisions: fieldConfigs.divisionFields(data.circles),
            subdivisions: fieldConfigs.subDivisionFields(data.divisions),
            districts: fieldConfigs.districtFields,
            towns: fieldConfigs.townFields(data.districts),
            schemeTypes: fieldConfigs.schemeTypeFields,
            schemes: fieldConfigs.schemeFields(data.schemeTypes),
            workTypes: fieldConfigs.workTypeFields,
            projectCategories: fieldConfigs.projectCategoryFields,
            contractors: fieldConfigs.contractorFields,
            etpCharges: fieldConfigs.etpFields,
        };
        return configMap[masterType] || [];
    };

    // Get modal title
    const getModalTitle = (masterType, isEdit) => {
        const titles = {
            zones: 'Zone',
            circles: 'Circle',
            divisions: 'Division',
            subdivisions: 'Sub-Division',
            districts: 'District',
            towns: 'Town/City',
            schemeTypes: 'Scheme Type',
            schemes: 'Scheme',
            workTypes: 'Work Type',
            projectCategories: 'Project Category',
            contractors: 'Contractor',
            etpCharges: 'ETP Charge',
        };
        return `${isEdit ? 'Edit' : 'Add'} ${titles[masterType] || 'Record'}`;
    };

    // Status badge
    const statusBadge = (status) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}>
            {status}
        </span>
    );

    // Render table
    const renderDataTable = (dataKey, columns, title, masterType) => {
        const items = data[dataKey] || [];
        const filtered = items.filter(item =>
            Object.values(item).some(val =>
                String(val).toLowerCase().includes(searchQuery.toLowerCase())
            )
        );

        return (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-700">{title}</h3>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {filtered.length}
                        </span>
                    </div>
                    {canEdit && (
                        <Button size="sm" variant="outline" onClick={() => handleAdd(masterType)}>
                            <Plus size={14} className="mr-1" />
                            Add
                        </Button>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                {columns.map(col => (
                                    <th key={col.key} className="text-left px-4 py-3 font-medium text-slate-600">
                                        {col.label}
                                    </th>
                                ))}
                                {canEdit && <th className="text-right px-4 py-3 font-medium text-slate-600 w-24">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + (canEdit ? 1 : 0)} className="text-center py-8 text-slate-400">
                                        <Database size={32} className="mx-auto mb-2 opacity-30" />
                                        No records found
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((item, idx) => (
                                    <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                                        {columns.map(col => (
                                            <td key={col.key} className="px-4 py-3 text-slate-700">
                                                {col.render ? col.render(item[col.key], item) : item[col.key] || '-'}
                                            </td>
                                        ))}
                                        {canEdit && (
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleEdit(masterType, item)}
                                                    className="p-1.5 text-slate-400 hover:text-primary-600 transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(masterType, item)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 transition-colors ml-1"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Tab content
    const renderTabContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center py-20">
                    <RefreshCw className="animate-spin text-primary-500" size={32} />
                </div>
            );
        }

        switch (activeTab) {
            case 'hierarchy':
                return (
                    <div className="space-y-6">
                        {renderDataTable('zones', [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'Zone Name' },
                            { key: 'state_covered', label: 'State/Region' },
                            { key: 'head', label: 'Zone Head' },
                            { key: 'status', label: 'Status', render: statusBadge },
                        ], 'Zones', 'zones')}

                        {renderDataTable('circles', [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'Circle Name' },
                            { key: 'zone_name', label: 'Zone' },
                            { key: 'authority_level', label: 'Authority' },
                            { key: 'status', label: 'Status', render: statusBadge },
                        ], 'Circles', 'circles')}

                        {renderDataTable('divisions', [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'Division Name' },
                            { key: 'circle_name', label: 'Circle' },
                            { key: 'hod', label: 'HOD' },
                            { key: 'status', label: 'Status', render: statusBadge },
                        ], 'Divisions', 'divisions')}

                        {renderDataTable('subdivisions', [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'Sub-Division Name' },
                            { key: 'division_name', label: 'Division' },
                            { key: 'jurisdiction_area', label: 'Jurisdiction' },
                        ], 'Sub-Divisions', 'subdivisions')}
                    </div>
                );

            case 'geography':
                return (
                    <div className="space-y-6">
                        {renderDataTable('districts', [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'District Name' },
                            { key: 'state_name', label: 'State' },
                            { key: 'pincode_range', label: 'Pincode Range' },
                        ], 'Districts', 'districts')}

                        {renderDataTable('towns', [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'Town/City Name' },
                            { key: 'district_name', label: 'District' },
                            { key: 'classification', label: 'Classification' },
                            { key: 'population', label: 'Population' },
                        ], 'Towns/Cities', 'towns')}
                    </div>
                );

            case 'classification':
                return (
                    <div className="space-y-6">
                        {renderDataTable('schemeTypes', [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'Scheme Type' },
                            { key: 'category', label: 'Category' },
                        ], 'Scheme Types', 'schemeTypes')}

                        {renderDataTable('schemes', [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'Scheme Name' },
                            { key: 'scheme_type_name', label: 'Type' },
                            { key: 'funding_agency', label: 'Funding Agency' },
                        ], 'Schemes', 'schemes')}

                        {renderDataTable('workTypes', [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'Work Type' },
                            { key: 'sector', label: 'Sector' },
                            { key: 'unit_of_measurement', label: 'UoM' },
                        ], 'Work Types', 'workTypes')}

                        {renderDataTable('projectCategories', [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'Category' },
                            { key: 'threshold_value', label: 'Threshold (₹)', render: (val) => `₹${Number(val).toLocaleString('en-IN')}` },
                            { key: 'approval_authority', label: 'Approval Authority' },
                        ], 'Project Categories', 'projectCategories')}
                    </div>
                );

            case 'entities':
                return renderDataTable('contractors', [
                    { key: 'code', label: 'Code' },
                    { key: 'name', label: 'Contractor Name' },
                    { key: 'contractor_type', label: 'Type' },
                    { key: 'registration_class', label: 'Class' },
                    {
                        key: 'blacklisted', label: 'Status', render: (val) => (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${val ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                {val ? 'Blacklisted' : 'Active'}
                            </span>
                        )
                    },
                ], 'Contractors', 'contractors');

            case 'etp':
                return renderDataTable('etpCharges', [
                    { key: 'code', label: 'Code' },
                    { key: 'name', label: 'Charge Name' },
                    {
                        key: 'charge_type', label: 'Type', render: (val) => (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${val === 'Deduction' ? 'bg-red-100 text-red-700' :
                                    val === 'Recovery' ? 'bg-amber-100 text-amber-700' :
                                        'bg-blue-100 text-blue-700'
                                }`}>
                                {val}
                            </span>
                        )
                    },
                    { key: 'rate_percentage', label: 'Rate', render: (val) => `${val}%` },
                    { key: 'basis_of_calculation', label: 'Basis' },
                    { key: 'is_active', label: 'Active', render: (val) => val ? '✓' : '✗' },
                ], 'ETP Charges', 'etpCharges');

            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Master Data</h1>
                    <p className="text-slate-500 mt-1">Manage reference data for projects, billing, and administration</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchTabData(activeTab)}>
                    <RefreshCw size={16} className="mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${isActive
                                    ? `bg-${tab.color}-100 text-${tab.color}-700 shadow-sm`
                                    : 'text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search records..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                />
            </div>

            {/* View-only notice */}
            {!canEdit && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                        <Users size={18} className="text-amber-600" />
                    </div>
                    <div>
                        <p className="font-medium text-amber-800">View-Only Access</p>
                        <p className="text-sm text-amber-600">Only Super Admins can create, edit, or delete master records.</p>
                    </div>
                </div>
            )}

            {/* Content */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                {renderTabContent()}
            </motion.div>

            {/* Form Modal */}
            <MasterFormModal
                isOpen={formModalOpen}
                onClose={() => setFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                title={getModalTitle(currentMasterType, !!currentItem)}
                fields={getFieldConfig(currentMasterType)}
                initialData={currentItem}
                loading={submitting}
            />

            {/* Delete Modal */}
            <DeleteConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem ? `${currentItem.code} - ${currentItem.name}` : ''}
                loading={submitting}
            />
        </div>
    );
};

export default MasterData;
