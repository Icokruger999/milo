# Run SQL file on RDS via EC2
# This uploads and executes the SQL file on EC2, which then connects to RDS

$instanceId = "i-06bc5b2218c041802"
$sqlFile = "create-flakes-table.sql"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Creating Flakes Table on RDS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Read SQL file
Write-Host "Reading SQL file..." -ForegroundColor Yellow
$sqlContent = Get-Content $sqlFile -Raw
$sqlContentEncoded = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($sqlContent))

# Create SSM command
$commandJson = @"
{
  "InstanceIds": ["$instanceId"],
  "DocumentName": "AWS-RunShellScript",
  "Comment": "Create Flakes table on RDS",
  "Parameters": {
    "commands": [
      "#!/bin/bash",
      "echo 'Decoding SQL file...'",
      "echo '$sqlContentEncoded' | base64 -d > /tmp/create-flakes-table.sql",
      "echo 'Reading RDS connection string...'",
      "cd /var/www/milo-api",
      "CONN_STRING=\$(cat appsettings.json | grep -A 1 'DefaultConnection' | tail -1 | sed 's/.*: \"\\(.*\\)\".*/\\1/')",
      "DB_HOST=\$(echo \$CONN_STRING | sed 's/.*Host=\\([^;]*\\).*/\\1/')",
      "DB_NAME=\$(echo \$CONN_STRING | sed 's/.*Database=\\([^;]*\\).*/\\1/')",
      "DB_USER=\$(echo \$CONN_STRING | sed 's/.*Username=\\([^;]*\\).*/\\1/')",
      "DB_PASS=\$(echo \$CONN_STRING | sed 's/.*Password=\\([^;]*\\).*/\\1/')",
      "echo \"Connecting to: \$DB_HOST / \$DB_NAME\"",
      "echo ''",
      "echo 'Installing PostgreSQL client if needed...'",
      "sudo yum install -y postgresql 2>&1 | grep -i 'already\\|complete'",
      "echo ''",
      "echo 'Running SQL script...'",
      "PGPASSWORD=\$DB_PASS psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f /tmp/create-flakes-table.sql",
      "echo ''",
      "echo 'Restarting API service...'",
      "sudo systemctl restart milo-api",
      "sleep 3",
      "echo ''",
      "echo 'Testing flakes endpoint...'",
      "curl -s http://localhost:5001/api/flakes",
      "echo ''",
      "echo 'Done!'"
    ]
  }
}
"@

$commandJson | Out-File -FilePath "temp-sql-command.json" -Encoding UTF8

Write-Host "Sending command to EC2..." -ForegroundColor Yellow
$commandId = aws ssm send-command --cli-input-json file://temp-sql-command.json --query "Command.CommandId" --output text

Remove-Item "temp-sql-command.json"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to send command" -ForegroundColor Red
    exit 1
}

Write-Host "Command ID: $commandId" -ForegroundColor Green
Write-Host "Waiting for execution (20 seconds)..." -ForegroundColor Yellow
Write-Host ""

Start-Sleep -Seconds 20

# Get results
$output = aws ssm get-command-invocation --command-id $commandId --instance-id $instanceId --output json 2>$null | ConvertFrom-Json

Write-Host "Status: $($output.Status)" -ForegroundColor $(if ($output.Status -eq 'Success') {'Green'} else {'Yellow'})
Write-Host ""

if ($output.StandardOutputContent) {
    Write-Host "Output:" -ForegroundColor Cyan
    Write-Host $output.StandardOutputContent
}

if ($output.StandardErrorContent -and $output.StandardErrorContent.Trim() -ne "") {
    Write-Host ""
    Write-Host "Errors:" -ForegroundColor Yellow
    Write-Host $output.StandardErrorContent
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Flakes Endpoint" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 3

$result = curl.exe -s https://api.codingeverest.com/api/flakes
if ($result -match "^\[") {
    Write-Host "SUCCESS! Flakes endpoint is working!" -ForegroundColor Green
    Write-Host "Response: $result" -ForegroundColor Green
} else {
    Write-Host "Response: $result" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Try creating a flake in your browser now!" -ForegroundColor Cyan

