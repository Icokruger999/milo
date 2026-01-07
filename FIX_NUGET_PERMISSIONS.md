# Fix NuGet Permission Error

## The Problem
```
error: Failed to read NuGet.Config due to unauthorized access. 
Path: '/home/ec2-user/.dotnet/.nuget/NuGet/NuGet.Config'
```

## Solution - Run in Session Manager

**Fix permissions:**

```bash
sudo chown -R ec2-user:ec2-user /home/ec2-user/.dotnet
chmod -R 755 /home/ec2-user/.dotnet
```

**Then rebuild:**

```bash
cd /home/ec2-user/milo-repo/backend/Milo.API
export HOME=/home/ec2-user
export DOTNET_CLI_HOME=/home/ec2-user/.dotnet
dotnet restore
dotnet publish -c Release -o /var/www/milo-api
```

**Restart service:**

```bash
sudo chown -R ec2-user:ec2-user /var/www/milo-api
sudo systemctl restart milo-api
sleep 10
sudo systemctl status milo-api
```

