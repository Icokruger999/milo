#!/bin/bash
set -e

echo "Stopping milo-api service..."
sudo systemctl stop milo-api || true
sleep 3

echo "Killing any processes on port 5000..."
sudo lsof -ti:5000 | xargs sudo kill -9 2>/dev/null || echo "Port 5000 is free"
sleep 2

echo "Reloading systemd..."
sudo systemctl daemon-reload

echo "Starting milo-api..."
sudo systemctl start milo-api
sleep 15

echo "Checking service status..."
sudo systemctl status milo-api --no-pager | head -20

echo ""
echo "Checking recent logs for migration activity..."
sudo journalctl -u milo-api -n 50 --no-pager | grep -i -E "(migration|database|started|running)" | tail -15
