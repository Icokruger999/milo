# Simple deployment via SSM - deploy already built files
param(
    [string]$InstanceId = "i-06bc5b2218c041802",
    [string]$BucketName = ""
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Simple Deployment to EC2 via SSM" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# If bucket name not provided, create one
if ([string]::IsNullOrEmpty($BucketName)) {
    $BucketName = "milo-deploy-$(Get-Random)"
    Write-Host "Creating S3 bucket: $BucketName" -ForegroundColor Yellow
    aws s3 mb "s3://$BucketName" --region us-east-1 2>&1 | Out-Null
}

# Upload zip file
Write-Host "Uploading deployment package to S3..." -ForegroundColor Yellow
aws s3 cp ".\milo-api-deploy.zip" "s3://$BucketName/milo-api-deploy.zip" --region us-east-1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit
}

Write-Host "Upload successful!" -ForegroundColor Green

# Create simple deployment command
Write-Host "`nDeploying to EC2..." -ForegroundColor Yellow

$deployCmd = @"
cd /tmp && \
aws s3 cp s3://$BucketName/milo-api-deploy.zip ./milo-api-deploy.zip && \
sudo mkdir -p /var/www/milo-api && \
cd /var/www/milo-api && \
sudo rm -rf * && \
unzip -o /tmp/milo-api-deploy.zip && \
sudo chown -R ec2-user:ec2-user /var/www/milo-api && \
sudo systemctl daemon-reload && \
sudo systemctl restart milo-api && \
sleep 10 && \
sudo systemctl status milo-api --no-pager -l | head -30
"@

$result = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[`"$deployCmd`"]" --output json | ConvertFrom-Json
$commandId = $result.Command.CommandId

if ($commandId) {
    Write-Host "Deployment command sent! Command ID: $commandId" -ForegroundColor Green
    Write-Host "Waiting for deployment to complete (this may take 2-3 minutes)..." -ForegroundColor Yellow
    
    $maxWait = 180
    $waited = 0
    do {
        Start-Sleep -Seconds 10
        $waited += 10
        $status = aws ssm get-command-invocation --command-id $commandId --instance-id $InstanceId --query "Status" --output text 2>&1
        
        if ($status -eq "Success") {
            Write-Host "`nDeployment successful!" -ForegroundColor Green
            break
        } elseif ($status -eq "Failed" -or $status -eq "Cancelled") {
            Write-Host "`nDeployment failed!" -ForegroundColor Red
            break
        }
        
        Write-Host "." -NoNewline -ForegroundColor Cyan
    } while ($waited -lt $maxWait)
    
    Write-Host "`n`nDeployment output:" -ForegroundColor Yellow
    $output = aws ssm get-command-invocation --command-id $commandId --instance-id $InstanceId --query "StandardOutputContent" --output text 2>&1
    Write-Host $output
    
    $errorOutput = aws ssm get-command-invocation --command-id $commandId --instance-id $InstanceId --query "StandardErrorContent" --output text 2>&1
    if ($errorOutput -and $errorOutput -ne "None") {
        Write-Host "`nErrors:" -ForegroundColor Red
        Write-Host $errorOutput -ForegroundColor Red
    }
    
    # Cleanup S3
    Write-Host "`nCleaning up S3 bucket..." -ForegroundColor Yellow
    aws s3 rm "s3://$BucketName/milo-api-deploy.zip" 2>&1 | Out-Null
    aws s3 rb "s3://$BucketName" --force 2>&1 | Out-Null
    
    Write-Host "`n=========================================" -ForegroundColor Green
    Write-Host "Deployment Complete!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Check logs for migrations:" -ForegroundColor Cyan
    Write-Host "  aws ssm send-command --instance-ids $InstanceId --document-name AWS-RunShellScript --parameters commands=[sudo journalctl -u milo-api -n 50 --no-pager]" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "Failed to send deployment command!" -ForegroundColor Red
}
