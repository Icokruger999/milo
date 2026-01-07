# Correct Commands - Copy/Paste in Session Manager

## Step 1: Fix appsettings.json

Run this ONE command (it recreates the entire file correctly):

```bash
cd /var/www/milo-api && sudo tee appsettings.json > /dev/null << 'ENDOFFILE'
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
ENDOFFILE
```

## Step 2: Verify it's correct

```bash
grep "DefaultConnection" /var/www/milo-api/appsettings.json
```

Should show: `"DefaultConnection": "Host=codingeverest-new...Database=MiloDB;Username=postgres;Password=Stacey@1122;Port=5432"`

## Step 3: Restart service

```bash
sudo systemctl restart milo-api
```

## Step 4: Wait and check status

```bash
sleep 10
sudo systemctl status milo-api
```

Should show: `Active: active (running)`

## Step 5: Check database connection

```bash
sudo journalctl -u milo-api -n 30 | grep -i "database\|migration\|success"
```

Should see: `"Database migrations applied successfully"` (NOT "Failed to connect")

## Step 6: Test API

```bash
curl http://localhost:5001/api/health
```

Should return: `{"status":"ok","message":"Milo API is running"}`

## Done!

Now test login at: `https://www.codingeverest.com/milo-login.html`

