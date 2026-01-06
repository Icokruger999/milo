# EC2 Console Commands - Deploy Milo Backend

Run these commands on your EC2 instance (Amazon Linux):

## Step 1: Check if .NET Runtime is Installed

```bash
dotnet --version
```

If not installed, install it:
```bash
sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm
sudo yum install -y dotnet-runtime-8.0
```

## Step 2: Check if Files Are Already Deployed

```bash
ls -la /var/www/milo-api/
```

If files are there, skip to Step 4. If not, the files need to be copied from your Windows machine first.

## Step 3: Create Directory and Set Permissions

```bash
sudo mkdir -p /var/www/milo-api
sudo chown -R ec2-user:ec2-user /var/www/milo-api
```

## Step 4: Create Systemd Service

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
```

## Step 5: Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable milo-api
sudo systemctl start milo-api
```

## Step 6: Check Service Status

```bash
sudo systemctl status milo-api
```

## Step 7: Test API

```bash
curl http://localhost:5000/api/health
```

Should return: `{"status":"ok","message":"Milo API is running"}`

## Step 8: Check Logs (if needed)

```bash
sudo journalctl -u milo-api -f
```

## Troubleshooting

**If service fails to start:**
```bash
# Check logs
sudo journalctl -u milo-api -n 50

# Check if .NET is installed
dotnet --version

# Check file permissions
ls -la /var/www/milo-api/
```

**If port 5000 is not accessible:**
- Make sure security group allows port 5000
- Test locally first: `curl http://localhost:5000/api/health`

