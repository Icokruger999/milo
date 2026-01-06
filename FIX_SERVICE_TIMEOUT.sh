#!/bin/bash
# Fix milo-api service timeout issue
# Run this via AWS Systems Manager Session Manager

echo "========================================"
echo "Fixing milo-api Service Timeout"
echo "========================================"
echo ""

# Step 1: Check current service status
echo "1. Checking service status..."
sudo systemctl status milo-api --no-pager -l
echo ""

# Step 2: Check service logs for errors
echo "2. Checking recent service logs..."
sudo journalctl -u milo-api -n 50 --no-pager
echo ""

# Step 3: Check if port 5001 is in use
echo "3. Checking port 5001..."
sudo netstat -tlnp | grep 5001 || echo "Port 5001 is free"
echo ""

# Step 4: Check service configuration
echo "4. Checking service configuration..."
cat /etc/systemd/system/milo-api.service
echo ""

# Step 5: Check if files exist
echo "5. Checking if API files exist..."
ls -la /var/www/milo-api/ | head -20
echo ""

# Step 6: Check if Milo.API.dll exists
echo "6. Checking for Milo.API.dll..."
if [ -f "/var/www/milo-api/Milo.API.dll" ]; then
    echo "✓ Milo.API.dll found"
    ls -lh /var/www/milo-api/Milo.API.dll
else
    echo "✗ ERROR: Milo.API.dll not found!"
    echo "Files in /var/www/milo-api/:"
    ls -la /var/www/milo-api/
fi
echo ""

# Step 7: Check .NET runtime
echo "7. Checking .NET runtime..."
dotnet --version
which dotnet
echo ""

# Step 8: Try to run manually to see error
echo "8. Attempting to run manually to see error..."
cd /var/www/milo-api
timeout 5 dotnet Milo.API.dll 2>&1 || echo "Manual run completed or timed out"
echo ""

# Step 9: Fix service timeout - increase timeout
echo "9. Updating service to increase timeout..."
sudo sed -i 's/\[Service\]/[Service]\nTimeoutStartSec=60/' /etc/systemd/system/milo-api.service
sudo systemctl daemon-reload
echo "✓ Service timeout increased to 60 seconds"
echo ""

# Step 10: Stop any existing processes
echo "10. Stopping any existing processes..."
sudo systemctl stop milo-api 2>/dev/null || true
sudo pkill -f "dotnet.*Milo.API" 2>/dev/null || true
sleep 2
echo ""

# Step 11: Verify port is free
echo "11. Verifying port 5001 is free..."
if sudo netstat -tlnp | grep -q ":5001"; then
    echo "⚠ Port 5001 is still in use. Killing process..."
    sudo fuser -k 5001/tcp 2>/dev/null || true
    sleep 2
fi
echo ""

# Step 12: Start service
echo "12. Starting service..."
sudo systemctl start milo-api
sleep 3

# Step 13: Check status
echo "13. Checking service status..."
sudo systemctl status milo-api --no-pager -l
echo ""

# Step 14: Test API
echo "14. Testing API endpoint..."
sleep 2
if curl -s http://localhost:5001/api/health > /dev/null; then
    echo "✓ API is responding!"
    curl http://localhost:5001/api/health
else
    echo "✗ API is not responding"
    echo "Check logs: sudo journalctl -u milo-api -n 100 --no-pager"
fi
echo ""

echo "========================================"
echo "Troubleshooting Complete"
echo "========================================"
echo ""
echo "If service still fails, check logs:"
echo "  sudo journalctl -u milo-api -n 100 --no-pager"
echo ""

