# Deployment Guide

## Pre-Deployment Validation

**ALWAYS run the validation script before deploying:**

### Windows (PowerShell)
```powershell
.\validate-deployment.ps1
```

### Linux/Mac (Bash)
```bash
chmod +x validate-deployment.sh
./validate-deployment.sh
```

### Strict Mode (Blocks on warnings)
```powershell
.\validate-deployment.ps1 -Strict
```

```bash
./validate-deployment.sh --strict
```

## What the Validation Script Checks

1. ✅ **Port Configurations**
   - API service uses port 8080
   - PostgreSQL uses port 5432
   - PgBouncer uses port 6432
   - Connection strings use PgBouncer (6432)

2. ✅ **Infrastructure Files**
   - Service files haven't been modified
   - Docker compose hasn't been modified
   - Nginx configs aren't being modified

3. ✅ **Change Detection**
   - Only code files should be changed
   - Infrastructure files should remain unchanged

## Deployment Process

1. **Make your code changes** (Controllers, Services, Models, etc.)
2. **Run validation script**: `.\validate-deployment.ps1`
3. **Fix any errors** if validation fails
4. **Build and test locally**
5. **Commit and push to GitHub**
6. **Deploy to EC2** (only if validation passes)

## Common Validation Failures

### Port Changed
**Error**: `Expected port 8080 not found`
**Fix**: Revert the port change. Ports are FIXED and must not be changed.

### Infrastructure File Modified
**Warning**: `Service File has been modified`
**Fix**: If you didn't intend to change infrastructure, revert those changes. Only code files should be modified.

### Connection String Wrong Port
**Error**: `Connection string should use PgBouncer port 6432`
**Fix**: Update connection string to use port 6432 (PgBouncer), not 5432 (PostgreSQL).

## Quick Reference

- **API Port**: 8080 (FIXED)
- **PostgreSQL Port**: 5432 (FIXED)
- **PgBouncer Port**: 6432 (FIXED)
- **See**: `DEPLOYMENT_RULES.md` for complete rules
