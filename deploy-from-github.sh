#!/bin/bash
# Deploy Milo Backend from GitHub to EC2
# Run this script on EC2

echo "========================================"
echo "Deploying Milo Backend from GitHub"
echo "========================================"
echo ""

# Install .NET SDK if not installed
if ! command -v dotnet &> /dev/null; then
    echo "Installing .NET SDK 8.0..."
    sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm
    sudo yum install -y dotnet-sdk-8.0
    echo "✓ .NET SDK installed"
else
    echo "✓ .NET SDK found: $(dotnet --version)"
fi

# Install git if not installed
if ! command -v git &> /dev/null; then
    echo "Installing git..."
    sudo yum install -y git
    echo "✓ Git installed"
else
    echo "✓ Git found: $(git --version)"
fi

# Clone or update repository
REPO_DIR="$HOME/milo-repo"
if [ -d "$REPO_DIR" ]; then
    echo ""
    echo "Updating existing repository..."
    cd "$REPO_DIR"
    git pull origin main
else
    echo ""
    echo "Cloning repository from GitHub..."
    git clone https://github.com/Icokruger999/milo.git "$REPO_DIR"
    cd "$REPO_DIR"
fi

echo "✓ Repository ready"

# Build the backend
echo ""
echo "Building backend application..."
cd "$REPO_DIR/backend/Milo.API"

dotnet restore
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to restore packages"
    exit 1
fi

dotnet publish -c Release -o /var/www/milo-api
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to build application"
    exit 1
fi

echo "✓ Build successful"

# Set permissions
echo ""
echo "Setting permissions..."
sudo chown -R ec2-user:ec2-user /var/www/milo-api
sudo chmod -R 755 /var/www/milo-api

# Create systemd service if it doesn't exist
if [ ! -f "/etc/systemd/system/milo-api.service" ]; then
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
    echo "✓ Service file created"
fi

# Enable and start service
echo ""
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

# Test API
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
echo ""
echo "To update in future, just run this script again!"

