# Deploy Reports Feature (Backend + Database) via AWS SSM
# This script deploys:
# 1. Report Recipients table to RDS
# 2. Updated backend with Reports controller

Write-Host "=== Deploying Reports Feature ===" -ForegroundColor Cyan

# Configuration
$INSTANCE_ID = "i-0e0f2e165b2bbd8bb"
$REGION = "eu-west-1"

# Step 1: Create Report Recipients Table
Write-Host "`n1. Creating report_recipients table in RDS..." -ForegroundColor Yellow

$createTableCommand = @"
cd /tmp
cat > create-report-recipients.sql << 'SQLEOF'
-- Create Report Recipients table
CREATE TABLE IF NOT EXISTS report_recipients (
    id SERIAL PRIMARY KEY,
    email VARCHAR(200) NOT NULL,
    name VARCHAR(100) NOT NULL,
    report_type VARCHAR(50) NOT NULL DEFAULT 'DailyIncidents',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_sent_at TIMESTAMP,
    project_id INTEGER,
    CONSTRAINT fk_report_recipients_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_report_recipients_email ON report_recipients(email);
CREATE INDEX IF NOT EXISTS ix_report_recipients_project_id ON report_recipients(project_id);
CREATE INDEX IF NOT EXISTS ix_report_recipients_is_active ON report_recipients(is_active);

SELECT 'Report recipients table created successfully' as status;
SQLEOF

echo 'Executing SQL...'
PGPASSWORD='Stacey1122' psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -U postgres -d MiloDB -f create-report-recipients.sql
echo 'Table creation complete'
"@

$createTableResult = aws ssm send-command `
    --document-name "AWS-RunShellScript" `
    --instance-ids $INSTANCE_ID `
    --parameters "commands=`"$createTableCommand`"" `
    --region $REGION `
    --output json | ConvertFrom-Json

$createTableCommandId = $createTableResult.Command.CommandId
Write-Host "Command ID: $createTableCommandId" -ForegroundColor Green

# Wait for table creation
Write-Host "Waiting for table creation to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Get table creation output
$tableOutput = aws ssm get-command-invocation `
    --command-id $createTableCommandId `
    --instance-id $INSTANCE_ID `
    --region $REGION `
    --output json | ConvertFrom-Json

Write-Host "`nTable Creation Output:" -ForegroundColor Cyan
Write-Host $tableOutput.StandardOutputContent

if ($tableOutput.Status -eq "Success") {
    Write-Host "Table created successfully!" -ForegroundColor Green
} else {
    Write-Host "Table creation may have issues. Check output above." -ForegroundColor Yellow
}

# Step 2: Deploy backend changes
Write-Host "`n2. Deploying backend changes..." -ForegroundColor Yellow

$deployBackendCommand = @"
cd /home/ec2-user/milo
echo 'Pulling latest code...'
sudo -u ec2-user git pull origin main

cd /home/ec2-user/milo/backend/Milo.API
echo 'Building backend...'
sudo -u ec2-user dotnet build --configuration Release

echo 'Stopping backend service...'
sudo systemctl stop milo-backend

echo 'Publishing backend...'
sudo -u ec2-user dotnet publish -c Release -o /home/ec2-user/milo-backend-publish

echo 'Starting backend service...'
sudo systemctl start milo-backend

echo 'Checking service status...'
sudo systemctl status milo-backend --no-pager

echo 'Backend deployment complete'
"@

$deployResult = aws ssm send-command `
    --document-name "AWS-RunShellScript" `
    --instance-ids $INSTANCE_ID `
    --parameters "commands=`"$deployBackendCommand`"" `
    --region $REGION `
    --output json | ConvertFrom-Json

$deployCommandId = $deployResult.Command.CommandId
Write-Host "Command ID: $deployCommandId" -ForegroundColor Green

# Wait for deployment
Write-Host "Waiting for deployment to complete (60 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# Get deployment output
$deployOutput = aws ssm get-command-invocation `
    --command-id $deployCommandId `
    --instance-id $INSTANCE_ID `
    --region $REGION `
    --output json | ConvertFrom-Json

Write-Host "`nDeployment Output:" -ForegroundColor Cyan
Write-Host $deployOutput.StandardOutputContent

if ($deployOutput.StandardErrorContent) {
    Write-Host "`nErrors (if any):" -ForegroundColor Yellow
    Write-Host $deployOutput.StandardErrorContent
}

if ($deployOutput.Status -eq "Success") {
    Write-Host "`n=== Deployment Complete ===" -ForegroundColor Green
    Write-Host "Report Recipients table created" -ForegroundColor Green
    Write-Host "Backend deployed and restarted" -ForegroundColor Green
    Write-Host "Frontend will be deployed via Amplify" -ForegroundColor Green
    Write-Host "`nTest the Reports feature at: https://www.codingeverest.com/milo-incidents.html" -ForegroundColor Cyan
} else {
    Write-Host "`n=== Deployment had issues ===" -ForegroundColor Yellow
    Write-Host "Check the output above for details" -ForegroundColor Yellow
}
