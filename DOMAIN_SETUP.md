# Domain Setup for www.codingeverest.com

This document outlines the domain configuration for the Milo application hosted at `www.codingeverest.com`.

## Domain Configuration

The application is configured to work with:
- `https://www.codingeverest.com` (Primary - HTTPS with www)
- `https://codingeverest.com` (HTTPS without www)
- `http://www.codingeverest.com` (HTTP with www)
- `http://codingeverest.com` (HTTP without www)

## Namecheap DNS Configuration

### For AWS Amplify Hosting

1. **Get Amplify Domain**:
   - After deploying to Amplify, you'll get a domain like: `xxxxx.amplifyapp.com`
   - Note this domain for DNS configuration

2. **Configure DNS in Namecheap**:
   - Log into Namecheap account
   - Go to Domain List → Manage → Advanced DNS
   - Add/Update the following records:

   **For www subdomain:**
   ```
   Type: CNAME Record
   Host: www
   Value: xxxxx.amplifyapp.com
   TTL: Automatic
   ```

   **For root domain (apex):**
   ```
   Type: ALIAS Record (or A Record if ALIAS not available)
   Host: @
   Value: xxxxx.amplifyapp.com (or Amplify IP if using A record)
   TTL: Automatic
   ```

   **Note**: If Namecheap doesn't support ALIAS, you may need to:
   - Use A records pointing to Amplify's IP addresses (contact AWS support)
   - Or use a service like Cloudflare (free) which supports CNAME flattening

3. **SSL Certificate**:
   - AWS Amplify automatically provisions SSL certificates via AWS Certificate Manager
   - This works for both www and non-www versions
   - Certificate is automatically renewed

## Backend API Configuration

The backend API CORS is configured to accept requests from:
- `https://www.codingeverest.com`
- `https://codingeverest.com`
- `http://www.codingeverest.com`
- `http://codingeverest.com`
- `http://localhost:3000` (for local development)

## Frontend Configuration

The frontend automatically detects the domain and configures API endpoints:
- Production: `https://www.codingeverest.com/api`
- Local: `http://localhost:5000/api`

## Verification Steps

1. **Check DNS Propagation**:
   ```bash
   # Check www subdomain
   nslookup www.codingeverest.com
   
   # Check root domain
   nslookup codingeverest.com
   ```

2. **Test HTTPS**:
   - Visit `https://www.codingeverest.com`
   - Verify SSL certificate is valid
   - Check browser console for any CORS errors

3. **Test API Connection**:
   - Open browser console on the landing page
   - Check if API calls are working
   - Verify CORS headers are correct

## Troubleshooting

### Issue: Domain not resolving
- **Solution**: Wait 24-48 hours for DNS propagation
- Check DNS records in Namecheap are correct
- Verify Amplify domain is correct

### Issue: SSL Certificate errors
- **Solution**: Ensure DNS is properly configured before SSL provisioning
- Check Amplify console for certificate status
- May take up to 24 hours for certificate to be issued

### Issue: CORS errors
- **Solution**: Verify backend CORS configuration includes all domain variations
- Check `backend/Milo.API/Program.cs` and `appsettings.json`
- Ensure backend is running and accessible

### Issue: www vs non-www redirect
- **Solution**: Configure redirect in Amplify Console:
  - Go to App Settings → Domain Management
  - Set up redirect from non-www to www (or vice versa)
  - Or configure in Namecheap to redirect at DNS level

## Environment Variables

Set these in AWS Amplify Console (App Settings → Environment Variables):
- `API_BASE_URL`: `https://www.codingeverest.com/api` (or your EC2 API endpoint)
- `DOMAIN`: `www.codingeverest.com`

