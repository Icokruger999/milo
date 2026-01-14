# 🚨 CRITICAL DEPLOYMENT RULES - DO NOT VIOLATE

## ⚠️ QUICK REFERENCE - PROTECTED FILES

**When making frontend or backend page changes, NEVER overwrite or modify:**
- `docker-compose.yml`
- `backend/Milo.API/Services/milo-backend.service`
- `backend/Milo.API/appsettings.json`
- `backend/Milo.API/publish/appsettings.json`
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
   - Files: `/etc/nginx/conf.d/milo-api.conf` (HTTPS) and `/etc/nginx/conf.d/00-summit-api.conf` (HTTP)
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
   - `/etc/nginx/conf.d/milo-api.conf`
   - `/etc/nginx/conf.d/00-summit-api.conf`
   - Proxy configurations
   - SSL settings
   - **DO NOT MODIFY** - Only change if explicitly requested for nginx updates

### Configuration Files (NEVER OVERWRITE)
4. **`backend/Milo.API/appsettings.json`**
   - Database connection strings
   - API configuration
   - Environment settings
   - **DO NOT OVERWRITE** - Only modify specific values if explicitly requested

5. **`backend/Milo.API/publish/appsettings.json`**
   - Production configuration
   - Deployment-specific settings
   - **DO NOT OVERWRITE** - Only modify specific values if explicitly requested

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
- **NEVER** "update" or "fix" configuration files during frontend/backend page changes
- **NEVER** regenerate or overwrite infrastructure files
- If a protected file needs changes, **STOP and ASK the user first**

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
  2. **DO NOT** touch configuration files (appsettings.json, nginx configs, service files)
  3. **DO NOT** change ports, connection strings, or infrastructure settings
  4. Build and deploy the code only

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
- **HTTP Config**: `/etc/nginx/conf.d/00-summit-api.conf` → proxies to `localhost:8080`
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

## ✅ WHAT TO DO

1. ✅ **ASK** before changing any port or infrastructure configuration
2. ✅ **VERIFY** the current state before making assumptions
3. ✅ **ONLY** change code files when deploying new features
4. ✅ **USE** direct command queries instead of nested substitutions
5. ✅ **STOP** diagnostic loops once the issue is identified
6. ✅ **RESPECT** working configurations even if they differ from docs

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
- [ ] No port numbers changed
- [ ] No nginx configs changed
- [ ] No service files changed
- [ ] No connection strings changed
- [ ] No infrastructure files touched
- [ ] Build succeeds
- [ ] Deploy to EC2
- [ ] Test the new feature only

### Protected Files Verification
Before deploying, verify these files were NOT modified:
- [ ] `docker-compose.yml` - unchanged
- [ ] `backend/Milo.API/Services/milo-backend.service` - unchanged
- [ ] `backend/Milo.API/appsettings.json` - unchanged (or only specific requested values)
- [ ] `backend/Milo.API/publish/appsettings.json` - unchanged (or only specific requested values)
- [ ] `frontend/js/config.js` - unchanged (or only specific requested values)
- [ ] `backend/Milo.API/Data/MiloDbContext.cs` - unchanged (unless schema changes requested)
- [ ] Migration files - unchanged (unless new migration created)
