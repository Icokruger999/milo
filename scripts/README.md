# Deployment Safety Scripts

These scripts are designed to prevent deployment failures by catching issues BEFORE they break production.

## 🚨 MANDATORY USAGE

**YOU MUST run these scripts for EVERY deployment. NO EXCEPTIONS.**

---

## Scripts Overview

### 1. `pre-deploy-validate.ps1` - Run BEFORE Deployment

**Purpose**: Catch common issues before deploying

**When to run**: BEFORE every backend deployment

**What it checks**:
- ✅ Protected files not modified (appsettings.json, etc.)
- ✅ No new database column references without verification
- ✅ Build succeeds
- ✅ No syntax errors in controllers
- ✅ No duplicate JavaScript functions

**Usage**:
```powershell
.\scripts\pre-deploy-validate.ps1
```

**Exit codes**:
- `0` = All checks passed, safe to deploy
- `1` = Issues found, DO NOT deploy

---

### 2. `verify-database-column.ps1` - Verify Column Exists

**Purpose**: Verify database column exists BEFORE adding code that uses it

**When to run**: BEFORE adding code that references a new database column

**What it does**:
- Checks if column exists in database
- Shows column data type if exists
- Prevents "column does not exist" errors

**Usage**:
```powershell
# Check if sub_project_id column exists in tasks table
.\scripts\verify-database-column.ps1 -TableName "tasks" -ColumnName "sub_project_id"

# Check if department_id column exists in projects table
.\scripts\verify-database-column.ps1 -TableName "projects" -ColumnName "department_id"
```

**Exit codes**:
- `0` = Column exists, safe to add code
- `1` = Column does NOT exist, create migration first

---

### 3. `post-deploy-test.ps1` - Run AFTER Deployment

**Purpose**: Verify deployment worked correctly

**When to run**: AFTER every backend deployment

**What it tests**:
- ✅ Service is running
- ✅ Health endpoint responds
- ✅ Actual endpoint returns valid JSON
- ✅ No "column does not exist" errors
- ✅ No 500 errors
- ✅ No critical errors in logs

**Usage**:
```powershell
# Test default endpoint (/tasks?projectId=1)
.\scripts\post-deploy-test.ps1

# Test specific endpoint
.\scripts\post-deploy-test.ps1 -TestEndpoint "/projects?userId=1"
```

**Exit codes**:
- `0` = All tests passed, deployment successful
- `1` = Tests failed, deployment has issues

---

## Complete Deployment Workflow

### Backend Deployment

```powershell
# STEP 1: Validate before deploying
.\scripts\pre-deploy-validate.ps1

# If validation passes, proceed with deployment
# ... (build and deploy steps) ...

# STEP 2: Test after deploying
.\scripts\post-deploy-test.ps1

# If tests pass, tell user to refresh browser
```

### Adding New Database Column

```powershell
# STEP 1: Verify column does NOT exist yet
.\scripts\verify-database-column.ps1 -TableName "tasks" -ColumnName "sub_project_id"

# STEP 2: Create and apply migration
# ... (create migration SQL and apply to database) ...

# STEP 3: Verify column NOW exists
.\scripts\verify-database-column.ps1 -TableName "tasks" -ColumnName "sub_project_id"

# STEP 4: ONLY NOW add code that uses the column
# ... (add SubProjectId to C# code) ...

# STEP 5: Validate and deploy
.\scripts\pre-deploy-validate.ps1
# ... (deploy) ...
.\scripts\post-deploy-test.ps1
```

---

## Integration with PRE_DEPLOYMENT_CHECKLIST.md

These scripts automate many checks from the manual checklist:

| Checklist Item | Automated By |
|----------------|--------------|
| Protected files not modified | `pre-deploy-validate.ps1` |
| Build succeeds | `pre-deploy-validate.ps1` |
| No syntax errors | `pre-deploy-validate.ps1` |
| Database column exists | `verify-database-column.ps1` |
| Service is running | `post-deploy-test.ps1` |
| Health endpoint works | `post-deploy-test.ps1` |
| Actual endpoint works | `post-deploy-test.ps1` |
| No errors in logs | `post-deploy-test.ps1` |

**Still need manual checks**:
- Committing to Git
- Pushing to GitHub
- Copying DLL to EC2
- User confirmation

---

## Error Messages

### pre-deploy-validate.ps1

**"PROTECTED FILE MODIFIED"**
- **Meaning**: You modified appsettings.json or other protected file
- **Fix**: Revert changes to protected file

**"BUILD FAILED"**
- **Meaning**: Code doesn't compile
- **Fix**: Fix compilation errors before deploying

**"DUPLICATE FUNCTION"**
- **Meaning**: JavaScript function defined multiple times
- **Fix**: Remove duplicate function definition

### verify-database-column.ps1

**"COLUMN DOES NOT EXIST"**
- **Meaning**: Database column not found
- **Fix**: Create and apply migration BEFORE adding code

### post-deploy-test.ps1

**"Service is NOT running"**
- **Meaning**: milo-backend service failed to start
- **Fix**: Check logs with `sudo journalctl -u milo-backend -n 50`

**"DATABASE COLUMN ERROR"**
- **Meaning**: Code references column that doesn't exist
- **Fix**: Rollback deployment, add column, redeploy

**"500 ERROR"**
- **Meaning**: API returning server error
- **Fix**: Check logs for detailed error message

---

## Requirements

- PowerShell 5.1 or higher
- AWS CLI configured
- Access to EC2 instance `i-06bc5b2218c041802`
- SSM permissions

---

## Troubleshooting

**Script fails with "command not found"**
- Ensure AWS CLI is installed and configured
- Check SSM permissions

**Script hangs**
- Increase sleep time in script
- Check EC2 instance is running

**False positives**
- Review script output carefully
- Some warnings are informational only

---

## Future Enhancements

Potential additions:
- [ ] Automated rollback on test failure
- [ ] Integration with Git hooks
- [ ] Slack/email notifications
- [ ] Performance testing
- [ ] Database backup before deployment

---

**Remember: These scripts are your safety net. Use them for EVERY deployment!**
