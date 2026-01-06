# EC2 Cleanup Instructions

## Important: Where to Run Scripts

### Option 1: Run from Your Windows Machine (PowerShell)

The `.ps1` scripts are designed to run on your **local Windows machine** using PowerShell. They will automatically connect to EC2 and clean up.

**On your Windows machine:**
```powershell
# Quick cleanup (recommended)
.\quick-cleanup-ec2.ps1

# Or interactive cleanup
.\cleanup-ec2.ps1
```

These scripts will:
- Connect to EC2 via SSH
- Execute cleanup commands remotely
- Show you progress and results

### Option 2: Run Directly on EC2 (Bash Script)

If you're already SSH'd into the EC2 instance, use the bash script instead.

**On EC2 instance:**
```bash
# First, copy the script to EC2 (from your Windows machine)
scp -i your-key.pem cleanup-ec2.sh ec2-user@34.246.3.141:~/

# Then SSH into EC2
ssh -i your-key.pem ec2-user@34.246.3.141

# Run the cleanup script
sudo bash cleanup-ec2.sh
```

## Quick Manual Cleanup (If Scripts Don't Work)

If you prefer to clean up manually, SSH into EC2 and run:

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@34.246.3.141

# Stop all services
sudo systemctl list-units --type=service --all | grep -E '(api|app|backend|web)' | awk '{print $1}' | xargs -r sudo systemctl stop

# Remove service files
sudo rm -f /etc/systemd/system/*api*.service
sudo rm -f /etc/systemd/system/*app*.service
sudo rm -f /etc/systemd/system/*backend*.service

# Clean /var/www (keep milo-api)
cd /var/www
sudo rm -rf *api* *app* *backend* 2>/dev/null || true
# Or remove specific directories:
# sudo rm -rf old-app-name

# Reload systemd
sudo systemctl daemon-reload
```

## What Gets Cleaned

- ✅ All directories in `/var/www` (except `milo-api`)
- ✅ All systemd service files for api/app/backend/web
- ✅ Running services are stopped
- ✅ `/opt` directory cleaned if needed

## After Cleanup

Once cleanup is complete, deploy the new Milo backend:

**From your Windows machine:**
```powershell
.\deploy-to-ec2.ps1
```

This will build and deploy the new Milo API to your clean EC2 instance.

