import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';

/**
 * InfoTooltip - Animated tooltip with "i" icon for explaining dashboard cards
 * 
 * Features:
 * - Portal rendering to avoid parent overflow issues
 * - Smooth enter/exit animations
 * - Auto-positioning (avoids screen edges)
 * - Dark mode compliant
 * - Mobile responsive (touch support)
 */
const InfoTooltip = ({
    content,
    position = 'left', // 'top' | 'bottom' | 'left' | 'right'
    className = ''
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const [mounted, setMounted] = useState(false);
    const buttonRef = useRef(null);

    // Ensure component is mounted before using portal
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Calculate tooltip position based on button position
    useEffect(() => {
        if (isVisible && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const tooltipWidth = 300; // Max width of tooltip
            const tooltipHeight = 100; // Approximate height

            let top = 0;
            let left = 0;

            // Calculate position based on preference
            switch (position) {
                case 'top':
                    top = rect.top - tooltipHeight - 8;
                    left = rect.left + rect.width / 2 - tooltipWidth / 2;
                    break;
                case 'bottom':
                    top = rect.bottom + 8;
                    left = rect.left + rect.width / 2 - tooltipWidth / 2;
                    break;
                case 'left':
                    top = rect.top + rect.height / 2 - tooltipHeight / 2;
                    left = rect.left - tooltipWidth - 8;
                    break;
                case 'right':
                    top = rect.top + rect.height / 2 - tooltipHeight / 2;
                    left = rect.right + 8;
                    break;
                default:
                    top = rect.top - tooltipHeight - 8;
                    left = rect.left + rect.width / 2 - tooltipWidth / 2;
            }

            // Boundary checks - keep tooltip on screen
            if (left < 10) left = 10;
            if (left + tooltipWidth > window.innerWidth - 10) left = window.innerWidth - tooltipWidth - 10;
            if (top < 10) top = rect.bottom + 8; // Flip to bottom if no space on top
            if (top + tooltipHeight > window.innerHeight - 10) top = rect.top - tooltipHeight - 8;

            setTooltipPosition({ top, left });
        }
    }, [isVisible, position]);

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);
    const handleClick = (e) => {
        e.stopPropagation();
        setIsVisible(!isVisible);
    };

    return (
        <div className={`relative inline-flex ${className}`}>
            {/* Info Button */}
            <button
                ref={buttonRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onFocus={handleMouseEnter}
                onBlur={handleMouseLeave}
                onClick={handleClick}
                className="p-1.5 rounded-full text-slate-400 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                aria-label="More information"
                type="button"
            >
                <Info size={16} />
            </button>

            {/* Tooltip - Rendered as Portal to avoid overflow clipping */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isVisible && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                            style={{
                                position: 'fixed',
                                top: tooltipPosition.top,
                                left: tooltipPosition.left,
                                zIndex: 99999,
                                pointerEvents: 'none',
                            }}
                            role="tooltip"
                        >
                            <div className="px-4 py-3 text-sm text-white bg-slate-800 dark:bg-neutral-700 rounded-xl shadow-2xl max-w-[300px] leading-relaxed border border-slate-700 dark:border-neutral-600">
                                {content}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
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
