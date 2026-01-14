import { motion } from 'framer-motion';

const Switch = ({ checked, onChange, disabled = false, className = '' }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            className={`
                relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                ${checked ? 'bg-blue-600 dark:bg-indigo-500' : 'bg-slate-200 dark:bg-neutral-700'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${className}
            `}
        >
            <motion.span
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`
                    pointer-events-none block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                `}
                style={{
                    x: checked ? 20 : 0
                }}
            />
        </button>
    );
};

export default Switch;
