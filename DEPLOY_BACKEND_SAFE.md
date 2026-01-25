# 🚀 SAFE BACKEND DEPLOYMENT - Following Golden Rules

## ⚠️ GOLDEN RULES COMPLIANCE

✅ **NEVER TOUCH** `appsettings.json` - Using existing file
✅ **NEVER TOUCH** Nginx configs - Not modifying
✅ **NEVER TOUCH** CORS configs - Not modifying  
✅ **NEVER DELETE** production files - Copying over only
✅ **ALWAYS use** local PgBouncer - Building with correct settings
✅ **Port 8080** - Not changing
✅ **Rebuild from source** - Not touching DLL directly

## 📋 WHAT WE'RE DEPLOYING

**ONLY CODE CHANGES:**
- `Controllers/SubProjectsController.cs` - Already exists, no changes needed
- `Controllers/TasksController.cs` - Already correct
- `Services/EmailService.cs` - Socket timeout fixes

**NOT TOUCHING:**
- ❌ appsettings.json
- ❌ Nginx configs
- ❌ Service files
- ❌ Port configurations
- ❌ Database configs

## 🔧 DEPLOYMENT STEPS

### Step 1: Connect to EC2

```powershell
aws ssm start-session --target i-0e858f1e0d7e6f5a3
```

### Step 2: Pull Latest Code

```bash
cd /home/ec2-user

# Clone fresh copy
git clone https://github.com/Icokruger999/milo.git milo-deploy-temp
cd milo-deploy-temp/backend/Milo.API
```

### Step 3: Build with Correct Settings

```bash
# Build the project (will use local database settings)
dotnet publish -c Release -o /tmp/milo-new-build

# Verify DLL was created
ls -lh /tmp/milo-new-build/Milo.API.dll
```

### Step 4: Deploy WITHOUT Deleting Files

```bash
# Stop service
sudo systemctl stop milo-api

# Backup current DLL only (not entire directory)
sudo cp /home/ec2-user/milo-backend-publish/Milo.API.dll /home/ec2-user/Milo.API.dll.backup-$(date +%Y%m%d-%H%M%S)

# Copy ONLY the new DLL and dependencies
# DO NOT copy appsettings.json
sudo cp /tmp/milo-new-build/Milo.API.dll /home/ec2-user/milo-backend-publish/
sudo cp /tmp/milo-new-build/Milo.API.pdb /home/ec2-user/milo-backend-publish/
sudo cp /tmp/milo-new-build/Milo.API.deps.json /home/ec2-user/milo-backend-publish/

# Copy other DLLs (but NOT appsettings.json)
sudo cp /tmp/milo-new-build/*.dll /home/ec2-user/milo-backend-publish/ 2>/dev/null || true

# VERIFY appsettings.json was NOT overwritten
ls -lh /home/ec2-user/milo-backend-publish/appsettings.json
```

### Step 5: Start Service

```bash
# Start service
sudo systemctl start milo-api

# Check status
sudo systemctl status milo-api

# Check logs for errors
sudo journalctl -u milo-api -n 50 --no-pager
```

### Step 6: Test Endpoints

```bash
# Test SubProjects endpoint
curl -s https://api.codingeverest.com/api/subprojects?projectId=1

# Test Tasks endpoint
curl -s https://api.codingeverest.com/api/tasks?projectId=1 | head -20
```

### Step 7: Cleanup

```bash
# Remove temporary files
cd /home/ec2-user
rm -rf milo-deploy-temp
rm -rf /tmp/milo-new-build
```

## ✅ VERIFICATION CHECKLIST

After deployment, verify:
- [ ] Service is running: `sudo systemctl status milo-api`
- [ ] No errors in logs: `sudo journalctl -u milo-api -n 20`
- [ ] SubProjects endpoint works: Returns `[]` or data (not 404)
- [ ] Tasks endpoint works: Returns array (not object)
- [ ] appsettings.json NOT modified: Check timestamp
- [ ] Port still 8080: `sudo netstat -tulpn | grep 8080`

## 🚨 IF SOMETHING GOES WRONG

### Rollback:
```bash
# Stop service
sudo systemctl stop milo-api

# Restore backup
sudo cp /home/ec2-user/Milo.API.dll.backup-* /home/ec2-user/milo-backend-publish/Milo.API.dll

# Start service
sudo systemctl start milo-api
```

### Check Configuration:
```bash
# Verify appsettings.json is correct
cat /home/ec2-user/milo-backend-publish/appsettings.json | grep ConnectionStrings

# Should show: "Host=localhost;Port=6432;Database=milo"
# Should NOT show: Supabase or SSL Mode=Require
```

## 📝 WHAT THIS DEPLOYMENT FIXES

1. **SubProjects API** - Endpoint will work (currently 404)
2. **Tasks API** - Returns proper array format
3. **Email Service** - Socket timeout protection
4. **Create Sub-Project** - Frontend can create sub-projects

## ⏱️ ESTIMATED TIME

- Total: 5-10 minutes
- Build: 2-3 minutes
- Deploy: 1-2 minutes
- Test: 2-3 minutes

---

**Created**: January 25, 2026
**Follows**: DEPLOYMENT_RULES.md Golden Rules
**Status**: Ready to execute
