# SSH to EC2 instance

param(
    [Parameter(Mandatory=$false)]
    [string]$KeyPath = "",
    
    [Parameter(Mandatory=$false)]
    [string]$PublicDns = "ec2-34-246-3-141.eu-west-1.compute.amazonaws.com",
    
    [Parameter(Mandatory=$false)]
    [string]$Username = "ec2-user"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SSH to EC2 Instance" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Find SSH key
if ([string]::IsNullOrEmpty($KeyPath)) {
    $possibleKeys = @(
        "$env:USERPROFILE\.ssh\codingeverestkey.pem",
        "$env:USERPROFILE\.ssh\codingeverest.pem",
        "$env:USERPROFILE\.ssh\ec2-key.pem",
        "$env:USERPROFILE\Downloads\codingeverestkey.pem",
        "$env:USERPROFILE\Desktop\codingeverestkey.pem",
        "$PSScriptRoot\codingeverestkey.pem"
    )
    
    foreach ($key in $possibleKeys) {
        if (Test-Path $key) {
            $KeyPath = $key
            Write-Host "Found SSH key: $KeyPath" -ForegroundColor Green
            break
        }
    }
    
    if ([string]::IsNullOrEmpty($KeyPath)) {
        Write-Host "SSH key not found in common locations." -ForegroundColor Yellow
        Write-Host "Looking for: codingeverestkey.pem" -ForegroundColor Yellow
        $KeyPath = Read-Host "Enter full path to SSH key file"
    }
}

if (-not (Test-Path $KeyPath)) {
    Write-Host "SSH key not found: $KeyPath" -ForegroundColor Red
    Write-Host "`nPlease download the key file or provide the correct path." -ForegroundColor Yellow
    exit
}

# Set correct permissions (if on WSL/Linux subsystem)
Write-Host "`nSSH Connection Details:" -ForegroundColor Yellow
Write-Host "  Key: $KeyPath" -ForegroundColor Cyan
Write-Host "  User: $Username" -ForegroundColor Cyan
Write-Host "  Host: $PublicDns" -ForegroundColor Cyan
Write-Host ""

# Check if SSH is available
$sshAvailable = Get-Command ssh -ErrorAction SilentlyContinue
if (-not $sshAvailable) {
    Write-Host "SSH not found. Options:" -ForegroundColor Red
    Write-Host "1. Install OpenSSH for Windows" -ForegroundColor Yellow
    Write-Host "2. Use WSL (Windows Subsystem for Linux)" -ForegroundColor Yellow
    Write-Host "3. Use PuTTY or another SSH client" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "SSH command would be:" -ForegroundColor Cyan
    Write-Host "  ssh -i `"$KeyPath`" $Username@$PublicDns" -ForegroundColor White
    exit
}

# Build SSH command
$sshCommand = "ssh -i `"$KeyPath`" -o StrictHostKeyChecking=no $Username@$PublicDns"

Write-Host "Connecting to EC2 instance..." -ForegroundColor Green
Write-Host "Command: $sshCommand" -ForegroundColor Cyan
Write-Host ""

# Execute SSH
Invoke-Expression $sshCommand

