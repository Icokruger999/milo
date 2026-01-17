# Verify Database Backup Configuration
# This script checks if automated backups are configured and working

param(
    [string]$InstanceId = "i-06bc5b2218c041802",
    [string]$Region = "us-east-1"
)

Write-Host "=== Milo Database Backup Verification ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check if backup script exists on EC2
Write-Host "1. Checking if backup script exists..." -ForegroundColor Yellow
$checkScriptCommand = @"
if [ -f /home/ec2-user/backup-database.sh ]; then
    echo 'FOUND: Backup script exists'
    ls -lh /home/ec2-user/backup-database.sh
else
    echo 'NOT FOUND: Backup script does not exist'
fi
"@

$result1 = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$checkScriptCommand]" `
    --region $Region `
    --output json | ConvertFrom-Json

Start-Sleep -Seconds 3
$output1 = aws ssm get-command-invocation `
    --command-id $result1.Command.CommandId `
    --instance-id $InstanceId `
    --region $Region `
    --output json | ConvertFrom-Json

Write-Host $output1.StandardOutputContent
Write-Host ""

# 2. Check if cron job is configured
Write-Host "2. Checking if cron job is configured..." -ForegroundColor Yellow
$checkCronCommand = @"
echo 'Checking crontab for ec2-user:'
crontab -l 2>/dev/null | grep -i backup || echo 'No backup cron job found'
echo ''
echo 'Checking root crontab:'
sudo crontab -l 2>/dev/null | grep -i backup || echo 'No backup cron job found in root crontab'
"@

$result2 = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$checkCronCommand]" `
    --region $Region `
    --output json | ConvertFrom-Json

Start-Sleep -Seconds 3
$output2 = aws ssm get-command-invocation `
    --command-id $result2.Command.CommandId `
    --instance-id $InstanceId `
    --region $Region `
    --output json | ConvertFrom-Json

Write-Host $output2.StandardOutputContent
Write-Host ""

# 3. Check if backup directory exists and has recent backups
Write-Host "3. Checking backup directory..." -ForegroundColor Yellow
$checkBackupDirCommand = @"
if [ -d /home/ec2-user/db-backups ]; then
    echo 'Backup directory exists:'
    ls -lh /home/ec2-user/db-backups/ | tail -10
    echo ''
    echo 'Total backups:'
    ls -1 /home/ec2-user/db-backups/*.sql.gz 2>/dev/null | wc -l
    echo ''
    echo 'Most recent backup:'
    ls -lt /home/ec2-user/db-backups/*.sql.gz 2>/dev/null | head -1
else
    echo 'Backup directory does not exist'
fi
"@

$result3 = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$checkBackupDirCommand]" `
    --region $Region `
    --output json | ConvertFrom-Json

Start-Sleep -Seconds 3
$output3 = aws ssm get-command-invocation `
    --command-id $result3.Command.CommandId `
    --instance-id $InstanceId `
    --region $Region `
    --output json | ConvertFrom-Json

Write-Host $output3.StandardOutputContent
Write-Host ""

# 4. Check backup log
Write-Host "4. Checking backup log..." -ForegroundColor Yellow
$checkLogCommand = @"
if [ -f /home/ec2-user/backup.log ]; then
    echo 'Last 20 lines of backup log:'
    tail -20 /home/ec2-user/backup.log
else
    echo 'Backup log does not exist'
fi
"@

$result4 = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$checkLogCommand]" `
    --region $Region `
    --output json | ConvertFrom-Json

Start-Sleep -Seconds 3
$output4 = aws ssm get-command-invocation `
    --command-id $result4.Command.CommandId `
    --instance-id $InstanceId `
    --region $Region `
    --output json | ConvertFrom-Json

Write-Host $output4.StandardOutputContent
Write-Host ""

# 5. Check S3 bucket for backups (if configured)
Write-Host "5. Checking S3 bucket for backups..." -ForegroundColor Yellow
$checkS3Command = @"
if command -v aws &> /dev/null; then
    echo 'AWS CLI is installed'
    echo 'Checking S3 bucket: milo-db-backups'
    aws s3 ls s3://milo-db-backups/daily/ 2>&1 | tail -10 || echo 'S3 bucket not found or no access'
else
    echo 'AWS CLI not installed on EC2 instance'
fi
"@

$result5 = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$checkS3Command]" `
    --region $Region `
    --output json | ConvertFrom-Json

Start-Sleep -Seconds 3
$output5 = aws ssm get-command-invocation `
    --command-id $result5.Command.CommandId `
    --instance-id $InstanceId `
    --region $Region `
    --output json | ConvertFrom-Json

Write-Host $output5.StandardOutputContent
Write-Host ""

# Summary
Write-Host "=== Verification Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. If backup script doesn't exist, upload it: scp backup-database.sh ec2-user@instance:/home/ec2-user/"
Write-Host "2. If cron job not configured, set it up: crontab -e and add: 0 2 * * * /home/ec2-user/backup-database.sh"
Write-Host "3. If no recent backups, run manually: /home/ec2-user/backup-database.sh"
Write-Host "4. If S3 not configured, run: ./setup-backups-via-ssm.ps1"
Write-Host ""
