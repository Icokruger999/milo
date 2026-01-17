# Simple backup check using JSON format
param(
    [string]$InstanceId = "i-06bc5b2218c041802",
    [string]$Region = "us-east-1"
)

Write-Host "=== Simple Backup Check ===" -ForegroundColor Cyan

# Create a simple command file
$commandFile = @{
    "commands" = @("ls -lh /home/ec2-user/backup-database.sh || echo 'Script not found'")
}

$commandJson = $commandFile | ConvertTo-Json -Compress

Write-Host "Checking backup script..." -ForegroundColor Yellow
$result = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters $commandJson --region $Region --output json | ConvertFrom-Json

if ($result.Command.CommandId) {
    Start-Sleep -Seconds 3
    $output = aws ssm get-command-invocation --command-id $result.Command.CommandId --instance-id $InstanceId --region $Region --output json | ConvertFrom-Json
    Write-Host $output.StandardOutputContent
} else {
    Write-Host "Failed to execute command" -ForegroundColor Red
}

Write-Host ""
Write-Host "Manual check recommended: Connect to EC2 via Session Manager and run:"
Write-Host "ls -lh /home/ec2-user/backup-database.sh"
Write-Host "crontab -l | grep backup"
Write-Host "ls -lh /home/ec2-user/db-backups/"