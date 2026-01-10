# Simple Solution for Incidents

## The Problem
The backend DLL on the server has cached/old code that looks for `Incidents` (capital I) instead of `incidents` (lowercase).

## The Simple Solution
**Rename the database table to match what the backend expects:**

```sql
-- Connect to your database and run:
ALTER TABLE incidents RENAME TO "Incidents";
```

This way we don't need to fight with the backend deployment - we just make the database match what the backend is looking for.

## How to Do It

### Option 1: Via SSM (Recommended)
Run this PowerShell command:

```powershell
$command = @"
PGPASSWORD='Stacey1122' psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -U postgres -d MiloDB -c 'ALTER TABLE incidents RENAME TO \"Incidents\";'
"@

aws ssm send-command `
    --document-name "AWS-RunShellScript" `
    --instance-ids i-06bc5b2218c041802 `
    --parameters "commands='$command'" `
    --region eu-west-1
```

### Option 2: Direct SQL
If you have database access:

```sql
ALTER TABLE incidents RENAME TO "Incidents";
```

## After Renaming
1. The backend will immediately work (no restart needed)
2. You can create incidents right away
3. The API will respond properly

## Why This Works
- PostgreSQL treats unquoted names as lowercase
- When we created `incidents`, PostgreSQL stored it as lowercase
- The backend code (Entity Framework) looks for `Incidents` (capital I)
- By renaming with quotes `"Incidents"`, we create a case-sensitive name
- Now both match!

## Test It
After renaming, try:
```
https://api.codingeverest.com/api/incidents
```

Should return an empty array `[]` instead of 500 error.

---

**This is the fastest solution** - no code changes, no deployments, just one SQL command!
