import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Wallet, TrendingUp, Calendar, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import financeService from '@/services/financeService';
import { toast } from 'sonner';

const FundManagement = () => {
    const [funds, setFunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        loadFunds();
    }, []);

    // ESC key handler for modal
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isModalOpen) {
                setIsModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isModalOpen]);

    const loadFunds = async () => {
        try {
            setLoading(true);
            const data = await financeService.getFunds();
            setFunds(data);
        } catch (error) {
            toast.error("Failed to load funds");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            allocating_authority: formData.get('allocating_authority'),
            total_amount: formData.get('total_amount'),
            start_date: formData.get('start_date'),
            end_date: formData.get('end_date')
        };

        try {
            await financeService.createFund(data);
            toast.success("Fund Added Successfully");
            setIsModalOpen(false);
            loadFunds();
        } catch (error) {
            toast.error("Failed to add fund");
        }
    };

    const totalInflow = funds.reduce((acc, curr) => acc + parseFloat(curr.total_amount), 0);

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-app-heading">Fund Management</h1>
                    <p className="text-app-muted text-sm">Track Grants, Loans, and Budgetary Allocations</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white">
                    <Plus size={18} className="mr-2" /> Add Fund Source
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 flex items-center gap-4 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800">
                    <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Total Inflow</p>
                        <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalInflow)}
                        </p>
                    </div>
                </Card>
            </div>

            {/* List */}
            <div className="bg-app-card rounded-xl shadow-sm border border-app-subtle overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-app-surface text-app-muted font-medium border-b border-app-subtle">
                        <tr>
                            <th className="px-6 py-4">Fund Name</th>
                            <th className="px-6 py-4">Authority</th>
                            <th className="px-6 py-4 text-right">Total Amount</th>
                            <th className="px-6 py-4 text-right">Allocation Period</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
                        {funds.map(fund => (
                            <tr key={fund.id} className="hover:bg-app-surface">
                                <td className="px-6 py-4 font-medium text-app-heading">{fund.name}</td>
                                <td className="px-6 py-4 text-app-muted">{fund.allocating_authority}</td>
                                <td className="px-6 py-4 text-right font-mono font-medium text-app-text">
                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(fund.total_amount)}
                                </td>
                                <td className="px-6 py-4 text-right text-app-muted">
                                    {new Date(fund.start_date).getFullYear()} - {new Date(fund.end_date).getFullYear()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {funds.length === 0 && !loading && (
                    <div className="p-8 text-center text-app-muted">No funds allocated yet.</div>
                )}
            </div>

            {/* Modal */}
            {createPortal(
                <AnimatePresence>
                    {isModalOpen && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsModalOpen(false)}
                                className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
                            />
                            {/* Modal Content */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
                            >
                                <div className="bg-app-card rounded-xl shadow-2xl p-6 w-96 pointer-events-auto border border-app-subtle">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-lg font-bold text-app-heading">Add Fund Source</h2>
                                        <button
                                            onClick={() => setIsModalOpen(false)}
                                            className="p-1 hover:bg-app-surface rounded-full transition-colors"
                                        >
                                            <X size={18} className="text-app-muted" />
                                        </button>
                                    </div>
                                    <form onSubmit={handleSave} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-app-muted">Fund Name</label>
                                            <input name="name" required className="w-full border border-app bg-app-input text-app-text rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" placeholder="e.g. World Bank Tranche 1" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-app-muted">Allocating Authority</label>
                                            <input name="allocating_authority" required className="w-full border border-app bg-app-input text-app-text rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" placeholder="e.g. Dept of Finance" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-app-muted">Total Amount (INR)</label>
                                            <input name="total_amount" type="number" required className="w-full border border-app bg-app-input text-app-text rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-bold text-app-muted">Start Date</label>
                                                <input name="start_date" type="date" required className="w-full border border-app bg-app-input text-app-text rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-app-muted">Valid Till</label>
                                                <input name="end_date" type="date" required className="w-full border border-app bg-app-input text-app-text rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 pt-4">
                                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                            <Button type="submit" className="bg-primary-600 text-white">Save Fund</Button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default FundManagement;
