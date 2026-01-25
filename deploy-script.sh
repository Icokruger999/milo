#!/bin/bash
set -e

echo "Starting deployment..."

# Clone repo
cd /home/ubuntu
if [ -d milo-temp ]; then rm -rf milo-temp; fi
git clone https://github.com/Icokruger999/milo.git milo-temp

# Build
cd milo-temp/backend/Milo.API
dotnet publish -c Release -o /home/ubuntu/milo-backend-new

# Stop service
sudo systemctl stop milo-backend
pkill -9 dotnet || true
sleep 2

# Backup and deploy
cp /home/ubuntu/milo-backend/Milo.API.dll /home/ubuntu/milo-backend/Milo.API.dll.backup
cp /home/ubuntu/milo-backend-new/Milo.API.dll /home/ubuntu/milo-backend/Milo.API.dll

# Start service
sudo systemctl start milo-backend
sleep 3
sudo systemctl status milo-backend --no-pager

# Cleanup
cd /home/ubuntu
rm -rf milo-temp milo-backend-new

echo "Deployment complete!"
