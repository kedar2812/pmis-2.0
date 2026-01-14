# IFSC Database Management Guide

## For Customers/Administrators

This guide explains how to manage and update the IFSC database in your PMIS system.

## Overview

The PMIS system uses a self-hosted IFSC database with **1,346+ bank branches** from all major Indian banks. The data is stored securely on your server with no dependency on external APIs.

---

## Viewing IFSC Data

### Via Django Admin

1. **Login to Admin Panel:**  
   `https://your-pmis-url.com/admin`

2. **Navigate to:**  
   `Banks` → `Bank Branches (IFSC)`

3. **Features:**
   - Search by IFSC code, bank name, branch name, city
   - Filter by bank, state, payment systems (RTGS, NEFT, UPI)
   - View/edit individual branch details
   - Bulk actions (activate/deactivate branches)

---

## Updating IFSC Data

### When to Update

- Quarterly (recommended)
- When new banks/branches are announced
- When branches close or merge

### How to Update

#### Method 1: Download Latest Data (Recommended)

1. **Download latest IFSC data:**
   ```bash
   # On your server
   cd /path/to/backend
   git clone --depth 1 https://github.com/razorpay/ifsc.git temp_ifsc_data
   ```

2. **Import data:**
   ```bash
   python manage.py import_ifsc_data --clear
   ```

3. **Verify:**
   ```bash
   # Check import summary in output
   # Should show: Total imported, Unique banks
   ```

#### Method 2: Manual Updates via Admin

1. Go to Admin Panel → Bank Branches
2. Click "Add Bank Branch" or edit existing
3. Fill in all required fields
4. Save

---

## Management Commands

### Import IFSC Data

```bash
# Import from custom directory
python manage.py import_ifsc_data --data-dir /path/to/ifsc/data

# Clear existing data and import fresh
python manage.py import_ifsc_data --clear
```

### Check Database Stats

Access via API (admin only):
```
GET /api/banks/stats/
```

Returns:
- Total branches
- Active/inactive counts
- Total banks
- UPI-enabled branches
- Last update timestamp

---

## Troubleshooting

### Import Fails

**Problem:** Unicode error during import  
**Solution:** File already handles Windows encoding issues

**Problem:** Missing files  
**Solution:** Ensure `banks.json` and `banknames.json` exist in data directory

### IFSC Not Found

**Problem:** Valid IFSC returns "not found"  
**Solution:**  
1. Check if branch is marked inactive in admin
2. Update IFSC database
3. Verify IFSC code format

### Slow Performance

**Problem:** Bank dropdown loads slowly  
**Solution:**  
- Data is cached for 24 hours automatically
- Check database indexes are in place
- Consider reducing inactive branches

---

## Security Best Practices

✅ **Data Privacy:**  
- All IFSC data stored locally
- No external API calls
- Complete data sovereignty

✅ **Access Control:**  
- Only authenticated admins can view statistics
- Public endpoints (list, lookup) use caching

✅ **Regular Updates:**  
- Keep data current with quarterly updates
- Monitor for closed branches

---

## Support

For technical assistance with IFSC database management, contact your system administrator or refer to the PMIS technical documentation.

**Database Location:** PostgreSQL → `banks_ifsc` table  
**Admin Interface:** `/admin/banks/bankbranch/`  
**API Endpoints:**  
- `/api/banks/list/` - Get bank names
- `/api/banks/ifsc/{code}/` - Lookup IFSC
- `/api/banks/stats/` - Get statistics (admin only)
