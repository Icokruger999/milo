# PowerShell script to deploy Milo backend from GitHub to EC2 using SSM

param(
    [Parameter(Mandatory=$false)]
    [string]$InstanceId = "i-06bc5b2218c041802",
    
    [Parameter(Mandatory=$false)]
    [string]$GitHubRepo = "",  # e.g., "username/Milo" or full URL
    
    [Parameter(Mandatory=$false)]
    [string]$Branch = "main"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploy Milo Backend from GitHub to EC2" -ForegroundColor Cyan
Write-Host "Using AWS Systems Manager" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
Write-Host "Checking AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>&1
    Write-Host "AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "AWS CLI not found. Please install it first." -ForegroundColor Red
    exit 1
}

# Get GitHub repo if not provided
if ([string]::IsNullOrEmpty($GitHubRepo)) {
    Write-Host "`nGitHub Repository Information" -ForegroundColor Yellow
    Write-Host "Enter your GitHub repository (e.g., username/Milo or https://github.com/username/Milo.git):" -ForegroundColor Cyan
    $GitHubRepo = Read-Host
    
    if ([string]::IsNullOrEmpty($GitHubRepo)) {
        Write-Host "GitHub repository is required!" -ForegroundColor Red
        exit 1
    }
}

# Convert to GitHub clone URL if needed
if ($GitHubRepo -notlike "http*" -and $GitHubRepo -notlike "git@*") {
    if ($GitHubRepo -notlike "*/*") {
        Write-Host "Invalid repository format. Use: username/repo" -ForegroundColor Red
        exit 1
    }
    $GitHubRepo = "https://github.com/$GitHubRepo.git"
}

Write-Host "Repository: $GitHubRepo" -ForegroundColor Green
Write-Host "Branch: $Branch" -ForegroundColor Green

# Check if SSM agent is available
Write-Host "`nChecking SSM agent on instance..." -ForegroundColor Yellow
$ssmStatus = aws ssm describe-instance-information --instance-information-filter-list key=InstanceIds,valueSet=$InstanceId --query "InstanceInformationList[0].PingStatus" --output text 2>&1

if ($ssmStatus -ne "Online") {
    Write-Host "SSM agent is not online. Status: $ssmStatus" -ForegroundColor Red
    Write-Host "The instance needs:" -ForegroundColor Yellow
    Write-Host "1. SSM Agent installed" -ForegroundColor White
    Write-Host "2. IAM role with SSM permissions attached" -ForegroundColor White
    exit 1
}

Write-Host "SSM agent is online. Proceeding with deployment..." -ForegroundColor Green

# Create deployment script
$deployScript = @"
#!/bin/bash
set -e

echo "========================================"
echo "Deploying Milo Backend from GitHub"
echo "========================================"
echo ""

# Install Git if not present
if ! command -v git &> /dev/null; then
    echo "Installing Git..."
    sudo yum install -y git
fi

# Install .NET SDK if not present (needed to build)
if ! command -v dotnet &> /dev/null; then
    echo "Installing .NET 8.0 SDK..."
    sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm
    sudo yum install -y dotnet-sdk-8.0
fi

# Create deployment directory
DEPLOY_DIR="/tmp/milo-deploy-\$(date +%s)"
echo "Creating deployment directory: \$DEPLOY_DIR"
mkdir -p \$DEPLOY_DIR
cd \$DEPLOY_DIR

# Clone or pull repository
echo ""
echo "Cloning repository from GitHub..."
if [ -d "Milo" ]; then
    cd Milo
    git fetch origin
    git checkout $Branch
    git pull origin $Branch
else
    git clone -b $Branch $GitHubRepo Milo
    cd Milo
fi

# Build the application
echo ""
echo "Building backend application..."
cd backend/Milo.API
dotnet restore
dotnet publish -c Release -o ./publish

# Create target directory
echo ""
echo "Preparing deployment directory..."
sudo mkdir -p /var/www/milo-api
sudo chown -R ec2-user:ec2-user /var/www

# Copy files
echo ""
echo "Copying files..."
sudo cp -r ./publish/* /var/www/milo-api/
sudo chown -R ec2-user:ec2-user /var/www/milo-api

# Create systemd service
echo ""
echo "Creating systemd service..."
sudo tee /etc/systemd/system/milo-api.service > /dev/null <<EOF
[Unit]
Description=Milo API
After=network.target

[Service]
Type=notify
WorkingDirectory=/var/www/milo-api
ExecStart=/usr/bin/dotnet /var/www/milo-api/Milo.API.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=milo-api
User=ec2-user
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://0.0.0.0:5000

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
echo ""
echo "Starting service..."
sudo systemctl daemon-reload
sudo systemctl enable milo-api
sudo systemctl restart milo-api

# Cleanup
echo ""
echo "Cleaning up..."
cd /
rm -rf \$DEPLOY_DIR

echo ""
echo "========================================"
echo "Deployment complete!"
echo "========================================"
sudo systemctl status milo-api --no-pager
"@

# Save script to temp file (Unix line endings)
$scriptFile = [System.IO.Path]::GetTempFileName()
$deployScriptUnix = $deployScript -replace "`r`n", "`n" -replace "`r", "`n"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($scriptFile, $deployScriptUnix, $utf8NoBom)

# Upload script to S3 temporarily (SSM needs it somewhere accessible)
Write-Host "`nPreparing deployment script..." -ForegroundColor Yellow
$bucketName = "milo-deploy-temp-$(Get-Random)"
$scriptKey = "deploy-from-github.sh"

aws s3 mb "s3://$bucketName" --region us-east-1 2>&1 | Out-Null
aws s3 cp $scriptFile "s3://$bucketName/$scriptKey" --region us-east-1

# Execute via SSM
Write-Host "`nExecuting deployment via SSM..." -ForegroundColor Yellow
Write-Host "This may take a few minutes (cloning, building, deploying)..." -ForegroundColor Cyan

$ssmCommand = @"
cd /tmp && \
aws s3 cp s3://$bucketName/$scriptKey ./deploy-from-github.sh && \
chmod +x ./deploy-from-github.sh && \
sudo bash ./deploy-from-github.sh && \
aws s3 rm s3://$bucketName/$scriptKey && \
aws s3 rb s3://$bucketName --force
"@

$commandId = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=$ssmCommand" `
    --output-s3-bucket-name $bucketName `
    --output-s3-key-prefix "ssm-output" `
    --query "Command.CommandId" `
    --output text

if ($LASTEXITCODE -eq 0) {
    Write-Host "Command sent. Command ID: $commandId" -ForegroundColor Green
    Write-Host "Waiting for command to complete..." -ForegroundColor Yellow
    Write-Host "(This may take 3-5 minutes for clone + build + deploy)" -ForegroundColor Cyan
    
    # Wait for command to complete
    $maxWait = 600 # 10 minutes
    $waited = 0
    do {
        Start-Sleep -Seconds 10
        $waited += 10
        $status = aws ssm get-command-invocation --command-id $commandId --instance-id $InstanceId --query "Status" --output text 2>&1
        
        if ($status -eq "Success") {
            Write-Host "`nDeployment successful!" -ForegroundColor Green
            break
        } elseif ($status -eq "Failed" -or $status -eq "Cancelled") {
            Write-Host "`nDeployment failed!" -ForegroundColor Red
            break
        }
        
        Write-Host "." -NoNewline -ForegroundColor Cyan
    } while ($waited -lt $maxWait)
    
    # Get command output
    Write-Host "`n`nCommand output:" -ForegroundColor Yellow
    aws ssm get-command-invocation --command-id $commandId --instance-id $InstanceId --query "StandardOutputContent" --output text
    Write-Host ""
    
    $errorOutput = aws ssm get-command-invocation --command-id $commandId --instance-id $InstanceId --query "StandardErrorContent" --output text
    if ($errorOutput) {
        Write-Host "Errors:" -ForegroundColor Red
        Write-Host $errorOutput -ForegroundColor Red
    }
} else {
    Write-Host "Failed to send SSM command." -ForegroundColor Red
}

# Cleanup
Remove-Item $scriptFile -ErrorAction SilentlyContinue

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Deployment Process Complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To check service status:" -ForegroundColor Cyan
Write-Host "  .\check-api-status.ps1" -ForegroundColor White
Write-Host ""
