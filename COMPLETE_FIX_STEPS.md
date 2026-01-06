# Complete Fix for Mixed Content Error

## The Problem
Browser console shows:
```
Mixed Content: The page at https://www.codingeverest.com/milo-signup.html 
was loaded over HTTPS, but requested an insecure resource 
http://34.246.3.141:5001/api/auth/signup
```

**Root Cause:** Frontend is HTTPS, backend is HTTP → Browser blocks it.

## Solution: Setup HTTPS Backend

### Step 1: Add DNS Record (Namecheap)

1. Go to Namecheap → Domain List → codingeverest.com → Advanced DNS
2. Add A Record:
   - **Type:** A Record
   - **Host:** `api`
   - **Value:** `34.246.3.141`
   - **TTL:** Automatic
3. Save and wait 5-10 minutes for propagation

### Step 2: Open Port 443 on EC2

Run from PowerShell:
```powershell
.\open-port-443.ps1
```

Or manually in AWS Console:
- EC2 → Security Groups → Select your group
- Inbound Rules → Edit → Add Rule
- Type: HTTPS, Port: 443, Source: 0.0.0.0/0

### Step 3: Setup HTTPS on EC2 via Session Manager

1. **Open AWS Console → EC2 → Session Manager**
2. **Connect to:** `i-06bc5b2218c041802`
3. **Run these commands:**

```bash
# Install nginx and certbot
sudo yum update -y
sudo yum install -y nginx certbot python3-certbot-nginx

# Create nginx config
sudo tee /etc/nginx/conf.d/api.codingeverest.com.conf > /dev/null << 'EOF'
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
EOF

# Test and start nginx
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl start nginx

# Get SSL certificate (non-interactive)
sudo certbot --nginx -d api.codingeverest.com --non-interactive --agree-tos --email info@streamyo.net --redirect

# Reload nginx
sudo systemctl reload nginx

# Verify
curl https://api.codingeverest.com/api/health
```

### Step 4: Verify Everything Works

1. **Test API:**
   ```bash
   curl https://api.codingeverest.com/api/health
   ```
   Should return: `{"status":"ok","message":"Milo API is running"}`

2. **Test from browser:**
   ```
   https://api.codingeverest.com/api/health
   ```

3. **Test signup:**
   - Go to: https://www.codingeverest.com/milo-signup.html
   - Try to sign up
   - Should work without mixed content errors

### Step 5: Update RDS Password (If Not Done)

If backend is running but database connection fails:

```bash
cd /var/www/milo-api
sudo sed -i 's/Password=.*;/Password=YOUR_RDS_PASSWORD;/' appsettings.json
sudo systemctl restart milo-api
```

## Quick Checklist

- [ ] DNS A record added: `api.codingeverest.com` → `34.246.3.141`
- [ ] Port 443 opened in EC2 security group
- [ ] Nginx installed and configured
- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] Backend service running on port 5001
- [ ] RDS password configured in appsettings.json
- [ ] Frontend updated to use `https://api.codingeverest.com/api`

## Troubleshooting

### "DNS not resolving"
- Wait 10-15 minutes after adding DNS record
- Check: `nslookup api.codingeverest.com`
- Should return: `34.246.3.141`

### "SSL certificate failed"
- Ensure DNS is resolving first
- Check nginx is running: `sudo systemctl status nginx`
- Check port 80 is open: `curl http://api.codingeverest.com`

### "Backend not responding"
- Check service: `sudo systemctl status milo-api`
- Check logs: `sudo journalctl -u milo-api -n 50`
- Verify port 5001: `curl http://localhost:5001/api/health`

### "Database connection error"
- Update RDS password in `/var/www/milo-api/appsettings.json`
- Restart service: `sudo systemctl restart milo-api`

## After Setup

The frontend will automatically use `https://api.codingeverest.com/api` (already updated in code).

No more mixed content errors! ✅

