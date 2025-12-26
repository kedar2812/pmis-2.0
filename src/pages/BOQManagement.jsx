import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import financeService from '@/services/financeService';
import projectService from '@/services/projectService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Upload, FileSpreadsheet, Check, AlertTriangle, Save, ArrowRight, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const BOQManagement = () => {
    const { user } = useAuth();
    const fileInputRef = useRef(null);

    // Data State
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [boqItems, setBoqItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // Import Wizard State
    const [importMode, setImportMode] = useState(false);
    const [impStep, setImpStep] = useState(1); // 1: Upload, 2: Map, 3: Confirm/Success
    const [impFile, setImpFile] = useState(null);
    const [fileHeaders, setFileHeaders] = useState([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    // Column Mapping: { dbField: fileHeader }
    const [mapping, setMapping] = useState({
        item_code: '',
        description: '',
        uom: '',
        quantity: '',
        rate: ''
    });

    const dbFields = [
        { key: 'item_code', label: 'Item Code / S.No', required: true, hint: 'Unique identifier for each BOQ line' },
        { key: 'description', label: 'Description / Particulars', required: true, hint: 'Work description' },
        { key: 'uom', label: 'Unit of Measurement', required: false, hint: 'e.g., Cum, Sqm, RM, LS' },
        { key: 'quantity', label: 'Quantity', required: true, hint: 'Sanctioned quantity' },
        { key: 'rate', label: 'Rate / Unit Price', required: true, hint: 'Rate per unit (₹)' }
    ];

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        if (selectedProject && !importMode) {
            fetchBOQ();
        }
    }, [selectedProject, importMode]);

    const fetchProjects = async () => {
        try {
            const data = await projectService.getAllProjects();
            setProjects(data);
            if (data.length > 0) setSelectedProject(data[0].id);
        } catch (error) {
            toast.error('Failed to load projects');
        }
    };

    const fetchBOQ = async () => {
        setLoading(true);
        try {
            const data = await financeService.getBOQItems(selectedProject);
            setBoqItems(data);
        } catch (error) {
            toast.error('Failed to load BOQ');
        } finally {
            setLoading(false);
        }
    };

    // --- IMPORT WIZARD HANDLERS ---

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImpFile(file);
            setFileHeaders([]);
            setImportResult(null);
            // Auto-analyze on file select
            analyzeFile(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const analyzeFile = async (file) => {
        if (!file) return;

        setAnalyzing(true);
        try {
            const res = await financeService.analyzeBOQFile(file);
            setFileHeaders(res.headers || []);

            // Auto-Map using fuzzy matching
            const newMapping = { item_code: '', description: '', uom: '', quantity: '', rate: '' };
            (res.headers || []).forEach(h => {
                const lower = h.toLowerCase();
                // Item Code matching
                if (!newMapping.item_code && (lower.includes('code') || lower.includes('s.no') || lower.includes('sno') || lower.includes('sl.no') || lower === 'no' || lower === 'id')) {
                    newMapping.item_code = h;
                }
                // Description matching
                if (!newMapping.description && (lower.includes('desc') || lower.includes('particular') || lower.includes('item') || lower.includes('work'))) {
                    newMapping.description = h;
                }
                // UOM matching
                if (!newMapping.uom && (lower.includes('unit') || lower.includes('uom') || lower === 'u/m')) {
                    newMapping.uom = h;
                }
                // Quantity matching
                if (!newMapping.quantity && (lower.includes('qty') || lower.includes('quant') || lower.includes('nos'))) {
                    newMapping.quantity = h;
                }
                // Rate matching
                if (!newMapping.rate && (lower.includes('rate') || lower.includes('price') || lower.includes('cost'))) {
                    newMapping.rate = h;
                }
            });
            setMapping(newMapping);
            setImpStep(2);
            toast.success(`Found ${res.headers.length} columns in ${file.name}`);
        } catch (err) {
            console.error('Analyze error:', err);
            toast.error(err.response?.data?.error || 'Failed to analyze file. Check the file format.');
            setImpStep(1);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleImport = async () => {
        // Validate Mapping
        const missing = [];
        if (!mapping.item_code) missing.push('Item Code');
        if (!mapping.quantity) missing.push('Quantity');
        if (!mapping.rate) missing.push('Rate');

        if (missing.length > 0) {
            return toast.error(`Please map required columns: ${missing.join(', ')}`);
        }

        setImporting(true);
        try {
            const res = await financeService.importBOQFile(selectedProject, impFile, mapping);
            setImportResult(res);
            setImpStep(3);
            toast.success(`Successfully imported ${res.imported} BOQ items!`);
        } catch (err) {
            console.error('Import error:', err);
            toast.error(err.response?.data?.error || 'Import failed. Check column mapping.');
        } finally {
            setImporting(false);
        }
    };

    const resetWizard = () => {
        setImportMode(false);
        setImpStep(1);
        setImpFile(null);
        setFileHeaders([]);
        setMapping({ item_code: '', description: '', uom: '', quantity: '', rate: '' });
        setImportResult(null);
        fetchBOQ();
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        Bill of Quantities (BOQ)
                    </h1>
                    <p className="text-slate-500 mt-1">Manage Contract Baselines and Sanctioned Quantities</p>
                </div>

                <div className="flex gap-3 items-center">
                    <select
                        className="px-4 py-2 border border-slate-200 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                    >
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    {!importMode ? (
                        <Button onClick={() => setImportMode(true)} className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Import BOQ
                        </Button>
                    ) : (
                        <Button variant="secondary" onClick={resetWizard}>
                            Cancel Import
                        </Button>
                    )}
                </div>
            </div>

            {/* --- IMPORT WIZARD UI --- */}
            <AnimatePresence mode="wait">
                {importMode && (
                    <motion.div
                        key="import-wizard"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Card className="border-primary-100 shadow-xl overflow-hidden">
                            {/* Progress Bar */}
                            <div className="h-1 bg-slate-100">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-primary-500 to-primary-600"
                                    initial={{ width: '33%' }}
                                    animate={{ width: impStep === 1 ? '33%' : impStep === 2 ? '66%' : '100%' }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>

                            <CardHeader className="bg-gradient-to-r from-primary-50 to-blue-50 border-b border-primary-100">
                                <CardTitle className="text-primary-900 flex items-center gap-3">
                                    <div className="p-2 bg-primary-100 rounded-lg">
                                        <FileSpreadsheet className="w-5 h-5 text-primary-600" />
                                    </div>
                                    <div>
                                        <span className="block">Import Wizard</span>
                                        <span className="text-sm font-normal text-primary-600">
                                            Step {impStep} of 3: {impStep === 1 ? 'Upload File' : impStep === 2 ? 'Map Columns' : 'Complete'}
                                        </span>
                                    </div>
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="p-6">
                                {/* Step 1: Upload */}
                                {impStep === 1 && (
                                    <div className="flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed border-primary-200 rounded-xl bg-gradient-to-br from-primary-50/50 to-blue-50/50">
                                        <div className="p-4 bg-primary-100 rounded-full mb-6">
                                            <FileSpreadsheet className="w-12 h-12 text-primary-600" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Upload Excel File</h3>
                                        <p className="text-slate-500 mb-6 text-center max-w-md">
                                            Upload your BOQ Excel file (.xlsx). Ensure the first row contains column headers.
                                        </p>

                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept=".xlsx,.xls"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />

                                        <Button
                                            onClick={triggerFileInput}
                                            disabled={analyzing}
                                            className="px-8 py-3 text-base"
                                        >
                                            {analyzing ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                    Analyzing...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-5 h-5 mr-2" />
                                                    Select Excel File
                                                </>
                                            )}
                                        </Button>

                                        {impFile && (
                                            <div className="mt-4 px-4 py-2 bg-white rounded-lg border border-primary-200 text-sm text-slate-700 flex items-center gap-2">
                                                <FileSpreadsheet className="w-4 h-4 text-primary-500" />
                                                {impFile.name}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Step 2: Map Columns */}
                                {impStep === 2 && (
                                    <div className="space-y-6">
                                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <h4 className="font-semibold text-amber-800">Verify Column Mapping</h4>
                                                <p className="text-sm text-amber-700">
                                                    We auto-detected columns based on header names. Please verify and correct if needed.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {dbFields.map(field => (
                                                <div key={field.key} className="space-y-2">
                                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                                        {field.label}
                                                        {field.required && <span className="text-red-500">*</span>}
                                                        {mapping[field.key] && (
                                                            <Check className="w-4 h-4 text-green-500" />
                                                        )}
                                                    </label>
                                                    <select
                                                        className={`w-full px-3 py-2.5 border rounded-lg bg-white transition-all focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${mapping[field.key]
                                                                ? 'border-green-300 bg-green-50/50'
                                                                : field.required
                                                                    ? 'border-amber-300'
                                                                    : 'border-slate-200'
                                                            }`}
                                                        value={mapping[field.key]}
                                                        onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                                                    >
                                                        <option value="">-- Select Column --</option>
                                                        {fileHeaders.map(h => (
                                                            <option key={h} value={h}>{h}</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-xs text-slate-400">{field.hint}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex justify-between pt-6 border-t border-slate-100">
                                            <Button variant="secondary" onClick={() => setImpStep(1)}>
                                                <ArrowLeft className="w-4 h-4 mr-2" />
                                                Back
                                            </Button>
                                            <Button onClick={handleImport} disabled={importing}>
                                                {importing ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Importing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4 mr-2" />
                                                        Import BOQ Items
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Success */}
                                {impStep === 3 && importResult && (
                                    <div className="text-center py-8">
                                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                                            <Check className="w-8 h-8 text-green-600" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Import Complete!</h3>
                                        <p className="text-slate-500 mb-6">
                                            Successfully imported <span className="font-bold text-primary-600">{importResult.imported}</span> BOQ items.
                                        </p>

                                        {importResult.errors && importResult.errors.length > 0 && (
                                            <div className="mb-6 p-4 bg-amber-50 rounded-lg text-left">
                                                <p className="text-sm font-medium text-amber-800 mb-2">Some rows had issues:</p>
                                                <ul className="text-xs text-amber-700 space-y-1">
                                                    {importResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
                                                </ul>
                                            </div>
                                        )}

                                        <Button onClick={resetWizard}>
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            View Imported Data
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- BOQ TABLE --- */}
            {!importMode && (
                <Card className="shadow-lg">
                    <CardContent className="p-0 overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b">
                                        <tr>
                                            <th className="px-6 py-4 text-left font-semibold">Item Code</th>
                                            <th className="px-6 py-4 text-left font-semibold">Description</th>
                                            <th className="px-6 py-4 text-left font-semibold">UOM</th>
                                            <th className="px-6 py-4 text-right font-semibold">Quantity</th>
                                            <th className="px-6 py-4 text-right font-semibold">Rate</th>
                                            <th className="px-6 py-4 text-right font-semibold">Amount</th>
                                            <th className="px-6 py-4 text-center font-semibold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {boqItems.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-16 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <FileSpreadsheet className="w-12 h-12 text-slate-300 mb-4" />
                                                        <p className="text-slate-500 font-medium">No BOQ Items Found</p>
                                                        <p className="text-slate-400 text-sm">Import an Excel file to get started</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            boqItems.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-primary-700">{item.item_code}</td>
                                                    <td className="px-6 py-4 text-slate-600 max-w-md">
                                                        <span className="line-clamp-2" title={item.description}>
                                                            {item.description}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500">{item.uom}</td>
                                                    <td className="px-6 py-4 text-right font-mono text-slate-700">
                                                        {parseFloat(item.quantity).toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-slate-700">
                                                        {formatCurrency(item.rate)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                                                        {formatCurrency(item.amount)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${item.status === 'FROZEN'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    {boqItems.length > 0 && (
                                        <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                            <tr>
                                                <td colSpan="5" className="px-6 py-4 text-right font-bold text-slate-700">
                                                    Total Contract Value:
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-lg text-primary-700">
                                                    {formatCurrency(boqItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0))}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default BOQManagement;
