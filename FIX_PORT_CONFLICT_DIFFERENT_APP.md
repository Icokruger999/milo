# Fix Port Conflict - Different App Using Port 5000

You have `CodingEverest.Web` running on port 5000, which conflicts with `milo-api`.

## Option 1: Stop CodingEverest.Web and Use Port 5000 for Milo

```bash
# Kill the CodingEverest.Web process
sudo kill -9 75833

# Verify port is free
sudo netstat -tlnp | grep 5000

# Start milo-api service
sudo systemctl start milo-api
sudo systemctl status milo-api
```

## Option 2: Run Milo-API on Different Port (5001)

### Step 1: Update Service File

```bash
sudo nano /etc/systemd/system/milo-api.service
```

Change this line:
```
Environment=ASPNETCORE_URLS=http://0.0.0.0:5000
```

To:
```
Environment=ASPNETCORE_URLS=http://0.0.0.0:5001
```

### Step 2: Reload and Restart

```bash
sudo systemctl daemon-reload
sudo systemctl restart milo-api
sudo systemctl status milo-api
```

### Step 3: Test

```bash
curl http://localhost:5001/api/health
```

### Step 4: Update Frontend Config

If using port 5001, update `frontend/js/config.js`:
```javascript
baseURL: 'http://34.246.3.141:5001/api'
```

## Option 3: Change CodingEverest.Web to Different Port

If you want to keep CodingEverest.Web running:

1. Find its service or startup script
2. Change its port to something else (e.g., 5001)
3. Then milo-api can use port 5000

## Check What's Running

```bash
# See all dotnet processes
ps aux | grep dotnet

# See all services
sudo systemctl list-units | grep -E "(milo|codingeverest)"

# See what's on each port
sudo netstat -tlnp | grep -E "(5000|5001)"
```

