# Simple EC2 Deployment Script for Milo Backend

$InstanceId = "i-06bc5b2218c041802"
$PublicIp = "34.246.3.141"
$Username = "ec2-user"

Write-Host "Deploying Milo Backend to EC2..." -ForegroundColor Cyan

# Find SSH key
$keyPaths = @(
    "$env:USERPROFILE\.ssh\codingeverestkey.pem",
    "$env:USERPROFILE\Downloads\codingeverestkey.pem"
)
$KeyPath = $null
foreach ($path in $keyPaths) {
    if (Test-Path $path) {
        $KeyPath = $path
        break
    }
}

if (-not $KeyPath) {
    $KeyPath = Read-Host "Enter path to SSH key (.pem file)"
}

# Build
Write-Host "Building..." -ForegroundColor Yellow
Set-Location backend\Milo.API
dotnet publish -c Release -o .\publish
Set-Location ..\..

# Deploy
Write-Host "Deploying..." -ForegroundColor Yellow
ssh -i $KeyPath -o StrictHostKeyChecking=no $Username@$PublicIp "sudo mkdir -p /var/www/milo-api; sudo chown -R $Username:$Username /var/www/milo-api"
scp -i $KeyPath -r .\backend\Milo.API\publish\* $Username@${PublicIp}:/var/www/milo-api/

# Create service
$serviceFile = @"
[Unit]
Description=Milo API
After=network.target

[Service]
Type=notify
ExecStart=/usr/bin/dotnet /var/www/milo-api/Milo.API.dll
Restart=always
RestartSec=10
User=$Username
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://0.0.0.0:5000

[Install]
WantedBy=multi-user.target
"@

$serviceFile | Out-File -FilePath .\milo-api.service -Encoding UTF8
scp -i $KeyPath .\milo-api.service $Username@${PublicIp}:/tmp/
ssh -i $KeyPath $Username@$PublicIp "sudo mv /tmp/milo-api.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable milo-api && sudo systemctl restart milo-api"
Remove-Item .\milo-api.service

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Test: curl http://$PublicIp:5000/api/health" -ForegroundColor Cyan

