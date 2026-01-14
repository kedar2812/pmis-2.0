/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ===== SEMANTIC DESIGN TOKENS =====
        // Auto-switch between light/dark modes
        // Usage: bg-app-bg, text-app-heading, border-app, etc.

        app: {
          // Backgrounds
          bg: 'rgb(var(--bg-primary) / <alpha-value>)',
          'bg-secondary': 'rgb(var(--bg-secondary) / <alpha-value>)',
          surface: 'rgb(var(--bg-surface) / <alpha-value>)',
          card: 'rgb(var(--bg-card) / <alpha-value>)',
          hover: 'rgb(var(--bg-hover) / <alpha-value>)',
          active: 'rgb(var(--bg-active) / <alpha-value>)',

          // Text
          heading: 'rgb(var(--text-primary) / <alpha-value>)',
          text: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
          inverse: 'rgb(var(--text-inverse) / <alpha-value>)',

          // Borders
          border: 'rgb(var(--border-default) / <alpha-value>)',
          'border-subtle': 'rgb(var(--border-muted) / <alpha-value>)',
          'border-focus': 'rgb(var(--border-focus) / <alpha-value>)',

          // Brand/Accent
          accent: 'rgb(var(--accent-primary) / <alpha-value>)',
          'accent-hover': 'rgb(var(--accent-primary-hover) / <alpha-value>)',
        },

        // ===== LEGACY COLOR PALETTE =====
        // Keep existing colors for backward compatibility
        // These will be gradually migrated to semantic tokens
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2546eb', // Blue-600 (main)
          700: '#1d4ed8', // Dark blue-700
          800: '#1e40af', // Dark blue-800
          900: '#1e3a8a', // Dark blue-900
          950: '#172554', // Very dark blue
        },
        secondary: {
          DEFAULT: '#14b8a6', // Teal-500
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
        },
        accent: {
          DEFAULT: '#f97316', // Coral-500 (keeping for compatibility)
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Coral-500
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        background: {
          DEFAULT: '#f8fafc', // Slate-50
        },
        // Semantic colors for consistent usage
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'blue-glow': '0 4px 14px 0 rgba(37, 70, 235, 0.2)',
        'indigo-glow': '0 4px 14px 0 rgba(37, 70, 235, 0.2)', // Keep for compatibility
        'teal-glow': '0 4px 14px 0 rgba(20, 184, 166, 0.2)',
        'coral-glow': '0 4px 14px 0 rgba(249, 115, 22, 0.2)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}

