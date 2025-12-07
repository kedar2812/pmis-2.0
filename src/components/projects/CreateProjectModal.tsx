import { useState, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from 'sonner';
import type { Project } from '@/mock/interfaces';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SmartInput } from '@/components/ui/SmartInput';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Omit<Project, 'id'>) => Promise<void>;
}

export const CreateProjectModal = ({ isOpen, onClose, onSave }: CreateProjectModalProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Planning' as Project['status'],
    startDate: '',
    endDate: '',
    budget: '',
    category: '',
    manager: user?.name || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('project.projectNameRequired');
    }

    if (!formData.description.trim()) {
      newErrors.description = t('project.descriptionRequired');
    }

    if (!formData.startDate) {
      newErrors.startDate = t('project.startDateRequired');
    }

    if (!formData.endDate) {
      newErrors.endDate = t('project.endDateRequired');
    }

    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.endDate = t('project.endDateAfterStart');
    }

    if (!formData.budget || parseFloat(formData.budget) <= 0) {
      newErrors.budget = t('project.validBudgetRequired');
    }

    if (!formData.category.trim()) {
      newErrors.category = t('project.categoryRequired');
    }

    if (!formData.manager.trim()) {
      newErrors.manager = t('project.managerRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(t('project.fixFormErrors'));
      return;
    }

    setIsSubmitting(true);

    try {
      const projectData: Omit<Project, 'id'> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
        startDate: formData.startDate,
        endDate: formData.endDate,
        progress: 0,
        budget: parseFloat(formData.budget),
        spent: 0,
        location: {
          lat: 17.6868,
          lng: 77.6093,
          address: 'Zaheerabad Industrial Area, Telangana',
        },
        manager: formData.manager.trim(),
        stakeholders: [],
        category: formData.category.trim(),
      };

      await onSave(projectData);
      toast.success(t('project.createdSuccessfully'), {
        description: `${projectData.name} ${t('project.hasBeenAdded')}`,
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        status: 'Planning',
        startDate: '',
        endDate: '',
        budget: '',
        category: '',
        manager: user?.name || '',
      });
      setErrors({});
      onClose();
    } catch (error) {
      toast.error(t('project.failedToCreate'), {
        description: t('project.tryAgain'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: '',
        description: '',
        status: 'Planning',
        startDate: '',
        endDate: '',
        budget: '',
        category: '',
        manager: user?.name || '',
      });
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
        style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-primary-950">{t('project.createNewProject')}</h2>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
                aria-label="Close modal"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('project.projectName')} <span className="text-red-500">{t('project.required')}</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-600 focus:border-primary-600 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={t('project.enterProjectName')}
                  disabled={isSubmitting}
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <SmartInput
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder={t('project.enterDescription')}
                  rows={3}
                  disabled={isSubmitting}
                  label={t('project.description')}
                  required
                  error={errors.description}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('project.startDate')} <span className="text-red-500">{t('project.required')}</span>
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-600 focus:border-primary-600 ${
                      errors.startDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting}
                  />
                  {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>}
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('project.endDate')} <span className="text-red-500">{t('project.required')}</span>
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-600 focus:border-primary-600 ${
                      errors.endDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting}
                  />
                  {errors.endDate && <p className="text-sm text-red-500 mt-1">{errors.endDate}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('project.budget')} <span className="text-red-500">{t('project.required')}</span>
                  </label>
                  <input
                    id="budget"
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-600 focus:border-primary-600 ${
                      errors.budget ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={t('project.enterBudget')}
                    disabled={isSubmitting}
                  />
                  {errors.budget && <p className="text-sm text-red-500 mt-1">{errors.budget}</p>}
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('project.status')} <span className="text-red-500">{t('project.required')}</span>
                  </label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
                    disabled={isSubmitting}
                  >
                    <option value="Planning">{t('status.planning')}</option>
                    <option value="In Progress">{t('status.inProgress')}</option>
                    <option value="On Hold">{t('status.onHold')}</option>
                    <option value="Completed">{t('status.completed')}</option>
                    <option value="Cancelled">{t('status.cancelled')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('project.category')} <span className="text-red-500">{t('project.required')}</span>
                  </label>
                  <input
                    id="category"
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-600 focus:border-primary-600 ${
                      errors.category ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={t('project.categoryPlaceholder')}
                    disabled={isSubmitting}
                  />
                  {errors.category && <p className="text-sm text-red-500 mt-1">{errors.category}</p>}
                </div>

                <div>
                  <label htmlFor="manager" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('project.projectManager')} <span className="text-red-500">{t('project.required')}</span>
                  </label>
                  <input
                    id="manager"
                    type="text"
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-600 focus:border-primary-600 ${
                      errors.manager ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={t('project.enterManagerName')}
                    disabled={isSubmitting}
                  />
                  {errors.manager && <p className="text-sm text-red-500 mt-1">{errors.manager}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary-950 hover:bg-primary-900"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('common.creating')}
                    </>
                  ) : (
                    t('projects.createProject')
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

