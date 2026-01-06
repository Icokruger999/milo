# Fix Persistent Port 5000 Issue

Something keeps starting dotnet processes on port 5000. Let's find and stop it.

## Step 1: Disable Service Completely

```bash
sudo systemctl stop milo-api
sudo systemctl disable milo-api
```

## Step 2: Kill ALL dotnet Processes

```bash
# Kill all dotnet processes
sudo pkill -9 dotnet

# Double check - kill by port
sudo fuser -k 5000/tcp

# Verify nothing is running
ps aux | grep dotnet
sudo netstat -tlnp | grep 5000
```

## Step 3: Check What's Starting dotnet

```bash
# Check for other services
sudo systemctl list-units | grep -i milo
sudo systemctl list-units | grep -i dotnet

# Check for cron jobs
crontab -l
sudo crontab -l

# Check for running dotnet processes manually
ps aux | grep dotnet
```

## Step 4: Check if You're Running dotnet Manually

If you have a terminal session running `dotnet Milo.API.dll` manually, that's the issue. Close it or press Ctrl+C.

## Step 5: Clean Restart

```bash
# Make sure everything is stopped
sudo systemctl stop milo-api
sudo pkill -9 dotnet
sudo fuser -k 5000/tcp

# Wait a few seconds
sleep 5

# Verify port is free
sudo netstat -tlnp | grep 5000
# Should return nothing

# Re-enable and start service
sudo systemctl enable milo-api
sudo systemctl start milo-api
sudo systemctl status milo-api
```

## Step 6: If Still Failing - Check Service Configuration

```bash
# Check the service file
cat /etc/systemd/system/milo-api.service

# Check logs for errors
sudo journalctl -u milo-api -n 50 --no-pager
```

## Most Likely Cause

You probably have a terminal window where you manually ran:
```bash
dotnet Milo.API.dll
```

This keeps the process running. Find that terminal and stop it (Ctrl+C), or kill it:
```bash
ps aux | grep "dotnet.*Milo.API"
# Find the PID and kill it
sudo kill -9 <PID>
```

