# DNS Configuration for codingeverest.com

## ✅ Domain Association Created

The custom domain has been configured in AWS Amplify. Now you need to add DNS records in Namecheap.

## DNS Records to Add in Namecheap

### Step 1: Log into Namecheap
1. Go to https://www.namecheap.com
2. Log into your account
3. Go to **Domain List** → Click **Manage** next to `codingeverest.com`
4. Click on **Advanced DNS** tab

### Step 2: Add CNAME Record for www

**Add this CNAME record:**

```
Type: CNAME Record
Host: www
Value: d18moh9jxwpfve.cloudfront.net
TTL: Automatic (or 30 min)
```

**How to add:**
1. Click **Add New Record**
2. Select **CNAME Record**
3. In **Host** field, enter: `www`
4. In **Value** field, enter: `d18moh9jxwpfve.cloudfront.net`
5. TTL: Leave as **Automatic** or select **30 min**
6. Click the **Save** icon (checkmark)

### Step 3: Wait for DNS Propagation

- DNS changes can take **15 minutes to 48 hours** to propagate
- Usually takes **15-30 minutes** for most users
- You can check propagation status at: https://www.whatsmydns.net/#CNAME/www.codingeverest.com

### Step 4: SSL Certificate

- AWS Amplify will automatically provision an SSL certificate
- This happens automatically after DNS is configured
- Can take **15-60 minutes** after DNS is verified
- You'll see status in Amplify Console

## Verify Configuration

### Check DNS Resolution:
```powershell
nslookup www.codingeverest.com
```

Should show: `d18moh9jxwpfve.cloudfront.net`

### Check Domain Status in Amplify:
```powershell
aws amplify get-domain-association --app-id ddp21ao3xntn4 --domain-name codingeverest.com --query "domainAssociation.domainStatus" --output text
```

Status should change from `PENDING_DEPLOYMENT` to `AVAILABLE` once DNS is configured and SSL is provisioned.

## Current Status

✅ **Domain Association:** Created in Amplify
✅ **DNS Record:** `www CNAME d18moh9jxwpfve.cloudfront.net`
⏳ **Next Step:** Add CNAME record in Namecheap
⏳ **Wait:** 15-60 minutes for DNS/SSL propagation

## Troubleshooting

**If domain still times out after adding DNS:**
- Wait at least 15 minutes for DNS propagation
- Verify CNAME record is correct in Namecheap
- Check domain status in Amplify Console
- Clear browser cache and try again

**If SSL certificate fails:**
- Ensure DNS is properly configured first
- Wait up to 60 minutes for certificate provisioning
- Check Amplify Console for certificate status

## Root Domain (codingeverest.com without www)

For the root domain (codingeverest.com), you can:
1. Set up a redirect from root to www in Amplify Console
2. Or add an A record in Namecheap (requires Amplify IP addresses - contact AWS support)

The www subdomain is recommended and will work once DNS is configured.

