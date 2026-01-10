# Complete Deployment: Backend + Email Service + Cron Job
Write-Host "=== Complete Reports Feature Deployment ===" -ForegroundColor Cyan

$INSTANCE_ID = "i-06bc5b2218c041802"
$REGION = "eu-west-1"

# Step 1: Deploy backend with email service
Write-Host "`n1. Deploying backend with email service..." -ForegroundColor Yellow

$deployCommand = @"
cd /home/ec2-user/milo
echo 'Pulling latest code...'
sudo -u ec2-user git pull origin main

cd /home/ec2-user/milo/backend/Milo.API
echo 'Building backend...'
sudo -u ec2-user dotnet build --configuration Release

echo 'Publishing backend...'
sudo -u ec2-user dotnet publish -c Release -o /home/ec2-user/milo-backend-publish

echo 'Backend build complete'
"@

$result1 = aws ssm send-command `
    --document-name "AWS-RunShellScript" `
    --instance-ids $INSTANCE_ID `
    --parameters "commands=`"$deployCommand`"" `
    --region $REGION `
    --output json | ConvertFrom-Json

Write-Host "Command ID: $($result1.Command.CommandId)" -ForegroundColor Green
Write-Host "Waiting 60 seconds for build..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

$output1 = aws ssm get-command-invocation `
    --command-id $result1.Command.CommandId `
    --instance-id $INSTANCE_ID `
    --region $REGION `
    --output json | ConvertFrom-Json

Write-Host "`nBuild Output:" -ForegroundColor Cyan
Write-Host $output1.StandardOutputContent

# Step 2: Start backend service
Write-Host "`n2. Starting backend service..." -ForegroundColor Yellow

$startCommand = @"
cd /home/ec2-user/milo
chmod +x start-backend-service.sh
./start-backend-service.sh
sleep 5
echo 'Checking if backend is running...'
ps aux | grep 'Milo.API.dll' | grep -v grep
"@

$result2 = aws ssm send-command `
    --document-name "AWS-RunShellScript" `
    --instance-ids $INSTANCE_ID `
    --parameters "commands=`"$startCommand`"" `
    --region $REGION `
    --output json | ConvertFrom-Json

Write-Host "Command ID: $($result2.Command.CommandId)" -ForegroundColor Green
Write-Host "Waiting 15 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

$output2 = aws ssm get-command-invocation `
    --command-id $result2.Command.CommandId `
    --instance-id $INSTANCE_ID `
    --region $REGION `
    --output json | ConvertFrom-Json

Write-Host "`nService Start Output:" -ForegroundColor Cyan
Write-Host $output2.StandardOutputContent

# Step 3: Setup cron job for daily reports
Write-Host "`n3. Setting up daily reports cron job..." -ForegroundColor Yellow

$cronCommand = @"
cd /home/ec2-user/milo
chmod +x setup-cron-daily-reports.sh
./setup-cron-daily-reports.sh
echo 'Verifying cron job...'
crontab -l | grep 'send-daily-reports'
"@

$result3 = aws ssm send-command `
    --document-name "AWS-RunShellScript" `
    --instance-ids $INSTANCE_ID `
    --parameters "commands=`"$cronCommand`"" `
    --region $REGION `
    --output json | ConvertFrom-Json

Write-Host "Command ID: $($result3.Command.CommandId)" -ForegroundColor Green
Write-Host "Waiting 10 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

$output3 = aws ssm get-command-invocation `
    --command-id $result3.Command.CommandId `
    --instance-id $INSTANCE_ID `
    --region $REGION `
    --output json | ConvertFrom-Json

Write-Host "`nCron Setup Output:" -ForegroundColor Cyan
Write-Host $output3.StandardOutputContent

# Step 4: Test API endpoint
Write-Host "`n4. Testing API endpoint..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $testResponse = Invoke-RestMethod -Uri "https://api.codingeverest.com/api/health" -Method Get -TimeoutSec 10
    Write-Host "API Health Check: SUCCESS" -ForegroundColor Green
    Write-Host ($testResponse | ConvertTo-Json)
} catch {
    Write-Host "API Health Check: FAILED" -ForegroundColor Yellow
    Write-Host $_.Exception.Message
}

Write-Host "`n=== Deployment Summary ===" -ForegroundColor Cyan
Write-Host "1. Backend built and published: " -NoNewline
if ($output1.Status -eq "Success") { Write-Host "OK" -ForegroundColor Green } else { Write-Host "CHECK" -ForegroundColor Yellow }

Write-Host "2. Backend service started: " -NoNewline
if ($output2.StandardOutputContent -match "Milo.API.dll") { Write-Host "OK" -ForegroundColor Green } else { Write-Host "CHECK" -ForegroundColor Yellow }

Write-Host "3. Cron job configured: " -NoNewline
if ($output3.StandardOutputContent -match "send-daily-reports") { Write-Host "OK" -ForegroundColor Green } else { Write-Host "CHECK" -ForegroundColor Yellow }

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Configure email settings in appsettings.json (SMTP credentials)"
Write-Host "2. Test reports: https://www.codingeverest.com/milo-incidents.html"
Write-Host "3. Add recipients and send test report"
Write-Host "4. Daily reports will be sent automatically at 8 AM"
