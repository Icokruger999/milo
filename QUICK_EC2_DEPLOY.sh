#!/bin/bash
# Quick EC2 Deployment Script - Run this on EC2

echo "========================================"
echo "Milo Backend Deployment"
echo "========================================"
echo ""

# Check .NET
echo "Checking .NET Runtime..."
if ! command -v dotnet &> /dev/null; then
    echo "Installing .NET 8.0 Runtime..."
    sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm
    sudo yum install -y dotnet-runtime-8.0
else
    echo "✓ .NET found: $(dotnet --version)"
fi

# Create directory
echo ""
echo "Setting up directory..."
sudo mkdir -p /var/www/milo-api
sudo chown -R ec2-user:ec2-user /var/www/milo-api

# Check if files exist
if [ ! -f "/var/www/milo-api/Milo.API.dll" ]; then
    echo "⚠ Files not found in /var/www/milo-api/"
    echo "Please copy files from Windows machine first using:"
    echo "  scp -i your-key.pem -r ./backend/Milo.API/publish/* ec2-user@34.246.3.141:/var/www/milo-api/"
    exit 1
fi

echo "✓ Files found"

# Create service
echo ""
echo "Creating systemd service..."
sudo tee /etc/systemd/system/milo-api.service > /dev/null <<EOF
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
EOF

# Enable and start
echo "Starting service..."
sudo systemctl daemon-reload
sudo systemctl enable milo-api
sudo systemctl restart milo-api

# Wait a moment
sleep 3

# Check status
echo ""
echo "Service status:"
sudo systemctl status milo-api --no-pager

# Test
echo ""
echo "Testing API..."
sleep 2
curl http://localhost:5001/api/health

echo ""
echo ""
echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo ""
echo "API: http://34.246.3.141:5001/api/health"
echo "Login: http://34.246.3.141:5001/api/auth/login"

