import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';

/**
 * InfoTooltip - Animated tooltip with "i" icon for explaining dashboard cards
 * 
 * Features:
 * - Smooth enter/exit animations
 * - Auto-positioning (avoids screen edges)
 * - Dark mode compliant
 * - Mobile responsive (touch support)
 */
const InfoTooltip = ({
    content,
    position = 'top', // 'top' | 'bottom' | 'left' | 'right'
    className = ''
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [adjustedPosition, setAdjustedPosition] = useState(position);
    const tooltipRef = useRef(null);
    const buttonRef = useRef(null);

    // Check if tooltip would overflow and adjust position
    useEffect(() => {
        if (isVisible && tooltipRef.current && buttonRef.current) {
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            const buttonRect = buttonRef.current.getBoundingClientRect();

            // Check boundaries
            if (position === 'top' && tooltipRect.top < 10) {
                setAdjustedPosition('bottom');
            } else if (position === 'bottom' && tooltipRect.bottom > window.innerHeight - 10) {
                setAdjustedPosition('top');
            } else if (position === 'left' && tooltipRect.left < 10) {
                setAdjustedPosition('right');
            } else if (position === 'right' && tooltipRect.right > window.innerWidth - 10) {
                setAdjustedPosition('left');
            } else {
                setAdjustedPosition(position);
            }
        }
    }, [isVisible, position]);

    const positionStyles = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowStyles = {
        top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-slate-800 dark:border-t-neutral-700',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-slate-800 dark:border-b-neutral-700',
        left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-slate-800 dark:border-l-neutral-700',
        right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-slate-800 dark:border-r-neutral-700',
    };

    return (
        <div className={`relative inline-flex ${className}`}>
            {/* Info Button */}
            <button
                ref={buttonRef}
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                onFocus={() => setIsVisible(true)}
                onBlur={() => setIsVisible(false)}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsVisible(!isVisible);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:text-neutral-500 dark:hover:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                aria-label="More information"
                type="button"
            >
                <Info size={14} />
            </button>

            {/* Tooltip */}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        ref={tooltipRef}
                        initial={{ opacity: 0, scale: 0.9, y: adjustedPosition === 'top' ? 10 : adjustedPosition === 'bottom' ? -10 : 0, x: adjustedPosition === 'left' ? 10 : adjustedPosition === 'right' ? -10 : 0 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: adjustedPosition === 'top' ? 10 : adjustedPosition === 'bottom' ? -10 : 0, x: adjustedPosition === 'left' ? 10 : adjustedPosition === 'right' ? -10 : 0 }}
                        transition={{
                            duration: 0.15,
                            ease: [0.4, 0, 0.2, 1]
                        }}
                        className={`absolute z-50 ${positionStyles[adjustedPosition]}`}
                        role="tooltip"
                    >
                        <div className="relative px-3 py-2 text-xs font-medium text-white bg-slate-800 dark:bg-neutral-700 rounded-lg shadow-lg max-w-xs whitespace-normal">
                            {content}
                            {/* Arrow */}
                            <div
                                className={`absolute w-0 h-0 border-4 ${arrowStyles[adjustedPosition]}`}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/**
 * InfoTooltipWrapper - Wrapper component for adding info tooltip to any element
 * Places the tooltip button in the top-right corner
 */
export const InfoTooltipWrapper = ({ children, content, className = '' }) => {
    return (
        <div className={`relative ${className}`}>
            {children}
            <div className="absolute top-2 right-2 z-10">
                <InfoTooltip content={content} position="left" />
            </div>
        </div>
    );
};

export default InfoTooltip;
