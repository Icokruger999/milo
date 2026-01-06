# Stop Service and Kill Process on Port 5000

The service keeps restarting. Stop it first, then kill the process.

## Step-by-Step Fix

### Step 1: Stop the Service (Prevents Auto-Restart)

```bash
sudo systemctl stop milo-api
```

### Step 2: Disable Auto-Start Temporarily

```bash
sudo systemctl disable milo-api
```

### Step 3: Kill the Process on Port 5000

```bash
# Kill the specific PID
sudo kill -9 75281

# Or kill all dotnet processes
sudo pkill -9 dotnet

# Verify port is free
sudo netstat -tlnp | grep 5000
```

### Step 4: Re-enable and Start Service

```bash
sudo systemctl enable milo-api
sudo systemctl start milo-api
sudo systemctl status milo-api
```

### Step 5: Test

```bash
curl http://localhost:5000/api/health
```

## Alternative: Use fuser to Kill Process on Port

```bash
# Stop service first
sudo systemctl stop milo-api

# Kill anything using port 5000
sudo fuser -k 5000/tcp

# Wait a moment
sleep 2

# Start service
sudo systemctl start milo-api
```

## If Process Keeps Coming Back

If the process keeps restarting, check:

```bash
# Check if service is enabled
sudo systemctl is-enabled milo-api

# Check service status
sudo systemctl status milo-api

# Check for multiple services
sudo systemctl list-units | grep milo
```

