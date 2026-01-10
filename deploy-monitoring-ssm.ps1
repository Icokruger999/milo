# Deploy Milo Backend Monitoring and Auto-Recovery to EC2
# This sets up health checks, auto-restart, and email alerts

param(
    [Parameter(Mandatory=$false)]
    [string]$InstanceId = "i-06bc5b2218c041802",
    
    [Parameter(Mandatory=$false)]
    [string]$AlertEmail = "ico@astutetech.co.za"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Milo Backend Monitoring Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Read the monitoring script
$monitorScript = Get-Content -Path "monitor-milo-backend.sh" -Raw
$monitorScript = $monitorScript -replace "ALERT_EMAIL=`"ico@astutetech.co.za`"", "ALERT_EMAIL=`"$AlertEmail`""

# Create JSON command document with the monitoring script
$commands = @(
    "echo '=== Deploying Milo Backend Monitoring ==='",
    "cd /tmp",
    "cat > monitor-milo-backend.sh << 'MONITOREOF'",
    $monitorScript,
    "MONITOREOF",
    "chmod +x monitor-milo-backend.sh",
    "sudo mv monitor-milo-backend.sh /usr/local/bin/milo-monitor.sh",
    "sudo chown ec2-user:ec2-user /usr/local/bin/milo-monitor.sh",
    "echo 'Monitoring script installed'",
    "",
    "# Setup systemd service for auto-restart",
    "if [ ! -f /etc/systemd/system/milo-backend.service ]; then",
    "  echo 'Setting up systemd service...'",
    "  sudo tee /etc/systemd/system/milo-backend.service > /dev/null << 'SERVICEEOF'",
    "[Unit]",
    "Description=Milo API Backend Service",
    "After=network.target",
    "",
    "[Service]",
    "Type=notify",
    "User=ec2-user",
    "WorkingDirectory=/home/ec2-user/milo-backend-publish",
    "ExecStart=/usr/bin/dotnet /home/ec2-user/milo-backend-publish/Milo.API.dll --urls http://localhost:5001",
    "Restart=always",
    "RestartSec=10",
    "KillSignal=SIGINT",
    "TimeoutStopSec=30",
    "StandardOutput=append:/home/ec2-user/milo-backend.log",
    "StandardError=append:/home/ec2-user/milo-backend-error.log",
    "MemoryLimit=512M",
    "CPUQuota=50%",
    "Environment=ASPNETCORE_ENVIRONMENT=Production",
    "",
    "[Install]",
    "WantedBy=multi-user.target",
    "SERVICEEOF",
    "  sudo systemctl daemon-reload",
    "  sudo systemctl enable milo-backend",
    "  echo 'Systemd service enabled'",
    "else",
    "  echo 'Systemd service already exists'",
    "fi",
    "",
    "# Setup cron job (runs every 2 minutes)",
    "CRON_JOB='*/2 * * * * /usr/local/bin/milo-monitor.sh'",
    "(crontab -u ec2-user -l 2>/dev/null | grep -v 'milo-monitor.sh'; echo `"`$CRON_JOB`") | crontab -u ec2-user -",
    "echo 'Cron job configured'",
    "",
    "# Create log directory",
    "mkdir -p /home/ec2-user/logs",
    "touch /home/ec2-user/milo-monitor.log",
    "sudo chown ec2-user:ec2-user /home/ec2-user/milo-monitor.log",
    "echo 'Log directory created'",
    "",
    "# Test monitoring script",
    "echo 'Testing monitoring script...'",
    "sudo -u ec2-user /usr/local/bin/milo-monitor.sh",
    "echo ''",
    "echo '=== Monitoring Setup Complete ==='",
    "echo 'Monitor script: /usr/local/bin/milo-monitor.sh'",
    "echo 'Log file: /home/ec2-user/milo-monitor.log'",
    "echo 'Cron job: Check with: crontab -u ec2-user -l'",
    "echo 'Systemd service: systemctl status milo-backend'"
)

# Create JSON command document
$jsonCommands = $commands | ForEach-Object { 
    if ($_ -match "`$" -or $_ -match '"' -or $_ -match "MONITOREOF" -or $_ -match "SERVICEEOF") {
        $_.Replace('"', '\"').Replace('$', '\$')
    } else {
        $_
    }
}

$commandDoc = @{
    Parameters = @{
        commands = $jsonCommands
    }
} | ConvertTo-Json -Depth 10 -Compress

# Save to temporary file
$tempFile = [System.IO.Path]::GetTempFileName() + ".json"
$commandDoc | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "Deploying monitoring to EC2 instance: $InstanceId" -ForegroundColor Yellow
Write-Host "Alert email: $AlertEmail" -ForegroundColor Yellow
Write-Host ""

try {
    $result = aws ssm send-command `
        --document-name "AWS-RunShellScript" `
        --instance-ids $InstanceId `
        --cli-input-json "file://$tempFile" `
        --region eu-west-1 `
        --output json | ConvertFrom-Json
    
    $cmdId = $result.Command.CommandId
    Write-Host "Command ID: $cmdId" -ForegroundColor Green
    Write-Host "Waiting 30 seconds for deployment..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    $output = aws ssm get-command-invocation `
        --command-id $cmdId `
        --instance-id $InstanceId `
        --region eu-west-1 `
        --output json | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "=== DEPLOYMENT STATUS ===" -ForegroundColor Cyan
    Write-Host "Status: $($output.Status)" -ForegroundColor $(if ($output.Status -eq "Success") { "Green" } else { "Yellow" })
    
    if ($output.StandardOutputContent) {
        Write-Host ""
        Write-Host "Output:" -ForegroundColor White
        Write-Host $output.StandardOutputContent
    }
    
    if ($output.StandardErrorContent) {
        Write-Host ""
        Write-Host "Errors:" -ForegroundColor Yellow
        Write-Host $output.StandardErrorContent
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Monitoring Setup Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Monitoring Features:" -ForegroundColor Yellow
    Write-Host "  ✓ Health check every 2 minutes" -ForegroundColor Green
    Write-Host "  ✓ Auto-restart on failure" -ForegroundColor Green
    Write-Host "  ✓ Email alerts to: $AlertEmail" -ForegroundColor Green
    Write-Host "  ✓ Resource limits (512MB RAM, 50% CPU)" -ForegroundColor Green
    Write-Host "  ✓ Systemd service with auto-restart" -ForegroundColor Green
    Write-Host ""
    Write-Host "To check monitoring status:" -ForegroundColor Cyan
    Write-Host "  aws ssm send-command --instance-ids $InstanceId --document-name 'AWS-RunShellScript' --parameters 'commands=[\"tail -20 /home/ec2-user/milo-monitor.log\"]'" -ForegroundColor Gray
}
catch {
    Write-Host "ERROR: Failed to deploy monitoring" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
finally {
    # Clean up temp file
    if (Test-Path $tempFile) {
        Remove-Item $tempFile -Force
    }
}
