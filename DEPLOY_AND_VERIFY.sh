#!/bin/bash
# Simple deployment script - ensures backend is always running
# Run this on EC2 via Session Manager after code changes

set -e

echo "========================================"
echo "Deploying and Verifying Backend"
echo "========================================"

# Navigate to repo
cd /home/ec2-user
sudo chown -R ec2-user:ec2-user milo-repo 2>/dev/null || true
git config --global --add safe.directory /home/ec2-user/milo-repo 2>/dev/null || true

if [ -d milo-repo ]; then
    cd milo-repo && git pull origin main
else
    git clone https://github.com/Icokruger999/milo.git milo-repo && cd milo-repo
fi

# Build
cd backend/Milo.API
export HOME=/home/ec2-user
export DOTNET_CLI_HOME=/home/ec2-user/.dotnet
dotnet restore
dotnet publish -c Release -o /var/www/milo-api

# Set permissions
sudo chown -R ec2-user:ec2-user /var/www/milo-api

# Restart service (always works, even if not running)
sudo systemctl stop milo-api 2>/dev/null || true
sudo pkill -f "dotnet.*Milo.API" 2>/dev/null || true
sleep 2
sudo systemctl daemon-reload
sudo systemctl restart milo-api

# Wait and verify
sleep 10
echo ""
echo "Verifying backend is running..."
if curl -s http://localhost:5001/api/health > /dev/null; then
    echo "✅ Backend is running and responding!"
    curl -s http://localhost:5001/api/health
else
    echo "❌ Backend not responding. Check logs:"
    sudo journalctl -u milo-api -n 30 --no-pager
    exit 1
fi

echo ""
echo "========================================"
echo "Deployment Complete"
echo "========================================"

