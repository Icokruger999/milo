#!/bin/bash
set -e

echo "Starting deployment..."

# Clone repo
cd /home/ec2-user
if [ -d milo-temp ]; then rm -rf milo-temp; fi
git clone https://github.com/Icokruger999/milo.git milo-temp

# Build
cd milo-temp/backend/Milo.API
dotnet publish -c Release -o /home/ec2-user/milo-backend-new

# Stop service
sudo systemctl stop milo-backend
sudo pkill -9 dotnet || true
sleep 2

# Backup and deploy - CORRECT DIRECTORY
sudo cp /home/ec2-user/milo-backend-publish/Milo.API.dll /home/ec2-user/Milo.API.dll.backup
sudo cp /home/ec2-user/milo-backend-new/Milo.API.dll /home/ec2-user/milo-backend-publish/Milo.API.dll

# Start service
sudo systemctl start milo-backend
sleep 3
sudo systemctl status milo-backend --no-pager

# Cleanup
cd /home/ec2-user
rm -rf milo-temp milo-backend-new

echo "Deployment complete!"
