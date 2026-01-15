/**
 * ThemeToggle Component
 * 
 * A beautiful, accessible toggle button for switching between light, dark, and system themes.
 * Features smooth animations and clear visual feedback.
 * 
 * Usage:
 * ```jsx
 * import ThemeToggle from '@/components/ui/ThemeToggle';
 * 
 * // In Header or Settings
 * <ThemeToggle />
 * ```
 */

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const THEME_CONFIG = {
    light: {
        icon: Sun,
        label: 'Light Mode',
        next: 'dark',
    },
    dark: {
        icon: Moon,
        label: 'Dark Mode',
        next: 'system',
    },
    system: {
        icon: Monitor,
        label: 'System Theme',
        next: 'light',
    },
};

export default function ThemeToggle() {
    const { theme, setTheme, effectiveTheme } = useTheme();
    const config = THEME_CONFIG[theme];
    const Icon = config.icon;

    const handleToggle = () => {
        setTheme(config.next);
    };

    return (
        <motion.button
            onClick={handleToggle}
            className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-all duration-200 group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={`Switch to ${config.next} mode`}
            title={config.label}
        >
            {/* Icon with animation */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={theme}
                    initial={{ y: -20, opacity: 0, rotate: -90 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: 20, opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center"
                >
                    <Icon
                        size={18}
                        className={`transition-colors duration-200 ${effectiveTheme === 'dark'
                            ? 'text-white'
                            : 'text-slate-600 group-hover:text-slate-800'
                            }`}
                    />
                </motion.div>
            </AnimatePresence>

            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-blue-600/0 to-blue-600/0 group-hover:from-blue-600/10 group-hover:to-blue-600/5 transition-all duration-300 pointer-events-none" />
        </motion.button>
    );
}

/**
 * ThemeToggle with Label (for settings pages)
 */
export function ThemeToggleWithLabel() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-100 dark:bg-neutral-800">
            <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                    Theme
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Choose your preferred color scheme
                </p>
            </div>

            <div className="flex items-center gap-2">
                {Object.entries(THEME_CONFIG).map(([mode, config]) => {
                    const Icon = config.icon;
                    const isActive = theme === mode;

                    return (
                        <motion.button
                            key={mode}
                            onClick={() => setTheme(mode)}
                            className={`
                relative flex items-center justify-center w-10 h-10 rounded-lg
                transition-all duration-200
                ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800 hover:text-slate-800 dark:hover:text-white'
                                }
              `}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            aria-label={config.label}
                            aria-pressed={isActive}
                            title={config.label}
                        >
                            <Icon size={18} />
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
