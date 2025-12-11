import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Printer, RefreshCw, Calculator, FileText, IndianRupee, AlertCircle, Eye, CheckCircle, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import { RABillTemplate } from './RABillTemplate';

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
    const [formData, setFormData] = useState({
        projectId: '',
        packageCode: '',
        contractorId: '',
        workOrderNo: '',
        billNo: '',
        periodFrom: '',
        periodTo: '',
        submissionDate: new Date().toISOString().split('T')[0],
        grossAmount: 0,
        gstRate: 18,
        tdsCategory: '194C - Individual / HUF (1%)', // Default
        tdsRate: 1,
        labourCessRate: 1,
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
        totalAmount: 0, // Gross + GST
        tdsAmount: 0,
        labourCessAmount: 0,
        retentionAmount: 0,
        totalDeductions: 0,
        netPayable: 0
    });

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

    // Update TDS Rate based on Category
    useEffect(() => {
        const categoryMap = {
            '194C - Individual / HUF (1%)': 1,
            '194C - Others (2%)': 2,
            '194J - Professional Fees (10%)': 10
        };
        setFormData(prev => ({
            ...prev,
            tdsRate: categoryMap[prev.tdsCategory] || 0
        }));
    }, [formData.tdsCategory]);

    // MAIN CALCULATION LOGIC
    useEffect(() => {
        const gross = parseFloat(formData.grossAmount) || 0;
        const gstAmount = (gross * formData.gstRate) / 100;
        const totalAmount = gross + gstAmount;
        const tdsAmount = (gross * formData.tdsRate) / 100;
        const labourCessAmount = (gross * formData.labourCessRate) / 100;
        const retentionAmount = (gross * formData.retentionRate) / 100;

        const totalDeductions =
            tdsAmount +
            labourCessAmount +
            retentionAmount +
            (parseFloat(formData.mobilizationRecovery) || 0) +
            (parseFloat(formData.materialRecovery) || 0) +
            (parseFloat(formData.penaltyAmount) || 0) +
            (parseFloat(formData.priceAdjustment) || 0) +
            (parseFloat(formData.insuranceRecovery) || 0) +
            (parseFloat(formData.otherDeductions) || 0);

        const netPayable = totalAmount - totalDeductions;

        setCalculations({
            gstAmount,
            totalAmount,
            tdsAmount,
            labourCessAmount,
            retentionAmount,
            totalDeductions,
            netPayable
        });

    }, [formData]);

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
                    className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:bg-white print:static print:inset-auto"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden print:shadow-none print:w-full print:max-w-none print:max-h-none print:h-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex-none bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 print:hidden">
                            <div className="flex items-center gap-3">
                                {viewMode === 'preview' && (
                                    <button onClick={() => setViewMode('success')} className="p-1 hover:bg-slate-100 rounded-full mr-1">
                                        <ArrowLeft size={20} className="text-slate-600" />
                                    </button>
                                )}
                                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                                    <Calculator size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">
                                        {viewMode === 'edit' ? 'RA Bill Calculator' : viewMode === 'preview' ? 'Bill Preview' : 'Bill Generated'}
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        {viewMode === 'edit' ? 'Generate Rule-based Running Account Bills' : 'Review and Print'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onClose}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
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
                                                        <select name="projectId" value={formData.projectId} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm">
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
                                                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 flex items-center gap-2"><AlertCircle size={16} /> Deductions</h3>

                                                <div className="bg-slate-50 p-3 rounded-lg space-y-3">
                                                    <label className="block text-xs font-bold text-slate-700">TDS Category</label>
                                                    <select name="tdsCategory" value={formData.tdsCategory} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm">
                                                        <option>194C - Individual / HUF (1%)</option>
                                                        <option>194C - Others (2%)</option>
                                                        <option>194J - Professional Fees (10%)</option>
                                                    </select>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <Input label="Labour Cess Rate (%)" name="labourCessRate" type="number" value={formData.labourCessRate} onChange={handleChange} />
                                                    <Input label="Retention Rate (%)" name="retentionRate" type="number" value={formData.retentionRate} onChange={handleChange} />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 bg-orange-50/50 p-2 rounded">
                                                    <Input label="Mobilization Recoveries" name="mobilizationRecovery" type="number" value={formData.mobilizationRecovery} onChange={handleChange} />
                                                    <Input label="Material Recoveries" name="materialRecovery" type="number" value={formData.materialRecovery} onChange={handleChange} />
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

                                            <div className="mt-6 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Deductions</div>
                                            <SummaryRow label="TDS" value={calculations.tdsAmount} isDeduction />
                                            <SummaryRow label="Labour Cess" value={calculations.labourCessAmount} isDeduction />
                                            <SummaryRow label="Retention" value={calculations.retentionAmount} isDeduction />
                                            <SummaryRow label="Recoveries" value={(parseFloat(formData.mobilizationRecovery) || 0) + (parseFloat(formData.materialRecovery) || 0)} isDeduction />
                                            <SummaryRow label="Other Deductions" value={(parseFloat(formData.penaltyAmount) || 0) + (parseFloat(formData.priceAdjustment) || 0) + (parseFloat(formData.insuranceRecovery) || 0) + (parseFloat(formData.otherDeductions) || 0)} isDeduction />

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
