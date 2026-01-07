import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { MotionCard, MotionCardContent, MotionCardHeader, MotionCardTitle } from '@/components/ui/MotionCard';
import { Network, MapPin, BarChart3, TrendingUp } from 'lucide-react';
import { CalculationRules } from '@/lib/calculations';
import MetricsDetailModal from '@/components/ui/MetricsDetailModal';
import { DynamicChart } from '@/components/ui/DynamicChart';

const NICDCDashboard = ({ projects }) => {
    const navigate = useNavigate();
    const [selectedMetric, setSelectedMetric] = useState(null);

    // Calculate total investment (budget)
    const totalInvestment = CalculationRules.calculateTotalProjectBudget(projects.map(p => ({ allocated: p.budget })));

    // Calculate average progress
    const overallCompletion = projects.length > 0
        ? projects.reduce((acc, p) => acc + p.progress, 0) / projects.length
        : 0;

    const formatBudget = (val) => `₹${(Number(val) / 10000000).toFixed(2)} Cr`;

    const handleCardClick = (type) => {
        if (type === 'investment') {
            setSelectedMetric({
                title: 'Total Investment',
                description: "Cumulative capital allocation across all industrial nodes under NICDC purview. Represents the financial scale of infrastructure development including land, utilities, and connectivity projects.",
                items: projects.map(p => ({
                    label: p.name,
                    value: formatBudget(p.budget),
                    onClick: () => {
                        setSelectedMetric(null);
                        navigate(`/projects/${p.id}`);
                    }
                }))
            });
        }
    };

    // Prepare data for the performance matrix (Budget vs Spent)
    const performanceData = projects.map(p => ({
        name: p.name,
        budget: p.budget / 10000000, // Cr
        spent: p.spent / 10000000    // Cr
    }));


    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">NICDC HQ Central Command</h2>
                    <p className="opacity-80">National Industrial Corridor Development Corporation</p>
                </div>
                <Network size={32} className="opacity-50" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MotionCard>
                    <MotionCardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-full"><MapPin className="text-blue-600" /></div>
                        <div>
                            <p className="text-2xl font-bold">{projects.length}</p>
                            <p className="text-sm text-slate-500">Integrated Nodes</p>
                        </div>
                    </MotionCardContent>
                </MotionCard>
                <MotionCard
                    onClick={() => handleCardClick('investment')}
                    className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-emerald-500"
                >
                    <MotionCardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 rounded-full"><BarChart3 className="text-emerald-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{formatBudget(totalInvestment)}</p>
                            <p className="text-sm text-slate-500">Total Investment</p>
                            <p className="text-xs text-emerald-600 flex items-center mt-1">
                                <TrendingUp size={12} className="mr-1" /> Approved
                            </p>
                        </div>
                    </MotionCardContent>
                </MotionCard>
                <MotionCard>
                    <MotionCardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-purple-50 rounded-full"><Network className="text-purple-600" /></div>
                        <div>
                            <p className="text-2xl font-bold">{overallCompletion.toFixed(1)}%</p>
                            <p className="text-sm text-slate-500">Overall Completion</p>
                        </div>
                    </MotionCardContent>
                </MotionCard>
            </div>

            <MotionCard>
                <MotionCardHeader>
                    <MotionCardTitle>Node Performance Matrix (Budget vs Spent)</MotionCardTitle>
                </MotionCardHeader>
                <MotionCardContent>
                    <div className="h-80 w-full">
                        <DynamicChart
                            data={performanceData}
                            dataKey="budget"
                            name="Budget (Cr)"
                            height={320}
                            defaultType="bar"
                            colors={['#10b981', '#3b82f6']} // Emerald (Budget), Blue (Spent) - visualizing Budget for now
                        />
                    </div>
                </MotionCardContent>
            </MotionCard>

            <MetricsDetailModal
                isOpen={!!selectedMetric}
                onClose={() => setSelectedMetric(null)}
                title={selectedMetric?.title}
                description={selectedMetric?.description}
                items={selectedMetric?.items}
            />
        </motion.div>
    );
};

export default NICDCDashboard;
