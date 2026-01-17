# PMIS 2.0 - Windows VM Server Deployment Guide

> **Last Updated:** January 2026  
> **Target OS:** Windows Server  
> **Stack:** Django (Backend) + React/Vite (Frontend) + PostgreSQL + IIS

---

## 📋 Quick Reference - Credentials

| Service | Username | Password |
|---------|----------|----------|
| VM Server (RDP) | `Administrator` | `Bl@ckp#@rl00` |
| PostgreSQL Superuser | `postgres` | `PostgresAdmin123!` |
| PostgreSQL App User | `pmis_user` | `PmisSecure@2026` |
| Django SECRET_KEY | - | `k8xP2mN9vQ4wR7tY1uZ3aB6cD0eF5gH8iJ2lM4nO7pS9qU1xW3yA6zC0dE5fG8hI` |

---

## ✅ Completed Steps (Reference Only)

The following have already been completed on the server:

<details>
<summary>Click to expand completed steps</summary>

### Part 1: Install Chocolatey Package Manager
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### Part 2: Install Required Software
```powershell
choco install git python nodejs-lts postgresql nssm -y
refreshenv
```

### Part 3: Clone Repository
```powershell
cd C:\
git clone https://github.com/kedar2812/pmis-2.0.git pmis
```

### Part 4: Database Setup
```powershell
# Start PostgreSQL service
net start postgresql-x64-16

# Connect to PostgreSQL
psql -U postgres -h localhost
```

```sql
-- Create database and user
CREATE DATABASE pmis_db;
CREATE USER pmis_user WITH PASSWORD 'PmisSecure@2024';
GRANT ALL PRIVILEGES ON DATABASE pmis_db TO pmis_user;
ALTER DATABASE pmis_db OWNER TO pmis_user;

-- Required for Django migrations
\c pmis_db
GRANT ALL ON SCHEMA public TO pmis_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pmis_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO pmis_user;
\q
```

### Part 5: Backend Setup
```powershell
cd C:\pmis\backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (see configuration below)
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Import geography data
python manage.py import_geography_data
```

</details>

---

## 🚀 Remaining Steps 

### Part 6: Build Frontend for Production

1. **Open PowerShell as Administrator** and connect to the server:
   ```powershell
   # RDP into server or use remote PowerShell
   ```

2. **Navigate to frontend directory:**
   ```powershell
   cd C:\pmis\frontend
   ```

3. **Install Node.js dependencies:**
   ```powershell
   npm install
   ```

4. **Create production environment file:**
   ```powershell
   # Create .env.production file
   notepad .env.production
   ```
   
   Add the following content (adjust the API URL to your server's domain/IP):
   ```env
   VITE_API_URL=http://YOUR_SERVER_IP:8000/api
   ```
   
   > 💡 **Tip:** Replace `YOUR_SERVER_IP` with the actual server IP or domain name.

5. **Build production bundle:**
   ```powershell
   npm run build
   ```
   
   This creates a `dist` folder with optimized static files.

6. **Verify build output:**
   ```powershell
   dir dist
   ```
   
   You should see `index.html` and an `assets` folder.

---

### Part 7: Configure IIS (Internet Information Services)

#### 7.1 Install IIS

1. **Open Server Manager** → **Add Roles and Features**
2. Select **Web Server (IIS)**
3. Include these features:
   - Common HTTP Features → Static Content, Default Document
   - Performance → Static Content Compression
   - Security → Request Filtering
   - Application Development → ISAPI Extensions, ISAPI Filters

**Or via PowerShell:**
```powershell
Install-WindowsFeature -Name Web-Server -IncludeManagementTools
Install-WindowsFeature -Name Web-Static-Content
Install-WindowsFeature -Name Web-Default-Doc
Install-WindowsFeature -Name Web-Http-Errors
Install-WindowsFeature -Name Web-Http-Redirect
Install-WindowsFeature -Name Web-ISAPI-Ext
Install-WindowsFeature -Name Web-ISAPI-Filter
```

#### 7.2 Install URL Rewrite Module

```powershell
# Download and install URL Rewrite Module
choco install urlrewrite -y
```

#### 7.3 Configure IIS for React SPA

1. **Create website in IIS Manager:**
   - Open **IIS Manager** (`inetmgr`)
   - Right-click **Sites** → **Add Website**
   - Settings:
     - **Site name:** `PMIS-Frontend`
     - **Physical path:** `C:\pmis\frontend\dist`
     - **Port:** `80` (or `443` for HTTPS)
     - **Host name:** Your domain (optional)

2. **Create web.config for SPA routing:**
   
   Create `C:\pmis\frontend\dist\web.config`:
   ```powershell
   notepad C:\pmis\frontend\dist\web.config
   ```
   
   Add this content:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <configuration>
     <system.webServer>
       <rewrite>
         <rules>
           <!-- API Proxy to Django Backend -->
           <rule name="API Proxy" stopProcessing="true">
             <match url="^api/(.*)" />
             <action type="Rewrite" url="http://localhost:8000/api/{R:1}" />
           </rule>
           
           <!-- Handle React Router (SPA) -->
           <rule name="React Routes" stopProcessing="true">
             <match url=".*" />
             <conditions logicalGrouping="MatchAll">
               <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
               <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
             </conditions>
             <action type="Rewrite" url="/index.html" />
           </rule>
         </rules>
       </rewrite>
       
       <!-- Security Headers -->
       <httpProtocol>
         <customHeaders>
           <add name="X-Content-Type-Options" value="nosniff" />
           <add name="X-Frame-Options" value="SAMEORIGIN" />
           <add name="X-XSS-Protection" value="1; mode=block" />
         </customHeaders>
       </httpProtocol>
       
       <!-- MIME Types for Modern Web -->
       <staticContent>
         <remove fileExtension=".woff" />
         <remove fileExtension=".woff2" />
         <mimeMap fileExtension=".woff" mimeType="font/woff" />
         <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
       </staticContent>
       
       <!-- Enable Compression -->
       <urlCompression doStaticCompression="true" doDynamicCompression="true" />
     </system.webServer>
   </configuration>
   ```

3. **Install Application Request Routing (ARR) for API Proxy:**
   ```powershell
   choco install iis-arr -y
   
   # Enable proxy in IIS
   # Open IIS Manager → Server Node → Application Request Routing Cache
   # Click "Server Proxy Settings" → Check "Enable proxy"
   ```

4. **Set folder permissions:**
   ```powershell
   icacls "C:\pmis\frontend\dist" /grant "IIS_IUSRS:(OI)(CI)R"
   icacls "C:\pmis\frontend\dist" /grant "IUSR:(OI)(CI)R"
   ```

5. **Test IIS configuration:**
   ```powershell
   # Restart IIS
   iisreset
   
   # Test locally
   Start-Process "http://localhost"
   ```

---

### Part 8: Create Backend Windows Service

We'll use **NSSM (Non-Sucking Service Manager)** to run Django as a Windows service.

#### 8.1 Create Backend Startup Script

Create `C:\pmis\backend\start_server.bat`:
```powershell
notepad C:\pmis\backend\start_server.bat
```

Add this content:
```batch
@echo off
cd /d C:\pmis\backend
call venv\Scripts\activate.bat
python manage.py runserver 0.0.0.0:8000
```

#### 8.2 Create Service Using NSSM

```powershell
# Install the service
nssm install PMIS-Backend "C:\pmis\backend\start_server.bat"

# Configure service settings
nssm set PMIS-Backend AppDirectory "C:\pmis\backend"
nssm set PMIS-Backend DisplayName "PMIS Backend API"
nssm set PMIS-Backend Description "Django REST API for PMIS application"
nssm set PMIS-Backend Start SERVICE_AUTO_START
nssm set PMIS-Backend AppStdout "C:\pmis\logs\backend_stdout.log"
nssm set PMIS-Backend AppStderr "C:\pmis\logs\backend_stderr.log"
nssm set PMIS-Backend AppRotateFiles 1
nssm set PMIS-Backend AppRotateBytes 10485760

# Create logs directory
mkdir C:\pmis\logs

# Start the service
nssm start PMIS-Backend
```

#### 8.3 Verify Service is Running

```powershell
# Check service status
nssm status PMIS-Backend

# Or use Windows services
Get-Service PMIS-Backend

# Test API endpoint
Invoke-WebRequest -Uri http://localhost:8000/api/banks/list/ -Method GET
```

#### 8.4 Service Management Commands

```powershell
# Stop service
nssm stop PMIS-Backend

# Restart service
nssm restart PMIS-Backend

# Remove service (if needed)
nssm remove PMIS-Backend confirm

# View logs
Get-Content C:\pmis\logs\backend_stdout.log -Tail 50
Get-Content C:\pmis\logs\backend_stderr.log -Tail 50
```

---

### Part 9: Configure Windows Firewall

Open the required ports for external access:

```powershell
# Allow HTTP (Port 80)
New-NetFirewallRule -DisplayName "PMIS HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Allow HTTPS (Port 443) - for future SSL
New-NetFirewallRule -DisplayName "PMIS HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# Allow Django Backend (Port 8000) - only if needed for direct API access
# New-NetFirewallRule -DisplayName "PMIS Backend API" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow

# Allow PostgreSQL (Port 5432) - only if remote DB access needed
# New-NetFirewallRule -DisplayName "PostgreSQL" -Direction Inbound -Protocol TCP -LocalPort 5432 -Action Allow
```

Verify firewall rules:
```powershell
Get-NetFirewallRule -DisplayName "PMIS*" | Format-Table Name, DisplayName, Enabled
```

---

### Part 10: Import Bank Data (Optional but Recommended)

```powershell
cd C:\pmis\backend
.\venv\Scripts\activate

# Fast import (skips API verification, clears existing data)
python manage.py import_banks_fast --skip-api --clear

# Verify import
python manage.py shell -c "from banks.models import BankBranch; print(f'Banks imported: {BankBranch.objects.count()}')"
```

---

## 🔧 Backend Environment Configuration

Ensure `C:\pmis\backend\.env` contains:

```env
# Django Settings
SECRET_KEY=k8xP2mN9vQ4wR7tY1uZ3aB6cD0eF5gH8iJ2lM4nO7pS9qU1xW3yA6zC0dE5fG8hI
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,YOUR_SERVER_IP,YOUR_DOMAIN.COM

# Database
DB_NAME=pmis_db
DB_USER=pmis_user
DB_PASSWORD=PmisSecure@2024
DB_HOST=localhost
DB_PORT=5432

# CORS - Add your frontend URLs
CORS_ALLOWED_ORIGINS=http://localhost,http://YOUR_SERVER_IP,https://YOUR_DOMAIN.COM

# Frontend URL
FRONTEND_URL=http://YOUR_SERVER_IP
```

> ⚠️ **Important:** Replace `YOUR_SERVER_IP` and `YOUR_DOMAIN.COM` with actual values!

---

## 🔄 Git Pull & Update Procedure

When you need to update the code from GitHub:

```powershell
# 1. Stop the backend service
nssm stop PMIS-Backend

# 2. Pull latest code
cd C:\pmis
git pull origin main

# 3. Update backend dependencies (if changed)
cd C:\pmis\backend
.\venv\Scripts\activate
pip install -r requirements.txt

# 4. Run migrations (if any)
python manage.py migrate

# 5. Collect static files
python manage.py collectstatic --noinput

# 6. Rebuild frontend (if changed)
cd C:\pmis\frontend
npm install
npm run build

# 7. Restart backend service
nssm start PMIS-Backend

# 8. Restart IIS
iisreset
```

---

## 🩺 Troubleshooting

### Backend won't start

```powershell
# Check logs
Get-Content C:\pmis\logs\backend_stderr.log -Tail 100

# Test manually
cd C:\pmis\backend
.\venv\Scripts\activate
python manage.py runserver 0.0.0.0:8000
```

### Database connection fails

```powershell
# Check PostgreSQL service
Get-Service postgresql*

# Start if stopped
net start postgresql-x64-17

# Test connection
psql -U pmis_user -d pmis_db -h localhost
```

### Frontend shows blank page

1. Check browser console for errors (F12)
2. Verify `dist/index.html` exists
3. Check IIS site is running:
   ```powershell
   Get-IISSite -Name "PMIS-Frontend"
   ```

### API requests failing

1. Check backend service is running:
   ```powershell
   nssm status PMIS-Backend
   ```
2. Test API directly:
   ```powershell
   Invoke-WebRequest http://localhost:8000/api/banks/list/
   ```
3. Check CORS settings in `.env`

### Port already in use

```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill process by PID
taskkill /PID <PID> /F
```

---

## 🔐 Security Recommendations

1. **Enable HTTPS:**
   - Obtain SSL certificate (Let's Encrypt or commercial)
   - Configure HTTPS binding in IIS
   - Redirect HTTP to HTTPS

2. **Restrict database access:**
   - Don't expose PostgreSQL port externally
   - Use strong passwords (already done ✅)

3. **Keep software updated:**
   ```powershell
   choco upgrade all -y
   ```

4. **Regular backups:**
   ```powershell
   # Backup database
   pg_dump -U pmis_user -d pmis_db -F c -f C:\backups\pmis_db_backup.dump
   ```

5. **Monitor logs:**
   - Check `C:\pmis\logs\` regularly
   - Configure Windows Event Viewer alerts

---

## 📞 Quick Commands Reference

| Action | Command |
|--------|---------|
| Start Backend | `nssm start PMIS-Backend` |
| Stop Backend | `nssm stop PMIS-Backend` |
| Restart Backend | `nssm restart PMIS-Backend` |
| Restart IIS | `iisreset` |
| View Backend Logs | `Get-Content C:\pmis\logs\backend_stdout.log -Tail 50` |
| PostgreSQL Shell | `psql -U pmis_user -d pmis_db -h localhost` |
| Activate venv | `C:\pmis\backend\venv\Scripts\activate` |
| Build Frontend | `cd C:\pmis\frontend; npm run build` |

---

## ✅ Deployment Checklist

- [ ] Frontend dependencies installed (`npm install`)
- [ ] Frontend built for production (`npm run build`)
- [ ] IIS installed and configured
- [ ] URL Rewrite module installed
- [ ] `web.config` created in `dist` folder
- [ ] Backend Windows service created
- [ ] Backend service set to auto-start
- [ ] Firewall rules configured
- [ ] Bank data imported (optional)
- [ ] `.env` file configured with production values
- [ ] Test frontend loads in browser
- [ ] Test API endpoints work
- [ ] Test login functionality

---

**🎉 Once all steps are complete, your PMIS application will be live!**

Access at: `http://YOUR_SERVER_IP` or `http://YOUR_DOMAIN.COM`
