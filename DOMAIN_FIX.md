# Fix ERR_CONNECTION_TIMED_OUT

## Issue
The custom domain `www.codingeverest.com` is not configured in AWS Amplify, causing connection timeouts.

## Quick Fix - Use Default Amplify Domain

**Your site is live at:**
```
https://ddp21ao3xntn4.amplifyapp.com
```

Try accessing this URL directly - it should work immediately.

## Configure Custom Domain (www.codingeverest.com)

### Option 1: AWS Console (Recommended)

1. **Go to AWS Amplify Console:**
   - https://console.aws.amazon.com/amplify
   - Click on your app: `milo`

2. **Add Custom Domain:**
   - Click "Domain Management" in the left sidebar
   - Click "Add domain"
   - Enter: `codingeverest.com`
   - Click "Configure domain"

3. **Configure DNS in Namecheap:**
   - Amplify will show you DNS records to add
   - Go to Namecheap → Domain List → Manage → Advanced DNS
   - Add the CNAME record shown by Amplify:
     ```
     Type: CNAME
     Host: www
     Value: ddp21ao3xntn4.amplifyapp.com
     TTL: Automatic
     ```

4. **Wait for SSL Certificate:**
   - Amplify will automatically provision SSL certificate
   - This can take 15-60 minutes
   - You'll see status in Amplify Console

### Option 2: AWS CLI

```powershell
# Create domain association
aws amplify create-domain-association `
  --app-id ddp21ao3xntn4 `
  --domain-name codingeverest.com `
  --sub-domain-settings prefix=www,branchName=main

# Check status
aws amplify get-domain-association `
  --app-id ddp21ao3xntn4 `
  --domain-name codingeverest.com
```

## Verify DNS Configuration

After adding DNS records in Namecheap, verify:

```powershell
# Check DNS resolution
nslookup www.codingeverest.com

# Should show: ddp21ao3xntn4.amplifyapp.com
```

## Current Status

✅ **Deployment:** Successful (Job #5 completed)
✅ **Default Domain:** `ddp21ao3xntn4.amplifyapp.com` (should work)
❌ **Custom Domain:** Not configured yet

## Next Steps

1. **Immediate:** Use `https://ddp21ao3xntn4.amplifyapp.com` to access your site
2. **Configure:** Add custom domain in Amplify Console
3. **Wait:** 15-60 minutes for DNS/SSL to propagate
4. **Test:** Visit `https://www.codingeverest.com`

## Troubleshooting

**If default domain also times out:**
- Check Amplify app status in console
- Verify build completed successfully
- Check AWS region (should be eu-west-1 based on your setup)

**If DNS not resolving:**
- Wait 24-48 hours for full DNS propagation
- Verify CNAME record in Namecheap is correct
- Check TTL settings (use Automatic)

