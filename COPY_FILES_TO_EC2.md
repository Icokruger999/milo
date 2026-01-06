# Copy Files to EC2 - Step by Step

## The Problem
.NET is installed on EC2, but the application files are missing. You need to copy them from Windows.

## Step 1: Build on Windows (if not already done)

```powershell
cd backend\Milo.API
dotnet publish -c Release -o .\publish
cd ..\..
```

## Step 2: Find Your SSH Key

The key is usually in one of these locations:
- `C:\Users\YourName\.ssh\codingeverestkey.pem`
- `C:\Users\YourName\Downloads\codingeverestkey.pem`

## Step 3: Copy Files to EC2

Run this command from the `milo` directory (where you are now):

```powershell
# Replace YOUR_KEY_PATH with your actual .pem file path
scp -i "C:\Users\YourName\.ssh\codingeverestkey.pem" -r .\backend\Milo.API\publish\* ec2-user@34.246.3.141:/var/www/milo-api/
```

Or if your key is in Downloads:
```powershell
scp -i "$env:USERPROFILE\Downloads\codingeverestkey.pem" -r .\backend\Milo.API\publish\* ec2-user@34.246.3.141:/var/www/milo-api/
```

## Step 4: Verify Files on EC2

After copying, run on EC2:
```bash
ls -la /var/www/milo-api/
ls -la /var/www/milo-api/Milo.API.dll
```

## Step 5: Fix Permissions on EC2

```bash
sudo chown -R ec2-user:ec2-user /var/www/milo-api
sudo chmod -R 755 /var/www/milo-api
```

## Step 6: Restart Service on EC2

```bash
sudo systemctl restart milo-api
sudo systemctl status milo-api
```

## Alternative: Use the Deployment Script

If you prefer, you can use the PowerShell script:
```powershell
.\deploy-backend-simple.ps1
```

This will build and copy everything automatically.

