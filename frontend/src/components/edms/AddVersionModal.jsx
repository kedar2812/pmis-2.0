/**
 * AddVersionModal - Upload a new file as a version to an existing document
 */
import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
    X, Upload, RefreshCw, Loader2, FileText, Search,
    ChevronDown, AlertCircle
} from 'lucide-react';
import client from '@/api/client';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';

const AddVersionModal = ({ onClose, projectId, currentFolderId = null, onVersionAdded }) => {
    const [documents, setDocuments] = useState([]);
    const [filteredDocuments, setFilteredDocuments] = useState([]);
    const [selectedDocumentId, setSelectedDocumentId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [file, setFile] = useState(null);
    const [changeNotes, setChangeNotes] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [loadingDocuments, setLoadingDocuments] = useState(true);

    useEffect(() => {
        fetchDocuments();
    }, [projectId, currentFolderId]);

    useEffect(() => {
        // Filter documents based on search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            setFilteredDocuments(
                documents.filter(doc =>
                    doc.title.toLowerCase().includes(query) ||
                    doc.document_number?.toLowerCase().includes(query)
                )
            );
        } else {
            setFilteredDocuments(documents);
        }
    }, [searchQuery, documents]);

    // Close results dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.autocomplete-container')) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ESC key handler
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && !isUploading) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose, isUploading]);

    const fetchDocuments = async () => {
        setLoadingDocuments(true);
        try {
            const params = { project: projectId };
            if (currentFolderId) {
                params.folder = currentFolderId;
            }
            const res = await client.get('/edms/documents/', { params });
            const docList = Array.isArray(res.data) ? res.data : (res.data.results || []);

            // Filter out archived documents
            const activeDocuments = docList.filter(doc => doc.status !== 'ARCHIVED');
            setDocuments(activeDocuments);
            setFilteredDocuments(activeDocuments);
        } catch (error) {
            console.error('Failed to fetch documents:', error);
            toast.error('Failed to load documents');
        } finally {
            setLoadingDocuments(false);
        }
    };

    const onDrop = useCallback((acceptedFiles, fileRejections) => {
        if (fileRejections.length > 0) {
            const rejection = fileRejections[0];
            const errorMsg = rejection.errors[0]?.message || 'File type not supported';
            toast.error(`Cannot upload ${rejection.file.name}: ${errorMsg}`);
            return;
        }

        if (acceptedFiles.length > 1) {
            toast.error('Please upload only one file at a time');
            return;
        }

        if (acceptedFiles.length === 1) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        accept: {
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'text/csv': ['.csv'],
            'application/vnd.ms-powerpoint': ['.ppt'],
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
            'text/plain': ['.txt'],
            'text/rtf': ['.rtf'],
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
            'video/*': ['.mp4', '.mov', '.avi', '.webm'],
            'application/octet-stream': ['.dwg', '.dxf'],
            'image/vnd.dxf': ['.dxf'],
        }
    });

    const removeFile = () => {
        setFile(null);
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedDocumentId) {
            toast.error('Please select a document');
            return;
        }

        if (!file) {
            toast.error('Please upload a file');
            return;
        }

        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);
        if (changeNotes.trim()) {
            formData.append('change_notes', changeNotes.trim());
        }

        try {
            await client.post(`/edms/documents/${selectedDocumentId}/upload_version/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success('New version added successfully');
            onVersionAdded && onVersionAdded();
            onClose();
        } catch (error) {
            console.error('Failed to add version:', error);
            const errorMsg = error.response?.data?.error || 'Failed to add version';
            toast.error(errorMsg);
        } finally {
            setIsUploading(false);
        }
    };

    const selectedDocument = documents.find(doc => doc.id === selectedDocumentId);

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-neutral-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-neutral-800 dark:to-neutral-800">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <RefreshCw className="text-blue-600" size={20} />
                            Add New Version
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">Upload a new file as a version to an existing document</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 dark:hover:bg-neutral-700 rounded-lg transition-colors">
                        <X size={20} className="text-slate-500 dark:text-neutral-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
                    {/* Document Selector with Autocomplete */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Select Document <span className="text-red-500">*</span>
                        </label>

                        {loadingDocuments ? (
                            <div className="flex items-center justify-center py-8 text-slate-400">
                                <Loader2 className="animate-spin mr-2" size={20} />
                                Loading documents...
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                                <AlertCircle className="mx-auto text-slate-400 mb-2" size={32} />
                                <p className="text-sm text-slate-600">No documents available</p>
                                <p className="text-xs text-slate-400 mt-1">Upload a document first before adding versions</p>
                            </div>
                        ) : (
                            <div className="relative autocomplete-container">
                                {/* Autocomplete Search Input */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setSelectedDocumentId(''); // Clear selected ID when typing
                                        }}
                                        onFocus={() => setShowResults(true)}
                                        placeholder="Type to search documents..."
                                        className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchQuery('');
                                                setSelectedDocumentId('');
                                                setShowResults(false); // Close results when clearing
                                            }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Autocomplete Results Dropdown */}
                                {showResults && searchQuery && filteredDocuments.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {filteredDocuments.map(doc => (
                                            <button
                                                key={doc.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedDocumentId(doc.id);
                                                    setSearchQuery(doc.title);
                                                    setShowResults(false);
                                                }}
                                                className="w-full px-3 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0 flex items-start gap-2"
                                            >
                                                <FileText className="text-slate-400 flex-shrink-0 mt-0.5" size={16} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 truncate">
                                                        {doc.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                                        <span>v{doc.current_version_number}</span>
                                                        <span>•</span>
                                                        <span className={`px-1.5 py-0.5 rounded ${doc.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' :
                                                            doc.status === 'APPROVED' ? 'bg-green-100 text-green-600' :
                                                                doc.status === 'VALIDATED' ? 'bg-blue-100 text-blue-600' :
                                                                    'bg-yellow-100 text-yellow-600'
                                                            }`}>
                                                            {doc.status}
                                                        </span>
                                                        {doc.document_number && (
                                                            <>
                                                                <span>•</span>
                                                                <span>{doc.document_number}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* No Results Message */}
                                {showResults && searchQuery && filteredDocuments.length === 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                                        <p className="text-sm text-slate-500 text-center">No documents found matching "{searchQuery}"</p>
                                    </div>
                                )}

                                {/* Selected Document Info */}
                                {selectedDocument && (
                                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                        <div className="flex items-start gap-2">
                                            <FileText className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-700 truncate">{selectedDocument.title}</p>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                    <span>Current: v{selectedDocument.current_version_number}</span>
                                                    <span>•</span>
                                                    <span className={`px-2 py-0.5 rounded-full ${selectedDocument.status === 'DRAFT' ? 'bg-slate-100 text-slate-700' :
                                                        selectedDocument.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                            selectedDocument.status === 'VALIDATED' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {selectedDocument.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-blue-600 mt-1">
                                                    → New version will be v{selectedDocument.current_version_number + 1}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Upload New Version <span className="text-red-500">*</span>
                        </label>

                        {!file ? (
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragActive
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-slate-300 hover:border-slate-400'
                                    }`}
                            >
                                <input {...getInputProps()} />
                                <Upload size={32} className={`mx-auto ${isDragActive ? 'text-blue-600' : 'text-slate-400'}`} />
                                <p className="text-sm text-slate-600 mt-2">
                                    {isDragActive ? 'Drop file here' : 'Drag & drop file, or click to browse'}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Any filename accepted - will be versioned under selected document
                                </p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="w-10 h-10 rounded bg-white flex items-center justify-center border border-slate-200">
                                    <FileText size={20} className="text-slate-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                                    <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                                </div>
                                {!isUploading && (
                                    <button
                                        type="button"
                                        onClick={removeFile}
                                        className="p-1.5 hover:bg-slate-200 rounded text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Change Notes */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Change Notes <span className="text-slate-400">(optional)</span>
                        </label>
                        <textarea
                            value={changeNotes}
                            onChange={(e) => setChangeNotes(e.target.value)}
                            placeholder="Describe what changed in this version..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            💡 Good practice: Document what changed, why, and by whom
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isUploading || !selectedDocumentId || !file || documents.length === 0}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin mr-2" />
                                    Adding Version...
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={16} className="mr-2" />
                                    Add Version
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </motion.div>
        </div>,
        document.body
    );
};

export default AddVersionModal;
