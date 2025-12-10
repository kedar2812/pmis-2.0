import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BarChart3, LineChart, PieChart, Settings2, Download } from 'lucide-react';
import { createPortal } from 'react-dom';
import { DynamicChart } from '@/components/ui/DynamicChart';
import Button from '@/components/ui/Button';

const GraphAnalysisModal = ({ isOpen, onClose, projects, initialMetric = 'budget' }) => {
    if (!isOpen) return null;

    const [selectedProject, setSelectedProject] = useState('All');
    const [chartType, setChartType] = useState('bar');
    const [metric, setMetric] = useState(initialMetric);

    // Derived Data Calculation
    const chartData = useMemo(() => {
        let data = projects;

        // 1. Filter by Project
        if (selectedProject !== 'All') {
            data = projects.filter(p => p.id === selectedProject);
        }

        // 2. Map based on selected metric
        return data.map(p => ({
            name: p.name,
            value: metric === 'budget' ? p.budget / 10000000 :
                metric === 'spent' ? p.spent / 10000000 :
                    p.progress
        }));
    }, [selectedProject, metric, projects]);

    const metricLabel = metric === 'budget' ? 'Total Budget (Cr)' :
        metric === 'spent' ? 'Total Spent (Cr)' :
            'Progress (%)';

    const ChartIcon = chartType === 'bar' ? BarChart3 : chartType === 'line' ? LineChart : PieChart;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-4xl bg-white glass-panel rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Modal Header */}
                    <div className="flex justify-between items-center p-6 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                                <Settings2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Advanced Project Analytics</h3>
                                <p className="text-sm text-slate-500">Customize variables to analyze project health</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Controls Toolbar */}
                    <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 border-b border-slate-200">

                        {/* Project Select */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Select Project</label>
                            <select
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="All">All Projects</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Metric Select */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Variable (Y-Axis)</label>
                            <select
                                value={metric}
                                onChange={(e) => setMetric(e.target.value)}
                                className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="budget">Total Allocated Budget</option>
                                <option value="spent">Actual Amount Spent</option>
                                <option value="progress">Physical Progress (%)</option>
                            </select>
                        </div>

                        {/* Chart Type Toggle */}
                        <div className="flex gap-2 items-end">
                            {['bar', 'line', 'area'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setChartType(type)}
                                    className={`p-2 rounded-lg border ${chartType === type ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'}`}
                                >
                                    {type === 'bar' && <BarChart3 size={20} />}
                                    {type === 'line' && <LineChart size={20} />}
                                    {type === 'area' && <PieChart size={20} />} {/* Using Pie icon for Area for now generic */}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div className="p-6 flex-1 min-h-[400px] bg-white">
                        <DynamicChart
                            data={chartData}
                            dataKey="value"
                            name={metricLabel}
                            defaultType={chartType}
                            height={400}
                            colors={['#4f46e5', '#10b981', '#f59e0b']}
                        />
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                        <p className="text-sm text-slate-500">
                            Showing data for <span className="font-semibold text-slate-900">{chartData.length}</span> items based on current filters.
                        </p>
                        <Button variant="outline" className="flex items-center gap-2">
                            <Download size={16} /> Export View
                        </Button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};

export default GraphAnalysisModal;
