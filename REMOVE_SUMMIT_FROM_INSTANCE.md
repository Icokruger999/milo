# Remove Summit from Instance i-06bc5b2218c041802

## ⚠️ CRITICAL: Instance i-06bc5b2218c041802 is MILO ONLY

Instance i-06bc5b2218c041802 should ONLY run Milo. Summit is a separate product and must NOT be on this instance.

---

## Action Items

### 1. Remove Summit Nginx Configuration
**File to DELETE**: `/etc/nginx/conf.d/00-summit-api.conf`

```bash
sudo rm /etc/nginx/conf.d/00-summit-api.conf
```

**Verify deletion**:
```bash
ls -la /etc/nginx/conf.d/
```

Should only show:
- `milo-api.conf` (HTTPS - Milo only)
- Other system nginx configs

### 2. Reload Nginx
After removing the Summit config file:

```bash
sudo systemctl reload nginx
```

**Verify nginx is still running**:
```bash
sudo systemctl status nginx
```

### 3. Verify Milo API Still Works
Test that Milo API is still accessible:

```bash
curl https://api.codingeverest.com/api/projects
```

Should return project data (not 404 or error).

### 4. Check for Summit Processes
Verify no Summit processes are running:

```bash
ps aux | grep -i summit
```

Should return no results (or only the grep command itself).

### 5. Check for Summit Files
Verify no Summit files exist in the home directory:

```bash
find /home/ec2-user -name "*summit*" -type f 2>/dev/null
```

Should return no results.

---

## Verification Checklist

After cleanup, verify:

- [ ] `/etc/nginx/conf.d/00-summit-api.conf` is deleted
- [ ] Nginx reloaded successfully
- [ ] Milo API responding at `https://api.codingeverest.com/api/projects`
- [ ] No Summit processes running
- [ ] No Summit files in `/home/ec2-user`
- [ ] Backend service still running: `sudo systemctl status milo-backend`
- [ ] Database still accessible: `psql -h localhost -p 6432 -U postgres -d milo -c "SELECT 1"`

---

## Why This Matters

**Instance i-06bc5b2218c041802** is dedicated to Milo only:
- Milo Backend API (port 8080)
- PostgreSQL Database (port 5432)
- PgBouncer Connection Pool (port 6432)
- Nginx Proxy (HTTPS only)

**Summit** is a separate product that should run on a different instance with its own infrastructure.

---

## Golden Rule

**INSTANCE i-06bc5b2218c041802 = MILO ONLY**

No other applications should be running on this instance.

---

## Commands Summary

```bash
# Remove Summit nginx config
sudo rm /etc/nginx/conf.d/00-summit-api.conf

# Reload nginx
sudo systemctl reload nginx

# Verify nginx status
sudo systemctl status nginx

# Test Milo API
curl https://api.codingeverest.com/api/projects

# Check for Summit processes
ps aux | grep -i summit

# Check for Summit files
find /home/ec2-user -name "*summit*" -type f 2>/dev/null

# Verify backend is running
sudo systemctl status milo-backend

# Verify database is accessible
psql -h localhost -p 6432 -U postgres -d milo -c "SELECT 1"
```

---

## Status

**Action Required**: YES - Remove Summit nginx config if it exists

**Priority**: HIGH - Ensure instance is Milo-only

**Date**: January 17, 2026
