# Diagnose connection issues
$instanceId = "i-06bc5b2218c041802"

Write-Host "Diagnosing HTTPS connection issues..." -ForegroundColor Cyan
Write-Host ""

# Check 1: Nginx status
Write-Host "1. Checking nginx service..." -ForegroundColor Yellow
$cmd1 = @{
    commands = @("sudo systemctl is-active nginx", "sudo systemctl status nginx --no-pager | grep Active")
} | ConvertTo-Json

$cmd1 | Out-File -FilePath "diag1.json" -Encoding ASCII -NoNewline
$r1 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://diag1.json --output json
$id1 = ($r1 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 3

$result1 = aws ssm get-command-invocation --command-id $id1 --instance-id $instanceId --output json
$clean1 = $result1 -replace '[^\x00-\x7F]', ''
$obj1 = $clean1 | ConvertFrom-Json
Write-Host $obj1.StandardOutputContent
Write-Host ""

# Check 2: Ports listening
Write-Host "2. Checking ports 443 and 5001..." -ForegroundColor Yellow
$cmd2 = @{
    commands = @(
        "sudo netstat -tlnp | grep -E ':(443|5001)'",
        "sudo ss -tlnp | grep -E ':(443|5001)'"
    )
} | ConvertTo-Json

$cmd2 | Out-File -FilePath "diag2.json" -Encoding ASCII -NoNewline
$r2 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://diag2.json --output json
$id2 = ($r2 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 3

$result2 = aws ssm get-command-invocation --command-id $id2 --instance-id $instanceId --output json
$clean2 = $result2 -replace '[^\x00-\x7F]', ''
$obj2 = $clean2 | ConvertFrom-Json
Write-Host $obj2.StandardOutputContent
Write-Host ""

# Check 3: Backend service
Write-Host "3. Checking milo-api service..." -ForegroundColor Yellow
$cmd3 = @{
    commands = @(
        "sudo systemctl is-active milo-api",
        "curl -s http://localhost:5001/api/health"
    )
} | ConvertTo-Json

$cmd3 | Out-File -FilePath "diag3.json" -Encoding ASCII -NoNewline
$r3 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://diag3.json --output json
$id3 = ($r3 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 3

$result3 = aws ssm get-command-invocation --command-id $id3 --instance-id $instanceId --output json
$clean3 = $result3 -replace '[^\x00-\x7F]', ''
$obj3 = $clean3 | ConvertFrom-Json
Write-Host $obj3.StandardOutputContent
Write-Host ""

# Check 4: Test HTTPS from inside
Write-Host "4. Testing HTTPS from EC2..." -ForegroundColor Yellow
$cmd4 = @{
    commands = @("curl -k -s https://localhost/api/health")
} | ConvertTo-Json

$cmd4 | Out-File -FilePath "diag4.json" -Encoding ASCII -NoNewline
$r4 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://diag4.json --output json
$id4 = ($r4 | ConvertFrom-Json).Command.CommandId
Start-Sleep -Seconds 5

$result4 = aws ssm get-command-invocation --command-id $id4 --instance-id $instanceId --output json
$clean4 = $result4 -replace '[^\x00-\x7F]', ''
$obj4 = $clean4 | ConvertFrom-Json
Write-Host $obj4.StandardOutputContent

# Cleanup
Remove-Item diag*.json -ErrorAction SilentlyContinue

Write-Host "`n=== Diagnosis Complete ===" -ForegroundColor Green

