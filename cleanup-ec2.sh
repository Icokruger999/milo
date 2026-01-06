#!/bin/bash
# Bash script to clean up old code on EC2 instance
# Run this directly on the EC2 instance: bash cleanup-ec2.sh

echo "========================================"
echo "EC2 Cleanup Script"
echo "========================================"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "This script requires sudo privileges."
    echo "Please run with: sudo bash cleanup-ec2.sh"
    exit 1
fi

echo "This will clean up old code from /var/www"
echo "It will preserve 'milo-api' directory if it exists."
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo "Stopping services..."
# Stop all API/app/backend services
systemctl list-units --type=service --all | grep -E '(api|app|backend|web)' | awk '{print $1}' | xargs -r systemctl stop 2>/dev/null || true

echo "Removing service files..."
# Remove old service files
rm -f /etc/systemd/system/*api*.service
rm -f /etc/systemd/system/*app*.service
rm -f /etc/systemd/system/*backend*.service
rm -f /etc/systemd/system/*web*.service

echo "Cleaning /var/www (preserving milo-api)..."
# Clean /var/www directory
if [ -d /var/www ]; then
    cd /var/www
    for dir in */; do
        if [ -d "$dir" ] && [ "${dir%/}" != "milo-api" ]; then
            echo "  Removing ${dir%/}..."
            rm -rf "${dir%/}"
        fi
    done
fi

echo "Cleaning /opt if needed..."
# Clean /opt if needed
if [ -d /opt ]; then
    rm -rf /opt/*api* /opt/*app* /opt/*backend* 2>/dev/null || true
fi

echo "Reloading systemd..."
systemctl daemon-reload

echo ""
echo "========================================"
echo "Cleanup Complete!"
echo "========================================"
echo ""
echo "Old code has been removed."
echo "You can now deploy the new Milo backend."
echo ""

