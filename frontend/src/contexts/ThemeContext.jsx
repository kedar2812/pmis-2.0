/**
 * ThemeContext - Production-Grade Dark Mode Management
 * 
 * Features:
 * - Three modes: light, dark, system (follows OS preference)
 * - Persistent storage via localStorage
 * - Automatic OS preference detection and syncing
 * - No FOUC (Flash of Unstyled Content)
 * - Type-safe with JSDoc
 * 
 * Usage:
 * ```jsx
 * import { useTheme } from '@/contexts/ThemeContext';
 * 
 * const { theme, setTheme, effectiveTheme } = useTheme();
 * // theme: 'light' | 'dark' | 'system'
 * // effectiveTheme: 'light' | 'dark' (resolved from system)
 * ```
 */

import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * @typedef {'light' | 'dark' | 'system'} ThemeMode
 * @typedef {'light' | 'dark'} EffectiveTheme
 */

/**
 * @typedef {Object} ThemeContextValue
 * @property {ThemeMode} theme - Current theme mode
 * @property {(theme: ThemeMode) => void} setTheme - Function to change theme
 * @property {EffectiveTheme} effectiveTheme - Actual theme being applied (resolved from system if needed)
 * @property {boolean} isSystemDarkMode - Whether OS prefers dark mode
 */

const ThemeContext = createContext(/** @type {ThemeContextValue | undefined} */(undefined));

const STORAGE_KEY = 'app-theme';
const VALID_THEMES = ['light', 'dark', 'system'];

/**
 * Get initial theme from localStorage or default to 'system'
 * @returns {ThemeMode}
 */
function getInitialTheme() {
    if (typeof window === 'undefined') return 'system';

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && VALID_THEMES.includes(stored)) {
            return /** @type {ThemeMode} */ (stored);
        }
    } catch (error) {
        console.warn('Failed to read theme from localStorage:', error);
    }

    return 'system';
}

/**
 * Check if OS prefers dark mode
 * @returns {boolean}
 */
function getSystemDarkMode() {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Resolve effective theme (system -> light/dark)
 * @param {ThemeMode} theme 
 * @param {boolean} isSystemDark 
 * @returns {EffectiveTheme}
 */
function resolveEffectiveTheme(theme, isSystemDark) {
    if (theme === 'system') {
        return isSystemDark ? 'dark' : 'light';
    }
    return theme;
}

/**
 * Apply theme to DOM
 * @param {EffectiveTheme} effectiveTheme 
 */
function applyThemeToDOM(effectiveTheme) {
    const root = document.documentElement;

    if (effectiveTheme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
}

/**
 * Theme Provider Component
 * Manages dark mode state and syncs with OS preferences
 */
export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(getInitialTheme);
    const [isSystemDarkMode, setIsSystemDarkMode] = useState(getSystemDarkMode);

    // Calculate effective theme
    const effectiveTheme = resolveEffectiveTheme(theme, isSystemDarkMode);

    /**
     * Update theme and persist to storage
     * @param {ThemeMode} newTheme 
     */
    const setTheme = (newTheme) => {
        if (!VALID_THEMES.includes(newTheme)) {
            console.error(`Invalid theme: ${newTheme}. Must be one of: ${VALID_THEMES.join(', ')}`);
            return;
        }

        setThemeState(newTheme);

        try {
            localStorage.setItem(STORAGE_KEY, newTheme);
        } catch (error) {
            console.warn('Failed to save theme to localStorage:', error);
        }
    };

    // Apply theme to DOM whenever effectiveTheme changes
    useEffect(() => {
        applyThemeToDOM(effectiveTheme);
    }, [effectiveTheme]);

    // Listen for OS theme changes - INSTANT DOM MANIPULATION
    useEffect(() => {
        // Only listen when user has selected "System" mode
        if (theme !== 'system') return;
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        /**
         * Handler for OS theme change - DIRECTLY manipulates DOM for instant update
         * @param {MediaQueryListEvent} e 
         */
        const handleChange = (e) => {
            const newEffectiveTheme = e.matches ? 'dark' : 'light';

            // Update state for React components
            setIsSystemDarkMode(e.matches);

            // CRITICAL: Directly toggle .dark class on <html> for INSTANT visual update
            // No waiting for React re-render - CSS engine handles it immediately!
            if (newEffectiveTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        // Also set initial state when switching to system mode
        const currentlyDark = mediaQuery.matches;
        setIsSystemDarkMode(currentlyDark);
        applyThemeToDOM(currentlyDark ? 'dark' : 'light');

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
        // Legacy browsers
        else if (mediaQuery.addListener) {
            mediaQuery.addListener(handleChange);
            return () => mediaQuery.removeListener(handleChange);
        }
    }, [theme]); // Re-run when theme mode changes

    const value = {
        theme,
        setTheme,
        effectiveTheme,
        isSystemDarkMode,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

ThemeProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

/**
 * Hook to access theme context
 * @returns {ThemeContextValue}
 * @throws {Error} If used outside ThemeProvider
 */
export function useTheme() {
    const context = useContext(ThemeContext);

    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }

    return context;
}

/**
 * Export for testing or direct access
 */
export { ThemeContext };
