# Complete fix - rebuild and redeploy backend
$instanceId = "i-06bc5b2218c041802"

Write-Host "Fixing Milo backend completely..." -ForegroundColor Cyan

# Step 1: Pull latest code and rebuild
Write-Host "`nStep 1: Pulling latest code and rebuilding..." -ForegroundColor Yellow
$cmd1 = @{
    commands = @(
        "cd ~/milo",
        "git pull origin main",
        "cd backend/Milo.API",
        "dotnet restore",
        "dotnet publish -c Release -o /var/www/milo-api",
        "sudo chown -R ec2-user:ec2-user /var/www/milo-api"
    )
} | ConvertTo-Json

$cmd1 | Out-File -FilePath "rebuild.json" -Encoding ASCII -NoNewline
$r1 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://rebuild.json --output json
$id1 = ($r1 | ConvertFrom-Json).Command.CommandId
Write-Host "Rebuild command ID: $id1" -ForegroundColor Gray
Write-Host "Waiting 30 seconds for build..." -ForegroundColor Gray
Start-Sleep -Seconds 30

# Step 2: Restart service
Write-Host "`nStep 2: Restarting service..." -ForegroundColor Yellow
$cmd2 = @{
    commands = @(
        "sudo systemctl stop milo-api",
        "sleep 2",
        "sudo systemctl start milo-api",
        "sleep 5",
        "sudo systemctl status milo-api --no-pager | head -15"
    )
} | ConvertTo-Json

$cmd2 | Out-File -FilePath "restart.json" -Encoding ASCII -NoNewline
$r2 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://restart.json --output json
$id2 = ($r2 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 8

# Step 3: Test API
Write-Host "`nStep 3: Testing API..." -ForegroundColor Yellow
$cmd3 = @{
    commands = @("curl -s http://localhost:5001/api/health")
} | ConvertTo-Json

$cmd3 | Out-File -FilePath "test.json" -Encoding ASCII -NoNewline
$r3 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://test.json --output json
$id3 = ($r3 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 5

# Get results
Write-Host "`n=== Results ===" -ForegroundColor Green

$result3 = aws ssm get-command-invocation --command-id $id3 --instance-id $instanceId --output json
$clean3 = $result3 -replace '[^\x00-\x7F]', ''
$obj3 = $clean3 | ConvertFrom-Json
Write-Host "API Health Check:" -ForegroundColor Cyan
Write-Host $obj3.StandardOutputContent

# Cleanup
Remove-Item rebuild.json,restart.json,test.json -ErrorAction SilentlyContinue

Write-Host "`n=== Fix Complete ===" -ForegroundColor Green
Write-Host "Backend should now be working. Test signup again!" -ForegroundColor White

