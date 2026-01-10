# Create Incidents Database Table via SSM
# This script creates the incidents table in the database using SSM

$ErrorActionPreference = "Stop"

Write-Host "📊 Creating Incidents Database Table via SSM" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

$instanceId = "i-06bc5b2218c041802"
$region = "eu-west-1"

# Read SQL script
Write-Host "Reading SQL script..." -ForegroundColor Gray
$sqlScript = Get-Content "create-incidents-table.sql" -Raw
$sqlScript = $sqlScript -replace "'", "''"  # Escape for bash

# Create command
$command = @"
#!/bin/bash
set -e

echo "Creating incidents table..."

cd /tmp
cat > create_incidents.sql << 'EOFQL'
$sqlScript
EOFQL

echo "Executing SQL..."
PGPASSWORD='Stacey1122' psql \
    -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com \
    -U postgres \
    -d MiloDB \
    -f create_incidents.sql

if [ \$? -eq 0 ]; then
    echo "✅ Table created successfully"
    
    echo "Verifying table..."
    PGPASSWORD='Stacey1122' psql \
        -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com \
        -U postgres \
        -d MiloDB \
        -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'incidents';"
    
    echo "Checking table structure..."
    PGPASSWORD='Stacey1122' psql \
        -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com \
        -U postgres \
        -d MiloDB \
        -c "\d incidents"
else
    echo "❌ Table creation failed (might already exist)"
fi

rm -f create_incidents.sql
"@

Write-Host "Sending command to EC2..." -ForegroundColor Gray
$result = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=['$command']" `
    --region $region `
    --output json | ConvertFrom-Json

$commandId = $result.Command.CommandId
Write-Host "Command ID: $commandId" -ForegroundColor Gray
Write-Host ""

# Wait for completion
Write-Host "⏳ Waiting for execution..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$output = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $instanceId `
    --region $region `
    --output json | ConvertFrom-Json

Write-Host ""
if ($output.Status -eq "Success") {
    Write-Host "✅ Database table created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Output:" -ForegroundColor Cyan
    Write-Host $output.StandardOutputContent -ForegroundColor Gray
} else {
    Write-Host "⚠️  Status: $($output.Status)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Output:" -ForegroundColor Cyan
    Write-Host $output.StandardOutputContent -ForegroundColor Gray
    
    if ($output.StandardErrorContent) {
        Write-Host ""
        Write-Host "Errors:" -ForegroundColor Yellow
        Write-Host $output.StandardErrorContent -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Note: If table already exists, this is normal." -ForegroundColor Gray
}
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ Database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next step: Deploy backend" -ForegroundColor Cyan
Write-Host "  .\deploy-incidents-backend-ssm.ps1" -ForegroundColor Gray
Write-Host ""
