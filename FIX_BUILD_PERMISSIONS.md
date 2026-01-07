# Fix Build Permission Error

## The Problem
```
error CS2012: Cannot open '/home/ec2-user/milo-repo/backend/Milo.API/obj/Release/net8.0/Milo.API.dll' for writing 
-- 'Access to the path ... is denied.'
```

## Solution - Run in Session Manager

**Fix permissions on entire repo:**

```bash
sudo chown -R ec2-user:ec2-user /home/ec2-user/milo-repo
chmod -R 755 /home/ec2-user/milo-repo
```

**Clean and rebuild:**

```bash
cd /home/ec2-user/milo-repo/backend/Milo.API
rm -rf obj bin
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
curl http://localhost:5001/api/health
```

