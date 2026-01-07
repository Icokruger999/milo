# Fix RDS Connection to EC2 Instance

## Problem
RDS database is not accepting connections from EC2 instance "codingeverest"

## Solution: Update RDS Security Group

### Step 1: Find your EC2 Security Group ID

Run this in PowerShell on your local machine:

```powershell
# Get EC2 security group
aws ec2 describe-instances --instance-ids i-06bc5b2218c041802 --region eu-west-1 --query 'Reservations[0].Instances[0].SecurityGroups[*].[GroupId,GroupName]' --output table
```

Note the Security Group ID (starts with `sg-`)

### Step 2: Find your RDS Security Group

```powershell
# Get RDS instance details
aws rds describe-db-instances --db-instance-identifier codingeverest-new --region eu-west-1 --query 'DBInstances[0].VpcSecurityGroups[*].[VpcSecurityGroupId,Status]' --output table
```

Note the RDS Security Group ID

### Step 3: Add Inbound Rule to RDS Security Group

Replace `<RDS-SG-ID>` with your RDS security group ID and `<EC2-SG-ID>` with your EC2 security group ID:

```powershell
# Add rule to allow PostgreSQL from EC2 security group
aws ec2 authorize-security-group-ingress `
    --group-id <RDS-SG-ID> `
    --protocol tcp `
    --port 5432 `
    --source-group <EC2-SG-ID> `
    --region eu-west-1
```

**OR** if you want to allow from the specific EC2 IP:

```powershell
# Add rule to allow PostgreSQL from EC2 IP
aws ec2 authorize-security-group-ingress `
    --group-id <RDS-SG-ID> `
    --protocol tcp `
    --port 5432 `
    --cidr 34.246.3.141/32 `
    --region eu-west-1
```

### Step 4: Verify Connection from EC2

In your EC2 console, test the connection:

```bash
# Test RDS connection
nc -zv codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com 5432
```

You should see: `Connection to codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com 5432 port [tcp/postgresql] succeeded!`

### Step 5: Restart Backend Service

Once connection works, restart the service:

```bash
sudo systemctl restart milo-api
sleep 5
sudo systemctl status milo-api
```

## Alternative: Use AWS Console

If you prefer using the AWS Console:

1. Go to **RDS Console** → **Databases** → **codingeverest-new**
2. Click on the **VPC security group** link
3. Click **Edit inbound rules**
4. Click **Add rule**
5. Set:
   - **Type**: PostgreSQL
   - **Port**: 5432
   - **Source**: Custom → Select your EC2 security group OR enter `34.246.3.141/32`
6. Click **Save rules**

## Troubleshooting

If it still doesn't work:

```bash
# On EC2, check if port is reachable
telnet codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com 5432

# Check RDS status
aws rds describe-db-instances --db-instance-identifier codingeverest-new --region eu-west-1 --query 'DBInstances[0].DBInstanceStatus'
```

## Expected Result

After fixing the security group, your backend logs should show:

```
Database migrations applied successfully.
```

Instead of:

```
Failed to connect to [...] Connection refused
```

