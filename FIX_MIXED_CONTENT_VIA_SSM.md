# Fix Mixed Content Error via SSM

## The Problem
The frontend (HTTPS) is trying to connect to HTTP backend, which browsers block:
```
Mixed Content: The page at https://www.codingeverest.com/milo-signup.html 
was loaded over HTTPS, but requested an insecure resource 
http://34.246.3.141:5001/api/auth/signup
```

## Solution: Setup HTTPS Backend

### Step 1: Point DNS to EC2

In your DNS provider (Namecheap), add an A record:
- **Type:** A
- **Host:** `api`
- **Value:** `34.246.3.141` (EC2 public IP)
- **TTL:** Automatic

Wait 5-10 minutes for DNS propagation.

### Step 2: Setup HTTPS on EC2 via Session Manager

1. **Open AWS Console → EC2 → Session Manager**
2. **Connect to instance:** `i-06bc5b2218c041802`
3. **Run these commands:**

```bash
# Install nginx
sudo yum update -y
sudo yum install -y nginx certbot python3-certbot-nginx

# Create nginx config for api.codingeverest.com
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

# Get SSL certificate (will prompt for email - use info@streamyo.net)
sudo certbot --nginx -d api.codingeverest.com --non-interactive --agree-tos --email info@streamyo.net --redirect

# Reload nginx
sudo systemctl reload nginx

# Verify
curl https://api.codingeverest.com/api/health
```

### Step 3: Update Security Group

Ensure port 443 (HTTPS) is open:
```powershell
aws ec2 authorize-security-group-ingress `
  --group-id sg-0eb3b878979ad2355 `
  --protocol tcp `
  --port 443 `
  --cidr 0.0.0.0/0 `
  --description "HTTPS for API"
```

### Step 4: Verify

1. **Test API:**
   ```bash
   curl https://api.codingeverest.com/api/health
   ```

2. **Test from browser:**
   ```
   https://api.codingeverest.com/api/health
   ```

3. **Test signup:**
   - Go to: https://www.codingeverest.com/milo-signup.html
   - Should work without mixed content errors

## Alternative: Quick Fix (Temporary)

If you can't set up HTTPS immediately, you can temporarily allow mixed content (NOT RECOMMENDED for production):

1. Add this meta tag to `milo-signup.html`:
   ```html
   <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
   ```

2. Or use HTTP frontend temporarily (not secure)

## Notes

- DNS propagation can take 5-10 minutes
- Let's Encrypt certificates expire every 90 days (auto-renewal should be set up)
- Backend must be running on port 5001 for nginx to proxy

