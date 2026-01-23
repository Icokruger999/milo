# Simple deployment script for MailKit fix
$instanceId = "i-0e8a8f682f0e2b5e5"
$dllPath = "backend/Milo.API/publish-mailkit/Milo.API.dll"

Write-Host "=== Deploying MailKit Email Fix ===" -ForegroundColor Cyan

# Step 1: Upload DLL to S3
Write-Host "Uploading DLL to S3..."
aws s3 cp $dllPath s3://milo-deployment-bucket/Milo.API.dll

# Step 2: Download and deploy on EC2
Write-Host "Deploying on EC2..."
$deployScript = @'
# Backup current DLL
timestamp=$(date +%Y%m%d_%H%M%S)
cp /home/ec2-user/milo-backend-publish/Milo.API.dll /home/ec2-user/milo-backend-publish/Milo.API.dll.backup-$timestamp

# Stop service
sudo systemctl stop milo-backend

# Download new DLL
aws s3 cp s3://milo-deployment-bucket/Milo.API.dll /tmp/Milo.API.dll
sudo mv /tmp/Milo.API.dll /home/ec2-user/milo-backend-publish/Milo.API.dll
sudo chown ec2-user:ec2-user /home/ec2-user/milo-backend-publish/Milo.API.dll

# Start service
sudo systemctl start milo-backend
sleep 3
sudo systemctl status milo-backend --no-pager
'@

$result = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters commands="$deployScript" `
    --output json | ConvertFrom-Json

$commandId = $result.Command.CommandId
Write-Host "Command ID: $commandId"
Write-Host "Waiting for deployment..."

Start-Sleep -Seconds 10

$output = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $instanceId `
    --output json | ConvertFrom-Json

Write-Host ""
Write-Host "=== Deployment Output ===" -ForegroundColor Cyan
Write-Host $output.StandardOutputContent

if ($output.StandardOutputContent -match "active") {
    Write-Host ""
    Write-Host "SUCCESS! Service is running with MailKit." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Check service status manually" -ForegroundColor Yellow
}
