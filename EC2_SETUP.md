# EC2 Setup Guide for Milo Backend

This guide will help you deploy the Milo backend API to your EC2 instance named "codingeverest".

## Prerequisites

1. **AWS CLI installed and configured**
   - Access Key ID: `AKIASFECYFH62HKHHF5D`
   - Secret Access Key (you have this)
   - Region configured

2. **.NET SDK 8.0 or later** installed locally

3. **SSH access** to EC2 instance
   - SSH key (.pem file) for the instance
   - Security group allowing SSH (port 22) and HTTP (port 5000)

4. **EC2 Instance Requirements**
   - .NET Runtime installed on EC2
   - Sufficient permissions to create systemd service

## Quick Start

### Option 1: Automated Scripts (Recommended)

1. **Find your EC2 instance:**
   ```powershell
   .\ec2-setup.ps1
   ```
   This will:
   - Check AWS CLI configuration
   - Find the "codingeverest" EC2 instance
   - Display instance details (ID, IP, status)

2. **Deploy to EC2:**
   ```powershell
   .\deploy-to-ec2.ps1
   ```
   The script will:
   - Build the backend application
   - Find your EC2 instance automatically
   - Copy files to EC2
   - Set up systemd service
   - Start the API service

### Option 2: Manual Deployment

#### Step 1: Find EC2 Instance Details

```powershell
# List all EC2 instances
aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name,PublicIpAddress,Tags[?Key=='Name'].Value|[0]]" --output table

# Find codingeverest instance specifically
aws ec2 describe-instances --filters "Name=tag:Name,Values=*codingeverest*" --query "Reservations[*].Instances[*].[InstanceId,PublicIpAddress,State.Name]" --output table
```

#### Step 2: Ensure Instance is Running

```powershell
# Start instance if stopped
aws ec2 start-instances --instance-ids i-xxxxxxxxxxxxx

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids i-xxxxxxxxxxxxx
```

#### Step 3: Install .NET Runtime on EC2

SSH into your EC2 instance:

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

Then install .NET 8.0 Runtime:

**For Amazon Linux 2:**
```bash
sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm
sudo yum install -y dotnet-runtime-8.0
```

**For Ubuntu:**
```bash
wget https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update
sudo apt-get install -y dotnet-runtime-8.0
```

#### Step 4: Build Backend Locally

```powershell
cd backend/Milo.API
dotnet publish -c Release -o ./publish
```

#### Step 5: Copy to EC2

```powershell
# Create directory on EC2
ssh -i your-key.pem ec2-user@your-ec2-ip "sudo mkdir -p /var/www/milo-api && sudo chown ec2-user:ec2-user /var/www/milo-api"

# Copy files
scp -i your-key.pem -r ./publish/* ec2-user@your-ec2-ip:/var/www/milo-api/
```

#### Step 6: Set Up Systemd Service

Create service file on EC2:

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
sudo nano /etc/systemd/system/milo-api.service
```

Add this content:

```ini
[Unit]
Description=Milo API
After=network.target

[Service]
Type=notify
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
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable milo-api
sudo systemctl start milo-api
sudo systemctl status milo-api
```

## Configuration

### Update appsettings.json

Before deploying, update `backend/Milo.API/appsettings.json`:

```json
{
  "EC2": {
    "InstanceId": "i-xxxxxxxxxxxxx",
    "Region": "us-east-1"
  },
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=MiloDB;User Id=your_user;Password=your_password;"
  }
}
```

### Security Group Configuration

Ensure your EC2 security group allows:
- **Port 22 (SSH)** - From your IP
- **Port 5000 (HTTP)** - From anywhere (0.0.0.0/0) or from Amplify IPs

```powershell
# Add rule to allow HTTP traffic
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxxxxxx \
  --protocol tcp \
  --port 5000 \
  --cidr 0.0.0.0/0
```

## Verify Deployment

1. **Check service status:**
   ```bash
   ssh -i your-key.pem ec2-user@your-ec2-ip "sudo systemctl status milo-api"
   ```

2. **Test API endpoint:**
   ```powershell
   # Health check
   curl http://your-ec2-ip:5000/api/health
   
   # Should return: {"status":"ok","message":"Milo API is running"}
   ```

3. **Check logs:**
   ```bash
   ssh -i your-key.pem ec2-user@your-ec2-ip "sudo journalctl -u milo-api -f"
   ```

## Troubleshooting

### Service won't start
- Check logs: `sudo journalctl -u milo-api -n 50`
- Verify .NET runtime is installed: `dotnet --version`
- Check file permissions: `ls -la /var/www/milo-api`

### Can't connect to API
- Verify security group allows port 5000
- Check if service is running: `sudo systemctl status milo-api`
- Test locally on EC2: `curl http://localhost:5000/api/health`

### Permission denied
- Ensure user has permissions: `sudo chown -R ec2-user:ec2-user /var/www/milo-api`
- Check service file user matches: `User=ec2-user` in service file

## Next Steps

After successful deployment:

1. **Update frontend config** to point to EC2 API:
   - Update `frontend/js/config.js` with EC2 IP or domain
   
2. **Set up reverse proxy** (optional, recommended):
   - Install Nginx on EC2
   - Configure to proxy requests from port 80 to 5000
   - Set up SSL with Let's Encrypt

3. **Configure Amplify** to use EC2 API:
   - Set environment variable: `API_BASE_URL=http://your-ec2-ip:5000/api`

## Useful Commands

```bash
# Restart service
sudo systemctl restart milo-api

# Stop service
sudo systemctl stop milo-api

# View logs
sudo journalctl -u milo-api -f

# Check if port is listening
sudo netstat -tlnp | grep 5000
```

