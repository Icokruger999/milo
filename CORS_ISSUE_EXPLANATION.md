# What Caused the CORS/502 Issue

## Summary

The issue had **two parts**:
1. **CORS Configuration Error** - Backend was rejecting preflight requests
2. **Backend Process Stopped** - The API wasn't running (502 Bad Gateway)

## Part 1: CORS Issue Explained

### What Was Wrong

The original CORS configuration used:
```csharp
policy.SetIsOriginAllowed(origin => { ... })  // Function-based origin checking
    .AllowCredentials()  // Credentials enabled
```

**Why This Failed:**
- When `AllowCredentials()` is enabled, .NET Core **requires explicit origins** using `WithOrigins()`
- Security restriction: Dynamic origin checking with functions is **not allowed** when credentials are enabled
- This prevents CORS preflight (OPTIONS) requests from succeeding
- Result: Browser blocks all API requests with CORS error

### The Fix

Changed to explicit origins:
```csharp
policy.WithOrigins(
        "https://www.codingeverest.com",
        "https://codingeverest.com",
        "http://www.codingeverest.com",
        "http://codingeverest.com"
    )
    .AllowCredentials()  // Now works correctly
```

**Why This Works:**
- Explicit origin list is allowed with credentials
- Preflight requests now succeed
- Browser allows API calls

## Part 2: 502 Bad Gateway (Backend Not Running)

### What Happened

The backend process (`Milo.API.dll`) was **not running**:
- Process check: `NOT RUNNING`
- Port 5001: `not listening`
- Health endpoint: `failed`

### Possible Causes

1. **Process Crashed** - Unhandled exception or error
2. **Out of Memory** - Other apps on EC2 consumed resources
3. **System Reboot** - EC2 instance restarted (backend not auto-starting)
4. **Manual Stop** - Process was manually killed or stopped
5. **Port Conflict** - Another app tried to use port 5001 (less likely)

### Why Other Apps Could Cause This

If **Summit or other apps** on the same EC2 instance:
- Use too much **memory** → Could trigger OOM killer, killing Milo
- Use too much **CPU** → Could prevent Milo from responding
- Cause **system instability** → Could crash Milo process
- Restart **nginx** incorrectly → Could break routing

### Prevention Measures

1. **Resource Limits** - Added to systemd service:
   ```
   MemoryLimit=512M
   CPUQuota=50%
   ```

2. **Auto-Restart** - Systemd service with:
   ```
   Restart=always
   RestartSec=10
   ```

3. **Health Monitoring** - Cron job checks every 2 minutes
4. **Email Alerts** - Notifies when API is down
5. **Process Isolation** - Each app runs in separate user/service

## Prevention Strategy

### 1. Systemd Service (Already Created)
- Auto-restart on failure
- Resource limits to prevent interference
- Proper logging

### 2. Health Monitoring Script (Created)
- Runs every 2 minutes via cron
- Checks process, port, and health endpoint
- Auto-restarts if failures detected
- Sends email alerts

### 3. Email Alerts
- Alerts sent to: `ico@astutetech.co.za`
- Cooldown: 1 hour between alerts (prevents spam)
- Different alert types:
  - Service down
  - Restart success
  - Restart failed
  - Directory missing

### 4. Monitoring Checks
- Process running: `pgrep -f Milo.API.dll`
- Port listening: `netstat/ss -tlnp | grep :5001`
- Health endpoint: `curl http://localhost:5001/api/health`

## Next Steps

1. **Deploy monitoring script** to EC2
2. **Setup cron job** for automatic checks
3. **Test alert system** by stopping backend manually
4. **Monitor logs** for first few days
5. **Adjust resource limits** if needed based on usage

## Monitoring Commands

```bash
# Check monitoring logs
tail -f /home/ec2-user/milo-monitor.log

# Manually run health check
sudo -u ec2-user /usr/local/bin/milo-monitor.sh

# Check systemd service status
systemctl status milo-backend

# Check if monitoring cron job is active
crontab -u ec2-user -l

# View backend logs
tail -f /home/ec2-user/milo-backend.log
tail -f /home/ec2-user/milo-backend-error.log
```
