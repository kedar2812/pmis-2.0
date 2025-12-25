import React, { useState, useEffect } from 'react';
import { Plus, PieChart, ArrowRight, Coins } from 'lucide-react';
import Button from '@/components/ui/Button';
import financeService from '@/services/financeService';
import schedulingService from '@/services/schedulingService';
import projectService from '@/services/projectService';
import { toast } from 'sonner';

const Budgeting = () => {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [budgets, setBudgets] = useState([]);
    const [funds, setFunds] = useState([]);
    const [milestones, setMilestones] = useState([]);

    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Initial Load
    useEffect(() => {
        loadInitData();
    }, []);

    const loadInitData = async () => {
        try {
            const [pData, fData] = await Promise.all([
                projectService.getAllProjects(),
                financeService.getFunds()
            ]);
            setProjects(pData);
            setFunds(fData);

            if (pData.length > 0) {
                setSelectedProject(pData[0].id);
                loadProjectData(pData[0].id);
            }
        } catch (error) {
            toast.error("Failed to load initial data");
        }
    };

    const loadProjectData = async (projectId) => {
        setLoading(true);
        try {
            const [bData, tData] = await Promise.all([
                financeService.getBudgets(projectId),
                schedulingService.getTasks(projectId)
            ]);
            setBudgets(bData);
            // Filter only Milestones
            setMilestones(tData.filter(t => t.isMilestone));
        } catch (error) {
            toast.error("Failed to load project budget/schedule");
        } finally {
            setLoading(false);
        }
    };

    const handleProjectChange = (e) => {
        const pid = e.target.value;
        setSelectedProject(pid);
        loadProjectData(pid);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            project: selectedProject,
            fund_head: formData.get('fund_head'),
            milestone: formData.get('milestone'),
            cost_category: formData.get('cost_category'),
            amount: formData.get('amount'),
            description: formData.get('description'),
            financial_year: '2025-2026' // dynamic later
        };

        try {
            await financeService.createBudget(data);
            toast.success("Budget Allocated to Milestone");
            setIsModalOpen(false);
            loadProjectData(selectedProject);
        } catch (error) {
            toast.error("Failed to allocate budget");
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Budget Allocation</h1>
                    <p className="text-slate-500 text-sm">Link Funds to Schedule Milestones (No Money Without Time)</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedProject || ''}
                        onChange={handleProjectChange}
                        className="px-3 py-2 border rounded-lg text-sm bg-white"
                    >
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <Button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white">
                        <Plus size={18} className="mr-2" /> Allocate Budget
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Linked Milestone</th>
                                <th className="px-6 py-4">Cost Category</th>
                                <th className="px-6 py-4">Fund Source</th>
                                <th className="px-6 py-4 text-right">Amount Allocated</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {budgets.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                        {item.milestone_name}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 font-mono text-xs uppercase bg-slate-50 rounded px-2 w-fit">
                                        {item.cost_category}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 italic">
                                        {item.fund_name || funds.find(f => f.id === item.fund_head)?.name || 'Unknown Fund'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-800">
                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.amount)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Active</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {budgets.length === 0 && !loading && (
                        <div className="p-12 text-center flex flex-col items-center">
                            <div className="bg-slate-50 p-4 rounded-full mb-3">
                                <Coins size={32} className="text-slate-400" />
                            </div>
                            <h3 className="text-slate-900 font-bold mb-1">No Budget Allocated</h3>
                            <p className="text-slate-500 text-sm max-w-sm">
                                Create a Milestone in Scheduling first, then allocate funds to it here.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-96">
                        <h2 className="text-lg font-bold mb-4">Allocate Budget</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700">Cost Category</label>
                                <select name="cost_category" className="w-full border rounded p-2 text-sm">
                                    <option value="civil_works">Civil Works</option>
                                    <option value="electrical">Electrical</option>
                                    <option value="plumbing">Plumbing</option>
                                    <option value="consultancy">Consultancy</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700">Select Milestone (Required)</label>
                                <select name="milestone" required className="w-full border rounded p-2 text-sm bg-amber-50 border-amber-200">
                                    <option value="">Select a Scheduled Milestone...</option>
                                    {milestones.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.progress}%)</option>
                                    ))}
                                </select>
                                {milestones.length === 0 && (
                                    <p className="text-[10px] text-red-500 mt-1">No Milestones found. Go to Schedule to create one.</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700">Fund Source</label>
                                <select name="fund_head" required className="w-full border rounded p-2 text-sm">
                                    <option value="">Select Fund...</option>
                                    {funds.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700">Amount to Allocate (INR)</label>
                                <input name="amount" type="number" required className="w-full border rounded p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700">Description</label>
                                <textarea name="description" className="w-full border rounded p-2 text-sm" rows="2"></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={milestones.length === 0} className="bg-primary-600 text-white">Allocate</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Budgeting;
