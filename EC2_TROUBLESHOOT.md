# Troubleshooting Milo API Service on EC2

## Service Failed to Start - Diagnostic Commands

Run these commands on EC2 to diagnose the issue:

### 1. Check Service Status and Logs

```bash
sudo systemctl status milo-api.service
```

### 2. View Detailed Logs

```bash
sudo journalctl -xeu milo-api.service -n 50
```

### 3. Check if .NET is Installed

```bash
dotnet --version
which dotnet
```

If not installed:
```bash
sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm
sudo yum install -y dotnet-runtime-8.0
```

### 4. Check if Files Exist

```bash
ls -la /var/www/milo-api/
ls -la /var/www/milo-api/Milo.API.dll
```

### 5. Check File Permissions

```bash
sudo chown -R ec2-user:ec2-user /var/www/milo-api
ls -la /var/www/milo-api/
```

### 6. Test Running the DLL Manually

```bash
cd /var/www/milo-api
/usr/bin/dotnet Milo.API.dll
```

This will show any runtime errors.

### 7. Check if Port 5000 is Already in Use

```bash
sudo netstat -tlnp | grep 5000
```

### 8. Check Service File

```bash
cat /etc/systemd/system/milo-api.service
```

### 9. Verify User Permissions

```bash
whoami
id
```

## Common Issues and Fixes

### Issue: .NET Runtime Not Found
**Fix:**
```bash
sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm
sudo yum install -y dotnet-runtime-8.0
```

### Issue: Files Not Found
**Fix:** Copy files from Windows:
```powershell
# On Windows:
scp -i your-key.pem -r .\backend\Milo.API\publish\* ec2-user@34.246.3.141:/var/www/milo-api/
```

### Issue: Permission Denied
**Fix:**
```bash
sudo chown -R ec2-user:ec2-user /var/www/milo-api
sudo chmod +x /var/www/milo-api/Milo.API.dll
```

### Issue: Wrong .NET Path
**Fix:** Check where dotnet is installed:
```bash
which dotnet
# Update service file if path is different
```

### Issue: Port Already in Use
**Fix:** Stop conflicting service or change port in service file.

## Quick Fix Script

Run this to fix common issues:

```bash
# Install .NET if missing
if ! command -v dotnet &> /dev/null; then
    sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm
    sudo yum install -y dotnet-runtime-8.0
fi

# Fix permissions
sudo chown -R ec2-user:ec2-user /var/www/milo-api
sudo chmod -R 755 /var/www/milo-api

# Restart service
sudo systemctl daemon-reload
sudo systemctl restart milo-api
sudo systemctl status milo-api
```

