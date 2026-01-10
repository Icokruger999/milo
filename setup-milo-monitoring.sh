#!/bin/bash
# Setup script for Milo backend monitoring and auto-recovery
# Run this on EC2: sudo bash setup-milo-monitoring.sh

echo "========================================"
echo "Milo Backend Monitoring Setup"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "This script requires sudo privileges."
    echo "Please run with: sudo bash setup-milo-monitoring.sh"
    exit 1
fi

# Install mailutils for email alerts (if not already installed)
echo "1. Installing mail utilities..."
yum install -y mailx 2>/dev/null || apt-get install -y mailutils 2>/dev/null || echo "Mail utilities already installed or unavailable"

# Copy monitoring script
echo "2. Installing monitoring script..."
cp monitor-milo-backend.sh /usr/local/bin/milo-monitor.sh
chmod +x /usr/local/bin/milo-monitor.sh
chown ec2-user:ec2-user /usr/local/bin/milo-monitor.sh

# Create log directory
echo "3. Setting up log directory..."
mkdir -p /home/ec2-user/logs
chown ec2-user:ec2-user /home/ec2-user/logs
touch /home/ec2-user/milo-monitor.log
chown ec2-user:ec2-user /home/ec2-user/milo-monitor.log

# Setup systemd service (if not already exists)
echo "4. Setting up systemd service..."
if [ ! -f /etc/systemd/system/milo-backend.service ]; then
    cp milo-backend.service /etc/systemd/system/milo-backend.service
    systemctl daemon-reload
    systemctl enable milo-backend
    echo "  ✓ Systemd service installed and enabled"
else
    echo "  ✓ Systemd service already exists"
fi

# Setup cron job for monitoring (runs every 2 minutes)
echo "5. Setting up cron job for health checks..."
CRON_JOB="*/2 * * * * /usr/local/bin/milo-monitor.sh"
(crontab -u ec2-user -l 2>/dev/null | grep -v "milo-monitor.sh"; echo "$CRON_JOB") | crontab -u ec2-user -

echo "6. Verifying setup..."
if [ -f /usr/local/bin/milo-monitor.sh ] && crontab -u ec2-user -l | grep -q "milo-monitor.sh"; then
    echo "  ✓ Monitoring script installed"
    echo "  ✓ Cron job configured"
    echo ""
    echo "========================================"
    echo "Setup Complete!"
    echo "========================================"
    echo ""
    echo "Monitoring will run every 2 minutes."
    echo "Check logs at: /home/ec2-user/milo-monitor.log"
    echo ""
    echo "To test monitoring manually:"
    echo "  sudo -u ec2-user /usr/local/bin/milo-monitor.sh"
    echo ""
    echo "To view monitoring logs:"
    echo "  tail -f /home/ec2-user/milo-monitor.log"
    echo ""
else
    echo "  ✗ Setup verification failed"
    exit 1
fi
