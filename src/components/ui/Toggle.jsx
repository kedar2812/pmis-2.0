import { motion } from 'framer-motion';

/**
 * Toggle Switch Component
 * Smooth animated toggle with blue active color
 * 
 * @param {boolean} enabled - Current toggle state
 * @param {function} onChange - Callback when toggled
 * @param {string} label - Optional label text
 * @param {string} description - Optional description text
 * @param {boolean} disabled - Disable toggle
 * @param {string} size - 'sm' | 'md' | 'lg'
 */
const Toggle = ({
    enabled = false,
    onChange,
    label,
    description,
    disabled = false,
    size = 'md'
}) => {
    const sizes = {
        sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
        md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5' },
        lg: { track: 'w-14 h-7', thumb: 'w-6 h-6', translate: 'translate-x-7' }
    };

    const sizeConfig = sizes[size] || sizes.md;

    const handleToggle = () => {
        if (!disabled && onChange) {
            onChange(!enabled);
        }
    };

    return (
        <div className={`flex items-center justify-between ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {(label || description) && (
                <div className="flex-1 mr-4">
                    {label && (
                        <span className="text-sm font-medium text-slate-700">
                            {label}
                        </span>
                    )}
                    {description && (
                        <p className="text-xs text-slate-400 mt-0.5">
                            {description}
                        </p>
                    )}
                </div>
            )}

            <button
                type="button"
                role="switch"
                aria-checked={enabled}
                disabled={disabled}
                onClick={handleToggle}
                className={`
                    relative inline-flex flex-shrink-0 
                    ${sizeConfig.track}
                    rounded-full cursor-pointer
                    transition-colors duration-300 ease-in-out
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${enabled ? 'bg-blue-500' : 'bg-slate-200'}
                    ${disabled ? 'cursor-not-allowed' : ''}
                `}
            >
                <motion.span
                    aria-hidden="true"
                    layout
                    transition={{
                        type: "spring",
                        stiffness: 700,
                        damping: 30
                    }}
                    className={`
                        pointer-events-none inline-block
                        ${sizeConfig.thumb}
                        rounded-full bg-white shadow-lg
                        ring-0 
                        ${enabled ? sizeConfig.translate : 'translate-x-0.5'}
                        transform transition-transform duration-200
                        mt-0.5 ml-0.5
                    `}
                    style={{
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
                    }}
                />
            </button>
        </div>
    );
};

export default Toggle;
