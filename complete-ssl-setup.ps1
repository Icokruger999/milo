# Complete SSL setup on EC2
$instanceId = "i-06bc5b2218c041802"

Write-Host "Completing SSL setup for api.codingeverest.com..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Pull latest code and run setup script
Write-Host "Step 1: Pulling latest code and running SSL setup..." -ForegroundColor Yellow
$cmd1 = @{
    commands = @(
        "cd /home/ec2-user/milo || cd ~/milo",
        "git pull origin main",
        "chmod +x setup-https-complete.sh",
        "./setup-https-complete.sh"
    )
} | ConvertTo-Json

$cmd1 | Out-File -FilePath "ssl-setup.json" -Encoding ASCII -NoNewline
$r1 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://ssl-setup.json --output json
$id1 = ($r1 | ConvertFrom-Json).Command.CommandId
Write-Host "SSL setup command ID: $id1" -ForegroundColor Gray
Write-Host "Waiting 60 seconds for SSL certificate setup..." -ForegroundColor Gray
Write-Host "(This may take longer if DNS hasn't fully propagated)" -ForegroundColor Yellow
Start-Sleep -Seconds 60

# Get results
Write-Host "`n=== SSL Setup Results ===" -ForegroundColor Green
$result1 = aws ssm get-command-invocation --command-id $id1 --instance-id $instanceId --output json
$clean1 = $result1 -replace '[^\x00-\x7F]', ''
$obj1 = $clean1 | ConvertFrom-Json

Write-Host "Status: $($obj1.Status)" -ForegroundColor Cyan
Write-Host "`nOutput:" -ForegroundColor Yellow
Write-Host $obj1.StandardOutputContent

if ($obj1.StandardErrorContent) {
    Write-Host "`nErrors:" -ForegroundColor Red
    Write-Host $obj1.StandardErrorContent
}

# Step 2: Test HTTPS endpoint
Write-Host "`n=== Testing HTTPS Endpoint ===" -ForegroundColor Green
$cmd2 = @{
    commands = @("curl -s https://api.codingeverest.com/api/health")
} | ConvertTo-Json

$cmd2 | Out-File -FilePath "test-https.json" -Encoding ASCII -NoNewline
$r2 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://test-https.json --output json
$id2 = ($r2 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 5

$result2 = aws ssm get-command-invocation --command-id $id2 --instance-id $instanceId --output json
$clean2 = $result2 -replace '[^\x00-\x7F]', ''
$obj2 = $clean2 | ConvertFrom-Json

Write-Host "HTTPS Test Result:" -ForegroundColor Cyan
Write-Host $obj2.StandardOutputContent

# Cleanup
Remove-Item ssl-setup.json,test-https.json -ErrorAction SilentlyContinue

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
if ($obj1.Status -eq "Success") {
    Write-Host "✅ SSL certificate installed successfully!" -ForegroundColor Green
    Write-Host "Backend is now available at: https://api.codingeverest.com/api" -ForegroundColor White
    Write-Host "Frontend will now connect via HTTPS - no more mixed content errors!" -ForegroundColor White
} else {
    Write-Host "⚠️  SSL setup may have failed. Check output above." -ForegroundColor Yellow
    Write-Host "If DNS hasn't propagated, wait 5-10 more minutes and try again." -ForegroundColor Yellow
}

