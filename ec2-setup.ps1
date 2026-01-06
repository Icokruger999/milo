# PowerShell script to help set up and deploy to EC2 instance (codingeverest)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "EC2 Setup for Milo Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
Write-Host "Checking AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>&1
    Write-Host "AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "AWS CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit
}

# Check AWS configuration
Write-Host "`nChecking AWS configuration..." -ForegroundColor Yellow
try {
    $awsIdentity = aws sts get-caller-identity 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "AWS credentials configured successfully" -ForegroundColor Green
        Write-Host $awsIdentity -ForegroundColor Cyan
    } else {
        Write-Host "AWS credentials not configured. Running aws configure..." -ForegroundColor Yellow
        Write-Host "Access Key ID: AKIASFECYFH62HKHHF5D" -ForegroundColor Cyan
        aws configure
    }
} catch {
    Write-Host "Error checking AWS configuration" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Finding EC2 Instance: codingeverest" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Find EC2 instances
Write-Host "Searching for EC2 instances..." -ForegroundColor Yellow
try {
    $instances = aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name,PublicIpAddress,PrivateIpAddress,Tags[?Key=='Name'].Value|[0]]" --output table 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host $instances -ForegroundColor White
        
        # Try to find codingeverest instance
        Write-Host "`nSearching for 'codingeverest' instance..." -ForegroundColor Yellow
        $codingeverest = aws ec2 describe-instances --filters "Name=tag:Name,Values=*codingeverest*" --query "Reservations[*].Instances[*].[InstanceId,PublicIpAddress,PrivateIpAddress,State.Name]" --output table 2>&1
        
        if ($LASTEXITCODE -eq 0 -and $codingeverest -notmatch "None") {
            Write-Host $codingeverest -ForegroundColor Green
            Write-Host "`nFound codingeverest instance!" -ForegroundColor Green
        } else {
            Write-Host "No instance found with 'codingeverest' in the name." -ForegroundColor Yellow
            Write-Host "Please check the instance name or provide the instance ID manually." -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "Error querying EC2 instances. Make sure you have proper permissions." -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Note the Instance ID and Public IP from above" -ForegroundColor White
Write-Host "2. Update backend/Milo.API/appsettings.json with:" -ForegroundColor White
Write-Host "   - EC2.InstanceId" -ForegroundColor Yellow
Write-Host "   - ConnectionStrings.DefaultConnection (if using database)" -ForegroundColor Yellow
Write-Host "3. Build the backend: cd backend/Milo.API && dotnet publish -c Release" -ForegroundColor White
Write-Host "4. Deploy using: .\deploy-to-ec2.ps1" -ForegroundColor White
Write-Host ""

