import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/**
 * Radial Progress Card
 * Animated circular progress indicator with percentage in center
 * Click to navigate to detailed view
 */
const RadialProgressCard = ({
    label,
    value = 0,
    maxValue = 100,
    color = 'primary',
    size = 'medium',
    subtext,
    navigateTo,
    onClick
}) => {
    const navigate = useNavigate();

    const percentage = Math.min(Math.round((value / maxValue) * 100), 100);

    // Size configurations
    const sizes = {
        small: { width: 80, stroke: 6, fontSize: 'text-lg' },
        medium: { width: 120, stroke: 8, fontSize: 'text-2xl' },
        large: { width: 160, stroke: 10, fontSize: 'text-3xl' }
    };

    const config = sizes[size] || sizes.medium;
    const radius = (config.width - config.stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    // Color configurations
    const colors = {
        primary: { stroke: '#6366f1', bg: 'from-primary-50 to-primary-100' },
        emerald: { stroke: '#10b981', bg: 'from-emerald-50 to-emerald-100' },
        blue: { stroke: '#3b82f6', bg: 'from-blue-50 to-blue-100' },
        amber: { stroke: '#f59e0b', bg: 'from-amber-50 to-amber-100' },
        rose: { stroke: '#f43f5e', bg: 'from-rose-50 to-rose-100' },
        violet: { stroke: '#8b5cf6', bg: 'from-violet-50 to-violet-100' }
    };

    const colorConfig = colors[color] || colors.primary;

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else if (navigateTo) {
            navigate(navigateTo);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
                relative overflow-hidden rounded-2xl
                bg-gradient-to-br ${colorConfig.bg}
                border border-white/50
                shadow-[0_8px_32px_rgba(0,0,0,0.06)]
                p-6 cursor-pointer
                transition-all duration-300
            `}
            onClick={handleClick}
        >
            <div className="flex flex-col items-center">
                {/* SVG Circular Progress */}
                <div className="relative" style={{ width: config.width, height: config.width }}>
                    {/* Background circle */}
                    <svg
                        className="transform -rotate-90"
                        width={config.width}
                        height={config.width}
                    >
                        <circle
                            cx={config.width / 2}
                            cy={config.width / 2}
                            r={radius}
                            stroke="rgba(255,255,255,0.5)"
                            strokeWidth={config.stroke}
                            fill="none"
                        />
                        {/* Progress circle */}
                        <motion.circle
                            cx={config.width / 2}
                            cy={config.width / 2}
                            r={radius}
                            stroke={colorConfig.stroke}
                            strokeWidth={config.stroke}
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                    </svg>

                    {/* Center percentage */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.span
                            className={`${config.fontSize} font-bold text-slate-800`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            {percentage}%
                        </motion.span>
                    </div>
                </div>

                {/* Label */}
                <p className="text-sm font-semibold text-slate-700 mt-3 text-center">{label}</p>

                {/* Subtext */}
                {subtext && (
                    <p className="text-xs text-slate-500 mt-1 text-center">{subtext}</p>
                )}
            </div>
        </motion.div>
    );
};

export default RadialProgressCard;
