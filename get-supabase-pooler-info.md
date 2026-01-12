# Get Supabase Connection Pooler Information

## The Problem
- Supabase direct connection (`db.ffrtlelsqhnxjfwwnazf.supabase.co`) only has IPv6
- EC2 instance cannot reach IPv6 addresses
- We need to use Supabase's connection pooler which has IPv4 support

## Solution: Get Pooler Connection String from Supabase Dashboard

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/ffrtlelsqhnxjfwwnazf
2. Navigate to: **Settings** → **Database** → **Connection Pooling**
3. Copy the **Session Mode** connection string (port 5432)
4. It should look like:
   ```
   postgresql://postgres.ffrtlelsqhnxjfwwnazf:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```
5. Extract the hostname (e.g., `aws-0-us-east-1.pooler.supabase.com`)
6. Update `appsettings.json` with:
   ```
   Host=aws-0-us-east-1.pooler.supabase.com;Database=milo;Username=postgres.ffrtlelsqhnxjfwwnazf;Password=FlVT6=Lps0E!l5cg;Port=5432;SSL Mode=Require
   ```

## Alternative: Enable IPv6 on EC2

If you prefer to use the direct connection, you can enable IPv6 on your EC2 instance:
1. Go to AWS Console → EC2 → Your Instance
2. Enable IPv6 on the VPC/subnet
3. Assign an IPv6 address to the instance
4. Update security groups to allow IPv6 traffic
