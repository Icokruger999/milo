# Final Fix - Run in Session Manager

## The Issue
500 error on login because RDS connection string has placeholders.

## Solution - Copy/Paste This Entire Block

Open **AWS Console → EC2 → Session Manager** → Connect to `i-06bc5b2218c041802`

Then copy and paste this entire block:

```bash
cd /var/www/milo-api
sudo cp appsettings.json appsettings.json.backup
sudo sed -i 's|Host=.*;|Host=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com;|' appsettings.json
sudo sed -i 's|Username=.*;|Username=postgres;|' appsettings.json
sudo sed -i 's|Password=.*;|Password=Stacey@1122;|' appsettings.json
grep "DefaultConnection" appsettings.json | sed 's/Password=[^;]*/Password=***/'
sudo systemctl restart milo-api
sleep 5
sudo journalctl -u milo-api -n 20 --no-pager | grep -i "database\|migration"
curl http://localhost:5001/api/health
```

## Expected Output

You should see:
- Connection string with `Host=codingeverest-new...` and `Username=postgres`
- "Database migrations applied successfully" (not "Failed to connect")
- `{"status":"ok","message":"Milo API is running"}`

## Then Test Login

Go to: `https://www.codingeverest.com/milo-login.html`

Should work now! ✅

