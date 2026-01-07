import { motion } from 'framer-motion';

/**
 * Toggle Switch Component
 * Smooth animated toggle with primary blue active color
 * Supports both 'checked' and 'enabled' props for compatibility
 */
const Toggle = ({
    checked,
    enabled,
    onChange,
    label,
    description,
    disabled = false,
    size = 'md'
}) => {
    // Support both 'checked' and 'enabled' props
    const isOn = checked ?? enabled ?? false;

    const sizes = {
        sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
        md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5' },
        lg: { track: 'w-14 h-7', thumb: 'w-6 h-6', translate: 'translate-x-7' }
    };

    const sizeConfig = sizes[size] || sizes.md;

    const handleToggle = () => {
        if (!disabled && onChange) {
            onChange(!isOn);
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
                aria-checked={isOn}
                disabled={disabled}
                onClick={handleToggle}
                className={`
                    relative inline-flex flex-shrink-0 
                    ${sizeConfig.track}
                    rounded-full cursor-pointer
                    transition-colors duration-200 ease-in-out
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
                    ${isOn ? 'bg-primary-600' : 'bg-slate-300'}
                    ${disabled ? 'cursor-not-allowed' : 'hover:opacity-90'}
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
                        rounded-full bg-white shadow-md
                        ${isOn ? sizeConfig.translate : 'translate-x-0.5'}
                        transform transition-transform duration-200
                        mt-0.5 ml-0.5
                    `}
                />
            </button>
        </div>
    );
};

export default Toggle;
