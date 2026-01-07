#!/bin/bash
echo "========================================"
echo "RDS Connection Diagnostics"
echo "========================================"

echo ""
echo "1. Testing RDS port connectivity..."
timeout 5 bash -c '</dev/tcp/codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com/5432' && echo "SUCCESS: Port 5432 is REACHABLE" || echo "FAILED: Port 5432 is NOT REACHABLE"

echo ""
echo "2. Checking appsettings.json connection string..."
cat /var/www/milo-api/appsettings.json | grep -A 5 "ConnectionStrings"

echo ""
echo "3. Checking backend service status..."
sudo systemctl status milo-api --no-pager | head -20

echo ""
echo "4. Checking recent logs for database errors..."
sudo journalctl -u milo-api -n 50 --no-pager | grep -i "database\|connection\|migration\|postgres\|127.0.0.1"

echo ""
echo "5. Testing DNS resolution..."
nslookup codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com

echo ""
echo "========================================"
echo "Diagnostics Complete"
echo "========================================"

