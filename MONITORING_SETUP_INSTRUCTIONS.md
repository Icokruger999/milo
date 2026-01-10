# Milo Backend Monitoring & Auto-Recovery Setup

## What Was Fixed

### 1. CORS Issue ✅
**Problem:** Using `SetIsOriginAllowed()` with `AllowCredentials()` is not allowed in .NET Core  
**Fix:** Changed to `WithOrigins()` with explicit origins  
**Status:** Fixed and deployed

### 2. 502 Bad Gateway ✅
**Problem:** Backend process was NOT RUNNING  
**Possible Causes:**
- Process crashed (unhandled exception)
- Out of memory (other apps like Summit consuming resources)
- System reboot (backend not auto-starting)
- Manual stop/kill
- Resource exhaustion

**Fix:** Created comprehensive monitoring system with:
- Auto-restart via systemd service
- Health checks every 2 minutes
- Email alerts to `ico@astutetech.co.za`
- Resource limits (512MB RAM, 50% CPU)

## Monitoring System Features

### ✅ Health Checks (Every 2 Minutes)
- Checks if process is running
- Checks if port 5001 is listening
- Checks if `/api/health` endpoint responds

### ✅ Auto-Recovery
- Automatically restarts backend after 3 consecutive failures
- Uses systemd service first, falls back to manual restart
- Logs all restart attempts

### ✅ Email Alerts
- **Alert Email:** `ico@astutetech.co.za`
- **Cooldown:** 1 hour between alerts (prevents spam)
- **Alert Types:**
  - Service Down (first detection)
  - Restart Success (auto-recovery worked)
  - Restart Failed (manual intervention needed)
  - Directory Missing (deployment issue)

### ✅ Resource Protection
- Memory limit: 512MB (prevents OOM kills)
- CPU limit: 50% (prevents CPU starvation)
- Process isolation per app

## Deployment Instructions

### Option 1: Automated Deployment (Recommended)

Run from your Windows machine:
```powershell
cd c:\milo
.\deploy-monitoring-ssm.ps1
```

This will:
1. Upload monitoring script to EC2
2. Set up systemd service for auto-restart
3. Configure cron job (every 2 minutes)
4. Test the monitoring system

### Option 2: Manual Deployment

SSH into EC2:
```bash
ssh -i your-key.pem ec2-user@34.246.3.141
```

Then run:
```bash
cd ~/codingeverest/milo  # or /tmp if repo is elsewhere
sudo bash setup-milo-monitoring.sh
```

### Option 3: Step-by-Step Manual Setup

1. **Copy monitoring script to EC2:**
```bash
scp -i your-key.pem monitor-milo-backend.sh ec2-user@34.246.3.141:~/
```

2. **SSH into EC2:**
```bash
ssh -i your-key.pem ec2-user@34.246.3.141
```

3. **Install monitoring script:**
```bash
sudo mv ~/monitor-milo-backend.sh /usr/local/bin/milo-monitor.sh
sudo chmod +x /usr/local/bin/milo-monitor.sh
sudo chown ec2-user:ec2-user /usr/local/bin/milo-monitor.sh
```

4. **Setup systemd service (if not exists):**
```bash
sudo tee /etc/systemd/system/milo-backend.service > /dev/null << 'EOF'
[Unit]
Description=Milo API Backend Service
After=network.target

[Service]
Type=notify
User=ec2-user
WorkingDirectory=/home/ec2-user/milo-backend-publish
ExecStart=/usr/bin/dotnet /home/ec2-user/milo-backend-publish/Milo.API.dll --urls http://localhost:5001
Restart=always
RestartSec=10
KillSignal=SIGINT
TimeoutStopSec=30
StandardOutput=append:/home/ec2-user/milo-backend.log
StandardError=append:/home/ec2-user/milo-backend-error.log
MemoryLimit=512M
CPUQuota=50%
Environment=ASPNETCORE_ENVIRONMENT=Production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable milo-backend
sudo systemctl start milo-backend  # Start if not running
```

5. **Setup cron job:**
```bash
# Add cron job (runs every 2 minutes)
(crontab -u ec2-user -l 2>/dev/null | grep -v "milo-monitor.sh"; echo "*/2 * * * * /usr/local/bin/milo-monitor.sh") | crontab -u ec2-user -
```

6. **Create log directory:**
```bash
mkdir -p /home/ec2-user/logs
touch /home/ec2-user/milo-monitor.log
sudo chown ec2-user:ec2-user /home/ec2-user/milo-monitor.log
```

7. **Test monitoring:**
```bash
sudo -u ec2-user /usr/local/bin/milo-monitor.sh
```

## Verification

### Check Monitoring Status
```bash
# View monitoring logs
tail -f /home/ec2-user/milo-monitor.log

# Check cron job
crontab -u ec2-user -l | grep milo-monitor

# Check systemd service
systemctl status milo-backend

# Check backend logs
tail -f /home/ec2-user/milo-backend.log
tail -f /home/ec2-user/milo-backend-error.log
```

### Test Monitoring (Simulate Failure)
```bash
# Stop backend manually
sudo systemctl stop milo-backend

# Wait 2 minutes (monitoring runs every 2 minutes)

# Check if it was restarted
systemctl status milo-backend

# Check monitoring log for restart attempt
tail -20 /home/ec2-user/milo-monitor.log

# Check for email alert in inbox
```

## Monitoring Log Format

```
[2026-01-10 16:30:00] Starting health check...
[2026-01-10 16:30:00] OK: All checks passed
[2026-01-10 16:32:00] Starting health check...
[2026-01-10 16:32:00] FAIL: Backend process not running
[2026-01-10 16:32:00] WARN: 1 check(s) failed (total failures: 1)
[2026-01-10 16:34:00] CRITICAL: 3 consecutive failures detected. Attempting restart...
[2026-01-10 16:34:05] Backend restarted successfully via systemd
[2026-01-10 16:34:05] Alert sent: Milo Backend Restarted
```

## Email Alert Examples

### Service Down Alert
```
Subject: CRITICAL: Milo Backend Service Down

The Milo backend service is currently DOWN.

Details:
- Process: NOT RUNNING
- Port 5001: NOT LISTENING
- Health Endpoint: FAILED

Monitoring system will attempt automatic restart.
If service doesn't recover within 10 minutes, manual intervention required.

Timestamp: 2026-01-10 16:32:00
```

### Restart Success Alert
```
Subject: Milo Backend Restarted

The Milo backend service was automatically restarted and is now running.

Issue: The service had stopped responding.
Action: Restarted via systemd service.
Status: Service is now running and healthy.

Timestamp: 2026-01-10 16:34:05
```

## Troubleshooting

### Monitoring Not Running
```bash
# Check cron job
crontab -u ec2-user -l

# Manually run monitoring
sudo -u ec2-user /usr/local/bin/milo-monitor.sh

# Check permissions
ls -la /usr/local/bin/milo-monitor.sh
```

### Email Alerts Not Sending
```bash
# Test email sending manually
echo "Test email" | mail -s "Test" ico@astutetech.co.za

# Or use curl (fallback method)
curl -s --url "smtps://mail.privateemail.com:587" \
    --mail-from "info@streamyo.net" \
    --mail-rcpt "ico@astutetech.co.za" \
    --user "info@streamyo.net:Stacey@1122" \
    --ssl-reqd \
    --upload-file - <<EOF
From: Milo Monitoring <info@streamyo.net>
To: ico@astutetech.co.za
Subject: Test Alert

This is a test email from Milo monitoring system.
EOF
```

### Backend Keeps Restarting
1. Check error logs: `tail -f /home/ec2-user/milo-backend-error.log`
2. Check for configuration errors in `appsettings.json`
3. Check database connectivity
4. Check for port conflicts: `netstat -tlnp | grep 5001`
5. Check resource usage: `top` or `htop`

## Best Practices

1. **Monitor the monitoring:** Check logs weekly to ensure it's working
2. **Update alert email:** Edit `ALERT_EMAIL` in `/usr/local/bin/milo-monitor.sh` if needed
3. **Adjust resource limits:** If backend needs more RAM/CPU, update systemd service
4. **Review alerts:** Investigate root cause of frequent restarts
5. **Keep logs:** Archive old logs to prevent disk space issues

## Next Steps

1. ✅ Deploy monitoring system to EC2
2. ✅ Test email alerts (stop backend manually)
3. ✅ Verify auto-restart works
4. ⏳ Monitor for first week
5. ⏳ Adjust resource limits if needed
6. ⏳ Set up log rotation (optional)
