#!/bin/bash
# Update RDS password in appsettings.json on EC2
# Run this in Session Manager

# Replace YOUR_PASSWORD with actual RDS password
RDS_PASSWORD="YOUR_PASSWORD"

cd /var/www/milo-api
sudo cp appsettings.json appsettings.json.backup

# Update connection string
sudo sed -i "s/Password=.*;/Password=${RDS_PASSWORD};/" appsettings.json
sudo sed -i "s/Username=.*;/Username=postgres;/" appsettings.json

# Verify change
echo "Updated connection string:"
grep "DefaultConnection" appsettings.json | sed 's/Password=[^;]*/Password=***/'

# Restart service
sudo systemctl restart milo-api
sleep 5

# Check status
sudo systemctl status milo-api --no-pager | head -15

