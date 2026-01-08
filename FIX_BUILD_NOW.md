# Fix Build Errors - Step by Step

## On EC2, run these commands:

```bash
# 1. Navigate to correct directory
cd ~/milo/backend/Milo.API

# 2. Pull latest fixes
cd ~/milo
git pull origin main
cd backend/Milo.API

# 3. Restore packages
dotnet restore

# 4. Build to see errors
dotnet build

# If build succeeds, create migration:
dotnet ef migrations add AddFlakesAndTaskType --output-dir Data/Migrations

# Build again
dotnet build

# Restart service
sudo systemctl restart milo-api.service

# Check status
sudo systemctl status milo-api.service --no-pager | head -20
```

## What Was Fixed:

1. ✅ DateTime format string in email template (line 274)
2. ✅ DateTime format string in HTML email (line 242)  
3. ✅ Content length handling (simplified null checks)
4. ✅ String interpolation syntax

## If Build Still Fails:

Run `dotnet build` and share the error messages. The most recent fixes address:
- DateTime formatting issues
- String interpolation problems
- Null reference handling

