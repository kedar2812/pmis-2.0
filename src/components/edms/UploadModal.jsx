import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Upload, 
  File, 
  CheckCircle, 
  FolderOpen, 
  Tag, 
  Calendar,
  FileText,
  FileImage,
  FileVideo,
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
  Clock,
  ChevronDown,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { projects } from '@/mock';
import { cn } from '@/lib/utils';

// File type icon and color mapping
const getFileTypeInfo = (file) => {
  const mimeType = file.type;
  if (mimeType.includes('pdf')) {
    return { icon: FileText, color: 'text-red-500', bg: 'bg-red-50', label: 'PDF Document' };
  }
  if (mimeType.includes('image')) {
    return { icon: FileImage, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Image' };
  }
  if (mimeType.includes('video')) {
    return { icon: FileVideo, color: 'text-pink-500', bg: 'bg-pink-50', label: 'Video' };
  }
  if (mimeType.includes('sheet') || mimeType.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    return { icon: FileSpreadsheet, color: 'text-green-500', bg: 'bg-green-50', label: 'Spreadsheet' };
  }
  if (file.name.endsWith('.dwg') || file.name.endsWith('.dxf')) {
    return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50', label: 'CAD Drawing' };
  }
  return { icon: File, color: 'text-slate-500', bg: 'bg-slate-50', label: 'Document' };
};

// Get document type from file
const getDocumentType = (file) => {
  const name = file.name.toLowerCase();
  if (name.endsWith('.dwg') || name.endsWith('.dxf')) return 'Drawing';
  if (file.type.includes('image')) return 'SitePhoto';
  if (file.type.includes('video')) return 'Video';
  if (name.includes('report')) return 'Report';
  if (name.includes('contract') || name.includes('agreement')) return 'Contract';
  if (name.includes('bill') || name.includes('invoice')) return 'Bill';
  return 'Other';
};

// Get mime type
const getMimeType = (file) => {
  if (file.type.includes('pdf')) return 'application/pdf';
  if (file.type.includes('jpeg') || file.type.includes('jpg')) return 'image/jpeg';
  if (file.type.includes('png')) return 'image/png';
  if (file.type.includes('video')) return 'video/mp4';
  if (file.name.endsWith('.dwg') || file.name.endsWith('.dxf')) return 'application/dwg';
  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) return 'application/xlsx';
  return 'other';
};

// Auto-generate tags based on file
const generateAutoTags = (file, category) => {
  const tags = [];
  const name = file.name.toLowerCase();
  
  // Add category-based tags
  if (category) tags.push(category.toLowerCase().replace(/\s+/g, '-'));
  
  // Add file type tags
  if (file.type.includes('image')) tags.push('site-photo');
  if (file.type.includes('video')) tags.push('video', 'progress');
  if (name.includes('drawing') || name.endsWith('.dwg')) tags.push('drawing', 'design');
  if (name.includes('report')) tags.push('report');
  if (name.includes('contract')) tags.push('contract', 'legal');
  if (name.includes('test')) tags.push('test', 'quality');
  if (name.includes('safety')) tags.push('safety', 'compliance');
  
  // Extract meaningful words from filename
  const words = file.name.replace(/\.[^/.]+$/, '').split(/[-_\s]+/);
  words.forEach(word => {
    if (word.length > 3 && !tags.includes(word.toLowerCase())) {
      tags.push(word.toLowerCase());
    }
  });
  
  return [...new Set(tags)].slice(0, 6);
};

export const UploadModal = ({ isOpen, onClose, onUpload }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [step, setStep] = useState('select');
  const fileInputRef = useRef(null);

  // Form state
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('Execution');
  const [selectedDiscipline, setSelectedDiscipline] = useState('General');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [documentType, setDocumentType] = useState('Other');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [submitForApproval, setSubmitForApproval] = useState(false);
  const [siteTimestamp, setSiteTimestamp] = useState('');

  const phases = ['Planning', 'Design', 'Execution', 'Closure'];
  const disciplines = ['Civil', 'Electrical', 'Mechanical', 'Plumbing', 'HVAC', 'General'];
  const categories = [
    'Design', 'Progress', 'Legal', 'Financial', 'Quality', 
    'Compliance', 'Technical', 'Site Documentation'
  ];
  const documentTypes = ['Drawing', 'Report', 'Contract', 'Bill', 'SitePhoto', 'Video', 'Other'];

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUploadedFile(null);
      setUploadProgress(0);
      setIsUploading(false);
      setStep('select');
      setSelectedProject('');
      setSelectedPhase('Execution');
      setSelectedDiscipline('General');
      setSelectedCategory('');
      setDocumentType('Other');
      setDescription('');
      setTags([]);
      setTagInput('');
      setSubmitForApproval(false);
      setSiteTimestamp('');
    }
  }, [isOpen]);

  // Auto-configure when file is selected
  useEffect(() => {
    if (uploadedFile) {
      const autoType = getDocumentType(uploadedFile);
      setDocumentType(autoType);
      
      // Auto-capture timestamp for images/videos
      if (uploadedFile.type.includes('image') || uploadedFile.type.includes('video')) {
        setSiteTimestamp(new Date().toISOString());
      }
    }
  }, [uploadedFile]);

  // Auto-generate tags when category changes
  useEffect(() => {
    if (uploadedFile && selectedCategory) {
      const autoTags = generateAutoTags(uploadedFile, selectedCategory);
      setTags(autoTags);
    }
  }, [uploadedFile, selectedCategory]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file) => {
    setUploadedFile(file);
    setStep('configure');
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const validateForm = () => {
    if (!selectedProject) {
      toast.error('Please select a project');
      return false;
    }
    if (!selectedCategory) {
      toast.error('Please select a category');
      return false;
    }
    return true;
  };

  const handleUpload = async () => {
    if (!uploadedFile || !validateForm()) return;

    setStep('uploading');
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);

    try {
      const newDoc = {
        name: uploadedFile.name,
        type: documentType,
        mimeType: getMimeType(uploadedFile),
        category: selectedCategory,
        version: 'v1.0',
        projectId: selectedProject,
        phase: selectedPhase,
        discipline: selectedDiscipline,
        uploadedBy: {
          userId: user?.id || '',
          userName: user?.name || 'Current User',
          role: user?.role || 'EPC_Contractor',
        },
        uploadedDate: new Date().toISOString(),
        fileSize: uploadedFile.size,
        status: submitForApproval ? 'Pending_Approval' : 'Draft',
        requiresApproval: submitForApproval,
        tags,
        description,
        notingSheet: submitForApproval ? [{
          id: `note-${Date.now()}`,
          userId: user?.id || '',
          userName: user?.name || 'Current User',
          userRole: user?.role || '',
          remark: 'Document submitted for approval.',
          action: 'Comment',
          timestamp: new Date().toISOString(),
        }] : [],
        versionHistory: [
          {
            version: 'v1.0',
            uploadedBy: user?.name || 'Current User',
            uploadedDate: new Date().toISOString(),
            fileSize: uploadedFile.size,
            changeNotes: 'Initial upload',
          },
        ],
        isLatestVersion: true,
        ...(siteTimestamp && { siteTimestamp }),
      };

      await onUpload(newDoc);
      setUploadProgress(100);
      clearInterval(interval);
      
      toast.success('Document uploaded successfully!', {
        description: `${uploadedFile.name} has been added to the repository.`,
      });
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      clearInterval(interval);
      toast.error('Upload failed', {
        description: 'Please try again.',
      });
      setIsUploading(false);
      setStep('configure');
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    onClose();
  };

  if (!isOpen) return null;

  const fileInfo = uploadedFile ? getFileTypeInfo(uploadedFile) : null;
  const FileIcon = fileInfo?.icon || File;

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
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="p-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-primary-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Upload size={24} className="text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Upload Document</h2>
                  <p className="text-sm text-slate-500">
                    {step === 'select' && 'Select a file to upload'}
                    {step === 'configure' && 'Configure document details'}
                    {step === 'uploading' && 'Uploading your document...'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="p-2 rounded-xl hover:bg-white/80 transition-colors disabled:opacity-50"
                aria-label="Close modal"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6">
              {/* Step 1: File Selection */}
              {step === 'select' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200',
                      isDragging 
                        ? 'border-primary-500 bg-primary-50 scale-[1.02]' 
                        : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <motion.div
                      animate={{ y: isDragging ? -10 : 0 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-100 to-blue-100 flex items-center justify-center">
                        <Upload size={36} className="text-primary-600" />
                      </div>
                      <p className="text-lg font-medium text-slate-700 mb-2">
                        Drag & drop your file here
                      </p>
                      <p className="text-sm text-slate-500 mb-4">
                        or click to browse
                      </p>
                      <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                        <span className="px-2 py-1 bg-slate-100 rounded">PDF</span>
                        <span className="px-2 py-1 bg-slate-100 rounded">DWG</span>
                        <span className="px-2 py-1 bg-slate-100 rounded">Excel</span>
                        <span className="px-2 py-1 bg-slate-100 rounded">Images</span>
                        <span className="px-2 py-1 bg-slate-100 rounded">Videos</span>
                      </div>
                    </motion.div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileInputChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.jpg,.jpeg,.png,.mp4,.mov"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 2: Configure Document */}
              {step === 'configure' && uploadedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* File Preview */}
                  <div className={cn('flex items-center gap-4 p-4 rounded-xl border', fileInfo?.bg, 'border-slate-200')}>
                    <div className={cn('p-3 rounded-xl', fileInfo?.bg)}>
                      <FileIcon size={28} className={fileInfo?.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{uploadedFile.name}</p>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span>{fileInfo?.label}</span>
                        <span>•</span>
                        <span>{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                    <button
                      onClick={() => { setUploadedFile(null); setStep('select'); }}
                      className="p-2 rounded-lg hover:bg-white/80 transition-colors"
                    >
                      <X size={18} className="text-slate-400" />
                    </button>
                  </div>

                  {/* Auto-tagging notice for media */}
                  {siteTimestamp && (
                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <Sparkles size={18} className="text-amber-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800">Auto-captured Site Timestamp</p>
                        <p className="text-xs text-amber-600">
                          <Clock size={12} className="inline mr-1" />
                          {new Date(siteTimestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Project Selection (Mandatory) */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <FolderOpen size={16} />
                      Project <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className={cn(
                          'w-full p-3 pr-10 border rounded-xl appearance-none transition-colors',
                          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                          !selectedProject ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                        )}
                      >
                        <option value="">Select a project...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Phase & Discipline */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Phase</label>
                      <div className="relative">
                        <select
                          value={selectedPhase}
                          onChange={(e) => setSelectedPhase(e.target.value)}
                          className="w-full p-3 pr-10 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {phases.map(phase => (
                            <option key={phase} value={phase}>{phase}</option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Discipline</label>
                      <div className="relative">
                        <select
                          value={selectedDiscipline}
                          onChange={(e) => setSelectedDiscipline(e.target.value)}
                          className="w-full p-3 pr-10 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {disciplines.map(disc => (
                            <option key={disc} value={disc}>{disc}</option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Category & Document Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className={cn(
                            'w-full p-3 pr-10 border rounded-xl appearance-none transition-colors',
                            'focus:outline-none focus:ring-2 focus:ring-primary-500',
                            !selectedCategory ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                          )}
                        >
                          <option value="">Select category...</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Document Type</label>
                      <div className="relative">
                        <select
                          value={documentType}
                          onChange={(e) => setDocumentType(e.target.value)}
                          className="w-full p-3 pr-10 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {documentTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description of the document..."
                      className="w-full p-3 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={2}
                    />
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Tag size={16} />
                      Tags
                      <span className="text-xs text-slate-400 font-normal">(Auto-generated, you can edit)</span>
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-xl bg-slate-50 min-h-[44px]">
                      {tags.map(tag => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-lg text-sm"
                        >
                          #{tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="p-0.5 hover:bg-primary-200 rounded-full transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                        placeholder="Add tag..."
                        className="flex-1 min-w-[100px] bg-transparent outline-none text-sm"
                      />
                    </div>
                  </div>

                  {/* Submit for Approval Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-3">
                      <AlertCircle size={20} className="text-amber-600" />
                      <div>
                        <p className="font-medium text-slate-900">Submit for Approval</p>
                        <p className="text-sm text-slate-500">Document will be sent for review</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSubmitForApproval(!submitForApproval)}
                      className={cn(
                        'relative w-14 h-7 rounded-full transition-colors',
                        submitForApproval ? 'bg-primary-600' : 'bg-slate-300'
                      )}
                    >
                      <motion.div
                        animate={{ x: submitForApproval ? 26 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                    <Button
                      variant="outline"
                      onClick={() => { setUploadedFile(null); setStep('select'); }}
                    >
                      Back
                    </Button>
                    <Button onClick={handleUpload}>
                      <Upload size={18} />
                      Upload Document
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Uploading */}
              {step === 'uploading' && uploadedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 py-8"
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: uploadProgress < 100 ? Infinity : 0, ease: 'linear' }}
                      className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-100 to-blue-100 flex items-center justify-center"
                    >
                      {uploadProgress === 100 ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        >
                          <CheckCircle size={40} className="text-emerald-600" />
                        </motion.div>
                      ) : (
                        <Upload size={36} className="text-primary-600" />
                      )}
                    </motion.div>
                    
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {uploadProgress === 100 ? 'Upload Complete!' : 'Uploading...'}
                    </h3>
                    <p className="text-sm text-slate-500 mb-6">{uploadedFile.name}</p>

                    {/* Progress Bar */}
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Progress</span>
                        <span className="font-medium text-primary-600">{uploadProgress}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ duration: 0.3 }}
                          className={cn(
                            'h-full rounded-full',
                            uploadProgress === 100 
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
                              : 'bg-gradient-to-r from-primary-500 to-blue-500'
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
