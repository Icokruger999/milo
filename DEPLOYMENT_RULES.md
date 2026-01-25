# 🚨 CRITICAL DEPLOYMENT RULES - DO NOT VIOLATE

## ⚠️ **BEFORE ANY DEPLOYMENT OR FIX - READ THIS FIRST**

### **THE GOLDEN RULES - NEVER BREAK THESE:**

1. **NEVER TOUCH `appsettings.json`** - Use existing files from previous deploys
2. **NEVER TOUCH Nginx configs** - They are working, leave them alone
3. **NEVER TOUCH CORS configs** - They are configured correctly
4. **NEVER TOUCH DLL files directly** - Always rebuild from source code
5. **NEVER DELETE production files** - Copy over, never delete first
6. **ALWAYS use PgBouncer** - We don't use Supabase anymore, use local database
7. **INSTANCE i-06bc5b2218c041802 IS MILO ONLY** - NO Summit on this instance

### **IF YOU NEED TO DEPLOY:**
- ✅ Rebuild DLL from source with correct local database settings
- ✅ Copy new DLL to production directory
- ✅ Use existing appsettings.json (DO NOT OVERWRITE)
- ✅ Restart service
- ❌ DO NOT touch appsettings.json
- ❌ DO NOT touch nginx configs
- ❌ DO NOT touch CORS settings
- ❌ DO NOT delete existing files first

---

## ⚠️ QUICK REFERENCE - PROTECTED FILES

**When making frontend or backend page changes, NEVER overwrite or modify:**
- `backend/Milo.API/appsettings.json` ⚠️ **MOST CRITICAL - NEVER TOUCH**
- `backend/Milo.API/publish/appsettings.json` ⚠️ **MOST CRITICAL - NEVER TOUCH**
- `docker-compose.yml`
- `backend/Milo.API/Services/milo-backend.service`
- `frontend/js/config.js`
- `backend/Milo.API/Data/MiloDbContext.cs`
- Migration files (`backend/Milo.API/Migrations/*.cs`)
- Nginx configuration files (on server)

**See "PROTECTED FILES" section below for complete list and details.**

---

## ⚠️ PORT CONFIGURATION - NEVER CHANGE THESE PORTS

**THESE PORTS ARE FIXED AND MUST NEVER BE CHANGED:**

1. **API Backend Service**: Port **8080** (Docker recommended port)
   - File: `backend/Milo.API/Services/milo-backend.service`
   - Line 11: `ExecStart=/usr/bin/dotnet ... --urls http://localhost:8080`
   - **DO NOT CHANGE TO 4000, 5000, 5001, 8000, OR ANY OTHER PORT**

2. **PostgreSQL (Docker)**: Port **5432** (Standard PostgreSQL port)
   - File: `docker-compose.yml`
   - Line 13: `- "5432:5432"`
   - **NEVER CHANGE**

3. **PgBouncer (Docker)**: Port **6432** (Standard PgBouncer port)
   - File: `docker-compose.yml`
   - Line 42: `- "6432:6432"`
   - **NEVER CHANGE**

4. **Nginx Configuration**: Must proxy to **localhost:8080**
   - Files: `/etc/nginx/conf.d/milo-api.conf` (HTTPS) - ONLY this file should exist
   - **REMOVE**: `/etc/nginx/conf.d/00-summit-api.conf` - Summit should NOT be on this instance
   - **DO NOT CHANGE proxy_pass TO ANY OTHER PORT**

## 🚫 PROTECTED FILES - NEVER OVERWRITE

**THESE FILES MUST NEVER BE MODIFIED OR OVERWRITTEN when making frontend or backend page changes:**

### Infrastructure Files (NEVER TOUCH)
1. **`docker-compose.yml`**
   - Contains Docker service configurations
   - Port mappings (5432, 6432)
   - Environment variables
   - Network and volume configurations
   - **DO NOT MODIFY** - Only change if explicitly requested for infrastructure updates

2. **`backend/Milo.API/Services/milo-backend.service`**
   - Systemd service file
   - Port configuration (8080)
   - Working directory paths
   - Service startup commands
   - **DO NOT MODIFY** - Only change if explicitly requested for service configuration

3. **Nginx Configuration Files** (on EC2 server)
   - `/etc/nginx/conf.d/milo-api.conf` - HTTPS proxy for Milo (KEEP)
   - **REMOVE**: `/etc/nginx/conf.d/00-summit-api.conf` - Summit config (DELETE - not needed on this instance)
   - Proxy configurations
   - SSL settings
   - **DO NOT MODIFY** - Only change if explicitly requested for nginx updates

### Configuration Files (NEVER OVERWRITE)
4. **`backend/Milo.API/appsettings.json`** ⚠️ **MOST CRITICAL**
   - Database connection strings
   - API configuration
   - Environment settings
   - **NEVER OVERWRITE** - Use existing file from previous deploys
   - **NEVER MODIFY** - This file is configured correctly for local PgBouncer/PostgreSQL
   - **IF BROKEN**: Copy from a previous working deploy, never create new

5. **`backend/Milo.API/publish/appsettings.json`** ⚠️ **MOST CRITICAL**
   - Production configuration
   - Deployment-specific settings
   - **NEVER OVERWRITE** - Use existing file from previous deploys
   - **NEVER MODIFY** - This file is configured correctly for local PgBouncer/PostgreSQL

6. **`frontend/js/config.js`**
   - API endpoint URLs
   - Frontend configuration
   - **DO NOT OVERWRITE** - Only modify specific values if explicitly requested

### Database Files (NEVER MODIFY)
7. **Migration Files** (`backend/Milo.API/Migrations/*.cs`)
   - Database schema definitions
   - Historical migration records
   - **DO NOT MODIFY** - Only create new migrations when adding schema changes

8. **`backend/Milo.API/Data/MiloDbContext.cs`**
   - Database context configuration
   - Table and column naming conventions
   - Relationship mappings
   - **DO NOT MODIFY** - Only change if explicitly requested for schema updates

### Build and Deployment Files (NEVER OVERWRITE)
9. **`.csproj` files** (unless adding new packages)
   - Project dependencies
   - Build configurations
   - **DO NOT OVERWRITE** - Only add new package references if needed

10. **`DEPLOYMENT_RULES.md`** (this file)
    - Deployment guidelines
    - Configuration rules
    - **DO NOT MODIFY** - Only update when rules change

### What IS Safe to Modify
✅ **Safe to modify when making page changes:**
- Controller files (`backend/Milo.API/Controllers/*.cs`)
- Service files (`backend/Milo.API/Services/*.cs`)
- Model files (`backend/Milo.API/Models/*.cs`)
- Frontend HTML files (`frontend/*.html`)
- Frontend JavaScript files (`frontend/js/*.js`) - except `config.js`
- Frontend CSS files (`frontend/css/*.css`)
- View files (if using Razor views)

## 🔒 RULES FOR AGENTS/AUTOMATION

### Rule 0: Protected Files Are OFF-LIMITS
- **NEVER** overwrite or modify files listed in the "PROTECTED FILES" section above
- **ESPECIALLY `appsettings.json`** - This is the most critical file, NEVER touch it
- **NEVER** "update" or "fix" configuration files during frontend/backend page changes
- **NEVER** regenerate or overwrite infrastructure files
- **NEVER** copy appsettings.json from local machine to server
- **ALWAYS** use existing appsettings.json from previous deploys on the server
- If a protected file needs changes, **STOP and ASK the user first**

### Rule 0.5: Database Configuration
- **WE USE LOCAL PGBOUNCER/POSTGRESQL** - Not Supabase anymore
- Connection string should be: `Host=localhost;Port=6432;Database=milo;Username=postgres`
- **NEVER** add Supabase connection strings
- **NEVER** add SSL Mode=Require (we use local database without SSL)
- When rebuilding DLL, ensure it's built with local database settings

### Rule 1: Port Changes Are FORBIDDEN
- **NEVER** change port numbers in any configuration file
- **NEVER** "fix" or "update" ports unless explicitly requested by the user
- If you see a port mismatch, **STOP and ASK the user first** - do not assume it's wrong

### Rule 2: Nginx Configuration Changes
- **NEVER** modify nginx configuration files unless:
  1. The user explicitly requests it
  2. There is a confirmed bug that requires fixing
  3. You have verified the current config is actually broken (not just different from what you expect)

### Rule 3: Working Systems Should Not Be "Fixed"
- If the application is working, **DO NOT** make changes to infrastructure
- If you see a configuration that differs from documentation, **ASK FIRST** - it may be intentionally different
- The fact that something "could be better" is NOT a reason to change it

### Rule 4: Deployment Process
- When deploying new features:
  1. **ONLY** update the code files (Controllers, Services, Models, etc.)
  2. **REBUILD DLL** from source code with correct local database settings
  3. **COPY** new DLL to production directory (DO NOT delete existing files first)
  4. **USE EXISTING** appsettings.json (DO NOT OVERWRITE OR MODIFY)
  5. **DO NOT** touch configuration files (appsettings.json, nginx configs, service files)
  6. **DO NOT** change ports, connection strings, or infrastructure settings
  7. **NEVER DELETE EXISTING FILES** - Always copy new files over existing ones, never use `rm -rf` or delete commands on production directories
  8. **PRESERVE ALL FILES** - When deploying DLLs, copy new files without deleting the directory contents first
  9. **PROTECT DLL FILES** - The `Milo.API.dll` and related files in `/home/ec2-user/milo-backend-publish/` are production files. Only rebuild and copy new DLLs when code changes are made. Do NOT delete or edit DLL files directly - always rebuild from source code.
  10. **ONLY REBUILD WHEN NEEDED** - Only rebuild the DLL when there are actual code changes. Do not rebuild unnecessarily.
  11. **USE LOCAL DATABASE SETTINGS** - Ensure DLL is built with local PgBouncer/PostgreSQL settings, not Supabase
  12. **IGNORE SYSTEMD TIMEOUT WARNINGS** - The service has TimeoutStartSec=300 (5 minutes). If systemd shows "activating" for 1-2 minutes, this is NORMAL. The API is working even if systemd hasn't finished the startup check. Always verify by testing the API endpoints directly with curl.

### Rule 5: Diagnostic Commands
- **AVOID** running multiple diagnostic commands with sleep delays
- **USE** direct command queries instead of nested command substitutions
- **BATCH** related checks into single commands when possible
- **STOP** if the first diagnostic shows the issue is resolved

## 📋 CURRENT PRODUCTION CONFIGURATION (Verified Working)

### API Service
- **Port**: 8080
- **Service File**: `/etc/systemd/system/milo-backend.service`
- **Working Directory**: `/home/ec2-user/milo-backend-publish`
- **Status**: Running

### Database
- **PostgreSQL**: localhost:5432 (Docker container)
- **PgBouncer**: localhost:6432 (Docker container)
- **Connection String**: `Host=localhost;Port=6432;Database=milo;Username=postgres`

### Nginx
- **HTTP Config**: REMOVED - `/etc/nginx/conf.d/00-summit-api.conf` (Summit not on this instance)
- **HTTPS Config**: `/etc/nginx/conf.d/milo-api.conf` → proxies to `localhost:8080`
- **SSL Certificates**: `/etc/letsencrypt/live/api.codingeverest.com/`

### Frontend
- **URL**: `https://www.codingeverest.com`
- **API Endpoint**: `https://api.codingeverest.com/api`

## 🚫 WHAT NOT TO DO

1. ❌ **DO NOT** change ports "to match documentation" if the app is working
2. ❌ **DO NOT** "fix" nginx configs that are working
3. ❌ **DO NOT** run 10+ diagnostic commands when 1-2 would suffice
4. ❌ **DO NOT** assume a configuration is wrong just because it's different
5. ❌ **DO NOT** make infrastructure changes when deploying code features
6. ❌ **DO NOT** use nested command substitutions that fail in PowerShell
7. ❌ **DO NOT DELETE EXISTING FILES** - Never use `rm -rf`, `rm -f`, or any delete commands on production directories like `/home/ec2-user/milo-backend-publish/`
8. ❌ **DO NOT** clear or empty production directories before copying new files
9. ❌ **DO NOT EDIT DLL FILES** - Never edit, delete, or modify DLL files directly. Always rebuild from source code when changes are needed.
10. ❌ **DO NOT REBUILD UNNECESSARILY** - Only rebuild the DLL when there are actual code changes that require it.
11. ❌ **DO NOT TOUCH appsettings.json** - This is the most critical rule. NEVER modify, overwrite, or "fix" this file.
12. ❌ **DO NOT COPY appsettings.json from local** - Always use the existing file on the server
13. ❌ **DO NOT ADD SUPABASE SETTINGS** - We use local PgBouncer/PostgreSQL, not Supabase
14. ❌ **DO NOT ADD SSL SETTINGS** - Local database doesn't use SSL

## ✅ WHAT TO DO

1. ✅ **ASK** before changing any port or infrastructure configuration
2. ✅ **VERIFY** the current state before making assumptions
3. ✅ **ONLY** change code files when deploying new features
4. ✅ **USE** direct command queries instead of nested substitutions
5. ✅ **STOP** diagnostic loops once the issue is identified
6. ✅ **RESPECT** working configurations even if they differ from docs
7. ✅ **REBUILD DLL** from source when code changes are needed
8. ✅ **USE EXISTING appsettings.json** from the server, never overwrite
9. ✅ **BUILD WITH LOCAL DATABASE SETTINGS** - Use PgBouncer/PostgreSQL, not Supabase
10. ✅ **COPY FILES** without deleting existing ones first

## 📝 When Making Changes

Before changing ANY port or infrastructure configuration:
1. **STOP** and explain what you found
2. **ASK** the user if the change is needed
3. **WAIT** for explicit approval
4. **DOCUMENT** the change and why it was made

## 🎯 Deployment Checklist

When deploying new features:
- [ ] Only code files changed (Controllers, Services, Models, HTML, JS, CSS)
- [ ] **NO protected files modified** (docker-compose.yml, service files, appsettings.json, config.js, etc.)
- [ ] **appsettings.json NOT touched** (most critical check)
- [ ] No port numbers changed
- [ ] No nginx configs changed
- [ ] No service files changed
- [ ] No connection strings changed
- [ ] No infrastructure files touched
- [ ] DLL rebuilt from source with LOCAL database settings (not Supabase)
- [ ] Build succeeds
- [ ] Deploy to EC2 (copy DLL without deleting existing files)
- [ ] Use existing appsettings.json on server
- [ ] Restart service
- [ ] Test the new feature only

### Protected Files Verification
Before deploying, verify these files were NOT modified:
- [ ] `docker-compose.yml` - unchanged
- [ ] `backend/Milo.API/Services/milo-backend.service` - unchanged
- [ ] `backend/Milo.API/appsettings.json` - **UNCHANGED (MOST CRITICAL)**
- [ ] `backend/Milo.API/publish/appsettings.json` - **UNCHANGED (MOST CRITICAL)**
- [ ] `frontend/js/config.js` - unchanged (or only specific requested values)
- [ ] `backend/Milo.API/Data/MiloDbContext.cs` - unchanged (unless schema changes requested)
- [ ] Migration files - unchanged (unless new migration created)

### Database Configuration Verification
Before deploying backend:
- [ ] DLL built with local database settings (PgBouncer/PostgreSQL)
- [ ] NO Supabase connection strings in code
- [ ] NO SSL Mode=Require in connection strings
- [ ] Connection string uses: `Host=localhost;Port=6432;Database=milo;Username=postgres`
