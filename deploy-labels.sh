#!/bin/bash
# Deploy Labels functionality to EC2

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

echo "Deployment complete. Waiting for service to start..."
sleep 10

# Check service status
sudo systemctl status milo-api --no-pager | head -15

