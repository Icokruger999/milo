$cmdId = "9d61aa9c-5c71-4687-9b80-91bb05623083"
$instanceId = "i-06bc5b2218c041802"

Start-Sleep -Seconds 2

Write-Host "Getting command output..." -ForegroundColor Yellow

try {
    $output = aws ssm get-command-invocation `
        --command-id $cmdId `
        --instance-id $instanceId `
        --query "StandardOutputContent" `
        --output text 2>$null
    
    if ($output) {
        Write-Host $output
    } else {
        Write-Host "No output yet"
    }
} catch {
    Write-Host "Error: $_"
}

