# Quick Deploy Reports Feature via SSM
Write-Host "=== Deploying Reports Feature ===" -ForegroundColor Cyan

$INSTANCE_ID = "i-06bc5b2218c041802"
$REGION = "eu-west-1"

# Step 1: Create table
Write-Host "`n1. Creating report_recipients table..." -ForegroundColor Yellow

$result1 = aws ssm send-command `
    --document-name "AWS-RunShellScript" `
    --instance-ids $INSTANCE_ID `
    --cli-input-json file://ssm-create-report-recipients-table.json `
    --region $REGION `
    --output json | ConvertFrom-Json

Write-Host "Command ID: $($result1.Command.CommandId)" -ForegroundColor Green
Write-Host "Waiting 20 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

$output1 = aws ssm get-command-invocation `
    --command-id $result1.Command.CommandId `
    --instance-id $INSTANCE_ID `
    --region $REGION `
    --output json | ConvertFrom-Json

Write-Host "`nTable Output:" -ForegroundColor Cyan
Write-Host $output1.StandardOutputContent

if ($output1.StandardErrorContent) {
    Write-Host "`nErrors:" -ForegroundColor Yellow
    Write-Host $output1.StandardErrorContent
}

# Step 2: Deploy backend
Write-Host "`n2. Deploying backend..." -ForegroundColor Yellow

$result2 = aws ssm send-command `
    --document-name "AWS-RunShellScript" `
    --instance-ids $INSTANCE_ID `
    --cli-input-json file://ssm-deploy-reports-backend.json `
    --region $REGION `
    --output json | ConvertFrom-Json

Write-Host "Command ID: $($result2.Command.CommandId)" -ForegroundColor Green
Write-Host "Waiting 60 seconds for build and deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

$output2 = aws ssm get-command-invocation `
    --command-id $result2.Command.CommandId `
    --instance-id $INSTANCE_ID `
    --region $REGION `
    --output json | ConvertFrom-Json

Write-Host "`nBackend Deployment Output:" -ForegroundColor Cyan
Write-Host $output2.StandardOutputContent

if ($output2.StandardErrorContent) {
    Write-Host "`nErrors:" -ForegroundColor Yellow
    Write-Host $output2.StandardErrorContent
}

if ($output2.Status -eq "Success") {
    Write-Host "`n=== SUCCESS ===" -ForegroundColor Green
    Write-Host "Reports feature deployed!" -ForegroundColor Green
    Write-Host "Test at: https://www.codingeverest.com/milo-incidents.html" -ForegroundColor Cyan
} else {
    Write-Host "`n=== Check output above ===" -ForegroundColor Yellow
}
