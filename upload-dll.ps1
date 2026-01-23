# Upload MailKit DLL to EC2 via GitHub
$ErrorActionPreference = "Stop"

Write-Host "=== Deploying MailKit Email Fix ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Step 1: Copying MailKit DLL to temp location..."
Copy-Item "backend/Milo.API/publish-mailkit/Milo.API.dll" "Milo.API.dll.new" -Force
$dllSize = (Get-Item "Milo.API.dll.new").Length / 1KB
Write-Host "DLL Size: $([math]::Round($dllSize, 2)) KB" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Committing to GitHub..."
git add Milo.API.dll.new
git commit -m "Deploy MailKit email fix"
git push

Write-Host ""
Write-Host "Step 3: Deploying via SSM..." -ForegroundColor Yellow
$script = @'
cd /tmp
echo "Downloading MailKit DLL from GitHub..."
curl -L -o Milo.API.dll.new "https://raw.githubusercontent.com/ico-apps/milo/main/milo/Milo.API.dll.new"
ls -lh Milo.API.dll.new
echo "Backing up current DLL..."
timestamp=$(date +%Y%m%d_%H%M%S)
sudo cp /home/ec2-user/milo-backend-publish/Milo.API.dll /home/ec2-user/milo-backend-publish/Milo.API.dll.backup-$timestamp
echo "Stopping service..."
sudo systemctl stop milo-backend
echo "Installing new DLL..."
sudo cp Milo.API.dll.new /home/ec2-user/milo-backend-publish/Milo.API.dll
sudo chown ec2-user:ec2-user /home/ec2-user/milo-backend-publish/Milo.API.dll
echo "Starting service..."
sudo systemctl start milo-backend
sleep 3
echo "Service status:"
sudo systemctl status milo-backend --no-pager
'@

$commandId = (aws ssm send-command `
    --instance-ids i-06bc5b2218c041802 `
    --document-name "AWS-RunShellScript" `
    --parameters commands="$script" `
    --region eu-west-1 `
    --output json | ConvertFrom-Json).Command.CommandId

Write-Host "Command ID: $commandId"
Write-Host "Waiting for deployment to complete..."
Start-Sleep -Seconds 10

$output = (aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id i-06bc5b2218c041802 `
    --region eu-west-1 `
    --output json | ConvertFrom-Json).StandardOutputContent

Write-Host ""
Write-Host "=== Deployment Output ===" -ForegroundColor Cyan
Write-Host $output

if ($output -match "active \(running\)") {
    Write-Host ""
    Write-Host "SUCCESS! MailKit email service deployed and running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Go to https://www.codingeverest.com/milo-flakes.html"
    Write-Host "2. Open any flake and click 'Share via Email'"
    Write-Host "3. Send a test email - HTML should render properly now!"
} else {
    Write-Host ""
    Write-Host "WARNING: Service may not be running properly" -ForegroundColor Yellow
    Write-Host "Check logs manually on the server"
}
