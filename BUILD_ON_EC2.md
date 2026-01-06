# Build Backend Directly on EC2 (No Local .NET Needed)

You can build the backend directly on EC2 instead of building locally!

## Step 1: Install .NET SDK on EC2

Run on EC2:
```bash
sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm
sudo yum install -y dotnet-sdk-8.0
dotnet --version
```

## Step 2: Copy Source Code to EC2

From Windows, copy the source code (not built files):
```powershell
# Create directory on EC2
ssh -i "$env:USERPROFILE\.ssh\streamyo-backend-key-new.pem" ec2-user@34.246.3.141 "mkdir -p ~/milo-backend"

# Copy source files
scp -i "$env:USERPROFILE\.ssh\streamyo-backend-key-new.pem" -r .\backend\Milo.API\* ec2-user@34.246.3.141:~/milo-backend/
```

## Step 3: Build on EC2

Run on EC2:
```bash
cd ~/milo-backend
dotnet restore
dotnet publish -c Release -o /var/www/milo-api
sudo chown -R ec2-user:ec2-user /var/www/milo-api
```

## Step 4: Set Up Service

```bash
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
```

## Why This Works

- **EC2 has .NET SDK** → Can compile C# code
- **No local .NET needed** → Build happens on the server
- **Source code is small** → Easy to copy via SCP

This is actually a common approach for production deployments!

