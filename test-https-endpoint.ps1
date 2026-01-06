# Test HTTPS endpoint
$instanceId = "i-06bc5b2218c041802"

Write-Host "Testing HTTPS API endpoint..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Health endpoint
Write-Host "Test 1: Health endpoint..." -ForegroundColor Yellow
$cmd1 = @{
    commands = @("curl -s https://api.codingeverest.com/api/health")
} | ConvertTo-Json

$cmd1 | Out-File -FilePath "test1.json" -Encoding ASCII -NoNewline
$r1 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://test1.json --output json
$id1 = ($r1 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 5

$result1 = aws ssm get-command-invocation --command-id $id1 --instance-id $instanceId --output json
$clean1 = $result1 -replace '[^\x00-\x7F]', ''
$obj1 = $clean1 | ConvertFrom-Json

Write-Host "Health Check Result:" -ForegroundColor Cyan
Write-Host $obj1.StandardOutputContent
Write-Host ""

# Test 2: Check nginx status
Write-Host "Test 2: Checking nginx status..." -ForegroundColor Yellow
$cmd2 = @{
    commands = @(
        "sudo systemctl status nginx --no-pager | head -10",
        "sudo netstat -tlnp | grep 443"
    )
} | ConvertTo-Json

$cmd2 | Out-File -FilePath "test2.json" -Encoding ASCII -NoNewline
$r2 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://test2.json --output json
$id2 = ($r2 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 5

$result2 = aws ssm get-command-invocation --command-id $id2 --instance-id $instanceId --output json
$clean2 = $result2 -replace '[^\x00-\x7F]', ''
$obj2 = $clean2 | ConvertFrom-Json

Write-Host "Nginx Status:" -ForegroundColor Cyan
Write-Host $obj2.StandardOutputContent
Write-Host ""

# Test 3: Check nginx config
Write-Host "Test 3: Checking nginx configuration..." -ForegroundColor Yellow
$cmd3 = @{
    commands = @(
        "sudo nginx -t",
        "cat /etc/nginx/conf.d/milo-api.conf | head -20"
    )
} | ConvertTo-Json

$cmd3 | Out-File -FilePath "test3.json" -Encoding ASCII -NoNewline
$r3 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://test3.json --output json
$id3 = ($r3 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 5

$result3 = aws ssm get-command-invocation --command-id $id3 --instance-id $instanceId --output json
$clean3 = $result3 -replace '[^\x00-\x7F]', ''
$obj3 = $clean3 | ConvertFrom-Json

Write-Host "Nginx Config:" -ForegroundColor Cyan
Write-Host $obj3.StandardOutputContent

# Cleanup
Remove-Item test1.json,test2.json,test3.json -ErrorAction SilentlyContinue

Write-Host "`n=== Test Complete ===" -ForegroundColor Green

