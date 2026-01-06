# Update RDS Password on EC2 via SSM
# Run this after deployment to set the correct RDS password

param(
    [Parameter(Mandatory=$true)]
    [string]$RdsPassword,
    
    [Parameter(Mandatory=$false)]
    [string]$InstanceId = "i-06bc5b2218c041802"
)

Write-Host "Updating RDS password in appsettings.json..." -ForegroundColor Cyan

$updateCmd = @"
# Read current appsettings.json
cd /var/www/milo-api
sudo cp appsettings.json appsettings.json.backup

# Update connection string with password
sudo sed -i "s/Password=.*;/Password=$RdsPassword;/" appsettings.json

# Verify change
echo "Updated connection string:"
grep "DefaultConnection" appsettings.json | sed 's/Password=[^;]*/Password=***/'

# Restart service
sudo systemctl restart milo-api
sleep 5

# Check status
sudo systemctl status milo-api --no-pager -l | head -15
"@

$commands = @($updateCmd)
$json = ConvertTo-Json -InputObject $commands -Compress

$result = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=$json" `
    --output json | ConvertFrom-Json

$commandId = $result.Command.CommandId

Write-Host "`n✅ Update command sent!" -ForegroundColor Green
Write-Host "Command ID: $commandId" -ForegroundColor Cyan
Write-Host "`nWaiting 30 seconds..." -ForegroundColor Yellow

Start-Sleep -Seconds 30

$status = aws ssm get-command-invocation --command-id $commandId --instance-id $InstanceId --output json | ConvertFrom-Json

Write-Host "`n=== Status ===" -ForegroundColor Yellow
Write-Host "Status: $($status.Status)" -ForegroundColor $(if($status.Status -eq 'Success'){'Green'}else{'Red'})

if ($status.StandardOutputContent) {
    Write-Host "`nOutput:" -ForegroundColor Cyan
    Write-Host $status.StandardOutputContent -ForegroundColor White
}

if ($status.StandardErrorContent -and $status.Status -ne 'Success') {
    Write-Host "`nErrors:" -ForegroundColor Red
    Write-Host $status.StandardErrorContent -ForegroundColor Red
}

Write-Host "`n=== Test API ===" -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "http://34.246.3.141:5001/api/health" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ API is accessible!" -ForegroundColor Green
    Write-Host $healthCheck.Content -ForegroundColor White
} catch {
    Write-Host "⚠️  API not accessible. Check logs on EC2." -ForegroundColor Yellow
}

