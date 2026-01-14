import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Printer, RefreshCw, Calculator, FileText, IndianRupee, AlertCircle, Eye, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import { RABillTemplate } from './RABillTemplate';
import financeService from '@/api/services/financeService';

export const GenerateBillModal = ({
    isOpen,
    onClose,
    onSave,
    projects = [],
    contractors = []
}) => {
    // Modes: 'edit', 'success', 'preview'
    const [viewMode, setViewMode] = useState('edit');

    // Form State
    const [milestones, setMilestones] = useState([]);
    const [milestoneBudgets, setMilestoneBudgets] = useState({}); // {milestoneId: totalBudget}
    const [budgetWarning, setBudgetWarning] = useState(null);

    // Fetch milestones and their budget allocations when project changes
    const handleProjectChange = async (e) => {
        const pid = e.target.value;
        setFormData(prev => ({ ...prev, projectId: pid, milestoneId: '' }));
        setMilestones([]);
        setMilestoneBudgets({});
        setBudgetWarning(null);

        if (pid) {
            try {
                // Fetch milestones for the project
                const tasksData = await financeService.getScheduleTasks(pid);
                const milestonesOnly = tasksData.filter(t => t.is_milestone);

                // Fetch budget allocations
                const budgetsData = await financeService.getBudgets(pid);

                // Sum budget amounts per milestone
                const budgetMap = {};
                budgetsData.forEach(b => {
                    if (b.milestone) {
                        budgetMap[b.milestone] = (budgetMap[b.milestone] || 0) + parseFloat(b.amount || 0);
                    }
                });

                // Enhance milestones with budget info
                const enhancedMilestones = milestonesOnly.map(m => ({
                    ...m,
                    allocatedBudget: budgetMap[m.id] || 0,
                    hasBudget: !!budgetMap[m.id]
                }));

                setMilestones(enhancedMilestones);
                setMilestoneBudgets(budgetMap);
            } catch (err) {
                console.error('Failed to fetch milestones:', err);
            }
        }
    };

    const [formData, setFormData] = useState({
        projectId: '',
        milestoneId: '',
        packageCode: '',
        contractorId: '',
        workOrderNo: '',
        billNo: '',
        periodFrom: '',
        periodTo: '',
        submissionDate: new Date().toISOString().split('T')[0],
        grossAmount: 0,
        gstRate: 18,
        retentionRate: 5,
        mobilizationRecovery: 0,
        materialRecovery: 0,
        penaltyAmount: 0,
        priceAdjustment: 0,
        insuranceRecovery: 0,
        otherDeductions: 0,
        remarks: ''
    });

    const [calculations, setCalculations] = useState({
        gstAmount: 0,
        totalAmount: 0,
        statutoryDeductions: [], // Dynamic from ETPMaster
        totalStatutoryDeductions: 0,
        retentionAmount: 0,
        totalDeductions: 0,
        netPayable: 0
    });

    // ETP Calculation State
    const [etpLoading, setEtpLoading] = useState(false);
    const [etpError, setEtpError] = useState(null);
    const etpDebounceRef = useRef(null);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setViewMode('edit');
            setFormData(prev => ({
                ...prev,
                billNo: `RA-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`
            }));
        }
    }, [isOpen]);

    // ESC key handler
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // MAIN CALCULATION LOGIC - Uses Backend ETP Service
    const calculateETP = useCallback(async (grossAmount, gstRate, retentionRate) => {
        if (!grossAmount || grossAmount <= 0) {
            setCalculations(prev => ({
                ...prev,
                gstAmount: 0,
                totalAmount: 0,
                statutoryDeductions: [],
                totalStatutoryDeductions: 0,
                retentionAmount: 0,
                totalDeductions: 0,
                netPayable: 0
            }));
            return;
        }

        setEtpLoading(true);
        setEtpError(null);

        try {
            // Calculate manual deductions
            const manualDeductions =
                (parseFloat(formData.mobilizationRecovery) || 0) +
                (parseFloat(formData.materialRecovery) || 0) +
                (parseFloat(formData.penaltyAmount) || 0) +
                (parseFloat(formData.priceAdjustment) || 0) +
                (parseFloat(formData.insuranceRecovery) || 0) +
                (parseFloat(formData.otherDeductions) || 0);

            // Call backend ETP calculation API
            const response = await financeService.calculateETP({
                gross_amount: grossAmount,
                gst_percentage: gstRate,
                retention_percentage: retentionRate,
                other_deductions: manualDeductions,
                advances_recovery: (parseFloat(formData.mobilizationRecovery) || 0) + (parseFloat(formData.materialRecovery) || 0)
            });

            const summary = response.data;

            // Extract all statutory charges (deductions + levies + recoveries)
            const allCharges = [
                ...(summary.statutory_charges?.deductions || []),
                ...(summary.statutory_charges?.recoveries || []),
                ...(summary.statutory_charges?.levies || [])
            ];

            setCalculations({
                gstAmount: summary.gst_amount || 0,
                totalAmount: summary.total_before_deductions || (grossAmount + (grossAmount * gstRate / 100)),
                statutoryDeductions: allCharges,
                totalStatutoryDeductions: summary.total_statutory_deductions || 0,
                retentionAmount: summary.retention_amount || 0,
                totalDeductions: summary.total_deductions || 0,
                netPayable: summary.net_payable || 0
            });

        } catch (err) {
            console.error('ETP calculation failed:', err);
            setEtpError('Failed to calculate statutory deductions');

            // Fallback to basic calculation if API fails
            const gross = parseFloat(grossAmount) || 0;
            const gstAmount = (gross * gstRate) / 100;
            const totalAmount = gross + gstAmount;
            const retentionAmount = (gross * retentionRate) / 100;

            const manualDeductions =
                (parseFloat(formData.mobilizationRecovery) || 0) +
                (parseFloat(formData.materialRecovery) || 0) +
                (parseFloat(formData.penaltyAmount) || 0) +
                (parseFloat(formData.priceAdjustment) || 0) +
                (parseFloat(formData.insuranceRecovery) || 0) +
                (parseFloat(formData.otherDeductions) || 0);

            setCalculations({
                gstAmount,
                totalAmount,
                statutoryDeductions: [],
                totalStatutoryDeductions: 0,
                retentionAmount,
                totalDeductions: retentionAmount + manualDeductions,
                netPayable: totalAmount - retentionAmount - manualDeductions
            });
        } finally {
            setEtpLoading(false);
        }
    }, [formData.mobilizationRecovery, formData.materialRecovery, formData.penaltyAmount, formData.priceAdjustment, formData.insuranceRecovery, formData.otherDeductions]);

    // Debounced ETP calculation trigger
    useEffect(() => {
        // Clear existing timeout
        if (etpDebounceRef.current) {
            clearTimeout(etpDebounceRef.current);
        }

        // Set new debounced calculation (500ms delay)
        etpDebounceRef.current = setTimeout(() => {
            calculateETP(
                parseFloat(formData.grossAmount) || 0,
                parseFloat(formData.gstRate) || 18,
                parseFloat(formData.retentionRate) || 0
            );
        }, 500);

        return () => {
            if (etpDebounceRef.current) {
                clearTimeout(etpDebounceRef.current);
            }
        };
    }, [formData.grossAmount, formData.gstRate, formData.retentionRate, formData.mobilizationRecovery, formData.materialRecovery, formData.penaltyAmount, formData.priceAdjustment, formData.insuranceRecovery, formData.otherDeductions, calculateETP]);

    // Check for budget overspend when milestoneId or grossAmount changes
    useEffect(() => {
        if (formData.milestoneId && formData.grossAmount > 0) {
            const allocatedBudget = milestoneBudgets[formData.milestoneId] || 0;
            const billAmount = parseFloat(formData.grossAmount) || 0;

            if (allocatedBudget > 0 && billAmount > allocatedBudget) {
                setBudgetWarning({
                    message: `Bill amount (₹${billAmount.toLocaleString('en-IN')}) exceeds allocated budget (₹${allocatedBudget.toLocaleString('en-IN')})`,
                    severity: 'warning'
                });
            } else if (allocatedBudget > 0 && billAmount > allocatedBudget * 0.8) {
                setBudgetWarning({
                    message: `Bill amount is over 80% of allocated budget (₹${allocatedBudget.toLocaleString('en-IN')})`,
                    severity: 'caution'
                });
            } else {
                setBudgetWarning(null);
            }
        } else {
            setBudgetWarning(null);
        }
    }, [formData.milestoneId, formData.grossAmount, milestoneBudgets]);

    const handlePrint = () => {
        window.print();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.projectId || !formData.contractorId) {
            toast.error("Project and Contractor are required");
            return;
        }

        const selectedProject = projects.find(p => p.id === formData.projectId);
        const selectedContractor = contractors.find(c => c.id === formData.contractorId);

        const billData = {
            ...formData,
            ...calculations,
            projectName: selectedProject?.name,
            contractorName: selectedContractor?.contractorName,
            status: 'Generated'
        };

        if (onSave) {
            await onSave(billData);
            setViewMode('success');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };



    if (!isOpen) return null;

    const selectedProject = projects.find(p => p.id === formData.projectId);
    const selectedContractor = contractors.find(c => c.id === formData.contractorId);
    const fullDataForTemplate = { ...formData, ...calculations };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm print:bg-white print:static print:inset-auto"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden print:shadow-none print:w-full print:max-w-none print:max-h-none print:h-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex-none bg-white dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-700 px-6 py-4 flex items-center justify-between z-10 print:hidden">
                            <div className="flex items-center gap-3">
                                {viewMode === 'preview' && (
                                    <button onClick={() => setViewMode('success')} className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full mr-1">
                                        <ArrowLeft size={20} className="text-slate-600 dark:text-neutral-400" />
                                    </button>
                                )}
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg">
                                    <Calculator size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                        {viewMode === 'edit' ? 'RA Bill Calculator' : viewMode === 'preview' ? 'Bill Preview' : 'Bill Generated'}
                                    </h2>
                                    <p className="text-sm text-slate-500 dark:text-neutral-400">
                                        {viewMode === 'edit' ? 'Generate Rule-based Running Account Bills' : 'Review and Print'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onClose}
                                    className="p-2 text-slate-400 dark:text-neutral-400 hover:text-slate-600 dark:hover:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content Grid - Uses min-h-0 to allow nested scrolling */}
                        <div className="flex-1 min-h-0 flex flex-col lg:flex-row print:hidden bg-slate-50">

                            {/* EDIT MODE */}
                            {viewMode === 'edit' && (
                                <>
                                    {/* Left: Form - Independent Scroll */}
                                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 border-r border-slate-200 bg-white min-h-0">
                                        <form id="ra-bill-form" className="space-y-6">
                                            {/* Section 1: Basic Info */}
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 flex items-center gap-2"><FileText size={16} /> Project & Vendor</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-700 mb-1">Project</label>
                                                        <select name="projectId" value={formData.projectId} onChange={handleProjectChange} className="w-full px-3 py-2 border rounded-md text-sm">
                                                            <option value="">Select Project...</option>
                                                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-700 mb-1">Contractor</label>
                                                        <select name="contractorId" value={formData.contractorId} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm">
                                                            <option value="">Select Contractor...</option>
                                                            {contractors.map(c => <option key={c.id} value={c.id}>{c.contractorName}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-700 mb-1">Linked Milestone (Schedule)</label>
                                                        <select
                                                            name="milestoneId"
                                                            value={formData.milestoneId}
                                                            onChange={handleChange}
                                                            className={`w-full px-3 py-2 border rounded-md text-sm ${budgetWarning ? (budgetWarning.severity === 'warning' ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50') : ''}`}
                                                        >
                                                            <option value="">-- General / No Milestone --</option>
                                                            {milestones.filter(m => m.hasBudget).map(m => (
                                                                <option key={m.id} value={m.id}>
                                                                    {m.name} • {m.progress}% done • ₹{(m.allocatedBudget / 100000).toFixed(1)}L budget
                                                                </option>
                                                            ))}
                                                            {milestones.filter(m => !m.hasBudget).length > 0 && (
                                                                <optgroup label="No Budget Allocated">
                                                                    {milestones.filter(m => !m.hasBudget).map(m => (
                                                                        <option key={m.id} value={m.id} className="text-slate-400">
                                                                            {m.name} • {m.progress}% done • No budget
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                        </select>
                                                        {budgetWarning && (
                                                            <p className={`mt-1 text-xs flex items-center gap-1 ${budgetWarning.severity === 'warning' ? 'text-red-600' : 'text-amber-600'}`}>
                                                                <AlertCircle size={12} />
                                                                {budgetWarning.message}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Input label="Work Order No" name="workOrderNo" value={formData.workOrderNo} onChange={handleChange} />
                                                    <Input label="RA Bill No" name="billNo" value={formData.billNo} onChange={handleChange} />
                                                    <Input label="Package Code" name="packageCode" value={formData.packageCode} onChange={handleChange} />
                                                    <Input label="Submission Date" name="submissionDate" type="date" value={formData.submissionDate} onChange={handleChange} />
                                                    <div className="col-span-2 grid grid-cols-2 gap-4">
                                                        <Input label="Period From" name="periodFrom" type="date" value={formData.periodFrom} onChange={handleChange} />
                                                        <Input label="Period To" name="periodTo" type="date" value={formData.periodTo} onChange={handleChange} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Section 2: Bill Amount */}
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 flex items-center gap-2"><IndianRupee size={16} /> Bill Amount</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <Input label="Gross Bill Amount" name="grossAmount" type="number" value={formData.grossAmount} onChange={handleChange} required />
                                                    <Input label="GST Rate (%)" name="gstRate" type="number" value={formData.gstRate} onChange={handleChange} />
                                                </div>
                                            </div>

                                            {/* Section 3: Deductions */}
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 flex items-center gap-2"><AlertCircle size={16} /> Deductions & Recoveries</h3>

                                                {/* Statutory Deductions Info */}
                                                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                                    <div className="flex items-start gap-2">
                                                        <Calculator size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                                        <div>
                                                            <p className="text-xs font-semibold text-blue-800">Statutory Deductions (Auto-Calculated)</p>
                                                            <p className="text-xs text-blue-600 mt-1">
                                                                TDS, Labour Cess, and other statutory charges are automatically calculated based on
                                                                <span className="font-semibold"> ETP Master</span> rates configured in Admin → Master Data.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Retention Rate - User configurable per project */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Input label="Security Deposit / Retention (%)" name="retentionRate" type="number" value={formData.retentionRate} onChange={handleChange} />
                                                </div>

                                                {/* Advance Recoveries */}
                                                <div className="grid grid-cols-2 gap-4 bg-orange-50/50 p-2 rounded">
                                                    <Input label="Mobilization Advance Recovery" name="mobilizationRecovery" type="number" value={formData.mobilizationRecovery} onChange={handleChange} />
                                                    <Input label="Material Advance Recovery" name="materialRecovery" type="number" value={formData.materialRecovery} onChange={handleChange} />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 bg-red-50/50 p-2 rounded">
                                                    <Input label="Penalty / Damages" name="penaltyAmount" type="number" value={formData.penaltyAmount} onChange={handleChange} />
                                                    <Input label="Price Adjustment" name="priceAdjustment" type="number" value={formData.priceAdjustment} onChange={handleChange} />
                                                    <Input label="Insurance Recovery" name="insuranceRecovery" type="number" value={formData.insuranceRecovery} onChange={handleChange} />
                                                    <Input label="Other Deductions" name="otherDeductions" type="number" value={formData.otherDeductions} onChange={handleChange} />
                                                </div>
                                            </div>
                                        </form>
                                    </div>

                                    {/* Right: Summary - Independent Scroll */}
                                    <div className="w-full lg:w-[400px] bg-slate-50 flex flex-col min-h-0 border-l border-slate-200">
                                        <div className="flex-none p-4 bg-white border-b border-slate-200">
                                            <h3 className="font-bold text-slate-800">Calculation Summary</h3>
                                        </div>
                                        <div className="flex-1 overflow-y-scroll p-6 pb-24 space-y-4 scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-100">
                                            <SummaryRow label="Gross Amount" value={formData.grossAmount} />
                                            <SummaryRow label="GST Amount" value={calculations.gstAmount} subtext={`@ ${formData.gstRate}%`} />
                                            <div className="h-px bg-slate-300 my-2" />
                                            <SummaryRow label="Total (Incl. GST)" value={calculations.totalAmount} bold />

                                            <div className="mt-6 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                                Statutory Deductions
                                                {etpLoading && <Loader2 size={12} className="animate-spin text-primary-500" />}
                                            </div>

                                            {etpError && (
                                                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded mb-2 flex items-center gap-1">
                                                    <AlertCircle size={12} />
                                                    {etpError} - Using fallback calculation
                                                </div>
                                            )}

                                            {/* Dynamic Statutory Charges from ETPMaster */}
                                            {calculations.statutoryDeductions.length > 0 ? (
                                                calculations.statutoryDeductions.map((charge, idx) => (
                                                    <SummaryRow
                                                        key={charge.code || idx}
                                                        label={`${charge.name} (${charge.rate_percentage}%)`}
                                                        value={charge.calculated_amount}
                                                        subtext={charge.basis}
                                                        isDeduction
                                                    />
                                                ))
                                            ) : (
                                                <p className="text-xs text-slate-400 italic">No statutory charges configured</p>
                                            )}

                                            {/* Retention / Security Deposit */}
                                            <SummaryRow label={`Retention (${formData.retentionRate}%)`} value={calculations.retentionAmount} isDeduction />

                                            {/* Manual Deductions */}
                                            <div className="mt-4 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Recoveries & Other</div>
                                            <SummaryRow label="Advance Recoveries" value={(parseFloat(formData.mobilizationRecovery) || 0) + (parseFloat(formData.materialRecovery) || 0)} isDeduction />
                                            <SummaryRow label="Penalties & Adjustments" value={(parseFloat(formData.penaltyAmount) || 0) + (parseFloat(formData.priceAdjustment) || 0) + (parseFloat(formData.insuranceRecovery) || 0) + (parseFloat(formData.otherDeductions) || 0)} isDeduction />

                                            <div className="h-px bg-slate-300 my-4" />

                                            <div className="space-y-2">
                                                <h4 className="text-sm font-bold text-slate-900">Net Payable Calculation</h4>
                                                <p className="text-[10px] text-slate-500 font-mono">
                                                    (Total Amount) - (Total Deductions)
                                                </p>
                                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <p className="text-sm text-emerald-600 font-medium mb-1">Net Payable Amount</p>
                                                            <p className="text-xs text-emerald-600/70">
                                                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(calculations.totalAmount)} - {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(calculations.totalDeductions)}
                                                            </p>
                                                        </div>
                                                        <p className="text-3xl font-bold text-emerald-700">
                                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(calculations.netPayable)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4">
                                                <Button onClick={handleSubmit} className="w-full bg-primary-950 hover:bg-primary-900 text-white shadow-lg py-3">
                                                    <Save size={18} className="mr-2" /> Generate Invoice & Save
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* SUCCESS STATE */}
                            {viewMode === 'success' && (
                                <div className="flex-1 flex flex-col items-center justify-center bg-white p-8 animate-in fade-in zoom-in duration-300">
                                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                                        <CheckCircle size={40} className="text-emerald-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Invoice Generated Successfully!</h3>
                                    <p className="text-slate-500 mb-8 text-center max-w-md">
                                        RA Bill <span className="font-mono font-bold text-slate-700">{formData.billNo}</span> has been saved to the register. What would you like to do next?
                                    </p>
                                    <div className="flex gap-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => setViewMode('preview')}
                                            className="min-w-[160px] h-12 text-lg"
                                        >
                                            <Eye size={20} className="mr-2" /> View Bill
                                        </Button>
                                        <Button
                                            onClick={handlePrint}
                                            className="min-w-[160px] h-12 text-lg bg-primary-600 hover:bg-primary-700 text-white shadow-lg"
                                        >
                                            <Printer size={20} className="mr-2" /> Download PDF
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* PREVIEW MODE */}
                            {viewMode === 'preview' && (
                                <div className="flex-1 overflow-auto bg-slate-100 p-8 flex justify-center">
                                    <div className="bg-white shadow-xl p-0 w-fit">
                                        {/* Visually render the template here for preview */}
                                        <div className="scale-[0.8] origin-top">
                                            <RABillTemplate
                                                bill={fullDataForTemplate}
                                                project={selectedProject}
                                                contractor={selectedContractor}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Hidden Print Template (Always present for print media) */}
                        <div className="hidden print:block">
                            <RABillTemplate
                                bill={fullDataForTemplate}
                                project={selectedProject}
                                contractor={selectedContractor}
                            />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

// Sub-components
const Input = ({ label, className = "", ...props }) => (
    <div className={className}>
        <label className="block text-xs font-medium text-slate-700 mb-1">{label}</label>
        <input
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            {...props}
        />
    </div>
);

const SummaryRow = ({ label, value, subtext, bold, isDeduction }) => (
    <div className={`flex justify-between items-start ${bold ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
        <div>
            <span>{label}</span>
            {subtext && <p className="text-[10px] text-slate-400 font-normal">{subtext}</p>}
        </div>
        <span className={isDeduction ? 'text-red-600' : ''}>
            {isDeduction ? '-' : ''} {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)}
        </span>
    </div>
);
