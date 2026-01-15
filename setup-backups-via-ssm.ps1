# Setup Automated Database Backups via SSM
# This script sets up project-based backups with S3 sync

$instanceId = "i-06bc5b2218c041802"
$region = "eu-west-1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SETTING UP DATABASE BACKUPS VIA SSM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Copy backup script to EC2
Write-Host "Step 1: Copying backup script to EC2..." -ForegroundColor Yellow

$setupCommands = @(
    "cd /home/ec2-user/milo",
    "git config --global --add safe.directory /home/ec2-user/milo",
    "git pull origin main 2>&1 || git pull origin master 2>&1",
    "chmod +x /home/ec2-user/milo/backup-database-by-project.sh",
    "cp /home/ec2-user/milo/backup-database-by-project.sh /home/ec2-user/backup-database.sh",
    "chmod +x /home/ec2-user/backup-database.sh",
    "echo '✅ Backup script installed'"
)

$setupCmdJson = ($setupCommands | ConvertTo-Json -Compress)
$setupCmdId = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters "commands=$setupCmdJson" --region $region --query "Command.CommandId" --output text
Write-Host "  Command ID: $setupCmdId" -ForegroundColor Gray
Start-Sleep -Seconds 5

# Step 2: Create S3 bucket and setup
Write-Host ""
Write-Host "Step 2: Setting up S3 bucket..." -ForegroundColor Yellow

$s3Commands = @(
    "if ! command -v aws &> /dev/null; then",
    "  echo '⚠️  AWS CLI not installed. Installing...'",
    "  sudo yum install aws-cli -y",
    "fi",
    "S3_BUCKET='milo-db-backups'",
    "REGION='eu-west-1'",
    "if aws s3 ls `"s3://$S3_BUCKET`" 2>&1 | grep -q 'NoSuchBucket'; then",
    "  echo 'Creating S3 bucket...'",
    "  aws s3 mb `"s3://$S3_BUCKET`" --region `"$REGION`"",
    "  echo '✅ S3 bucket created'",
    "else",
    "  echo '✅ S3 bucket already exists'",
    "fi",
    "echo 'Setting up S3 versioning...'",
    "aws s3api put-bucket-versioning --bucket `"$S3_BUCKET`" --versioning-configuration Status=Enabled --region `"$REGION`" 2>&1 || echo 'Versioning already enabled'",
    "echo '✅ S3 setup complete'"
)

$s3CmdJson = ($s3Commands | ConvertTo-Json -Compress)
$s3CmdId = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters "commands=$s3CmdJson" --region $region --query "Command.CommandId" --output text
Write-Host "  Command ID: $s3CmdId" -ForegroundColor Gray
Start-Sleep -Seconds 5

# Step 3: Test backup script
Write-Host ""
Write-Host "Step 3: Testing backup script..." -ForegroundColor Yellow

$testCommands = @(
    "mkdir -p /home/ec2-user/db-backups",
    "echo 'Running test backup...'",
    "/home/ec2-user/backup-database.sh 2>&1 | tail -20",
    "echo ''",
    "echo '=== Backup Test Complete ==='",
    "ls -lh /home/ec2-user/db-backups/ 2>/dev/null | head -10 || echo 'No backups yet'"
)

$testCmdJson = ($testCommands | ConvertTo-Json -Compress)
$testCmdId = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters "commands=$testCmdJson" --region $region --timeout-seconds 300 --query "Command.CommandId" --output text
Write-Host "  Command ID: $testCmdId" -ForegroundColor Gray
Start-Sleep -Seconds 5

# Step 4: Setup cron job
Write-Host ""
Write-Host "Step 4: Setting up cron job for daily backups at 2 AM..." -ForegroundColor Yellow

$cronCommands = @(
    "(crontab -l 2>/dev/null | grep -v backup-database.sh; echo '0 2 * * * /home/ec2-user/backup-database.sh >> /home/ec2-user/backup.log 2>&1') | crontab -",
    "echo '✅ Cron job installed'",
    "echo 'Current cron jobs:'",
    "crontab -l | grep backup || echo 'No backup cron job found'"
)

$cronCmdJson = ($cronCommands | ConvertTo-Json -Compress)
$cronCmdId = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters "commands=$cronCmdJson" --region $region --query "Command.CommandId" --output text
Write-Host "  Command ID: $cronCmdId" -ForegroundColor Gray

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BACKUP SETUP COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Green
Write-Host "  • Backup script: /home/ec2-user/backup-database.sh" -ForegroundColor White
Write-Host "  • Backup directory: /home/ec2-user/db-backups/" -ForegroundColor White
Write-Host "  • S3 bucket: s3://milo-db-backups/" -ForegroundColor White
Write-Host "  • Organization: By project folders" -ForegroundColor White
Write-Host "  • Schedule: Daily at 2:00 AM" -ForegroundColor White
Write-Host "  • Retention: 7 days local, 30 days S3" -ForegroundColor White
Write-Host ""
Write-Host "💰 Estimated Cost:" -ForegroundColor Yellow
Write-Host "  • 1-3 projects: FREE (within free tier)" -ForegroundColor White
Write-Host "  • 5-10 projects: ~$0.58/month" -ForegroundColor White
Write-Host "  • 20+ projects: ~$1.96/month" -ForegroundColor White
Write-Host ""
Write-Host "📖 Check status:" -ForegroundColor Cyan
Write-Host "  aws ssm get-command-invocation --command-id $testCmdId --instance-id $instanceId --region $region" -ForegroundColor Gray
Write-Host ""
