# S3 Permissions Fix - Quick Guide

## Current Status

✅ **Build Complete** - Application built with correct Supabase connection string
❌ **S3 Permissions Missing** - EC2 instance cannot download deployment files

## Quick Fix: Add S3 Permissions via AWS Console

### Steps:

1. **Go to AWS IAM Console:**
   - Navigate to: https://console.aws.amazon.com/iam/
   - Click **"Roles"** in the left menu
   - Search for: **EC2-SSM-Role**

2. **Add Inline Policy:**
   - Click on the role **EC2-SSM-Role**
   - Click **"Add permissions"** dropdown
   - Click **"Create inline policy"**
   - Click **"JSON"** tab
   - **Delete any existing content** and paste this exact JSON:

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

3. **Save the Policy:**
   - Click **"Next"**
   - Policy name: `MiloS3DeployAccess`
   - Click **"Create policy"**

4. **Wait 10-30 seconds** for permissions to propagate

5. **Retry Deployment:**
   ```powershell
   .\deploy-direct-ssm.ps1 -BucketName "milo-deploy-856125221"
   ```

## Alternative: Use AWS Managed Policy (Simpler)

Instead of inline policy, you can attach the AWS managed policy:

1. Go to IAM Console > Roles > **EC2-SSM-Role**
2. Click **"Add permissions"** > **"Attach policies"**
3. Search for: `AmazonS3ReadOnlyAccess`
4. Select it and click **"Add permissions"**

(Note: This gives broader S3 read access, but is simpler)

## After Adding Permissions

Once S3 permissions are added, the deployment script will be able to:
1. Download the deployment package from S3
2. Extract files to `/var/www/milo-api`
3. Restart the API service
4. Run migrations automatically

## Expected Result

After successful deployment, you should see in the logs:
- "Database migrations applied successfully"
- Tables created in Supabase `milo` database
