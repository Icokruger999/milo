# Update RDS Database Credentials

## Current Configuration

The RDS connection string in `appsettings.json` needs to be updated with your database credentials:

```
Host=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
Database=MiloDB
Username=YOUR_USERNAME (needs to be set)
Password=YOUR_PASSWORD (needs to be set)
Port=5432
```

## Option 1: Update appsettings.json on EC2

After deploying, edit `/var/www/milo-api/appsettings.json` on EC2:

```bash
sudo nano /var/www/milo-api/appsettings.json
```

Update the connection string with your RDS credentials, then restart the service:

```bash
sudo systemctl restart milo-api
```

## Option 2: Use Environment Variables (Recommended)

Set environment variables on EC2 instead of storing credentials in the file:

```bash
# Edit the systemd service file
sudo nano /etc/systemd/system/milo-api.service

# Add under [Service] section:
Environment=ConnectionStrings__DefaultConnection="Host=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com;Database=MiloDB;Username=YOUR_USERNAME;Password=YOUR_PASSWORD;Port=5432"

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart milo-api
```

## Verify Connection

After updating credentials, check the logs:

```bash
sudo journalctl -u milo-api -f
```

Look for:
- "Database migrations applied successfully" - Good!
- "Database migration failed" - Check credentials
- Connection errors - Verify RDS security group allows EC2 access

## RDS Security Group

Make sure your RDS security group allows inbound connections from your EC2 instance:
- Type: PostgreSQL
- Port: 5432
- Source: EC2 security group ID or EC2 private IP (172.31.30.186/32)

