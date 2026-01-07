#!/bin/bash
# Directly write appsettings.json with correct password

sudo tee /var/www/milo-api/appsettings.json > /dev/null << 'ENDOFFILE'
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Host=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com;Database=MiloDB;Username=postgres;Password=Stacey1122;Port=5432"
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
ENDOFFILE

echo "File written. Restarting service..."
sudo systemctl restart milo-api
sleep 8
echo "Service status:"
sudo systemctl status milo-api --no-pager | head -20

