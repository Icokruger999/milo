# Update appsettings.json in the repo location where API is actually running
param(
    [string]$InstanceId = "i-06bc5b2218c041802"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Fix appsettings.json in Repo Location" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# The API is running from /home/ec2-user/milo-repo/backend/Milo.API/
# Update appsettings.json there
Write-Host "1. Updating appsettings.json in repo location..." -ForegroundColor Yellow

$cmds = @(
    "cd /home/ec2-user/milo-repo/backend/Milo.API && pwd",
    "cd /home/ec2-user/milo-repo/backend/Milo.API && cp appsettings.json appsettings.json.backup 2>/dev/null || echo No_backup_needed",
    "cd /home/ec2-user/milo-repo/backend/Milo.API && sed -i s/Database=postgres/Database=milo/g appsettings.json",
    "cd /home/ec2-user/milo-repo/backend/Milo.API && sed -i s/Database=MiloDB/Database=milo/g appsettings.json",
    "cd /home/ec2-user/milo-repo/backend/Milo.API && sed -i s/Host=localhost/Host=db.ffrtlelsqhnxjfwwnazf.supabase.co/g appsettings.json",
    "cd /home/ec2-user/milo-repo/backend/Milo.API && sed -i s/Host=codingeverest-new/Host=db.ffrtlelsqhnxjfwwnazf.supabase.co/g appsettings.json",
    "cd /home/ec2-user/milo-repo/backend/Milo.API && cat appsettings.json | grep -A 2 ConnectionStrings"
)

foreach ($cmd in $cmds) {
    $cmdEscaped = $cmd -replace "'", "'\''"
    $result = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[`"$cmdEscaped`"]" --output json | ConvertFrom-Json
    $cmdId = $result.Command.CommandId
    
    if ($cmdId) {
        Start-Sleep -Seconds 4
        
        if ($cmd -match "grep") {
            $output = aws ssm get-command-invocation --command-id $cmdId --instance-id $InstanceId --query "StandardOutputContent" --output text 2>&1
            Write-Host "`nConnection string in repo:" -ForegroundColor Cyan
            Write-Host $output -ForegroundColor White
        }
    }
}

Write-Host "`n2. Restarting API service..." -ForegroundColor Yellow
$restartCmd = "sudo systemctl restart milo-api && sleep 15"

$result = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[`"$restartCmd`"]" --output json | ConvertFrom-Json
$cmdId = $result.Command.CommandId

if ($cmdId) {
    Write-Host "Restarting... (waiting 20 seconds)" -ForegroundColor Green
    Start-Sleep -Seconds 20
}

Write-Host "`n3. Checking API logs..." -ForegroundColor Yellow
$logCmd = "sudo journalctl -u milo-api -n 50 --no-pager | tail -30"

$result = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[`"$logCmd`"]" --output json | ConvertFrom-Json
$cmdId = $result.Command.CommandId

if ($cmdId) {
    Start-Sleep -Seconds 8
    
    $output = aws ssm get-command-invocation --command-id $cmdId --instance-id $InstanceId --query "StandardOutputContent" --output text 2>&1
    
    Write-Host "`nRecent API logs:" -ForegroundColor Cyan
    Write-Host $output -ForegroundColor White
    
    if ($output -match "migrations applied successfully") {
        Write-Host "`n=========================================" -ForegroundColor Green
        Write-Host "SUCCESS: Migrations applied!" -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green
    } elseif ($output -match "Failed to connect.*127.0.0.1") {
        Write-Host "`nStill connecting to localhost - check systemd service configuration" -ForegroundColor Red
    } else {
        Write-Host "`nCheck logs above" -ForegroundColor Yellow
    }
}

Write-Host ""
