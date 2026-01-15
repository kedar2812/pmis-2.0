import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { MotionCard, MotionCardContent, MotionCardHeader, MotionCardTitle } from '@/components/ui/MotionCard';

const GovtDashboard = ({ projects, kpis }) => {
    const { t } = useLanguage();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
            <div className="text-center border-b border-slate-200 dark:border-neutral-700 pb-6">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Govt Emblem" className="h-16 mx-auto mb-4 opacity-80" />
                <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">{t('role.Govt_Department')}</h2>
                <p className="text-slate-600 dark:text-neutral-400">Executive Status Report</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {(projects || []).slice(0, 3).map(project => (
                    <MotionCard key={project.id} className="border-t-4 border-t-slate-800">
                        <MotionCardHeader>
                            <MotionCardTitle>{project.name}</MotionCardTitle>
                        </MotionCardHeader>
                        <MotionCardContent className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>{t('common.progress')}</span>
                                    <span className="font-bold">{project.progress}%</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-neutral-700 h-2 rounded-full overflow-hidden">
                                    <div className="bg-slate-800 dark:bg-slate-400 h-full" style={{ width: `${project.progress}%` }}></div>
                                </div>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600 dark:text-neutral-400 border-t dark:border-neutral-700 pt-2">
                                <span>{t('common.status')}</span>
                                <span className="font-semibold uppercase tracking-wide">{project.status}</span>
                            </div>
                        </MotionCardContent>
                    </MotionCard>
                ))}
            </div>

            <MotionCard>
                <MotionCardHeader><MotionCardTitle>Key Performance Indicators Summary</MotionCardTitle></MotionCardHeader>
                <MotionCardContent>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 uppercase">
                            <tr>
                                <th className="px-4 py-3">Metric</th>
                                <th className="px-4 py-3">{t('common.target')}</th>
                                <th className="px-4 py-3">{t('cost.actual')}</th>
                                <th className="px-4 py-3">{t('common.status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(kpis || []).slice(0, 5).map(kpi => (
                                <tr key={kpi.id} className="border-b dark:border-neutral-700">
                                    <td className="px-4 py-3 font-medium dark:text-white">{kpi.name}</td>
                                    <td className="px-4 py-3">{kpi.target} {kpi.unit}</td>
                                    <td className="px-4 py-3">{kpi.value} {kpi.unit}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs rounded-full ${kpi.value >= kpi.target ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {kpi.value >= kpi.target ? t('common.onTrack') : t('common.delayed')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </MotionCardContent>
            </MotionCard>
        </motion.div>
    );
};

export default GovtDashboard;
