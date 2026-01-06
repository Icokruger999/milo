#!/bin/bash
# Copy and paste this entire script into Session Manager

cd /var/www/milo-api
sudo cp appsettings.json appsettings.json.backup

# Update RDS connection string
sudo sed -i 's|Host=.*;|Host=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com;|' appsettings.json
sudo sed -i 's|Username=.*;|Username=postgres;|' appsettings.json
sudo sed -i 's|Password=.*;|Password=Stacey@1122;|' appsettings.json

# Verify
echo "Updated connection string:"
grep "DefaultConnection" appsettings.json | sed 's/Password=[^;]*/Password=***/'

# Restart service
sudo systemctl restart milo-api
sleep 5

# Check logs
echo ""
echo "Database connection status:"
sudo journalctl -u milo-api -n 30 --no-pager | grep -i "database\|migration" | tail -5

# Test API
echo ""
echo "API health:"
curl -s http://localhost:5001/api/health

echo ""
echo "Done! Try logging in now."

