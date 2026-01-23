# Deploy using SCP
$dllPath = "backend/Milo.API/publish-mailkit/Milo.API.dll"
$keyPath = "~/.ssh/milo-ec2-key.pem"  # Update this path
$ec2Host = "ec2-user@api.codingeverest.com"

Write-Host "=== Deploying MailKit Email Fix via SCP ===" -ForegroundColor Cyan

# Check if DLL exists
if (-not (Test-Path $dllPath)) {
    Write-Host "ERROR: DLL not found" -ForegroundColor Red
    exit 1
}

Write-Host "1. Backing up current DLL on server..."
ssh -i $keyPath $ec2Host "timestamp=`$(date +%Y%m%d_%H%M%S); cp /home/ec2-user/milo-backend-publish/Milo.API.dll /home/ec2-user/milo-backend-publish/Milo.API.dll.backup-`$timestamp"

Write-Host "2. Stopping service..."
ssh -i $keyPath $ec2Host "sudo systemctl stop milo-backend"

Write-Host "3. Uploading new DLL..."
scp -i $keyPath $dllPath "${ec2Host}:/tmp/Milo.API.dll"

Write-Host "4. Installing DLL..."
ssh -i $keyPath $ec2Host "sudo mv /tmp/Milo.API.dll /home/ec2-user/milo-backend-publish/Milo.API.dll; sudo chown ec2-user:ec2-user /home/ec2-user/milo-backend-publish/Milo.API.dll"

Write-Host "5. Starting service..."
ssh -i $keyPath $ec2Host "sudo systemctl start milo-backend; sleep 3; sudo systemctl status milo-backend --no-pager"

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host "Test by sending an email from the Flakes page." -ForegroundColor Yellow
