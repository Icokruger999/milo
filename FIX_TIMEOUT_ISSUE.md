# Fix Service Timeout Issue

## The Problem
Service times out during database initialization because it's blocking startup.

## Solution Applied
Updated `Program.cs` to make database initialization non-blocking (runs in background).

## Deploy the Fix

Run these commands in Session Manager:

```bash
cd /home/ec2-user/milo-repo
git pull origin main
cd backend/Milo.API
export HOME=/home/ec2-user
export DOTNET_CLI_HOME=/home/ec2-user/.dotnet
dotnet restore
dotnet publish -c Release -o /var/www/milo-api
sudo chown -R ec2-user:ec2-user /var/www/milo-api
sudo systemctl restart milo-api
sleep 5
sudo systemctl status milo-api
```

## Also Check RDS Security Group

The RDS security group must allow connections from EC2:

1. Go to AWS Console → RDS → Databases → codingeverest-new
2. Click on the VPC security group
3. Inbound rules should allow:
   - Type: PostgreSQL
   - Port: 5432
   - Source: EC2 security group ID OR 172.31.30.186/32 (EC2 private IP)

## After Deploy

The service should start without timeout, and database migrations will run in the background.

