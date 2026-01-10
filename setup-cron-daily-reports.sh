#!/bin/bash
# Setup Cron Job for Daily Incident Reports
# This script sets up a cron job to send daily reports at 8 AM

echo "=== Setting up Daily Reports Cron Job ==="

# Create the cron script
cat > /home/ec2-user/send-daily-reports.sh << 'CRONSCRIPT'
#!/bin/bash
# Send Daily Incident Reports
# This script is run by cron to send daily reports

LOG_FILE="/home/ec2-user/logs/daily-reports.log"
mkdir -p /home/ec2-user/logs

echo "$(date): Starting daily report send" >> "$LOG_FILE"

# Call the API endpoint to send reports
RESPONSE=$(curl -s -X POST https://api.codingeverest.com/api/reports/incidents/send-daily)

echo "$(date): Response: $RESPONSE" >> "$LOG_FILE"

# Check if successful
if echo "$RESPONSE" | grep -q '"sent"'; then
    echo "$(date): Daily reports sent successfully" >> "$LOG_FILE"
else
    echo "$(date): ERROR: Failed to send daily reports" >> "$LOG_FILE"
fi
CRONSCRIPT

# Make it executable
chmod +x /home/ec2-user/send-daily-reports.sh

# Add to crontab (runs at 8 AM every day)
(crontab -l 2>/dev/null | grep -v "send-daily-reports.sh"; echo "0 8 * * * /home/ec2-user/send-daily-reports.sh") | crontab -

echo "Cron job installed successfully!"
echo "Daily reports will be sent at 8:00 AM every day"
echo ""
echo "To view cron jobs: crontab -l"
echo "To view logs: tail -f /home/ec2-user/logs/daily-reports.log"
echo "To test manually: /home/ec2-user/send-daily-reports.sh"
