# Route 53 Setup Instructions

## ✅ What I've Done

1. **Created Route 53 Hosted Zone** for `codingeverest.com`
   - Hosted Zone ID: `Z024513220PNY1F3PO6K5`
   - Created DNS records for both root and www domains

2. **Configured DNS Records:**
   - `www.codingeverest.com` → CNAME to CloudFront
   - `codingeverest.com` → ALIAS to CloudFront (root domain)

## 📋 What You Need to Do in Namecheap

**You still need Namecheap for domain registration**, but Route 53 will handle all DNS.

### Step 1: Update Nameservers in Namecheap

1. Log into **Namecheap**
2. Go to **Domain List** → **codingeverest.com** → **Manage**
3. Go to **Advanced DNS** tab
4. Scroll to **Nameservers** section
5. Select **Custom DNS** (instead of Namecheap BasicDNS)
6. Enter these 4 nameservers (one per line):
   ```
   ns-1517.awsdns-61.org
   ns-1990.awsdns-56.co.uk
   ns-70.awsdns-08.com
   ns-956.awsdns-55.net
   ```
7. Click **Save**

### Step 2: Wait for DNS Propagation

- DNS changes take **5-30 minutes** to propagate
- You can check status: `nslookup codingeverest.com`
- Once propagated, both `codingeverest.com` and `www.codingeverest.com` will work

## 💰 Route 53 Costs

- **Hosted Zone:** $0.50/month
- **DNS Queries:** ~$0.10-0.50/month (typical traffic)
- **Total:** ~$0.60-1.00/month

## ✅ Benefits of Route 53

1. **ALIAS Records:** Root domain works without redirect
2. **Better Performance:** AWS global DNS network
3. **Integrated with AWS:** Works seamlessly with Amplify
4. **Health Checks:** Can monitor endpoint health
5. **Both domains work:** `codingeverest.com` and `www.codingeverest.com`

## 🔍 Verify Setup

After updating nameservers, verify:
```powershell
# Check nameservers
nslookup -type=NS codingeverest.com

# Check DNS records
nslookup codingeverest.com
nslookup www.codingeverest.com
```

Both should resolve to CloudFront distribution.

## 📝 Important Notes

- **You keep the domain registered with Namecheap** (no need to transfer)
- **Route 53 only handles DNS** (not domain registration)
- **Domain renewal** still happens through Namecheap
- **DNS management** moves to Route 53 (via AWS Console)

