# Fix RDS Security Group - Allow EC2 Connection

## The Problem
Connection string is correct, but database connection fails. This is a **security group issue** - RDS isn't allowing connections from EC2.

## Solution - Add EC2 to RDS Security Group

### Option 1: Via AWS Console (Easiest)

1. **Go to AWS Console → RDS → Databases → codingeverest-new**
2. **Click on the VPC security group** (e.g., `sg-0ad7ba434d991a026`)
3. **Click "Edit inbound rules"**
4. **Add rule:**
   - **Type:** PostgreSQL
   - **Port:** 5432
   - **Source:** Custom → Select EC2 security group OR enter `172.31.30.186/32` (EC2 private IP)
5. **Save rules**

### Option 2: Via AWS CLI

Find your EC2 security group ID first:
```bash
aws ec2 describe-instances --instance-ids i-06bc5b2218c041802 --query "Reservations[0].Instances[0].SecurityGroups[0].GroupId" --output text
```

Then add rule to RDS security group (replace `sg-xxxxx` with your EC2 security group ID):
```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-0ad7ba434d991a026 \
  --protocol tcp \
  --port 5432 \
  --source-group sg-xxxxx \
  --region eu-west-1
```

Or allow from EC2 private IP:
```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-0ad7ba434d991a026 \
  --protocol tcp \
  --port 5432 \
  --cidr 172.31.30.186/32 \
  --region eu-west-1
```

## After Fixing Security Group

The database connection should work. Check logs:

```bash
sudo journalctl -u milo-api -n 30 | grep -i "database\|migration\|success"
```

Should see: `"Database migrations applied successfully"`

## Test Login

Go to: `https://www.codingeverest.com/milo-login.html`

Should work now! ✅

