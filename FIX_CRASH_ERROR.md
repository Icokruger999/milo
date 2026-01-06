# Fix "Fatal Signal" Crash Error

The service is crashing. Run these diagnostic commands on EC2:

## Step 1: Get Detailed Error Logs

```bash
sudo journalctl -xeu milo-api.service -n 100 --no-pager
```

This will show the exact crash reason.

## Step 2: Check .NET Version Compatibility

```bash
dotnet --version
```

Should be 8.0.x. If different, you may need to install the correct version.

## Step 3: Test Running Manually (Shows Exact Error)

```bash
cd /var/www/milo-api
dotnet Milo.API.dll
```

This will show the exact error message causing the crash.

## Step 4: Check if All Files Are Present

```bash
ls -la /var/www/milo-api/
```

Make sure you see:
- Milo.API.dll
- appsettings.json
- Controllers/ directory
- All .dll dependencies

## Step 5: Check File Permissions

```bash
sudo chown -R ec2-user:ec2-user /var/www/milo-api
ls -la /var/www/milo-api/
```

## Step 6: Check if Port is Available

```bash
sudo netstat -tlnp | grep 5000
```

If something is using port 5000, stop it first.

## Common Fixes

### If .NET version mismatch:
```bash
# Remove old version
sudo yum remove dotnet-runtime-8.0 dotnet-sdk-8.0 -y

# Install correct version
sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm
sudo yum install -y dotnet-runtime-8.0
```

### If files are missing:
Re-run the build:
```bash
cd ~/milo/backend/Milo.API
dotnet publish -c Release -o /var/www/milo-api
sudo chown -R ec2-user:ec2-user /var/www/milo-api
```

### If appsettings.json is missing:
```bash
# Copy appsettings.json
sudo cp ~/milo/backend/Milo.API/appsettings.json /var/www/milo-api/
sudo chown ec2-user:ec2-user /var/www/milo-api/appsettings.json
```

## Most Important: Run Manual Test

The manual test will show the exact error:

```bash
cd /var/www/milo-api
dotnet Milo.API.dll
```

Share the error output and I can help fix it!

