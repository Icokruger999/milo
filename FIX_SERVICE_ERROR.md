# Fix Milo API Service Error - Exit Code 1

The service is failing to start. Run these commands on EC2 to diagnose and fix:

## Step 1: Get Detailed Error Message

```bash
sudo journalctl -u milo-api.service -n 100 --no-pager
```

This will show the actual error message.

## Step 2: Check Most Common Issues

### Check if .NET is installed:
```bash
dotnet --version
which dotnet
```

If not installed:
```bash
sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm
sudo yum install -y dotnet-runtime-8.0
```

### Check if files exist:
```bash
ls -la /var/www/milo-api/
ls -la /var/www/milo-api/Milo.API.dll
```

### Check file permissions:
```bash
sudo chown -R ec2-user:ec2-user /var/www/milo-api
ls -la /var/www/milo-api/
```

## Step 3: Test Running Manually

This will show the exact error:

```bash
cd /var/www/milo-api
/usr/bin/dotnet Milo.API.dll
```

OR if dotnet is in a different location:

```bash
cd /var/www/milo-api
dotnet Milo.API.dll
```

## Step 4: Check Service File

```bash
cat /etc/systemd/system/milo-api.service
```

Make sure the paths are correct.

## Step 5: Fix Based on Error

### If .NET not found:
```bash
sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm
sudo yum install -y dotnet-runtime-8.0
```

### If files missing:
You need to copy files from Windows first:
```powershell
# On Windows:
cd backend\Milo.API
dotnet publish -c Release -o .\publish
scp -i your-key.pem -r .\publish\* ec2-user@34.246.3.141:/var/www/milo-api/
```

### If wrong dotnet path:
```bash
# Find dotnet
which dotnet

# Update service file with correct path
sudo nano /etc/systemd/system/milo-api.service
# Change ExecStart to use the correct path
```

### If permission issues:
```bash
sudo chown -R ec2-user:ec2-user /var/www/milo-api
sudo chmod -R 755 /var/www/milo-api
```

## Step 6: Restart Service

```bash
sudo systemctl daemon-reload
sudo systemctl restart milo-api
sudo systemctl status milo-api
```

## Most Likely Issue

Based on exit code 1, the most common causes are:
1. **.NET Runtime not installed** - Run: `dotnet --version` to check
2. **Files not copied** - Check: `ls -la /var/www/milo-api/`
3. **Wrong dotnet path** - Check: `which dotnet` and update service file

Run the manual test (Step 3) first - it will show the exact error!

