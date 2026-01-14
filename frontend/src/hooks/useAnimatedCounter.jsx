import { useState, useEffect, useRef } from 'react';

/**
 * useAnimatedCounter Hook
 * Animates a number from start to end value
 * @param {number} end - Target value
 * @param {number} duration - Animation duration in ms
 * @param {boolean} trigger - When true, starts animation
 */
export const useAnimatedCounter = (end, duration = 1500, trigger = true) => {
    const [count, setCount] = useState(0);
    const countRef = useRef(0);
    const startTimeRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        if (!trigger || end === 0) {
            setCount(end);
            return;
        }

        const startValue = countRef.current;
        const difference = end - startValue;

        const animate = (timestamp) => {
            if (!startTimeRef.current) {
                startTimeRef.current = timestamp;
            }

            const elapsed = timestamp - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);

            const currentValue = startValue + difference * easeOut;
            countRef.current = currentValue;
            setCount(Math.round(currentValue));

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        startTimeRef.current = null;
        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [end, duration, trigger]);

    return count;
};

/**
 * AnimatedNumber Component
 * Displays a number with count-up animation
 */
export const AnimatedNumber = ({
    value,
    duration = 1500,
    prefix = '',
    suffix = '',
    className = '',
    decimals = 0
}) => {
    const [displayed, setDisplayed] = useState(0);
    const previousValue = useRef(0);

    useEffect(() => {
        const startValue = previousValue.current;
        const endValue = Number(value) || 0;
        const difference = endValue - startValue;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = startValue + difference * easeOut;

            setDisplayed(decimals > 0 ? current.toFixed(decimals) : Math.round(current));

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                previousValue.current = endValue;
            }
        };

        requestAnimationFrame(animate);
    }, [value, duration, decimals]);

    return (
        <span className={className}>
            {prefix}{displayed}{suffix}
        </span>
    );
};

export default AnimatedNumber;
