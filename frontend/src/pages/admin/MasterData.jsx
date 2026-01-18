import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Building2, MapPin, FileText, Users, Calculator,
    Plus, Search, Edit2, Trash2, RefreshCw, Database,
    Ban, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import mastersService from '@/api/services/mastersService';
import financeService from '@/api/services/financeService';
import api from '@/api/client';
import Button from '@/components/ui/Button';
import MasterFormModal from '@/components/masters/MasterFormModal';
import DeleteConfirmModal from '@/components/masters/DeleteConfirmModal';
import SortableDataTable from '@/components/ui/SortableDataTable';
import * as fieldConfigs from '@/components/masters/fieldConfigs';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';

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

    // Common data needed for dropdowns
    const [users, setUsers] = useState([]);
    const [fundingSources, setFundingSources] = useState([]);

    // Blacklist modal state
    const [blacklistModal, setBlacklistModal] = useState({ open: false, contractor: null });
    const [blacklistReason, setBlacklistReason] = useState('');
    const [blacklisting, setBlacklisting] = useState(false);

    // Check if user can edit
    const canEdit = user?.is_superuser || user?.role === 'SPV_Official';

    // Fetch common data on mount (users and funding sources)
    useEffect(() => {
        fetchCommonData();
    }, []);

    const fetchCommonData = async () => {
        try {
            // Fetch all active users for dropdowns
            const usersRes = await api.get('/users/');
            const usersData = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data.results || []);
            setUsers(usersData.filter(u => u.account_status === 'ACTIVE' && u.role !== 'EPC_Contractor'));

            // Fetch funding sources from fund management
            try {
                const fundsRes = await financeService.getFunds();
                const funds = fundsRes.data || [];
                // Extract unique source names
                const sources = [...new Map(funds.map(f => [f.source_name, f])).values()];
                setFundingSources(sources);
            } catch (err) {
                console.log('Fund sources not available yet');
            }
        } catch (err) {
            console.error('Failed to fetch common data:', err);
        }
    };

    // Fetch tab data
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
            divisions: fieldConfigs.divisionFields(data.circles, users),
            subdivisions: fieldConfigs.subDivisionFields(data.divisions, users),
            districts: fieldConfigs.districtFields,
            towns: fieldConfigs.townFields(data.districts),
            schemeTypes: fieldConfigs.schemeTypeFields,
            schemes: fieldConfigs.schemeFields(data.schemeTypes, fundingSources),
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


    const handleStatusUpdate = async (masterType, item, newStatus) => {
        try {
            const serviceMap = {
                zones: mastersService.updateZone,
                circles: mastersService.updateCircle,
                divisions: mastersService.updateDivision,
                subdivisions: mastersService.updateSubDivision,
                districts: mastersService.updateDistrict,
                towns: mastersService.updateTown,
                schemeTypes: mastersService.updateSchemeType,
                schemes: mastersService.updateScheme,
                workTypes: mastersService.updateWorkType,
                projectCategories: mastersService.updateProjectCategory,
                // contractors handles separately
                etpCharges: mastersService.updateETPCharge, // expects is_active bool
            };

            const updateFn = serviceMap[masterType];
            if (!updateFn) {
                toast.error(`Status update not supported for ${masterType}`);
                return;
            }

            let payload = { status: newStatus };
            if (masterType === 'etpCharges') {
                payload = { is_active: newStatus === 'ACTIVE' };
            }

            await updateFn(item.id, payload);
            toast.success('Status updated');
            fetchTabData(activeTab);
        } catch (error) {
            console.error('Status update failed', error);
            toast.error('Failed to update status');
            throw error;
        }
    };

    // Status badge helper for standard masters
    const statusBadge = (val, item, masterType = activeTab) => {
        // Some tables pass (val, item), renderDataTable passes (val, item) to col.render
        // We need to know masterType. renderDataTable needs to pass it or we assume activeTab's types?
        // Actually, renderDataTable calls it as col.render(item[col.key], item)
        // But renderDataTable is generic. The masterType is passed to renderDataTable.
        // We can wrap this in renderDataTable or just use a closure?
        // Let's rely on the fact that `renderDataTable` knows the `masterType`.
        // Wait, `renderDataTable` calls `col.render`.
        // I will change the column definition in `renderTabContent` to pass the masterType implicitly or explicitly.

        return (
            <StatusBadge
                status={val || 'Active'} // Default to Active if undefined
                onToggle={(newStatus) => handleStatusUpdate(masterType, item, newStatus)}
                entityName={item.name || item.code}
                activeValue="Active"
                inactiveValue="Inactive"
            />
        );
    };

    // Render table with SortableDataTable component
    const renderDataTable = (dataKey, columns, title, masterType) => {
        const items = data[dataKey] || [];

        // Row actions for edit/delete
        const rowActions = canEdit ? (item) => (
            <>
                <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(masterType, item); }}
                    className="p-1.5 text-app-muted hover:text-primary-600 transition-colors"
                    title="Edit"
                >
                    <Edit2 size={16} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(masterType, item); }}
                    className="p-1.5 text-app-muted hover:text-red-600 transition-colors ml-1"
                    title="Delete"
                >
                    <Trash2 size={16} />
                </button>
            </>
        ) : null;

        // Header actions for Add button
        const headerActions = canEdit ? (
            <Button size="sm" variant="outline" onClick={() => handleAdd(masterType)}>
                <Plus size={14} className="mr-1" />
                Add
            </Button>
        ) : null;

        return (
            <SortableDataTable
                data={items}
                columns={columns}
                title={title}
                headerActions={headerActions}
                rowActions={rowActions}
                pageSize={15}
                defaultSortKey="name"
                searchPlaceholder={`Search ${title.toLowerCase()}...`}
            />
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
                            { key: 'status', label: 'Status', render: (val, item) => statusBadge(val, item, 'zones') },
                        ], 'Zones', 'zones')}

                        {renderDataTable('circles', [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'Circle Name' },
                            { key: 'zone_name', label: 'Zone' },
                            { key: 'authority_level', label: 'Authority' },
                            { key: 'status', label: 'Status', render: (val, item) => statusBadge(val, item, 'circles') },
                        ], 'Circles', 'circles')}

                        {renderDataTable('divisions', [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'Division Name' },
                            { key: 'circle_name', label: 'Circle' },
                            { key: 'hod', label: 'HOD' },
                            { key: 'status', label: 'Status', render: (val, item) => statusBadge(val, item, 'divisions') },
                        ], 'Divisions', 'divisions')}

                        {renderDataTable('subdivisions', [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'Sub-Division Name' },
                            { key: 'division_name', label: 'Division' },
                            { key: 'jurisdiction_area', label: 'Jurisdiction' },
                            { key: 'status', label: 'Status', render: (val, item) => statusBadge(val, item, 'subdivisions') },
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
                            { key: 'status', label: 'Status', render: (val, item) => statusBadge(val, item, 'districts') },
                        ], 'Districts', 'districts')}

                        {renderDataTable('towns', [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'Town/City Name' },
                            { key: 'district_name', label: 'District' },
                            { key: 'classification', label: 'Classification' },
                            { key: 'population', label: 'Population' },
                            { key: 'status', label: 'Status', render: (val, item) => statusBadge(val, item, 'towns') },
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
                            { key: 'status', label: 'Status', render: (val, item) => statusBadge(val, item, 'schemeTypes') },
                        ], 'Scheme Types', 'schemeTypes')}

                        {renderDataTable('schemes', [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'Scheme Name' },
                            { key: 'scheme_type_name', label: 'Type' },
                            { key: 'funding_agency', label: 'Funding Agency' },
                            { key: 'status', label: 'Status', render: (val, item) => statusBadge(val, item, 'schemes') },
                        ], 'Schemes', 'schemes')}

                        {renderDataTable('workTypes', [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'Work Type' },
                            { key: 'sector', label: 'Sector' },
                            { key: 'unit_of_measurement', label: 'UoM' },
                            { key: 'status', label: 'Status', render: (val, item) => statusBadge(val, item, 'workTypes') },
                        ], 'Work Types', 'workTypes')}

                        {renderDataTable('projectCategories', [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'Category' },
                            { key: 'threshold_value', label: 'Threshold (₹)', render: (val) => `₹${Number(val).toLocaleString('en-IN')}` },
                            { key: 'approval_authority', label: 'Approval Authority' },
                            { key: 'status', label: 'Status', render: (val, item) => statusBadge(val, item, 'projectCategories') },
                        ], 'Project Categories', 'projectCategories')}
                    </div>
                );

            case 'entities':
                // Handle contractor blacklist toggle
                const handleBlacklistToggle = async (contractor) => {
                    if (contractor.blacklisted) {
                        // Unblacklist
                        try {
                            await mastersService.updateContractor(contractor.id, {
                                blacklisted: false,
                                blacklist_reason: ''
                            });
                            toast.success('Contractor restored to active status');
                            fetchTabData('entities');
                        } catch (err) {
                            toast.error('Failed to restore contractor');
                        }
                    } else {
                        // Open blacklist modal
                        setBlacklistModal({ open: true, contractor });
                        setBlacklistReason('');
                    }
                };

                // Handle sync contractors from EPC Contractor users
                const handleSyncContractors = async () => {
                    try {
                        const response = await mastersService.syncContractorsFromUsers();
                        const { created, linked, errors } = response.data;
                        if (created > 0 || linked > 0) {
                            toast.success(`Synced ${created} new contractors, linked ${linked} existing`);
                            fetchTabData('entities');
                        } else if (errors && errors.length > 0) {
                            toast.error('Some contractors failed to sync');
                        } else {
                            toast.info('All EPC Contractor users are already synced');
                        }
                    } catch (err) {
                        console.error('Sync failed:', err);
                        toast.error('Failed to sync contractors from users');
                    }
                };

                const confirmBlacklist = async () => {
                    if (!blacklistModal.contractor) return;
                    setBlacklisting(true);
                    try {
                        await mastersService.updateContractor(blacklistModal.contractor.id, {
                            blacklisted: true,
                            blacklist_reason: blacklistReason || 'Blacklisted by admin'
                        });
                        toast.success('Contractor has been blacklisted');
                        setBlacklistModal({ open: false, contractor: null });
                        fetchTabData('entities');
                    } catch (err) {
                        toast.error('Failed to blacklist contractor');
                    } finally {
                        setBlacklisting(false);
                    }
                };

                return (
                    <>
                        {/* Contractors Table - Sync button, Blacklist action */}
                        <div className="bg-app-card rounded-xl border border-app-subtle overflow-hidden">
                            <div className="px-4 py-3 border-b border-app-subtle flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-app-heading">Contractors</h3>
                                    <span className="text-xs text-app-muted bg-app-surface px-2 py-0.5 rounded-full">
                                        {data.contractors?.length || 0}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-xs text-app-muted">
                                        <AlertCircle size={14} />
                                        Contractors self-register via public registration
                                    </div>
                                    {canEdit && (
                                        <button
                                            onClick={handleSyncContractors}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                                        >
                                            <RefreshCw size={14} />
                                            Sync from Users
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-app-surface">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-medium text-app-muted">Code</th>
                                            <th className="text-left px-4 py-3 font-medium text-app-muted">Contractor Name</th>
                                            <th className="text-left px-4 py-3 font-medium text-app-muted">Type</th>
                                            <th className="text-left px-4 py-3 font-medium text-app-muted">Class</th>
                                            <th className="text-left px-4 py-3 font-medium text-app-muted">Status</th>
                                            {canEdit && <th className="text-center px-4 py-3 font-medium text-app-muted w-32">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-app-subtle">
                                        {(data.contractors || []).filter(item =>
                                            Object.values(item).some(val =>
                                                String(val).toLowerCase().includes(searchQuery.toLowerCase())
                                            )
                                        ).map((contractor, idx) => (
                                            <tr key={contractor.id || idx} className="hover:bg-app-surface transition-colors">
                                                <td className="px-4 py-3 font-mono text-app-text">{contractor.code}</td>
                                                <td className="px-4 py-3 text-app-heading font-medium">{contractor.name}</td>
                                                <td className="px-4 py-3 text-app-muted">{contractor.contractor_type}</td>
                                                <td className="px-4 py-3 text-app-muted">{contractor.registration_class}</td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge
                                                        status={contractor.blacklisted ? 'BLACKLISTED' : 'ACTIVE'}
                                                        onToggle={() => handleBlacklistToggle(contractor)}
                                                        entityName={contractor.name}
                                                        activeValue="ACTIVE"
                                                        inactiveValue="BLACKLISTED"
                                                        customStyles={{
                                                            'BLACKLISTED': 'bg-red-50 text-red-700 border-red-200',
                                                            'ACTIVE': 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        }}
                                                    />
                                                </td>
                                                {canEdit && (
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => handleBlacklistToggle(contractor)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${contractor.blacklisted
                                                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                                                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                                                }`}
                                                        >
                                                            {contractor.blacklisted ? 'Restore' : 'Blacklist'}
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                        {(data.contractors || []).length === 0 && (
                                            <tr>
                                                <td colSpan={canEdit ? 6 : 5} className="text-center py-8 text-app-muted">
                                                    <Database size={32} className="mx-auto mb-2 opacity-30" />
                                                    No contractors registered yet
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Blacklist Reason Modal */}
                        {blacklistModal.open && (
                            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-app-card rounded-2xl shadow-xl w-full max-w-md mx-4"
                                >
                                    <div className="p-6 border-b border-app-subtle">
                                        <h2 className="text-xl font-bold text-app-heading flex items-center gap-2">
                                            <Ban className="text-red-600" size={24} />
                                            Blacklist Contractor
                                        </h2>
                                        <p className="text-sm text-app-muted mt-1">
                                            {blacklistModal.contractor?.name}
                                        </p>
                                    </div>
                                    <div className="p-6">
                                        <label className="block text-sm font-medium text-app-text-medium mb-2">
                                            Reason for Blacklisting <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={blacklistReason}
                                            onChange={(e) => setBlacklistReason(e.target.value)}
                                            placeholder="Enter reason for blacklisting this contractor..."
                                            rows={3}
                                            className="w-full px-4 py-2 bg-app-input text-app-text border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                        />
                                        <div className="flex justify-end gap-3 mt-6">
                                            <Button
                                                variant="outline"
                                                onClick={() => setBlacklistModal({ open: false, contractor: null })}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={confirmBlacklist}
                                                disabled={!blacklistReason.trim() || blacklisting}
                                                className="bg-red-600 hover:bg-red-700"
                                            >
                                                {blacklisting ? 'Processing...' : 'Confirm Blacklist'}
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </>
                );

            case 'etp':
                // Helper function for ETP status - considers is_active AND effective_date
                const getETPStatus = (item) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const effectiveDate = item.effective_date ? new Date(item.effective_date) : null;

                    if (!item.is_active) {
                        return { label: 'Inactive', style: 'bg-app-surface text-app-muted border border-app' };
                    }
                    if (effectiveDate && effectiveDate > today) {
                        return { label: 'Pending', style: 'bg-amber-50 text-amber-700 border border-amber-300' };
                    }
                    return { label: 'Active', style: 'bg-emerald-50 text-emerald-700 border border-emerald-300' };
                };

                return renderDataTable('etpCharges', [
                    { key: 'code', label: 'Code' },
                    { key: 'name', label: 'Charge Name' },
                    {
                        key: 'charge_type', label: 'Type', render: (val) => (
                            <span className={`px-2.5 py-1 rounded text-xs font-medium ${val === 'Deduction' ? 'bg-red-50 text-red-700 border border-red-200' :
                                val === 'Recovery' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                    val === 'Levy' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                        'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                {val}
                            </span>
                        )
                    },
                    {
                        key: 'rate_percentage', label: 'Rate', render: (val) => (
                            <span className="font-mono font-medium text-app-text">{val}%</span>
                        )
                    },
                    { key: 'basis_of_calculation', label: 'Basis' },
                    {
                        key: 'effective_date',
                        label: 'Effective From',
                        render: (val) => val ? new Date(val).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        }) : '-'
                    },
                    {
                        key: 'is_active',
                        label: 'Status',
                        render: (val, item) => {
                            const status = getETPStatus(item);
                            // If calculating status based on date (Pending), maybe readOnly?
                            // item.is_active is the source of truth for the switch.
                            // If is_active is false => Inactive.
                            // If true => Active or Pending.
                            return (
                                <StatusBadge
                                    status={item.is_active ? 'ACTIVE' : 'INACTIVE'}
                                    onToggle={(newStatus) => handleStatusUpdate('etpCharges', item, newStatus)}
                                    entityName={item.name}
                                    activeValue="ACTIVE"
                                    inactiveValue="INACTIVE"
                                    customLabels={{
                                        'ACTIVE': (item.effective_date && new Date(item.effective_date) > new Date().setHours(0, 0, 0, 0)) ? 'Pending' : 'Active',
                                        'INACTIVE': 'Inactive'
                                    }}
                                    customStyles={{
                                        'ACTIVE': (item.effective_date && new Date(item.effective_date) > new Date().setHours(0, 0, 0, 0))
                                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-300',
                                        'INACTIVE': 'bg-app-surface text-app-muted border-app'
                                    }}
                                />
                            );
                        }
                    },
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
                    <h1 className="text-2xl font-bold text-app-heading">Master Data</h1>
                    <p className="text-app-muted mt-1">Manage reference data for projects, billing, and administration</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchTabData(activeTab)}>
                    <RefreshCw size={16} className="mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-app-subtle pb-4">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${isActive
                                ? `bg-${tab.color}-100 text-${tab.color}-700 shadow-sm`
                                : 'text-app-muted hover:bg-app-surface'
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
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
                <input
                    type="text"
                    placeholder="Search records..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-app bg-app-input text-app-text focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
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
