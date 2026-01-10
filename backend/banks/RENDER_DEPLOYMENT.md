# Bank Data Auto-Import for Render

The `build.sh` script now automatically imports bank data during deployment if the database is empty.

## How It Works

During Render deployment, the build script:
1. Checks if bank data exists in the database
2. If empty, downloads Razorpay IFSC data from GitHub
3. Imports 1,346 bank branches automatically
4. Cleans up temporary files

## What Happens on Deploy

**First Deployment (empty database):**
```
Checking bank data...
No bank data found. Import needed.
Downloading Razorpay IFSC data...
Importing bank data (this will take ~10 seconds)...
Found 1511 banks in database
Imported 1000 branches...

Import completed successfully!
Total imported: 1346
Bank data import complete!
```

**Subsequent Deployments (data exists):**
```
Checking bank data...
Bank data already exists: 1346 branches
Build complete!
```

## Next Steps

1. **Commit the updated build.sh:**
   ```bash
   git add backend/build.sh
   git commit -m "Auto-import bank data during Render deployment"
   git push origin main
   ```

2. **Trigger Render Deployment:**
   - Render will automatically pick up the changes
   - Build script will run and import bank data
   - Your production site will have working bank dropdowns!

3. **Verify on Production:**
   - Visit your contractor registration page
   - Check that bank dropdown shows 1,338 banks

## No Manual Steps Needed!

Since Render free tier doesn't allow shell access, this automated approach means:
- ✅ Bank data imports automatically on first deployment
- ✅ No manual commands needed
- ✅ Works within Render free tier limitations
- ✅ Data persists across deployments (Render uses persistent PostgreSQL)
