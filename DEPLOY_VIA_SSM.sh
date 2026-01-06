#!/bin/bash
# Complete production deployment via SSM
# This script handles everything: git, build, RDS config, service restart

set -e

export HOME=/home/ec2-user
export DOTNET_CLI_HOME=/home/ec2-user/.dotnet

echo "========================================"
echo "Milo Backend Production Deployment"
echo "========================================"

# Fix git ownership
if [ -d /home/ec2-user/milo-repo ]; then
    sudo chown -R ec2-user:ec2-user /home/ec2-user/milo-repo
    git config --global --add safe.directory /home/ec2-user/milo-repo 2>/dev/null || true
fi

# Get latest code
cd /home/ec2-user
if [ -d milo-repo ]; then
    echo "Updating repository..."
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

# Update appsettings.json - use environment variable for password if set
# Otherwise, keep placeholder for manual update
RDS_PASSWORD="${RDS_PASSWORD:-YOUR_PASSWORD}"
cat > /var/www/milo-api/appsettings.json << EOF
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Host=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com;Database=MiloDB;Username=postgres;Password=${RDS_PASSWORD};Port=5432"
  },
  "Cors": {
    "AllowedOrigins": [
      "https://www.codingeverest.com",
      "https://codingeverest.com",
      "http://www.codingeverest.com",
      "http://codingeverest.com"
    ]
  },
  "EC2": {
    "InstanceId": "i-06bc5b2218c041802",
    "PublicIp": "34.246.3.141",
    "PrivateIp": "172.31.30.186",
    "Region": "us-east-1"
  },
  "Email": {
    "SmtpHost": "mail.privateemail.com",
    "SmtpPort": "587",
    "SmtpUser": "info@streamyo.net",
    "SmtpPassword": "Stacey@1122",
    "FromEmail": "info@streamyo.net",
    "FromName": "Milo - Coding Everest"
  }
}
EOF

# Set permissions
sudo chown -R ec2-user:ec2-user /var/www/milo-api

# Stop service
echo "Stopping service..."
sudo systemctl stop milo-api 2>/dev/null || true
sudo pkill -f "dotnet.*Milo.API" 2>/dev/null || true
sleep 2

# Ensure service file exists
sudo tee /etc/systemd/system/milo-api.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=Milo API
After=network.target

[Service]
Type=notify
ExecStart=/usr/bin/dotnet /var/www/milo-api/Milo.API.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=milo-api
User=ec2-user
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://0.0.0.0:5001

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Start service
echo "Starting service..."
sudo systemctl daemon-reload
sudo systemctl enable milo-api
sudo systemctl start milo-api

# Wait and test
echo "Waiting for service..."
sleep 10

echo "Service status:"
sudo systemctl status milo-api --no-pager -l | head -20

echo "Testing API..."
curl -s http://localhost:5001/api/health || echo "API not responding yet"

echo "========================================"
echo "Deployment Complete"
echo "========================================"

