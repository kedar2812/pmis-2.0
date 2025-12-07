# To See Color Changes

The color changes have been applied in the code, but you need to:

1. **Stop the dev server** (if running) - Press `Ctrl+C` in the terminal

2. **Clear the build cache:**
   ```bash
   rm -rf dist
   rm -rf node_modules/.vite
   ```
   Or on Windows PowerShell:
   ```powershell
   Remove-Item -Recurse -Force dist
   Remove-Item -Recurse -Force node_modules\.vite
   ```

3. **Restart the dev server:**
   ```bash
   npm run dev
   ```

4. **Hard refresh your browser:**
   - Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

5. **If still not working, clear browser cache:**
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

The colors have been changed from purple (#7c3aed) to dark blue (#2563eb) throughout the application.

