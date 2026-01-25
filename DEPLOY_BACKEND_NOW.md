# Deploy Backend NOW - Fix API Endpoints

## 🚨 PROBLEM

Frontend is calling these endpoints but backend isn't deployed:
- `/api/subprojects` - 404 error
- `/api/tasks` - returning wrong format

## ✅ SOLUTION

Deploy the updated backend to EC2.

## 📋 DEPLOYMENT STEPS

### Option 1: Build on EC2 (Recommended)

```powershell
# Connect to EC2
aws ssm start-session --target i-0e858f1e0d7e6f5a3
```

Then in the SSM session:
```bash
# Navigate to backend directory
cd /home/ec2-user

# Pull latest code from GitHub
git clone https://github.com/Icokruger999/milo.git milo-temp
cd milo-temp/backend/Milo.API

# Build the project
dotnet publish -c Release -o /tmp/milo-publish

# Stop the service
sudo systemctl stop milo-api

# Backup current version
sudo cp -r /home/ec2-user/milo-backend-publish /home/ec2-user/milo-backend-publish.backup

# Copy new build
sudo cp -r /tmp/milo-publish/* /home/ec2-user/milo-backend-publish/

# Start the service
sudo systemctl start milo-api

# Check status
sudo systemctl status milo-api

# Check logs
sudo journalctl -u milo-api -n 50 --no-pager

# Cleanup
cd /home/ec2-user
rm -rf milo-temp
rm -rf /tmp/milo-publish
```

### Option 2: Build Locally and Upload

```powershell
cd C:\milo_new\milo\backend\Milo.API

# Build the project
dotnet publish -c Release -o publish

# Create zip
Compress-Archive -Path publish\* -DestinationPath milo-backend.zip -Force

# Upload to S3
aws s3 cp milo-backend.zip s3://milo-deployment-temp/

# Then on EC2:
aws ssm start-session --target i-0e858f1e0d7e6f5a3
```

In SSM session:
```bash
# Download from S3
aws s3 cp s3://milo-deployment-temp/milo-backend.zip /tmp/

# Extract
cd /tmp
unzip -o milo-backend.zip -d milo-publish

# Stop service
sudo systemctl stop milo-api

# Backup
sudo cp -r /home/ec2-user/milo-backend-publish /home/ec2-user/milo-backend-publish.backup

# Deploy
sudo cp -r /tmp/milo-publish/* /home/ec2-user/milo-backend-publish/

# Start service
sudo systemctl start milo-api

# Check
sudo systemctl status milo-api
```

## 🧪 TEST AFTER DEPLOYMENT

### Test 1: SubProjects Endpoint
```bash
curl https://api.codingeverest.com/api/subprojects?projectId=1
```
Should return: `[]` or list of sub-projects (not 404)

### Test 2: Tasks Endpoint
```bash
curl https://api.codingeverest.com/api/tasks?projectId=1
```
Should return: Array of tasks (not object)

### Test 3: Create Sub-Project
In the web app:
1. Go to Project Timeline
2. Click "Create Sub-Project"
3. Enter name, description
4. Click "Create Sub-Project"
5. Should succeed (no error)

## 🔧 TROUBLESHOOTING

### If service won't start:
```bash
# Check logs
sudo journalctl -u milo-api -n 100 --no-pager

# Check if port is in use
sudo netstat -tulpn | grep 5000

# Check file permissions
ls -la /home/ec2-user/milo-backend-publish/

# Restart service
sudo systemctl restart milo-api
```

### If still getting 404:
```bash
# Check nginx configuration
sudo nginx -t
sudo systemctl restart nginx

# Check API is running
curl http://localhost:5000/api/tasks?projectId=1
```

## 📝 WHAT'S IN THE BACKEND UPDATE

1. **SubProjectsController** - Full CRUD for sub-projects
2. **TasksController** - Returns proper array format
3. **Email Service** - Socket timeout fixes
4. **All Models** - SubProject support

## ⏱️ ESTIMATED TIME

- Build on EC2: 5-10 minutes
- Build locally + upload: 10-15 minutes

## 🎯 PRIORITY

**HIGH** - Frontend features won't work without this deployment!

---

**Created**: January 25, 2026
**Status**: Ready to deploy
