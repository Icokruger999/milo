# SSH Connection to EC2

## ✅ Connection Verified

SSH connection is working! 

**Connection Details:**
- Key: `C:\Users\Ico\Downloads\codingeverestkey.pem`
- Host: `ec2-34-246-3-141.eu-west-1.compute.amazonaws.com`
- User: `ec2-user`

## Quick SSH Command

```powershell
ssh -i "$env:USERPROFILE\Downloads\codingeverestkey.pem" ec2-user@ec2-34-246-3-141.eu-west-1.compute.amazonaws.com
```

Or use the script:
```powershell
.\ssh-to-ec2.ps1
```

## Current EC2 Status

- ✅ `/var/www` directory exists
- ✅ `milo-api` directory exists (empty, ready for deployment)
- ⏳ .NET Runtime needs to be installed
- ⏳ Milo backend needs to be deployed

## Next Steps

### 1. Install .NET Runtime on EC2

SSH into EC2 and run:
```bash
sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm
sudo yum install -y dotnet-runtime-8.0
dotnet --version
```

### 2. Deploy Milo Backend

From your Windows machine, you can:
- Use the SSM deployment script: `.\deploy-to-ec2-ssm.ps1`
- Or manually copy files via SCP and set up the service

## Useful SSH Commands

```bash
# Check .NET
dotnet --version

# Check directories
ls -la /var/www
ls -la /var/www/milo-api

# Check services
sudo systemctl status milo-api
sudo systemctl list-units --type=service | grep milo

# View logs
sudo journalctl -u milo-api -f

# Test API
curl http://localhost:5000/api/health
```

