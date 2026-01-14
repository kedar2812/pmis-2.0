---
description: How to sync code between GitHub and GitLab repositories
---

# Sync GitHub and GitLab Repositories

## Current Setup

Your repository currently has these remotes:
- **origin**: https://github.com/kedar2812/pmis-2.0.git (main GitHub repo)
- **old-origin**: https://github.com/kedar2812/pmis-zia.git (old GitHub repo)

## Step 1: Add GitLab Remote

Replace `<GITLAB_URL>` with your actual GitLab repository URL:

```bash
git remote add gitlab <GITLAB_URL>
```

Example:
```bash
git remote add gitlab https://gitlab.com/kedar2812/pmis-2.0.git
```

Or if using SSH:
```bash
git remote add gitlab git@gitlab.com:kedar2812/pmis-2.0.git
```

## Step 2: Verify Remotes

Check that all remotes are configured:

```bash
git remote -v
```

You should see:
- origin (GitHub)
- gitlab (GitLab)
- old-origin (old GitHub)

## Step 3: Push to GitLab

First time push to GitLab (creates all branches):

```bash
# Push main branch
git push gitlab main

# Push dev branch
git push gitlab dev

# Push all branches
git push gitlab --all

# Push all tags
git push gitlab --tags
```

## Step 4: Regular Workflow

### Option A: Push to Both Manually

After committing changes:

```bash
# Push to GitHub
git push origin main

# Push to GitLab
git push gitlab main
```

### Option B: Push to Both Automatically

Set up a special remote that pushes to both:

```bash
# Add both URLs to origin
git remote set-url --add --push origin https://github.com/kedar2812/pmis-2.0.git
git remote set-url --add --push origin <GITLAB_URL>
```

Then just use:
```bash
git push origin main
```

This will push to both GitHub and GitLab!

### Option C: Create an Alias

Add this to your Git config for easy dual push:

```bash
git config --global alias.pushall '!git push origin main && git push gitlab main'
```

Then use:
```bash
git pushall
```

## Step 5: Pulling Changes

If you make changes on GitLab, pull from there:

```bash
git pull gitlab main
```

If you make changes on GitHub:
```bash
git pull origin main
```

## Common Commands

| Task | Command |
|------|---------|
| View remotes | `git remote -v` |
| Remove a remote | `git remote remove <name>` |
| Rename a remote | `git remote rename <old> <new>` |
| Change remote URL | `git remote set-url <name> <new-url>` |
| Push to specific remote | `git push <remote-name> <branch>` |
| Pull from specific remote | `git pull <remote-name> <branch>` |

## Troubleshooting

**Problem**: Authentication failed
**Solution**: Use a Personal Access Token (PAT) for GitLab:
1. Go to GitLab → Settings → Access Tokens
2. Create token with `write_repository` scope
3. Use in URL: `https://oauth2:<TOKEN>@gitlab.com/username/repo.git`

**Problem**: Push rejected
**Solution**: Pull first, then push:
```bash
git pull gitlab main --rebase
git push gitlab main
```

## Best Practices

1. ✅ Always commit to main branch first on GitHub
2. ✅ Then push to both remotes
3. ✅ Keep both repositories in sync
4. ✅ Use `git status` to check your current state
5. ⚠️ Be careful with force pushes (`git push -f`)
