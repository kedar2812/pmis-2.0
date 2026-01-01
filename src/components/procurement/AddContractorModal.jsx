import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Building2, FileText, MapPin, Phone, Mail, AlertCircle, CheckCircle2, Briefcase, Package, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { CreatePackageModal } from '@/components/packages/CreatePackageModal';

export const AddContractorModal = ({
    isOpen,
    onClose,
    onSave,
    projects = [],
    packages = [],
    onAddProject,
    onAddPackage,
    contractor = null
}) => {
    const isEditing = !!contractor;
    const [formData, setFormData] = useState({
        panNo: '',
        gstinNo: '',
        contractorName: '',
        buildingNumber: '',
        contractorStreet: '',
        area: '',
        city: '',
        state: '',
        country: '',
        zipCode: '',
        email: '',
        mobile: '',
        projectId: '',
        packageId: ''
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sub-modal states
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);

    // Filter packages based on selected project
    const projectPackages = formData.projectId
        ? packages.filter(pkg => pkg.projectId === formData.projectId)
        : [];

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (contractor) {
                // Editing mode - pre-fill data
                // Parse address components if possible - wait, we stored them individually in state previously?
                // The formatting was done on submit. But wait, did we store individual fields in the mock?
                // Let's check how we stored it. In handleSubmit we used ...formData.
                // So the individual fields should assume to be in the contractor object if we structure our mock correctly.
                // If the mock data structure is flat with all fields, this is easy.
                // If it only has 'address', then we have a problem reverse engineering the address.
                // Assuming we expanded the mock to store these fields or we just refill what we can.
                // Since this is a "PMIS", preserving data fields is key. 
                // In `addContractor` inside modal we did `...formData`. So all fields ARE saved. Great.

                // We need to handle assignedProjectIds/assignedPackageIds for pre-selection
                const currentProjectId = contractor.assignedProjectIds?.[0] || '';
                const currentPackageId = contractor.assignedPackageIds?.[0] || '';

                setFormData({
                    panNo: contractor.panNo || '',
                    gstinNo: contractor.gstinNo || '',
                    contractorName: contractor.contractorName || '',
                    buildingNumber: contractor.buildingNumber || '',
                    contractorStreet: contractor.contractorStreet || '',
                    area: contractor.area || '',
                    city: contractor.city || '',
                    state: contractor.state || '',
                    country: contractor.country || '',
                    zipCode: contractor.zipCode || '',
                    email: contractor.email || '',
                    mobile: contractor.mobile || '',
                    projectId: currentProjectId,
                    packageId: currentPackageId
                });
            } else {
                // Add mode - reset
                setFormData({
                    panNo: '',
                    gstinNo: '',
                    contractorName: '',
                    buildingNumber: '',
                    contractorStreet: '',
                    area: '',
                    city: '',
                    state: '',
                    country: '',
                    zipCode: '',
                    email: '',
                    mobile: '',
                    projectId: '',
                    packageId: ''
                });
            }
            setErrors({});
        }
    }, [isOpen, contractor]);

    // Handle Escape key press (only if sub-modals are not open)
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && !isProjectModalOpen && !isPackageModalOpen) {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }

        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose, isProjectModalOpen, isPackageModalOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updates = { ...prev, [name]: value };
            // Clear package if project changes
            if (name === 'projectId') {
                updates.packageId = '';
            }
            return updates;
        });

        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleProjectCreated = async (newProject) => {
        try {
            const created = await onAddProject(newProject);
            setFormData(prev => ({ ...prev, projectId: created.id }));
            setIsProjectModalOpen(false);
            toast.success("Project created and selected");
        } catch (error) {
            console.error("Failed to create project:", error);
            toast.error("Failed to create project");
        }
    };

    const handlePackageCreated = async (newPackage) => {
        try {
            // Ensure the package is linked to the currently selected project
            const packageWithProject = { ...newPackage, projectId: formData.projectId };
            const created = await onAddPackage(packageWithProject);
            setFormData(prev => ({ ...prev, packageId: created.id }));
            setIsPackageModalOpen(false);
            toast.success("Package created and selected");
        } catch (error) {
            console.error("Failed to create package:", error);
            toast.error("Failed to create package");
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.contractorName.trim()) newErrors.contractorName = 'Contractor Name is required';
        if (!formData.panNo.trim()) newErrors.panNo = 'PAN No is required';
        if (!formData.gstinNo.trim()) newErrors.gstinNo = 'GSTIN No is required';
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        if (!formData.mobile.trim()) {
            newErrors.mobile = 'Mobile is required';
        } else if (!/^\d{10}$/.test(formData.mobile.replace(/\D/g, ''))) {
            newErrors.mobile = 'Invalid mobile number';
        }

        // Project/Package assignment is optional correctly? 
        // Request said: "add an option to select... if neither... give an option to create"
        // It didn't explicitly say it's mandatory, but usually assignment is key.
        // I will match existing behavior and keep it optional unless specified otherwise.

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) {
            toast.error('Please fix the errors in the form');
            return;
        }

        setIsSubmitting(true);
        try {
            // Format address for display consistency
            const fullAddress = `${formData.buildingNumber}, ${formData.contractorStreet}, ${formData.area}, ${formData.city}, ${formData.state}, ${formData.country} - ${formData.zipCode}`;

            await onSave({
                ...formData,
                address: fullAddress,
                status: 'Active',
                projects: formData.projectId ? 1 : 0, // Simple count for now
                assignedProjectIds: formData.projectId ? [formData.projectId] : [],
                assignedPackageIds: formData.packageId ? [formData.packageId] : []
            });

            toast.success('Contractor added successfully');
            onClose();
        } catch (error) {
            console.error('Error adding contractor:', error);
            toast.error('Failed to add contractor');
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalContent = (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex-none bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-50 text-white rounded-lg">
                                <Building2 size={24} className="text-primary-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Contractor' : 'Add New Contractor'}</h2>
                                <p className="text-sm text-slate-500">{isEditing ? 'Update contractor details' : 'Enter contractor details for procurement'}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Section 1: Identification */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 mb-4 flex items-center gap-2">
                                    <FileText size={16} /> Legal Identification
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField
                                        label="PAN No"
                                        name="panNo"
                                        value={formData.panNo}
                                        onChange={handleChange}
                                        error={errors.panNo}
                                        placeholder="Ex: ABCDE1234F"
                                        required
                                    />
                                    <InputField
                                        label="GSTIN No"
                                        name="gstinNo"
                                        value={formData.gstinNo}
                                        onChange={handleChange}
                                        error={errors.gstinNo}
                                        placeholder="Ex: 29ABCDE1234F1Z5"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Section 2: Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 mb-4 flex items-center gap-2">
                                    <Building2 size={16} /> Company Details
                                </h3>
                                <InputField
                                    label="Contractor Name"
                                    name="contractorName"
                                    value={formData.contractorName}
                                    onChange={handleChange}
                                    error={errors.contractorName}
                                    placeholder="Full legal name of the entity"
                                    required
                                />
                            </div>

                            {/* Section: Project & Package Assignment */}
                            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                    <Briefcase size={16} /> Project & Package Assignment
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Project Selector */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-700">Assign to Project</label>
                                        <div className="flex gap-2">
                                            <select
                                                name="projectId"
                                                value={formData.projectId}
                                                onChange={handleChange}
                                                className="flex-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                                            >
                                                <option value="">Select Project...</option>
                                                {projects.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setIsProjectModalOpen(true)}
                                                className="whitespace-nowrap"
                                                title="Create New Project"
                                            >
                                                <Plus size={16} /> New
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Package Selector (Disabled until Project selected) */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-700">Assign to Package</label>
                                        <div className="flex gap-2">
                                            <select
                                                name="packageId"
                                                value={formData.packageId}
                                                onChange={handleChange}
                                                disabled={!formData.projectId}
                                                className="flex-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 disabled:bg-slate-100 disabled:text-slate-400"
                                            >
                                                <option value="">Select Package...</option>
                                                {projectPackages.map(pkg => (
                                                    <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                                                ))}
                                            </select>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setIsPackageModalOpen(true)}
                                                disabled={!formData.projectId}
                                                className="whitespace-nowrap"
                                                title="Create New Package"
                                            >
                                                <Plus size={16} /> New
                                            </Button>
                                        </div>
                                        {!formData.projectId && (
                                            <p className="text-xs text-slate-500">Select a project first</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Address */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 mb-4 flex items-center gap-2">
                                    <MapPin size={16} /> Address Details
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField
                                        label="Building Number"
                                        name="buildingNumber"
                                        value={formData.buildingNumber}
                                        onChange={handleChange}
                                        placeholder="Ex: Building 4A"
                                    />
                                    <InputField
                                        label="Contractor Street"
                                        name="contractorStreet"
                                        value={formData.contractorStreet}
                                        onChange={handleChange}
                                        placeholder="Ex: MG Road"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField
                                        label="Area"
                                        name="area"
                                        value={formData.area}
                                        onChange={handleChange}
                                        placeholder="Ex: Indiranagar"
                                    />
                                    <InputField
                                        label="City"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        placeholder="Ex: Bengaluru"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <InputField
                                        label="State"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                        placeholder="Ex: Karnataka"
                                    />
                                    <InputField
                                        label="Country"
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        placeholder="Ex: India"
                                    />
                                    <InputField
                                        label="Zip Code"
                                        name="zipCode"
                                        value={formData.zipCode}
                                        onChange={handleChange}
                                        placeholder="Ex: 560038"
                                    />
                                </div>
                            </div>

                            {/* Section 4: Contact */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 mb-4 flex items-center gap-2">
                                    <Phone size={16} /> Contact Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField
                                        label="Email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        error={errors.email}
                                        icon={Mail}
                                        placeholder="contact@company.com"
                                        required
                                    />
                                    <InputField
                                        label="Mobile"
                                        name="mobile"
                                        value={formData.mobile}
                                        onChange={handleChange}
                                        error={errors.mobile}
                                        icon={Phone}
                                        placeholder="+91 XXXXX XXXXX"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-primary-950 hover:bg-primary-900 text-white min-w-[120px]"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            {isEditing ? 'Updating...' : 'Saving...'}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <CheckCircle2 size={18} />
                                            {isEditing ? 'Update Contractor' : 'Save Contractor'}
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </motion.div>

            {/* Sub-modals for creation */}
            <CreateProjectModal
                isOpen={isProjectModalOpen}
                onClose={() => setIsProjectModalOpen(false)}
                onSave={handleProjectCreated}
            />
            {/* CreatePackageModal needs the pre-selected project ID */}
            <CreatePackageModal
                isOpen={isPackageModalOpen}
                onClose={() => setIsPackageModalOpen(false)}
                onSave={handlePackageCreated}
                preSelectedProjectId={formData.projectId}
            />

        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};

const InputField = ({ label, name, error, required, icon: Icon, className = "", ...props }) => (
    <div className={className}>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            <input
                name={name}
                className={`w-full px-3 py-2 ${Icon ? 'pl-9' : ''} bg-white border rounded-lg text-sm transition-all outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 ${error
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100'
                    }`}
                {...props}
            />
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />}
        </div>
        {error && (
            <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                <AlertCircle size={12} />
                <span>{error}</span>
            </div>
        )}
    </div>
);
