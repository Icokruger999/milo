# Deploy to EC2 Without SSH

This guide shows how to deploy the Milo backend to EC2 using AWS Systems Manager (SSM) without needing SSH access.

## Prerequisites

1. **AWS CLI configured** with your credentials
2. **EC2 Instance** must have:
   - SSM Agent installed (usually pre-installed on Amazon Linux)
   - IAM role with SSM permissions attached

## Quick Deploy

```powershell
.\deploy-to-ec2-ssm.ps1
```

This script will:
1. Build the backend application
2. Create a deployment package (ZIP)
3. Upload to S3 temporarily
4. Use SSM to execute deployment commands on EC2
5. Download, extract, and set up the service
6. Clean up temporary files

## How It Works

Instead of SSH, this method uses:
- **AWS Systems Manager (SSM)** to run commands on EC2
- **S3** as temporary storage for deployment files
- **No SSH keys required**

## Verify SSM is Available

Check if your instance can use SSM:

```powershell
aws ssm describe-instance-information --instance-information-filter-list key=InstanceIds,valueSet=i-06bc5b2218c041802
```

If you see the instance with `PingStatus: Online`, SSM is working.

## If SSM is Not Available

If SSM is not available, you'll need to:

1. **Attach IAM Role to EC2 Instance:**
   - Go to EC2 Console → Instances → Select your instance
   - Actions → Security → Modify IAM role
   - Attach a role with `AmazonSSMManagedInstanceCore` policy

2. **Or use the SSH method:**
   ```powershell
   .\deploy-to-ec2.ps1
   ```

## Alternative: Manual Deployment via AWS Console

You can also manually upload files using:
- AWS Systems Manager Session Manager (browser-based terminal)
- AWS CodeDeploy
- AWS Elastic Beanstalk

## Troubleshooting

**SSM command fails:**
- Check IAM role has SSM permissions
- Verify SSM agent is running: `sudo systemctl status amazon-ssm-agent`
- Check instance is in the same region as your AWS CLI

**Deployment package too large:**
- The script uses S3 for transfer, which handles large files
- If issues occur, check S3 bucket permissions

