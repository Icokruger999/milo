# Fix Port 5000 Conflict - Kill Orphaned Process

The service can't start because port 5000 is already in use by an old dotnet process.

## Quick Fix - Run These Commands on EC2

### Step 1: Kill the Process Using Port 5000

```bash
# Find and kill the process
sudo kill -9 63140

# Or kill all dotnet processes (if needed)
sudo pkill -9 dotnet

# Verify port is free
sudo netstat -tlnp | grep 5000
```

### Step 2: Restart the Service

```bash
sudo systemctl restart milo-api
sudo systemctl status milo-api
```

### Step 3: Verify It's Working

```bash
curl http://localhost:5000/api/health
```

## Alternative: Find and Kill Any Process on Port 5000

If you don't know the PID:

```bash
# Find what's using port 5000
sudo lsof -i :5000

# Kill it (replace PID with the actual process ID)
sudo kill -9 <PID>

# Or use fuser
sudo fuser -k 5000/tcp
```

## Prevent This in the Future

The service should automatically stop old processes, but if this happens again:

1. Check service status: `sudo systemctl status milo-api`
2. Stop service properly: `sudo systemctl stop milo-api`
3. Wait a few seconds: `sleep 3`
4. Start service: `sudo systemctl start milo-api`

