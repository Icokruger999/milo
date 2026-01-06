#!/bin/bash
# Complete HTTPS setup script - run this on EC2 after DNS is configured

echo "========================================"
echo "Setting up HTTPS for Milo Backend"
echo "========================================"
echo ""

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "Installing nginx and certbot..."
    sudo yum update -y
    sudo yum install -y nginx certbot python3-certbot-nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
fi

# Create nginx config
echo "Creating nginx configuration..."
sudo tee /etc/nginx/conf.d/milo-api.conf > /dev/null <<'EOF'
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

# Test nginx config
sudo nginx -t
if [ $? -ne 0 ]; then
    echo "ERROR: Nginx configuration test failed!"
    exit 1
fi

# Reload nginx
sudo systemctl reload nginx

# Get SSL certificate
echo ""
echo "Getting SSL certificate from Let's Encrypt..."
echo "This will require DNS to be configured: api.codingeverest.com -> 34.246.3.141"
echo ""

sudo certbot --nginx -d api.codingeverest.com \
    --non-interactive \
    --agree-tos \
    --email info@streamyo.com \
    --redirect

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "✅ HTTPS Setup Complete!"
    echo "========================================"
    echo ""
    echo "Backend is now available at: https://api.codingeverest.com"
    echo ""
    echo "Update frontend config.js to use:"
    echo "  baseURL: 'https://api.codingeverest.com/api'"
    echo ""
else
    echo ""
    echo "⚠️  SSL certificate setup failed."
    echo "Make sure DNS is configured: api.codingeverest.com -> 34.246.3.141"
    echo "Wait 5-10 minutes after DNS change, then try again."
fi

