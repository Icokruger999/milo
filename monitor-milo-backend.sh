#!/bin/bash
# Health check and auto-recovery script for Milo backend
# Run this script via cron every 1-2 minutes

ALERT_EMAIL="ico@astutetech.co.za"
LOG_FILE="/home/ec2-user/milo-monitor.log"
HEALTH_CHECK_URL="http://localhost:5001/api/health"
MAX_FAILURES=3
ALERT_COOLDOWN=3600  # Don't send alerts more than once per hour
LAST_ALERT_FILE="/tmp/milo-last-alert"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Function to send alert email
send_alert() {
    local subject="$1"
    local body="$2"
    local alert_key="$3"
    
    # Check cooldown period
    if [ -f "$LAST_ALERT_FILE.$alert_key" ]; then
        local last_alert=$(cat "$LAST_ALERT_FILE.$alert_key" 2>/dev/null || echo "0")
        local now=$(date +%s)
        local time_since=$((now - last_alert))
        
        if [ $time_since -lt $ALERT_COOLDOWN ]; then
            log "Alert skipped (cooldown: $((ALERT_COOLDOWN - time_since))s remaining)"
            return 0
        fi
    fi
    
    # Send email using mail command (requires mailutils or similar)
    echo "$body" | mail -s "$subject" "$ALERT_EMAIL" 2>/dev/null || \
    # Fallback: use curl to send via SMTP (if available)
    curl -s --url "smtps://mail.privateemail.com:587" \
        --mail-from "info@streamyo.net" \
        --mail-rcpt "$ALERT_EMAIL" \
        --user "info@streamyo.net:Stacey@1122" \
        --ssl-reqd \
        --upload-file - <<EOF 2>/dev/null || true
From: Milo Monitoring <info@streamyo.net>
To: $ALERT_EMAIL
Subject: $subject
Content-Type: text/plain; charset=UTF-8

$body

---
Milo Backend Monitoring
Timestamp: $(date)
EOF
    
    echo "$(date +%s)" > "$LAST_ALERT_FILE.$alert_key"
    log "Alert sent: $subject"
}

# Check if backend process is running
check_process() {
    pgrep -f "Milo.API.dll" > /dev/null 2>&1
}

# Check if port is listening
check_port() {
    netstat -tlnp 2>/dev/null | grep -q ":5001.*LISTEN" || \
    ss -tlnp 2>/dev/null | grep -q ":5001.*LISTEN"
}

# Check health endpoint
check_health() {
    curl -s -f -m 5 "$HEALTH_CHECK_URL" > /dev/null 2>&1
}

# Restart backend
restart_backend() {
    log "Attempting to restart Milo backend..."
    
    # Try systemd service first
    if systemctl is-enabled milo-backend >/dev/null 2>&1; then
        systemctl restart milo-backend
        sleep 5
        if check_process && check_health; then
            log "Backend restarted successfully via systemd"
            send_alert "Milo Backend Restarted" "The Milo backend service was automatically restarted and is now running.

Issue: The service had stopped responding.
Action: Restarted via systemd service.
Status: Service is now running and healthy.

Timestamp: $(date)" "restart-success"
            return 0
        fi
    fi
    
    # Fallback: Manual restart
    pkill -f "Milo.API.dll" 2>/dev/null || true
    sleep 2
    
    cd /home/ec2-user/milo-backend-publish 2>/dev/null || {
        log "ERROR: Backend directory not found!"
        send_alert "CRITICAL: Milo Backend Directory Missing" "The Milo backend directory /home/ec2-user/milo-backend-publish was not found.

This indicates a critical deployment issue. Manual intervention required.

Timestamp: $(date)" "dir-missing"
        return 1
    }
    
    nohup dotnet Milo.API.dll --urls http://localhost:5001 > /home/ec2-user/milo-backend.log 2>&1 &
    sleep 5
    
    if check_process && check_health; then
        log "Backend restarted successfully (manual)"
        send_alert "Milo Backend Restarted (Manual)" "The Milo backend service was manually restarted and is now running.

Issue: The service had stopped responding.
Action: Manual restart via nohup.
Status: Service is now running and healthy.

Note: Consider setting up systemd service for better reliability.

Timestamp: $(date)" "restart-manual"
        return 0
    else
        log "ERROR: Failed to restart backend"
        send_alert "CRITICAL: Milo Backend Restart Failed" "Failed to restart the Milo backend service.

The service is currently DOWN and automatic restart attempts have failed.

Immediate action required:
1. SSH into EC2 instance (i-06bc5b2218c041802)
2. Check logs: tail -f /home/ec2-user/milo-backend.log
3. Check for errors: tail -f /home/ec2-user/milo-backend-error.log
4. Verify .NET is installed: dotnet --version
5. Try manual restart: cd /home/ec2-user/milo-backend-publish && dotnet Milo.API.dll --urls http://localhost:5001

Timestamp: $(date)" "restart-failed"
        return 1
    fi
}

# Main monitoring logic
main() {
    log "Starting health check..."
    
    # Track consecutive failures
    local failures=0
    
    # Check 1: Process running
    if ! check_process; then
        log "FAIL: Backend process not running"
        failures=$((failures + 1))
    fi
    
    # Check 2: Port listening
    if ! check_port; then
        log "FAIL: Port 5001 not listening"
        failures=$((failures + 1))
    fi
    
    # Check 3: Health endpoint
    if ! check_health; then
        log "FAIL: Health endpoint not responding"
        failures=$((failures + 1))
    fi
    
    # If all checks pass
    if [ $failures -eq 0 ]; then
        log "OK: All checks passed"
        # Reset failure counter
        echo "0" > /tmp/milo-failures 2>/dev/null || true
        exit 0
    fi
    
    # Increment failure counter
    local total_failures=$(cat /tmp/milo-failures 2>/dev/null || echo "0")
    total_failures=$((total_failures + 1))
    echo "$total_failures" > /tmp/milo-failures
    
    log "WARN: $failures check(s) failed (total failures: $total_failures)"
    
    # If we've had multiple consecutive failures, attempt restart
    if [ $total_failures -ge $MAX_FAILURES ]; then
        log "CRITICAL: $total_failures consecutive failures detected. Attempting restart..."
        
        if restart_backend; then
            # Reset counter on successful restart
            echo "0" > /tmp/milo-failures
            exit 0
        else
            exit 1
        fi
    else
        log "Waiting for more failures before restarting (current: $total_failures/$MAX_FAILURES)"
    fi
}

# Run main function
main
