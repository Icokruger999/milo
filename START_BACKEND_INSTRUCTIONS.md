# Start Backend Service on EC2

## Quick Start

### Option 1: Via SSH (Recommended)

1. **SSH into EC2:**
   ```bash
   ssh -i your-key.pem ec2-user@34.246.3.141
   ```

2. **Run the start script:**
   ```bash
   # Upload start-backend.sh to EC2 first, or run commands directly:
   
   sudo systemctl start milo-api.service
   sudo systemctl enable milo-api.service
   sudo systemctl status milo-api.service
   ```

3. **Test the backend:**
   ```bash
   curl http://localhost:5001/api/health
   ```

### Option 2: Manual Commands

If the service name is different, find it first:

```bash
# List all services
systemctl list-unit-files | grep -i milo
systemctl list-unit-files | grep -i api

# Start the service (replace with actual name)
sudo systemctl start milo-api.service
# or
sudo systemctl start milo-backend.service
# or whatever the service name is

# Enable on boot
sudo systemctl enable milo-api.service

# Check status
sudo systemctl status milo-api.service
```

### Option 3: Check if Backend is Running on Different Port

```bash
# Check what's listening on ports
sudo netstat -tlnp | grep LISTEN
# or
sudo ss -tlnp

# Look for port 5001 or any .NET process
ps aux | grep dotnet
```

## Troubleshooting

### Service Not Found
If `milo-api.service` doesn't exist, the backend may not be deployed yet. Deploy it first using the deployment scripts.

### Service Keeps Crashing
Check logs:
```bash
sudo journalctl -u milo-api.service -n 50
sudo journalctl -u milo-api.service --since "10 minutes ago" | grep -i error
```

### Port Already in Use
If port 5001 is in use by another process:
```bash
# Find what's using port 5001
sudo lsof -i :5001
# or
sudo netstat -tlnp | grep 5001

# Kill the process if needed
sudo kill -9 <PID>
```

### Database Connection Issues
If backend starts but can't connect to database:
```bash
# Check database connection string in appsettings.json
cat /home/ec2-user/milo/backend/Milo.API/appsettings.json | grep ConnectionString
```

## Verify It's Working

After starting the service:

1. **Test locally on EC2:**
   ```bash
   curl http://localhost:5001/api/health
   ```

2. **Test from outside:**
   ```bash
   curl http://api.codingeverest.com/api/health
   ```

3. **Try login:**
   Go to: https://www.codingeverest.com/milo-login.html

## Expected Response

The `/api/health` endpoint should return:
```json
{"status":"healthy"}
```

Or if it's a different endpoint, you should get a 200 OK response.

