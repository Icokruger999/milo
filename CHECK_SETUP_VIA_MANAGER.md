# Check Setup via AWS Systems Manager (Session Manager)

Use AWS Systems Manager Session Manager to check if the Milo backend setup is correct - no SSH key needed!

## Step 1: Connect via Session Manager

1. Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2/)
2. Select your EC2 instance: `i-06bc5b2218c041802`
3. Click **"Connect"** button
4. Select **"Session Manager"** tab
5. Click **"Connect"**

This opens a browser-based terminal - no SSH key needed!

## Step 2: Check Backend Service Status

```bash
# Check if milo-api service is running
sudo systemctl status milo-api

# Should show: active (running)
```

## Step 3: Check Port Configuration

```bash
# Check what port the service is configured for
cat /etc/systemd/system/milo-api.service | grep ASPNETCORE_URLS

# Should show: Environment=ASPNETCORE_URLS=http://0.0.0.0:5001
# If it shows 5000, it needs to be updated
```

## Step 4: Check if Port 5001 is Listening

```bash
# Check if port 5001 is in use
sudo netstat -tlnp | grep 5001

# Should show: tcp ... 0.0.0.0:5001 ... LISTEN .../dotnet
```

## Step 5: Test Backend API

```bash
# Test health endpoint
curl http://localhost:5001/api/health

# Should return: {"status":"ok","message":"Milo API is running"}

# Test signup endpoint
curl -X POST http://localhost:5001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123"}'

# Should return success response
```

## Step 6: Check Service Logs

```bash
# View recent logs
sudo journalctl -u milo-api -n 50 --no-pager

# Follow logs in real-time
sudo journalctl -u milo-api -f
```

## Step 7: Verify Files Are Present

```bash
# Check if API files exist
ls -la /var/www/milo-api/

# Should show:
# - Milo.API.dll
# - appsettings.json
# - Controllers/ directory
```

## Step 8: Check .NET Runtime

```bash
# Check .NET version
dotnet --version

# Should show: 8.0.x
```

## Common Issues to Check

### Issue 1: Service Not Running
```bash
# If service is stopped, start it
sudo systemctl start milo-api
sudo systemctl enable milo-api
```

### Issue 2: Wrong Port
```bash
# If service shows port 5000, update it
sudo nano /etc/systemd/system/milo-api.service
# Change: Environment=ASPNETCORE_URLS=http://0.0.0.0:5000
# To:     Environment=ASPNETCORE_URLS=http://0.0.0.0:5001
sudo systemctl daemon-reload
sudo systemctl restart milo-api
```

### Issue 3: Port Already in Use
```bash
# Check what's using port 5001
sudo lsof -i :5001

# If it's not milo-api, kill it
sudo kill -9 <PID>
```

## Quick Health Check Script

Run this to check everything at once:

```bash
echo "=== Milo API Health Check ==="
echo ""
echo "1. Service Status:"
sudo systemctl is-active milo-api
echo ""
echo "2. Port Configuration:"
cat /etc/systemd/system/milo-api.service | grep ASPNETCORE_URLS
echo ""
echo "3. Port 5001 Status:"
sudo netstat -tlnp | grep 5001 || echo "Port 5001 not in use"
echo ""
echo "4. API Health Test:"
curl -s http://localhost:5001/api/health || echo "API not responding"
echo ""
echo "5. .NET Version:"
dotnet --version
```

## Expected Results

✅ Service: `active (running)`  
✅ Port Config: `Environment=ASPNETCORE_URLS=http://0.0.0.0:5001`  
✅ Port 5001: `LISTEN` with `dotnet` process  
✅ API Health: `{"status":"ok","message":"Milo API is running"}`  
✅ .NET: `8.0.x`

If all checks pass, the backend is correctly configured!

