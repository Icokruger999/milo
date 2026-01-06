# Open ports 80 and 443 for HTTPS
Write-Host "Opening ports 80 and 443 for HTTPS..." -ForegroundColor Yellow

$securityGroups = @(
    "sg-0eb3b878979ad2355",
    "sg-00069569b0ba2dcdf"
)

foreach ($sg in $securityGroups) {
    Write-Host "`nAdding ports to $sg..." -ForegroundColor Cyan
    
    # Port 80 (HTTP - for Let's Encrypt)
    aws ec2 authorize-security-group-ingress `
        --group-id $sg `
        --protocol tcp `
        --port 80 `
        --cidr 0.0.0.0/0
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Port 80 added" -ForegroundColor Green
    } else {
        Write-Host "Port 80 may already be open" -ForegroundColor Yellow
    }
    
    # Port 443 (HTTPS)
    aws ec2 authorize-security-group-ingress `
        --group-id $sg `
        --protocol tcp `
        --port 443 `
        --cidr 0.0.0.0/0
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Port 443 added" -ForegroundColor Green
    } else {
        Write-Host "Port 443 may already be open" -ForegroundColor Yellow
    }
}

Write-Host "`nPorts 80 and 443 are now open!" -ForegroundColor Green

