/**
 * ImportScheduleModal - Multi-step wizard for importing schedule files
 * Supports: Excel (.xlsx), MS Project (.xml), Primavera P6 (.xer)
 * 
 * Steps:
 * 1. Upload file
 * 2. Map columns to database fields
 * 3. View import results
 */
import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
    X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
    ArrowRight, ArrowLeft, Loader2, FileText, Calendar,
    Target, Hash, Percent
} from 'lucide-react';
import Button from '@/components/ui/Button';
import schedulingService from '@/services/schedulingService';
import { toast } from 'sonner';

// Database fields that can be mapped
const DB_FIELDS = [
    { key: 'name', label: 'Task Name', icon: FileText, required: true },
    { key: 'start_date', label: 'Start Date', icon: Calendar, required: true },
    { key: 'end_date', label: 'End Date', icon: Calendar, required: true },
    { key: 'progress', label: 'Progress %', icon: Percent, required: false },
    { key: 'external_id', label: 'External ID', icon: Hash, required: false },
];

const SUPPORTED_FORMATS = {
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/xml': ['.xml'],
    'text/xml': ['.xml'],
    'application/octet-stream': ['.xer'],
};

const ImportScheduleModal = ({ onClose, projectId, onImported }) => {
    // Wizard state
    const [step, setStep] = useState(1); // 1: Upload, 2: Mapping, 3: Result

    // File state
    const [file, setFile] = useState(null);
    const [fileHeaders, setFileHeaders] = useState([]);
    const [analyzing, setAnalyzing] = useState(false);

    // Mapping state: { dbField: fileHeader }
    const [mapping, setMapping] = useState({});

    // Import state
    const [importing, setImporting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [importResult, setImportResult] = useState(null);
    const [importError, setImportError] = useState(null);

    // ESC key handler
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && !importing && !analyzing) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose, importing, analyzing]);

    // File drop handler
    const onDrop = useCallback(async (acceptedFiles, rejections) => {
        if (rejections.length > 0) {
            const error = rejections[0].errors[0]?.message || 'Unsupported file format';
            toast.error(`Cannot upload: ${error}`);
            return;
        }

        if (acceptedFiles.length === 0) return;

        const selectedFile = acceptedFiles[0];
        setFile(selectedFile);
        setAnalyzing(true);
        setImportError(null);

        try {
            const result = await schedulingService.analyzeFile(selectedFile);
            setFileHeaders(result.headers || []);

            // Auto-map common column names
            const autoMapping = {};
            const lowerHeaders = result.headers.map(h => h.toLowerCase());

            // Smart matching for common patterns
            const patterns = {
                name: ['name', 'task name', 'task_name', 'activity', 'description', 'title'],
                start_date: ['start', 'start date', 'start_date', 'begin', 'from'],
                end_date: ['end', 'end date', 'end_date', 'finish', 'to', 'due'],
                progress: ['progress', '%', 'percent', 'complete', 'percentage', 'percentcomplete'],
                external_id: ['id', 'uid', 'code', 'task_code', 'wbs', 'task id'],
            };

            Object.entries(patterns).forEach(([dbField, keywords]) => {
                const matchIdx = lowerHeaders.findIndex(h =>
                    keywords.some(kw => h.includes(kw))
                );
                if (matchIdx !== -1) {
                    autoMapping[dbField] = result.headers[matchIdx];
                }
            });

            setMapping(autoMapping);
            setStep(2); // Move to mapping step

        } catch (error) {
            console.error('File analysis failed:', error);
            setImportError(error.response?.data?.error || 'Failed to analyze file');
            toast.error('Failed to analyze file');
        } finally {
            setAnalyzing(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        accept: SUPPORTED_FORMATS,
    });

    // Handle mapping change
    const handleMappingChange = (dbField, fileHeader) => {
        setMapping(prev => ({
            ...prev,
            [dbField]: fileHeader || undefined
        }));
    };

    // Validate mapping before import
    const validateMapping = () => {
        const requiredFields = DB_FIELDS.filter(f => f.required);
        const missingFields = requiredFields.filter(f => !mapping[f.key]);

        if (missingFields.length > 0) {
            toast.error(`Please map required fields: ${missingFields.map(f => f.label).join(', ')}`);
            return false;
        }
        return true;
    };

    // Execute import
    const handleImport = async () => {
        if (!validateMapping()) return;

        setImporting(true);
        setUploadProgress(0);
        setImportError(null);

        try {
            const result = await schedulingService.importFile(
                file,
                projectId,
                mapping,
                (progress) => setUploadProgress(progress)
            );

            setImportResult(result);
            setStep(3); // Move to result step
            toast.success(`Imported ${result.created} new, updated ${result.updated} tasks`);

        } catch (error) {
            console.error('Import failed:', error);
            const errorMsg = error.response?.data?.error || 'Import failed';
            setImportError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setImporting(false);
        }
    };

    // Format file size
    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Get file type label
    const getFileTypeLabel = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        switch (ext) {
            case 'xlsx': return 'Excel Spreadsheet';
            case 'xml': return 'MS Project XML';
            case 'xer': return 'Primavera P6';
            default: return 'Schedule File';
        }
    };

    // Render step indicator
    const renderStepIndicator = () => (
        <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                        }`}>
                        {step > s ? <CheckCircle2 size={16} /> : s}
                    </div>
                    {s < 3 && (
                        <div className={`w-12 h-0.5 mx-1 ${step > s ? 'bg-primary-600' : 'bg-slate-200'
                            }`} />
                    )}
                </div>
            ))}
        </div>
    );

    // Step 1: Upload
    const renderUploadStep = () => (
        <div className="space-y-4">
            <p className="text-sm text-slate-600 text-center">
                Upload your project schedule file to import tasks
            </p>

            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragActive
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                    }`}
            >
                <input {...getInputProps()} />
                {analyzing ? (
                    <>
                        <Loader2 size={40} className="mx-auto text-primary-600 animate-spin" />
                        <p className="text-sm text-slate-600 mt-3">Analyzing file structure...</p>
                    </>
                ) : (
                    <>
                        <Upload size={40} className={`mx-auto ${isDragActive ? 'text-primary-600' : 'text-slate-400'}`} />
                        <p className="text-sm text-slate-600 mt-3">
                            {isDragActive ? 'Drop your file here' : 'Drag & drop, or click to browse'}
                        </p>
                        <div className="flex justify-center gap-3 mt-3">
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">.xlsx</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">.xml (MSP)</span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded font-medium">.xer (P6)</span>
                        </div>
                    </>
                )}
            </div>

            {importError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle size={16} />
                    {importError}
                </div>
            )}
        </div>
    );

    // Step 2: Mapping
    const renderMappingStep = () => (
        <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <FileSpreadsheet size={20} className="text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{file?.name}</p>
                    <p className="text-xs text-slate-500">{formatSize(file?.size)} • {getFileTypeLabel(file?.name)}</p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                    {fileHeaders.length} columns
                </span>
            </div>

            {/* Mapping UI */}
            <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">Map file columns to task fields:</p>

                {DB_FIELDS.map((field) => {
                    const Icon = field.icon;
                    return (
                        <div key={field.key} className="flex items-center gap-3">
                            <div className={`w-40 flex items-center gap-2 ${field.required ? 'font-medium' : ''}`}>
                                <Icon size={16} className="text-slate-500" />
                                <span className="text-sm text-slate-700">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                </span>
                            </div>
                            <ArrowLeft size={16} className="text-slate-400" />
                            <select
                                value={mapping[field.key] || ''}
                                onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${field.required && !mapping[field.key]
                                    ? 'border-amber-300 bg-amber-50'
                                    : 'border-slate-200 bg-white'
                                    }`}
                            >
                                <option value="">-- Select Column --</option>
                                {fileHeaders.map((header) => (
                                    <option key={header} value={header}>{header}</option>
                                ))}
                            </select>
                        </div>
                    );
                })}
            </div>

            {/* Import progress */}
            {importing && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>Importing tasks...</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-primary-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {importError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle size={16} />
                    {importError}
                </div>
            )}
        </div>
    );

    // Step 3: Result
    const renderResultStep = () => (
        <div className="space-y-6 py-4">
            <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Import Successful!</h3>
                <p className="text-sm text-slate-600 mt-1">
                    Your schedule has been imported into the project
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-xl border border-green-200 text-center">
                    <div className="text-3xl font-bold text-green-700">{importResult?.created || 0}</div>
                    <div className="text-sm text-green-600 font-medium">New Tasks Created</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-center">
                    <div className="text-3xl font-bold text-blue-700">{importResult?.updated || 0}</div>
                    <div className="text-sm text-blue-600 font-medium">Tasks Updated</div>
                </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-800 text-sm">
                <Target size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                    <span className="font-medium">Next Steps:</span> Mark tasks as "Milestones" in the Gantt chart to enable budget allocation and billing.
                </div>
            </div>
        </div>
    );

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-neutral-700 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-neutral-800 dark:to-neutral-800">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <FileSpreadsheet className="text-primary-600 dark:text-indigo-400" size={20} />
                            Import Schedule
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                            {step === 1 && 'Step 1: Upload File'}
                            {step === 2 && 'Step 2: Map Columns'}
                            {step === 3 && 'Step 3: Complete'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/50 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                        disabled={importing}
                    >
                        <X size={20} className="text-slate-500 dark:text-neutral-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5">
                    {renderStepIndicator()}

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {step === 1 && renderUploadStep()}
                            {step === 2 && renderMappingStep()}
                            {step === 3 && renderResultStep()}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center p-4 border-t border-slate-200 bg-slate-50">
                    {step === 1 && (
                        <>
                            <div />
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => { setStep(1); setFile(null); setFileHeaders([]); }}
                                disabled={importing}
                            >
                                <ArrowLeft size={16} className="mr-1" /> Back
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={importing}
                                className="bg-primary-600 text-white"
                            >
                                {importing ? (
                                    <>
                                        <Loader2 size={16} className="mr-2 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        Import Schedule <ArrowRight size={16} className="ml-1" />
                                    </>
                                )}
                            </Button>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <div />
                            <Button
                                onClick={() => { onImported && onImported(); onClose(); }}
                                className="bg-primary-600 text-white"
                            >
                                <CheckCircle2 size={16} className="mr-2" /> Done
                            </Button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default ImportScheduleModal;
