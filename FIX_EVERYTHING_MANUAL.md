# Fix Everything - Manual Steps in Session Manager

## Step 1: Fix Sudo Permissions (CRITICAL)

Run these commands **one at a time** in Session Manager:

```bash
chown root:root /usr/bin/sudo
```

```bash
chmod 4755 /usr/bin/sudo
```

```bash
ls -l /usr/bin/sudo
```

You should see: `-rwsr-xr-x 1 root root ...` (note the 's' in permissions)

## Step 2: Verify Sudo Works

```bash
sudo whoami
```

Should return: `root`

## Step 3: Check Backend Status

```bash
sudo systemctl status milo-api
```

## Step 4: Restart Backend

```bash
sudo systemctl restart milo-api
```

```bash
sleep 5
```

## Step 5: Test Backend

```bash
curl http://localhost:5001/api/health
```

Should return: `{"status":"ok","message":"Milo API is running"}`

## Step 6: Check Backend Logs (if not working)

```bash
sudo journalctl -u milo-api -n 50
```

Look for errors - common issues:
- Database connection errors (RDS password)
- Port already in use
- Missing .NET runtime

## Step 7: Fix Mixed Content Error

After backend is running, we need HTTPS. Run:

```bash
sudo yum install -y nginx certbot python3-certbot-nginx
```

```bash
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
```

```bash
sudo nginx -t
```

```bash
sudo systemctl enable nginx
sudo systemctl start nginx
```

```bash
sudo certbot --nginx -d api.codingeverest.com --non-interactive --agree-tos --email info@streamyo.net --redirect
```

## Step 8: Verify HTTPS Works

```bash
curl https://api.codingeverest.com/api/health
```

## After All Steps

Once HTTPS is working, I'll update the frontend config to use `https://api.codingeverest.com/api` instead of the HTTP endpoint.

## Quick Status Check

Run this to see everything at once:

```bash
echo "=== Sudo ===" && sudo whoami && echo "=== Backend Service ===" && sudo systemctl is-active milo-api && echo "=== Backend Health ===" && curl -s http://localhost:5001/api/health && echo "" && echo "=== Nginx ===" && sudo systemctl is-active nginx 2>/dev/null || echo "Not installed"
```

