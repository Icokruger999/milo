# Deploy Milo Backend - Quick Guide

## Issue: .NET Not Found in PATH

If `dotnet` command is not recognized, try these:

### Option 1: Restart PowerShell
Close and reopen PowerShell - .NET might need PATH refresh.

### Option 2: Find .NET Installation
```powershell
# Search for dotnet.exe
Get-ChildItem -Path "C:\Program Files" -Filter "dotnet.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
Get-ChildItem -Path "C:\Program Files (x86)" -Filter "dotnet.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
```

### Option 3: Manual Deployment Steps

If you can't find dotnet, you can deploy manually:

**1. Build (if you have .NET elsewhere or on another machine):**
```powershell
cd backend\Milo.API
dotnet publish -c Release -o .\publish
```

**2. Copy files to EC2:**
```powershell
scp -i "$env:USERPROFILE\Downloads\codingeverestkey.pem" -r .\publish\* ec2-user@ec2-34-246-3-141.eu-west-1.compute.amazonaws.com:/var/www/milo-api/
```

**3. SSH and set up service:**
```powershell
ssh -i "$env:USERPROFILE\Downloads\codingeverestkey.pem" ec2-user@ec2-34-246-3-141.eu-west-1.compute.amazonaws.com
```

Then on EC2:
```bash
sudo chown -R ec2-user:ec2-user /var/www/milo-api

sudo tee /etc/systemd/system/milo-api.service > /dev/null <<EOF
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
EOF

sudo systemctl daemon-reload
sudo systemctl enable milo-api
sudo systemctl start milo-api
sudo systemctl status milo-api
```

**4. Test:**
```bash
curl http://localhost:5000/api/health
```

## Quick Fix: Add .NET to PATH

If .NET is installed but not in PATH:

```powershell
# Add to PATH for current session
$env:PATH += ";C:\Program Files\dotnet"

# Or permanently (requires admin):
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\dotnet", "User")
```

Then restart PowerShell and try again.


