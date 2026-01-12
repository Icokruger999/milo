# Fix S3 permissions for EC2 instance
param(
    [string]$InstanceId = "i-06bc5b2218c041802"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Fix S3 Permissions for EC2 Instance" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get instance IAM role
Write-Host "1. Checking EC2 instance IAM role..." -ForegroundColor Yellow
$instanceInfo = aws ec2 describe-instances --instance-ids $InstanceId --query "Reservations[0].Instances[0].IamInstanceProfile.Arn" --output text 2>&1

if ($instanceInfo -match "arn:aws:iam") {
    Write-Host "IAM Role found: $instanceInfo" -ForegroundColor Green
    
    # Extract role name from ARN (format: arn:aws:iam::account:instance-profile/role-name)
    $roleName = $instanceInfo -replace ".*instance-profile/", ""
    Write-Host "Role name: $roleName" -ForegroundColor Cyan
} else {
    Write-Host "No IAM role attached to instance!" -ForegroundColor Red
    Write-Host "`nYou need to:" -ForegroundColor Yellow
    Write-Host "1. Create an IAM role with S3 read permissions" -ForegroundColor White
    Write-Host "2. Attach it to the EC2 instance" -ForegroundColor White
    Write-Host ""
    Write-Host "Or you can use Session Manager to deploy manually instead" -ForegroundColor Cyan
    exit
}

# Step 2: Create/update IAM policy for S3 access
Write-Host "`n2. Creating IAM policy for S3 access..." -ForegroundColor Yellow

$policyName = "MiloEC2S3AccessPolicy"
$policyDocument = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Effect = "Allow"
            Action = @(
                "s3:GetObject",
                "s3:ListBucket"
            )
            Resource = @(
                "arn:aws:s3:::milo-deploy-*",
                "arn:aws:s3:::milo-deploy-*/*"
            )
        }
    )
} | ConvertTo-Json -Depth 10

# Save policy document to temp file
$policyFile = [System.IO.Path]::GetTempFileName()
$policyDocument | Out-File -FilePath $policyFile -Encoding UTF8

Write-Host "Policy document created" -ForegroundColor Green

# Step 3: Create or update the policy
Write-Host "`n3. Creating/updating IAM policy..." -ForegroundColor Yellow

# Check if policy exists
$existingPolicy = aws iam list-policies --scope Local --query "Policies[?PolicyName=='$policyName'].Arn" --output text 2>&1

if ($existingPolicy -and $existingPolicy -match "arn:aws:iam") {
    Write-Host "Policy already exists: $existingPolicy" -ForegroundColor Cyan
    $policyArn = $existingPolicy
} else {
    Write-Host "Creating new policy..." -ForegroundColor Cyan
    $createResult = aws iam create-policy --policy-name $policyName --policy-document "file://$policyFile" --output json 2>&1 | ConvertFrom-Json
    
    if ($createResult.Policy.Arn) {
        $policyArn = $createResult.Policy.Arn
        Write-Host "Policy created: $policyArn" -ForegroundColor Green
    } else {
        Write-Host "Failed to create policy. You may need to create it manually via AWS Console." -ForegroundColor Red
        Remove-Item $policyFile
        exit
    }
}

# Step 4: Attach policy to role
Write-Host "`n4. Attaching policy to IAM role..." -ForegroundColor Yellow

# Check if policy is already attached
$attachedPolicies = aws iam list-attached-role-policies --role-name $roleName --query "AttachedPolicies[?PolicyArn=='$policyArn'].PolicyArn" --output text 2>&1

if ($attachedPolicies -and $attachedPolicies -match "arn:aws:iam") {
    Write-Host "Policy is already attached to role" -ForegroundColor Green
} else {
    Write-Host "Attaching policy to role..." -ForegroundColor Cyan
    aws iam attach-role-policy --role-name $roleName --policy-arn $policyArn 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Policy attached successfully!" -ForegroundColor Green
    } else {
        Write-Host "Failed to attach policy. You may need to do this manually via AWS Console." -ForegroundColor Yellow
        Write-Host "Policy ARN: $policyArn" -ForegroundColor Cyan
        Write-Host "Role name: $roleName" -ForegroundColor Cyan
    }
}

# Cleanup
Remove-Item $policyFile -ErrorAction SilentlyContinue

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "S3 Permissions Setup Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Note: It may take a few seconds for permissions to propagate" -ForegroundColor Yellow
Write-Host "You can now retry the deployment script" -ForegroundColor Cyan
Write-Host ""
