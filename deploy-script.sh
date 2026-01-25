#!/bin/bash
set -e

echo "Starting deployment..."

# Clone repo
cd ~
if [ -d milo-temp ]; then rm -rf milo-temp; fi
git clone https://github.com/Icokruger999/milo.git milo-temp

# Build
cd milo-temp/backend/Milo.API
dotnet publish -c Release -o ~/milo-backend-new

# Stop service
sudo systemctl stop milo-backend
sudo pkill -9 dotnet || true
sleep 2

# Backup and deploy
sudo cp ~/milo-backend/Milo.API.dll ~/milo-backend/Milo.API.dll.backup
sudo cp ~/milo-backend-new/Milo.API.dll ~/milo-backend/Milo.API.dll

# Start service
sudo systemctl start milo-backend
sleep 3
sudo systemctl status milo-backend --no-pager

# Cleanup
cd ~
rm -rf milo-temp milo-backend-new

echo "Deployment complete!"
