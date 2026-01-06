#!/bin/bash
# Setup HTTPS backend with nginx and Let's Encrypt
# Run this on EC2 via Session Manager

set -e

echo "========================================"
echo "Setting up HTTPS Backend"
echo "========================================"

# Install nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo "Installing nginx..."
    sudo yum update -y
    sudo yum install -y nginx
fi

# Install certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    sudo yum install -y certbot python3-certbot-nginx
fi

# Create nginx configuration for api.codingeverest.com
echo "Creating nginx configuration..."
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

# Test nginx configuration
sudo nginx -t

# Start nginx if not running
sudo systemctl enable nginx
sudo systemctl start nginx

# Get SSL certificate
echo "Obtaining SSL certificate..."
sudo certbot --nginx -d api.codingeverest.com --non-interactive --agree-tos --email info@streamyo.net --redirect

# Reload nginx
sudo systemctl reload nginx

# Verify nginx is running
sudo systemctl status nginx --no-pager | head -10

echo "========================================"
echo "HTTPS Backend Setup Complete"
echo "========================================"
echo "Backend should now be accessible at:"
echo "https://api.codingeverest.com/api"
echo ""
echo "Test with:"
echo "curl https://api.codingeverest.com/api/health"

