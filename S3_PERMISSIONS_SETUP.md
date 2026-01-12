# S3 Permissions Setup for EC2 Instance

## Current Issue

The EC2 instance cannot download files from S3 (403 Forbidden error). The IAM role needs S3 read permissions.

## Instance Details

- **Instance ID**: i-06bc5b2218c041802
- **Instance Profile**: EC2-SSM-Profile
- **Region**: us-east-1

## Solution: Add S3 Permissions via AWS Console

### Option 1: Add Inline Policy (Recommended)

1. Go to **IAM Console** > **Roles**
2. Search for the role attached to the EC2 instance (the role name from the instance profile)
3. Click on the role
4. Click **"Add permissions"** > **"Create inline policy"**
5. Click **"JSON"** tab
6. Paste this policy:

```json
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
```

7. Click **"Next"** > Enter policy name: `MiloS3DeployAccess`
8. Click **"Create policy"**

### Option 2: Attach AWS Managed Policy (Simpler but broader permissions)

1. Go to **IAM Console** > **Roles**
2. Find the role attached to the EC2 instance
3. Click **"Add permissions"** > **"Attach policies"**
4. Search for: `AmazonS3ReadOnlyAccess`
5. Select it and click **"Add permissions"**

## After Adding Permissions

1. Wait 10-30 seconds for permissions to propagate
2. Retry the deployment script:
   ```powershell
   .\deploy-direct-ssm.ps1 -BucketName "milo-deploy-856125221"
   ```

## Alternative: Manual Deployment via Session Manager

If S3 permissions are problematic, you can deploy manually:

1. Connect to EC2 via AWS Session Manager
2. Use Session Manager file transfer or copy files via git
