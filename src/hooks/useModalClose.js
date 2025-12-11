import { useEffect } from 'react';

/**
 * Hook to handle modal closing interactions.
 * - Closes on 'Escape' key press.
 * - Does NOT close on backdrop click (by design decision).
 * 
 * @param {boolean} isOpen - Whether the modal is currently open.
 * @param {function} onClose - Function to call when closing is triggered.
 * @param {boolean} [blockEscape=false] - Optional flag to block Escape key closing (e.g., if a sub-modal is open).
 */
export const useModalClose = (isOpen, onClose, blockEscape = false) => {
    useEffect(() => {
        const handleEscape = (e) => {
            // Only trigger if open, Escape is pressed, and not blocked
            if (isOpen && e.key === 'Escape' && !blockEscape) {
                e.preventDefault();
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }

        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose, blockEscape]);
};
