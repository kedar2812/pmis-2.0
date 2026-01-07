import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import financeService from '@/services/financeService';
import projectService from '@/services/projectService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import BOQMilestoneMappingModal from '@/components/cost/BOQMilestoneMappingModal';
import {
    Upload, FileSpreadsheet, Check, AlertTriangle, Save, ArrowLeft,
    RefreshCw, Loader2, ChevronUp, ChevronDown, ChevronsUpDown, Search, X, Filter,
    Download, ChevronLeft, ChevronRight, MoreHorizontal, Link2, Edit2, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import EditBOQItemModal from '@/components/cost/EditBOQItemModal';

const BOQManagement = () => {
    const { user } = useAuth();
    const fileInputRef = useRef(null);

    // Data State
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [boqItems, setBoqItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // Milestone Mapping Modal State
    const [mappingModalItem, setMappingModalItem] = useState(null);
    const [editItem, setEditItem] = useState(null);

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'item_code', direction: 'asc' });

    // Filter State
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        item_code: '',
        description: '',
        uom: '',
        status: ''
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Import Wizard State
    const [importMode, setImportMode] = useState(false);
    const [impStep, setImpStep] = useState(1);
    const [impFile, setImpFile] = useState(null);
    const [fileHeaders, setFileHeaders] = useState([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    // Column Mapping
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
        { key: 'rate', label: 'Rate / Unit Price', required: true, hint: 'Rate per unit (â‚¹)' }
    ];

    // Table Columns Configuration
    const columns = [
        { key: 'item_code', label: 'Item Code', align: 'left', sortable: true, filterable: true },
        { key: 'description', label: 'Description', align: 'left', sortable: true, filterable: true },
        { key: 'uom', label: 'UOM', align: 'left', sortable: true, filterable: true },
        { key: 'quantity', label: 'Quantity', align: 'right', sortable: true, filterable: false, numeric: true },
        { key: 'rate', label: 'Rate', align: 'right', sortable: true, filterable: false, numeric: true },
        { key: 'amount', label: 'Amount', align: 'right', sortable: true, filterable: false, numeric: true },
        { key: 'status', label: 'Status', align: 'center', sortable: true, filterable: true },
        { key: 'actions', label: 'Actions', align: 'center', sortable: false, filterable: false }
    ];

    // --- ACTIONS HANDLERS ---

    const handleDownloadTemplate = () => {
        const wb = XLSX.utils.book_new();
        // Create headers only, no data rows
        const ws = XLSX.utils.json_to_sheet([], {
            header: ['Item Code', 'Description', 'UOM', 'Quantity', 'Rate']
        });

        // Add column widths for better UX
        ws['!cols'] = [
            { wch: 15 }, // Item Code
            { wch: 40 }, // Description
            { wch: 10 }, // UOM
            { wch: 15 }, // Quantity
            { wch: 15 }  // Rate
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'BOQ Template');
        XLSX.writeFile(wb, 'BOQ_Import_Template.xlsx');
        toast.success('Template downloaded');
    };

    const handleEditItem = (item) => {
        setEditItem(item);
    };

    const handleDeleteItem = async (itemId) => {
        if (!confirm('Are you sure you want to delete this BOQ item?')) return;
        try {
            await financeService.deleteBOQItem(itemId);
            toast.success('Item deleted');
            fetchBOQ();
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('Failed to delete item');
        }
    };

    const handleSaveEdit = async (itemId, data) => {
        await financeService.updateBOQItem(itemId, data);
        fetchBOQ();
    };

    const handleRefresh = () => {
        fetchBOQ();
        toast.success('Data refreshed');
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        if (selectedProject && !importMode) {
            fetchBOQ();
        }
    }, [selectedProject, importMode]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters, sortConfig]);

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

    // --- SORTING & FILTERING LOGIC ---

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({ item_code: '', description: '', uom: '', status: '' });
    };

    const hasActiveFilters = Object.values(filters).some(v => v !== '');

    // Get unique values for dropdowns
    const uniqueUOMs = useMemo(() => {
        return [...new Set(boqItems.map(item => item.uom).filter(Boolean))].sort();
    }, [boqItems]);

    const uniqueStatuses = useMemo(() => {
        return [...new Set(boqItems.map(item => item.status).filter(Boolean))].sort();
    }, [boqItems]);

    // Apply filters and sorting
    const filteredAndSortedItems = useMemo(() => {
        let items = [...boqItems];

        // Apply filters
        if (filters.item_code) {
            items = items.filter(item =>
                item.item_code?.toLowerCase().includes(filters.item_code.toLowerCase())
            );
        }
        if (filters.description) {
            items = items.filter(item =>
                item.description?.toLowerCase().includes(filters.description.toLowerCase())
            );
        }
        if (filters.uom) {
            items = items.filter(item => item.uom === filters.uom);
        }
        if (filters.status) {
            items = items.filter(item => item.status === filters.status);
        }

        // Apply sorting
        items.sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            if (['quantity', 'rate', 'amount'].includes(sortConfig.key)) {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else {
                aVal = String(aVal || '').toLowerCase();
                bVal = String(bVal || '').toLowerCase();
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return items;
    }, [boqItems, filters, sortConfig]);

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedItems.slice(start, start + itemsPerPage);
    }, [filteredAndSortedItems, currentPage, itemsPerPage]);

    // --- EXPORT TO EXCEL ---

    const exportToExcel = () => {
        if (filteredAndSortedItems.length === 0) {
            return toast.error('No data to export');
        }

        // Create CSV content
        const headers = ['Item Code', 'Description', 'UOM', 'Quantity', 'Rate', 'Amount', 'Status'];
        const rows = filteredAndSortedItems.map(item => [
            item.item_code,
            `"${(item.description || '').replace(/"/g, '""')}"`, // Escape quotes
            item.uom,
            item.quantity,
            item.rate,
            item.amount,
            item.status
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `BOQ_Export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Exported ${filteredAndSortedItems.length} items to CSV`);
    };

    // --- IMPORT WIZARD HANDLERS ---

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImpFile(file);
            setFileHeaders([]);
            setImportResult(null);
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

            const newMapping = { item_code: '', description: '', uom: '', quantity: '', rate: '' };
            (res.headers || []).forEach(h => {
                const lower = h.toLowerCase();
                if (!newMapping.item_code && (lower.includes('code') || lower.includes('s.no') || lower.includes('sno') || lower.includes('sl.no') || lower === 'no' || lower === 'id')) {
                    newMapping.item_code = h;
                }
                if (!newMapping.description && (lower.includes('desc') || lower.includes('particular') || lower.includes('item') || lower.includes('work'))) {
                    newMapping.description = h;
                }
                if (!newMapping.uom && (lower.includes('unit') || lower.includes('uom') || lower === 'u/m')) {
                    newMapping.uom = h;
                }
                if (!newMapping.quantity && (lower.includes('qty') || lower.includes('quant') || lower.includes('nos'))) {
                    newMapping.quantity = h;
                }
                if (!newMapping.rate && (lower.includes('rate') || lower.includes('price') || lower.includes('cost'))) {
                    newMapping.rate = h;
                }
            });
            setMapping(newMapping);
            setImpStep(2);
            toast.success(`Found ${res.headers.length} columns in ${file.name}`);
        } catch (err) {
            console.error('Analyze error:', err);
            toast.error(err.response?.data?.error || 'Failed to analyze file.');
            setImpStep(1);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleImport = async () => {
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
            toast.error(err.response?.data?.error || 'Import failed.');
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

    // --- RENDER SORT ICON ---
    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) {
            return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300" />;
        }
        return sortConfig.direction === 'asc'
            ? <ChevronUp className="w-3.5 h-3.5 text-primary-600" />
            : <ChevronDown className="w-3.5 h-3.5 text-primary-600" />;
    };

    // --- PAGINATION CONTROLS ---
    const PaginationControls = () => {
        const pageNumbers = [];
        const maxVisiblePages = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        return (
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-600">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedItems.length)} of {filteredAndSortedItems.length}
                    </span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="px-2 py-1 text-sm border border-slate-200 rounded bg-white"
                    >
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                    </select>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <ChevronLeft className="w-4 h-4 -ml-2" />
                    </button>
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    {startPage > 1 && (
                        <>
                            <button
                                onClick={() => setCurrentPage(1)}
                                className="px-3 py-1 text-sm rounded hover:bg-slate-200"
                            >
                                1
                            </button>
                            {startPage > 2 && <MoreHorizontal className="w-4 h-4 text-slate-400" />}
                        </>
                    )}

                    {pageNumbers.map(num => (
                        <button
                            key={num}
                            onClick={() => setCurrentPage(num)}
                            className={`px-3 py-1 text-sm rounded transition-colors ${currentPage === num
                                ? 'bg-primary-600 text-white'
                                : 'hover:bg-slate-200'
                                }`}
                        >
                            {num}
                        </button>
                    ))}

                    {endPage < totalPages && (
                        <>
                            {endPage < totalPages - 1 && <MoreHorizontal className="w-4 h-4 text-slate-400" />}
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                className="px-3 py-1 text-sm rounded hover:bg-slate-200"
                            >
                                {totalPages}
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-4 h-4" />
                        <ChevronRight className="w-4 h-4 -ml-2" />
                    </button>
                </div>
            </div>
        );
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

                <div className="flex gap-2 items-center flex-nowrap shrink-0">
                    <select
                        className="px-3 py-2 border border-slate-200 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                    >
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    {!importMode && (
                        <>
                            <>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleRefresh}
                                    className="flex items-center gap-1.5"
                                    title="Refresh Data"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </Button>

                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`flex items-center gap-1.5 ${showFilters ? 'bg-primary-50 text-primary-700' : ''}`}
                                >
                                    <Filter className="w-4 h-4" />
                                    Filters
                                    {hasActiveFilters && (
                                        <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                                    )}
                                </Button>

                                <Button
                                    size="sm"
                                    onClick={handleDownloadTemplate}
                                    className="flex items-center gap-1.5"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    Template
                                </Button>

                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={exportToExcel}
                                    className="flex items-center gap-1.5"
                                >
                                    <Download className="w-4 h-4" />
                                    Export
                                </Button>

                                <Button onClick={() => setImportMode(true)} size="sm" className="flex items-center gap-1.5">
                                    <Upload className="w-4 h-4" />
                                    Import
                                </Button>
                            </>
                        </>
                    )}

                    {importMode && (
                        <Button variant="secondary" size="sm" onClick={resetWizard}>
                            Cancel
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
                                                    We auto-detected columns. Please verify and correct if needed.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {dbFields.map(field => (
                                                <div key={field.key} className="space-y-2">
                                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                                        {field.label}
                                                        {field.required && <span className="text-red-500">*</span>}
                                                        {mapping[field.key] && <Check className="w-4 h-4 text-green-500" />}
                                                    </label>
                                                    <select
                                                        className={`w-full px-3 py-2.5 border rounded-lg bg-white transition-all focus:ring-2 focus:ring-primary-500 ${mapping[field.key] ? 'border-green-300 bg-green-50/50' : field.required ? 'border-amber-300' : 'border-slate-200'
                                                            }`}
                                                        value={mapping[field.key]}
                                                        onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                                                    >
                                                        <option value="">-- Select Column --</option>
                                                        {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
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
                                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
                                                ) : (
                                                    <><Save className="w-4 h-4 mr-2" />Import BOQ Items</>
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
                                        {importResult.errors?.length > 0 && (
                                            <div className="mb-6 p-4 bg-amber-50 rounded-lg text-left">
                                                <p className="text-sm font-medium text-amber-800 mb-2">Some rows had issues:</p>
                                                <ul className="text-xs text-amber-700 space-y-1">
                                                    {importResult.errors.map((e, i) => <li key={i}>â€¢ {e}</li>)}
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
                <Card className="shadow-lg overflow-hidden">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            {/* Column Headers */}
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                {columns.map(col => (
                                                    <th
                                                        key={col.key}
                                                        className={`px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                                                            } ${col.sortable ? 'cursor-pointer hover:bg-slate-100 select-none transition-colors' : ''}`}
                                                        onClick={() => col.sortable && handleSort(col.key)}
                                                    >
                                                        <div className={`flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                                                            <span>{col.label}</span>
                                                            {col.sortable && <SortIcon columnKey={col.key} />}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>

                                            {/* Filter Row */}
                                            <AnimatePresence>
                                                {showFilters && (
                                                    <motion.tr
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="bg-slate-50/50 border-b border-slate-200"
                                                    >
                                                        <td className="px-3 py-2">
                                                            <div className="relative">
                                                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Search..."
                                                                    value={filters.item_code}
                                                                    onChange={(e) => handleFilterChange('item_code', e.target.value)}
                                                                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-primary-500"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <div className="relative">
                                                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Search..."
                                                                    value={filters.description}
                                                                    onChange={(e) => handleFilterChange('description', e.target.value)}
                                                                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-primary-500"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <select
                                                                value={filters.uom}
                                                                onChange={(e) => handleFilterChange('uom', e.target.value)}
                                                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-primary-500 bg-white"
                                                            >
                                                                <option value="">All</option>
                                                                {uniqueUOMs.map(u => <option key={u} value={u}>{u}</option>)}
                                                            </select>
                                                        </td>
                                                        <td className="px-3 py-2"></td>
                                                        <td className="px-3 py-2"></td>
                                                        <td className="px-3 py-2"></td>
                                                        <td className="px-3 py-2">
                                                            <select
                                                                value={filters.status}
                                                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-primary-500 bg-white"
                                                            >
                                                                <option value="">All</option>
                                                                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                                            </select>
                                                        </td>
                                                    </motion.tr>
                                                )}
                                            </AnimatePresence>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {paginatedItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" className="px-6 py-16 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <FileSpreadsheet className="w-12 h-12 text-slate-300 mb-4" />
                                                            <p className="text-slate-500 font-medium">
                                                                {hasActiveFilters ? 'No items match your filters' : 'No BOQ Items Found'}
                                                            </p>
                                                            <p className="text-slate-400 text-sm">
                                                                {hasActiveFilters ? (
                                                                    <button onClick={clearFilters} className="text-primary-600 hover:underline">
                                                                        Clear all filters
                                                                    </button>
                                                                ) : 'Import an Excel file to get started'}
                                                            </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedItems.map((item) => (
                                                    <tr
                                                        key={item.id}
                                                        className="hover:bg-slate-50/50 transition-colors"
                                                    >
                                                        <td className="px-4 py-3 font-medium text-primary-700">{item.item_code}</td>
                                                        <td className="px-4 py-3 text-slate-600 max-w-md">
                                                            <span className="line-clamp-2" title={item.description}>{item.description}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500">{item.uom}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                                                            {parseFloat(item.quantity).toLocaleString('en-IN')}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                                                            {formatCurrency(item.rate)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                                                            {formatCurrency(item.amount)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${item.status === 'FROZEN' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                                                }`}>
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => handleEditItem(item)}
                                                                    className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                                                    title="Edit Item"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteItem(item.id)}
                                                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                    title="Delete Item"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setMappingModalItem(item)}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors ml-1"
                                                                    title="Link to Milestones"
                                                                >
                                                                    <Link2 size={12} />
                                                                    Link
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        {paginatedItems.length > 0 && (
                                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                                <tr>
                                                    <td colSpan="5" className="px-4 py-4 text-right font-bold text-slate-700">
                                                        {hasActiveFilters && (
                                                            <span className="text-sm font-normal text-slate-500 mr-2">
                                                                (Filtered: {filteredAndSortedItems.length} of {boqItems.length})
                                                            </span>
                                                        )}
                                                        Total Contract Value:
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-mono font-bold text-lg text-primary-700">
                                                        {formatCurrency(filteredAndSortedItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0))}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>

                                {/* Pagination */}
                                {filteredAndSortedItems.length > itemsPerPage && <PaginationControls />}
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Active Filters Summary */}
            {!importMode && hasActiveFilters && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 flex-wrap"
                >
                    <span className="text-sm text-slate-500">Active filters:</span>
                    {filters.item_code && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 rounded-full text-xs">
                            Code: {filters.item_code}
                            <button onClick={() => handleFilterChange('item_code', '')} className="hover:bg-primary-100 rounded-full p-0.5">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}
                    {filters.description && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 rounded-full text-xs">
                            Desc: {filters.description}
                            <button onClick={() => handleFilterChange('description', '')} className="hover:bg-primary-100 rounded-full p-0.5">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}
                    {filters.uom && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 rounded-full text-xs">
                            UOM: {filters.uom}
                            <button onClick={() => handleFilterChange('uom', '')} className="hover:bg-primary-100 rounded-full p-0.5">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}
                    {filters.status && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 rounded-full text-xs">
                            Status: {filters.status}
                            <button onClick={() => handleFilterChange('status', '')} className="hover:bg-primary-100 rounded-full p-0.5">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}
                    <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-primary-600 underline">
                        Clear all
                    </button>
                </motion.div>
            )}

            {/* BOQ-Milestone Mapping Modal */}
            {mappingModalItem && (
                <BOQMilestoneMappingModal
                    boqItem={mappingModalItem}
                    projectId={selectedProject}
                    onClose={() => setMappingModalItem(null)}
                    onUpdated={() => { }}
                />
            )}

            {/* Edit BOQ Item Modal */}
            <AnimatePresence>
                {editItem && (
                    <EditBOQItemModal
                        isOpen={!!editItem}
                        onClose={() => setEditItem(null)}
                        item={editItem}
                        onSave={handleSaveEdit}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default BOQManagement;
