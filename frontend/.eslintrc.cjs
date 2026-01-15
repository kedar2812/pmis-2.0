module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react-hooks/recommended',
    'plugin:tailwindcss/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react-refresh', 'tailwindcss'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Enforce class order for consistency
    'tailwindcss/classnames-order': 'warn',
    // Warn on arbitrary values to encourage semantic tokens
    'tailwindcss/no-arbitrary-value': 'warn',
    // Ensure all classes are valid/exist in theme
    'tailwindcss/no-custom-classname': 'warn',
  },
  settings: {
    tailwindcss: {
      // These are the utility classes we generated in index.css or tailwind.config.js
      whitelist: ['bg-app-bg', 'text-app-heading', 'border-app'],
    },
  },
}


