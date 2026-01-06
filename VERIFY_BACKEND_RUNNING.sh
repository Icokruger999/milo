#!/bin/bash
# Quick script to verify backend is running and accessible
# Run this on EC2 via Session Manager

echo "========================================"
echo "Backend Status Check"
echo "========================================"

# Check service status
echo "1. Service Status:"
sudo systemctl status milo-api --no-pager -l | head -15

# Check if port is listening
echo ""
echo "2. Port 5001 Listening:"
sudo netstat -tlnp | grep 5001 || echo "Port 5001 not listening"

# Test local API
echo ""
echo "3. Local API Test:"
curl -s http://localhost:5001/api/health || echo "API not responding locally"

# Check recent logs
echo ""
echo "4. Recent Logs (last 20 lines):"
sudo journalctl -u milo-api -n 20 --no-pager

echo ""
echo "========================================"

