# Verify Milo API is Running

Port 5000 is in use because the API is already running! Let's verify it's working:

## Step 1: Check Service Status

```bash
sudo systemctl status milo-api
```

Should show "active (running)".

## Step 2: Test the API

```bash
curl http://localhost:5000/api/health
```

Should return: `{"status":"ok","message":"Milo API is running"}`

## Step 3: Test Login Endpoint

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"info@streamyo.com","password":"Stacey@1122"}'
```

Should return a token if working.

## Step 4: Test from External IP

From your Windows machine or browser:
```
http://34.246.3.141:5000/api/health
```

## If Service Shows as Failed

If the service status shows "failed" but port is in use, something else might be using it:

```bash
# Check what's using port 5000
sudo netstat -tlnp | grep 5000
sudo lsof -i :5000
```

## Restart Service (if needed)

If you need to restart:
```bash
sudo systemctl restart milo-api
sudo systemctl status milo-api
```

## Check Logs

```bash
sudo journalctl -u milo-api -n 50 --no-pager
```

