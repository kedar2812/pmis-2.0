import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, File, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import Button from '@/components/ui/Button';
import client from '@/api/client';
import { toast } from 'sonner';

const UploadDrawer = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        category: 'Drawing',
        project: '',
        package_id: '',
        metadata: '{}' // JSON string for extra fields
    });
    const [projects, setProjects] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Fetch authorized projects
    useEffect(() => {
        if (isOpen) {
            client.get('/projects/').then(res => {
                setProjects(res.data);
                // Pre-select first project to avoid empty validation error
                if (res.data.length > 0 && !formData.project) {
                    setFormData(prev => ({ ...prev, project: res.data[0].id }));
                }
            });
        }
    }, [isOpen]);

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
            // Auto-fill title if empty
            if (!formData.title) {
                setFormData(prev => ({ ...prev, title: e.target.files[0].name }));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !formData.project) return;

        setIsUploading(true);
        const data = new FormData();
        data.append('file', file);
        data.append('project', formData.project);
        data.append('title', formData.title);
        data.append('category', formData.category);
        data.append('package_id', formData.package_id);

        // Improve metadata handling
        try {
            const meta = JSON.parse(formData.metadata || '{}');
            data.append('metadata', JSON.stringify(meta));
        } catch (e) {
            // ignore invalid json
        }

        try {
            await client.post('/edms/documents/', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });
            toast.success("Document uploaded successfully");
            setFile(null);
            setFormData(prev => ({ ...prev, title: '' }));
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Upload failed");
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
                    />
                    <motion.div
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-[400px] bg-white shadow-2xl z-[101] flex flex-col"
                    >
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">Upload Document</h2>
                            <button onClick={onClose}>
                                <X className="text-slate-400 hover:text-slate-600" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <form onSubmit={handleSubmit} className="space-y-6">

                                {/* Project Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Project *</label>
                                    <select
                                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                                        value={formData.project}
                                        onChange={e => setFormData({ ...formData, project: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Project</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* File Drop Zone */}
                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 hover:bg-slate-50 transition-colors text-center cursor-pointer relative">
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleFileChange}
                                        accept=".pdf,.dwg,.doc,.docx,.xls,.xlsx" // strict mime types
                                    />
                                    {file ? (
                                        <div className="flex flex-col items-center text-primary-600">
                                            <File size={32} className="mb-2" />
                                            <p className="font-medium text-sm truncate max-w-full px-4">{file.name}</p>
                                            <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-400">
                                            <Upload size={32} className="mb-2" />
                                            <p className="font-medium text-sm">Click or drag file to upload</p>
                                            <p className="text-xs mt-1">PDF, DWG, Office (Max 500MB)</p>
                                        </div>
                                    )}
                                </div>

                                {/* Metadata Fields */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Document Title *</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                            <select
                                                className="w-full p-2 border border-slate-200 rounded-lg"
                                                value={formData.category}
                                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            >
                                                <option>Drawing</option>
                                                <option>Report</option>
                                                <option>Invoice</option>
                                                <option>Contract</option>
                                                <option>Correspondence</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Package ID</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-slate-200 rounded-lg"
                                                placeholder="e.g. PKG-01"
                                                value={formData.package_id}
                                                onChange={e => setFormData({ ...formData, package_id: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Additional Metadata (JSON)</label>
                                        <textarea
                                            className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs"
                                            rows={3}
                                            value={formData.metadata}
                                            onChange={e => setFormData({ ...formData, metadata: e.target.value })}
                                            placeholder='{"drawing_no": "A-101", "revision": "0"}'
                                        />
                                    </div>
                                </div>

                                <Button type="submit" className="w-full" disabled={isUploading || !file || !formData.project}>
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="mr-2 animate-spin" />
                                            Uploading {uploadProgress}%
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="mr-2" size={18} /> Secure Upload
                                        </>
                                    )}
                                </Button>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default UploadDrawer;
