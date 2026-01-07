# Fix API Domain Issue

## Problem
Login shows "Network error - unable to connect to the server" even though:
- ✅ Route 53 DNS records are configured
- ✅ Namecheap nameservers are updated
- ✅ DNS resolves correctly

## Root Cause
The issue is likely that **nginx on EC2 is not configured** to handle requests for `api.codingeverest.com`.

## Solution

### Step 1: SSH into EC2
```bash
ssh -i your-key.pem ec2-user@34.246.3.141
```

### Step 2: Check Current Nginx Configuration
```bash
sudo cat /etc/nginx/sites-available/default
# or
sudo cat /etc/nginx/nginx.conf
```

### Step 3: Create/Update Nginx Config for api.codingeverest.com

Create or edit the nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/api.codingeverest.com
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name api.codingeverest.com;

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

### Step 4: Enable the Site
```bash
# Create symlink if using sites-available/sites-enabled
sudo ln -s /etc/nginx/sites-available/api.codingeverest.com /etc/nginx/sites-enabled/

# Or if using nginx.conf directly, add the server block there
```

### Step 5: Test Nginx Configuration
```bash
sudo nginx -t
```

### Step 6: Reload Nginx
```bash
sudo systemctl reload nginx
```

### Step 7: Verify Backend is Running
```bash
# Check if backend service is running
sudo systemctl status milo-api.service

# Test backend directly
curl http://localhost:5001/api/health
```

### Step 8: Test from Outside
```bash
# From your local machine
curl http://api.codingeverest.com/api/health
```

## Alternative: If Nginx is Not Installed

If nginx is not installed, you can either:

### Option A: Install and Configure Nginx
```bash
sudo yum install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
# Then follow steps above
```

### Option B: Use Direct Port Access (Temporary)
Update `frontend/js/config.js` to use direct IP:
```javascript
return 'http://34.246.3.141:5001/api';
```

**Note**: This is not recommended for production as it bypasses domain-based routing.

## Security Group Check

Make sure EC2 security group allows:
- **Inbound Port 80** (HTTP) from `0.0.0.0/0`
- **Inbound Port 443** (HTTPS) from `0.0.0.0/0` (if using SSL)
- **Inbound Port 5001** (Backend) from `127.0.0.1` (localhost only)

## SSL Certificate (Optional - For HTTPS)

If you want HTTPS for `api.codingeverest.com`:

1. Install Certbot:
```bash
sudo yum install certbot python3-certbot-nginx -y
```

2. Get SSL certificate:
```bash
sudo certbot --nginx -d api.codingeverest.com
```

3. Update nginx config to use port 443 with SSL

## Quick Test Commands

```bash
# Test backend locally
curl http://localhost:5001/api/health

# Test nginx proxy
curl -H "Host: api.codingeverest.com" http://localhost/api/health

# Test from outside
curl http://api.codingeverest.com/api/health
```

## Expected Result

After configuration, `http://api.codingeverest.com/api/health` should return:
```json
{"status":"healthy"}
```

And login should work without "Network error" message.

