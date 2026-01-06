# Deploy from GitHub to EC2 - No Local .NET Needed!

This is the easiest way - deploy directly from GitHub to EC2.

## How It Works

1. **Code is on GitHub** ✅ (already done)
2. **EC2 clones from GitHub**
3. **EC2 builds the application**
4. **EC2 runs the service**

No .NET needed on Windows, no SSH key issues!

## Step 1: Copy Script to EC2

From Windows PowerShell, copy the deployment script:

```powershell
scp -i "$env:USERPROFILE\.ssh\streamyo-backend-key-new.pem" deploy-from-github.sh ec2-user@34.246.3.141:~/deploy.sh
```

Or create it directly on EC2:

```bash
# On EC2 - create the script
nano ~/deploy.sh
# Paste the contents of deploy-from-github.sh
# Save and exit (Ctrl+X, Y, Enter)
chmod +x ~/deploy.sh
```

## Step 2: Run Deployment Script on EC2

```bash
# On EC2
~/deploy.sh
```

Or run commands directly:

```bash
# Install .NET SDK
sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm
sudo yum install -y dotnet-sdk-8.0

# Install git (if not installed)
sudo yum install -y git

# Clone repository
cd ~
git clone https://github.com/Icokruger999/milo.git
cd milo/backend/Milo.API

# Build
dotnet restore
dotnet publish -c Release -o /var/www/milo-api

# Set permissions
sudo chown -R ec2-user:ec2-user /var/www/milo-api

# Create and start service (use commands from EC2_DEPLOY_COMMANDS.md)
```

## Step 3: Future Updates

Whenever you push to GitHub, just run on EC2:

```bash
cd ~/milo-repo
git pull origin main
cd backend/Milo.API
dotnet publish -c Release -o /var/www/milo-api
sudo systemctl restart milo-api
```

Or run the script again:
```bash
~/deploy.sh
```

## Benefits

✅ No .NET needed on Windows
✅ No SSH key permission issues
✅ Code always in sync with GitHub
✅ Easy to update - just push and run script
✅ Can automate with GitHub Actions later

