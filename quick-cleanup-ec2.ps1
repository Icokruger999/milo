# Quick cleanup script - removes everything in /var/www except milo-api

param(
    [Parameter(Mandatory=$false)]
    [string]$PublicIp = "34.246.3.141",
    
    [Parameter(Mandatory=$false)]
    [string]$Username = "ec2-user",
    
    [Parameter(Mandatory=$false)]
    [string]$KeyPath = ""
)

Write-Host "Quick EC2 Cleanup" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host ""

# Get SSH key
if ([string]::IsNullOrEmpty($KeyPath)) {
    $possibleKeys = @(
        "$env:USERPROFILE\.ssh\codingeverest.pem",
        "$env:USERPROFILE\.ssh\ec2-key.pem",
        "$env:USERPROFILE\.ssh\id_rsa",
        "$env:USERPROFILE\.ssh\id_ed25519"
    )
    
    foreach ($key in $possibleKeys) {
        if (Test-Path $key) {
            $KeyPath = $key
            break
        }
    }
    
    if ([string]::IsNullOrEmpty($KeyPath)) {
        $KeyPath = Read-Host "Enter path to SSH private key (.pem file)"
    }
}

if (-not (Test-Path $KeyPath)) {
    Write-Host "SSH key not found!" -ForegroundColor Red
    exit
}

Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  - Stop all API/app/backend services" -ForegroundColor White
Write-Host "  - Remove all directories in /var/www (except milo-api)" -ForegroundColor White
Write-Host "  - Remove old systemd service files" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit
}

Write-Host "`nCleaning up..." -ForegroundColor Yellow

$cleanupScript = @"
# Stop all services
echo 'Stopping services...'
sudo systemctl list-units --type=service --all | grep -E '(api|app|backend|web|milo)' | awk '{print \$1}' | xargs -r sudo systemctl stop 2>/dev/null || true

# Remove service files
echo 'Removing service files...'
sudo rm -f /etc/systemd/system/*api*.service
sudo rm -f /etc/systemd/system/*app*.service
sudo rm -f /etc/systemd/system/*backend*.service
sudo rm -f /etc/systemd/system/*web*.service

# Clean /var/www (keep milo-api)
echo 'Cleaning /var/www...'
if [ -d /var/www ]; then
    cd /var/www
    for dir in */; do
        if [ -d \"\$dir\" ] && [ \"\${dir%/}\" != \"milo-api\" ]; then
            echo \"Removing \${dir%/}...\"
            sudo rm -rf \"\${dir%/}\"
        fi
    done
fi

# Clean /opt if needed
if [ -d /opt ]; then
    echo 'Cleaning /opt...'
    sudo rm -rf /opt/*api* /opt/*app* /opt/*backend* 2>/dev/null || true
fi

sudo systemctl daemon-reload
echo 'Cleanup complete!'
"@

# Write script to temp file
$tempScript = [System.IO.Path]::GetTempFileName()
$cleanupScript | Out-File -FilePath $tempScript -Encoding UTF8

# Copy and execute
$scpCmd = "scp -i `"$KeyPath`" -o StrictHostKeyChecking=no $tempScript $Username@${PublicIp}:/tmp/cleanup.sh"
Invoke-Expression $scpCmd

$execCmd = "ssh -i `"$KeyPath`" -o StrictHostKeyChecking=no $Username@$PublicIp `"chmod +x /tmp/cleanup.sh && sudo bash /tmp/cleanup.sh && rm /tmp/cleanup.sh`""
Invoke-Expression $execCmd

# Cleanup local temp file
Remove-Item $tempScript -ErrorAction SilentlyContinue

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Cleanup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Old code has been removed. Ready to deploy Milo!" -ForegroundColor Cyan
Write-Host "Run: .\deploy-to-ec2.ps1" -ForegroundColor White
Write-Host ""

