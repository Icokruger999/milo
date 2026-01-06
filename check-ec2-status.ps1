# Check EC2 status and verify cleanup

param(
    [Parameter(Mandatory=$false)]
    [string]$PublicIp = "34.246.3.141",
    
    [Parameter(Mandatory=$false)]
    [string]$Username = "ec2-user",
    
    [Parameter(Mandatory=$false)]
    [string]$KeyPath = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "EC2 Status Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
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

Write-Host "Checking EC2 instance: $PublicIp" -ForegroundColor Yellow
Write-Host ""

# Check /var/www directory
Write-Host "1. Checking /var/www directory..." -ForegroundColor Cyan
$wwwCheck = ssh -i $KeyPath -o StrictHostKeyChecking=no "$Username@$PublicIp" "if [ -d /var/www ]; then echo 'EXISTS'; ls -la /var/www; else echo 'NOT_EXISTS'; fi"
Write-Host $wwwCheck -ForegroundColor White
Write-Host ""

# Check for existing services
Write-Host "2. Checking systemd services..." -ForegroundColor Cyan
$services = ssh -i $KeyPath -o StrictHostKeyChecking=no "$Username@$PublicIp" "systemctl list-units --type=service --all | grep -E '(api|app|backend|web|milo)' || echo 'No matching services found'"
Write-Host $services -ForegroundColor White
Write-Host ""

# Check for .NET runtime
Write-Host "3. Checking .NET runtime..." -ForegroundColor Cyan
$dotnet = ssh -i $KeyPath -o StrictHostKeyChecking=no "$Username@$PublicIp" "dotnet --version 2>&1 || echo 'NOT_INSTALLED'"
Write-Host $dotnet -ForegroundColor White
Write-Host ""

# Check home directory for any remaining files
Write-Host "4. Checking home directory for api/app/backend files..." -ForegroundColor Cyan
$homeCheck = ssh -i $KeyPath -o StrictHostKeyChecking=no "$Username@$PublicIp" "ls -la ~ | grep -E '(api|app|backend)' || echo 'No matching files in home directory'"
Write-Host $homeCheck -ForegroundColor White
Write-Host ""

# Check port 5000
Write-Host "5. Checking if port 5000 is listening..." -ForegroundColor Cyan
$portCheck = ssh -i $KeyPath -o StrictHostKeyChecking=no "$Username@$PublicIp" "sudo netstat -tlnp | grep 5000 || echo 'Port 5000 not in use'"
Write-Host $portCheck -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "Status Check Complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "- If /var/www doesn't exist, it will be created during deployment" -ForegroundColor White
Write-Host "- If .NET is not installed, install it before deploying" -ForegroundColor White
Write-Host "- Run: .\deploy-to-ec2.ps1 to deploy Milo backend" -ForegroundColor Cyan
Write-Host ""

