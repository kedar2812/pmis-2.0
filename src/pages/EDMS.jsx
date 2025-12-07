import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMockData } from '@/hooks/useMockData';
import { FileExplorer } from '@/components/edms/FileExplorer';
import { DocumentPreviewDrawer } from '@/components/edms/DocumentPreviewDrawer';
import { SmartSearchBar } from '@/components/edms/SmartSearchBar';
import { UploadModal } from '@/components/edms/UploadModal';
import { Upload, FileText, CheckCircle, Clock, XCircle, FolderOpen } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';

const EDMS = () => {
  const { t } = useLanguage();
  const { hasPermission, user } = useAuth();
  const { documents, addDocument, updateDocument, deleteDocument } = useMockData();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [filteredDocuments, setFilteredDocuments] = useState(documents);

  // Calculate stats
  const stats = {
    total: documents.length,
    approved: documents.filter((d) => d.status === 'Approved').length,
    pending: documents.filter((d) => d.status === 'Pending_Approval' || d.status === 'Under Review').length,
    rejected: documents.filter((d) => d.status === 'Rejected').length,
  };

  // Handle search results
  const handleSearchResults = useCallback((results) => {
    setFilteredDocuments(results);
  }, []);

  // Handle document selection
  const handleSelectDocument = (doc) => {
    setSelectedDocument(doc);
  };

  // Handle document view (open preview drawer)
  const handleViewDocument = (doc) => {
    setSelectedDocument(doc);
    setIsPreviewOpen(true);
  };

  // Handle document download
  const handleDownloadDocument = (doc) => {
    toast.info('Download started', {
      description: `Downloading ${doc.name}...`,
    });
  };

  // Handle version history view
  const handleViewHistory = (doc) => {
    setSelectedDocument(doc);
    setIsPreviewOpen(true);
  };

  // Handle document delete
  const handleDeleteDocument = async (doc) => {
    if (!hasPermission('edms:delete')) {
      toast.error('Permission Denied', {
        description: 'You do not have permission to delete documents.',
      });
      return;
    }

    await deleteDocument(doc.id);
    toast.success('Document deleted', {
      description: `${doc.name} has been removed.`,
    });
  };

  // Handle document approval
  const handleApproveDocument = async (doc, remark) => {
    const updatedDoc = {
      ...doc,
      status: 'Approved',
      notingSheet: [
        ...doc.notingSheet,
        {
          id: `note-${Date.now()}`,
          userId: user?.id || '',
          userName: user?.name || '',
          userRole: user?.role || '',
          remark,
          action: 'Approve',
          timestamp: new Date().toISOString(),
        },
      ],
    };
    await updateDocument(updatedDoc);
    setSelectedDocument(updatedDoc);
  };

  // Handle document rejection
  const handleRejectDocument = async (doc, remark) => {
    const updatedDoc = {
      ...doc,
      status: 'Rejected',
      notingSheet: [
        ...doc.notingSheet,
        {
          id: `note-${Date.now()}`,
          userId: user?.id || '',
          userName: user?.name || '',
          userRole: user?.role || '',
          remark,
          action: 'Reject',
          timestamp: new Date().toISOString(),
        },
      ],
    };
    await updateDocument(updatedDoc);
    setSelectedDocument(updatedDoc);
  };

  // Handle adding a note
  const handleAddNote = async (doc, note) => {
    const updatedDoc = {
      ...doc,
      notingSheet: [...doc.notingSheet, note],
    };
    await updateDocument(updatedDoc);
    setSelectedDocument(updatedDoc);
  };

  // Handle file upload - receives full document from enhanced UploadModal
  const handleUpload = async (docData) => {
    const newDoc = {
      id: `doc-${Date.now()}`,
      ...docData,
    };

    await addDocument(newDoc);
    // Refresh filtered documents
    setFilteredDocuments(prev => [...prev, newDoc]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
            {t('common.documents')}
          </h1>
          <p className="text-slate-500 mt-1">{t('edms.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          {hasPermission('edms:upload') && (
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-primary-600 hover:bg-primary-700"
            >
              <Upload size={18} />
              Upload Document
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-50 rounded-xl">
              <FolderOpen size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-sm text-slate-500">Total Documents</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <CheckCircle size={24} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.approved}</p>
              <p className="text-sm text-slate-500">Approved</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-xl">
              <Clock size={24} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
              <p className="text-sm text-slate-500">Pending Approval</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 rounded-xl">
              <XCircle size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.rejected}</p>
              <p className="text-sm text-slate-500">Rejected</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Smart Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <SmartSearchBar documents={documents} onSearchResults={handleSearchResults} />
      </motion.div>

      {/* File Explorer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <FileExplorer
          documents={filteredDocuments}
          onSelectDocument={handleSelectDocument}
          onViewDocument={handleViewDocument}
          onDownloadDocument={handleDownloadDocument}
          onViewHistory={handleViewHistory}
          onDeleteDocument={hasPermission('edms:delete') ? handleDeleteDocument : undefined}
          canDelete={hasPermission('edms:delete')}
          selectedDocumentId={selectedDocument?.id}
          onNew={() => setIsUploadModalOpen(true)}
          onUpload={() => setIsUploadModalOpen(true)}
        />
      </motion.div>

      {/* Document Preview Drawer */}
      <DocumentPreviewDrawer
        document={selectedDocument}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
        }}
        onApprove={hasPermission('edms:approve') ? handleApproveDocument : undefined}
        onReject={hasPermission('edms:approve') ? handleRejectDocument : undefined}
        onAddNote={handleAddNote}
        onDownload={handleDownloadDocument}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />
    </div>
  );
};

export default EDMS;
