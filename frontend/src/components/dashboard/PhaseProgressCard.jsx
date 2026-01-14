import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Phase Progress Card
 * Displays project phases with horizontal progress bars
 * Each phase is clickable and shows completion percentage
 */
const PhaseProgressCard = ({
    title = "Progress by Phase",
    phases = [],
    onPhaseClick
}) => {
    const navigate = useNavigate();

    // Default phases if none provided
    const defaultPhases = [
        { id: 'design', name: 'Design', progress: 0, color: '#3b82f6' },
        { id: 'procurement', name: 'Procurement', progress: 0, color: '#8b5cf6' },
        { id: 'construction', name: 'Construction', progress: 0, color: '#f59e0b' },
        { id: 'testing', name: 'Testing', progress: 0, color: '#10b981' },
        { id: 'closeout', name: 'Closeout', progress: 0, color: '#64748b' }
    ];

    const displayPhases = phases.length > 0 ? phases : defaultPhases;

    const handlePhaseClick = (phase) => {
        if (onPhaseClick) {
            onPhaseClick(phase);
        } else {
            navigate('/projects');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-slate-200 dark:border-neutral-700 shadow-sm dark:shadow-lg p-6"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 dark:from-white/5 via-transparent to-transparent pointer-events-none" />

            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{title}</h3>
                <button
                    className="text-sm text-blue-600 dark:text-indigo-400 hover:text-blue-700 dark:hover:text-indigo-300 font-medium flex items-center gap-1"
                    onClick={() => navigate('/projects')}
                >
                    View All <ChevronRight size={16} />
                </button>
            </div>

            <div className="space-y-4">
                {displayPhases.map((phase, index) => (
                    <motion.div
                        key={phase.id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group cursor-pointer"
                        onClick={() => handlePhaseClick(phase)}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-slate-700 dark:text-neutral-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                {phase.name}
                            </span>
                            <span
                                className="text-sm font-bold"
                                style={{ color: phase.color }}
                            >
                                {phase.progress}%
                            </span>
                        </div>
                        <div className="h-2.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: phase.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${phase.progress}%` }}
                                transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>

            {displayPhases.length === 0 && (
                <p className="text-center text-slate-400 dark:text-neutral-500 text-sm py-4">No phase data available</p>
            )}
        </motion.div>
    );
};

export default PhaseProgressCard;
