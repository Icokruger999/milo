# Attach S3 read permissions to EC2 instance IAM role
param(
    [string]$InstanceId = "i-06bc5b2218c041802"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Attach S3 Permissions to EC2 Role" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Get instance IAM role
Write-Host "1. Getting EC2 instance IAM role..." -ForegroundColor Yellow
$instanceInfo = aws ec2 describe-instances --instance-ids $InstanceId --query "Reservations[0].Instances[0].IamInstanceProfile.Arn" --output text 2>&1

if ($instanceInfo -match "arn:aws:iam") {
    $roleName = $instanceInfo -replace ".*instance-profile/", ""
    Write-Host "Role name: $roleName" -ForegroundColor Green
} else {
    Write-Host "No IAM role found on instance!" -ForegroundColor Red
    Write-Host "`nPlease attach an IAM role to the EC2 instance via AWS Console:" -ForegroundColor Yellow
    Write-Host "1. Go to EC2 Console > Instances > Select instance > Actions > Security > Modify IAM role" -ForegroundColor White
    Write-Host "2. Attach a role that has S3 read permissions" -ForegroundColor White
    exit
}

# Create inline policy document
Write-Host "`n2. Creating inline policy for S3 access..." -ForegroundColor Yellow

$inlinePolicyDoc = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::milo-deploy-*",
                "arn:aws:s3:::milo-deploy-*/*"
            ]
        }
    ]
}
"@

# Save to temp file
$policyFile = [System.IO.Path]::GetTempFileName() + ".json"
$inlinePolicyDoc | Out-File -FilePath $policyFile -Encoding UTF8 -NoNewline

Write-Host "Policy document saved" -ForegroundColor Green

# Put inline policy on role
Write-Host "`n3. Attaching inline policy to role..." -ForegroundColor Yellow

$policyName = "MiloS3DeployAccess"

aws iam put-role-policy --role-name $roleName --policy-name $policyName --policy-document "file://$policyFile" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=========================================" -ForegroundColor Green
    Write-Host "SUCCESS: S3 permissions attached!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Policy '$policyName' attached to role '$roleName'" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Note: Permissions may take a few seconds to propagate" -ForegroundColor Yellow
    Write-Host "You can now retry the deployment" -ForegroundColor Cyan
} else {
    Write-Host "`nFailed to attach policy!" -ForegroundColor Red
    Write-Host ""
    Write-Host "You can manually attach S3 permissions via AWS Console:" -ForegroundColor Yellow
    Write-Host "1. Go to IAM Console > Roles > $roleName" -ForegroundColor White
    Write-Host "2. Click 'Add permissions' > 'Create inline policy'" -ForegroundColor White
    Write-Host "3. Use JSON editor and paste the policy document from: $policyFile" -ForegroundColor White
}

Remove-Item $policyFile -ErrorAction SilentlyContinue
Write-Host ""
