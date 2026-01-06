# EC2 Quick Start Guide - codingeverest

## ✅ Instance Found!

Your EC2 instance is ready:
- **Instance ID**: `i-06bc5b2218c041802`
- **Public IP**: `34.246.3.141`
- **Status**: Running ✅
- **AMI**: Amazon Linux 2023 (username: `ec2-user`)

## 🚀 Quick Deployment Steps

### Step 1: Open Port 5000 (Required)

Your security groups currently allow ports 22 and 80, but not 5000. Run this to add it:

```powershell
.\add-port-5000.ps1
```

Or manually:
```powershell
aws ec2 authorize-security-group-ingress --group-id sg-0eb3b878979ad2355 --protocol tcp --port 5000 --cidr 0.0.0.0/0
```

### Step 2: Install .NET Runtime on EC2

SSH into your instance and install .NET 8.0:

```bash
ssh -i your-key.pem ec2-user@34.246.3.141

# Install .NET 8.0 Runtime
sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm
sudo yum install -y dotnet-runtime-8.0

# Verify installation
dotnet --version
```

### Step 3: Deploy Backend

Use the automated script:

```powershell
.\deploy-to-ec2.ps1 -InstanceId i-06bc5b2218c041802 -PublicIp 34.246.3.141 -Username ec2-user
```

The script will:
- ✅ Build the backend application
- ✅ Copy files to EC2
- ✅ Set up systemd service
- ✅ Start the API

### Step 4: Verify Deployment

Test the API:

```powershell
# Health check
curl http://34.246.3.141:5000/api/health

# Should return: {"status":"ok","message":"Milo API is running"}
```

Or check service status:

```bash
ssh -i your-key.pem ec2-user@34.246.3.141 "sudo systemctl status milo-api"
```

## 📋 Current Configuration

- ✅ Instance details updated in `backend/Milo.API/appsettings.json`
- ✅ CORS configured for `www.codingeverest.com`
- ⏳ Port 5000 needs to be opened (run `.\add-port-5000.ps1`)
- ⏳ .NET Runtime needs to be installed on EC2
- ⏳ Backend needs to be deployed

## 🔧 Manual Deployment (Alternative)

If you prefer manual steps, see `EC2_SETUP.md` for detailed instructions.

## 📝 Next Steps After Deployment

1. **Update Frontend Config**
   - Update `frontend/js/config.js` to point to `http://34.246.3.141:5000/api`

2. **Configure Amplify**
   - Set environment variable: `API_BASE_URL=http://34.246.3.141:5000/api`

3. **Optional: Set up Reverse Proxy**
   - Install Nginx on EC2
   - Configure to proxy port 80 → 5000
   - Set up SSL with Let's Encrypt

## 🆘 Troubleshooting

**Can't connect to API?**
- Check security group: Port 5000 must be open
- Verify service is running: `sudo systemctl status milo-api`
- Check logs: `sudo journalctl -u milo-api -f`

**Service won't start?**
- Check .NET is installed: `dotnet --version`
- Check logs: `sudo journalctl -u milo-api -n 50`
- Verify file permissions: `ls -la /var/www/milo-api`

## 📞 Quick Reference

- **Instance**: `i-06bc5b2218c041802`
- **IP**: `34.246.3.141`
- **SSH**: `ssh -i your-key.pem ec2-user@34.246.3.141`
- **API**: `http://34.246.3.141:5000`
- **Health**: `http://34.246.3.141:5000/api/health`

