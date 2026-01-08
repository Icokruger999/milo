# Manual EC2 Update for Flakes - SSH Commands

## Issue
SSM is not available, so update EC2 manually via SSH.

## Commands to Run on EC2

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@34.246.3.141

# Navigate to project
cd ~/milo

# Pull latest code
git pull origin main

# Try to install dotnet-ef (with version fallback)
dotnet tool install --global dotnet-ef --version 8.0.0 || \
dotnet tool install --global dotnet-ef --version 7.0.0 || \
echo "dotnet-ef may already be installed"

# Add to PATH
export PATH="$PATH:$HOME/.dotnet/tools"

# Navigate to API project
cd backend/Milo.API

# Create migration (if not exists)
dotnet ef migrations add AddFlakesAndTaskType --output-dir Data/Migrations || \
echo "Migration may already exist"

# Build the project
dotnet build

# Restart the service
sudo systemctl restart milo-api.service

# Check status
sudo systemctl status milo-api.service

# Test the API
curl http://localhost:5001/api/flakes
```

## One-Liner (Copy and Paste)

```bash
cd ~/milo && git pull origin main && dotnet tool install --global dotnet-ef --version 8.0.0 || dotnet tool install --global dotnet-ef --version 7.0.0 || echo "dotnet-ef installed" && export PATH="$PATH:$HOME/.dotnet/tools" && cd backend/Milo.API && dotnet ef migrations add AddFlakesAndTaskType --output-dir Data/Migrations || echo "Migration exists" && dotnet build && sudo systemctl restart milo-api.service && sleep 5 && sudo systemctl status milo-api.service --no-pager | head -20
```

## What This Does

1. Pulls latest code (includes Flakes fixes)
2. Installs dotnet-ef tool (with version fallback)
3. Creates database migration for Flakes table
4. Builds the backend
5. Restarts the service
6. Shows service status

## Expected Result

After running these commands:
- ✅ Flakes table created in database
- ✅ Backend API supports `/api/flakes` endpoints
- ✅ Flakes will persist after refresh
- ✅ Delete and update functionality works

