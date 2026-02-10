import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ChevronRight, Check, Upload, Paperclip, Plus, AlertCircle, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SmartInput } from '@/components/ui/SmartInput';
import { useModalClose } from '@/hooks/useModalClose';
import ChainedHierarchySelector from '@/components/masters/ChainedHierarchySelector';
import GeographySelector from '@/components/masters/GeographySelector';
import ClassificationSelector from '@/components/masters/ClassificationSelector';
import userService from '@/api/services/userService';
import edmsService from '@/api/services/edmsService';

const STEPS = [
  { id: 1, title: 'General Info' },
  { id: 2, title: 'Location & Jurisdiction' },
  { id: 3, title: 'Classification' },
  { id: 4, title: 'Funding Pattern' },
  { id: 5, title: 'Approvals' },
];

// Default funding sources
const DEFAULT_FUNDING_SOURCES = [
  { id: 1, source: 'Government of India', amount: '', document: null },
  { id: 2, source: 'Government of Telangana', amount: '', document: null },
  { id: 3, source: 'Financial Institutions (Loan)', amount: '', document: null },
  { id: 4, source: 'ULB Share', amount: '', document: null },
  { id: 5, source: 'RDPR', amount: '', document: null },
];

// Format number with Indian comma system (e.g., 10,00,000)
const formatIndianNumber = (num) => {
  if (!num && num !== 0) return '';
  const numStr = String(num).replace(/,/g, '');
  const parsed = parseFloat(numStr);
  if (isNaN(parsed)) return '';
  return parsed.toLocaleString('en-IN');
};

// Parse formatted string back to number
const parseFormattedNumber = (str) => {
  if (!str) return '';
  return str.replace(/,/g, '');
};

export const CreateProjectModal = ({ isOpen, onClose, onSave }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(''); // Two-step save status
  const [direction, setDirection] = useState(0);

  // Eligible managers state
  const [eligibleManagers, setEligibleManagers] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(false);

  // Use standard hook for Escape key closing
  useModalClose(isOpen, onClose);

  // Fetch eligible managers on mount
  useEffect(() => {
    if (isOpen) {
      fetchEligibleManagers();
    } else {
      // Reset form state when modal closes
      setCurrentStep(1);
      setErrors({});
      setFormData({
        name: '',
        description: '',
        status: 'Planning',
        startDate: '',
        endDate: '',
        budget: '',
        managerId: '',
        hierarchy: { zone: '', zoneName: '', circle: '', circleName: '', division: '', divisionName: '', subDivision: '', subDivisionName: '' },
        geography: { district: '', districtName: '', town: '', townName: '' },
        classification: { schemeType: '', schemeTypeName: '', scheme: '', schemeName: '', workType: '', workTypeName: '', projectCategory: '', projectCategoryName: '' },
        fundingPattern: DEFAULT_FUNDING_SOURCES.map(item => ({ ...item })),
        adminApprovalNo: '',
        adminApprovalDate: '',
        adminApprovalDoc: null,
      });
    }
  }, [isOpen]);

  const fetchEligibleManagers = async () => {
    setLoadingManagers(true);
    try {
      const response = await userService.getEligibleManagers();
      // Defensive: ensure we always set an array, never an object
      const managersData = response.data;
      if (Array.isArray(managersData)) {
        setEligibleManagers(managersData);
      } else if (managersData?.results && Array.isArray(managersData.results)) {
        // Handle paginated response
        setEligibleManagers(managersData.results);
      } else {
        // API returned error object or unexpected format
        console.error('Unexpected managers data format:', managersData);
        setEligibleManagers([]);
        toast.error('Failed to load project managers');
      }
    } catch (error) {
      console.error('Failed to fetch eligible managers:', error);
      // CRITICAL: Always set an empty array on error, never leave it undefined
      setEligibleManagers([]);
      toast.error('Failed to load project managers');
    } finally {
      setLoadingManagers(false);
    }
  };

  const [formData, setFormData] = useState({
    // Step 1: General
    name: '',
    description: '',
    status: 'Planning',
    startDate: '',
    endDate: '',
    budget: '',
    managerId: '', // Changed from manager string to managerId

    // Step 2: Location (hierarchy + geography)
    hierarchy: {
      zone: '',
      zoneName: '',
      circle: '',
      circleName: '',
      division: '',
      divisionName: '',
      subDivision: '',
      subDivisionName: '',
    },
    geography: {
      district: '',
      districtName: '',
      town: '',
      townName: '',
    },

    // Step 3: Classification
    classification: {
      schemeType: '',
      schemeTypeName: '',
      scheme: '',
      schemeName: '',
      workType: '',
      workTypeName: '',
      projectCategory: '',
      projectCategoryName: '',
    },

    // Step 4: Funding (Array of objects with documents)
    fundingPattern: DEFAULT_FUNDING_SOURCES.map(item => ({ ...item })),

    // Step 5: Approvals
    adminApprovalNo: '',
    adminApprovalDate: '',
    adminApprovalDoc: null,
  });

  const [errors, setErrors] = useState({});

  // Calculate funding totals
  const fundingTotal = formData.fundingPattern.reduce((sum, item) => {
    return sum + (parseFloat(item.amount) || 0);
  }, 0);

  const projectBudget = parseFloat(formData.budget) || 0;
  const fundingMismatch = projectBudget > 0 && Math.abs(fundingTotal - projectBudget) > 0.01;

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = t('project.projectNameRequired');
      if (!formData.startDate) newErrors.startDate = t('project.startDateRequired');
      if (!formData.endDate) newErrors.endDate = t('project.endDateRequired');
      if (!formData.budget) newErrors.budget = t('project.validBudgetRequired');
      if (!formData.managerId) newErrors.managerId = 'Project Manager is required';
    }

    if (step === 2) {
      if (!formData.hierarchy.zone) newErrors.zone = 'Zone is required';
      if (!formData.hierarchy.division) newErrors.division = 'Division is required';
      if (!formData.geography.district) newErrors.district = 'District is required';
    }

    if (step === 3) {
      if (!formData.classification.schemeType) newErrors.schemeType = 'Scheme Type is required';
      if (!formData.classification.scheme) newErrors.scheme = 'Scheme is required';
      if (!formData.classification.workType) newErrors.workType = 'Work Type is required';
      if (!formData.classification.projectCategory) newErrors.projectCategory = 'Project Category is required';
    }

    if (step === 4) {
      // Validate funding matches budget
      if (fundingMismatch) {
        newErrors.fundingMismatch = `Fund allocation (₹${fundingTotal.toLocaleString('en-IN')}) does not match project budget (₹${projectBudget.toLocaleString('en-IN')})`;
      }
      // Validate each source with amount > 0 has document
      formData.fundingPattern.forEach((item, idx) => {
        if (parseFloat(item.amount) > 0 && !item.document) {
          newErrors[`funding_${idx}`] = `Proof document required for ${item.source}`;
        }
      });
    }

    if (step === 5) {
      if (!formData.adminApprovalNo.trim()) newErrors.adminApprovalNo = 'Administrative Approval Number is required';
      if (!formData.adminApprovalDoc) newErrors.adminApprovalDoc = 'Administrative Approval Document is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setDirection(1);
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const updateFunding = (index, field, value) => {
    const newFunding = [...formData.fundingPattern];
    newFunding[index][field] = value;
    setFormData({ ...formData, fundingPattern: newFunding });
  };

  const addCustomFundingSource = () => {
    const newId = Math.max(...formData.fundingPattern.map(f => f.id)) + 1;
    setFormData({
      ...formData,
      fundingPattern: [
        ...formData.fundingPattern,
        { id: newId, source: '', amount: '', document: null, isCustom: true }
      ]
    });
  };

  const removeFundingSource = (index) => {
    const newFunding = formData.fundingPattern.filter((_, idx) => idx !== index);
    setFormData({ ...formData, fundingPattern: newFunding });
  };

  // Drag and drop handlers for admin approval document
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      setFormData(prev => ({ ...prev, adminApprovalDoc: file }));
      toast.success('Document attached successfully');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    setSubmissionStatus('Creating Project...');

    try {
      // ============================================================
      // STEP A: Create the Project first (to get the ID)
      // ============================================================
      const selectedManager = eligibleManagers.find(m => m.id === parseInt(formData.managerId));

      // Format project name with approval number
      const displayName = formData.adminApprovalNo
        ? `${formData.name} (${formData.adminApprovalNo})`
        : formData.name;

      const projectData = {
        name: formData.name,
        displayName: displayName,
        description: formData.description,
        status: formData.status,
        startDate: formData.startDate,
        endDate: formData.endDate,
        budget: formData.budget,
        managerId: formData.managerId,
        manager: selectedManager ? `${selectedManager.first_name} ${selectedManager.last_name}` : '',

        // Hierarchy
        zone: formData.hierarchy.zone,
        zoneName: formData.hierarchy.zoneName,
        circle: formData.hierarchy.circle,
        circleName: formData.hierarchy.circleName,
        division: formData.hierarchy.division,
        divisionName: formData.hierarchy.divisionName,
        subDivision: formData.hierarchy.subDivision,
        subDivisionName: formData.hierarchy.subDivisionName,

        // Geography
        district: formData.geography.district,
        districtName: formData.geography.districtName,
        town: formData.geography.town,
        townName: formData.geography.townName,

        // Classification
        schemeType: formData.classification.schemeType,
        schemeTypeName: formData.classification.schemeTypeName,
        scheme: formData.classification.scheme,
        schemeName: formData.classification.schemeName,
        workType: formData.classification.workType,
        workTypeName: formData.classification.workTypeName,
        projectCategory: formData.classification.projectCategory,
        projectCategoryName: formData.classification.projectCategoryName,

        // Funding & Approvals
        fundingPattern: formData.fundingPattern.map(f => ({
          source: f.source,
          amount: f.amount,
          hasDocument: !!f.document
        })),
        adminApprovalNo: formData.adminApprovalNo,
        adminApprovalDate: formData.adminApprovalDate,

        // Computed/default fields
        progress: 0,
        spent: 0,
        location: {
          address: `${formData.geography.townName || ''}, ${formData.geography.districtName || ''}`.replace(/^, |, $/g, ''),
        },
        stakeholders: [],
        category: formData.classification.projectCategoryName || 'General',
      };

      // Create the project and get the new ID
      const projectResult = await onSave(projectData);

      // ROBUST ID EXTRACTION: Handle all possible API response formats
      let newProjectId = null;

      if (projectResult) {
        // Try direct ID (if result is the project object)
        newProjectId = projectResult.id;

        // Try axios response wrapper (result.data.id)
        if (!newProjectId && projectResult.data) {
          newProjectId = projectResult.data.id;
        }

        // Try nested response (result.data.data.id - some APIs double-wrap)
        if (!newProjectId && projectResult.data?.data) {
          newProjectId = projectResult.data.data.id;
        }

        // Convert to number if it's a string number
        if (newProjectId && typeof newProjectId === 'string') {
          const parsed = parseInt(newProjectId, 10);
          if (!isNaN(parsed)) {
            newProjectId = parsed;
          }
        }
      }

      if (!newProjectId) {
        throw new Error('Project created but ID not returned');
      }

      // ============================================================
      // STEP B: Upload Funding Proof Documents to EDMS
      // ============================================================
      const fundingDocsToUpload = formData.fundingPattern.filter(
        item => item.document && parseFloat(item.amount) > 0
      );

      // Also include admin approval doc if present
      const adminDoc = formData.adminApprovalDoc;
      const totalDocs = fundingDocsToUpload.length + (adminDoc ? 1 : 0);

      if (totalDocs > 0) {
        setSubmissionStatus(`Uploading ${totalDocs} Sanction Order(s)...`);

        let uploadSuccess = 0;
        let uploadFailed = 0;

        // Upload funding proof documents
        const uploadPromises = fundingDocsToUpload.map(async (item) => {
          try {
            await edmsService.uploadDocument({
              projectId: newProjectId,
              file: item.document,
              title: `Sanction Order - ${item.source}`,
              autoRouteCategory: 'FUNDING_PROOF',
              documentType: 'CONTRACT', // Sanction orders are contractual
            });
            uploadSuccess++;
          } catch (error) {
            console.error(`Failed to upload funding doc for ${item.source}:`, error);
            uploadFailed++;
          }
        });

        // Upload admin approval document
        if (adminDoc) {
          uploadPromises.push(
            (async () => {
              try {
                await edmsService.uploadDocument({
                  projectId: newProjectId,
                  file: adminDoc,
                  title: `Administrative Approval - ${formData.adminApprovalNo}`,
                  autoRouteCategory: 'ADMIN_APPROVAL',
                  documentType: 'CONTRACT',
                });
                uploadSuccess++;
              } catch (error) {
                console.error('Failed to upload admin approval doc:', error);
                uploadFailed++;
              }
            })()
          );
        }

        // Wait for all uploads to complete
        await Promise.all(uploadPromises);

        // Show appropriate message based on upload results
        if (uploadFailed > 0) {
          toast.warning(
            `Project created successfully, but ${uploadFailed} document(s) failed to upload. Please upload them manually in EDMS.`,
            { duration: 6000 }
          );
        } else {
          toast.success(
            `${t('project.createdSuccessfully')} ${uploadSuccess} document(s) uploaded.`,
            { duration: 4000 }
          );
        }
      } else {
        toast.success(t('project.createdSuccessfully'));
      }

      onClose();
    } catch (error) {
      console.error('Project creation failed:', error);
      toast.error(t('project.failedToCreate'));
    } finally {
      setIsSubmitting(false);
      setSubmissionStatus('');
    }
  };

  if (!isOpen) return null;

  // Common input classes matching website UI
  const inputClasses = "w-full px-3 py-2.5 rounded-lg border border-app bg-app-input text-app-text text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:focus:ring-indigo-500/30 outline-none transition-all";
  const labelClasses = "block text-sm font-medium text-app-text mb-1.5";
  const errorClasses = "text-xs text-red-500 dark:text-red-400 mt-1";

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-app-overlay backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-4xl bg-app-card rounded-xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-app-subtle flex justify-between items-center bg-app-card z-10">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-app-heading">Create New Project</h2>
            <p className="text-xs sm:text-sm text-app-muted">Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-app-surface rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={24} className="text-app-muted" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-app-surface">
          <motion.div
            className="h-full bg-primary-600"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              initial={{ x: direction * 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* STEP 1: GENERAL INFO */}
              {currentStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className={labelClasses}>Project Name *</label>
                    <input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`${inputClasses} ${errors.name ? 'border-red-500' : ''}`}
                      placeholder="Enter project name"
                    />
                    {errors.name && <p className={errorClasses}>{errors.name}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <SmartInput
                      label="Description"
                      value={formData.description}
                      onChange={(val) => setFormData({ ...formData, description: val })}
                      placeholder="Project description..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className={labelClasses}>Start Date *</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className={inputClasses}
                    />
                    {errors.startDate && <p className={errorClasses}>{errors.startDate}</p>}
                  </div>
                  <div>
                    <label className={labelClasses}>End Date *</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className={inputClasses}
                    />
                    {errors.endDate && <p className={errorClasses}>{errors.endDate}</p>}
                  </div>

                  <div>
                    <label className={labelClasses}>Project Cost (₹) *</label>
                    <input
                      type="text"
                      value={formatIndianNumber(formData.budget)}
                      onChange={(e) => {
                        const raw = parseFormattedNumber(e.target.value);
                        if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                          setFormData({ ...formData, budget: raw });
                        }
                      }}
                      className={inputClasses}
                      placeholder="e.g. 10,00,000"
                    />
                    {errors.budget && <p className={errorClasses}>{errors.budget}</p>}
                  </div>

                  <div>
                    <label className={labelClasses}>Project Manager *</label>
                    <div className="relative">
                      <select
                        value={formData.managerId}
                        onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                        disabled={loadingManagers}
                        className={`${inputClasses} appearance-none cursor-pointer ${errors.managerId ? 'border-red-500' : ''}`}
                      >
                        <option value="">
                          {loadingManagers ? 'Loading managers...' : 'Select Project Manager'}
                        </option>
                        {eligibleManagers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.first_name} {manager.last_name} ({manager.role_display || manager.role})
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        {loadingManagers ? (
                          <Loader2 size={16} className="animate-spin text-app-muted" />
                        ) : (
                          <ChevronRight size={16} className="text-app-muted rotate-90" />
                        )}
                      </div>
                    </div>
                    {errors.managerId && <p className={errorClasses}>{errors.managerId}</p>}
                  </div>
                </div>
              )}

              {/* STEP 2: LOCATION */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  {Object.keys(errors).length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">Please fill in the required fields:</p>
                      <ul className="mt-1 text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                        {errors.zone && <li>Zone is required</li>}
                        {errors.division && <li>Division is required</li>}
                        {errors.district && <li>District is required</li>}
                      </ul>
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-app-heading mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs">1</span>
                      Administrative Hierarchy <span className="text-red-500">*</span>
                    </h3>
                    <ChainedHierarchySelector
                      value={formData.hierarchy}
                      onChange={(val) => setFormData({ ...formData, hierarchy: val })}
                    />
                    <p className="text-xs text-app-muted mt-2">Zone and Division are required</p>
                  </div>
                  <div className="border-t border-app-subtle pt-6">
                    <h3 className="text-sm font-semibold text-app-heading mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">2</span>
                      Geographic Location <span className="text-red-500">*</span>
                    </h3>
                    <GeographySelector
                      value={formData.geography}
                      onChange={(val) => setFormData({ ...formData, geography: val })}
                    />
                    <p className="text-xs text-app-muted mt-2">District is required</p>
                  </div>
                </div>
              )}

              {/* STEP 3: CLASSIFICATION */}
              {currentStep === 3 && (
                <div>
                  {Object.keys(errors).length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">Please fill in all classification fields:</p>
                      <ul className="mt-1 text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                        {errors.schemeType && <li>Scheme Type is required</li>}
                        {errors.scheme && <li>Scheme is required</li>}
                        {errors.workType && <li>Work Type is required</li>}
                        {errors.projectCategory && <li>Project Category is required</li>}
                      </ul>
                    </div>
                  )}
                  <p className="text-sm text-app-muted mb-4">
                    Select the scheme, work type, and category for this project. <span className="text-red-500">All fields are required.</span>
                  </p>
                  <ClassificationSelector
                    value={formData.classification}
                    onChange={(val) => setFormData({ ...formData, classification: val })}
                  />
                </div>
              )}

              {/* STEP 4: FUNDING PATTERN */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  {/* Budget Display */}
                  <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary-800 dark:text-primary-300">Project Budget:</span>
                      <span className="text-lg font-bold text-primary-900 dark:text-primary-200">
                        ₹{projectBudget.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Funding Mismatch Error */}
                  {errors.fundingMismatch && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700 dark:text-red-300">{errors.fundingMismatch}</p>
                    </div>
                  )}

                  <h3 className="font-medium text-app-heading">Add Funding Pattern</h3>
                  <div className="border border-app-subtle rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-app-surface text-app-muted">
                        <tr>
                          <th className="p-3 font-medium">Source</th>
                          <th className="p-3 font-medium">Amount (₹)</th>
                          <th className="p-3 font-medium">Proof Document *</th>
                          <th className="p-3 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
                        {formData.fundingPattern.map((item, idx) => (
                          <tr key={item.id}>
                            <td className="p-3">
                              {item.isCustom ? (
                                <input
                                  type="text"
                                  value={item.source}
                                  onChange={(e) => updateFunding(idx, 'source', e.target.value)}
                                  className={`${inputClasses} py-1.5`}
                                  placeholder="Enter source name"
                                />
                              ) : (
                                <span className="text-app-text">{item.source}</span>
                              )}
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={formatIndianNumber(item.amount)}
                                onChange={(e) => {
                                  const raw = parseFormattedNumber(e.target.value);
                                  if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                                    updateFunding(idx, 'amount', raw);
                                  }
                                }}
                                className={`${inputClasses} py-1.5 ${errors[`funding_${idx}`] ? 'border-red-500' : ''}`}
                                placeholder="e.g. 5,00,000"
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="file"
                                  id={`funding-doc-${idx}`}
                                  className="hidden"
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      updateFunding(idx, 'document', file);
                                      toast.success(`Document attached for ${item.source}`);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => document.getElementById(`funding-doc-${idx}`).click()}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${item.document
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                    : 'bg-app-surface text-app-muted hover:bg-app-subtle'
                                    }`}
                                >
                                  <Paperclip size={14} />
                                  {item.document ? 'Attached ✓' : 'Attach'}
                                </button>
                                {item.document && (
                                  <span className="text-xs text-app-muted truncate max-w-[100px]">
                                    {item.document.name}
                                  </span>
                                )}
                              </div>
                              {errors[`funding_${idx}`] && (
                                <p className="text-xs text-red-500 mt-1">{errors[`funding_${idx}`]}</p>
                              )}
                            </td>
                            <td className="p-3">
                              {item.isCustom && (
                                <button
                                  type="button"
                                  onClick={() => removeFundingSource(idx)}
                                  className="p-1.5 hover:bg-red-100 rounded text-red-500 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Total and Add Custom Button */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={addCustomFundingSource}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Plus size={16} />
                      Add Custom Funding Source
                    </button>

                    <div className="text-right">
                      <p className="text-sm text-app-muted">Total Allocated:</p>
                      <p className={`text-lg font-bold ${fundingMismatch ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{fundingTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        {!fundingMismatch && projectBudget > 0 && (
                          <span className="text-sm font-normal text-green-600 ml-2">✓ Matches Budget</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: APPROVALS */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClasses}>Administrative Approval Number *</label>
                      <input
                        value={formData.adminApprovalNo}
                        onChange={(e) => setFormData({ ...formData, adminApprovalNo: e.target.value })}
                        className={`${inputClasses} ${errors.adminApprovalNo ? 'border-red-500' : ''}`}
                        placeholder="Enter approval number"
                      />
                      {errors.adminApprovalNo && <p className={errorClasses}>{errors.adminApprovalNo}</p>}
                    </div>
                    <div>
                      <label className={labelClasses}>Approval Date</label>
                      <input
                        type="date"
                        value={formData.adminApprovalDate}
                        onChange={(e) => setFormData({ ...formData, adminApprovalDate: e.target.value })}
                        className={inputClasses}
                      />
                    </div>
                  </div>

                  {/* Drag and Drop Upload Zone */}
                  <div
                    ref={dropRef}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('admin-approval-upload').click()}
                    className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${errors.adminApprovalDoc ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' :
                      isDragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' :
                        formData.adminApprovalDoc ? 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20' :
                          'border-app-subtle hover:bg-app-surface'
                      }`}
                  >
                    <input
                      id="admin-approval-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData({ ...formData, adminApprovalDoc: file });
                          toast.success('Document attached successfully');
                        }
                      }}
                    />
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${formData.adminApprovalDoc ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' :
                      isDragging ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400' :
                        'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      }`}>
                      {formData.adminApprovalDoc ? <Check size={24} /> : <Upload size={24} />}
                    </div>
                    {formData.adminApprovalDoc ? (
                      <>
                        <p className="font-medium text-green-700 dark:text-green-400">Document Selected</p>
                        <p className="text-sm text-green-600 dark:text-green-500 mt-1">{formData.adminApprovalDoc.name}</p>
                        <p className="text-xs text-green-500 dark:text-green-600 mt-2">Click or drag to replace</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-app-heading">Upload Administrative Approval Document *</p>
                        <p className="text-sm text-app-muted mt-1">
                          {isDragging ? 'Drop file here' : 'Drag and drop or click to browse'}
                        </p>
                        <p className="text-xs text-app-muted mt-2">Supported formats: PDF, DOC, DOCX</p>
                      </>
                    )}
                  </div>
                  {errors.adminApprovalDoc && (
                    <p className={errorClasses}>{errors.adminApprovalDoc}</p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-app-subtle bg-app-surface flex flex-col sm:flex-row justify-between gap-3">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onClose : handleBack}
            disabled={isSubmitting}
            className="min-h-[44px]"
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep < STEPS.length ? (
            <Button onClick={handleNext} className="min-h-[44px] bg-primary-950 text-white hover:bg-primary-900">
              Next Step <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="min-h-[44px] bg-green-600 text-white hover:bg-green-700">
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  {submissionStatus || 'Creating Project...'}
                </>
              ) : 'Create Project'}
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};
