# Deploy directly via SSM using individual commands
param(
    [string]$InstanceId = "i-06bc5b2218c041802",
    [string]$BucketName = "milo-deploy-856125221"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Deploy to EC2 via SSM" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Download from S3
Write-Host "1. Downloading from S3..." -ForegroundColor Yellow
$cmd1 = "cd /tmp && aws s3 cp s3://$BucketName/milo-api-deploy.zip ./milo-api-deploy.zip"
$result1 = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[`"$cmd1`"]" --output json | ConvertFrom-Json
$cmdId1 = $result1.Command.CommandId
Start-Sleep -Seconds 15

# Step 2: Extract files
Write-Host "2. Extracting files..." -ForegroundColor Yellow
$cmd2 = "sudo mkdir -p /var/www/milo-api && cd /var/www/milo-api && sudo rm -rf * && sudo unzip -o /tmp/milo-api-deploy.zip && sudo chown -R ec2-user:ec2-user /var/www/milo-api"
$result2 = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[`"$cmd2`"]" --output json | ConvertFrom-Json
$cmdId2 = $result2.Command.CommandId
Start-Sleep -Seconds 10

# Step 3: Restart service
Write-Host "3. Restarting API service..." -ForegroundColor Yellow
$cmd3 = "sudo systemctl daemon-reload && sudo systemctl restart milo-api && sleep 15 && sudo systemctl status milo-api --no-pager -l | head -30"
$result3 = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[`"$cmd3`"]" --output json | ConvertFrom-Json
$cmdId3 = $result3.Command.CommandId

Write-Host "Waiting for service restart..." -ForegroundColor Green
Start-Sleep -Seconds 20

# Step 4: Check logs
Write-Host "`n4. Checking API logs for migrations..." -ForegroundColor Yellow
$cmd4 = "sudo journalctl -u milo-api -n 60 --no-pager | tail -40"
$result4 = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[`"$cmd4`"]" --output json | ConvertFrom-Json
$cmdId4 = $result4.Command.CommandId
Start-Sleep -Seconds 10

Write-Host "`nRecent API logs:" -ForegroundColor Cyan
$output4 = aws ssm get-command-invocation --command-id $cmdId4 --instance-id $InstanceId --query "StandardOutputContent" --output text 2>&1
Write-Host $output4 -ForegroundColor White

if ($output4 -match "migrations applied successfully") {
    Write-Host "`n=========================================" -ForegroundColor Green
    Write-Host "SUCCESS: Migrations applied successfully!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
} elseif ($output4 -match "Failed to connect") {
    Write-Host "`nStill seeing connection errors" -ForegroundColor Red
} else {
    Write-Host "`nCheck logs above" -ForegroundColor Yellow
}

Write-Host ""
