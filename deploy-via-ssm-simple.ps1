# Simple deployment via SSM - Run deploy script that's already on EC2
# This assumes deploy-from-github.sh exists on the EC2 instance

$instanceId = "i-06bc5b2218c041802"

Write-Host "Deploying backend to EC2 via SSM..." -ForegroundColor Cyan

# Run the deployment script with proper environment variables
$commands = @(
    "export HOME=/home/ec2-user",
    "export DOTNET_CLI_HOME=/home/ec2-user/.dotnet",
    "cd /home/ec2-user",
    "bash deploy-from-github.sh"
)

$json = $commands | ConvertTo-Json -Compress

$result = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=$json" `
    --output json | ConvertFrom-Json

$commandId = $result.Command.CommandId

Write-Host "`nDeployment command sent!" -ForegroundColor Green
Write-Host "Command ID: $commandId" -ForegroundColor Cyan
Write-Host "`nWaiting 2-3 minutes for deployment..." -ForegroundColor Yellow

Start-Sleep -Seconds 150

$status = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $instanceId `
    --output json | ConvertFrom-Json

Write-Host "`n=== Deployment Status ===" -ForegroundColor Yellow
Write-Host "Status: $($status.Status)" -ForegroundColor $(if($status.Status -eq 'Success'){'Green'}else{'Red'})
Write-Host "Response Code: $($status.ResponseCode)" -ForegroundColor White

if ($status.StandardOutputContent) {
    Write-Host "`nOutput:" -ForegroundColor Cyan
    Write-Host $status.StandardOutputContent -ForegroundColor White
}

if ($status.StandardErrorContent -and $status.Status -ne 'Success') {
    Write-Host "`nErrors:" -ForegroundColor Red
    Write-Host $status.StandardErrorContent -ForegroundColor Red
}

