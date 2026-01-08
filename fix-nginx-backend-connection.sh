#!/bin/bash
# Fix nginx 502 Bad Gateway - Allow nginx to connect to backend
# Run this on EC2 via SSH or Session Manager

set -e

echo "========================================"
echo "Fixing nginx Backend Connection"
echo "========================================"

# Check if backend is running
echo "Checking backend service..."
if curl -s http://localhost:5001/api/health > /dev/null; then
    echo "✅ Backend is running on port 5001"
else
    echo "❌ Backend is NOT running on port 5001"
    echo "Starting backend service..."
    sudo systemctl start milo-api
    sudo systemctl enable milo-api
    sleep 2
fi

# Fix SELinux permission (most common issue)
echo ""
echo "Checking SELinux status..."
if command -v getenforce &> /dev/null; then
    SELINUX_STATUS=$(getenforce)
    echo "SELinux status: $SELINUX_STATUS"
    
    if [ "$SELINUX_STATUS" != "Disabled" ]; then
        echo "Allowing nginx to connect to network (SELinux)..."
        sudo setsebool -P httpd_can_network_connect 1
        echo "✅ SELinux permission granted"
    fi
else
    echo "SELinux not installed"
fi

# Check nginx configuration
echo ""
echo "Testing nginx configuration..."
sudo nginx -t

# Check if nginx config file exists
if [ -f /etc/nginx/conf.d/api.codingeverest.com.conf ]; then
    echo "✅ nginx config file exists"
    echo ""
    echo "Current nginx config:"
    cat /etc/nginx/conf.d/api.codingeverest.com.conf
else
    echo "❌ nginx config file NOT found"
    echo "Creating nginx configuration..."
    
    sudo tee /etc/nginx/conf.d/api.codingeverest.com.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name api.codingeverest.com;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF
    echo "✅ nginx config created"
fi

# Restart nginx
echo ""
echo "Restarting nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# Wait for nginx to start
sleep 2

# Check nginx status
echo ""
echo "nginx status:"
sudo systemctl status nginx --no-pager | head -10

# Test local connection
echo ""
echo "Testing local backend connection..."
curl -s http://localhost:5001/api/health || echo "❌ Backend not responding"

# Test nginx proxy
echo ""
echo "Testing nginx proxy..."
curl -s http://localhost/api/health || echo "❌ nginx proxy not working"

# Test HTTPS
echo ""
echo "Testing HTTPS endpoint..."
curl -s https://api.codingeverest.com/api/health || echo "⚠️  HTTPS endpoint may need SSL certificate"

echo ""
echo "========================================"
echo "Fix Complete!"
echo "========================================"
echo ""
echo "Test from your browser:"
echo "https://api.codingeverest.com/api/health"
echo ""

