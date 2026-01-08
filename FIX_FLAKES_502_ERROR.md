# Fix Flakes 502 Bad Gateway Error

## Problem Summary

When trying to create a flake in the Milo application, you're getting:
- ❌ **502 Bad Gateway** error from nginx
- ❌ **JSON parsing errors** in the browser console
- ❌ **404 errors** when accessing `https://api.codingeverest.com/api/flakes`

## Root Cause

1. **Backend API is running** ✅ - Confirmed working on port 5001
2. **nginx reverse proxy cannot connect to backend** ❌ - This is the issue!
3. **Most likely cause**: SELinux is blocking nginx from connecting to the backend on port 5001

## What Was Fixed in Frontend

Updated `frontend/js/flakes.js` to handle non-JSON error responses gracefully:
- Added try-catch blocks around `response.json()` calls
- Now shows user-friendly error messages instead of cryptic JSON parsing errors

## How to Fix nginx (Choose One Method)

### Method 1: Quick Fix via PowerShell (Recommended)

From your Windows machine, run:

```powershell
.\fix-nginx-via-ssm.ps1
```

This will:
- Connect to your EC2 instance via AWS Systems Manager
- Enable nginx to connect to backend services (SELinux fix)
- Restart nginx
- Test the connection

### Method 2: Manual Fix via EC2 Session Manager

1. Go to AWS Console → EC2 → Your instance
2. Click "Connect" → "Session Manager"
3. Run these commands:

```bash
# Allow nginx to connect to backend (SELinux fix)
sudo setsebool -P httpd_can_network_connect 1

# Restart nginx
sudo systemctl restart nginx

# Test
curl https://api.codingeverest.com/api/health
```

### Method 3: Manual Fix via SSH

```powershell
# SSH into EC2
ssh -i "$env:USERPROFILE\.ssh\streamyo-backend-key-new.pem" ec2-user@34.246.3.141

# Then run:
sudo setsebool -P httpd_can_network_connect 1
sudo systemctl restart nginx
curl https://api.codingeverest.com/api/health
```

## Verification

After applying the fix, test these URLs:

1. **Backend Health Check**:
   ```
   https://api.codingeverest.com/api/health
   ```
   Should return: `{"status":"ok","message":"Milo API is running"}`

2. **Flakes Endpoint**:
   ```
   https://api.codingeverest.com/api/flakes
   ```
   Should return: `[]` (empty array) or list of flakes

3. **In Browser**:
   - Go to https://www.codingeverest.com
   - Navigate to Flakes
   - Try creating a new flake with title "Test"
   - Should work without errors!

## Technical Details

### Why nginx Couldn't Connect

On RHEL/CentOS/Amazon Linux, SELinux security policies prevent nginx from making network connections by default. This is a security feature, but it breaks reverse proxy functionality.

The fix:
```bash
sudo setsebool -P httpd_can_network_connect 1
```

This command:
- `setsebool`: Set SELinux boolean
- `-P`: Make it persistent across reboots
- `httpd_can_network_connect`: Allow HTTP daemon (nginx) to connect to network services
- `1`: Enable the permission

### nginx Configuration

The working nginx config (already in place at `/etc/nginx/conf.d/api.codingeverest.com.conf`):

```nginx
server {
    listen 443 ssl;
    server_name api.codingeverest.com;

    # SSL configuration managed by certbot
    ssl_certificate /etc/letsencrypt/live/api.codingeverest.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.codingeverest.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## If It Still Doesn't Work

### Check Backend Service

```bash
# On EC2
sudo systemctl status milo-api
curl http://localhost:5001/api/health
```

If backend is not running:
```bash
sudo systemctl start milo-api
sudo systemctl enable milo-api
```

### Check nginx Logs

```bash
# On EC2
sudo tail -f /var/log/nginx/error.log
```

Look for connection refused or permission denied errors.

### Restart Everything

```bash
# On EC2
sudo systemctl restart milo-api
sleep 2
sudo systemctl restart nginx
curl https://api.codingeverest.com/api/health
```

## Summary of Changes Made

1. ✅ Fixed `frontend/js/flakes.js` - Better error handling for API failures
2. ✅ Created `fix-nginx-backend-connection.sh` - Comprehensive fix script for EC2
3. ✅ Created `fix-nginx-via-ssm.ps1` - Easy deployment from Windows

Run the fix script and you should be good to go! 🚀

