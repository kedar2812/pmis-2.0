import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IndianRupee,
    Plus,
    Filter,
    Search,
    Download,
    FileText,
    Calculator,
    MoreVertical,
    Eye,
    Printer,
    CheckCircle2
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import financeService from '@/services/financeService'; // Real Service
import projectService from '@/services/projectService';
import userService from '@/services/userService';
import { GenerateBillModal } from '@/components/billing/GenerateBillModal';
import { RABillTemplate } from '@/components/billing/RABillTemplate';
import { useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const RABilling = () => {
    // State for Real Data
    const [raBills, setRaBills] = useState([]);
    const [projects, setProjects] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

    // For printing from the list
    const [selectedBillForPrint, setSelectedBillForPrint] = useState(null);

    const { user } = useAuth();
    const canCreateBill = user?.role === 'EPC_Contractor';

    // 1. Fetch Data on Mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [billsData, projectsData, usersData] = await Promise.all([
                    financeService.getBills(),
                    projectService.getAllProjects(),
                    userService.getUsers()
                ]);

                setRaBills(billsData);
                setProjects(projectsData);

                // Filter only EPC Contractors and format for dropdown
                const validContractors = usersData
                    .filter(u => u.role === 'EPC_Contractor')
                    .map(u => ({
                        ...u,
                        contractorName: u.company_name || u.username // Fallback if company name missing
                    }));
                setContractors(validContractors);
            } catch (error) {
                console.error("Failed to fetch billing data", error);
                toast.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Trigger print when a bill is selected
    const triggerPrint = (bill) => {
        setSelectedBillForPrint(bill);
        // Wait for state to render the template then print
        setTimeout(() => {
            window.print();
            // Clear selection after a delay to allow print dialogue to capture content
            setTimeout(() => setSelectedBillForPrint(null), 2000);
        }, 500);
    };

    const handleGenerateBill = async (data) => {
        try {
            // Call API
            const newBill = await financeService.createBill(data);
            setRaBills(prev => [newBill, ...prev]); // Add to list (optimistic/immediate)
            toast.success("RA Bill Generated Successfully");
            // Modal closes itself or changes state via its own onSave verification
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate bill");
        }
    };

    const handleExportSummary = () => {
        if (!raBills.length) {
            toast.error("No bills to export");
            return;
        }

        const headers = [
            "Bill No", "Date", "Project", "Contractor", "Gross Amount", "GST Amount",
            "Total Amount", "TDS", "Labour Cess", "Retention", "Net Payable", "Status"
        ];

        const rows = raBills.map(bill => [
            bill.billNo,
            bill.submissionDate,
            bill.projectName,
            bill.contractorName,
            bill.grossAmount,
            bill.gstAmount,
            bill.totalAmount,
            bill.tdsAmount,
            bill.labourCessAmount,
            bill.retentionAmount,
            bill.netPayable,
            bill.status
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `RA_Bills_Summary_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredBills = raBills.filter(bill =>
        bill.billNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.contractorName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalBilled = raBills.reduce((acc, curr) => acc + (parseFloat(curr.netPayable) || 0), 0);

    return (
        <div className="p-6 space-y-6 print:hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-slate-900">RA Billing Register</h1>
                    <p className="text-slate-500 mt-1">Manage Contractor Running Account Bills and Certifications</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportSummary} className="gap-2">
                        <Download size={18} /> Export Summary
                    </Button>
                    {canCreateBill && (
                        <Button
                            onClick={() => setIsGenerateModalOpen(true)}
                            className="flex items-center gap-2 bg-primary-950 text-white hover:bg-primary-900 shadow-lg"
                        >
                            <Plus size={18} /> Generate New Bill
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Bills Generated', value: raBills.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Total Net Payable', value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalBilled), icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Pending Approvals', value: '0', icon: CheckCircle2, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((stat, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="p-6 flex items-center gap-4 hover:shadow-lg transition-shadow duration-300">
                            <div className={`p-4 rounded-xl ${stat.bg}`}>
                                <stat.icon className={stat.color} size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Toolbar */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by Bill No, Project, or Contractor..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* List */}
            {filteredBills.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Bill No</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Project</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Contractor</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 text-right">Gross Amount</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 text-right">Net Payable</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredBills.map((bill, index) => (
                                    <motion.tr
                                        key={bill.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-slate-50/50 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-mono font-medium text-slate-600">{bill.billNo}</td>
                                        <td className="px-6 py-4 text-slate-600">{bill.submissionDate}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{bill.projectName}</td>
                                        <td className="px-6 py-4 text-slate-600">{bill.contractorName}</td>
                                        <td className="px-6 py-4 text-right text-slate-600">
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(bill.grossAmount)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(bill.netPayable)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                {bill.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => triggerPrint(bill)}
                                                className="text-slate-400 hover:text-primary-600"
                                                title="Print Bill"
                                            >
                                                <Printer size={18} />
                                            </Button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <EmptyState
                    icon={Calculator}
                    title="No RA Bills Generated"
                    description={
                        searchQuery
                            ? "No bills match your search."
                            : (canCreateBill ? "Generate your first RA Bill to get started." : "No bills have been submitted yet.")
                    }
                    actionLabel={canCreateBill ? "Generate New Bill" : undefined}
                    onAction={canCreateBill ? () => setIsGenerateModalOpen(true) : undefined}
                />
            )}

            <GenerateBillModal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
                onSave={handleGenerateBill}
                projects={projects}
                contractors={contractors}
            />

            {/* Hidden Template for Printing List Items */}
            {selectedBillForPrint && (
                <div className="hidden">
                    <RABillTemplate
                        bill={selectedBillForPrint}
                        project={projects.find(p => p.id === selectedBillForPrint?.projectId)}
                        contractor={contractors.find(c => c.id === selectedBillForPrint?.contractorId)}
                    />
                </div>
            )}
        </div>
    );
};

export default RABilling;
