# Simple cleanup using SSM - one command at a time

param(
    [Parameter(Mandatory=$false)]
    [string]$InstanceId = "i-06bc5b2218c041802"
)

Write-Host "Cleaning up old code on EC2..." -ForegroundColor Cyan
Write-Host "Instance: $InstanceId" -ForegroundColor Yellow
Write-Host ""

# Simple commands to run one by one
$cleanupCommands = @(
    "sudo systemctl list-units --type=service --all | grep -E '(api|app|backend|web)' | awk '{print `$1}' | xargs -r sudo systemctl stop 2>/dev/null || true",
    "sudo rm -f /etc/systemd/system/*api*.service /etc/systemd/system/*app*.service /etc/systemd/system/*backend*.service /etc/systemd/system/*web*.service",
    "if [ -d /var/www ]; then cd /var/www; for dir in */; do if [ -d `"`$dir`" ] && [ `"`${dir%/}`" != 'milo-api' ]; then sudo rm -rf `"`${dir%/}`"; fi; done; fi",
    "sudo rm -rf /opt/*api* /opt/*app* /opt/*backend* 2>/dev/null || true",
    "cd ~ && sudo rm -rf *api* *app* *backend* 2>/dev/null || true",
    "sudo systemctl daemon-reload",
    "ls -la /var/www 2>/dev/null || echo 'Directory does not exist'"
)

foreach ($cmd in $cleanupCommands) {
    Write-Host "Running: $cmd" -ForegroundColor Yellow
    
    $result = aws ssm send-command `
        --instance-ids $InstanceId `
        --document-name "AWS-RunShellScript" `
        --parameters "commands=[`"$cmd`"]" `
        --query "Command.CommandId" `
        --output text 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Command sent: $result" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "  Failed to send command" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
    }
}

Write-Host "`nCleanup commands sent. Check AWS Console for results." -ForegroundColor Green
Write-Host "Or use AWS Console Session Manager to verify:" -ForegroundColor Cyan
Write-Host "https://console.aws.amazon.com/systems-manager/session-manager" -ForegroundColor White

