# DATABASE COLUMN VERIFICATION SCRIPT
# Use this to verify database columns exist BEFORE adding code that references them

param(
    [Parameter(Mandatory=$true)]
    [string]$TableName,
    
    [Parameter(Mandatory=$true)]
    [string]$ColumnName,
    
    [Parameter(Mandatory=$false)]
    [string]$InstanceId = "i-06bc5b2218c041802"
)

Write-Host "Checking if column '$ColumnName' exists in table '$TableName'..." -ForegroundColor Cyan
Write-Host ""

# Build the SQL query
$sqlQuery = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '$TableName' AND column_name = '$ColumnName';"

# Execute on EC2 via SSM
$command = @"
docker exec milo-postgres psql -U postgres -d milo -c "$sqlQuery"
"@

Write-Host "Executing query on EC2 instance..." -ForegroundColor Yellow
Write-Host "   Instance: $InstanceId" -ForegroundColor Gray
Write-Host "   Query: $sqlQuery" -ForegroundColor Gray
Write-Host ""

try {
    $result = aws ssm send-command `
        --instance-ids $InstanceId `
        --document-name "AWS-RunShellScript" `
        --parameters "commands=['$command']" `
        --output json | ConvertFrom-Json
    
    $commandId = $result.Command.CommandId
    
    # Wait for command to complete
    Start-Sleep -Seconds 3
    
    # Get command output
    $output = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --output json | ConvertFrom-Json
    
    $stdout = $output.StandardOutputContent
    
    Write-Host "=======================================" -ForegroundColor Cyan
    Write-Host "RESULT" -ForegroundColor Cyan
    Write-Host "=======================================" -ForegroundColor Cyan
    Write-Host ""
    
    if ($stdout -match $ColumnName) {
        Write-Host "COLUMN EXISTS" -ForegroundColor Green
        Write-Host ""
        Write-Host "Column Details:" -ForegroundColor Yellow
        Write-Host $stdout
        Write-Host ""
        Write-Host "Safe to add code that references this column" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "COLUMN DOES NOT EXIST" -ForegroundColor Red
        Write-Host ""
        Write-Host "Query Output:" -ForegroundColor Yellow
        Write-Host $stdout
        Write-Host ""
        Write-Host "DO NOT add code that references this column!" -ForegroundColor Red
        Write-Host "Create and apply migration FIRST!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Yellow
        Write-Host "1. Create migration SQL to add column" -ForegroundColor Gray
        Write-Host "2. Apply migration to database" -ForegroundColor Gray
        Write-Host "3. Run this script again to verify" -ForegroundColor Gray
        Write-Host "4. ONLY THEN add code that uses the column" -ForegroundColor Gray
        exit 1
    }
} catch {
    Write-Host "ERROR: Failed to check database" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
