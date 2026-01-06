# PowerShell script to clean up old code on EC2 instance

param(
    [Parameter(Mandatory=$false)]
    [string]$PublicIp = "34.246.3.141",
    
    [Parameter(Mandatory=$false)]
    [string]$Username = "ec2-user",
    
    [Parameter(Mandatory=$false)]
    [string]$KeyPath = "",
    
    [Parameter(Mandatory=$false)]
    [string]$TargetDirectory = "/var/www"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "EC2 Cleanup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get SSH key if not provided
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
            Write-Host "Found SSH key: $KeyPath" -ForegroundColor Green
            break
        }
    }
    
    if ([string]::IsNullOrEmpty($KeyPath)) {
        $KeyPath = Read-Host "Enter path to SSH private key (.pem file)"
    }
}

if (-not (Test-Path $KeyPath)) {
    Write-Host "SSH key not found: $KeyPath" -ForegroundColor Red
    exit
}

Write-Host "`nTarget EC2 Instance:" -ForegroundColor Yellow
Write-Host "  IP: $PublicIp" -ForegroundColor Cyan
Write-Host "  Username: $Username" -ForegroundColor Cyan
Write-Host "  Key: $KeyPath" -ForegroundColor Cyan
Write-Host "  Directory: $TargetDirectory" -ForegroundColor Cyan
Write-Host ""

# First, let's see what's currently on the EC2
Write-Host "Scanning for existing applications..." -ForegroundColor Yellow
$listCmd = "ssh -i `"$KeyPath`" -o StrictHostKeyChecking=no $Username@$PublicIp `"ls -la $TargetDirectory 2>/dev/null || echo 'Directory does not exist'`""
$existingDirs = Invoke-Expression $listCmd

Write-Host "`nCurrent contents of $TargetDirectory:" -ForegroundColor Cyan
Write-Host $existingDirs -ForegroundColor White
Write-Host ""

# Check for common application directories
Write-Host "Checking for common application directories..." -ForegroundColor Yellow
$checkCmd = "ssh -i `"$KeyPath`" -o StrictHostKeyChecking=no $Username@$PublicIp `"for dir in $TargetDirectory/*; do if [ -d `$dir ]; then echo `$dir; fi; done`""
$dirs = Invoke-Expression $checkCmd

if ($dirs -and $dirs -notmatch "does not exist") {
    Write-Host "`nFound directories:" -ForegroundColor Yellow
    $dirs | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
} else {
    Write-Host "No directories found in $TargetDirectory" -ForegroundColor Green
}

# Check for systemd services
Write-Host "`nChecking for existing systemd services..." -ForegroundColor Yellow
$servicesCmd = "ssh -i `"$KeyPath`" -o StrictHostKeyChecking=no $Username@$PublicIp `"sudo systemctl list-units --type=service --state=running | grep -E '(api|app|backend|web)' || echo 'No matching services found'`""
$services = Invoke-Expression $servicesCmd
Write-Host $services -ForegroundColor White

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Cleanup Options" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Clean specific directory (e.g., /var/www/old-app)" -ForegroundColor White
Write-Host "2. Clean all in /var/www (keeps milo-api if exists)" -ForegroundColor White
Write-Host "3. Clean and remove all systemd services (api/app/backend)" -ForegroundColor White
Write-Host "4. Full cleanup (directories + services + ports)" -ForegroundColor White
Write-Host "5. Custom cleanup (you specify what to remove)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Select cleanup option (1-5)"

switch ($choice) {
    "1" {
        $targetDir = Read-Host "Enter directory path to clean (e.g., /var/www/old-app)"
        Write-Host "`nCleaning $targetDir..." -ForegroundColor Yellow
        
        # Stop any services using this directory
        $stopCmd = "ssh -i `"$KeyPath`" -o StrictHostKeyChecking=no $Username@$PublicIp `"sudo systemctl list-units --type=service --all | grep -E '(api|app|backend)' | awk '{print `$1}' | xargs -r sudo systemctl stop 2>/dev/null || true`""
        Invoke-Expression $stopCmd
        
        # Remove directory
        $cleanCmd = "ssh -i `"$KeyPath`" -o StrictHostKeyChecking=no $Username@$PublicIp `"sudo rm -rf $targetDir && echo 'Directory removed successfully'`""
        Invoke-Expression $cleanCmd
        
        Write-Host "Directory cleaned!" -ForegroundColor Green
    }
    
    "2" {
        Write-Host "`nCleaning /var/www (preserving milo-api if exists)..." -ForegroundColor Yellow
        
        $cleanCmd = @"
ssh -i "$KeyPath" -o StrictHostKeyChecking=no $Username@$PublicIp "
    # Stop services
    sudo systemctl list-units --type=service --all | grep -E '(api|app|backend|web)' | awk '{print \$1}' | xargs -r sudo systemctl stop 2>/dev/null || true
    
    # Remove all except milo-api
    cd $TargetDirectory
    for dir in */; do
        if [ \"\${dir%/}\" != \"milo-api\" ]; then
            echo \"Removing \${dir%/}...\"
            sudo rm -rf \"\${dir%/}\"
        fi
    done
    
    echo 'Cleanup complete (milo-api preserved)'
"
"@
        Invoke-Expression $cleanCmd
        Write-Host "Cleanup complete!" -ForegroundColor Green
    }
    
    "3" {
        Write-Host "`nStopping and removing systemd services..." -ForegroundColor Yellow
        
        $serviceCmd = @"
ssh -i "$KeyPath" -o StrictHostKeyChecking=no $Username@$PublicIp "
    # Find and stop services
    for service in \$(sudo systemctl list-units --type=service --all | grep -E '(api|app|backend|web)' | awk '{print \$1}'); do
        echo \"Stopping \$service...\"
        sudo systemctl stop \$service 2>/dev/null || true
        sudo systemctl disable \$service 2>/dev/null || true
    done
    
    # Remove service files
    sudo rm -f /etc/systemd/system/*api*.service
    sudo rm -f /etc/systemd/system/*app*.service
    sudo rm -f /etc/systemd/system/*backend*.service
    sudo rm -f /etc/systemd/system/*web*.service
    
    sudo systemctl daemon-reload
    echo 'Services removed'
"
"@
        Invoke-Expression $serviceCmd
        Write-Host "Services cleaned!" -ForegroundColor Green
    }
    
    "4" {
        Write-Host "`nPerforming FULL cleanup..." -ForegroundColor Red
        Write-Host "This will remove:" -ForegroundColor Yellow
        Write-Host "  - All directories in /var/www (except milo-api)" -ForegroundColor White
        Write-Host "  - All API/app/backend systemd services" -ForegroundColor White
        Write-Host "  - Old application files" -ForegroundColor White
        
        $confirm = Read-Host "`nAre you sure? (yes/no)"
        if ($confirm -ne "yes") {
            Write-Host "Cleanup cancelled." -ForegroundColor Yellow
            exit
        }
        
        $fullCleanCmd = @"
ssh -i "$KeyPath" -o StrictHostKeyChecking=no $Username@$PublicIp "
    echo 'Stopping services...'
    sudo systemctl list-units --type=service --all | grep -E '(api|app|backend|web)' | awk '{print \$1}' | xargs -r sudo systemctl stop 2>/dev/null || true
    
    echo 'Removing service files...'
    sudo rm -f /etc/systemd/system/*api*.service
    sudo rm -f /etc/systemd/system/*app*.service
    sudo rm -f /etc/systemd/system/*backend*.service
    sudo rm -f /etc/systemd/system/*web*.service
    
    echo 'Cleaning /var/www (preserving milo-api)...'
    cd $TargetDirectory
    for dir in */; do
        if [ \"\${dir%/}\" != \"milo-api\" ]; then
            echo \"Removing \${dir%/}...\"
            sudo rm -rf \"\${dir%/}\"
        fi
    done
    
    sudo systemctl daemon-reload
    echo 'Full cleanup complete'
"
"@
        Invoke-Expression $fullCleanCmd
        Write-Host "`nFull cleanup complete!" -ForegroundColor Green
    }
    
    "5" {
        Write-Host "`nCustom cleanup mode" -ForegroundColor Yellow
        Write-Host "Enter commands to run on EC2 (one per line, type 'DONE' when finished):" -ForegroundColor Cyan
        
        $commands = @()
        while ($true) {
            $cmd = Read-Host "Command"
            if ($cmd -eq "DONE") { break }
            if ($cmd) { $commands += $cmd }
        }
        
        if ($commands.Count -gt 0) {
            $confirm = Read-Host "`nExecute these commands? (y/n)"
            if ($confirm -eq "y") {
                foreach ($cmd in $commands) {
                    Write-Host "Executing: $cmd" -ForegroundColor Yellow
                    $execCmd = "ssh -i `"$KeyPath`" -o StrictHostKeyChecking=no $Username@$PublicIp `"$cmd`""
                    Invoke-Expression $execCmd
                }
                Write-Host "Custom cleanup complete!" -ForegroundColor Green
            }
        }
    }
    
    default {
        Write-Host "Invalid option. Exiting." -ForegroundColor Red
        exit
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Cleanup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "You can now deploy the new Milo backend using:" -ForegroundColor Cyan
Write-Host "  .\deploy-to-ec2.ps1" -ForegroundColor White
Write-Host ""

