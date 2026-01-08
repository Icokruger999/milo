# Fix Build Errors on EC2

## Issue
Build fails when running `dotnet ef migrations add`. Error: "Build failed. Use dotnet build to see the errors."

## Solution

Run these commands on EC2 to see and fix build errors:

```bash
cd ~/milo/backend/Milo.API

# First, restore packages
dotnet restore

# Build to see errors
dotnet build

# If build succeeds, then run migration
dotnet ef migrations add AddFlakesAndTaskType --output-dir Data/Migrations

# Build again after migration
dotnet build

# Restart service
sudo systemctl restart milo-api.service
```

## Common Build Errors

### Error: Missing using statements
**Fix:** The code has been updated with proper `using MimeKit;` statements.

### Error: Package restore needed
**Fix:** Run `dotnet restore` first.

### Error: Migration already exists
**Fix:** If migration already exists, you can:
1. Skip creating it: The backend will auto-apply migrations on startup
2. Or delete the existing migration file and recreate it

## Quick Fix Command

```bash
cd ~/milo && git pull origin main && cd backend/Milo.API && dotnet restore && dotnet build && dotnet ef migrations add AddFlakesAndTaskType --output-dir Data/Migrations || echo 'Migration may exist' && dotnet build && sudo systemctl restart milo-api.service
```

## If Build Still Fails

1. Check the actual error message from `dotnet build`
2. Make sure all NuGet packages are restored: `dotnet restore`
3. Check .NET SDK version: `dotnet --version` (should be 8.0+)
4. Clean and rebuild: `dotnet clean && dotnet build`

