# Simple Backup Status Check
# This script checks the basic backup status

param(
    [string]$InstanceId = "i-06bc5b2218c041802",
    [string]$Region = "us-east-1"
)

Write-Host "=== Checking Backup Status ===" -ForegroundColor Cyan
Write-Host ""

# Check if backup script exists
Write-Host "Checking if backup script exists on EC2..." -ForegroundColor Yellow
$command1 = "ls -lh /home/ec2-user/backup-database.sh 2>/dev/null || echo 'Backup script not found'"
$result1 = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=$command1" --region $Region --output json | ConvertFrom-Json

Start-Sleep -Seconds 3
$output1 = aws ssm get-command-invocation --command-id $result1.Command.CommandId --instance-id $InstanceId --region $Region --output json | ConvertFrom-Json
Write-Host $output1.StandardOutputContent
Write-Host ""

# Check cron jobs
Write-Host "Checking cron jobs..." -ForegroundColor Yellow
$command2 = "crontab -l 2>/dev/null | grep backup || echo 'No backup cron job found'"
$result2 = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=$command2" --region $Region --output json | ConvertFrom-Json

Start-Sleep -Seconds 3
$output2 = aws ssm get-command-invocation --command-id $result2.Command.CommandId --instance-id $InstanceId --region $Region --output json | ConvertFrom-Json
Write-Host $output2.StandardOutputContent
Write-Host ""

# Check backup directory
Write-Host "Checking backup directory..." -ForegroundColor Yellow
$command3 = "ls -lh /home/ec2-user/db-backups/ 2>/dev/null | tail -5 || echo 'Backup directory not found'"
$result3 = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=$command3" --region $Region --output json | ConvertFrom-Json

Start-Sleep -Seconds 3
$output3 = aws ssm get-command-invocation --command-id $result3.Command.CommandId --instance-id $InstanceId --region $Region --output json | ConvertFrom-Json
Write-Host $output3.StandardOutputContent
Write-Host ""

Write-Host "=== Summary ===" -ForegroundColor Green
Write-Host "If backup script is missing, run: .\setup-automated-backups.ps1"
Write-Host "If cron job is missing, backups are not automated"
Write-Host "If backup directory is empty, no backups have been created yet"
Write-Host ""