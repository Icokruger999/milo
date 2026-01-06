# Open port 443 for HTTPS on EC2 security group

$groupId = "sg-0eb3b878979ad2355"

Write-Host "Opening port 443 (HTTPS) for API..." -ForegroundColor Yellow

aws ec2 authorize-security-group-ingress `
  --group-id $groupId `
  --protocol tcp `
  --port 443 `
  --cidr 0.0.0.0/0

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Port 443 opened successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Port 443 may already be open or error occurred" -ForegroundColor Yellow
    Write-Host "Check manually in AWS Console" -ForegroundColor Cyan
}

