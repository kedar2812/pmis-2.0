# Production Deployment Guide: Bank Dropdown Fix

## Problem
Bank dropdowns work perfectly in local development but show no options in production because the production database has no bank data.

## Root Cause
The `BankBranch` table in production is empty. The bank list API endpoint `/api/banks/list/` returns an empty array when there's no data, causing dropdowns to be empty.

## Solution for Production

Run this command on the production server to import the **same Razorpay IFSC data** that's working in development:

```bash
# SSH into production server
ssh user@production-server

# Navigate to backend directory
cd /path/to/pmis/backend

# Activate virtual environment (if using one)
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate     # Windows

# Download Razorpay IFSC data (same source as development)
git clone --depth 1 https://github.com/razorpay/ifsc.git temp_razorpay_ifsc

# Import data (~5-10 seconds)
python manage.py import_razorpay_ifsc --data-dir temp_razorpay_ifsc/src --clear

# Cleanup
rm -rf temp_razorpay_ifsc
```

**Expected Output:**
```
Clearing existing data...
Deleted 0 existing records
Importing IFSC data from Razorpay format...
Found 1511 banks in database
Imported 1000 branches...

Import completed successfully!
Total imported: 1346
Errors: 0
Total in database: 1346
Unique banks: 1338
```

## Verification Steps

1. **Check API Response:**
   ```bash
   curl http://your-production-url.com/api/banks/list/
   ```
   
   Should return:
   ```json
   {
     "count": 1338,
     "banks": ["AB Bank", "Abhyudaya Co-operative Bank Limited", ...]
   }
   ```

2. **Test in Browser:**
   - Navigate to contractor registration page
   - Go to Bank Details step (Step 4)
   - Verify bank dropdown shows 1,338 banks
   - Enter IFSC code and verify branch auto-fill works

## What Data Gets Imported

- **Total Branches:** 1,346
- **Total Banks:** 1,338
- **Data Source:** Razorpay IFSC (https://github.com/razorpay/ifsc)
- **Data Provider:** RBI (Reserve Bank of India) via Razorpay

This is the **exact same data** that's working in your development environment.

## Troubleshooting

### Problem: Command not found
**Solution:** Make sure you're in the backend directory and virtual environment is activated.

### Problem: Git clone fails
**Solution:** Check internet connectivity or try:
```bash
wget https://github.com/razorpay/ifsc/archive/refs/heads/master.zip
unzip master.zip
python manage.py import_razorpay_ifsc --data-dir ifsc-master/src --clear
```

### Problem: Banks still not showing after import
**Solution:**
1. Clear Django cache: Restart the Django application
2. Verify data: `python manage.py shell -c "from banks.models import BankBranch; print(BankBranch.objects.count())"`
3. Check API directly: `curl http://localhost:8000/api/banks/list/`

### Problem: Need to re-import data
**Solution:** Just run the import command again with `--clear` flag:
```bash
python manage.py import_razorpay_ifsc --data-dir temp_razorpay_ifsc/src --clear
```

## Files Changed

1. **backend/banks/views.py** - Added helpful error message when no bank data exists
2. **backend/banks/management/commands/import_razorpay_ifsc.py** - New command for Razorpay IFSC import
3. **backend/banks/DEPLOYMENT_GUIDE.md** - This guide

## Alternative: Sample Data for Testing

If you just need quick testing (not recommended for production), you can populated 30 sample branches:

```bash
python manage.py populate_sample_banks
```

This gives you 13 major banks instantly, but **for production use the full Razorpay data** as shown above.

