#!/bin/bash
# Update RDS connection string on EC2
cd /var/www/milo-api
sudo cp appsettings.json appsettings.json.backup

# Update connection string
sudo sed -i 's|Host=.*;|Host=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com;|' appsettings.json
sudo sed -i 's|Username=.*;|Username=postgres;|' appsettings.json
sudo sed -i 's|Password=.*;|Password=Stacey@1122;|' appsettings.json

# Verify
echo "Updated connection string:"
grep "DefaultConnection" appsettings.json | sed 's/Password=[^;]*/Password=***/'

# Restart service
sudo systemctl restart milo-api
sleep 5

# Check status
echo ""
echo "Service status:"
sudo systemctl status milo-api --no-pager | head -10

# Check database connection
echo ""
echo "Database connection logs:"
sudo journalctl -u milo-api -n 20 --no-pager | grep -i "database\|migration\|success\|fail" || echo "No database messages in recent logs"

# Test API
echo ""
echo "API health check:"
curl -s http://localhost:5001/api/health || echo "API not responding"

