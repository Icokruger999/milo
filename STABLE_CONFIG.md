# Stable Production Configuration - DO NOT CHANGE

## API Endpoint Configuration

**PERMANENT SETTING:** The frontend uses `http://34.246.3.141:5001/api` for production.

This is configured in `frontend/js/config.js` and should NOT be changed unless:
1. EC2 IP changes (unlikely)
2. Backend moves to a different server
3. HTTPS is properly configured with valid SSL certificate

## Backend Configuration

- **Port:** 5001 (DO NOT CHANGE)
- **IP:** 34.246.3.141 (EC2 Public IP)
- **Service:** milo-api (systemd)
- **Location:** /var/www/milo-api

## Deployment Process

1. **Code changes:** Push to GitHub
2. **Backend deployment:** Run deployment script or manual via Session Manager
3. **Frontend deployment:** Automatic via Amplify (on git push)

**DO NOT modify `frontend/js/config.js` unless absolutely necessary.**

## If Backend Stops Working

1. Check service: `sudo systemctl status milo-api`
2. Check logs: `sudo journalctl -u milo-api -n 50`
3. Restart: `sudo systemctl restart milo-api`
4. Verify: `curl http://34.246.3.141:5001/api/health`

**DO NOT change the API endpoint in config.js as a "fix" - fix the backend instead.**

