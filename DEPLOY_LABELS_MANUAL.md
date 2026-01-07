# Deploy Labels Functionality - Manual Commands

Run these commands in your EC2 console (Session Manager):

```bash
# Set environment variables
export HOME=/home/ec2-user
export DOTNET_CLI_HOME=/home/ec2-user/.dotnet

# Fix git ownership
git config --global --add safe.directory /home/ec2-user/milo-repo

# Navigate to repo
cd /home/ec2-user/milo-repo

# Pull latest code
git pull origin main

# Build and publish
cd backend/Milo.API
dotnet restore
dotnet publish -c Release -o /var/www/milo-api

# Restart service
sudo systemctl restart milo-api

# Wait a moment
sleep 10

# Check service status
sudo systemctl status milo-api --no-pager | head -20

# Test Labels endpoint
curl -s http://localhost:5001/api/labels
```

## What This Does

1. **Pulls latest code** - Gets the Labels controller and model
2. **Builds the backend** - Compiles with the new Labels functionality
3. **Restarts the service** - Applies the new code and runs the migration
4. **Creates Labels table** - The migration will automatically create the Labels table in your database

## After Deployment

Once deployed, you should be able to:
- Click "Create" button → Opens task creation modal
- Click "+ New Label" → Create custom labels
- See labels in the Label dropdown
- Filter tasks by label

The frontend changes are already deployed via Amplify (auto-deploys from GitHub).

