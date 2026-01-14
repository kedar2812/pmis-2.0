---
description: How to sync backend code to the API-only GitLab repository
---

# Sync Backend to API Repository

The `backend/` folder is synced to a separate GitLab repository for API-only deployment.

## Repository Setup

- **Main Repo (Full)**: https://github.com/kedar2812/pmis-2.0.git
- **GitLab Full**: https://gitlab.com/Arthainfosystems/pmis_webapp.git
- **GitLab API Only**: https://gitlab.com/Arthainfosystems/pmis_api.git

## How It Works

The `backend/` folder is pushed to the API repo using **git subtree**. This keeps only the Django/backend code in that repository.

## Syncing Backend to API Repo

After making changes to backend code and committing:

```bash
# Push backend folder only to API repo
git subtree push --prefix=backend gitlab-api main
```

Or push to dev branch:

```bash
git subtree push --prefix=backend gitlab-api dev
```

## Full Workflow

### 1. Make Backend Changes
```bash
cd backend
# ... make your changes ...
```

### 2. Commit Changes
```bash
git add -A
git commit -m "Your commit message"
```

### 3. Push to All Repositories
```bash
# Push full code to GitHub
git push origin main

# Push full code to GitLab
git push gitlab main

# Push ONLY backend to API repo
git subtree push --prefix=backend gitlab-api main
```

## Automatic Sync Script

To make this easier, you can create a script. Save as `push-all.sh`:

```bash
#!/bin/bash
# Push to all repositories

echo "Pushing to GitHub..."
git push origin main

echo "Pushing to GitLab (full)..."
git push gitlab main

echo "Pushing backend to API repo..."
git subtree push --prefix=backend gitlab-api main

echo "✅ All repositories synced!"
```

Make it executable:
```bash
chmod +x push-all.sh
```

Then just run:
```bash
./push-all.sh
```

## Troubleshooting

**Error: "Updates were rejected"**
Solution: Pull first, then push:
```bash
git subtree pull --prefix=backend gitlab-api main
git subtree push --prefix=backend gitlab-api main
```

**Error: "Working tree has modifications"**
Solution: Commit or stash your changes first:
```bash
git stash
git subtree push --prefix=backend gitlab-api main
git stash pop
```

## Remote List

Check all your remotes:
```bash
git remote -v
```

Should show:
- `origin` → GitHub
- `gitlab` → GitLab (full)
- `gitlab-api` → GitLab (API only)
