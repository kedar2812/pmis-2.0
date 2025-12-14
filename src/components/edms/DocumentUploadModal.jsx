/**
 * DocumentUploadModal - Drag & drop file upload with folder selection
 */
import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
    X, Upload, FileText, Loader2, Check,
    FileImage, FileSpreadsheet, File, AlertCircle,
    Folder, Plus, ChevronDown
} from 'lucide-react';
import client from '@/api/client';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';

const DocumentUploadModal = ({ onClose, projectId, currentFolderId = null, onUploaded }) => {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [documentType, setDocumentType] = useState('OTHER');
    const [documentNumber, setDocumentNumber] = useState('');
    const [isConfidential, setIsConfidential] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Folder selection
    const [folders, setFolders] = useState([]);
    const [selectedFolderId, setSelectedFolderId] = useState(currentFolderId);
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [loadingFolders, setLoadingFolders] = useState(true);

    const documentTypes = [
        { value: 'DRAWING', label: 'Drawing' },
        { value: 'REPORT', label: 'Report' },
        { value: 'CONTRACT', label: 'Contract' },
        { value: 'CORRESPONDENCE', label: 'Correspondence' },
        { value: 'SPECIFICATION', label: 'Specification' },
        { value: 'INVOICE', label: 'Invoice' },
        { value: 'MEDIA', label: 'Media' },
        { value: 'OTHER', label: 'Other' },
    ];

    useEffect(() => {
        fetchFolders();
    }, [projectId]);

    const fetchFolders = async () => {
        setLoadingFolders(true);
        try {
            // Fetch all folders for this project (flat list for dropdown)
            const res = await client.get(`/edms/folders/?project=${projectId}`);
            const folderList = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setFolders(folderList);
        } catch (error) {
            console.error('Failed to fetch folders:', error);
        } finally {
            setLoadingFolders(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        setIsCreatingFolder(true);
        try {
            const res = await client.post('/edms/folders/', {
                name: newFolderName.trim(),
                project: projectId,
                parent: currentFolderId || null
            });
            toast.success('Folder created');
            setNewFolderName('');
            setShowCreateFolder(false);

            // Add to list and select it
            setFolders(prev => [...prev, res.data]);
            setSelectedFolderId(res.data.id);
        } catch (error) {
            toast.error('Failed to create folder');
        } finally {
            setIsCreatingFolder(false);
        }
    };

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            const f = acceptedFiles[0];
            setFile(f);
            // Auto-fill title from filename if empty
            if (!title) {
                setTitle(f.name.replace(/\.[^/.]+$/, ''));
            }
            // Auto-detect type from extension
            const ext = f.name.split('.').pop().toLowerCase();
            if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
                setDocumentType('REPORT');
            } else if (['dwg', 'dxf', 'cad'].includes(ext)) {
                setDocumentType('DRAWING');
            } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
                setDocumentType('INVOICE');
            } else if (['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov'].includes(ext)) {
                setDocumentType('MEDIA');
            }
        }
    }, [title]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        accept: {
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
            'video/*': ['.mp4', '.mov', '.avi'],
            'application/octet-stream': ['.dwg', '.dxf'],
        }
    });

    const getFileIcon = () => {
        if (!file) return FileText;
        const ext = file.name.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return FileImage;
        if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
        return FileText;
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!file) {
            toast.error('Please select a file');
            return;
        }
        if (!title.trim()) {
            toast.error('Please enter a title');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title.trim());
        formData.append('description', description);
        formData.append('document_type', documentType);
        formData.append('document_number', documentNumber);
        formData.append('project', projectId);
        formData.append('is_confidential', isConfidential);
        if (selectedFolderId) {
            formData.append('folder', selectedFolderId);
        }

        try {
            const res = await client.post('/edms/documents/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percent);
                }
            });

            toast.success('Document uploaded successfully');
            onUploaded(res.data);
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error(error.response?.data?.error || 'Failed to upload document');
        } finally {
            setIsUploading(false);
        }
    };

    const FileIcon = getFileIcon();

    // Build folder path display
    const getSelectedFolderPath = () => {
        if (!selectedFolderId) return 'Root (No folder)';
        const folder = folders.find(f => f.id === selectedFolderId);
        return folder?.full_path || folder?.name || 'Selected folder';
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-gradient-to-r from-primary-50 to-blue-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Upload className="text-primary-600" size={20} />
                            Upload Document
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
                    {/* Dropzone */}
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragActive
                                ? 'border-primary-500 bg-primary-50'
                                : file
                                    ? 'border-green-300 bg-green-50'
                                    : 'border-slate-300 hover:border-slate-400'
                            }`}
                    >
                        <input {...getInputProps()} />

                        {file ? (
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                                    <FileIcon size={24} className="text-green-600" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="font-medium text-slate-800 text-sm truncate">{file.name}</p>
                                    <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                                </div>
                                <Check size={20} className="text-green-600" />
                            </div>
                        ) : (
                            <>
                                <Upload size={32} className={`mx-auto ${isDragActive ? 'text-primary-600' : 'text-slate-400'}`} />
                                <p className="text-sm text-slate-600 mt-2">
                                    {isDragActive ? 'Drop the file here' : 'Drag & drop a file, or click to browse'}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    PDF, Word, Excel, Images, Media files
                                </p>
                            </>
                        )}
                    </div>

                    {/* Folder Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Upload to Folder
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Folder size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                                <select
                                    value={selectedFolderId || ''}
                                    onChange={(e) => setSelectedFolderId(e.target.value || null)}
                                    disabled={loadingFolders}
                                    className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                                >
                                    <option value="">Root (No folder)</option>
                                    {folders.map(folder => (
                                        <option key={folder.id} value={folder.id}>
                                            {folder.full_path || folder.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCreateFolder(!showCreateFolder)}
                            >
                                <Plus size={16} />
                            </Button>
                        </div>

                        {/* Create New Folder Inline */}
                        {showCreateFolder && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200"
                            >
                                <p className="text-xs font-medium text-slate-600 mb-2">Create New Folder</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder="Folder name"
                                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateFolder())}
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleCreateFolder}
                                        disabled={isCreatingFolder || !newFolderName.trim()}
                                    >
                                        {isCreatingFolder ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Document title"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            required
                        />
                    </div>

                    {/* Type & Number Row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Document Type
                            </label>
                            <select
                                value={documentType}
                                onChange={(e) => setDocumentType(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                {documentTypes.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Document Number
                            </label>
                            <input
                                type="text"
                                value={documentNumber}
                                onChange={(e) => setDocumentNumber(e.target.value)}
                                placeholder="e.g., DRG-001"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of the document"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                            rows={2}
                        />
                    </div>

                    {/* Confidential Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isConfidential}
                            onChange={(e) => setIsConfidential(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-slate-700">Mark as confidential</span>
                        <AlertCircle size={14} className="text-slate-400" />
                    </label>

                    {/* Upload Progress */}
                    {isUploading && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Uploading...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-primary-600"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isUploading || !file}>
                            {isUploading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin mr-2" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload size={16} className="mr-2" />
                                    Upload
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

export default DocumentUploadModal;
