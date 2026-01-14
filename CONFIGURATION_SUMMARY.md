# Current Production Configuration Summary

## ✅ Verified Configuration (Per DEPLOYMENT_RULES.md)

### Backend API
- **Port**: 8080 (FIXED - Docker recommended)
- **Service File**: `/etc/systemd/system/milo-backend.service`
- **Command**: `dotnet Milo.API.dll --urls http://localhost:8080`
- **Working Directory**: `/home/ec2-user/milo-backend-publish`
- **Status**: Should be running

### Database
- **PostgreSQL**: Port 5432 (Docker container `milo_postgres`)
- **PgBouncer**: Port 6432 (Docker container `milo_pgbouncer`)
- **Connection String**: `Host=localhost;Port=6432;Database=milo;Username=postgres`
- **Password**: Not required (trust authentication for localhost)

### Nginx Configuration
- **HTTP Config**: `/etc/nginx/conf.d/00-summit-api.conf`
  - Proxies to: `http://localhost:8080`
- **HTTPS Config**: `/etc/nginx/conf.d/milo-api.conf`
  - Proxies to: `http://localhost:8080`
  - SSL: `/etc/letsencrypt/live/api.codingeverest.com/`

### Frontend
- **Production URL**: `https://www.codingeverest.com`
- **API Endpoint**: `https://api.codingeverest.com/api`
- **Local Development**: `http://localhost:8080/api` (fallback)

## 🔍 Quick Status Check Commands

### Check Backend Service
```bash
sudo systemctl status milo-backend.service
```

### Check if API is Running
```bash
curl http://localhost:8080/api/health
```

### Check Port Usage
```bash
sudo netstat -tlnp | grep 8080
```

### Check Nginx
```bash
sudo systemctl status nginx
sudo nginx -t
```

### Test via Nginx
```bash
curl -k https://api.codingeverest.com/api/health
```

## 🚨 If Backend is Not Running

1. **Check if DLL exists**:
   ```bash
   ls -la /home/ec2-user/milo-backend-publish/Milo.API.dll
   ```

2. **If DLL missing, deploy from GitHub**:
   ```bash
   cd /home/ec2-user
   git clone https://github.com/Icokruger999/milo.git temp-repo
   cd temp-repo/backend/Milo.API
   dotnet publish --configuration Release --output ./publish
   cp -r ./publish/* /home/ec2-user/milo-backend-publish/
   rm -rf /home/ec2-user/temp-repo
   ```

3. **Start the service**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl start milo-backend.service
   sudo systemctl status milo-backend.service
   ```

4. **Check error logs**:
   ```bash
   sudo tail -n 50 /home/ec2-user/milo-backend-error.log
   ```

## 📝 Configuration Files

All configuration files should match these settings:

- ✅ `backend/Milo.API/Services/milo-backend.service` → Port 8080
- ✅ `docker-compose.yml` → PostgreSQL 5432, PgBouncer 6432
- ✅ `frontend/js/config.js` → Production: `https://api.codingeverest.com/api`
- ✅ Nginx configs → Proxy to `localhost:8080`
