# Quick Fix via SSM Session Manager

## The Problem
- Network error: Frontend can't connect to backend
- Database connection error: RDS password not configured
- Backend may not be running on port 5001

## Quick Fix Steps

### Option 1: Use Session Manager (Recommended)

1. **Open AWS Console → EC2 → Session Manager**
2. **Connect to instance:** `i-06bc5b2218c041802`
3. **Run these commands:**

```bash
# Navigate to repo
cd /home/ec2-user
sudo chown -R ec2-user:ec2-user milo-repo 2>/dev/null || true
git config --global --add safe.directory /home/ec2-user/milo-repo 2>/dev/null || true

# Get latest code
if [ -d milo-repo ]; then
  cd milo-repo && git pull origin main
else
  git clone https://github.com/Icokruger999/milo.git milo-repo && cd milo-repo
fi

# Build backend
cd backend/Milo.API
export HOME=/home/ec2-user
export DOTNET_CLI_HOME=/home/ec2-user/.dotnet
dotnet restore
dotnet publish -c Release -o /var/www/milo-api

# Update RDS password in appsettings.json
# REPLACE YOUR_RDS_PASSWORD with actual password
cd /var/www/milo-api
sudo cp appsettings.json appsettings.json.backup
sudo sed -i 's/Password=.*;/Password=YOUR_RDS_PASSWORD;/' appsettings.json
sudo sed -i 's/Username=.*;/Username=postgres;/' appsettings.json

# Set permissions
sudo chown -R ec2-user:ec2-user /var/www/milo-api

# Create service file
sudo tee /etc/systemd/system/milo-api.service > /dev/null << 'EOF'
[Unit]
Description=Milo API
After=network.target

[Service]
Type=notify
ExecStart=/usr/bin/dotnet /var/www/milo-api/Milo.API.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=milo-api
User=ec2-user
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://0.0.0.0:5001

[Install]
WantedBy=multi-user.target
EOF

# Restart service
sudo systemctl stop milo-api 2>/dev/null || true
sudo pkill -f "dotnet.*Milo.API" 2>/dev/null || true
sleep 2
sudo systemctl daemon-reload
sudo systemctl enable milo-api
sudo systemctl start milo-api

# Wait and check
sleep 10
sudo systemctl status milo-api --no-pager -l | head -20

# Test API
curl http://localhost:5001/api/health
```

### Option 2: Update RDS Password Only

If backend is already deployed, just update the password:

```bash
cd /var/www/milo-api
sudo sed -i 's/Password=.*;/Password=YOUR_RDS_PASSWORD;/' appsettings.json
sudo systemctl restart milo-api
sleep 5
curl http://localhost:5001/api/health
```

### Verify Everything Works

1. **Check service status:**
   ```bash
   sudo systemctl status milo-api
   ```

2. **Check logs:**
   ```bash
   sudo journalctl -u milo-api -n 50
   ```

3. **Test API locally:**
   ```bash
   curl http://localhost:5001/api/health
   ```

4. **Test from browser:**
   ```
   http://34.246.3.141:5001/api/health
   ```

5. **Test signup from frontend:**
   - Go to: https://www.codingeverest.com/milo-signup.html
   - Should work without network errors

## Common Issues

### "Database connection failed"
- Check RDS password is correct
- Verify RDS security group allows EC2 (port 5432)
- Check RDS endpoint: `codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com`

### "Port 5001 not accessible"
- Check security group allows port 5001 from 0.0.0.0/0
- Verify service is running: `sudo systemctl status milo-api`

### "Service won't start"
- Check logs: `sudo journalctl -u milo-api -n 50`
- Verify .NET runtime: `dotnet --version`
- Check file permissions: `ls -la /var/www/milo-api`

## RDS Credentials

- **Host:** `codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com`
- **Database:** `MiloDB`
- **Username:** `postgres`
- **Password:** (You need to provide this - it was set when RDS was created)

If you don't remember the password, you can reset it in AWS Console:
1. Go to RDS → Databases → codingeverest-new
2. Modify → Change master password
3. Update appsettings.json with new password

