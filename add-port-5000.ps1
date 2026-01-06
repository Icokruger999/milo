# Add port 5000 to EC2 security group for Milo API

Write-Host "Adding port 5000 to security groups..." -ForegroundColor Yellow

# Add to first security group
Write-Host "Adding to sg-0eb3b878979ad2355 (launch-wizard-2)..." -ForegroundColor Cyan
aws ec2 authorize-security-group-ingress `
  --group-id sg-0eb3b878979ad2355 `
  --protocol tcp `
  --port 5000 `
  --cidr 0.0.0.0/0 `
  --description "Milo API HTTP endpoint"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Port 5000 added successfully to launch-wizard-2!" -ForegroundColor Green
} else {
    Write-Host "Port may already be open or rule already exists." -ForegroundColor Yellow
}

# Add to second security group
Write-Host "`nAdding to sg-00069569b0ba2dcdf (ec2-rds-1)..." -ForegroundColor Cyan
aws ec2 authorize-security-group-ingress `
  --group-id sg-00069569b0ba2dcdf `
  --protocol tcp `
  --port 5000 `
  --cidr 0.0.0.0/0 `
  --description "Milo API HTTP endpoint"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Port 5000 added successfully to ec2-rds-1!" -ForegroundColor Green
} else {
    Write-Host "Port may already be open or rule already exists." -ForegroundColor Yellow
}

Write-Host "`nSecurity groups updated!" -ForegroundColor Green
Write-Host "API will be accessible at: http://34.246.3.141:5000" -ForegroundColor Cyan

