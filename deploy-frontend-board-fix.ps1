# Deploy Frontend Board Layout Fix
# Frontend-only changes: HTML and JS files
# No backend changes required

$instanceId = "i-06bc5b2218c041802"
$region = "eu-west-1"
$frontendPath = "/var/www/milo-api"

Write-Host "🚀 Deploying Frontend Board Layout Fix..." -ForegroundColor Cyan

# Step 1: Copy updated HTML file
Write-Host "📄 Copying milo-board.html..." -ForegroundColor Yellow
$htmlContent = Get-Content -Path "frontend/milo-board.html" -Raw
$htmlBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($htmlContent))

$command = @"
echo '$htmlBase64' | base64 -d > $frontendPath/milo-board.html
"@

$result = aws ssm send-command `
    --instance-ids $instanceId `
    --region $region `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=['$command']" `
    --output json | ConvertFrom-Json

$commandId = $result.Command.CommandId
Write-Host "✅ HTML deployment command sent: $commandId" -ForegroundColor Green

# Step 2: Copy updated JS file
Write-Host "📄 Copying board.js..." -ForegroundColor Yellow
$jsContent = Get-Content -Path "frontend/js/board.js" -Raw
$jsBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($jsContent))

$command = @"
echo '$jsBase64' | base64 -d > $frontendPath/js/board.js
"@

$result = aws ssm send-command `
    --instance-ids $instanceId `
    --region $region `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=['$command']" `
    --output json | ConvertFrom-Json

$commandId = $result.Command.CommandId
Write-Host "✅ JS deployment command sent: $commandId" -ForegroundColor Green

# Step 3: Verify files were copied
Write-Host "🔍 Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

$verifyCommand = "ls -la $frontendPath/milo-board.html $frontendPath/js/board.js"
$result = aws ssm send-command `
    --instance-ids $instanceId `
    --region $region `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=['$verifyCommand']" `
    --output json | ConvertFrom-Json

$commandId = $result.Command.CommandId
Start-Sleep -Seconds 2

$output = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $instanceId `
    --region $region `
    --output json | ConvertFrom-Json

Write-Host $output.StandardOutputContent -ForegroundColor Cyan

Write-Host "`n✅ Frontend deployment complete!" -ForegroundColor Green
Write-Host "📝 Changes deployed:" -ForegroundColor Cyan
Write-Host "   - milo-board.html (board layout and card sizing)" -ForegroundColor White
Write-Host "   - js/board.js (project name breadcrumb update)" -ForegroundColor White
Write-Host "`n💡 Clear browser cache and refresh to see changes" -ForegroundColor Yellow
