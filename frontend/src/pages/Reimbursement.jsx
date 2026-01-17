import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Upload, Send, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import projectService from '@/api/services/projectService';

const Reimbursement = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  // Real data state
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    expenseType: '',
    amount: '',
    projectReference: '',
    description: '',
  });
  const [proofFile, setProofFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch real projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projectService.getAllProjects();
        setProjects(data || []);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const expenseTypes = ['Travel', 'Meals', 'Accommodation', 'Materials', 'Other'];

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const billNumber = `BILL-${Date.now()}`;
    toast.success('Reimbursement submitted successfully!', {
      description: `Email sent to Finance Dept regarding ${billNumber}`,
    });

    // Reset form
    setFormData({
      expenseType: '',
      amount: '',
      projectReference: '',
      description: '',
    });
    setProofFile(null);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-app-heading">Staff Reimbursement</h1>
        <p className="text-app-muted mt-1">Submit reimbursement requests for project-related expenses</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reimbursement Form</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-app-text mb-2 block">
                Expense Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.expenseType}
                onChange={(e) => setFormData({ ...formData, expenseType: e.target.value })}
                required
                className="w-full px-4 py-2 border border-app rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 bg-app-input text-app-text"
              >
                <option value="">Select expense type</option>
                {expenseTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-app-text mb-2 block">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-4 py-2 border border-app rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 bg-app-input text-app-text"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-app-text mb-2 block">
                Project Reference <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.projectReference}
                onChange={(e) => setFormData({ ...formData, projectReference: e.target.value })}
                required
                className="w-full px-4 py-2 border border-app rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 bg-app-input text-app-text"
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-app-text mb-2 block">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Describe the expense..."
                className="w-full px-4 py-2 border border-app rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 resize-none bg-app-input text-app-text"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-app-text mb-2 block">
                Proof of Payment <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-app-subtle rounded-lg p-6 text-center hover:border-primary-600 transition-colors">
                <input
                  type="file"
                  id="proof-upload"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  required
                />
                <label htmlFor="proof-upload" className="cursor-pointer">
                  {proofFile ? (
                    <div className="flex items-center justify-center gap-2 text-primary-600">
                      <FileText size={24} />
                      <span className="font-medium">{proofFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={32} className="text-app-muted-light" />
                      <span className="text-sm text-app-muted">Click to upload or drag and drop</span>
                      <span className="text-xs text-app-muted">PDF, JPG, PNG (max 10MB)</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => {
                setFormData({ expenseType: '', amount: '', projectReference: '', description: '' });
                setProofFile(null);
              }}>
                Clear
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Send size={18} />
                {isSubmitting ? 'Submitting...' : 'Submit Reimbursement'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reimbursement;






