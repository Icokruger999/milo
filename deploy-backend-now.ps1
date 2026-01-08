# Deploy backend from GitHub to EC2 via SSM

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying Backend from GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$instanceId = "i-06bc5b2218c041802"

Write-Host "Sending deployment command to EC2..." -ForegroundColor Yellow
Write-Host ""

$commandId = aws ssm send-command --cli-input-json file://deploy-backend-from-github.json --query "Command.CommandId" --output text

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to send command" -ForegroundColor Red
    exit 1
}

Write-Host "Command ID: $commandId" -ForegroundColor Green
Write-Host ""
Write-Host "This will take about 30-60 seconds..." -ForegroundColor Yellow
Write-Host "- Pulling latest code from GitHub" -ForegroundColor Yellow
Write-Host "- Building backend with .NET" -ForegroundColor Yellow
Write-Host "- Restarting service" -ForegroundColor Yellow
Write-Host ""

# Wait for build to complete
for ($i = 1; $i -le 12; $i++) {
    Start-Sleep -Seconds 5
    $status = aws ssm get-command-invocation --command-id $commandId --instance-id $instanceId --query "Status" --output text 2>$null
    
    if ($status -eq "Success") {
        Write-Host "Deployment completed successfully!" -ForegroundColor Green
        break
    } elseif ($status -eq "Failed") {
        Write-Host "Deployment failed" -ForegroundColor Red
        break
    } else {
        Write-Host "$i/12: Still deploying..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Getting deployment output..." -ForegroundColor Cyan
Write-Host ""

$output = aws ssm get-command-invocation --command-id $commandId --instance-id $instanceId --query "StandardOutputContent" --output text 2>$null

if ($output) {
    Write-Host $output
}

$errorOutput = aws ssm get-command-invocation --command-id $commandId --instance-id $instanceId --query "StandardErrorContent" --output text 2>$null

if ($errorOutput -and $errorOutput -ne "None" -and $errorOutput.Trim() -ne "") {
    Write-Host ""
    Write-Host "Errors:" -ForegroundColor Red
    Write-Host $errorOutput -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Endpoints" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 3

Write-Host "1. Health Check:" -ForegroundColor Yellow
$health = curl.exe -s https://api.codingeverest.com/api/health
if ($health -match "ok") {
    Write-Host "   OK: $health" -ForegroundColor Green
} else {
    Write-Host "   ERROR: $health" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Flakes Endpoint:" -ForegroundColor Yellow
$flakes = curl.exe -s https://api.codingeverest.com/api/flakes
if ($flakes) {
    Write-Host "   SUCCESS: $flakes" -ForegroundColor Green
} else {
    Write-Host "   SUCCESS: (empty array)" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All Done! Try creating a flake now!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

