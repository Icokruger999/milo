# Commands to Run on EC2 Console

## Step 1: Install .NET 8.0 Runtime

Run these commands on your EC2 console:

```bash
# Add Microsoft package repository
sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm

# Install .NET 8.0 Runtime
sudo yum install -y dotnet-runtime-8.0

# Verify installation
dotnet --version
```

You should see output like: `8.0.x`

## Step 2: Create Directory Structure

```bash
# Create /var/www directory
sudo mkdir -p /var/www/milo-api

# Set proper permissions
sudo chown -R ec2-user:ec2-user /var/www

# Verify
ls -la /var/www
```

## Step 3: Verify Everything is Ready

```bash
# Check .NET is installed
dotnet --version

# Check directory exists
ls -la /var/www

# Check no old services are running
sudo systemctl list-units --type=service --all | grep -E '(api|app|backend)'

# Check port 5000 is available
sudo netstat -tlnp | grep 5000 || echo "Port 5000 is free"
```

## Step 4: Open Port 5000 (If Not Already Open)

If you need to open port 5000 in the security group, you'll need to do this from your Windows machine or AWS Console. But first, let's check if it's needed.

## Ready for Deployment

Once you've completed these steps, go back to your Windows machine and run:

```powershell
.\deploy-to-ec2.ps1
```

This will build and deploy the Milo backend to your EC2 instance.

