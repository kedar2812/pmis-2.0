import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for keyboard navigation in search results
 * Handles arrow keys, enter, escape, etc.
 * 
 * @param {Array} items - Array of items to navigate
 * @param {Function} onSelect - Callback when item is selected (Enter key)
 * @param {Function} onClose - Callback to close dropdown (Escape key)
 * @param {boolean} isOpen - Whether dropdown is open
 * @returns {Object} Navigation state and utilities
 */
export const useKeyboardNavigation = (items = [], onSelect, onClose, isOpen = false) => {
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [hoveredIndex, setHoveredIndex] = useState(-1);
    const listRef = useRef(null);

    // Reset selection when items change or dropdown closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedIndex(-1);
            setHoveredIndex(-1);
        }
    }, [isOpen, items.length]);

    // Scroll selected item into view
    useEffect(() => {
        if (selectedIndex >= 0 && listRef.current) {
            const selectedElement = listRef.current.children[selectedIndex];
            if (selectedElement) {
                selectedElement.scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth',
                });
            }
        }
    }, [selectedIndex]);

    // Keyboard event handler
    const handleKeyDown = useCallback((event) => {
        if (!isOpen || items.length === 0) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setSelectedIndex(prev =>
                    prev < items.length - 1 ? prev + 1 : 0
                );
                break;

            case 'ArrowUp':
                event.preventDefault();
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : items.length - 1
                );
                break;

            case 'Enter':
                event.preventDefault();
                const indexToSelect = hoveredIndex >= 0 ? hoveredIndex : selectedIndex;
                if (indexToSelect >= 0 && indexToSelect < items.length) {
                    onSelect(items[indexToSelect]);
                }
                break;

            case 'Escape':
                event.preventDefault();
                onClose();
                break;

            case 'Tab':
                // Allow tab to work normally but close dropdown
                onClose();
                break;

            default:
                break;
        }
    }, [items, selectedIndex, hoveredIndex, isOpen, onSelect, onClose]);

    // Attach/detach keyboard listener
    useEffect(() => {
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, handleKeyDown]);

    return {
        selectedIndex,
        setSelectedIndex,
        hoveredIndex,
        setHoveredIndex,
        listRef,
        handleKeyDown,
    };
};

/**
 * Custom hook for Cmd+K / Ctrl+K keyboard shortcut
 * 
 * @param {Function} onTrigger - Callback when shortcut is pressed
 * @param {boolean} enabled - Whether shortcut is enabled
 */
export const useCommandPalette = (onTrigger, enabled = true) => {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (event) => {
            // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                onTrigger();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onTrigger, enabled]);
};
