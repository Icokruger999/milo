#!/bin/bash
# Check backend status on EC2

echo "=== Backend Service Status ==="
sudo systemctl status milo-api.service --no-pager | head -15

echo ""
echo "=== Testing Backend Directly ==="
curl -s http://localhost:5001/api/health || echo "Backend not responding on port 5001"

echo ""
echo "=== Checking if Port 5001 is Listening ==="
sudo netstat -tlnp | grep 5001 || sudo ss -tlnp | grep 5001

echo ""
echo "=== Nginx Configuration ==="
sudo cat /etc/nginx/sites-available/default 2>/dev/null || sudo cat /etc/nginx/nginx.conf | grep -A 20 "server_name api"

echo ""
echo "=== Testing Nginx Proxy ==="
curl -H "Host: api.codingeverest.com" http://localhost/api/health || echo "Nginx proxy not working"

