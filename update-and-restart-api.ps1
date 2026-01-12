# Update appsettings.json on EC2 and restart API to run migrations
param(
    [string]$InstanceId = "i-06bc5b2218c041802"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Update appsettings.json and Restart API" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Update appsettings.json using sed commands (this approach worked before)
Write-Host "1. Updating appsettings.json on EC2..." -ForegroundColor Yellow

$cmds = @(
    "cd /var/www/milo-api && cp appsettings.json appsettings.json.backup",
    "cd /var/www/milo-api && sed -i 's/Database=postgres/Database=milo/g' appsettings.json",
    "cd /var/www/milo-api && sed -i 's/Database=MiloDB/Database=milo/g' appsettings.json",
    "cd /var/www/milo-api && sed -i 's/Host=localhost/Host=db.ffrtlelsqhnxjfwwnazf.supabase.co/g' appsettings.json",
    "cd /var/www/milo-api && sed -i 's/Host=codingeverest-new/Host=db.ffrtlelsqhnxjfwwnazf.supabase.co/g' appsettings.json",
    "cd /var/www/milo-api && grep -A 2 ConnectionStrings appsettings.json | head -3"
)

foreach ($cmd in $cmds) {
    $result = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[`"$cmd`"]" --output json | ConvertFrom-Json
    $cmdId = $result.Command.CommandId
    
    if ($cmdId) {
        Start-Sleep -Seconds 5
        $output = aws ssm get-command-invocation --command-id $cmdId --instance-id $InstanceId --query "StandardOutputContent" --output text 2>&1
        
        if ($cmd -match "grep") {
            Write-Host "Connection string after update:" -ForegroundColor Cyan
            Write-Host $output -ForegroundColor White
        }
    }
}

Write-Host "`n2. Restarting API service..." -ForegroundColor Yellow
$restartCmd = "sudo systemctl restart milo-api && sleep 15 && sudo systemctl status milo-api --no-pager -l | head -25"

$result = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[`"$restartCmd`"]" --output json | ConvertFrom-Json
$cmdId = $result.Command.CommandId

if ($cmdId) {
    Write-Host "Restarting... (this may take a moment)" -ForegroundColor Green
    Start-Sleep -Seconds 20
    
    $output = aws ssm get-command-invocation --command-id $cmdId --instance-id $InstanceId --query "StandardOutputContent" --output text 2>&1
    Write-Host "`nService status:" -ForegroundColor Cyan
    Write-Host $output -ForegroundColor White
}

Write-Host "`n3. Checking API logs for migration status..." -ForegroundColor Yellow
$logCmd = "sudo journalctl -u milo-api -n 60 --no-pager | tail -40"

$result = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[`"$logCmd`"]" --output json | ConvertFrom-Json
$cmdId = $result.Command.CommandId

if ($cmdId) {
    Start-Sleep -Seconds 8
    
    $output = aws ssm get-command-invocation --command-id $cmdId --instance-id $InstanceId --query "StandardOutputContent" --output text 2>&1
    
    Write-Host "`nRecent API logs:" -ForegroundColor Cyan
    Write-Host $output -ForegroundColor White
    
    if ($output -match "migrations applied successfully") {
        Write-Host "`n=========================================" -ForegroundColor Green
        Write-Host "SUCCESS: Migrations applied successfully!" -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green
    } elseif ($output -match "Failed to connect" -or $output -match "127.0.0.1") {
        Write-Host "`n=========================================" -ForegroundColor Red
        Write-Host "ERROR: Still seeing connection errors" -ForegroundColor Red
        Write-Host "Check appsettings.json on EC2" -ForegroundColor Yellow
        Write-Host "=========================================" -ForegroundColor Red
    } else {
        Write-Host "`nCheck logs above for migration status" -ForegroundColor Yellow
    }
}

Write-Host "`nNext step: Check Supabase dashboard for tables" -ForegroundColor Cyan
Write-Host "URL: https://supabase.com/dashboard/project/ffrtlelsqhnxjfwwnazf/editor" -ForegroundColor White
Write-Host ""
