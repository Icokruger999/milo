# Deploy Incidents Feature - Step by Step

## Overview
This guide will help you deploy the new Incidents feature to your production environment.

## Prerequisites
- ✅ Incidents backend code added
- ✅ Incidents frontend code added
- ✅ Database migration created
- ✅ SQL script created
- ⏳ Database table needs to be created
- ⏳ Backend needs to be deployed to EC2
- ⏳ Frontend needs to be deployed to Amplify

## Step 1: Create Database Table

### Option A: Using SQL Script (Recommended)
```powershell
# Run the SQL script on your RDS database
.\run-sql-on-rds.ps1 -SqlFile "create-incidents-table.sql"
```

### Option B: Using psql directly
```bash
psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com \
     -U postgres \
     -d MiloDB \
     -f create-incidents-table.sql
```

### Verification
```sql
-- Check if table was created
SELECT * FROM information_schema.tables WHERE table_name = 'incidents';

-- Check table structure
\d incidents

-- Verify indexes
\di incidents_*
```

## Step 2: Deploy Backend to EC2

### Using PowerShell Script
```powershell
# Deploy the updated backend with Incidents feature
.\deploy-to-ec2.ps1
```

### Manual Deployment (if needed)
```powershell
# 1. Build the backend
cd backend\Milo.API
dotnet publish -c Release -o .\publish

# 2. Copy to EC2 via SSM
aws ssm start-session --target i-06bc5b2218c041802

# 3. On EC2, stop the service
sudo systemctl stop milo-api

# 4. Copy files (use SCP or AWS S3)
# 5. Restart service
sudo systemctl start milo-api
sudo systemctl status milo-api
```

### Verify Backend
```powershell
# Test the incidents endpoint
curl https://api.codingeverest.com/api/incidents

# Should return empty array [] (no incidents yet)
```

## Step 3: Deploy Frontend to Amplify

### Automatic Deployment (Recommended)
```powershell
# 1. Stage all changes
git add .

# 2. Commit with descriptive message
git commit -m "Add Incidents feature - Complete ticket management system"

# 3. Push to main branch
git push origin main

# 4. Amplify will automatically detect and deploy
# Wait 2-3 minutes for build to complete
```

### Check Deployment Status
```powershell
# Check Amplify deployment status
aws amplify list-jobs --app-id ddp21ao3xntn4 --branch-name main --max-results 2
```

### Verify Frontend
1. Open https://www.codingeverest.com/milo-incidents.html
2. You should see the Incidents page
3. Click "Create Incident" button to test

## Step 4: Test the Feature

### Test 1: Create an Incident
1. Navigate to https://www.codingeverest.com/milo-incidents.html
2. Click "Create Incident" button
3. Fill in the form:
   - Subject: "Test Incident - Please ignore"
   - Requester: Select your user
   - Priority: "Low"
   - Status: "New"
4. Click "Create"
5. Incident should appear in the list with number "INC-001"

### Test 2: View Incident Details
1. Click on the newly created incident row
2. Details panel should slide in from the right
3. Verify all information is displayed correctly
4. Click "Change Status" and update to "Open"
5. Close the panel and verify status updated in the list

### Test 3: Filter Incidents
1. Use the search box to search for "Test"
2. Incident should be filtered
3. Use status dropdown to filter by "Open"
4. Use priority dropdown to filter by "Low"

### Test 4: Multiple Incidents
1. Create 2-3 more test incidents with different priorities and statuses
2. Verify they all appear in the list
3. Verify filtering works with multiple incidents
4. Test clicking between different incidents

## Step 5: Clean Up Test Data (Optional)

### Delete Test Incidents via API
```bash
# Get all incidents
curl https://api.codingeverest.com/api/incidents

# Delete test incident (replace {id} with actual ID)
curl -X DELETE https://api.codingeverest.com/api/incidents/{id}
```

### Or via Database
```sql
-- Delete test incidents
DELETE FROM incidents WHERE subject LIKE '%Test%';
```

## Rollback Plan (If Needed)

### If Frontend Issues
```powershell
# Revert the commit
git revert HEAD
git push origin main

# Amplify will auto-deploy the previous version
```

### If Backend Issues
```powershell
# On EC2, restore previous version
sudo systemctl stop milo-api
# Restore backup
sudo systemctl start milo-api
```

### If Database Issues
```sql
-- Drop the incidents table (CAUTION: This deletes all data!)
DROP TABLE IF EXISTS incidents CASCADE;
```

## Troubleshooting

### Issue: Table Already Exists
**Solution**: The table was already created. Skip Step 1 and proceed to Step 2.

### Issue: Foreign Key Constraint Fails
**Problem**: Users, Teams, or Projects table doesn't exist
**Solution**: 
```sql
-- Check if required tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Create missing tables if needed (refer to their migration files)
```

### Issue: Backend Not Starting
**Check logs**:
```bash
# On EC2
sudo journalctl -u milo-api -n 50 --no-pager
```

### Issue: "No project selected"
**Solution**: 
1. Go to Board page first
2. Select a project
3. Then navigate to Incidents page

### Issue: Empty requester/agent dropdowns
**Problem**: No users loaded
**Solution**:
1. Check if users exist in database
2. Verify `/auth/users` endpoint works
3. Check browser console for errors

## Monitoring

### Check Backend Logs
```bash
# On EC2
sudo journalctl -u milo-api -f

# Look for any errors related to incidents
```

### Check Database
```sql
-- Count incidents
SELECT COUNT(*) FROM incidents;

-- Recent incidents
SELECT * FROM incidents ORDER BY created_at DESC LIMIT 10;

-- Incidents by status
SELECT status, COUNT(*) FROM incidents GROUP BY status;
```

### Check Frontend
1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for any JavaScript errors
4. Check Network tab for failed API calls

## Success Criteria

✅ Database table created without errors
✅ Backend deployed and running
✅ Frontend deployed to Amplify
✅ Can access Incidents page
✅ Can create new incident
✅ Can view incident details
✅ Can update incident status
✅ Can filter incidents
✅ No console errors in browser
✅ No backend errors in logs

## Next Steps

After successful deployment:
1. ✅ Test with real user data
2. ✅ Train team on using the feature
3. ✅ Create incident categories based on your needs
4. ✅ Set up SLA policies
5. ✅ Monitor incident resolution times
6. ✅ Gather feedback for improvements

## Support

If you encounter issues during deployment:
1. Check the troubleshooting section above
2. Review the logs (frontend console and backend journalctl)
3. Verify all prerequisites are met
4. Check the INCIDENTS_FEATURE_GUIDE.md for detailed documentation

---

**Deployment Date**: _____________________
**Deployed By**: _____________________
**Status**: _____________________
**Notes**: _____________________
