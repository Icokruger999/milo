# 🛡️ DEPLOYMENT SAFETY SYSTEM

## Overview

This system prevents deployment failures through automated checks and mandatory procedures.

---

## 📚 Documentation Files

### 1. `DEPLOYMENT_RULES.md` - The Golden Rules
**Purpose**: Never-break rules for deployments

**Key rules**:
- NEVER touch appsettings.json
- NEVER touch nginx configs
- NEVER delete production files
- ALWAYS use local PgBouncer/PostgreSQL
- Port 8080 is fixed

**When to read**: Before ANY deployment or infrastructure change

---

### 2. `PRE_DEPLOYMENT_CHECKLIST.md` - Step-by-Step Checklist
**Purpose**: Mandatory checklist for every deployment

**Sections**:
- Backend deployment checklist
- Frontend deployment checklist
- Database migration checklist
- Common mistakes to avoid
- Emergency rollback procedure

**When to use**: For EVERY deployment (backend or frontend)

---

### 3. `scripts/README.md` - Automated Scripts Guide
**Purpose**: How to use the automated safety scripts

**Scripts covered**:
- pre-deploy-validate.ps1
- verify-database-column.ps1
- post-deploy-test.ps1

**When to read**: Before using any automated script

---

## 🤖 Automated Scripts

### Quick Reference

| Script | When to Run | What It Does | Exit Code |
|--------|-------------|--------------|-----------|
| `pre-deploy-validate.ps1` | BEFORE deployment | Checks for common issues | 0=safe, 1=issues |
| `verify-database-column.ps1` | BEFORE adding code | Verifies column exists | 0=exists, 1=missing |
| `post-deploy-test.ps1` | AFTER deployment | Tests deployment success | 0=passed, 1=failed |

---

## 🚀 Complete Deployment Workflows

### Backend Deployment (No Database Changes)

```powershell
# 1. Make code changes (Controllers, Services, Models)

# 2. Run pre-deployment validation
.\scripts\pre-deploy-validate.ps1
# If fails: Fix issues and run again

# 3. Commit and push to GitHub
git add .
git commit -m "Description of changes"
git push

# 4. Deploy to EC2
# - Clone latest code
# - Build DLL
# - Copy to production
# - Restart service

# 5. Run post-deployment tests
.\scripts\post-deploy-test.ps1
# If fails: Check logs and fix

# 6. Tell user to refresh browser
# 7. Get user confirmation
```

---

### Backend Deployment (WITH Database Changes)

```powershell
# 1. Verify column does NOT exist yet
.\scripts\verify-database-column.ps1 -TableName "tasks" -ColumnName "sub_project_id"
# Should return: COLUMN DOES NOT EXIST

# 2. Create migration SQL
# Example: ALTER TABLE tasks ADD COLUMN sub_project_id INTEGER;

# 3. Apply migration to database
# Run SQL on database

# 4. Verify column NOW exists
.\scripts\verify-database-column.ps1 -TableName "tasks" -ColumnName "sub_project_id"
# Should return: COLUMN EXISTS

# 5. NOW add code that uses the column
# Add SubProjectId property to C# models

# 6. Run pre-deployment validation
.\scripts\pre-deploy-validate.ps1

# 7. Commit and push to GitHub
git add .
git commit -m "Add SubProjectId support"
git push

# 8. Deploy to EC2
# - Clone latest code
# - Build DLL
# - Copy to production
# - Restart service

# 9. Run post-deployment tests
.\scripts\post-deploy-test.ps1 -TestEndpoint "/tasks?projectId=1"

# 10. Tell user to refresh browser
# 11. Get user confirmation
```

---

### Frontend Deployment

```powershell
# 1. Make frontend changes (HTML, CSS, JS)

# 2. Check for syntax errors manually
# - No missing braces
# - No duplicate functions
# - No undefined variables

# 3. Commit and push to GitHub
git add .
git commit -m "Description of changes"
git push

# 4. Wait 2-3 minutes for Amplify to deploy

# 5. Tell user to clear cache (Ctrl+Shift+R)

# 6. Get user confirmation
```

---

## 🚨 What Went Wrong Before

### SubProjectId Incident (January 2026)

**What happened**:
- Added `SubProjectId` to C# code
- Did NOT add `sub_project_id` column to database first
- Deployed code
- ALL pages returned 500 errors
- Error: "column t.sub_project_id does not exist"

**Impact**:
- Board broken
- Backlog broken
- Dashboard broken
- Production down for 30+ minutes

**Root cause**:
- Code referenced database column that didn't exist
- No verification before deployment
- No testing after deployment

**How new system prevents this**:

1. **verify-database-column.ps1** would have caught missing column
2. **pre-deploy-validate.ps1** would have warned about SubProjectId reference
3. **post-deploy-test.ps1** would have caught 500 errors immediately
4. **PRE_DEPLOYMENT_CHECKLIST.md** Phase 1 requires database-first approach

---

## 📋 Checklist for Using This System

### For Every Backend Deployment:

- [ ] Read DEPLOYMENT_RULES.md (if first time or unsure)
- [ ] Follow PRE_DEPLOYMENT_CHECKLIST.md Backend section
- [ ] Run `pre-deploy-validate.ps1` before deploying
- [ ] If database changes: Use `verify-database-column.ps1`
- [ ] Deploy to EC2
- [ ] Run `post-deploy-test.ps1` after deploying
- [ ] Get user confirmation

### For Every Frontend Deployment:

- [ ] Follow PRE_DEPLOYMENT_CHECKLIST.md Frontend section
- [ ] Check for syntax errors
- [ ] Commit and push
- [ ] Wait for Amplify
- [ ] Tell user to clear cache
- [ ] Get user confirmation

### For Database Migrations:

- [ ] Follow PRE_DEPLOYMENT_CHECKLIST.md Database Migration section
- [ ] Run `verify-database-column.ps1` BEFORE adding code
- [ ] Create and apply migration
- [ ] Run `verify-database-column.ps1` AFTER migration
- [ ] ONLY THEN add code
- [ ] Follow backend deployment checklist

---

## 🎯 Success Criteria

**A deployment is successful when**:

1. ✅ All automated scripts pass
2. ✅ Service is running
3. ✅ Health endpoint responds
4. ✅ Actual endpoints return valid data
5. ✅ No errors in logs
6. ✅ User confirms pages load
7. ✅ No 500 errors
8. ✅ No "column does not exist" errors

**If ANY criterion fails**: Deployment is NOT successful, fix immediately

---

## 🔧 Troubleshooting

### Script fails with "command not found"
- Install AWS CLI
- Configure AWS credentials
- Check SSM permissions

### Script reports false positive
- Review script output carefully
- Check if warning is informational only
- Verify manually if needed

### Deployment breaks production
- Follow Emergency Rollback Procedure in PRE_DEPLOYMENT_CHECKLIST.md
- Restore previous working DLL
- Restart service
- Test endpoints
- Get user confirmation

---

## 📈 Future Improvements

Potential enhancements:
- [ ] Git pre-commit hooks to run validation
- [ ] Automated rollback on test failure
- [ ] Integration with CI/CD pipeline
- [ ] Slack/email notifications
- [ ] Performance testing
- [ ] Automated database backups before deployment

---

## 📞 Quick Help

**"I'm about to deploy, what do I do?"**
→ Follow PRE_DEPLOYMENT_CHECKLIST.md

**"I need to add a database column"**
→ Use verify-database-column.ps1, follow Database Migration section

**"Deployment broke production"**
→ Follow Emergency Rollback Procedure

**"Script is failing"**
→ Read scripts/README.md for troubleshooting

**"I'm not sure if I should deploy"**
→ Run pre-deploy-validate.ps1 first

---

## 🎓 Learning from Failures

### Key Lessons:

1. **Database First**: Always add columns BEFORE code
2. **Verify Everything**: Don't assume migrations worked
3. **Test After Deploy**: Always test endpoints after deployment
4. **Protected Files**: Never touch appsettings.json
5. **Use Scripts**: Automated checks catch issues early

### Remember:

- **Prevention is better than rollback**
- **Scripts are your safety net**
- **Checklists prevent mistakes**
- **Testing catches issues early**
- **User confirmation is final step**

---

**This system exists because we learned the hard way. Use it for EVERY deployment.**
