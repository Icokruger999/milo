# POST-DEPLOYMENT TESTING SCRIPT
# Run this AFTER every backend deployment to verify it worked

param(
    [Parameter(Mandatory=$false)]
    [string]$InstanceId = "i-06bc5b2218c041802",
    
    [Parameter(Mandatory=$false)]
    [string]$TestEndpoint = "/tasks?projectId=1"
)

Write-Host "🧪 POST-DEPLOYMENT TESTING STARTING..." -ForegroundColor Cyan
Write-Host ""

$allTestsPassed = $true

# ============================================
# TEST 1: Service Status
# ============================================
Write-Host "📋 TEST 1: Checking service status..." -ForegroundColor Yellow

$command = "sudo systemctl status milo-backend --no-pager | head -20"

try {
    $result = aws ssm send-command `
        --instance-ids $InstanceId `
        --document-name "AWS-RunShellScript" `
        --parameters "commands=['$command']" `
        --output json | ConvertFrom-Json
    
    $commandId = $result.Command.CommandId
    Start-Sleep -Seconds 2
    
    $output = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --output json | ConvertFrom-Json
    
    $stdout = $output.StandardOutputContent
    
    if ($stdout -match "active \(running\)") {
        Write-Host "   ✅ Service is running" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Service is NOT running" -ForegroundColor Red
        Write-Host $stdout
        $allTestsPassed = $false
    }
} catch {
    Write-Host "   ❌ Failed to check service status" -ForegroundColor Red
    $allTestsPassed = $false
}

# ============================================
# TEST 2: Health Endpoint
# ============================================
Write-Host "📋 TEST 2: Testing health endpoint..." -ForegroundColor Yellow

$command = "curl -s http://localhost:8080/api/health"

try {
    $result = aws ssm send-command `
        --instance-ids $InstanceId `
        --document-name "AWS-RunShellScript" `
        --parameters "commands=['$command']" `
        --output json | ConvertFrom-Json
    
    $commandId = $result.Command.CommandId
    Start-Sleep -Seconds 2
    
    $output = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --output json | ConvertFrom-Json
    
    $stdout = $output.StandardOutputContent
    
    if ($stdout -match '"status":"ok"') {
        Write-Host "   ✅ Health endpoint responding" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Health endpoint NOT responding correctly" -ForegroundColor Red
        Write-Host "   Response: $stdout"
        $allTestsPassed = $false
    }
} catch {
    Write-Host "   ❌ Failed to test health endpoint" -ForegroundColor Red
    $allTestsPassed = $false
}

# ============================================
# TEST 3: Actual Endpoint
# ============================================
Write-Host "📋 TEST 3: Testing endpoint: $TestEndpoint..." -ForegroundColor Yellow

$command = "curl -s http://localhost:8080/api$TestEndpoint | head -100"

try {
    $result = aws ssm send-command `
        --instance-ids $InstanceId `
        --document-name "AWS-RunShellScript" `
        --parameters "commands=['$command']" `
        --output json | ConvertFrom-Json
    
    $commandId = $result.Command.CommandId
    Start-Sleep -Seconds 2
    
    $output = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --output json | ConvertFrom-Json
    
    $stdout = $output.StandardOutputContent
    
    # Check for common error patterns
    if ($stdout -match "column.*does not exist") {
        Write-Host "   ❌ DATABASE COLUMN ERROR" -ForegroundColor Red
        Write-Host "   Error: $stdout"
        $allTestsPassed = $false
    } elseif ($stdout -match '"message":"An error occurred') {
        Write-Host "   ❌ API ERROR" -ForegroundColor Red
        Write-Host "   Error: $stdout"
        $allTestsPassed = $false
    } elseif ($stdout -match "500 Internal Server Error") {
        Write-Host "   ❌ 500 ERROR" -ForegroundColor Red
        Write-Host "   Error: $stdout"
        $allTestsPassed = $false
    } elseif ($stdout -match '\[|\{') {
        Write-Host "   ✅ Endpoint returning valid JSON" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Unexpected response" -ForegroundColor Yellow
        Write-Host "   Response: $stdout"
    }
} catch {
    Write-Host "   ❌ Failed to test endpoint" -ForegroundColor Red
    $allTestsPassed = $false
}

# ============================================
# TEST 4: Check Logs for Errors
# ============================================
Write-Host "📋 TEST 4: Checking recent logs for errors..." -ForegroundColor Yellow

$command = "sudo journalctl -u milo-backend -n 20 --no-pager"

try {
    $result = aws ssm send-command `
        --instance-ids $InstanceId `
        --document-name "AWS-RunShellScript" `
        --parameters "commands=['$command']" `
        --output json | ConvertFrom-Json
    
    $commandId = $result.Command.CommandId
    Start-Sleep -Seconds 2
    
    $output = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --output json | ConvertFrom-Json
    
    $stdout = $output.StandardOutputContent
    
    if ($stdout -match "error|exception|fail" -and $stdout -notmatch "FailedToFetchError") {
        Write-Host "   ⚠️  Errors found in logs" -ForegroundColor Yellow
        Write-Host "   Recent logs:"
        Write-Host $stdout -ForegroundColor Gray
    } else {
        Write-Host "   ✅ No critical errors in recent logs" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Could not check logs" -ForegroundColor Yellow
}

# ============================================
# SUMMARY
# ============================================
Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($allTestsPassed) {
    Write-Host "✅ ALL TESTS PASSED" -ForegroundColor Green
    Write-Host ""
    Write-Host "Deployment appears successful!" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Tell user to refresh browser (Ctrl+Shift+R)" -ForegroundColor Gray
    Write-Host "2. Confirm with user that pages load" -ForegroundColor Gray
    Write-Host "3. Get user confirmation before marking complete" -ForegroundColor Gray
    exit 0
} else {
    Write-Host "❌ SOME TESTS FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "🚨 DEPLOYMENT MAY HAVE ISSUES!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Review failed tests above" -ForegroundColor Gray
    Write-Host "2. Check logs for detailed errors" -ForegroundColor Gray
    Write-Host "3. Fix issues and redeploy" -ForegroundColor Gray
    Write-Host "4. Run this script again" -ForegroundColor Gray
    exit 1
}
