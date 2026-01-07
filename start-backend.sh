#!/bin/bash
# Start Milo Backend Service on EC2

echo "=== Starting Milo Backend Service ==="
echo ""

# Check if service exists
if systemctl list-unit-files | grep -q milo-api.service; then
    echo "✓ Service found: milo-api.service"
    
    # Start the service
    echo "Starting service..."
    sudo systemctl start milo-api.service
    
    # Enable on boot
    echo "Enabling service to start on boot..."
    sudo systemctl enable milo-api.service
    
    # Wait a moment for service to start
    sleep 5
    
    # Check status
    echo ""
    echo "=== Service Status ==="
    sudo systemctl status milo-api.service --no-pager | head -15
    
    # Test backend
    echo ""
    echo "=== Testing Backend ==="
    sleep 2
    curl -s http://localhost:5001/api/health && echo "" || echo "Backend not responding yet (may need more time)"
    
    echo ""
    echo "=== Port Check ==="
    sudo netstat -tlnp | grep 5001 || sudo ss -tlnp | grep 5001 || echo "Port 5001 not listening"
    
else
    echo "✗ Service milo-api.service not found"
    echo ""
    echo "Available services:"
    systemctl list-unit-files | grep milo || systemctl list-unit-files | grep api
    echo ""
    echo "Please check the service name or deploy the backend first."
fi

