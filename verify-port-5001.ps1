# Verify port 5001 is accessible and service is listening correctly
$instanceId = "i-06bc5b2218c041802"

Write-Host "Verifying port 5001 configuration..." -ForegroundColor Cyan

# Check if service is listening on 0.0.0.0:5001
$cmd = @{
    commands = @(
        "sudo netstat -tlnp | grep 5001",
        "sudo systemctl status milo-api --no-pager | head -10"
    )
} | ConvertTo-Json

$cmd | Out-File -FilePath "verify-port.json" -Encoding ASCII -NoNewline
$response = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://verify-port.json --output json
$commandId = ($response | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 5

$result = aws ssm get-command-invocation --command-id $commandId --instance-id $instanceId --output json
$json = $result -replace '[^\x00-\x7F]', ''
$obj = $json | ConvertFrom-Json

Write-Host "`n=== Port 5001 Status ===" -ForegroundColor Yellow
Write-Host $obj.StandardOutputContent

Remove-Item verify-port.json -ErrorAction SilentlyContinue

