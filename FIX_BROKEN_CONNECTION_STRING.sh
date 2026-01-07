#!/bin/bash
# Fix the broken connection string - it's missing Database, Username, Password

cd /var/www/milo-api

# Create correct appsettings.json
sudo tee appsettings.json > /dev/null << 'EOF'
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Host=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com;Database=MiloDB;Username=postgres;Password=Stacey@1122;Port=5432"
  },
  "Cors": {
    "AllowedOrigins": [
      "https://www.codingeverest.com",
      "https://codingeverest.com",
      "http://www.codingeverest.com",
      "http://codingeverest.com"
    ]
  },
  "EC2": {
    "InstanceId": "i-06bc5b2218c041802",
    "PublicIp": "34.246.3.141",
    "PrivateIp": "172.31.30.186",
    "Region": "us-east-1"
  },
  "Email": {
    "SmtpHost": "mail.privateemail.com",
    "SmtpPort": "587",
    "SmtpUser": "info@streamyo.net",
    "SmtpPassword": "Stacey@1122",
    "FromEmail": "info@streamyo.net",
    "FromName": "Milo - Coding Everest"
  }
}
EOF

# Verify
echo "Connection string:"
grep "DefaultConnection" appsettings.json | sed 's/Password=[^;]*/Password=***/'

# Restart service
echo ""
echo "Restarting service..."
sudo systemctl restart milo-api
sleep 8

# Check status
echo ""
echo "Service status:"
sudo systemctl status milo-api --no-pager | head -15

# Check database connection
echo ""
echo "Database logs:"
sudo journalctl -u milo-api -n 20 --no-pager | grep -i "database\|migration\|success\|fail" | tail -5

# Test API
echo ""
echo "API test:"
curl -s http://localhost:5001/api/health || echo "API not responding"

