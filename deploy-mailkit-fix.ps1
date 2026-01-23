# Deploy MailKit Email Fix to EC2
# This script backs up the current DLL and deploys the new MailKit version

$instanceId = "i-0e8a8f682f0e2b5e5"
$dllPath = "backend/Milo.API/publish-mailkit/Milo.API.dll"
$remotePath = "/home/ec2-user/milo-backend-publish"

Write-Host "=== Deploying MailKit Email Fix ===" -ForegroundColor Cyan
Write-Host ""

# Check if DLL exists
if (-not (Test-Path $dllPath)) {
    Write-Host "ERROR: DLL not found at $dllPath" -ForegroundColor Red
    Write-Host "Please run: dotnet publish -c Release -o publish-mailkit" -ForegroundColor Yellow
    exit 1
}

$dllSize = (Get-Item $dllPath).Length / 1KB
Write-Host "DLL Size: $([math]::Round($dllSize, 2)) KB" -ForegroundColor Green

# Step 1: Backup current DLL on server
Write-Host ""
Write-Host "Step 1: Backing up current DLL..." -ForegroundColor Yellow
$backupCommand = "timestamp=`$(date +%Y%m%d_%H%M%S); cp $remotePath/Milo.API.dll $remotePath/Milo.API.dll.backup-`$timestamp; ls -lh $remotePath/Milo.API.dll*"

$backupResult = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$backupCommand]" `
    --output json | ConvertFrom-Json

$backupCommandId = $backupResult.Command.CommandId
Write-Host "Backup command ID: $backupCommandId"

# Wait for backup to complete
Start-Sleep -Seconds 3
$backupOutput = aws ssm get-command-invocation `
    --command-id $backupCommandId `
    --instance-id $instanceId `
    --output json | ConvertFrom-Json

if ($backupOutput.Status -eq "Success") {
    Write-Host "✓ Backup completed successfully" -ForegroundColor Green
    Write-Host $backupOutput.StandardOutputContent
} else {
    Write-Host "✗ Backup failed" -ForegroundColor Red
    Write-Host $backupOutput.StandardErrorContent
    exit 1
}

# Step 2: Stop the service
Write-Host ""
Write-Host "Step 2: Stopping milo-backend service..." -ForegroundColor Yellow
$stopCommand = "sudo systemctl stop milo-backend; sudo systemctl status milo-backend --no-pager"

$stopResult = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$stopCommand]" `
    --output json | ConvertFrom-Json

$stopCommandId = $stopResult.Command.CommandId
Start-Sleep -Seconds 3

$stopOutput = aws ssm get-command-invocation `
    --command-id $stopCommandId `
    --instance-id $instanceId `
    --output json | ConvertFrom-Json

Write-Host "✓ Service stopped" -ForegroundColor Green

# Step 3: Upload new DLL
Write-Host ""
Write-Host "Step 3: Uploading new DLL with MailKit..." -ForegroundColor Yellow

# Read DLL and encode to base64
$dllBytes = [System.IO.File]::ReadAllBytes($dllPath)
$dllBase64 = [Convert]::ToBase64String($dllBytes)

# Split into chunks (AWS SSM has a 4096 character limit per parameter)
$chunkSize = 4000
$chunks = @()
for ($i = 0; $i -lt $dllBase64.Length; $i += $chunkSize) {
    $length = [Math]::Min($chunkSize, $dllBase64.Length - $i)
    $chunks += $dllBase64.Substring($i, $length)
}

Write-Host "Uploading DLL in $($chunks.Count) chunks..."

# Upload first chunk
$uploadCommand = "echo '$($chunks[0])' > /tmp/dll.b64"

$uploadResult = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$uploadCommand]" `
    --output json | ConvertFrom-Json

Start-Sleep -Seconds 2

# Upload remaining chunks
for ($i = 1; $i -lt $chunks.Count; $i++) {
    Write-Host "Uploading chunk $($i + 1)/$($chunks.Count)..."
    $appendCommand = "echo '$($chunks[$i])' >> /tmp/dll.b64"
    
    $appendResult = aws ssm send-command `
        --instance-ids $instanceId `
        --document-name "AWS-RunShellScript" `
        --parameters "commands=[$appendCommand]" `
        --output json | ConvertFrom-Json
    
    Start-Sleep -Seconds 2
}

# Decode and move DLL
Write-Host "Decoding and installing DLL..."
$decodeCommand = "base64 -d /tmp/dll.b64 > /tmp/Milo.API.dll; sudo mv /tmp/Milo.API.dll $remotePath/Milo.API.dll; sudo chown ec2-user:ec2-user $remotePath/Milo.API.dll; ls -lh $remotePath/Milo.API.dll; rm /tmp/dll.b64"

$decodeResult = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$decodeCommand]" `
    --output json | ConvertFrom-Json

$decodeCommandId = $decodeResult.Command.CommandId
Start-Sleep -Seconds 3

$decodeOutput = aws ssm get-command-invocation `
    --command-id $decodeCommandId `
    --instance-id $instanceId `
    --output json | ConvertFrom-Json

if ($decodeOutput.Status -eq "Success") {
    Write-Host "✓ DLL uploaded successfully" -ForegroundColor Green
    Write-Host $decodeOutput.StandardOutputContent
} else {
    Write-Host "✗ DLL upload failed" -ForegroundColor Red
    Write-Host $decodeOutput.StandardErrorContent
    exit 1
}

# Step 4: Start the service
Write-Host ""
Write-Host "Step 4: Starting milo-backend service..." -ForegroundColor Yellow
$startCommand = "sudo systemctl start milo-backend; sleep 3; sudo systemctl status milo-backend --no-pager"

$startResult = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$startCommand]" `
    --output json | ConvertFrom-Json

$startCommandId = $startResult.Command.CommandId
Start-Sleep -Seconds 5

$startOutput = aws ssm get-command-invocation `
    --command-id $startCommandId `
    --instance-id $instanceId `
    --output json | ConvertFrom-Json

Write-Host $startOutput.StandardOutputContent

if ($startOutput.StandardOutputContent -match "active \(running\)") {
    Write-Host ""
    Write-Host "✓ Service started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Deployment Complete ===" -ForegroundColor Cyan
    Write-Host "The email service now uses MailKit for proper HTML email rendering." -ForegroundColor Green
    Write-Host "Test by sending an email from the Flakes page." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "✗ Service failed to start" -ForegroundColor Red
    Write-Host "Check logs with: sudo journalctl -u milo-backend -n 50" -ForegroundColor Yellow
}
