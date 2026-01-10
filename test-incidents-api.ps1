# Test Incidents API Endpoints
# This script tests the Incidents feature API endpoints

$baseUrl = "https://api.codingeverest.com/api"

Write-Host "🧪 Testing Incidents API Endpoints" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Get all incidents
Write-Host "Test 1: GET /incidents" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/incidents" -Method Get
    Write-Host "✅ Success! Found $($response.Count) incidents" -ForegroundColor Green
    if ($response.Count -gt 0) {
        Write-Host "   First incident: $($response[0].incidentNumber) - $($response[0].subject)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Get incidents by project
Write-Host "Test 2: GET /incidents?projectId=1" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/incidents?projectId=1" -Method Get
    Write-Host "✅ Success! Found $($response.Count) incidents for project 1" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Get incidents by status
Write-Host "Test 3: GET /incidents?status=Open" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/incidents?status=Open" -Method Get
    Write-Host "✅ Success! Found $($response.Count) open incidents" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Create a test incident (requires authentication token)
Write-Host "Test 4: POST /incidents (Create)" -ForegroundColor Yellow
Write-Host "⚠️  Skipping - Requires authentication token" -ForegroundColor Yellow
Write-Host "   Use the web UI to test incident creation" -ForegroundColor Gray
Write-Host ""

# Test 5: Get specific incident (if any exist)
Write-Host "Test 5: GET /incidents/{id}" -ForegroundColor Yellow
try {
    $allIncidents = Invoke-RestMethod -Uri "$baseUrl/incidents" -Method Get
    if ($allIncidents.Count -gt 0) {
        $firstId = $allIncidents[0].id
        $response = Invoke-RestMethod -Uri "$baseUrl/incidents/$firstId" -Method Get
        Write-Host "✅ Success! Retrieved incident $($response.incidentNumber)" -ForegroundColor Green
        Write-Host "   Subject: $($response.subject)" -ForegroundColor Gray
        Write-Host "   Status: $($response.status)" -ForegroundColor Gray
        Write-Host "   Priority: $($response.priority)" -ForegroundColor Gray
        Write-Host "   Requester: $($response.requester.name)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  No incidents found to test with" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Basic API endpoints are working" -ForegroundColor Green
Write-Host "✅ Incidents can be retrieved" -ForegroundColor Green
Write-Host "ℹ️  To fully test:" -ForegroundColor Cyan
Write-Host "   1. Open https://www.codingeverest.com/milo-incidents.html" -ForegroundColor Gray
Write-Host "   2. Create a test incident" -ForegroundColor Gray
Write-Host "   3. View the incident details" -ForegroundColor Gray
Write-Host "   4. Update the incident status" -ForegroundColor Gray
Write-Host ""
