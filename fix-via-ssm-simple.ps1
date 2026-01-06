# Fix milo-api service via AWS Systems Manager
$instanceId = "i-06bc5b2218c041802"

Write-Host "Fixing milo-api service via SSM..." -ForegroundColor Cyan

# Create JSON file for commands
$commands = @(
    "echo 'Adding timeout to service file...'",
    "sudo sed -i '/\[Service\]/a TimeoutStartSec=60' /etc/systemd/system/milo-api.service",
    "sudo systemctl daemon-reload",
    "sudo systemctl stop milo-api",
    "sleep 2",
    "sudo systemctl start milo-api",
    "sleep 5",
    "sudo systemctl status milo-api --no-pager",
    "curl http://localhost:5001/api/health"
)

$jsonContent = @{
    commands = $commands
} | ConvertTo-Json

$jsonFile = "ssm-commands.json"
$jsonContent | Out-File -FilePath $jsonFile -Encoding UTF8 -NoNewline
$content = Get-Content $jsonFile -Raw
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Resolve-Path $jsonFile), $content, $utf8NoBom)

Write-Host "Sending commands to EC2..." -ForegroundColor Yellow
$response = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters file://$jsonFile `
    --output json | ConvertFrom-Json

$commandId = $response.Command.CommandId
Write-Host "Command ID: $commandId" -ForegroundColor Gray
Write-Host "Waiting 20 seconds for commands to complete..." -ForegroundColor Gray
Start-Sleep -Seconds 20

Write-Host "`nGetting command output..." -ForegroundColor Yellow
$output = aws ssm get-command-invocation --command-id $commandId --instance-id $instanceId --output json | ConvertFrom-Json

Write-Host "`n=== Command Output ===" -ForegroundColor Green
Write-Host $output.StandardOutputContent

if ($output.StandardErrorContent) {
    Write-Host "`n=== Errors ===" -ForegroundColor Red
    Write-Host $output.StandardErrorContent
}

Write-Host "`n=== Status ===" -ForegroundColor Cyan
Write-Host "Status: $($output.Status)"
Write-Host "Exit Code: $($output.ResponseCode)"

# Cleanup
Remove-Item $jsonFile -ErrorAction SilentlyContinue

Write-Host "`nDone!" -ForegroundColor Green

