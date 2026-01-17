# PMIS 2.0 - Complete Deployment Plan for Atraya VM Server

> **Server:** Atraya VM  
> **Public IP:** `45.118.163.111`  
> **OS:** Windows Server  
> **Last Updated:** January 2026

---

## 📋 Server & Credentials Reference

| Service | Value |
|---------|-------|
| **Server Public IP** | `45.118.163.111` |
| **RDP Username** | `Administrator` |
| **RDP Password** | `Bl@ckp#@rl00` |
| **PostgreSQL Superuser** | `postgres` / `PostgresAdmin123!` |
| **PostgreSQL App User** | `pmis_user` / `PmisSecure@2024` |
| **Django SECRET_KEY** | `k8xP2mN9vQ4wR7tY1uZ3aB6cD0eF5gH8iJ2lM4nO7pS9qU1xW3yA6zC0dE5fG8hI` |
| **Application URL** | `http://45.118.163.111` |
| **API URL** | `http://45.118.163.111/api` |

---

## 🎯 Deployment Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                  │
│                           │                                      │
│                    ┌──────▼──────┐                              │
│                    │   Port 80    │                              │
│                    │   (HTTP)     │                              │
│                    └──────┬──────┘                              │
│                           │                                      │
│    ┌──────────────────────▼──────────────────────┐              │
│    │                    IIS                       │              │
│    │         (Internet Information Services)      │              │
│    │                                              │              │
│    │   /api/* ─────► Reverse Proxy ──► :8000     │              │
│    │   /*     ─────► Static Files (React SPA)    │              │
│    └──────────────────────┬──────────────────────┘              │
│                           │                                      │
│              ┌────────────▼────────────┐                        │
│              │    Django Backend       │                        │
│              │    (Port 8000)          │                        │
│              │    Windows Service      │                        │
│              └────────────┬────────────┘                        │
│                           │                                      │
│              ┌────────────▼────────────┐                        │
│              │     PostgreSQL          │                        │
│              │     (Port 5432)         │                        │
│              └─────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Part 1: Connect to Server

### 1.1 Remote Desktop Connection

1. Open **Remote Desktop Connection** (Win+R → `mstsc`)
2. Enter connection details:
   ```
   Computer: 45.118.163.111
   Username: Administrator
   Password: Bl@ckp#@rl00
   ```
3. Click **Connect**

### 1.2 Open PowerShell as Administrator

Once connected:
1. Right-click **Start Menu**
2. Select **Windows PowerShell (Admin)** or **Terminal (Admin)**

---

## 📦 Part 2: Install Chocolatey Package Manager

```powershell
# Set execution policy and install Chocolatey
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Verify installation
choco --version
```

**Expected output:** `2.x.x` (version number)

---

## 📦 Part 3: Install Required Software

```powershell
# Install all required packages
choco install git python nodejs-lts postgresql17 nssm -y

# Refresh environment variables
refreshenv

# Verify installations
git --version
python --version
node --version
npm --version
psql --version
```

**Expected output:**
```
git version 2.x.x
Python 3.1x.x
v20.x.x (or newer LTS)
10.x.x
psql (PostgreSQL) 17.x
```

---

## 📦 Part 4: Clone Repository

```powershell
# Navigate to C:\ drive
cd C:\

# Clone the repository
git clone https://github.com/kedar2812/pmis-2.0.git pmis

# Verify
dir C:\pmis
```

**Expected:** You should see `backend`, `frontend`, `docs` folders and other files.

---

## 📦 Part 5: Configure PostgreSQL Database

### 5.1 Set PostgreSQL Password & Start Service

```powershell
# Find PostgreSQL installation
$pgPath = "C:\Program Files\PostgreSQL\17"

# Add PostgreSQL to PATH
$env:Path += ";$pgPath\bin"
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$pgPath\bin", [EnvironmentVariableTarget]::Machine)

# Start PostgreSQL service
net start postgresql-x64-17
```

### 5.2 Set Superuser Password

```powershell
# Connect as postgres user (will prompt for password)
# First time may need to set password via pgAdmin or:
psql -U postgres -h localhost -c "ALTER USER postgres PASSWORD 'PostgresAdmin123!';"
```

> **Note:** If this fails, open **pgAdmin** from Start Menu, right-click the server, and set the password there.

### 5.3 Create Database and User

```powershell
# Connect to PostgreSQL
psql -U postgres -h localhost
```

**Enter password:** `PostgresAdmin123!`

Then run these SQL commands:

```sql
-- Create database
CREATE DATABASE pmis_db;

-- Create application user
CREATE USER pmis_user WITH PASSWORD 'PmisSecure@2024';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE pmis_db TO pmis_user;
ALTER DATABASE pmis_db OWNER TO pmis_user;

-- Connect to the new database
\c pmis_db

-- Grant schema permissions (required for Django)
GRANT ALL ON SCHEMA public TO pmis_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pmis_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO pmis_user;

-- Exit
\q
```

### 5.4 Verify Database Connection

```powershell
psql -U pmis_user -d pmis_db -h localhost -c "SELECT 'Database connection successful!' as status;"
```

**Enter password:** `PmisSecure@2024`

---

## 📦 Part 6: Setup Backend (Django)

### 6.1 Create Virtual Environment

```powershell
cd C:\pmis\backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Verify (prompt should show (venv))
```

### 6.2 Install Python Dependencies

```powershell
# Upgrade pip
python -m pip install --upgrade pip

# Install requirements
pip install -r requirements.txt
```

### 6.3 Create Environment Configuration

```powershell
notepad C:\pmis\backend\.env
```

**Paste the following content:**

```env
# Django Core Settings
SECRET_KEY=k8xP2mN9vQ4wR7tY1uZ3aB6cD0eF5gH8iJ2lM4nO7pS9qU1xW3yA6zC0dE5fG8hI
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,45.118.163.111

# Database Configuration
DB_NAME=pmis_db
DB_USER=pmis_user
DB_PASSWORD=PmisSecure@2024
DB_HOST=localhost
DB_PORT=5432

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost,http://127.0.0.1,http://45.118.163.111

# Frontend URL (for email links, etc.)
FRONTEND_URL=http://45.118.163.111

# Message Encryption (production key)
MESSAGE_ENCRYPTION_KEY=aT5xK9mN2vR7qY1uZ4bC8dE3fG6hI0jL
```

**Save and close Notepad.**

### 6.4 Run Database Migrations

```powershell
# Make sure venv is activated
cd C:\pmis\backend
.\venv\Scripts\activate

# Run migrations
python manage.py migrate
```

**Expected output:** Series of "Applying..." messages, ending with no errors.

### 6.5 Create Admin Superuser

```powershell
python manage.py createsuperuser
```

**Enter when prompted:**
- Username: `admin`
- Email: `admin@pmis.gov.in` (or your email)
- Password: (choose a strong password)

### 6.6 Import Geographic Data

```powershell
python manage.py import_geography_data
```

### 6.7 Import Bank Data

```powershell
# Clone Razorpay IFSC data
cd C:\pmis\backend
git clone --depth 1 https://github.com/razorpay/ifsc.git temp_razorpay_ifsc

# Import bank data
python manage.py import_razorpay_ifsc --data-dir temp_razorpay_ifsc\src --clear

# Cleanup
Remove-Item -Recurse -Force temp_razorpay_ifsc
```

**Expected output:**
```
Importing IFSC data from Razorpay format...
Found 1511 banks in database
Imported 1000 branches...
Import completed successfully!
Total imported: 1346
```

### 6.8 Collect Static Files

```powershell
python manage.py collectstatic --noinput
```

### 6.9 Test Backend Locally

```powershell
python manage.py runserver 0.0.0.0:8000
```

Open browser and visit: `http://localhost:8000/api/banks/list/`

**Expected:** JSON response with bank data.

Press `Ctrl+C` to stop the server.

---

## 📦 Part 7: Build Frontend (React/Vite)

### 7.1 Install Node Dependencies

```powershell
cd C:\pmis\frontend

# Install dependencies
npm install
```

### 7.2 Create Production Environment

```powershell
notepad C:\pmis\frontend\.env.production
```

**Paste:**

```env
VITE_API_URL=http://45.118.163.111/api
```

**Save and close.**

### 7.3 Build Production Bundle

```powershell
npm run build
```

**Expected output:**
```
vite v5.x.x building for production...
✓ xxx modules transformed.
dist/index.html                   x.xx kB
dist/assets/index-xxxxx.css       xxx.xx kB
dist/assets/index-xxxxx.js        xxx.xx kB
✓ built in x.xxs
```

### 7.4 Verify Build

```powershell
dir C:\pmis\frontend\dist
```

**Expected:** `index.html` file and `assets` folder.

---

## 📦 Part 8: Install & Configure IIS

### 8.1 Install IIS Feature

```powershell
# Install IIS with required features
Install-WindowsFeature -Name Web-Server -IncludeManagementTools
Install-WindowsFeature -Name Web-Static-Content
Install-WindowsFeature -Name Web-Default-Doc
Install-WindowsFeature -Name Web-Http-Errors
Install-WindowsFeature -Name Web-Http-Redirect
Install-WindowsFeature -Name Web-ISAPI-Ext
Install-WindowsFeature -Name Web-ISAPI-Filter
Install-WindowsFeature -Name Web-Filtering
```

### 8.2 Install URL Rewrite Module

```powershell
choco install urlrewrite -y
```

### 8.3 Install Application Request Routing (ARR)

```powershell
choco install iis-arr -y

# Restart IIS to load new modules
iisreset
```

### 8.4 Enable Proxy in IIS

```powershell
# Open IIS Manager
inetmgr
```

1. Click on **Server Name** (top level in left panel)
2. Double-click **Application Request Routing Cache**
3. Click **Server Proxy Settings** in the right panel
4. ✅ Check **Enable proxy**
5. Click **Apply** in the right panel

### 8.5 Remove Default Website

```powershell
Import-Module WebAdministration
Remove-Website -Name "Default Web Site"
```

### 8.6 Create PMIS Website

```powershell
# Create the website
New-Website -Name "PMIS" -PhysicalPath "C:\pmis\frontend\dist" -Port 80 -Force

# Set folder permissions
icacls "C:\pmis\frontend\dist" /grant "IIS_IUSRS:(OI)(CI)R"
icacls "C:\pmis\frontend\dist" /grant "IUSR:(OI)(CI)R"
```

### 8.7 Create web.config for SPA Routing & API Proxy

```powershell
notepad C:\pmis\frontend\dist\web.config
```

**Paste the following:**

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
    
    <!-- MIME Types -->
    <staticContent>
      <remove fileExtension=".woff" />
      <remove fileExtension=".woff2" />
      <remove fileExtension=".json" />
      <mimeMap fileExtension=".woff" mimeType="font/woff" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>
    
    <!-- Compression -->
    <urlCompression doStaticCompression="true" doDynamicCompression="true" />
  </system.webServer>
</configuration>
```

**Save and close.**

### 8.8 Restart IIS

```powershell
iisreset
```

---

## 📦 Part 9: Create Backend Windows Service

### 9.1 Create Startup Script

```powershell
notepad C:\pmis\backend\start_server.bat
```

**Paste:**

```batch
@echo off
cd /d C:\pmis\backend
call venv\Scripts\activate.bat
python manage.py runserver 0.0.0.0:8000
```

**Save and close.**

### 9.2 Create Logs Directory

```powershell
mkdir C:\pmis\logs
```

### 9.3 Install Service with NSSM

```powershell
# Install the service
nssm install PMIS-Backend "C:\pmis\backend\start_server.bat"

# Configure service
nssm set PMIS-Backend AppDirectory "C:\pmis\backend"
nssm set PMIS-Backend DisplayName "PMIS Backend API"
nssm set PMIS-Backend Description "Django REST API for PMIS application"
nssm set PMIS-Backend Start SERVICE_AUTO_START
nssm set PMIS-Backend AppStdout "C:\pmis\logs\backend_stdout.log"
nssm set PMIS-Backend AppStderr "C:\pmis\logs\backend_stderr.log"
nssm set PMIS-Backend AppRotateFiles 1
nssm set PMIS-Backend AppRotateBytes 10485760
```

### 9.4 Start the Service

```powershell
nssm start PMIS-Backend

# Verify service is running
nssm status PMIS-Backend
```

**Expected output:** `SERVICE_RUNNING`

### 9.5 Test Backend API

```powershell
Invoke-WebRequest -Uri http://localhost:8000/api/banks/list/ -Method GET
```

---

## 📦 Part 10: Configure Windows Firewall

```powershell
# Allow HTTP (Port 80)
New-NetFirewallRule -DisplayName "PMIS HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Allow HTTPS (Port 443) - for future SSL
New-NetFirewallRule -DisplayName "PMIS HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# Verify rules
Get-NetFirewallRule -DisplayName "PMIS*" | Format-Table Name, DisplayName, Enabled
```

---

## ✅ Part 11: Final Verification

### 11.1 Test from External Browser

On your **local computer** (not the server), open a browser and visit:

1. **Frontend:** `http://45.118.163.111`
   - Should load the PMIS login page
   
2. **API Health:** `http://45.118.163.111/api/banks/list/`
   - Should return JSON with bank data

3. **Admin Panel:** `http://45.118.163.111/api/admin/`
   - Login with superuser credentials

### 11.2 Test Login

1. Go to `http://45.118.163.111`
2. Login with your superuser credentials
3. Verify dashboard loads correctly

---

## 🔧 Service Management Commands

| Action | Command |
|--------|---------|
| **Start Backend** | `nssm start PMIS-Backend` |
| **Stop Backend** | `nssm stop PMIS-Backend` |
| **Restart Backend** | `nssm restart PMIS-Backend` |
| **Check Status** | `nssm status PMIS-Backend` |
| **Restart IIS** | `iisreset` |
| **View Logs** | `Get-Content C:\pmis\logs\backend_stdout.log -Tail 50` |
| **View Errors** | `Get-Content C:\pmis\logs\backend_stderr.log -Tail 50` |

---

## 🔄 Update Procedure

When you need to deploy updates:

```powershell
# 1. Stop backend
nssm stop PMIS-Backend

# 2. Pull latest code
cd C:\pmis
git pull origin main

# 3. Update backend
cd C:\pmis\backend
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

# 4. Rebuild frontend
cd C:\pmis\frontend
npm install
npm run build

# 5. Copy web.config (if it was overwritten)
# (web.config should persist, but verify)

# 6. Restart services
nssm start PMIS-Backend
iisreset
```

---

## 🩺 Troubleshooting

### Frontend shows blank page
```powershell
# Check IIS site status
Get-IISSite

# Check web.config exists
Test-Path C:\pmis\frontend\dist\web.config

# Check IIS logs
Get-Content C:\inetpub\logs\LogFiles\W3SVC1\*.log -Tail 20
```

### API returns 502/503 error
```powershell
# Check if backend is running
nssm status PMIS-Backend

# Check backend logs
Get-Content C:\pmis\logs\backend_stderr.log -Tail 50

# Test backend directly
Invoke-WebRequest http://localhost:8000/api/banks/list/
```

### Database connection failed
```powershell
# Check PostgreSQL service
Get-Service postgresql*

# Start if stopped
net start postgresql-x64-17

# Test connection
psql -U pmis_user -d pmis_db -h localhost
```

### Port already in use
```powershell
# Find process using port
netstat -ano | findstr :8000

# Kill by PID
taskkill /PID <PID> /F
```

---

## 📝 Deployment Checklist

Use this checklist to track progress:

- [ ] Connected to server via RDP
- [ ] Installed Chocolatey
- [ ] Installed Git, Python, Node.js, PostgreSQL, NSSM
- [ ] Cloned repository to `C:\pmis`
- [ ] Created PostgreSQL database and user
- [ ] Created backend virtual environment
- [ ] Installed Python dependencies
- [ ] Created backend `.env` file
- [ ] Ran database migrations
- [ ] Created superuser
- [ ] Imported geography data
- [ ] Imported bank data
- [ ] Collected static files
- [ ] Installed Node.js dependencies
- [ ] Created frontend `.env.production`
- [ ] Built frontend for production
- [ ] Installed IIS
- [ ] Installed URL Rewrite module
- [ ] Installed ARR and enabled proxy
- [ ] Created PMIS website in IIS
- [ ] Created `web.config` in dist folder
- [ ] Created backend Windows service
- [ ] Started backend service
- [ ] Configured firewall rules
- [ ] Tested frontend from external browser
- [ ] Tested API from external browser
- [ ] Tested login functionality

---

## 🎉 Deployment Complete!

**Your PMIS application is now live at:**

| Resource | URL |
|----------|-----|
| **Main Application** | http://45.118.163.111 |
| **API Endpoint** | http://45.118.163.111/api |
| **Django Admin** | http://45.118.163.111/api/admin |

---

**⏱ Estimated Total Time:** 45-60 minutes (depending on download speeds)
