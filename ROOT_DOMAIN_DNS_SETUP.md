# Root Domain DNS Setup for codingeverest.com

## Current Status
✅ Root domain `codingeverest.com` has been added to AWS Amplify
✅ `www.codingeverest.com` is already configured and working

## The Problem
The root domain `codingeverest.com` (without www) shows a 404 error because:
- Root domains cannot use CNAME records (DNS limitation)
- Amplify uses CloudFront which requires CNAME or A records
- Namecheap needs specific DNS configuration

## Solution Options

### Option 1: URL Redirect in Namecheap (EASIEST - Recommended)
1. Log into Namecheap
2. Go to Domain List → codingeverest.com → Advanced DNS
3. Add a new record:
   - **Type:** URL Redirect Record
   - **Host:** `@` (or leave blank for root)
   - **Value:** `https://www.codingeverest.com`
   - **Redirect Type:** Permanent (301)
4. Save changes
5. Wait 5-10 minutes for DNS propagation

### Option 2: A Records (If Namecheap supports ALIAS/ANAME)
If Namecheap supports ALIAS/ANAME records:
- **Type:** ALIAS or ANAME
- **Host:** `@`
- **Value:** `d18moh9jxwpfve.cloudfront.net`

### Option 3: Use Route 53 (AWS DNS)
1. Transfer DNS to Route 53 (or use Route 53 as nameservers)
2. Route 53 supports ALIAS records for root domains
3. Amplify will automatically configure the records

## Current Amplify Configuration
- **App ID:** `ddp21ao3xntn4`
- **Region:** `eu-west-1`
- **CloudFront Distribution:** `d18moh9jxwpfve.cloudfront.net`
- **Root Domain Status:** UPDATING (will be AVAILABLE once DNS is configured)

## Recommended Action
**Use Option 1 (URL Redirect)** - This is the simplest and most reliable solution for Namecheap.

After adding the redirect:
- `codingeverest.com` → Redirects to `www.codingeverest.com` ✅
- `www.codingeverest.com` → Works directly ✅

