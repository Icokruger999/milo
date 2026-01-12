# Check deployment status on EC2
param(
    [string]$InstanceId = "i-06bc5b2218c041802"
)

Write-Host "Checking deployment status..." -ForegroundColor Cyan
Write-Host ""

# Check if files exist in /var/www/milo-api
Write-Host "1. Checking files in /var/www/milo-api..." -ForegroundColor Yellow
$cmd1 = "ls -la /var/www/milo-api/ 2>&1 | head -20"

$result1 = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[`"$cmd1`"]" --output json | ConvertFrom-Json
$cmdId1 = $result1.Command.CommandId
Start-Sleep -Seconds 5

$output1 = aws ssm get-command-invocation --command-id $cmdId1 --instance-id $InstanceId --query "StandardOutputContent" --output text 2>&1
Write-Host $output1

# Check if Milo.API.dll exists
Write-Host "`n2. Checking for Milo.API.dll..." -ForegroundColor Yellow
$cmd2 = "test -f /var/www/milo-api/Milo.API.dll && echo FILE_EXISTS || echo FILE_NOT_FOUND"

$result2 = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[`"$cmd2`"]" --output json | ConvertFrom-Json
$cmdId2 = $result2.Command.CommandId
Start-Sleep -Seconds 5

$output2 = aws ssm get-command-invocation --command-id $cmdId2 --instance-id $InstanceId --query "StandardOutputContent" --output text 2>&1
Write-Host $output2

# Check S3 bucket access
Write-Host "`n3. Testing S3 access..." -ForegroundColor Yellow
$cmd3 = "aws s3 ls s3://milo-deploy-856125221/ 2>&1"

$result3 = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[`"$cmd3`"]" --output json | ConvertFrom-Json
$cmdId3 = $result3.Command.CommandId
Start-Sleep -Seconds 5

$output3 = aws ssm get-command-invocation --command-id $cmdId3 --instance-id $InstanceId --query "StandardOutputContent" --output text 2>&1
$error3 = aws ssm get-command-invocation --command-id $cmdId3 --instance-id $InstanceId --query "StandardErrorContent" --output text 2>&1

Write-Host "S3 output: $output3" -ForegroundColor White
if ($error3 -and $error3 -ne "None") {
    Write-Host "S3 error: $error3" -ForegroundColor Red
}

Write-Host ""
