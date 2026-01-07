import { useState } from 'react';
import { motion } from 'framer-motion';

import { MotionCard, MotionCardContent, MotionCardHeader, MotionCardTitle } from '@/components/ui/MotionCard';
import { DynamicChart } from '@/components/ui/DynamicChart';
import { ClipboardList, Clock, AlertOctagon, TrendingUp, CheckSquare } from 'lucide-react';
import { CalculationRules } from '@/lib/calculations';
import MetricsDetailModal from '@/components/ui/MetricsDetailModal';

const PMNCDashboard = ({ projects, tasks, risks }) => {
    const [selectedMetric, setSelectedMetric] = useState(null);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1 }
    };

    // PMNC Focus: Schedule Variance, Risk Heatmap, Action Items
    const delayedTasks = tasks.filter(task => {
        if (task.status === 'In Progress' || task.status === 'Not Started') {
            return new Date(task.endDate) < new Date();
        }
        return false;
    });

    const activeRiskCount = CalculationRules.filterRisks(risks, 'all', 'Open').length;
    const completedTasksCount = tasks.filter(t => t.status === 'Completed').length;
    const totalTasksCount = tasks.length;

    const handleCardClick = (type) => {
        let data = { title: '', description: '', items: [] };
        switch (type) {
            case 'delayed':
                data = {
                    title: 'Delayed Tasks',
                    description: "Tasks that have exceeded their planned end date. These items are on the critical path and may impact the overall project completion if not addressed immediately.",
                    items: delayedTasks.map(t => ({ label: t.name, value: `Due: ${t.endDate} ` }))
                };
                break;
            case 'risks':
                data = {
                    title: 'Active Risks',
                    description: "All currently open risks across the program. This necessitates active monitoring and execution of mitigation plans.",
                    items: risks.slice(0, 5).map(r => ({ label: r.title, value: r.impact }))
                };
                break;
            case 'completed':
                data = {
                    title: 'Completed',
                    description: "Milestones and tasks that have been successfully verified and closed.",
                    items: tasks.filter(t => t.status === 'Completed').slice(0, 5).map(t => ({ label: t.name, value: 'Done' }))
                };
                break;
            case 'evm':
                data = {
                    title: 'Earned Value Management',
                    description: "Detailed analysis of Planned Value (PV), Earned Value (EV), and Actual Cost (AC) to measure project performance.",
                    items: [
                        { label: 'SPI (Schedule Performance Index)', value: '0.92' },
                        { label: 'CPI (Cost Performance Index)', value: '1.05' }
                    ]
                };
                break;
            default: return;
        }
        setSelectedMetric(data);
    };

    return (
        <>
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                <motion.div variants={itemVariants}>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        PMNC Team Programme Management
                    </h2>
                    <p className="text-slate-500">Project Management & Network Control Center</p>
                </motion.div>

                {/* PMNC KPI Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <MotionCard
                        variants={itemVariants}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => handleCardClick('delayed')}
                        className="bg-white border-l-4 border-indigo-500 cursor-pointer"
                    >
                        <MotionCardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 rounded-full">
                                <Clock className="text-indigo-600" size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Delayed Tasks</p>
                                <p className="text-xl font-bold text-slate-800">
                                    {delayedTasks.length > 0 ? `- ${delayedTasks.length} Upcoming Tasks ` : 'On Track'}
                                </p>
                            </div>
                        </MotionCardContent>
                    </MotionCard>

                    <MotionCard
                        variants={itemVariants}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => handleCardClick('risks')}
                        className="bg-white border-l-4 border-amber-500 cursor-pointer"
                    >
                        <MotionCardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-amber-50 rounded-full">
                                <AlertOctagon className="text-amber-600" size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Active Risks</p>
                                <p className="text-xl font-bold text-slate-800">{activeRiskCount}</p>
                            </div>
                        </MotionCardContent>
                    </MotionCard>

                    <MotionCard variants={itemVariants} className="bg-white border-l-4 border-cyan-500">
                        <MotionCardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-cyan-50 rounded-full">
                                <ClipboardList className="text-cyan-600" size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Open RFIs</p>
                                <p className="text-xl font-bold text-slate-800">8</p>
                            </div>
                        </MotionCardContent>
                    </MotionCard>

                    <MotionCard
                        variants={itemVariants}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => handleCardClick('completed')}
                        className="bg-white border-l-4 border-emerald-500 cursor-pointer"
                    >
                        <MotionCardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 rounded-full">
                                <CheckSquare className="text-emerald-600" size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Completed</p>
                                <p className="text-xl font-bold text-slate-800">{completedTasksCount}/{totalTasksCount}</p>
                            </div>
                        </MotionCardContent>
                    </MotionCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <MotionCard
                        variants={itemVariants}
                        className="lg:col-span-2 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => handleCardClick('evm')}
                    >
                        <MotionCardHeader>
                            <MotionCardTitle>Earned Value Analysis (EVM)</MotionCardTitle>
                        </MotionCardHeader>
                        <MotionCardContent>
                            {/* Mock EVM Chart - In real app, this would use time-series data from backend */}
                            <DynamicChart
                                data={[
                                    { name: 'Month 1', pv: 100, ev: 90, ac: 95 },
                                    { name: 'Month 2', pv: 200, ev: 190, ac: 210 },
                                    { name: 'Month 3', pv: 300, ev: 280, ac: 320 },
                                    { name: 'Month 4', pv: 400, ev: 390, ac: 410 },
                                ]}
                                dataKey="ev"
                                height={300}
                                defaultType="line"
                                colors={['#8b5cf6', '#10b981', '#f43f5e']}
                            />
                            <div className="flex justify-center gap-4 mt-2 text-sm">
                                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-violet-500 rounded-full"></div> EV (Progress)</span>
                                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> PV (Planning)</span>
                                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-500 rounded-full"></div> AC (Actual)</span>
                            </div>
                        </MotionCardContent>
                    </MotionCard>

                    <MotionCard variants={itemVariants}>
                        <MotionCardHeader>
                            <MotionCardTitle>Compliance Status</MotionCardTitle>
                        </MotionCardHeader>
                        <MotionCardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span className="text-sm font-medium">Safety Audits</span>
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Approved</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span className="text-sm font-medium">Quality Checks</span>
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">98% Pass</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span className="text-sm font-medium">Env. Clearance</span>
                                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">Under Review</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span className="text-sm font-medium">Labor Compliance</span>
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Approved</span>
                                </div>
                            </div>
                        </MotionCardContent>
                    </MotionCard>
                </div>
            </motion.div>

            <MetricsDetailModal
                isOpen={!!selectedMetric}
                onClose={() => setSelectedMetric(null)}
                title={selectedMetric?.title}
                description={selectedMetric?.description}
                items={selectedMetric?.items}
            />
        </>
    );
};

export default PMNCDashboard;
