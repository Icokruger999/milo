# Test database connection to Supabase
# This script helps diagnose DNS resolution and connection issues

Write-Host "Testing Supabase Database Connection" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

$hostname = "db.ffrtlelsqhnxjfwwnazf.supabase.co"
Write-Host "Hostname: $hostname" -ForegroundColor Yellow

# Test DNS Resolution
Write-Host "`n1. Testing DNS Resolution..." -ForegroundColor Cyan
try {
    $dnsResult = Resolve-DnsName -Name $hostname -ErrorAction Stop
    Write-Host "   DNS Resolution: SUCCESS" -ForegroundColor Green
    
    $ipv4Addresses = $dnsResult | Where-Object { $_.Type -eq "A" } | Select-Object -ExpandProperty IPAddress
    $ipv6Addresses = $dnsResult | Where-Object { $_.Type -eq "AAAA" } | Select-Object -ExpandProperty IPAddress
    
    if ($ipv4Addresses) {
        Write-Host "   IPv4 Addresses:" -ForegroundColor Green
        foreach ($ip in $ipv4Addresses) {
            Write-Host "     - $ip" -ForegroundColor White
        }
    } else {
        Write-Host "   IPv4 Addresses: NONE FOUND" -ForegroundColor Yellow
    }
    
    if ($ipv6Addresses) {
        Write-Host "   IPv6 Addresses:" -ForegroundColor Yellow
        foreach ($ip in $ipv6Addresses) {
            Write-Host "     - $ip" -ForegroundColor White
        }
    } else {
        Write-Host "   IPv6 Addresses: NONE FOUND" -ForegroundColor White
    }
} catch {
    Write-Host "   DNS Resolution: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test TCP Connection (if IPv4 found)
if ($ipv4Addresses -and $ipv4Addresses.Count -gt 0) {
    $ipv4 = $ipv4Addresses[0]
    Write-Host "`n2. Testing TCP Connection to IPv4: $ipv4:5432" -ForegroundColor Cyan
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.BeginConnect($ipv4, 5432, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(3000, $false)
        
        if ($wait) {
            $tcpClient.EndConnect($connect)
            Write-Host "   TCP Connection: SUCCESS" -ForegroundColor Green
            $tcpClient.Close()
        } else {
            Write-Host "   TCP Connection: TIMEOUT" -ForegroundColor Red
            $tcpClient.Close()
        }
    } catch {
        Write-Host "   TCP Connection: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test API Health
Write-Host "`n3. Testing API Health Endpoint..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   API Status: RUNNING" -ForegroundColor Green
    Write-Host "   Response: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "   API Status: NOT RESPONDING - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n===================================" -ForegroundColor Cyan
Write-Host "Test Complete" -ForegroundColor Cyan
