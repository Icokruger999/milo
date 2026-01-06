# Fix Git Ownership Issue on EC2

## Problem
Git error: `fatal: detected dubious ownership in repository at '/home/ec2-user/milo-repo'`

This happens when the repository was cloned by a different user (e.g., root via SSM) and now ec2-user is trying to access it.

## Solution

Run these commands on EC2:

```bash
# Fix ownership
sudo chown -R ec2-user:ec2-user /home/ec2-user/milo-repo

# Add safe directory exception
git config --global --add safe.directory /home/ec2-user/milo-repo

# Now you can pull
cd ~/milo-repo
git pull origin main
```

## Alternative: Re-clone as ec2-user

If the above doesn't work, remove and re-clone:

```bash
cd ~
rm -rf milo-repo
git clone https://github.com/Icokruger999/milo.git milo-repo
cd milo-repo
```

## Complete Deployment Command

After fixing ownership, run the full deployment:

```bash
export HOME=/home/ec2-user
export DOTNET_CLI_HOME=/home/ec2-user/.dotnet
cd ~/milo-repo
git pull origin main
cd backend/Milo.API
dotnet restore
dotnet publish -c Release -o /var/www/milo-api
sudo chown -R ec2-user:ec2-user /var/www/milo-api
sudo systemctl daemon-reload
sudo systemctl restart milo-api
sleep 3
curl -s http://localhost:5001/api/health
```

