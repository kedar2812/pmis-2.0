import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { MotionCard, MotionCardContent, MotionCardHeader, MotionCardTitle } from '@/components/ui/MotionCard';
import { Network, MapPin, BarChart3 } from 'lucide-react';
import { CalculationRules } from '@/lib/calculations';

const NICDCDashboard = ({ projects }) => {
    const { t } = useLanguage();

    // Calculate total investment (budget)
    const totalInvestment = CalculationRules.calculateTotalProjectBudget(projects.map(p => ({ allocated: p.budget })));

    // Calculate average progress
    const overallCompletion = projects.length > 0
        ? projects.reduce((acc, p) => acc + p.progress, 0) / projects.length
        : 0;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">{t('role.NICDC_HQ')} Central Command</h2>
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
                <MotionCard>
                    <MotionCardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-green-50 rounded-full"><BarChart3 className="text-green-600" /></div>
                        <div>
                            <p className="text-2xl font-bold">₹{(totalInvestment / 10000000).toFixed(2)} Cr</p>
                            <p className="text-sm text-slate-500">Total Investment</p>
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
                <MotionCardHeader><MotionCardTitle>Node Performance Matrix</MotionCardTitle></MotionCardHeader>
                <MotionCardContent>
                    <div className="h-64 flex items-center justify-center bg-slate-50 rounded border border-dashed border-slate-300">
                        <p className="text-slate-400">Interactive Map / Scatter Plot Placeholder</p>
                    </div>
                </MotionCardContent>
            </MotionCard>
        </motion.div>
    );
};

export default NICDCDashboard;
