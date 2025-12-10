import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { MotionCard, MotionCardContent, MotionCardHeader, MotionCardTitle } from '@/components/ui/MotionCard';
import { Upload, FileText, CheckCircle, Calendar, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import MetricsDetailModal from '@/components/ui/MetricsDetailModal';

const EPCDashboard = ({ projects, tasks }) => {
    const { t } = useLanguage();
    const [selectedMetric, setSelectedMetric] = useState(null);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    // EPC Logic
    const myTasks = tasks.filter(t => t.assignedTo === 'EPC Contractor' || t.status === 'In Progress');
    const activeSiteTasks = myTasks.length;
    const pendingInvoicesCount = 3;

    const handleCardClick = (type) => {
        let data = { title: '', description: '', items: [] };
        switch (type) {
            case 'activeTasks':
                data = {
                    title: 'Active Site Tasks',
                    description: "Tasks currently designated as 'In Progress' at the construction site. This includes excavation, foundation laying, and structural erection works.",
                    items: myTasks.map(t => ({ label: t.name, value: t.endDate }))
                }
                break;
            case 'invoices':
                data = {
                    title: 'Pending Invoices',
                    description: "Invoices submitted for work certification that have not yet been cleared by the Finance department.",
                    items: [
                        { label: 'INV-2024-001', value: '₹50,00,000' },
                        { label: 'INV-2024-003', value: '₹22,10,000' },
                        { label: 'INV-2024-004', value: '₹8,45,000' }
                    ]
                }
                break;
            case 'safety':
                data = {
                    title: 'Safety Compliance',
                    description: "Current site safety rating based on daily QHSE audits. 100% means zero reported incidents and full adherence to PPE guidelines.",
                    items: []
                }
                break;
            default: return;
        }
        setSelectedMetric(data);
    }

    return (
        <>
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                <motion.div variants={itemVariants} className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{t('role.EPC_Contractor')} Operations</h2>
                        <p className="text-slate-500">Site Work, Progress Reporting & Compliance</p>
                    </div>
                    <Button>
                        <Upload size={16} /> {t('common.upload')} Report
                    </Button>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MotionCard
                        variants={itemVariants}
                        onClick={() => handleCardClick('activeTasks')}
                        className="border-t-4 border-t-orange-500 cursor-pointer hover:shadow-lg transition-all"
                    >
                        <MotionCardContent className="p-6 text-center">
                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Calendar className="text-orange-600" size={24} />
                            </div>
                            <h3 className="text-3xl font-bold text-slate-800">{activeSiteTasks}</h3>
                            <p className="text-slate-500">Active Site Tasks</p>
                        </MotionCardContent>
                    </MotionCard>

                    <MotionCard
                        variants={itemVariants}
                        onClick={() => handleCardClick('invoices')}
                        className="border-t-4 border-t-blue-500 cursor-pointer hover:shadow-lg transition-all"
                    >
                        <MotionCardContent className="p-6 text-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <FileText className="text-blue-600" size={24} />
                            </div>
                            <h3 className="text-3xl font-bold text-slate-800">{pendingInvoicesCount}</h3>
                            <p className="text-slate-500">Pending Invoices</p>
                        </MotionCardContent>
                    </MotionCard>

                    <MotionCard
                        variants={itemVariants}
                        onClick={() => handleCardClick('safety')}
                        className="border-t-4 border-t-green-500 cursor-pointer hover:shadow-lg transition-all"
                    >
                        <MotionCardContent className="p-6 text-center">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircle className="text-green-600" size={24} />
                            </div>
                            <h3 className="text-3xl font-bold text-slate-800">100%</h3>
                            <p className="text-slate-500">Safety Compliance</p>
                        </MotionCardContent>
                    </MotionCard>
                </div>

                <MotionCard variants={itemVariants}>
                    <MotionCardHeader>
                        <MotionCardTitle>{t('dashboard.upcomingTasks')}</MotionCardTitle>
                    </MotionCardHeader>
                    <MotionCardContent>
                        <div className="space-y-3">
                            {myTasks.slice(0, 5).map(task => (
                                <div key={task.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${task.priority === 'High' ? 'bg-red-500' : 'bg-blue-500'} `} />
                                        <span className="font-medium text-slate-800">{task.name}</span>
                                    </div>
                                    <span className="text-sm text-slate-500">Due: {task.endDate}</span>
                                </div>
                            ))}
                        </div>
                    </MotionCardContent>
                </MotionCard>
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

export default EPCDashboard;
