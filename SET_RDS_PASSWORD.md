# Set RDS Password - Final Step

## Status
✅ Host updated: `codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com`
✅ Username updated: `postgres`
❌ **Password still needs to be set**

## Run This in Session Manager

Replace `YOUR_RDS_PASSWORD` with your actual RDS database password:

```bash
cd /var/www/milo-api
sudo sed -i 's/Password=.*;/Password=YOUR_RDS_PASSWORD;/' appsettings.json
sudo systemctl restart milo-api
sleep 5
```

## Verify

```bash
# Check logs for database connection
sudo journalctl -u milo-api -n 20 | grep -i "database\|migration"

# Should see: "Database migrations applied successfully"
# NOT: "Failed to connect" or "Connection refused"
```

## Test Login

After password is set and service restarted:
- Go to: `https://www.codingeverest.com/milo-login.html`
- Try logging in
- Should work now!

## If You Don't Know the Password

1. **Check AWS RDS Console:**
   - RDS → Databases → codingeverest-new
   - You can't view it, but you can reset it

2. **Reset Password:**
   - Modify database → Change master password
   - Set new password
   - Update appsettings.json with new password
   - Restart service

