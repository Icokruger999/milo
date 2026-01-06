# Deployment Instructions

## Frontend Deployment
The frontend automatically deploys via **AWS Amplify** when changes are pushed to the `main` branch on GitHub.

**Status**: ✅ Auto-deployment enabled

## Backend Deployment to EC2

### Option 1: Deploy via SSH/Session Manager (Recommended)

1. Connect to EC2 instance:
   ```bash
   # Via SSH
   ssh ec2-user@34.246.3.141
   
   # Or via AWS Session Manager
   aws ssm start-session --target i-06bc5b2218c041802
   ```

2. Run deployment commands:
   ```bash
   export HOME=/home/ec2-user
   export DOTNET_CLI_HOME=/home/ec2-user/.dotnet
   
   cd ~/milo-repo || git clone https://github.com/Icokruger999/milo.git ~/milo-repo
   cd ~/milo-repo
   git pull origin main
   
   cd backend/Milo.API
   dotnet restore
   dotnet publish -c Release -o /var/www/milo-api
   
   sudo chown -R ec2-user:ec2-user /var/www/milo-api
   sudo systemctl daemon-reload
   sudo systemctl restart milo-api
   
   # Test
   sleep 5
   curl http://localhost:5001/api/health
   ```

### Option 2: Use Deployment Script

1. Connect to EC2 (SSH or Session Manager)

2. Run the deployment script:
   ```bash
   export HOME=/home/ec2-user
   export DOTNET_CLI_HOME=/home/ec2-user/.dotnet
   bash deploy-from-github.sh
   ```

### Option 3: Deploy via AWS Systems Manager (No SSH)

Run this PowerShell command from your local machine:

```powershell
$commands = @(
    'export HOME=/home/ec2-user',
    'export DOTNET_CLI_HOME=/home/ec2-user/.dotnet',
    'cd /home/ec2-user/milo-repo 2>/dev/null || git clone https://github.com/Icokruger999/milo.git /home/ec2-user/milo-repo',
    'cd /home/ec2-user/milo-repo',
    'git pull origin main',
    'cd backend/Milo.API',
    'dotnet restore',
    'dotnet publish -c Release -o /var/www/milo-api',
    'sudo chown -R ec2-user:ec2-user /var/www/milo-api',
    'sudo systemctl daemon-reload',
    'sudo systemctl restart milo-api',
    'sleep 5',
    'curl -s http://localhost:5001/api/health'
)
$json = $commands | ConvertTo-Json -Compress
aws ssm send-command --instance-ids i-06bc5b2218c041802 --document-name "AWS-RunShellScript" --parameters "commands=$json" --output json
```

Then check status:
```powershell
aws ssm get-command-invocation --command-id <COMMAND_ID> --instance-id i-06bc5b2218c041802
```

## Verify Deployment

### Frontend
- Visit: https://www.codingeverest.com
- Check Amplify console for build status

### Backend
- Health check: https://api.codingeverest.com/api/health
- Or: http://34.246.3.141:5001/api/health

## Troubleshooting

### Backend not starting
```bash
# Check service status
sudo systemctl status milo-api

# Check logs
sudo journalctl -u milo-api -f

# Restart service
sudo systemctl restart milo-api
```

### Database connection issues
- Ensure RDS connection string is set in `appsettings.json` on EC2
- Check security groups allow connection from EC2 to RDS

### Port issues
- Ensure port 5001 is open in security groups
- Check if service is listening: `sudo netstat -tlnp | grep 5001`
