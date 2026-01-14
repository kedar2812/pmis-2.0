import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * Loading Component
 * 
 * Reusable loading spinner with multiple sizes and variants.
 * Provides consistent loading states across the application.
 */
const Loading = ({
    size = 'default',
    text = null,
    fullScreen = false,
    overlay = false,
}) => {
    const sizes = {
        small: 'w-4 h-4',
        default: 'w-8 h-8',
        large: 'w-12 h-12',
    };

    const textSizes = {
        small: 'text-xs',
        default: 'text-sm',
        large: 'text-base',
    };

    const spinnerSize = sizes[size] || sizes.default;
    const textSize = textSizes[size] || textSizes.default;

    const content = (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-3"
        >
            <Loader2 className={`${spinnerSize} text-blue-600 dark:text-indigo-400 animate-spin`} />
            {text && (
                <p className={`${textSize} text-slate-600 dark:text-neutral-300 font-medium`}>{text}</p>
            )}
        </motion.div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-950 dark:to-neutral-900 flex items-center justify-center z-50">
                {content}
            </div>
        );
    }

    if (overlay) {
        return (
            <div className="absolute inset-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
                {content}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center py-12">
            {content}
        </div>
    );
};

/**
 * PageLoading Component
 * For use as page-level loading state
 */
export const PageLoading = ({ text = 'Loading...' }) => {
    return (
        <div className="flex-1 flex items-center justify-center py-24">
            <Loading size="large" text={text} />
        </div>
    );
};

/**
 * ButtonLoading Component
 * For use inside buttons
 */
export const ButtonLoading = ({ text = null }) => {
    return (
        <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {text && <span>{text}</span>}
        </span>
    );
};

/**
 * CardLoading Component
 * Skeleton loading for cards
 */
export const CardLoading = ({ count = 3 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm dark:shadow-lg p-6 animate-pulse"
                >
                    <div className="h-4 bg-slate-200 dark:bg-neutral-700 rounded w-3/4 mb-3"></div>
                    <div className="h-3 bg-slate-100 dark:bg-neutral-800 rounded w-1/2 mb-4"></div>
                    <div className="h-8 bg-slate-100 dark:bg-neutral-800 rounded w-full"></div>
                </motion.div>
            ))}
        </>
    );
};

/**
 * TableLoading Component
 * Skeleton loading for tables
 */
export const TableLoading = ({ rows = 5, cols = 4 }) => {
    return (
        <>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex} className="animate-pulse">
                    {Array.from({ length: cols }).map((_, colIndex) => (
                        <td key={colIndex} className="px-4 py-3">
                            <div className="h-4 bg-slate-200 dark:bg-neutral-700 rounded w-full"></div>
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
};

export default Loading;
