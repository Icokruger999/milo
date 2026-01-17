# Setup Automated Database Backups
# This script configures automated daily backups for the Milo database

param(
    [string]$InstanceId = "i-06bc5b2218c041802",
    [string]$Region = "us-east-1"
)

Write-Host "=== Setting Up Automated Database Backups ===" -ForegroundColor Cyan
Write-Host ""

# 1. Upload backup script to EC2
Write-Host "1. Uploading backup script to EC2..." -ForegroundColor Yellow
$backupScriptContent = Get-Content -Path "backup-database.sh" -Raw
$uploadCommand = @"
cat > /home/ec2-user/backup-database.sh << 'BACKUP_SCRIPT_EOF'
$backupScriptContent
BACKUP_SCRIPT_EOF

chmod +x /home/ec2-user/backup-database.sh
echo 'Backup script uploaded and made executable'
ls -lh /home/ec2-user/backup-database.sh
"@

$result1 = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$uploadCommand]" `
    --region $Region `
    --output json | ConvertFrom-Json

Start-Sleep -Seconds 3
$output1 = aws ssm get-command-invocation `
    --command-id $result1.Command.CommandId `
    --instance-id $InstanceId `
    --region $Region `
    --output json | ConvertFrom-Json

Write-Host $output1.StandardOutputContent
if ($output1.StandardErrorContent) {
    Write-Host "Errors:" -ForegroundColor Red
    Write-Host $output1.StandardErrorContent
}
Write-Host ""

# 2. Create backup directory
Write-Host "2. Creating backup directory..." -ForegroundColor Yellow
$createDirCommand = @"
mkdir -p /home/ec2-user/db-backups
echo 'Backup directory created'
ls -ld /home/ec2-user/db-backups
"@

$result2 = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$createDirCommand]" `
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

# 3. Test backup script manually
Write-Host "3. Testing backup script..." -ForegroundColor Yellow
$testBackupCommand = @"
echo 'Running backup script manually...'
/home/ec2-user/backup-database.sh
echo ''
echo 'Checking if backup was created:'
ls -lh /home/ec2-user/db-backups/ | tail -5
"@

$result3 = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$testBackupCommand]" `
    --region $Region `
    --output json | ConvertFrom-Json

Start-Sleep -Seconds 5
$output3 = aws ssm get-command-invocation `
    --command-id $result3.Command.CommandId `
    --instance-id $InstanceId `
    --region $Region `
    --output json | ConvertFrom-Json

Write-Host $output3.StandardOutputContent
if ($output3.StandardErrorContent) {
    Write-Host "Errors:" -ForegroundColor Red
    Write-Host $output3.StandardErrorContent
}
Write-Host ""

# 4. Set up cron job for daily backups at 2 AM
Write-Host "4. Setting up cron job for daily backups..." -ForegroundColor Yellow
$setupCronCommand = @"
# Remove existing backup cron jobs
crontab -l 2>/dev/null | grep -v 'backup-database.sh' > /tmp/crontab_temp || true

# Add new cron job (daily at 2 AM)
echo '0 2 * * * /home/ec2-user/backup-database.sh >> /home/ec2-user/backup.log 2>&1' >> /tmp/crontab_temp

# Install new crontab
crontab /tmp/crontab_temp
rm /tmp/crontab_temp

echo 'Cron job configured:'
crontab -l | grep backup
"@

$result4 = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$setupCronCommand]" `
    --region $Region `
    --output json | ConvertFrom-Json

Start-Sleep -Seconds 3
$output4 = aws ssm get-command-invocation `
    --command-id $result4.Command.CommandId `
    --instance-id $InstanceId `
    --region $Region `
    --output json | ConvertFrom-Json

Write-Host $output4.StandardOutputContent
if ($output4.StandardErrorContent) {
    Write-Host "Errors:" -ForegroundColor Red
    Write-Host $output4.StandardErrorContent
}
Write-Host ""

# 5. Install AWS CLI if not present (for S3 sync)
Write-Host "5. Checking AWS CLI installation..." -ForegroundColor Yellow
$checkAwsCliCommand = @"
if command -v aws &> /dev/null; then
    echo 'AWS CLI is already installed'
    aws --version
else
    echo 'Installing AWS CLI...'
    sudo yum install -y aws-cli
    echo 'AWS CLI installed:'
    aws --version
fi
"@

$result5 = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$checkAwsCliCommand]" `
    --region $Region `
    --output json | ConvertFrom-Json

Start-Sleep -Seconds 5
$output5 = aws ssm get-command-invocation `
    --command-id $result5.Command.CommandId `
    --instance-id $InstanceId `
    --region $Region `
    --output json | ConvertFrom-Json

Write-Host $output5.StandardOutputContent
Write-Host ""

# Summary
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Backup Configuration:" -ForegroundColor Cyan
Write-Host "- Backup script: /home/ec2-user/backup-database.sh"
Write-Host "- Backup directory: /home/ec2-user/db-backups"
Write-Host "- Schedule: Daily at 2:00 AM"
Write-Host "- Retention: 7 days (local)"
Write-Host "- Log file: /home/ec2-user/backup.log"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Create S3 bucket for off-site backups: aws s3 mb s3://milo-db-backups"
Write-Host "2. Verify backups are running: ./verify-backups.ps1"
Write-Host "3. Test restore procedure: See BACKUP_SOLUTIONS.md"
Write-Host ""
