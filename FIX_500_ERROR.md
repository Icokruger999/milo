# Fix 500 Internal Server Error on Login

## The Problem
- Login endpoint returns 500 error
- Error message: "An exception has been raised that is likely due to a transient failure"
- This is a **database connection error** - RDS password not configured

## Solution: Update RDS Password on EC2

The `appsettings.json` on EC2 still has placeholders. Update it with the actual RDS password.

### Step 1: Update appsettings.json on EC2

Run this in **Session Manager**:

```bash
cd /var/www/milo-api
sudo cp appsettings.json appsettings.json.backup
```

Then update the password (replace `YOUR_ACTUAL_PASSWORD` with your RDS password):

```bash
sudo sed -i 's/Password=.*;/Password=YOUR_ACTUAL_PASSWORD;/' appsettings.json
sudo sed -i 's/Username=.*;/Username=postgres;/' appsettings.json
```

Verify the change:
```bash
grep "DefaultConnection" appsettings.json | sed 's/Password=[^;]*/Password=***/'
```

Should show: `Host=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com;Database=MiloDB;Username=postgres;Password=***;Port=5432`

### Step 2: Restart Backend

```bash
sudo systemctl restart milo-api
sleep 5
sudo systemctl status milo-api
```

### Step 3: Check Logs

```bash
sudo journalctl -u milo-api -n 30
```

Look for:
- ✅ "Database migrations applied successfully" - Good!
- ❌ "Database migration failed" or connection errors - Check password

### Step 4: Test Login

Try logging in again at: `https://www.codingeverest.com/milo-login.html`

## If You Don't Know the RDS Password

1. **Check AWS RDS Console:**
   - Go to RDS → Databases → codingeverest-new
   - You can't view the password, but you can reset it

2. **Reset RDS Password:**
   - RDS Console → Modify → Change master password
   - Set new password
   - Update appsettings.json with new password
   - Restart service

## Quick One-Liner (if you have the password)

Replace `YOUR_PASSWORD` with actual password:

```bash
cd /var/www/milo-api && sudo sed -i 's/Password=.*;/Password=YOUR_PASSWORD;/' appsettings.json && sudo sed -i 's/Username=.*;/Username=postgres;/' appsettings.json && sudo systemctl restart milo-api && sleep 5 && curl http://localhost:5001/api/health
```

