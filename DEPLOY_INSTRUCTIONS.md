# Deploy Milo Backend - Final Steps

## ✅ Current Status

- ✅ Cleanup complete - `/var/www` is clean
- ✅ `milo-api` directory exists and is ready
- ⚠️ PowerShell scripts must run on **Windows**, not on EC2

## Important: Where to Run Scripts

**PowerShell scripts (.ps1) run on your Windows machine**, not on EC2!

The scripts connect to EC2 remotely and deploy the code.

## Deployment Options

### Option 1: Use SSM Deployment (Recommended if IAM permissions fixed)

From your **Windows PowerShell** (not EC2):

```powershell
.\deploy-to-ec2-ssm.ps1
```

**Note:** You saw an IAM permission error. To fix:
- The EC2 instance needs an IAM role with `AmazonSSMManagedInstanceCore` policy
- Or use Option 2 below

### Option 2: Manual Deployment via S3 + SSM

1. **Build on Windows:**
   ```powershell
   cd backend/Milo.API
   dotnet publish -c Release -o ./publish
   ```

2. **Create ZIP:**
   ```powershell
   Compress-Archive -Path "./publish/*" -DestinationPath "../milo-api.zip" -Force
   ```

3. **Upload to S3:**
   ```powershell
   aws s3 cp ../milo-api.zip s3://your-bucket-name/milo-api.zip
   ```

4. **On EC2 (via Session Manager), download and extract:**
   ```bash
   cd /tmp
   aws s3 cp s3://your-bucket-name/milo-api.zip ./
   unzip -o milo-api.zip -d /var/www/milo-api/
   sudo chown -R ec2-user:ec2-user /var/www/milo-api
   ```

5. **Create systemd service on EC2:**
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
   sudo systemctl status milo-api
   ```

### Option 3: Fix IAM Permissions First

If you want to use SSM deployment, attach proper IAM role:

1. Go to EC2 Console → Your instance
2. Actions → Security → Modify IAM role
3. Attach role with `AmazonSSMManagedInstanceCore` policy
4. Then run: `.\deploy-to-ec2-ssm.ps1` from Windows

## Verify Deployment

After deployment, test the API:

```bash
# On EC2
curl http://localhost:5000/api/health

# Should return: {"status":"ok","message":"Milo API is running"}
```

Or from outside:
```powershell
curl http://34.246.3.141:5000/api/health
```

## Next Steps

1. ✅ Cleanup done
2. ⏳ Deploy Milo backend (choose one option above)
3. ⏳ Verify API is running
4. ⏳ Update frontend to point to API
5. ⏳ Deploy frontend to Amplify

