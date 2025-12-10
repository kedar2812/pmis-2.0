import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { MotionCard, MotionCardContent, MotionCardHeader, MotionCardTitle } from '@/components/ui/MotionCard';
import { Box, Layers, GitPullRequest, Eye } from 'lucide-react';

const ConsultantDashboard = () => {
    const { t } = useLanguage();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">{t('role.Consultant_Design')} Hub</h2>
            <p className="text-slate-500">Drawing Approvals, BIM Coordination & Technical Reviews</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MotionCard className="bg-purple-50 border-purple-200">
                    <MotionCardContent className="p-6 flex flex-col items-center">
                        <Box size={32} className="text-purple-600 mb-2" />
                        <span className="text-2xl font-bold text-slate-800">12</span>
                        <span className="text-sm text-purple-700">Active BIM Models</span>
                    </MotionCardContent>
                </MotionCard>
                <MotionCard className="bg-pink-50 border-pink-200">
                    <MotionCardContent className="p-6 flex flex-col items-center">
                        <Layers size={32} className="text-pink-600 mb-2" />
                        <span className="text-2xl font-bold text-slate-800">45</span>
                        <span className="text-sm text-pink-700">Drawings Under Review</span>
                    </MotionCardContent>
                </MotionCard>
                <MotionCard className="bg-indigo-50 border-indigo-200">
                    <MotionCardContent className="p-6 flex flex-col items-center">
                        <GitPullRequest size={32} className="text-indigo-600 mb-2" />
                        <span className="text-2xl font-bold text-slate-800">8</span>
                        <span className="text-sm text-indigo-700">Change Requests</span>
                    </MotionCardContent>
                </MotionCard>
                <MotionCard className="bg-slate-50 border-slate-200">
                    <MotionCardContent className="p-6 flex flex-col items-center">
                        <Eye size={32} className="text-slate-600 mb-2" />
                        <span className="text-2xl font-bold text-slate-800">{t('common.view')}</span>
                        <span className="text-sm text-slate-700">Pending Actions</span>
                    </MotionCardContent>
                </MotionCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MotionCard>
                    <MotionCardHeader><MotionCardTitle>Recent Drawing Uploads</MotionCardTitle></MotionCardHeader>
                    <MotionCardContent>
                        <ul className="space-y-3">
                            <li className="flex justify-between p-2 hover:bg-slate-50 rounded">
                                <span className="text-sm">Main_Terminal_L1_Arch.dwg</span>
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">{t('common.underReview')}</span>
                            </li>
                            <li className="flex justify-between p-2 hover:bg-slate-50 rounded">
                                <span className="text-sm">Utility_Corridor_Sec_A.pdf</span>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{t('common.approved')}</span>
                            </li>
                            <li className="flex justify-between p-2 hover:bg-slate-50 rounded">
                                <span className="text-sm">Landscaping_MasterPlan_Rev3.rvt</span>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">In Review</span>
                            </li>
                        </ul>
                    </MotionCardContent>
                </MotionCard>
                <MotionCard>
                    <MotionCardHeader><MotionCardTitle>BIM Coordination Issues</MotionCardTitle></MotionCardHeader>
                    <MotionCardContent>
                        <div className="p-4 bg-slate-50 rounded border border-slate-100 text-center text-slate-500">
                            3D Model Viewer Integration Ready
                        </div>
                    </MotionCardContent>
                </MotionCard>
            </div>
        </motion.div>
    );
};

export default ConsultantDashboard;
