# Deploy Incidents Feature via SSM

## 🚀 Complete SSM Deployment Guide

This guide shows you how to deploy the Incidents feature using AWS Systems Manager (SSM), which is more reliable than SSH for EC2 deployments.

## 📋 Prerequisites

- ✅ AWS CLI configured
- ✅ SSM Session Manager plugin installed
- ✅ Access to EC2 instance via SSM
- ✅ .NET SDK 8.0 installed (for building)

## 🎯 Deployment Options

### Option 1: Complete One-Command Deployment (Recommended)

Deploy everything (database + backend + frontend) in one go:

```powershell
.\deploy-incidents-via-ssm.ps1
```

**What it does:**
1. Creates database table
2. Builds and deploys backend to EC2
3. Commits and pushes frontend to GitHub (Amplify auto-deploys)
4. Verifies all deployments
5. Shows summary

**Time:** ~5-6 minutes

---

### Option 2: Step-by-Step Deployment

Deploy each component separately:

#### Step 1: Create Database Table
```powershell
.\create-incidents-db-ssm.ps1
```
**Time:** 30 seconds

#### Step 2: Deploy Backend
```powershell
.\deploy-incidents-backend-ssm.ps1
```
**Time:** 2-3 minutes

#### Step 3: Deploy Frontend
```powershell
git add .
git commit -m "Add Incidents feature"
git push origin main
# Wait 2-3 minutes for Amplify
```
**Time:** 2-3 minutes

---

## 📝 Detailed Steps (Option 1)

### Running the Complete Deployment

1. **Open PowerShell** in the project root directory

2. **Run the deployment script:**
   ```powershell
   .\deploy-incidents-via-ssm.ps1
   ```

3. **Watch the progress:**
   - ✅ Database table creation
   - ✅ Backend build
   - ✅ S3 upload
   - ✅ EC2 deployment
   - ✅ Service restart
   - ✅ API verification
   - ✅ Git commit & push
   - ✅ Amplify deployment

4. **Verify deployment:**
   - API: https://api.codingeverest.com/api/incidents
   - Frontend: https://www.codingeverest.com/milo-incidents.html

### What the Script Does

```
📊 Step 1: Database
├── Reads create-incidents-table.sql
├── Sends to EC2 via SSM
├── Executes on RDS database
└── ✅ Creates incidents table

🔧 Step 2: Backend
├── Builds backend with dotnet publish
├── Creates zip package
├── Uploads to S3 (temporary)
├── Downloads on EC2 via SSM
├── Stops milo-api service
├── Backs up current version
├── Extracts new files
├── Starts milo-api service
└── ✅ Tests API endpoints

🌐 Step 3: Frontend
├── Stages changes with git add
├── Commits with git commit
├── Pushes to GitHub
└── ✅ Amplify auto-deploys

🔍 Step 4: Verification
├── Tests /api/incidents endpoint
└── ✅ Shows deployment summary
```

---

## 🛠️ Troubleshooting

### Issue: "Table already exists"
**Status:** ⚠️ Warning (not an error)
**Action:** Continue - the script will proceed with backend deployment

### Issue: "S3 bucket creation failed"
**Cause:** Bucket name might be taken
**Fix:** Edit the script and change `$s3Bucket` to a unique name

### Issue: "SSM command timeout"
**Cause:** EC2 instance might be busy
**Fix:** Wait a minute and try again

### Issue: "Service failed to start"
**Check logs on EC2:**
```bash
# Via SSM Session
aws ssm start-session --target i-06bc5b2218c041802

# Then on EC2:
sudo journalctl -u milo-api -n 50 --no-pager
```

### Issue: "API not responding"
**Wait:** Service might still be starting (wait 30 seconds)
**Check:** 
```powershell
curl https://api.codingeverest.com/api/health
curl https://api.codingeverest.com/api/incidents
```

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] Database table created (check script output)
- [ ] Backend service running (script shows systemctl status)
- [ ] API responds: `curl https://api.codingeverest.com/api/incidents`
- [ ] Frontend deployed (check Amplify console)
- [ ] Can access: https://www.codingeverest.com/milo-incidents.html
- [ ] Can create incident
- [ ] Can view incident details
- [ ] Can update incident status

---

## 📊 Monitoring Deployment

### Check SSM Command Status
```powershell
# Get command ID from script output, then:
aws ssm get-command-invocation `
    --command-id YOUR-COMMAND-ID `
    --instance-id i-06bc5b2218c041802 `
    --region eu-west-1
```

### Check Backend Logs (via SSM)
```bash
# Start SSM session
aws ssm start-session --target i-06bc5b2218c041802

# On EC2:
sudo journalctl -u milo-api -f
```

### Check Amplify Deployment
```powershell
aws amplify list-jobs `
    --app-id ddp21ao3xntn4 `
    --branch-name main `
    --max-results 2
```

---

## 🔄 Rollback Plan

### If Backend Fails

The script automatically backs up the previous version:

```bash
# Via SSM Session
aws ssm start-session --target i-06bc5b2218c041802

# On EC2:
sudo systemctl stop milo-api
sudo rm -rf /var/www/milo-api
sudo mv /var/www/milo-api.backup.YYYYMMDD-HHMMSS /var/www/milo-api
sudo systemctl start milo-api
```

### If Frontend Fails

```powershell
# Revert git commit
git revert HEAD
git push origin main
# Amplify will auto-deploy previous version
```

### If Database Fails

```sql
-- Only if absolutely necessary (DELETES ALL DATA!)
DROP TABLE IF EXISTS incidents CASCADE;
```

---

## 📈 Performance Notes

### Deployment Times
- Database creation: 10-30 seconds
- Backend build: 20-40 seconds
- S3 upload: 5-10 seconds
- EC2 deployment: 30-60 seconds
- Frontend push: 5-10 seconds
- Amplify build: 2-3 minutes

**Total Time:** ~5-6 minutes

### Resource Usage
- Disk space (EC2): ~50 MB for backend
- S3 storage: ~10 MB (temporary, can be deleted)
- Memory: Service uses ~200 MB RAM
- CPU: Normal load during startup

---

## 🎯 Success Indicators

You'll see these if everything works:

```
✅ Database table created successfully
✅ Backend built successfully
✅ Package created
✅ Uploaded to S3
✅ Deployment successful!
✅ Incidents API is live!
✅ Pushed to GitHub - Amplify will auto-deploy
```

**Final Check:**
```powershell
# Test API
curl https://api.codingeverest.com/api/incidents

# Should return: []  (empty array if no incidents yet)
```

**Open in Browser:**
- https://www.codingeverest.com/milo-incidents.html

---

## 📚 Additional Resources

- **Feature Guide:** `INCIDENTS_FEATURE_GUIDE.md`
- **Quick Start:** `INCIDENTS_QUICK_START.md`
- **Implementation Details:** `INCIDENTS_IMPLEMENTATION_SUMMARY.md`
- **API Testing:** `test-incidents-api.ps1`

---

## ⚡ Quick Commands Reference

```powershell
# Complete deployment (all-in-one)
.\deploy-incidents-via-ssm.ps1

# Database only
.\create-incidents-db-ssm.ps1

# Backend only
.\deploy-incidents-backend-ssm.ps1

# Test API
.\test-incidents-api.ps1

# Check Amplify
aws amplify list-jobs --app-id ddp21ao3xntn4 --branch-name main --max-results 2

# SSM Session
aws ssm start-session --target i-06bc5b2218c041802
```

---

## 🚀 Ready to Deploy?

**Recommended approach:**

```powershell
# One command does it all:
.\deploy-incidents-via-ssm.ps1

# Then wait 5-6 minutes and test:
# https://www.codingeverest.com/milo-incidents.html
```

**That's it!** 🎉

---

**Created:** January 11, 2026
**Deployment Method:** AWS SSM
**Status:** Production Ready
