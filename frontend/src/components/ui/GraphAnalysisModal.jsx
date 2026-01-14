import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BarChart3, LineChart, PieChart, Settings2, Download, RefreshCw } from 'lucide-react';
import { createPortal } from 'react-dom';
import { DynamicChart } from '@/components/ui/DynamicChart';
import Button from '@/components/ui/Button';

const GraphAnalysisModal = ({ isOpen, onClose, projects, initialMetric = 'budget' }) => {
    if (!isOpen) return null;

    const [groupBy, setGroupBy] = useState('project'); // project, status, type, location
    const [chartType, setChartType] = useState('bar');
    const [metric, setMetric] = useState(initialMetric);
    const [isGenerating, setIsGenerating] = useState(false);

    // Handle Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }

        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Dynamic Data Aggregation Engine
    const chartData = useMemo(() => {
        if (!projects) return [];

        // 1. Group Data
        const grouped = projects.reduce((acc, curr) => {
            let key = '';

            switch (groupBy) {
                case 'project':
                    key = curr.name;
                    break;
                case 'status':
                    key = curr.status;
                    break;
                case 'category':
                    key = curr.category || 'Uncategorized';
                    break;
                case 'manager':
                    key = curr.manager || 'Unassigned';
                    break;
                default:
                    key = curr.name;
            }

            if (!acc[key]) {
                acc[key] = {
                    name: key,
                    count: 0,
                    budget: 0,
                    spent: 0,
                    progressSum: 0
                };
            }

            acc[key].count += 1;
            acc[key].budget += curr.budget || 0;
            acc[key].spent += curr.spent || 0;
            acc[key].progressSum += curr.progress || 0;

            return acc;
        }, {});

        // 2. Transform to Chart Format based on Metric
        return Object.values(grouped).map(group => {
            let value = 0;
            switch (metric) {
                case 'budget':
                    value = group.budget / 10000000; // Cr
                    break;
                case 'spent':
                    value = group.spent / 10000000; // Cr
                    break;
                case 'progress':
                    value = groupBy === 'project' ? group.progressSum : (group.progressSum / group.count); // Average for groups
                    break;
                case 'count':
                    value = group.count;
                    break;
                case 'utilization':
                    value = group.budget > 0 ? (group.spent / group.budget) * 100 : 0;
                    break;
                default:
                    value = 0;
            }

            return {
                name: group.name,
                value: Number(value.toFixed(2))
            };
        }).sort((a, b) => b.value - a.value); // Descending sort for better viz
    }, [projects, groupBy, metric]);

    const metricLabels = {
        budget: 'Total Allocated Budget (₹ Cr)',
        spent: 'Total Amount Spent (₹ Cr)',
        progress: 'Average Progress (%)',
        count: 'Project Count',
        utilization: 'Budget Utilization (%)'
    };

    const handleGenerate = () => {
        setIsGenerating(true);
        setTimeout(() => setIsGenerating(false), 800);
    };

    const handleExport = () => {
        const headers = ['Name', metricLabels[metric]];
        const csvContent = [
            headers.join(','),
            ...chartData.map(row => `${row.name},${row.value}`)
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `PMIS_Report_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-5xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-neutral-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg">
                                <Settings2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Custom Report Generator</h3>
                                <p className="text-sm text-slate-500 dark:text-neutral-400">Analyze project portfolio dimensions</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full text-slate-500 dark:text-neutral-400">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Scrollable Content Container */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-6 space-y-8">

                            {/* Generator Controls */}
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">

                                {/* Group By (X-Axis) */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Group By (X-Axis)</label>
                                    <select
                                        value={groupBy}
                                        onChange={(e) => { setGroupBy(e.target.value); handleGenerate(); }}
                                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
                                    >
                                        <option value="project">Individual Projects</option>
                                        <option value="status">Project Status</option>
                                        <option value="category">Project Category</option>
                                        <option value="manager">Project Manager</option>
                                    </select>
                                </div>

                                {/* Metric (Y-Axis) */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Metric (Y-Axis)</label>
                                    <select
                                        value={metric}
                                        onChange={(e) => { setMetric(e.target.value); handleGenerate(); }}
                                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
                                    >
                                        <option value="budget">Total Budget</option>
                                        <option value="spent">Total Spent</option>
                                        <option value="utilization">Budget Utilization</option>
                                        <option value="progress">Avg. Progress</option>
                                        <option value="count">Count of Projects</option>
                                    </select>
                                </div>

                                {/* Generate Button */}
                                <Button
                                    onClick={handleGenerate}
                                    className="h-[42px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-md active:scale-95 transition-all"
                                >
                                    {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <Settings2 size={18} />}
                                    <span className="ml-2">Generate Graph</span>
                                </Button>
                            </div>

                            {/* Chart Visualization Area */}
                            <div className="min-h-[450px] bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                                <div className="flex justify-between items-center mb-6 pl-2">
                                    <h4 className="text-lg font-bold text-slate-800">Analysis Results</h4>
                                    <div className="text-sm text-slate-500">
                                        {metricLabels[metric]} vs {groupBy === 'project' ? 'Projects' : groupBy}
                                    </div>
                                </div>

                                <DynamicChart
                                    data={chartData}
                                    dataKey="value"
                                    name={metricLabels[metric]}
                                    defaultType={chartType}
                                    height={400}
                                    loading={isGenerating}
                                    colors={['#4f46e5', '#3b82f6', '#f59e0b', '#10b981', '#ef4444']}
                                />
                            </div>

                            {/* Data Summary Table (Optional logic enhancement) */}
                            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                                <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase">Data Summary</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                                        <p className="text-xs text-slate-500 mb-1">Total Datapoints</p>
                                        <p className="text-2xl font-bold text-slate-800">{chartData.length}</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                                        <p className="text-xs text-slate-500 mb-1">Highest Value</p>
                                        <p className="text-2xl font-bold text-emerald-600">
                                            {Math.max(...chartData.map(d => d.value)).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                                        <p className="text-xs text-slate-500 mb-1">Average Value</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {(chartData.reduce((a, b) => a + b.value, 0) / chartData.length).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center z-10 rounded-b-2xl">
                        <p className="text-xs text-slate-500">
                            Generated by <span className="font-semibold text-slate-700">PMIS Analytics Engine</span> • {new Date().toLocaleDateString()}
                        </p>
                        <Button variant="outline" className="flex items-center gap-2 text-sm h-9" onClick={handleExport}>
                            <Download size={14} /> Export Report
                        </Button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};

export default GraphAnalysisModal;
