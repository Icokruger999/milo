# 🚨 MANDATORY PRE-DEPLOYMENT CHECKLIST

## ⚠️ READ THIS BEFORE EVERY SINGLE DEPLOYMENT

**RULE: I MUST COMPLETE THIS CHECKLIST BEFORE DEPLOYING. NO EXCEPTIONS.**

## 🤖 AUTOMATED SCRIPTS AVAILABLE

**NEW: Automated safety scripts to prevent failures!**

- `scripts/pre-deploy-validate.ps1` - Run BEFORE deployment to catch issues
- `scripts/verify-database-column.ps1` - Verify database columns exist
- `scripts/post-deploy-test.ps1` - Run AFTER deployment to verify success

**See `scripts/README.md` for usage instructions**

---

## BACKEND DEPLOYMENT CHECKLIST

### Phase 1: PRE-CODE CHANGES (Database First!)

- [ ] **1.1** If adding new database columns/tables:
  - [ ] **RUN SCRIPT**: `.\scripts\verify-database-column.ps1 -TableName "TABLE" -ColumnName "COLUMN"`
  - [ ] If column does NOT exist:
    - [ ] Create migration SQL file
    - [ ] Apply migration to database
    - [ ] **RUN SCRIPT AGAIN** to verify column now exists
    - [ ] Document the migration in a file
  - [ ] **ONLY THEN** proceed to code changes

- [ ] **1.2** If NOT adding database changes:
  - [ ] Confirm no new properties reference database columns
  - [ ] Confirm no new queries reference non-existent columns

### Phase 2: CODE CHANGES

- [ ] **2.1** Make code changes (Controllers, Services, Models)
- [ ] **2.2** Review changes - do they reference any database columns?
  - [ ] If YES: Go back to Phase 1.1 and verify columns exist
  - [ ] If NO: Proceed

- [ ] **2.3** Check protected files (NEVER TOUCH):
  - [ ] Did NOT modify `appsettings.json`
  - [ ] Did NOT modify nginx configs
  - [ ] Did NOT modify service files
  - [ ] Did NOT modify `MiloDbContext.cs` (unless schema change)

### Phase 3: BUILD & TEST LOCALLY

- [ ] **3.1** **RUN SCRIPT**: `.\scripts\pre-deploy-validate.ps1`
  - [ ] If script fails: Fix issues and run again
  - [ ] If script passes: Proceed to deployment

- [ ] **3.2** Commit changes to Git
- [ ] **3.3** Push to GitHub
- [ ] **3.4** Verify commit was successful

### Phase 4: DEPLOY TO EC2

- [ ] **4.1** Clone latest code on EC2
- [ ] **4.2** Build DLL with `dotnet publish`
- [ ] **4.3** **STOP** - Check build output for errors
  - [ ] If errors: Fix and restart from Phase 2
  - [ ] If warnings only: Document and proceed

- [ ] **4.4** Copy DLL to production directory
  - [ ] Use `cp -rf` (never delete first)
  - [ ] Verify appsettings.json was NOT overwritten

- [ ] **4.5** Restart service
- [ ] **4.6** Wait 10 seconds for service to start

### Phase 5: VERIFICATION (MANDATORY!)

- [ ] **5.1** **RUN SCRIPT**: `.\scripts\post-deploy-test.ps1`
  - [ ] If script fails: Check logs and fix issues
  - [ ] If script passes: Proceed to final confirmation

- [ ] **5.2** Manual verification (if needed):
  - [ ] Check service status: `sudo systemctl status milo-backend --no-pager`
  - [ ] Test health endpoint: `curl -s http://localhost:8080/api/health`
  - [ ] Test actual endpoint: `curl -s http://localhost:8080/api/[endpoint]`

- [ ] **5.3** If ANY test fails:
  - [ ] **STOP IMMEDIATELY**
  - [ ] Check logs: `sudo journalctl -u milo-backend -n 50`
  - [ ] Identify the error
  - [ ] Fix the issue
  - [ ] Restart from Phase 1

### Phase 6: FINAL CONFIRMATION

- [ ] **6.1** Tell user to refresh browser (Ctrl+Shift+R)
- [ ] **6.2** Confirm with user that pages load
- [ ] **6.3** If user reports errors:
  - [ ] Get exact error message
  - [ ] Check backend logs
  - [ ] Fix immediately

---

## FRONTEND DEPLOYMENT CHECKLIST

### Phase 1: CODE CHANGES

- [ ] **1.1** Make frontend changes (HTML, CSS, JS)
- [ ] **1.2** Check for syntax errors:
  - [ ] No missing closing braces `}`
  - [ ] No missing closing parentheses `)`
  - [ ] No undefined variables
  - [ ] No duplicate function definitions

### Phase 2: COMMIT & PUSH

- [ ] **2.1** Commit changes to Git
- [ ] **2.2** Push to GitHub
- [ ] **2.3** Verify commit was successful

### Phase 3: AMPLIFY DEPLOYMENT

- [ ] **3.1** Wait 2-3 minutes for Amplify to deploy
- [ ] **3.2** Tell user to clear browser cache (Ctrl+Shift+R)

### Phase 4: VERIFICATION

- [ ] **4.1** Ask user to confirm pages load
- [ ] **4.2** If user reports errors:
  - [ ] Get browser console errors
  - [ ] Fix JavaScript errors
  - [ ] Commit and push fix
  - [ ] Restart from Phase 2

---

## DATABASE MIGRATION CHECKLIST

**USE THIS WHEN ADDING NEW COLUMNS/TABLES**

### Step 1: Check Current State

- [ ] **1.1** Check if column/table exists:
  ```bash
  docker exec milo-postgres psql -U postgres -d milo -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'TABLE_NAME' AND column_name = 'COLUMN_NAME';"
  ```
- [ ] **1.2** Document result (exists or not)

### Step 2: Create Migration

- [ ] **2.1** Create migration SQL file
- [ ] **2.2** Include:
  - [ ] `ALTER TABLE` or `CREATE TABLE` statement
  - [ ] `IF NOT EXISTS` clause
  - [ ] Index creation (if needed)
  - [ ] Foreign key constraints (if needed)

### Step 3: Apply Migration

- [ ] **3.1** Run migration SQL on database
- [ ] **3.2** Check for errors in output
- [ ] **3.3** If errors: Fix SQL and retry

### Step 4: Verify Migration

- [ ] **4.1** Verify column/table exists:
  ```bash
  docker exec milo-postgres psql -U postgres -d milo -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'TABLE_NAME' AND column_name = 'COLUMN_NAME';"
  ```
- [ ] **4.2** Verify returns the column name
- [ ] **4.3** If NOT found: Migration failed, investigate and fix

### Step 5: Document

- [ ] **5.1** Document migration in a file
- [ ] **5.2** Include date, column name, table name
- [ ] **5.3** Commit documentation to Git

---

## COMMON MISTAKES TO AVOID

### ❌ NEVER DO THIS:

1. **Add code that references database columns without verifying they exist first**
2. **Deploy without testing the actual endpoint**
3. **Assume a migration worked without verifying**
4. **Touch appsettings.json during deployment**
5. **Delete production files before copying new ones**
6. **Deploy code that references non-existent columns**
7. **Skip the verification phase**
8. **Tell user "it's fixed" without testing**

### ✅ ALWAYS DO THIS:

1. **Database changes BEFORE code changes**
2. **Verify migrations with SELECT queries**
3. **Test endpoints with curl after deployment**
4. **Check service status after restart**
5. **Get actual error messages from logs**
6. **Follow the checklist in order**
7. **Stop if any step fails**
8. **Test before telling user it's done**

---

## EMERGENCY ROLLBACK PROCEDURE

**IF DEPLOYMENT BREAKS PRODUCTION:**

1. **STOP** - Don't make it worse
2. **Identify** - What broke? (Get error message)
3. **Decide**:
   - Option A: Quick fix (if obvious)
   - Option B: Rollback to previous working version
4. **Execute**:
   - If rollback: Restore previous DLL
   - If fix: Make minimal change and redeploy
5. **Verify** - Test endpoint works
6. **Confirm** - User confirms site works

---

## SIGN-OFF

**Before telling user deployment is complete, I MUST:**

- [ ] All checklist items completed
- [ ] All tests passed
- [ ] Service is running
- [ ] Endpoints return valid responses
- [ ] No errors in logs
- [ ] User confirmed pages load (if frontend)

**ONLY THEN can I say "deployment complete"**

---

## LESSONS LEARNED

### What Broke Before:

1. **SubProjectId Issue**: Added code referencing `sub_project_id` column that didn't exist in database
   - **Lesson**: Always verify database columns exist BEFORE adding code
   - **Prevention**: Follow Phase 1 of Backend Checklist

2. **Email Service Issue**: Missing IServiceProvider dependency
   - **Lesson**: Test compilation before deploying
   - **Prevention**: Check build output in Phase 4.3

3. **JavaScript Errors**: Duplicate functions, syntax errors
   - **Lesson**: Check for syntax errors before committing
   - **Prevention**: Follow Frontend Phase 1.2

### How to Prevent:

- **Use this checklist for EVERY deployment**
- **Never skip verification steps**
- **Test endpoints after EVERY deployment**
- **Get error messages from logs, not assumptions**

---

**I WILL FOLLOW THIS CHECKLIST FOR EVERY DEPLOYMENT. NO EXCEPTIONS.**
