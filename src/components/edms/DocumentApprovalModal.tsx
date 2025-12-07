import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Send, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Document, WorkflowRemark, DocumentApproval } from '@/mock/interfaces';

interface DocumentApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  workflow?: DocumentApproval;
}

export const DocumentApprovalModal = ({ isOpen, onClose, document, workflow }: DocumentApprovalModalProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [remark, setRemark] = useState('');
  const [remarks, setRemarks] = useState<WorkflowRemark[]>(
    workflow?.remarks || [
      {
        id: 'r-1',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        role: 'PMNC_Team',
        remark: 'Initial review completed. Please verify technical specifications.',
        step: 1,
      },
    ]
  );

  const handleAddRemark = () => {
    if (!remark.trim()) {
      toast.error('Please enter a remark');
      return;
    }

    const newRemark: WorkflowRemark = {
      id: `r-${Date.now()}`,
      timestamp: new Date().toISOString(),
      role: user?.role || 'Unknown',
      remark: remark.trim(),
      step: workflow?.currentStep || 1,
    };

    setRemarks([...remarks, newRemark]);
    setRemark('');
    toast.success('Remark added');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-glass w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-heading font-bold text-slate-900">Document Approval</h2>
            <p className="text-sm text-slate-500 mt-1">{document.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X size={24} className="text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Document Name</label>
                  <p className="text-slate-900">{document.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Type</label>
                    <p className="text-slate-900">{document.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Status</label>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      document.status === 'Approved' ? 'bg-green-100 text-green-700' :
                      document.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                      document.status === 'Under Review' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {document.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Description</label>
                  <p className="text-slate-600">Review and approve this document according to the workflow steps.</p>
                </div>
              </CardContent>
            </Card>

            {/* Approval Actions */}
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1">
                Reject
              </Button>
              <Button className="flex-1">
                Approve
              </Button>
            </div>
          </div>

          {/* Noting Sheet Side Panel */}
          <div className="w-96 border-l border-slate-200 bg-slate-50 flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <MessageSquare size={20} className="text-primary-600" />
                <h3 className="font-semibold text-slate-900">Noting Sheet</h3>
              </div>
            </div>

            {/* Remarks List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence>
                {remarks.map((remarkItem) => (
                  <motion.div
                    key={remarkItem.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">
                          {remarkItem.role.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-500">Step {remarkItem.step}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={12} />
                        {formatTimestamp(remarkItem.timestamp)}
                      </div>
                    </div>
                    <p className="text-sm text-slate-700">{remarkItem.remark}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Add Remark Input */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="space-y-3">
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Add a remark..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
                  rows={3}
                />
                <Button onClick={handleAddRemark} className="w-full" size="sm">
                  <Send size={16} />
                  Add Remark
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

