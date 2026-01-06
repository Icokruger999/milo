#!/bin/bash
# Quick deployment script for EC2
# Run this on EC2 via Session Manager or SSH

set -e

export HOME=/home/ec2-user
export DOTNET_CLI_HOME=/home/ec2-user/.dotnet

echo "========================================"
echo "Deploying Milo Backend"
echo "========================================"

# Navigate to repo
cd /home/ec2-user
if [ -d milo-repo ]; then
    echo "Updating existing repository..."
    cd milo-repo
    git pull origin main
else
    echo "Cloning repository..."
    git clone https://github.com/Icokruger999/milo.git milo-repo
    cd milo-repo
fi

# Build backend
echo "Building backend..."
cd backend/Milo.API
dotnet restore
dotnet publish -c Release -o /var/www/milo-api

# Set permissions
echo "Setting permissions..."
sudo chown -R ec2-user:ec2-user /var/www/milo-api

# Stop service if running
echo "Stopping service..."
sudo systemctl stop milo-api || true
sudo pkill -f "dotnet.*Milo.API" || true
sleep 2

# Restart service
echo "Starting service..."
sudo systemctl daemon-reload
sudo systemctl start milo-api

# Wait and test
echo "Waiting for service to start..."
sleep 5

if curl -s http://localhost:5001/api/health > /dev/null; then
    echo "✅ Deployment successful! API is responding."
else
    echo "⚠️  API may not be responding yet. Check with: sudo systemctl status milo-api"
fi

echo "========================================"
echo "Deployment Complete"
echo "========================================"

