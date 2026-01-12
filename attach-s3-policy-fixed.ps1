# Attach S3 read permissions to EC2 instance IAM role
param(
    [string]$InstanceId = "i-06bc5b2218c041802"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Attach S3 Permissions to EC2 Role" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# The actual role name (from the error message)
$roleName = "EC2-SSM-Role"

Write-Host "Role name: $roleName" -ForegroundColor Green

# Create inline policy document
Write-Host "`nCreating inline policy for S3 access..." -ForegroundColor Yellow

$inlinePolicyDoc = @'
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
'@

# Convert policy document to single-line JSON string
$policyJson = $inlinePolicyDoc -replace '\s+', ' ' -replace ' ', '' -replace '`n', '' -replace '"', '\"'
# Actually, let's use a simpler approach - create compact JSON
$policyJson = @'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:GetObject","s3:ListBucket"],"Resource":["arn:aws:s3:::milo-deploy-*","arn:aws:s3:::milo-deploy-*/*"]}]}
'@.Trim()

Write-Host "Policy document prepared" -ForegroundColor Green

# Put inline policy on role
Write-Host "`nAttaching inline policy to role..." -ForegroundColor Yellow

$policyName = "MiloS3DeployAccess"

$result = aws iam put-role-policy --role-name $roleName --policy-name $policyName --policy-document $policyJson 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=========================================" -ForegroundColor Green
    Write-Host "SUCCESS: S3 permissions attached!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Policy '$policyName' attached to role '$roleName'" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Note: Permissions may take 10-30 seconds to propagate" -ForegroundColor Yellow
    Write-Host "Wait a moment, then retry the deployment" -ForegroundColor Cyan
} else {
    Write-Host "`nFailed to attach policy!" -ForegroundColor Red
    Write-Host "Output: $result" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please attach S3 permissions manually via AWS Console:" -ForegroundColor Yellow
    Write-Host "1. Go to IAM Console > Roles > $roleName" -ForegroundColor White
    Write-Host "2. Click 'Add permissions' > 'Create inline policy'" -ForegroundColor White
    Write-Host "3. Use JSON editor and paste:" -ForegroundColor White
    Write-Host ""
    Write-Host $inlinePolicyDoc -ForegroundColor Gray
}

Write-Host ""
