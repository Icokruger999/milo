#!/bin/bash
set -e

export HOME=/home/ec2-user
export DOTNET_CLI_HOME=/home/ec2-user/.dotnet

# Clone or update repository
if [ -d "/home/ec2-user/milo-repo" ]; then
    cd /home/ec2-user/milo-repo
    git pull origin main
else
    git clone https://github.com/Icokruger999/milo.git /home/ec2-user/milo-repo
    cd /home/ec2-user/milo-repo
fi

# Build backend
cd backend/Milo.API
dotnet restore
dotnet publish -c Release -o /var/www/milo-api

# Set permissions
sudo chown -R ec2-user:ec2-user /var/www/milo-api

# Restart service
sudo systemctl daemon-reload
sudo systemctl restart milo-api

# Wait and test
sleep 5
curl -s http://localhost:5001/api/health

echo ""
echo "Deployment complete!"

