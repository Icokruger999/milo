# Set up HTTPS for backend using nginx and Let's Encrypt
$instanceId = "i-06bc5b2218c041802"

Write-Host "Setting up HTTPS for Milo backend..." -ForegroundColor Cyan
Write-Host "This will install nginx and configure SSL certificate" -ForegroundColor Yellow
Write-Host ""

# Step 1: Install nginx and certbot
Write-Host "Step 1: Installing nginx and certbot..." -ForegroundColor Yellow
$cmd1 = @{
    commands = @(
        "sudo yum update -y",
        "sudo yum install -y nginx certbot python3-certbot-nginx",
        "sudo systemctl enable nginx",
        "sudo systemctl start nginx"
    )
} | ConvertTo-Json

$cmd1 | Out-File -FilePath "install-nginx.json" -Encoding ASCII -NoNewline
$r1 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://install-nginx.json --output json
$id1 = ($r1 | ConvertFrom-Json).Command.CommandId
Write-Host "Installation command ID: $id1" -ForegroundColor Gray
Write-Host "Waiting 30 seconds for installation..." -ForegroundColor Gray
Start-Sleep -Seconds 30

# Step 2: Create nginx config for API subdomain
Write-Host "`nStep 2: Creating nginx configuration..." -ForegroundColor Yellow
$nginxConfig = @"
server {
    listen 80;
    server_name api.codingeverest.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_cache_bypass `$http_upgrade;
    }
}
"@

$cmd2 = @{
    commands = @(
        "echo '$nginxConfig' | sudo tee /etc/nginx/conf.d/milo-api.conf",
        "sudo nginx -t",
        "sudo systemctl reload nginx"
    )
} | ConvertTo-Json

$cmd2 | Out-File -FilePath "nginx-config.json" -Encoding ASCII -NoNewline
$r2 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://nginx-config.json --output json
$id2 = ($r2 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 5

# Step 3: Get SSL certificate (requires DNS to be set up first)
Write-Host "`nStep 3: Setting up SSL certificate..." -ForegroundColor Yellow
Write-Host "NOTE: You need to add DNS record first:" -ForegroundColor Cyan
Write-Host "  api.codingeverest.com A record -> 34.246.3.141" -ForegroundColor White
Write-Host ""
Write-Host "After DNS is set up, run this command on EC2:" -ForegroundColor Yellow
Write-Host "  sudo certbot --nginx -d api.codingeverest.com --non-interactive --agree-tos --email info@streamyo.com" -ForegroundColor White
Write-Host ""

# Cleanup
Remove-Item install-nginx.json,nginx-config.json -ErrorAction SilentlyContinue

Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Add DNS A record: api.codingeverest.com -> 34.246.3.141" -ForegroundColor White
Write-Host "2. Wait 5-10 minutes for DNS propagation" -ForegroundColor White
Write-Host "3. Run SSL certificate command (see above)" -ForegroundColor White
Write-Host "4. Update frontend config to use: https://api.codingeverest.com/api" -ForegroundColor White

