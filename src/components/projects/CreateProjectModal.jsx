import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SmartInput } from '@/components/ui/SmartInput';
import { useModalClose } from '@/hooks/useModalClose';

const STEPS = [
  { id: 1, title: 'General Info' },
  { id: 2, title: 'Location & Jurisdiction' },
  { id: 3, title: 'Classification' },
  { id: 4, title: 'Funding Pattern' },
  { id: 5, title: 'Approvals' },
];

export const CreateProjectModal = ({ isOpen, onClose, onSave }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(0);

  // Use standard hook for Escape key closing
  useModalClose(isOpen, onClose);

  const [formData, setFormData] = useState({
    // Step 1: General
    name: '',
    description: '',
    status: 'Planning',
    startDate: '',
    endDate: '',
    budget: '',
    manager: user?.name || '',

    // Step 2: Location
    division: '',
    zone: '',
    subDivision: '',
    circle: '',
    district: '',
    town: '',

    // Step 3: Classification
    scheme: '',
    schemeType: '',
    workType: '',
    projectCategory: '',

    // Step 4: Funding (Array of objects)
    fundingPattern: [
      { id: 1, source: 'Government of India', amount: '' },
      { id: 2, source: 'Government of Karnataka', amount: '' },
      { id: 3, source: 'Financial Institutions (Loan)', amount: '' },
      { id: 4, source: 'ULB Share', amount: '' },
      { id: 5, source: 'RDPR', amount: '' },
    ],

    // Step 5: Approvals
    adminApprovalNo: '',
    adminApprovalDate: '',
    techDocument: null, // Placeholder
  });

  const [errors, setErrors] = useState({});

  const validateStep = (step) => {
    const newErrors = {};
    let isValid = true;

    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = t('project.projectNameRequired');
      if (!formData.startDate) newErrors.startDate = t('project.startDateRequired');
      if (!formData.endDate) newErrors.endDate = t('project.endDateRequired');
      if (!formData.budget) newErrors.budget = t('project.validBudgetRequired');
    }

    // Add validations for other steps as strictly or loosely as needed
    // For now, keeping it basic to allow navigation

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

  const updateFunding = (index, value) => {
    const newFunding = [...formData.fundingPattern];
    newFunding[index].amount = value;
    setFormData({ ...formData, fundingPattern: newFunding });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      const projectData = {
        ...formData,
        progress: 0,
        spent: 0,
        location: {
          // Combine detailed location into a display string or object
          address: `${formData.town}, ${formData.district}, ${formData.state || ''}`,
          ...formData.location
        },
        stakeholders: [],
        category: formData.projectCategory || 'General',
      };

      await onSave(projectData);
      toast.success(t('project.createdSuccessfully'));
      onClose();
    } catch (error) {
      toast.error(t('project.failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-4xl bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Create New Project</h2>
              <p className="text-xs sm:text-sm text-slate-500">Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              <X size={24} className="text-slate-500" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="h-1 w-full bg-slate-100">
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Project Name *</label>
                      <input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full p-2 border rounded-lg ${errors.name ? 'border-red-500' : 'border-slate-200'}`}
                        placeholder="Enter project name"
                      />
                      {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Project Cost (₹) *</label>
                      <input
                        type="number"
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-lg"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Project Manager</label>
                      <input
                        value={formData.manager}
                        onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 2: LOCATION */}
                {currentStep === 2 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['Division', 'Zone', 'Sub Division', 'Circle', 'District', 'Town'].map((field) => (
                      <div key={field}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{field}</label>
                        <input
                          value={formData[field.toLowerCase().replace(' ', '')]}
                          onChange={(e) => setFormData({ ...formData, [field.toLowerCase().replace(' ', '')]: e.target.value })}
                          className="w-full p-2 border border-slate-200 rounded-lg"
                          placeholder={`Enter ${field}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* STEP 3: CLASSIFICATION */}
                {currentStep === 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['Scheme', 'Scheme Type', 'Work Type', 'Project Category'].map((field) => (
                      <div key={field}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{field}</label>
                        <input
                          value={formData[field.toLowerCase().replace(' ', '')]}
                          onChange={(e) => setFormData({ ...formData, [field.toLowerCase().replace(' ', '')]: e.target.value })}
                          className="w-full p-2 border border-slate-200 rounded-lg"
                          placeholder={`Enter ${field}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* STEP 4: FUNDING */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-slate-900">Add Funding Pattern</h3>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-700">
                          <tr>
                            <th className="p-3 font-medium">Source</th>
                            <th className="p-3 font-medium">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {formData.fundingPattern.map((item, idx) => (
                            <tr key={item.id}>
                              <td className="p-3 text-slate-600">{item.source}</td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  value={item.amount}
                                  onChange={(e) => updateFunding(idx, e.target.value)}
                                  className="w-full p-1.5 border border-slate-200 rounded bg-transparent focus:bg-white transition-colors"
                                  placeholder="0.00"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* STEP 5: APPROVALS */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Admin Approval No.</label>
                        <input
                          value={formData.adminApprovalNo}
                          onChange={(e) => setFormData({ ...formData, adminApprovalNo: e.target.value })}
                          className="w-full p-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Approval Date</label>
                        <input
                          type="date"
                          value={formData.adminApprovalDate}
                          onChange={(e) => setFormData({ ...formData, adminApprovalDate: e.target.value })}
                          className="w-full p-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>

                    <div
                      onClick={() => document.getElementById('file-upload').click()}
                      className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${formData.techDocument ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setFormData({ ...formData, techDocument: file });
                            toast.success('Document attached');
                          }
                        }}
                      />
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${formData.techDocument ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                        <Check size={24} />
                      </div>
                      {formData.techDocument ? (
                        <>
                          <p className="font-medium text-green-700">Document Selected</p>
                          <p className="text-sm text-green-600 mt-1">{formData.techDocument.name}</p>
                          <p className="text-xs text-green-500 mt-2">Click to replace</p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-slate-900">Upload Admin Approval Document</p>
                          <p className="text-sm text-slate-500 mt-1">Drag and drop or click to browse</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between gap-3">
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
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Create Project'}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};




