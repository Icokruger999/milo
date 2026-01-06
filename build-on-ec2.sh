#!/bin/bash
# Build Milo Backend on EC2 - Run this on EC2 after copying source files

echo "Building Milo Backend on EC2..."

# Install .NET SDK if not installed
if ! command -v dotnet &> /dev/null; then
    echo "Installing .NET SDK 8.0..."
    sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm
    sudo yum install -y dotnet-sdk-8.0
fi

# Navigate to source directory
cd ~/milo-backend || {
    echo "ERROR: ~/milo-backend directory not found"
    echo "Please copy source files first using:"
    echo "  scp -i your-key.pem -r .\backend\Milo.API\* ec2-user@34.246.3.141:~/milo-backend/"
    exit 1
}

# Restore and build
echo "Restoring packages..."
dotnet restore

echo "Building and publishing..."
dotnet publish -c Release -o /var/www/milo-api

# Fix permissions
sudo chown -R ec2-user:ec2-user /var/www/milo-api

echo "Build complete!"
echo "Files are in: /var/www/milo-api/"
ls -la /var/www/milo-api/

