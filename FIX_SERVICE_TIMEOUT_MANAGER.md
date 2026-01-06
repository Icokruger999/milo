# Fix Service Timeout via AWS Systems Manager

The service is timing out. Use Session Manager to fix it.

## Quick Fix - Run This Script

### Step 1: Connect via Session Manager

1. Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2/)
2. Select instance: `i-06bc5b2218c041802`
3. Click **"Connect"** → **"Session Manager"** → **"Connect"**

### Step 2: Run the Fix Script

Copy and paste this entire script into the Session Manager terminal:

```bash
# Download and run the fix script
cd ~
curl -O https://raw.githubusercontent.com/Icokruger999/milo/main/FIX_SERVICE_TIMEOUT.sh
chmod +x FIX_SERVICE_TIMEOUT.sh
./FIX_SERVICE_TIMEOUT.sh
```

Or run the commands manually:

## Manual Fix Steps

### Step 1: Check Service Status and Logs

```bash
# Check service status
sudo systemctl status milo-api --no-pager -l

# Check recent logs
sudo journalctl -u milo-api -n 50 --no-pager
```

### Step 2: Increase Service Timeout

The timeout might be too short. Update the service file:

```bash
# Edit service file
sudo nano /etc/systemd/system/milo-api.service
```

Add this line under `[Service]`:
```ini
[Service]
Type=notify
ExecStart=/usr/bin/dotnet /var/www/milo-api/Milo.API.dll
Restart=always
RestartSec=10
TimeoutStartSec=60
KillSignal=SIGINT
SyslogIdentifier=milo-api
User=ec2-user
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://0.0.0.0:5001
```

Save and exit (Ctrl+X, Y, Enter)

### Step 3: Reload and Restart

```bash
# Reload systemd
sudo systemctl daemon-reload

# Stop any existing process
sudo systemctl stop milo-api
sudo pkill -f "dotnet.*Milo.API" 2>/dev/null || true

# Wait a moment
sleep 2

# Start service
sudo systemctl start milo-api

# Check status
sudo systemctl status milo-api
```

### Step 4: Check for Common Issues

```bash
# Check if files exist
ls -la /var/www/milo-api/Milo.API.dll

# Check if port is in use
sudo netstat -tlnp | grep 5001

# Try running manually to see error
cd /var/www/milo-api
dotnet Milo.API.dll
```

If manual run shows an error, that's the issue!

### Step 5: Test API

```bash
# Wait a few seconds
sleep 3

# Test health endpoint
curl http://localhost:5001/api/health
```

## Common Issues and Fixes

### Issue 1: Missing Dependencies

If you see errors about missing DLLs:

```bash
# Check if all files were copied
ls -la /var/www/milo-api/

# Rebuild and copy
cd ~/milo/backend/Milo.API
dotnet publish -c Release -o /var/www/milo-api
sudo chown -R ec2-user:ec2-user /var/www/milo-api
```

### Issue 2: Port Already in Use

```bash
# Find what's using port 5001
sudo lsof -i :5001

# Kill it
sudo kill -9 <PID>

# Or kill all dotnet processes
sudo pkill -9 dotnet
```

### Issue 3: Wrong Port Configuration

```bash
# Check service configuration
cat /etc/systemd/system/milo-api.service | grep ASPNETCORE_URLS

# Should show: Environment=ASPNETCORE_URLS=http://0.0.0.0:5001
# If it shows 5000, update it (see Step 2)
```

### Issue 4: Missing Email Service (New Dependency)

The new email service might need MailKit. Check if it's included:

```bash
# Check if MailKit is in the published files
ls -la /var/www/milo-api/ | grep -i mailkit

# If missing, rebuild
cd ~/milo/backend/Milo.API
dotnet restore
dotnet publish -c Release -o /var/www/milo-api
```

## Quick Diagnostic Commands

Run these to get a full picture:

```bash
echo "=== Service Status ==="
sudo systemctl status milo-api --no-pager

echo ""
echo "=== Recent Logs ==="
sudo journalctl -u milo-api -n 30 --no-pager

echo ""
echo "=== Port Status ==="
sudo netstat -tlnp | grep 5001

echo ""
echo "=== Files Check ==="
ls -lh /var/www/milo-api/Milo.API.dll

echo ""
echo "=== .NET Version ==="
dotnet --version
```

## If Still Failing

Share the output of:

```bash
sudo journalctl -u milo-api -n 100 --no-pager
```

This will show the exact error causing the timeout.

