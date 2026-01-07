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
import Toggle from '@/components/ui/Toggle';

const DocumentUploadModal = ({ onClose, projectId, currentFolderId = null, onUploaded }) => {
    const [files, setFiles] = useState([]);
    const [title, setTitle] = useState(''); // Only used for single file
    const [description, setDescription] = useState('');
    const [documentType, setDocumentType] = useState('OTHER');
    // documentNumber state removed
    const [isConfidential, setIsConfidential] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

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

    const fetchFolders = async () => {
        setLoadingFolders(true);
        try {
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
            setFolders(prev => [...prev, res.data]);
            setSelectedFolderId(res.data.id);
        } catch (error) {
            toast.error('Failed to create folder');
        } finally {
            setIsCreatingFolder(false);
        }
    };

    const onDrop = useCallback((acceptedFiles, fileRejections) => {
        if (fileRejections.length > 0) {
            const rejection = fileRejections[0];
            const errorMsg = rejection.errors[0]?.message || 'File type not supported';
            toast.error(`Cannot upload ${rejection.file.name}: ${errorMsg}`);
        }

        if (acceptedFiles.length > 0) {
            const newFiles = acceptedFiles.map(f => ({
                file: f,
                id: Math.random().toString(36).substring(7),
                status: 'pending', // pending, uploading, success, error
                progress: 0
            }));

            setFiles(prev => {
                const updated = [...prev, ...newFiles];
                // Auto-fill title if this is the ONLY file and no title set
                if (updated.length === 1 && !title) {
                    setTitle(updated[0].file.name.replace(/\.[^/.]+$/, ''));
                }
                return updated;
            });

            // Auto-detect type from first file if not set
            const firstExt = acceptedFiles[0].name.split('.').pop().toLowerCase();
            if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(firstExt)) {
                setDocumentType('REPORT');
            } else if (['dwg', 'dxf', 'cad'].includes(firstExt)) {
                setDocumentType('DRAWING');
            } else if (['xls', 'xlsx', 'csv'].includes(firstExt)) {
                setDocumentType('INVOICE');
            } else if (['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'].includes(firstExt)) {
                setDocumentType('MEDIA');
            }
        }
    }, [title]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: true,
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

    const removeFile = (id) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const getFileIcon = (fileName) => {
        const ext = fileName.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return FileImage;
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

        if (files.length === 0) {
            toast.error('Please select at least one file');
            return;
        }

        // Title is now optional - backend will use filename if not provided

        setIsUploading(true);
        let successCount = 0;

        for (const fileObj of files) {
            if (fileObj.status === 'success') {
                successCount++;
                continue;
            }

            // Update status to uploading
            setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'uploading' } : f));

            const formData = new FormData();
            formData.append('file', fileObj.file);
            // Use manual title for single file, otherwise filename
            const finalTitle = (files.length === 1 && title.trim())
                ? title.trim()
                : fileObj.file.name.replace(/\.[^/.]+$/, '');

            formData.append('title', finalTitle);
            formData.append('description', description);
            formData.append('document_type', documentType);
            // documentNumber append removed
            formData.append('project', projectId);
            formData.append('is_confidential', isConfidential);
            if (selectedFolderId) {
                formData.append('folder', selectedFolderId);
            }

            try {
                await client.post('/edms/documents/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, progress: percent } : f));
                    }
                });

                setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'success', progress: 100 } : f));
                successCount++;
            } catch (error) {
                console.error('Upload failed for', fileObj.file.name, error);
                setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'error' } : f));
                toast.error(`Failed to upload ${fileObj.file.name}`);
            }
        }

        setIsUploading(false);

        if (successCount === files.length) {
            toast.success(`Successfully uploaded ${successCount} document(s)`);
            onUploaded && onUploaded(); // Refresh parent
            onClose();
        } else if (successCount > 0) {
            toast.warning(`Uploaded ${successCount} of ${files.length} documents. Some failed.`);
            onUploaded && onUploaded();
        }
    };

    const getSelectedFolderPath = () => {
        if (!selectedFolderId) return 'Root (No folder)';
        const folder = folders.find(f => f.id === selectedFolderId);
        return folder?.full_path || folder?.name || 'Selected folder';
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
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
                            Upload Document(s)
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
                            : 'border-slate-300 hover:border-slate-400'
                            }`}
                    >
                        <input {...getInputProps()} />
                        <Upload size={32} className={`mx-auto ${isDragActive ? 'text-primary-600' : 'text-slate-400'}`} />
                        <p className="text-sm text-slate-600 mt-2">
                            {isDragActive ? 'Drop files here' : 'Drag & drop files, or click to browse'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            PDF, Word, Excel, Images, Media, CAD
                        </p>
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {files.map((fObj) => {
                                const Icon = getFileIcon(fObj.file.name);
                                return (
                                    <div key={fObj.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="w-8 h-8 rounded bg-white flex items-center justify-center border border-slate-200">
                                            <Icon size={16} className="text-slate-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{fObj.file.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <span>{formatFileSize(fObj.file.size)}</span>
                                                {fObj.status === 'uploading' && <span className="text-primary-600">Uploading {fObj.progress}%</span>}
                                                {fObj.status === 'success' && <span className="text-green-600">Done</span>}
                                                {fObj.status === 'error' && <span className="text-red-500">Failed</span>}
                                            </div>
                                            {fObj.status === 'uploading' && (
                                                <div className="h-1 bg-slate-200 rounded-full mt-1 overflow-hidden">
                                                    <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${fObj.progress}%` }} />
                                                </div>
                                            )}
                                        </div>
                                        {!isUploading && fObj.status !== 'success' && (
                                            <button type="button" onClick={() => removeFile(fObj.id)} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-red-500">
                                                <X size={14} />
                                            </button>
                                        )}
                                        {fObj.status === 'success' && <Check size={16} className="text-green-600" />}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Common Metadata */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Common Settings</p>

                        {/* Folder Selection */}
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Folder</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <select
                                        value={selectedFolderId || ''}
                                        onChange={(e) => setSelectedFolderId(e.target.value || null)}
                                        disabled={loadingFolders}
                                        className="w-full pl-2 pr-8 py-1.5 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="">Root (No folder)</option>
                                        {folders.map(folder => (
                                            <option key={folder.id} value={folder.id}>
                                                {folder.full_path || folder.name}
                                            </option>
                                        ))}
                                    </select>
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
                                <div className="mt-2 flex gap-2">
                                    <input
                                        type="text"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder="Folder name"
                                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded text-sm"
                                    />
                                    <Button type="button" size="sm" onClick={handleCreateFolder}>Create</Button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                                <select
                                    value={documentType}
                                    onChange={(e) => setDocumentType(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    {documentTypes.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <div className="flex items-center gap-3 pb-2">
                                    <Toggle
                                        checked={isConfidential}
                                        onChange={(val) => setIsConfidential(val)}
                                        size="sm"
                                    />
                                    <span className="text-sm text-slate-700 font-medium">Confidential</span>
                                </div>
                            </div>
                        </div>

                        {/* Title Input - Only show if single file */}
                        {files.length <= 1 && (
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Title <span className="text-slate-400">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Leave blank to use filename"
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    💡 If a document with this name exists, a new version will be created
                                </p>
                            </div>
                        )}

                        {/* Document Number Input Removed */}

                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Description (applied to all files)"
                                className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isUploading || files.length === 0}>
                            {isUploading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin mr-2" />
                                    Uploading {files.length} files...
                                </>
                            ) : (
                                <>
                                    <Upload size={16} className="mr-2" />
                                    Upload {files.length > 0 ? `${files.length} Files` : ''}
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
