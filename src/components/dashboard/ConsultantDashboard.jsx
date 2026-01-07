import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { MotionCard, MotionCardContent, MotionCardHeader, MotionCardTitle } from '@/components/ui/MotionCard';
import { Box, Layers, GitPullRequest, Eye } from 'lucide-react';

const ConsultantDashboard = ({ projects, tasks }) => {
    const { t } = useLanguage();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    // Logic Calculation
    const activeBIMModels = projects.filter(p => p.status === 'Planning' || p.status === 'In Progress').length;
    const drawingsUnderReview = 0; // Document system removed

    // Simulate Change Requests from tasks related to 'Review' or 'Change'
    const changeRequests = tasks ? tasks.filter(t => t.name.includes('Review') || t.status === 'Under Review').length : 0;

    const recentDrawings = [];

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">{t('role.Consultant_Design')} Hub</h2>
            <p className="text-slate-500">Drawing Approvals, BIM Coordination & Technical Reviews</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MotionCard className="bg-purple-50 border-purple-200">
                    <MotionCardContent className="p-6 flex flex-col items-center">
                        <Box size={32} className="text-purple-600 mb-2" />
                        <span className="text-2xl font-bold text-slate-800">{activeBIMModels}</span>
                        <span className="text-sm text-purple-700">Active BIM Models</span>
                    </MotionCardContent>
                </MotionCard>
                <MotionCard className="bg-pink-50 border-pink-200">
                    <MotionCardContent className="p-6 flex flex-col items-center">
                        <Layers size={32} className="text-pink-600 mb-2" />
                        <span className="text-2xl font-bold text-slate-800">{drawingsUnderReview}</span>
                        <span className="text-sm text-pink-700">Drawings Under Review</span>
                    </MotionCardContent>
                </MotionCard>
                <MotionCard className="bg-indigo-50 border-indigo-200">
                    <MotionCardContent className="p-6 flex flex-col items-center">
                        <GitPullRequest size={32} className="text-indigo-600 mb-2" />
                        <span className="text-2xl font-bold text-slate-800">{changeRequests}</span>
                        <span className="text-sm text-indigo-700">Change Requests</span>
                    </MotionCardContent>
                </MotionCard>
                <MotionCard className="bg-slate-50 border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
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
                        {recentDrawings.length > 0 ? (
                            <ul className="space-y-3">
                                {recentDrawings.map((doc, index) => (
                                    <li key={doc.id || index} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded transition-colors cursor-pointer">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="truncate text-sm font-medium text-slate-700">{doc.name}</span>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded ${doc.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                            doc.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {doc.status || 'Pending'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center py-8 text-slate-500 text-sm">No drawings uploaded recently.</div>
                        )}
                    </MotionCardContent>
                </MotionCard>
                <MotionCard>
                    <MotionCardHeader><MotionCardTitle>BIM Coordination Issues</MotionCardTitle></MotionCardHeader>
                    <MotionCardContent>
                        <div className="space-y-4">
                            {tasks && tasks.filter(t => t.priority === 'High').slice(0, 3).map(task => (
                                <div key={task.id} className="p-3 bg-red-50 rounded border border-red-100 flex justify-between items-center">
                                    <span className="text-sm font-medium text-red-900">{task.name}</span>
                                    <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full">High Priority</span>
                                </div>
                            ))}
                            {(!tasks || tasks.filter(t => t.priority === 'High').length === 0) && (
                                <div className="p-4 bg-slate-50 rounded border border-slate-100 text-center text-slate-400">
                                    No critical coordination issues detected.
                                </div>
                            )}
                        </div>
                    </MotionCardContent>
                </MotionCard>
            </div>
        </motion.div>
    );
};

export default ConsultantDashboard;
