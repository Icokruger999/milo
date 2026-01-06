# Fix Mixed Content Error - IMMEDIATE FIX

## The Problem
Browser blocks HTTPS frontend from calling HTTP backend:
```
Mixed Content: The page at 'https://www.codingeverest.com/milo-signup.html' 
was loaded over HTTPS, but requested an insecure resource 
'http://34.246.3.141:5001/api/auth/signup'
```

## Quick Fix Options

### Option 1: Use api.codingeverest.com with HTTPS (RECOMMENDED)

If `api.codingeverest.com` DNS is already set up, configure nginx with SSL:

**Via Session Manager on EC2:**
```bash
# Install nginx and certbot
sudo yum install -y nginx certbot python3-certbot-nginx

# Create nginx config
sudo tee /etc/nginx/conf.d/api.codingeverest.com.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name api.codingeverest.com;
    location / {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Get SSL certificate
sudo certbot --nginx -d api.codingeverest.com --non-interactive --agree-tos --email info@streamyo.net --redirect

# Start nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

Then update `frontend/js/config.js`:
```javascript
return 'https://api.codingeverest.com/api';
```

### Option 2: Temporary Workaround (NOT RECOMMENDED)

Add meta tag to allow mixed content (security risk):
```html
<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
```

### Option 3: Use HTTP Frontend (NOT RECOMMENDED)

Access site via HTTP instead of HTTPS (not secure).

## Current Status

- Backend: Not responding (needs restart/deployment)
- Mixed Content: Blocking HTTP calls from HTTPS frontend
- Solution: Set up HTTPS backend or use workaround

