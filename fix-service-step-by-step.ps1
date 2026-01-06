# Fix milo-api service step by step via SSM
$instanceId = "i-06bc5b2218c041802"

Write-Host "Fixing milo-api service..." -ForegroundColor Cyan

# Step 1: Add timeout to service file
Write-Host "`nStep 1: Adding timeout to service file..." -ForegroundColor Yellow
$cmd1 = @{
    commands = @("echo 'TimeoutStartSec=60' | sudo tee -a /tmp/timeout.txt", "sudo sed -i '/Service]/a TimeoutStartSec=60' /etc/systemd/system/milo-api.service")
} | ConvertTo-Json

$cmd1 | Out-File -FilePath "cmd1.json" -Encoding ASCII -NoNewline
$r1 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://cmd1.json --output json
$id1 = ($r1 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 5

# Step 2: Reload systemd
Write-Host "Step 2: Reloading systemd..." -ForegroundColor Yellow
$cmd2 = @{
    commands = @("sudo systemctl daemon-reload")
} | ConvertTo-Json

$cmd2 | Out-File -FilePath "cmd2.json" -Encoding ASCII -NoNewline
$r2 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://cmd2.json --output json
$id2 = ($r2 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 3

# Step 3: Stop service
Write-Host "Step 3: Stopping service..." -ForegroundColor Yellow
$cmd3 = @{
    commands = @("sudo systemctl stop milo-api")
} | ConvertTo-Json

$cmd3 | Out-File -FilePath "cmd3.json" -Encoding ASCII -NoNewline
$r3 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://cmd3.json --output json
$id3 = ($r3 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 3

# Step 4: Start service
Write-Host "Step 4: Starting service..." -ForegroundColor Yellow
$cmd4 = @{
    commands = @("sudo systemctl start milo-api", "sleep 5", "sudo systemctl status milo-api")
} | ConvertTo-Json

$cmd4 | Out-File -FilePath "cmd4.json" -Encoding ASCII -NoNewline
$r4 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://cmd4.json --output json
$id4 = ($r4 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 10

# Step 5: Test API
Write-Host "Step 5: Testing API..." -ForegroundColor Yellow
$cmd5 = @{
    commands = @("curl http://localhost:5001/api/health")
} | ConvertTo-Json

$cmd5 | Out-File -FilePath "cmd5.json" -Encoding ASCII -NoNewline
$r5 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://cmd5.json --output json
$id5 = ($r5 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 5

Write-Host "`nGetting results..." -ForegroundColor Cyan
Write-Host "Command IDs: $id1, $id2, $id3, $id4, $id5" -ForegroundColor Gray

# Cleanup
Remove-Item cmd*.json -ErrorAction SilentlyContinue

Write-Host "`nDone! Check AWS Console for command results." -ForegroundColor Green
Write-Host "Or run: aws ssm get-command-invocation --command-id <ID> --instance-id $instanceId" -ForegroundColor Gray

