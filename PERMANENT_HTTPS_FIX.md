# Permanent HTTPS Fix for Milo Backend

This sets up HTTPS for the backend to fix the mixed content issue permanently.

## Quick Setup (3 Steps)

### Step 1: Add DNS Record

In Namecheap (or your DNS provider), add:
- **Type**: A Record
- **Host**: `api`
- **Value**: `34.246.3.141`
- **TTL**: Automatic

This creates: `api.codingeverest.com` → `34.246.3.141`

### Step 2: Wait for DNS Propagation

Wait 5-10 minutes for DNS to propagate. Verify with:
```bash
nslookup api.codingeverest.com
# Should return: 34.246.3.141
```

### Step 3: Run HTTPS Setup Script

**Option A: Via AWS Systems Manager Session Manager**
1. Connect to EC2 via Session Manager
2. Run:
```bash
cd ~/milo
git pull origin main
chmod +x setup-https-complete.sh
./setup-https-complete.sh
```

**Option B: Via SSM from Windows**
```powershell
.\setup-https-backend.ps1
```

Then SSH to EC2 and run:
```bash
sudo certbot --nginx -d api.codingeverest.com --non-interactive --agree-tos --email info@streamyo.com --redirect
```

## What This Does

1. ✅ Installs nginx reverse proxy
2. ✅ Configures nginx to proxy requests to backend on port 5001
3. ✅ Gets SSL certificate from Let's Encrypt (free)
4. ✅ Configures automatic HTTPS redirect
5. ✅ Updates frontend config to use HTTPS API

## After Setup

The backend will be available at:
- **HTTPS**: `https://api.codingeverest.com/api`
- **HTTP**: Automatically redirects to HTTPS

Frontend config is already updated to use this URL.

## Verify It Works

```bash
# Test HTTPS endpoint
curl https://api.codingeverest.com/api/health

# Should return: {"status":"ok","message":"Milo API is running"}
```

## Troubleshooting

**If certbot fails:**
- Check DNS is configured: `nslookup api.codingeverest.com`
- Wait longer for DNS propagation (up to 24 hours)
- Make sure port 80 is open in security group

**If nginx fails:**
- Check config: `sudo nginx -t`
- Check logs: `sudo tail -f /var/log/nginx/error.log`

## Security Groups

Make sure these ports are open:
- Port 80 (HTTP - for Let's Encrypt verification)
- Port 443 (HTTPS - for API access)
- Port 5001 (Internal - backend, not needed externally)

## Benefits

✅ No more mixed content errors
✅ Secure HTTPS connection
✅ Professional subdomain (api.codingeverest.com)
✅ Automatic SSL certificate renewal
✅ Works with HTTPS frontend

