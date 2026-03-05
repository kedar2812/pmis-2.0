/**
 * ImportScheduleModal - Multi-step wizard for importing schedule files
 * Supports: Excel (.xlsx), MS Project (.xml), Primavera P6 (.xer)
 * 
 * Steps:
 * 1. Upload file
 * 2. Map columns to database fields (ALL file columns shown, user can drop/skip)
 * 3. Preview data with inline error fixing
 * 4. View import results
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
    X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
    ArrowRight, ArrowLeft, Loader2, FileText, Calendar,
    Target, Hash, Percent, Eye, Trash2, Edit3, MapPin,
    DollarSign, Flag, Zap, BarChart3, Layers,
    ChevronDown, ChevronUp, AlertTriangle, Info
} from 'lucide-react';
import Button from '@/components/ui/Button';
import schedulingService from '@/services/schedulingService';
import { toast } from 'sonner';

// ALL database fields that can be mapped to
const DB_FIELDS = [
    // === Required ===
    { key: 'name', label: 'Task Name', icon: FileText, required: true, group: 'required' },
    { key: 'start_date', label: 'Start Date', icon: Calendar, required: true, group: 'required' },
    { key: 'end_date', label: 'End Date', icon: Calendar, required: true, group: 'required' },
    // === Identity ===
    { key: 'external_id', label: 'External ID / Code', icon: Hash, required: false, group: 'identity' },
    { key: 'wbs_code', label: 'WBS Code', icon: Layers, required: false, group: 'identity' },
    { key: 'description', label: 'Description', icon: FileText, required: false, group: 'identity' },
    // === Progress & Status ===
    { key: 'computed_progress', label: 'Progress %', icon: Percent, required: false, group: 'progress' },
    { key: 'status', label: 'Status', icon: Flag, required: false, group: 'progress' },
    { key: 'progress_method', label: 'Progress Method', icon: BarChart3, required: false, group: 'progress' },
    // === Actual Dates ===
    { key: 'actual_start_date', label: 'Actual Start Date', icon: Calendar, required: false, group: 'actual' },
    { key: 'actual_end_date', label: 'Actual End Date', icon: Calendar, required: false, group: 'actual' },
    // === Cost & Weight ===
    { key: 'budgeted_cost', label: 'Budgeted Cost', icon: DollarSign, required: false, group: 'cost' },
    { key: 'weight', label: 'Weight', icon: Zap, required: false, group: 'cost' },
    // === Flags ===
    { key: 'is_milestone', label: 'Is Milestone?', icon: Target, required: false, group: 'flags' },
    { key: 'is_critical', label: 'Critical Path?', icon: AlertTriangle, required: false, group: 'flags' },
];

const DB_FIELD_GROUPS = [
    { key: 'required', label: 'Required Fields' },
    { key: 'identity', label: 'Identification' },
    { key: 'progress', label: 'Progress & Status' },
    { key: 'actual', label: 'Actual Dates' },
    { key: 'cost', label: 'Cost & Weight' },
    { key: 'flags', label: 'Flags' },
];

const SUPPORTED_FORMATS = {
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/xml': ['.xml'],
    'text/xml': ['.xml'],
    'application/octet-stream': ['.xer'],
};

const ImportScheduleModal = ({ onClose, projectId, onImported }) => {
    // Wizard state — 4 steps now
    const [step, setStep] = useState(1); // 1: Upload, 2: Mapping, 3: Preview, 4: Result

    // File state
    const [file, setFile] = useState(null);
    const [fileHeaders, setFileHeaders] = useState([]);
    const [analyzing, setAnalyzing] = useState(false);

    // Mapping state: { dbField: fileHeader }
    const [mapping, setMapping] = useState({});
    // Track which file columns user explicitly dropped
    const [droppedColumns, setDroppedColumns] = useState(new Set());

    // Import state
    const [importing, setImporting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [importResult, setImportResult] = useState(null);
    const [importError, setImportError] = useState(null);

    // Collapsed groups
    const [collapsedGroups, setCollapsedGroups] = useState(new Set(['actual', 'cost', 'flags']));

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

    // Compute unmapped file columns (columns from file that aren't assigned to any DB field)
    const unmappedFileColumns = useMemo(() => {
        const assignedHeaders = new Set(Object.values(mapping).filter(Boolean));
        return fileHeaders.filter(h => !assignedHeaders.has(h) && !droppedColumns.has(h));
    }, [fileHeaders, mapping, droppedColumns]);

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

            // Smart auto-mapping
            const autoMapping = {};
            const lowerHeaders = result.headers.map(h => h.toLowerCase());

            const patterns = {
                name: ['task_name', 'name', 'activity', 'description', 'title', 'task name'],
                start_date: ['target_start_date', 'start_date', 'start date', 'start', 'begin', 'from'],
                end_date: ['target_end_date', 'end_date', 'end date', 'end', 'finish', 'to', 'due'],
                computed_progress: ['phys_complete_pct', 'progress', 'percent', 'complete', 'percentcomplete', '%'],
                external_id: ['task_code', 'uid', 'id', 'code', 'wbs', 'task id', 'task_id'],
                wbs_code: ['wbs_code', 'wbs', 'outlinenumber', 'outline'],
                description: ['task_description', 'desc', 'notes'],
                actual_start_date: ['act_start_date', 'actual_start', 'actual start'],
                actual_end_date: ['act_end_date', 'actual_end', 'actual end', 'actual finish'],
                budgeted_cost: ['target_cost', 'budget', 'cost', 'budgeted', 'total_cost'],
                weight: ['task_weight', 'weight', 'weightage'],
                is_milestone: ['milestone', 'is_milestone', 'milestone_flag'],
                is_critical: ['critical', 'is_critical', 'critical_flag', 'driving_flag'],
                status: ['status', 'task_status', 'state'],
            };

            // Prioritize exact matches first, then partial
            Object.entries(patterns).forEach(([dbField, keywords]) => {
                // Try exact match first
                let matchIdx = lowerHeaders.findIndex(h => keywords.includes(h));
                // Then try partial includes
                if (matchIdx === -1) {
                    matchIdx = lowerHeaders.findIndex(h =>
                        keywords.some(kw => h.includes(kw))
                    );
                }
                if (matchIdx !== -1) {
                    autoMapping[dbField] = result.headers[matchIdx];
                }
            });

            setMapping(autoMapping);
            setStep(2);

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

    // Drop a file column
    const handleDropColumn = (header) => {
        setDroppedColumns(prev => new Set([...prev, header]));
        // Remove from mapping if it was mapped
        setMapping(prev => {
            const updated = { ...prev };
            for (const [k, v] of Object.entries(updated)) {
                if (v === header) delete updated[k];
            }
            return updated;
        });
    };

    // Restore a dropped column
    const handleRestoreColumn = (header) => {
        setDroppedColumns(prev => {
            const s = new Set(prev);
            s.delete(header);
            return s;
        });
    };

    // Toggle group collapse
    const toggleGroup = (groupKey) => {
        setCollapsedGroups(prev => {
            const s = new Set(prev);
            if (s.has(groupKey)) s.delete(groupKey);
            else s.add(groupKey);
            return s;
        });
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
            setStep(3);
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

    // Count of mapped columns
    const mappedCount = Object.values(mapping).filter(Boolean).length;
    const totalFileColumns = fileHeaders.length;
    const droppedCount = droppedColumns.size;

    // Render step indicator
    const renderStepIndicator = () => (
        <div className="flex items-center justify-center gap-2 mb-5">
            {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-200 dark:bg-neutral-700 text-slate-500 dark:text-neutral-400'
                        }`}>
                        {step > s ? <CheckCircle2 size={16} /> : s}
                    </div>
                    {s < 3 && (
                        <div className={`w-12 h-0.5 mx-1 ${step > s ? 'bg-primary-600' : 'bg-slate-200 dark:bg-neutral-700'
                            }`} />
                    )}
                </div>
            ))}
        </div>
    );

    // Step 1: Upload
    const renderUploadStep = () => (
        <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-neutral-300 text-center">
                Upload your project schedule file to import tasks
            </p>

            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragActive
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-slate-300 dark:border-neutral-600 hover:border-slate-400 dark:hover:border-neutral-500 hover:bg-slate-50 dark:hover:bg-neutral-800'
                    }`}
            >
                <input {...getInputProps()} />
                {analyzing ? (
                    <>
                        <Loader2 size={40} className="mx-auto text-primary-600 animate-spin" />
                        <p className="text-sm text-slate-600 dark:text-neutral-300 mt-3">Analyzing file structure...</p>
                    </>
                ) : (
                    <>
                        <Upload size={40} className={`mx-auto ${isDragActive ? 'text-primary-600' : 'text-slate-400'}`} />
                        <p className="text-sm text-slate-600 dark:text-neutral-300 mt-3">
                            {isDragActive ? 'Drop your file here' : 'Drag & drop, or click to browse'}
                        </p>
                        <div className="flex justify-center gap-3 mt-3">
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded font-medium">.xlsx</span>
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded font-medium">.xml (MSP)</span>
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded font-medium">.xer (P6)</span>
                        </div>
                    </>
                )}
            </div>

            {importError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
                    <AlertCircle size={16} />
                    {importError}
                </div>
            )}
        </div>
    );

    // Step 2: Mapping with ALL columns
    const renderMappingStep = () => (
        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            {/* File info bar */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-neutral-800 rounded-lg border border-slate-200 dark:border-neutral-700">
                <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <FileSpreadsheet size={20} className="text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{file?.name}</p>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">{formatSize(file?.size)} • {getFileTypeLabel(file?.name)}</p>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full font-medium">
                        {totalFileColumns} columns
                    </span>
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full font-medium">
                        {mappedCount} mapped
                    </span>
                </div>
            </div>

            {/* Column mapping - grouped */}
            <div className="space-y-1">
                <p className="text-sm font-medium text-slate-700 dark:text-neutral-300 mb-2">Map file columns to task fields:</p>

                {DB_FIELD_GROUPS.map((group) => {
                    const groupFields = DB_FIELDS.filter(f => f.group === group.key);
                    const isCollapsed = collapsedGroups.has(group.key);
                    const mappedInGroup = groupFields.filter(f => mapping[f.key]).length;

                    return (
                        <div key={group.key} className="border border-slate-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleGroup(group.key)}
                                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-750 transition-colors text-left"
                            >
                                <span className="text-xs font-semibold text-slate-600 dark:text-neutral-400 uppercase tracking-wide">
                                    {group.label}
                                </span>
                                <div className="flex items-center gap-2">
                                    {mappedInGroup > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                                            {mappedInGroup}/{groupFields.length}
                                        </span>
                                    )}
                                    {isCollapsed ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
                                </div>
                            </button>

                            {!isCollapsed && (
                                <div className="p-2 space-y-2">
                                    {groupFields.map((field) => {
                                        const Icon = field.icon;
                                        return (
                                            <div key={field.key} className="flex items-center gap-2">
                                                <div className="w-[140px] flex items-center gap-1.5 flex-shrink-0">
                                                    <Icon size={14} className="text-slate-400 dark:text-neutral-500" />
                                                    <span className={`text-xs text-slate-700 dark:text-neutral-300 ${field.required ? 'font-semibold' : ''}`}>
                                                        {field.label}
                                                        {field.required && <span className="text-red-500 ml-0.5">*</span>}
                                                    </span>
                                                </div>
                                                <ArrowLeft size={12} className="text-slate-300 dark:text-neutral-600 flex-shrink-0" />
                                                <select
                                                    value={mapping[field.key] || ''}
                                                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                                    className={`flex-1 px-2 py-1.5 border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${field.required && !mapping[field.key]
                                                        ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-700'
                                                        : mapping[field.key]
                                                            ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10 dark:border-green-700'
                                                            : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 dark:text-white'
                                                        }`}
                                                >
                                                    <option value="">— Skip —</option>
                                                    {fileHeaders.filter(h => !droppedColumns.has(h)).map((header) => (
                                                        <option key={header} value={header}>{header}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Unmapped file columns — user can review/drop these */}
            {unmappedFileColumns.length > 0 && (
                <div className="border border-slate-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-200 dark:border-amber-800">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <Info size={12} />
                            {unmappedFileColumns.length} unmapped column{unmappedFileColumns.length !== 1 ? 's' : ''} (stored in metadata)
                        </p>
                    </div>
                    <div className="p-2 flex flex-wrap gap-1.5">
                        {unmappedFileColumns.map(header => (
                            <div
                                key={header}
                                className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-neutral-800 rounded text-xs text-slate-600 dark:text-neutral-400 group"
                            >
                                <span className="max-w-[140px] truncate">{header}</span>
                                <button
                                    onClick={() => handleDropColumn(header)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                                    title="Drop this column"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Dropped columns */}
            {droppedCount > 0 && (
                <div className="border border-red-200 dark:border-red-900/50 rounded-lg p-2">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1.5 flex items-center gap-1">
                        <Trash2 size={12} />
                        {droppedCount} dropped column{droppedCount !== 1 ? 's' : ''}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {[...droppedColumns].map(header => (
                            <button
                                key={header}
                                onClick={() => handleRestoreColumn(header)}
                                className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded text-xs hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors line-through"
                                title="Click to restore"
                            >
                                {header}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Import progress */}
            {importing && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-600 dark:text-neutral-400">
                        <span>Importing tasks...</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-primary-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {importError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                    <div className="flex items-center gap-2 font-medium mb-1">
                        <AlertCircle size={16} />
                        Import Error
                    </div>
                    <p className="text-xs">{importError}</p>
                </div>
            )}
        </div>
    );

    // Step 3: Result
    const renderResultStep = () => (
        <div className="space-y-6 py-4">
            <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Import Successful!</h3>
                <p className="text-sm text-slate-600 dark:text-neutral-400 mt-1">
                    Your schedule has been imported into the project
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 text-center">
                    <div className="text-3xl font-bold text-green-700 dark:text-green-400">{importResult?.created || 0}</div>
                    <div className="text-sm text-green-600 dark:text-green-500 font-medium">New Tasks Created</div>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 text-center">
                    <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">{importResult?.updated || 0}</div>
                    <div className="text-sm text-blue-600 dark:text-blue-500 font-medium">Tasks Updated</div>
                </div>
            </div>

            {/* Error rows */}
            {importResult?.error_count > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                        <AlertTriangle size={14} />
                        {importResult.error_count} row{importResult.error_count !== 1 ? 's' : ''} had errors
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                        {importResult.errors?.slice(0, 10).map((err, i) => (
                            <div key={i} className="text-xs text-amber-600 dark:text-amber-400">
                                Row {err.row}: {err.error}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* EDMS Filing Status */}
            {importResult?.edms && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                            <FileSpreadsheet size={14} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                            Filed in EDMS
                        </span>
                        <span className="ml-auto px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-[10px] rounded-full font-bold">
                            v{importResult.edms.version_number}
                        </span>
                    </div>
                    <div className="space-y-1 text-xs text-indigo-700 dark:text-indigo-300">
                        <p><span className="font-medium">Document:</span> {importResult.edms.document_title}</p>
                        {importResult.edms.folder_path && (
                            <p><span className="font-medium">Folder:</span> 📁 {importResult.edms.folder_path}</p>
                        )}
                        {importResult.edms.is_duplicate && (
                            <p className="text-amber-600 dark:text-amber-400 italic">
                                ⚠️ {importResult.edms.message}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => window.location.href = `/edms?doc=${importResult.edms.document_id}`}
                        className="mt-2 w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5"
                    >
                        <Eye size={12} />
                        View in EDMS
                    </button>
                </div>
            )}
            {importResult?.edms_warning && (
                <div className="p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ EDMS: {importResult.edms_warning}
                </div>
            )}

            <div className="p-3 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg">
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                    <span className="font-medium">Note:</span> All unmapped columns from your file have been preserved in each task's metadata field for future reference.
                </p>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2 text-amber-800 dark:text-amber-300 text-sm">
                <Target size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                    <span className="font-medium">Next Steps:</span> Mark tasks as milestones in the Gantt chart to enable budget allocation and billing.
                </div>
            </div>
        </div>
    );

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
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
                <div className="flex justify-between items-center p-4 border-t border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800">
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
                                onClick={() => { setStep(1); setFile(null); setFileHeaders([]); setDroppedColumns(new Set()); }}
                                disabled={importing}
                            >
                                <ArrowLeft size={16} className="mr-1" /> Back
                            </Button>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 dark:text-neutral-400">
                                    {mappedCount}/{totalFileColumns} columns mapped
                                </span>
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
                            </div>
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
