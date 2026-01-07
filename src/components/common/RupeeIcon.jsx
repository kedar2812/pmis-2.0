import React from 'react';

/**
 * Custom styled Indian Rupee icon component
 * Design optimized for Government of India PMIS application
 * 
 * @param {object} props - Component props
 * @param {number} props.size - Icon size in pixels (default: 24)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.color - Icon color (default: currentColor)
 * @returns {JSX.Element} Rupee icon SVG
 */
export const RupeeIcon = ({ size = 24, className = '', color = 'currentColor', ...props }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`rupee-icon ${className}`}
            {...props}
        >
            {/* Indian Rupee Symbol - optimized for clarity */}
            <path
                d="M6 3h12M6 7h12M6 11h5.5c2.5 0 4.5 2 4.5 4.5S14 20 11.5 20L6 14"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

/**
 * Rupee icon wrapped in a circular badge - premium look
 * Perfect for dashboard KPI cards
 * 
 * @param {object} props - Component props
 * @param {number} props.size - Icon size (default: 24)
 * @param {string} props.bgColor - Background color (default: bg-primary-100)
 * @param {string} props.iconColor - Icon color (default: text-primary-700)
 * @returns {JSX.Element} Circular rupee icon
 */
export const CircleRupeeIcon = ({
    size = 24,
    bgColor = 'bg-primary-100',
    iconColor = 'text-primary-700',
    className = '',
}) => {
    return (
        <div
            className={`rounded-full ${bgColor} ${iconColor} p-2 inline-flex items-center justify-center ${className}`}
            style={{ width: size + 16, height: size + 16 }}
        >
            <RupeeIcon size={size} className={iconColor} />
        </div>
    );
};

/**
 * Gradient Rupee icon - premium glass-morphic design
 * Perfect for highlighting financial metrics
 * 
 * @param {object} props - Component props
 * @param {number} props.size - Icon size (default: 32)
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Gradient rupee icon
 */
export const GradientRupeeIcon = ({ size = 32, className = '' }) => {
    return (
        <div
            className={`relative inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg ${className}`}
            style={{ width: size + 16, height: size + 16 }}
        >
            <RupeeIcon size={size} color="white" />
        </div>
    );
};

export default RupeeIcon;
