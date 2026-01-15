#!/bin/bash
# Ensure milo-backend service is always running and enabled on boot

echo "=== Ensuring milo-backend service is always running ==="

# Enable service to start on boot
sudo systemctl enable milo-backend
echo "✅ Service enabled to start on boot"

# Check if service is running
if systemctl is-active --quiet milo-backend; then
    echo "✅ Service is currently running"
else
    echo "⚠️  Service is not running, starting it..."
    sudo systemctl start milo-backend
    sleep 3
    if systemctl is-active --quiet milo-backend; then
        echo "✅ Service started successfully"
    else
        echo "❌ Failed to start service"
        exit 1
    fi
fi

# Verify service status
echo ""
echo "=== Service Status ==="
sudo systemctl status milo-backend --no-pager | head -15

# Check if service is enabled
if systemctl is-enabled --quiet milo-backend; then
    echo ""
    echo "✅ Service is enabled to start on boot"
else
    echo ""
    echo "⚠️  Service is not enabled, enabling now..."
    sudo systemctl enable milo-backend
    echo "✅ Service enabled"
fi

echo ""
echo "=== Summary ==="
echo "Service will automatically:"
echo "  - Start on system boot"
echo "  - Restart if it crashes (Restart=always)"
echo "  - Restart after 10 seconds if it fails (RestartSec=10)"
echo ""
echo "✅ Backend will always be available 24/7"
