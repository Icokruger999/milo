# Clean up old code on EC2 using AWS Systems Manager (no SSH required)

param(
    [Parameter(Mandatory=$false)]
    [string]$InstanceId = "i-06bc5b2218c041802"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup Old Code on EC2 (No SSH)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
Write-Host "Checking AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>&1
    Write-Host "AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "AWS CLI not found. Please install it first." -ForegroundColor Red
    exit
}

# Check SSM availability
Write-Host "`nChecking SSM agent status..." -ForegroundColor Yellow
$ssmStatus = aws ssm describe-instance-information --instance-information-filter-list key=InstanceIds,valueSet=$InstanceId --query "InstanceInformationList[0].PingStatus" --output text 2>&1

if ($ssmStatus -ne "Online") {
    Write-Host "SSM agent is not online. Status: $ssmStatus" -ForegroundColor Red
    Write-Host "`nTo enable SSM:" -ForegroundColor Yellow
    Write-Host "1. Attach IAM role with 'AmazonSSMManagedInstanceCore' policy to the instance" -ForegroundColor White
    Write-Host "2. Or use AWS Console Session Manager to connect" -ForegroundColor White
    Write-Host ""
    Write-Host "Alternatively, you can use AWS Console Session Manager:" -ForegroundColor Cyan
    Write-Host "  https://console.aws.amazon.com/systems-manager/session-manager" -ForegroundColor White
    exit
}

Write-Host "SSM agent is online. Proceeding with cleanup..." -ForegroundColor Green

# Cleanup script
$cleanupScript = @"
#!/bin/bash
set -e

echo "========================================"
echo "Cleaning up old code on EC2"
echo "========================================"
echo ""

# Stop all services
echo "1. Stopping services..."
systemctl list-units --type=service --all | grep -E '(api|app|backend|web)' | awk '{print \$1}' | xargs -r sudo systemctl stop 2>/dev/null || true

# Remove service files
echo "2. Removing service files..."
sudo rm -f /etc/systemd/system/*api*.service
sudo rm -f /etc/systemd/system/*app*.service
sudo rm -f /etc/systemd/system/*backend*.service
sudo rm -f /etc/systemd/system/*web*.service

# Show what's in /var/www before cleanup
echo ""
echo "3. Current contents of /var/www:"
if [ -d /var/www ]; then
    ls -la /var/www
else
    echo "  /var/www does not exist"
fi

# Clean /var/www (preserve milo-api if it exists)
echo ""
echo "4. Cleaning /var/www (preserving milo-api)..."
if [ -d /var/www ]; then
    cd /var/www
    for dir in */; do
        if [ -d "\$dir" ] && [ "\${dir%/}" != "milo-api" ]; then
            echo "  Removing \${dir%/}..."
            sudo rm -rf "\${dir%/}"
        fi
    done
fi

# Clean /opt if needed
echo ""
echo "5. Cleaning /opt..."
if [ -d /opt ]; then
    sudo rm -rf /opt/*api* /opt/*app* /opt/*backend* 2>/dev/null || true
fi

# Clean home directory (if any old files)
echo ""
echo "6. Checking home directory..."
cd ~
if ls -d *api* *app* *backend* 2>/dev/null; then
    echo "  Found files in home directory. Removing..."
    sudo rm -rf *api* *app* *backend* 2>/dev/null || true
else
    echo "  No matching files in home directory"
fi

# Reload systemd
echo ""
echo "7. Reloading systemd..."
sudo systemctl daemon-reload

# Show final state
echo ""
echo "========================================"
echo "Cleanup Complete!"
echo "========================================"
echo ""
echo "Final state of /var/www:"
if [ -d /var/www ]; then
    ls -la /var/www
else
    echo "  /var/www does not exist (will be created during deployment)"
fi

echo ""
echo "Remaining services:"
systemctl list-units --type=service --all | grep -E '(api|app|backend|web)' || echo "  No matching services found"
"@

# Execute via SSM
Write-Host "`nExecuting cleanup via SSM..." -ForegroundColor Yellow
Write-Host "This will remove all old code (preserving milo-api if it exists)..." -ForegroundColor Cyan
Write-Host "Proceeding with cleanup..." -ForegroundColor Green
Write-Host ""

Write-Host "`nSending cleanup command..." -ForegroundColor Yellow

# Build commands array
$commands = @()
$commands += "set -e"
$commands += "echo '========================================'"
$commands += "echo 'Cleaning up old code on EC2'"
$commands += "echo '========================================'"
$commands += "echo ''"
$commands += "echo '1. Stopping services...'"
$commands += "systemctl list-units --type=service --all | grep -E '(api|app|backend|web)' | awk '{print `$1}' | xargs -r sudo systemctl stop 2>/dev/null || true"
$commands += "echo '2. Removing service files...'"
$commands += "sudo rm -f /etc/systemd/system/*api*.service"
$commands += "sudo rm -f /etc/systemd/system/*app*.service"
$commands += "sudo rm -f /etc/systemd/system/*backend*.service"
$commands += "sudo rm -f /etc/systemd/system/*web*.service"
$commands += "echo ''"
$commands += "echo '3. Current contents of /var/www:'"
$commands += "if [ -d /var/www ]; then ls -la /var/www; else echo '  /var/www does not exist'; fi"
$commands += "echo ''"
$commands += "echo '4. Cleaning /var/www (preserving milo-api)...'"
$commands += "if [ -d /var/www ]; then cd /var/www; for dir in */; do if [ -d `"`$dir`" ] && [ `"`${dir%/}`" != 'milo-api' ]; then echo `"  Removing `${dir%/}...`"; sudo rm -rf `"`${dir%/}`"; fi; done; fi"
$commands += "echo ''"
$commands += "echo '5. Cleaning /opt...'"
$commands += "if [ -d /opt ]; then sudo rm -rf /opt/*api* /opt/*app* /opt/*backend* 2>/dev/null || true; fi"
$commands += "echo ''"
$commands += "echo '6. Checking home directory...'"
$commands += "cd ~"
$commands += "if ls -d *api* *app* *backend* 2>/dev/null; then echo '  Found files in home directory. Removing...'; sudo rm -rf *api* *app* *backend* 2>/dev/null || true; else echo '  No matching files in home directory'; fi"
$commands += "echo ''"
$commands += "echo '7. Reloading systemd...'"
$commands += "sudo systemctl daemon-reload"
$commands += "echo ''"
$commands += "echo '========================================'"
$commands += "echo 'Cleanup Complete!'"
$commands += "echo '========================================'"
$commands += "echo ''"
$commands += "echo 'Final state of /var/www:'"
$commands += "if [ -d /var/www ]; then ls -la /var/www; else echo '  /var/www does not exist (will be created during deployment)'; fi"
$commands += "echo ''"
$commands += "echo 'Remaining services:'"
$commands += "systemctl list-units --type=service --all | grep -E '(api|app|backend|web)' || echo '  No matching services found'"

# Create JSON file
$jsonContent = @{
    commands = $commands
} | ConvertTo-Json

$jsonFile = [System.IO.Path]::GetTempFileName() + ".json"
$jsonContent | Out-File -FilePath $jsonFile -Encoding UTF8 -NoNewline

Write-Host "Sending cleanup command..." -ForegroundColor Cyan

$commandId = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --cli-input-json "file://$jsonFile" `
    --query "Command.CommandId" `
    --output text 2>&1

Remove-Item $jsonFile -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host "Command sent. Command ID: $commandId" -ForegroundColor Green
    Write-Host "Waiting for command to complete..." -ForegroundColor Yellow
    
    # Wait for command to complete
    $maxWait = 120 # 2 minutes
    $waited = 0
    do {
        Start-Sleep -Seconds 3
        $waited += 3
        $status = aws ssm get-command-invocation --command-id $commandId --instance-id $InstanceId --query "Status" --output text 2>&1
        
        if ($status -eq "Success") {
            Write-Host "`nCleanup successful!" -ForegroundColor Green
            break
        } elseif ($status -eq "Failed" -or $status -eq "Cancelled") {
            Write-Host "`nCleanup failed!" -ForegroundColor Red
            break
        }
        
        Write-Host "." -NoNewline -ForegroundColor Cyan
    } while ($waited -lt $maxWait)
    
    # Get command output
    Write-Host "`n`nCleanup output:" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    $output = aws ssm get-command-invocation --command-id $commandId --instance-id $InstanceId --query "StandardOutputContent" --output text
    Write-Host $output -ForegroundColor White
    
    $errorOutput = aws ssm get-command-invocation --command-id $commandId --instance-id $InstanceId --query "StandardErrorContent" --output text
    if ($errorOutput -and $errorOutput -notmatch "^$") {
        Write-Host "`nErrors/Warnings:" -ForegroundColor Yellow
        Write-Host $errorOutput -ForegroundColor Yellow
    }
    
    Write-Host "========================================" -ForegroundColor Cyan
} else {
    Write-Host "Failed to send SSM command." -ForegroundColor Red
    Write-Host "`nAlternative: Use AWS Console Session Manager" -ForegroundColor Yellow
    Write-Host "1. Go to: https://console.aws.amazon.com/ec2" -ForegroundColor White
    Write-Host "2. Select your instance" -ForegroundColor White
    Write-Host "3. Click 'Connect' → 'Session Manager' → 'Connect'" -ForegroundColor White
    Write-Host "4. Run the cleanup commands manually" -ForegroundColor White
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Cleanup Process Complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Old code has been removed. Ready to deploy Milo!" -ForegroundColor Cyan
Write-Host "Run: .\deploy-to-ec2-ssm.ps1" -ForegroundColor White
Write-Host ""

