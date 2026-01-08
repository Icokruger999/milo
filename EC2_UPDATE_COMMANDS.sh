#!/bin/bash
# Update EC2 Backend - Complete Commands

cd ~/milo || cd /home/ec2-user/milo
echo "=== Pulling latest code ==="
git pull origin main

echo ""
echo "=== Installing dotnet-ef tool ==="
dotnet tool install --global dotnet-ef --version 8.0.0 || \
dotnet tool install --global dotnet-ef --version 7.0.0 || \
echo "dotnet-ef may already be installed"

export PATH="$PATH:$HOME/.dotnet/tools"

echo ""
echo "=== Navigating to API directory ==="
cd backend/Milo.API

echo ""
echo "=== Restoring packages ==="
dotnet restore

echo ""
echo "=== Building project ==="
dotnet build

if [ $? -eq 0 ]; then
    echo ""
    echo "=== Build successful! Creating migration ==="
    dotnet ef migrations add AddFlakesAndTaskType --output-dir Data/Migrations || \
    echo "Migration may already exist"
    
    echo ""
    echo "=== Building again after migration ==="
    dotnet build
    
    echo ""
    echo "=== Restarting service ==="
    sudo systemctl restart milo-api.service
    
    echo ""
    echo "=== Checking service status ==="
    sleep 3
    sudo systemctl status milo-api.service --no-pager | head -20
    
    echo ""
    echo "=== Testing API health ==="
    curl -s http://localhost:5001/api/health || echo "Backend check failed"
else
    echo ""
    echo "=== Build failed! Please check errors above ==="
    exit 1
fi

