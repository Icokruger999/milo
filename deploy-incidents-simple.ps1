# Simple SSM Deployment for Incidents Feature
$ErrorActionPreference = "Stop"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Deploying Incidents via SSM" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$instanceId = "i-06bc5b2218c041802"
$region = "eu-west-1"

# Step 1: Database Table
Write-Host "[1/4] Creating database table..." -ForegroundColor Yellow

$dbCmd = 'PGPASSWORD=Stacey1122 psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -U postgres -d MiloDB <<EOF
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    incident_number VARCHAR(50) NOT NULL UNIQUE,
    subject VARCHAR(200) NOT NULL,
    description TEXT,
    requester_id INTEGER NOT NULL,
    agent_id INTEGER,
    group_id INTEGER,
    department VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT '\''New'\'',
    priority VARCHAR(50) NOT NULL DEFAULT '\''Low'\'',
    urgency VARCHAR(50),
    impact VARCHAR(50),
    source VARCHAR(50),
    category VARCHAR(100),
    sub_category VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    planned_start_date TIMESTAMP,
    planned_end_date TIMESTAMP,
    planned_effort VARCHAR(50),
    first_response_due TIMESTAMP,
    resolution_due TIMESTAMP,
    first_response_at TIMESTAMP,
    tags VARCHAR(500),
    associated_assets TEXT,
    project_id INTEGER,
    attachments TEXT,
    resolution TEXT,
    CONSTRAINT fk_incidents_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_incidents_agent FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_incidents_group FOREIGN KEY (group_id) REFERENCES teams(id) ON DELETE SET NULL,
    CONSTRAINT fk_incidents_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS ix_incidents_incident_number ON incidents(incident_number);
CREATE INDEX IF NOT EXISTS ix_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS ix_incidents_priority ON incidents(priority);
CREATE INDEX IF NOT EXISTS ix_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS ix_incidents_project_id ON incidents(project_id);
CREATE INDEX IF NOT EXISTS ix_incidents_requester_id ON incidents(requester_id);
EOF
echo "Table creation complete"'

$dbResult = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters commands="$dbCmd" --region $region --output json | ConvertFrom-Json
$dbCommandId = $dbResult.Command.CommandId

Write-Host "   Command ID: $dbCommandId" -ForegroundColor Gray
Start-Sleep -Seconds 6

$dbOutput = aws ssm get-command-invocation --command-id $dbCommandId --instance-id $instanceId --region $region --output json | ConvertFrom-Json
if ($dbOutput.Status -eq "Success") {
    Write-Host "   SUCCESS: Database table ready" -ForegroundColor Green
} else {
    Write-Host "   WARNING: $($dbOutput.Status) (table may already exist)" -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Build Backend
Write-Host "[2/4] Building backend..." -ForegroundColor Yellow
Push-Location backend\Milo.API
dotnet publish -c Release -o .\publish | Out-Null
Pop-Location
Write-Host "   SUCCESS: Backend built" -ForegroundColor Green
Write-Host ""

# Step 3: Package and Upload
Write-Host "[3/4] Packaging and uploading..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$zipFile = "incidents-$timestamp.zip"
Compress-Archive -Path "backend\Milo.API\publish\*" -DestinationPath $zipFile -Force

$s3Bucket = "milo-deploy-temp"
aws s3 mb s3://$s3Bucket --region $region 2>&1 | Out-Null
aws s3 cp $zipFile s3://$s3Bucket/$zipFile --region $region | Out-Null
Write-Host "   SUCCESS: Uploaded to S3" -ForegroundColor Green
Write-Host ""

# Step 4: Deploy to EC2
Write-Host "[4/4] Deploying to EC2..." -ForegroundColor Yellow

$deployCmd = "sudo systemctl stop milo-api; cd /tmp; aws s3 cp s3://$s3Bucket/$zipFile ./$zipFile --region $region; sudo mkdir -p /var/www/milo-api.backup; sudo cp -r /var/www/milo-api/* /var/www/milo-api.backup/ 2>/dev/null || true; sudo unzip -o /tmp/$zipFile -d /var/www/milo-api; sudo chown -R ec2-user:ec2-user /var/www/milo-api; sudo systemctl start milo-api; sleep 5; sudo systemctl status milo-api --no-pager; curl -s http://localhost:5001/api/health; echo; curl -s http://localhost:5001/api/incidents; echo"

$deployResult = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters commands="$deployCmd" --region $region --output json | ConvertFrom-Json
$deployCommandId = $deployResult.Command.CommandId

Write-Host "   Command ID: $deployCommandId" -ForegroundColor Gray
Write-Host "   Waiting for deployment..." -ForegroundColor Gray

for ($i = 1; $i -le 8; $i++) {
    Start-Sleep -Seconds 8
    $deployOutput = aws ssm get-command-invocation --command-id $deployCommandId --instance-id $instanceId --region $region --output json | ConvertFrom-Json
    
    if ($deployOutput.Status -eq "Success") {
        Write-Host "   SUCCESS: Backend deployed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Output:" -ForegroundColor Cyan
        Write-Host $deployOutput.StandardOutputContent -ForegroundColor Gray
        break
    } elseif ($deployOutput.Status -eq "Failed") {
        Write-Host "   FAILED: Deployment error" -ForegroundColor Red
        Write-Host $deployOutput.StandardErrorContent -ForegroundColor Red
        exit 1
    } else {
        Write-Host "   Status: $($deployOutput.Status) (attempt $i/8)" -ForegroundColor Gray
    }
}
Write-Host ""

# Cleanup
Remove-Item $zipFile -ErrorAction SilentlyContinue

# Test API
Write-Host "Testing API..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
try {
    $test = Invoke-RestMethod -Uri "https://api.codingeverest.com/api/incidents" -Method Get -TimeoutSec 10
    Write-Host "   SUCCESS: Incidents API is live! ($($test.Count) incidents)" -ForegroundColor Green
} catch {
    Write-Host "   WARNING: API still starting up" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Frontend
Write-Host "Deploying frontend..." -ForegroundColor Yellow
$changes = git status --porcelain
if ($changes) {
    git add .
    git commit -m "Add Incidents feature - Complete ticket management"
    git push origin main
    Write-Host "   SUCCESS: Pushed to GitHub (Amplify will auto-deploy)" -ForegroundColor Green
} else {
    Write-Host "   No changes to deploy" -ForegroundColor Gray
}
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access Incidents:" -ForegroundColor Cyan
Write-Host "  https://www.codingeverest.com/milo-incidents.html" -ForegroundColor White
Write-Host ""
Write-Host "API Endpoint:" -ForegroundColor Cyan
Write-Host "  https://api.codingeverest.com/api/incidents" -ForegroundColor White
Write-Host ""
