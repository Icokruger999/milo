# Run SSL setup directly on EC2
$instanceId = "i-06bc5b2218c041802"

Write-Host "Setting up SSL certificate for api.codingeverest.com..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Fix git ownership and install nginx/certbot if needed
Write-Host "Step 1: Preparing environment..." -ForegroundColor Yellow
$cmd1 = @{
    commands = @(
        "sudo git config --global --add safe.directory /home/ec2-user/milo",
        "sudo yum install -y nginx certbot python3-certbot-nginx 2>&1 || echo 'Already installed'",
        "sudo systemctl enable nginx",
        "sudo systemctl start nginx"
    )
} | ConvertTo-Json

$cmd1 | Out-File -FilePath "prep.json" -Encoding ASCII -NoNewline
$r1 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://prep.json --output json
$id1 = ($r1 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 10

# Step 2: Create nginx config
Write-Host "`nStep 2: Configuring nginx..." -ForegroundColor Yellow
$nginxConfig = 'server {
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
}'

$cmd2 = @{
    commands = @(
        "echo '$nginxConfig' | sudo tee /etc/nginx/conf.d/milo-api.conf",
        "sudo nginx -t",
        "sudo systemctl reload nginx"
    )
} | ConvertTo-Json

$cmd2 | Out-File -FilePath "nginx.json" -Encoding ASCII -NoNewline
$r2 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://nginx.json --output json
$id2 = ($r2 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 5

# Step 3: Get SSL certificate
Write-Host "`nStep 3: Getting SSL certificate from Let's Encrypt..." -ForegroundColor Yellow
Write-Host "This may take 30-60 seconds..." -ForegroundColor Gray
$cmd3 = @{
    commands = @(
        "sudo certbot --nginx -d api.codingeverest.com --non-interactive --agree-tos --email info@streamyo.com --redirect 2>&1"
    )
} | ConvertTo-Json

$cmd3 | Out-File -FilePath "certbot.json" -Encoding ASCII -NoNewline
$r3 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://certbot.json --output json
$id3 = ($r3 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 60

# Get results
Write-Host "`n=== SSL Certificate Setup Results ===" -ForegroundColor Green
$result3 = aws ssm get-command-invocation --command-id $id3 --instance-id $instanceId --output json
$clean3 = $result3 -replace '[^\x00-\x7F]', ''
$obj3 = $clean3 | ConvertFrom-Json

Write-Host "Status: $($obj3.Status)" -ForegroundColor Cyan
Write-Host "`nOutput:" -ForegroundColor Yellow
Write-Host $obj3.StandardOutputContent

if ($obj3.StandardErrorContent) {
    Write-Host "`nErrors:" -ForegroundColor Red
    Write-Host $obj3.StandardErrorContent
}

# Step 4: Test HTTPS
Write-Host "`n=== Testing HTTPS Endpoint ===" -ForegroundColor Green
$cmd4 = @{
    commands = @("curl -s https://api.codingeverest.com/api/health")
} | ConvertTo-Json

$cmd4 | Out-File -FilePath "test.json" -Encoding ASCII -NoNewline
$r4 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://test.json --output json
$id4 = ($r4 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 5

$result4 = aws ssm get-command-invocation --command-id $id4 --instance-id $instanceId --output json
$clean4 = $result4 -replace '[^\x00-\x7F]', ''
$obj4 = $clean4 | ConvertFrom-Json

Write-Host "HTTPS API Test:" -ForegroundColor Cyan
Write-Host $obj4.StandardOutputContent

# Cleanup
Remove-Item prep.json,nginx.json,certbot.json,test.json -ErrorAction SilentlyContinue

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
if ($obj3.Status -eq "Success" -or $obj3.StandardOutputContent -match "Congratulations" -or $obj3.StandardOutputContent -match "Successfully") {
    Write-Host "SSL certificate installed successfully!" -ForegroundColor Green
    Write-Host "Backend is now available at: https://api.codingeverest.com/api" -ForegroundColor White
    Write-Host "Frontend will now connect via HTTPS - mixed content issue is FIXED!" -ForegroundColor White
} else {
    Write-Host "Check the output above for any errors." -ForegroundColor Yellow
    Write-Host "If certbot failed, DNS may need more time to propagate." -ForegroundColor Yellow
}

