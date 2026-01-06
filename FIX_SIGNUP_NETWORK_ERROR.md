# Fix Signup Network Error

The frontend can't connect to the backend. Check these:

## Step 1: Verify Backend is Running on Port 5001

On EC2, run:
```bash
# Check if service is running
sudo systemctl status milo-api

# Check if port 5001 is listening
sudo netstat -tlnp | grep 5001

# Test locally on EC2
curl http://localhost:5001/api/health
```

## Step 2: Verify Service is Configured for Port 5001

```bash
# Check service configuration
cat /etc/systemd/system/milo-api.service | grep ASPNETCORE_URLS

# Should show: Environment=ASPNETCORE_URLS=http://0.0.0.0:5001
# If it shows 5000, update it:
sudo nano /etc/systemd/system/milo-api.service
# Change to: Environment=ASPNETCORE_URLS=http://0.0.0.0:5001
sudo systemctl daemon-reload
sudo systemctl restart milo-api
```

## Step 3: Open Port 5001 in Security Group

From Windows PowerShell:
```powershell
.\add-port-5001.ps1
```

Or manually:
```powershell
aws ec2 authorize-security-group-ingress `
  --group-id sg-0eb3b878979ad2355 `
  --protocol tcp `
  --port 5001 `
  --cidr 0.0.0.0/0 `
  --description "Milo API Backend"
```

## Step 4: Fix Mixed Content Issue (HTTPS → HTTP)

If frontend is on HTTPS (`www.codingeverest.com`) and backend is HTTP, browsers block it.

**Option A: Use HTTPS for backend** (recommended)
- Set up SSL certificate on EC2
- Use nginx reverse proxy with Let's Encrypt

**Option B: Use domain name instead of IP**
- Update DNS to point `api.codingeverest.com` to EC2 IP
- Use `https://api.codingeverest.com:5001` (if HTTPS) or `http://api.codingeverest.com:5001`

**Option C: Test from HTTP frontend first**
- Access frontend via HTTP to test: `http://www.codingeverest.com`
- This allows HTTP backend connections

## Step 5: Test Backend from Browser

Try accessing directly:
```
http://34.246.3.141:5001/api/health
```

If this works in browser but not from frontend, it's likely a CORS or mixed content issue.

## Step 6: Check CORS Configuration

Make sure backend `Program.cs` allows the frontend domain:
```csharp
var allowedOrigins = new[]
{
    "https://www.codingeverest.com",
    "https://codingeverest.com",
    "http://www.codingeverest.com",
    "http://codingeverest.com"
};
```

## Quick Test Commands

```bash
# On EC2 - test backend
curl http://localhost:5001/api/health
curl http://localhost:5001/api/auth/signup -X POST -H "Content-Type: application/json" -d '{"name":"Test","email":"test@test.com","password":"test123"}'

# From Windows - test if port is accessible
curl http://34.246.3.141:5001/api/health
```

