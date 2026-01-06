# Next Steps - Production Deployment

## ✅ What's Done
- ✅ Connection issues fixed (CORS, HTTPS redirection)
- ✅ Production-only configuration (no localhost references)
- ✅ API client with retry logic created
- ✅ Error handling added
- ✅ EC2 instance identified: `i-06bc5b2218c041802` (34.246.3.141)

## 🚀 Next Steps to Deploy

### Step 1: Verify Prerequisites

**On your Windows machine:**
```powershell
# Check if .NET SDK is installed
dotnet --version
# Should show: 8.0.x or higher
```

**If .NET is not installed:**
- Download from: https://dotnet.microsoft.com/download/dotnet/8.0
- Install the **SDK** (not just Runtime)

### Step 2: Open Port 5000 on EC2

The API will run on port 5000. Make sure it's open:

```powershell
.\add-port-5000.ps1
```

Or manually:
```powershell
aws ec2 authorize-security-group-ingress --group-id sg-0eb3b878979ad2355 --protocol tcp --port 5000 --cidr 0.0.0.0/0
```

### Step 3: Install .NET Runtime on EC2

**Option A: Via AWS Console (Session Manager)**
1. Go to EC2 Console → Instances
2. Select instance `i-06bc5b2218c041802`
3. Click "Connect" → "Session Manager"
4. Run these commands:

```bash
# Install .NET 8.0 Runtime
sudo rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm
sudo yum install -y dotnet-runtime-8.0

# Verify
dotnet --version
# Should show: 8.0.x
```

**Option B: Via SSH** (if you have SSH key)
```bash
ssh -i your-key.pem ec2-user@34.246.3.141
# Then run the install commands above
```

### Step 4: Deploy Backend to EC2

**From your Windows PowerShell:**

```powershell
.\deploy-to-ec2.ps1
```

This script will:
- ✅ Build the backend (`dotnet publish`)
- ✅ Copy files to EC2
- ✅ Create systemd service
- ✅ Start the API service

**If the script fails, use manual deployment:**
```powershell
# Build
cd backend\Milo.API
dotnet publish -c Release -o .\publish

# Deploy (replace with your SSH key path)
scp -i "C:\path\to\your-key.pem" -r .\publish\* ec2-user@34.246.3.141:/var/www/milo-api/
```

Then SSH to EC2 and set up the service (see `EC2_CONSOLE_COMMANDS.md`).

### Step 5: Test Backend API

```powershell
# Test health endpoint
curl http://34.246.3.141:5000/api/health

# Should return: {"status":"ok","message":"Milo API is running"}
```

Or test from browser:
```
http://34.246.3.141:5000/api/health
```

### Step 6: Deploy Frontend to Amplify

**If not already deployed:**

1. **Push to GitHub** (if using Amplify CI/CD):
   ```powershell
   git add .
   git commit -m "Production deployment ready"
   git push
   ```

2. **Or manually deploy:**
   - Go to AWS Amplify Console
   - Connect your repository or upload the `frontend/` folder
   - Build settings should use the `amplify.yml` file

### Step 7: Configure Domain (If Needed)

The frontend should point to your API. Verify `frontend/js/config.js` has:
```javascript
baseURL: 'https://www.codingeverest.com/api'
```

**Note:** You may need to set up a reverse proxy (Nginx) on EC2 to serve the API at `www.codingeverest.com/api` instead of `34.246.3.141:5000`.

### Step 8: Test Full Stack

1. Open `https://www.codingeverest.com` in browser
2. Open browser console (F12)
3. Test API connection:
   ```javascript
   apiClient.healthCheck().then(console.log)
   ```

## 📝 Database Configuration (Optional - Not Required Yet)

The database connection string in `appsettings.json` has placeholders, but **the API doesn't use a database yet** (controllers return mock data). You can configure this later when you add database functionality.

## 🔧 Troubleshooting

**Backend won't start:**
- Check .NET Runtime is installed: `dotnet --version` on EC2
- Check service status: `sudo systemctl status milo-api`
- Check logs: `sudo journalctl -u milo-api -n 50`

**Can't connect to API:**
- Verify port 5000 is open in security group
- Check service is running: `sudo systemctl status milo-api`
- Test locally on EC2: `curl http://localhost:5000/api/health`

**CORS errors:**
- Verify frontend domain is in CORS allowed origins
- Check browser console for specific error

## 📚 Reference Files

- `EC2_QUICK_START.md` - Quick deployment guide
- `DEPLOY_INSTRUCTIONS.md` - Detailed deployment steps
- `EC2_CONSOLE_COMMANDS.md` - Commands to run on EC2
- `EC2_SETUP.md` - Complete EC2 setup guide

