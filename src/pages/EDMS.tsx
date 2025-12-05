import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useMockData } from '@/hooks/useMockData';
import { UploadModal } from '@/components/edms/UploadModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { FileText, Download, Eye, CheckCircle, XCircle, Clock, Upload, Search, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import type { Document } from '@/mock/interfaces';

const EDMS = () => {
  const { t } = useLanguage();
  const { hasPermission } = useAuth();
  const { documents, addDocument, deleteDocument } = useMockData();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const itemsPerPage = 10;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="text-green-600" size={18} />;
      case 'Rejected':
        return <XCircle className="text-red-600" size={18} />;
      case 'Under Review':
        return <Clock className="text-yellow-600" size={18} />;
      default:
        return <FileText className="text-gray-600" size={18} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'Under Review':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter and search documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
      const matchesType = typeFilter === 'all' || doc.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [documents, searchQuery, statusFilter, typeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDocuments.slice(start, start + itemsPerPage);
  }, [filteredDocuments, currentPage]);

  const handleUpload = async (file: File) => {
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      name: file.name,
      type: 'Other',
      category: 'Uploaded',
      version: 'v1.0',
      uploadedBy: 'Current User',
      uploadedDate: new Date().toISOString(),
      fileSize: file.size,
      status: 'Draft',
      projectId: 'proj-1',
      tags: [],
    };
    await addDocument(newDoc);
  };

  const handleDelete = async (id: string) => {
    if (!hasPermission('edms:delete')) {
      toast.error('Permission Denied', {
        description: 'You do not have permission to delete documents. Contact your administrator.',
      });
      return;
    }
    await deleteDocument(id);
    toast.success('Document deleted', {
      description: 'The document has been removed from the repository.',
    });
  };

  const handleDownload = (doc: Document) => {
    toast.info('Download started', {
      description: `Downloading ${doc.name}...`,
    });
  };

  const handleView = (doc: Document) => {
    toast.info('Opening document', {
      description: `Viewing ${doc.name}...`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary-950">{t('common.documents')}</h1>
          <p className="text-gray-600 mt-1">Electronic Document Management System</p>
        </div>
        <div className="flex gap-2">
          {hasPermission('edms:upload') && (
            <Button onClick={() => setIsUploadModalOpen(true)} className="bg-primary-950 hover:bg-primary-900">
              <Upload size={18} className="mr-2" />
              {t('common.upload') || 'Upload'}
            </Button>
          )}
          <Button variant="outline">{t('common.export')}</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
                aria-label="Search documents"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
              aria-label="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
              aria-label="Filter by type"
            >
              <option value="all">All Types</option>
              <option value="Drawing">Drawing</option>
              <option value="Report">Report</option>
              <option value="Contract">Contract</option>
              <option value="Approval">Approval</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document Repository ({filteredDocuments.length} documents)</CardTitle>
        </CardHeader>
        <CardContent>
          {paginatedDocuments.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents found"
              description={
                searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters to see more results.'
                  : 'Upload your first document to get started.'
              }
              actionLabel={hasPermission('edms:upload') ? 'Upload Document' : undefined}
              onAction={hasPermission('edms:upload') ? () => setIsUploadModalOpen(true) : undefined}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('common.name')}</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Version</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Size</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('common.status')}</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Uploaded By</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('common.date')}</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDocuments.map((doc) => (
                      <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <FileText size={18} className="text-gray-400" />
                            <span className="font-medium">{doc.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{doc.type}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{doc.category}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{doc.version}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{formatFileSize(doc.fileSize)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(doc.status)}
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(doc.status)}`}>
                              {doc.status}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{doc.uploadedBy}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(doc.uploadedDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(doc)}
                              aria-label={`View ${doc.name}`}
                            >
                              <Eye size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(doc)}
                              aria-label={`Download ${doc.name}`}
                            >
                              <Download size={16} />
                            </Button>
                            {hasPermission('edms:delete') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(doc.id)}
                                aria-label={`Delete ${doc.name}`}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 size={16} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, filteredDocuments.length)} of{' '}
                    {filteredDocuments.length} documents
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="px-4 py-2 text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />
    </div>
  );
};

export default EDMS;
