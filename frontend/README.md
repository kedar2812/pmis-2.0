# PMIS Zia Frontend

## Theme System
The application uses a robust semantic theming system powered by Tailwind CSS variables and detailed in `tailwind.config.js`.

### Semantic Tokens
We use semantic class names rather than raw colors to ensure consistent dark mode support and theming capabilities.
- **Backgrounds**: `bg-app-bg`, `bg-app-surface`, `bg-app-card`
- **Text**: `text-app-heading`, `text-app-text`, `text-app-muted`
- **Borders**: `border-app`, `border-app-subtle`

**Do not use** hardcoded colors like `bg-slate-900` or `text-gray-500` for main UI elements. Use the `app-*` tokens which automatically switch in dark mode.

### Dark Mode
Dark mode is fully implemented and supported across all application modules.
- The `ThemeContext` handles system preference syncing.
- Toggle between Light, Dark, and System modes using the global theme switcher.

## Development

### Linting & Code Quality
We use ESLint with `eslint-plugin-tailwindcss` to enforce class sorting and best practices.

To run linter:
```bash
npm run lint
```

The configuration is in `.eslintrc.cjs` and enforces:
- Proper class ordering
- No arbitrary values (e.g. `w-[123px]`) where standard tokens apply
- Usage of valid Tailwind classes
