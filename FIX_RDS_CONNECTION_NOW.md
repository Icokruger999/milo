# Fix RDS Connection - IMMEDIATE FIX

## The Problem
Backend is trying to connect to `127.0.0.1:5432` (localhost) instead of RDS because the connection string has placeholders.

## Quick Fix - Run in Session Manager

Replace `YOUR_ACTUAL_PASSWORD` with your RDS password:

```bash
cd /var/www/milo-api
sudo cp appsettings.json appsettings.json.backup

# Update connection string with actual RDS credentials
sudo tee -a /tmp/update_conn.sh > /dev/null << 'SCRIPT'
cat > /var/www/milo-api/appsettings.json << 'EOF'
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Host=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com;Database=MiloDB;Username=postgres;Password=YOUR_ACTUAL_PASSWORD;Port=5432"
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
SCRIPT

sudo bash /tmp/update_conn.sh
```

**OR simpler - just update the password:**

```bash
cd /var/www/milo-api
sudo sed -i 's/Password=.*;/Password=YOUR_ACTUAL_PASSWORD;/' appsettings.json
sudo sed -i 's/Username=.*;/Username=postgres;/' appsettings.json
sudo sed -i 's/Host=.*;/Host=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com;/' appsettings.json
```

Then restart:
```bash
sudo systemctl restart milo-api
sleep 5
curl http://localhost:5001/api/health
```

## Verify It Works

```bash
sudo journalctl -u milo-api -n 20 | grep -i "database\|migration\|error"
```

Should see: "Database migrations applied successfully" (no errors)

## Test Login

Go to: `https://www.codingeverest.com/milo-login.html`

Should work now!

