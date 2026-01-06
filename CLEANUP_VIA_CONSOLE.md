# Clean Up Old Code via AWS Console (No SSH Required)

## Option 1: AWS Systems Manager Session Manager (Easiest)

1. **Open AWS Console:**
   - Go to: https://console.aws.amazon.com/ec2
   - Select your instance: `i-06bc5b2218c041802`

2. **Connect via Session Manager:**
   - Click "Connect" button
   - Select "Session Manager" tab
   - Click "Connect"
   - A browser-based terminal will open

3. **Run these cleanup commands:**

```bash
# Stop all services
sudo systemctl list-units --type=service --all | grep -E '(api|app|backend|web)' | awk '{print $1}' | xargs -r sudo systemctl stop 2>/dev/null || true

# Remove service files
sudo rm -f /etc/systemd/system/*api*.service
sudo rm -f /etc/systemd/system/*app*.service
sudo rm -f /etc/systemd/system/*backend*.service
sudo rm -f /etc/systemd/system/*web*.service

# Show what's in /var/www
echo "Current /var/www contents:"
ls -la /var/www 2>/dev/null || echo "Directory does not exist"

# Clean /var/www (preserve milo-api)
if [ -d /var/www ]; then
    cd /var/www
    for dir in */; do
        if [ -d "$dir" ] && [ "${dir%/}" != "milo-api" ]; then
            echo "Removing ${dir%/}..."
            sudo rm -rf "${dir%/}"
        fi
    done
fi

# Clean /opt
sudo rm -rf /opt/*api* /opt/*app* /opt/*backend* 2>/dev/null || true

# Clean home directory
cd ~
sudo rm -rf *api* *app* *backend* 2>/dev/null || true

# Reload systemd
sudo systemctl daemon-reload

# Verify cleanup
echo ""
echo "Final state:"
ls -la /var/www 2>/dev/null || echo "/var/www does not exist"
echo ""
echo "Remaining services:"
systemctl list-units --type=service --all | grep -E '(api|app|backend|web)' || echo "No matching services found"
```

## Option 2: Quick One-Liner Cleanup

If you just want to remove everything quickly:

```bash
sudo systemctl list-units --type=service --all | grep -E '(api|app|backend|web)' | awk '{print $1}' | xargs -r sudo systemctl stop && sudo rm -f /etc/systemd/system/*api*.service /etc/systemd/system/*app*.service /etc/systemd/system/*backend*.service && sudo rm -rf /var/www/*api* /var/www/*app* /var/www/*backend* 2>/dev/null && sudo systemctl daemon-reload && echo "Cleanup complete!"
```

## After Cleanup

Once cleanup is done, deploy the new Milo backend from your Windows machine:

```powershell
.\deploy-to-ec2-ssm.ps1
```

## Verify Cleanup

Check what's left:

```bash
# Check directories
ls -la /var/www
ls -la /opt

# Check services
sudo systemctl list-units --type=service --all | grep -E '(api|app|backend|web)'

# Check home directory
ls -la ~ | grep -E '(api|app|backend)'
```

