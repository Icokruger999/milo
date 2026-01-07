# How to Update Nameservers in Namecheap for Route 53

## ⚠️ Important: You're in the Wrong Section!

The "PERSONAL DNS SERVER" section is for **registering your own custom nameservers** (like `ns1.codingeverest.com`). 

**You DON'T need that!** You need to **change which nameservers your domain uses**.

## ✅ Correct Steps:

### Step 1: Go to Domain List
1. Log into **Namecheap**
2. Click **Domain List** (top menu)
3. Find **codingeverest.com** in the list
4. Click **Manage** (blue button on the right)

### Step 2: Find Nameservers Section
1. Look for the **"Nameservers"** section (usually near the top of the page)
2. It should show something like:
   ```
   Namecheap BasicDNS
   [Dropdown arrow ▼]
   ```

### Step 3: Change to Custom DNS
1. Click the **dropdown** next to "Namecheap BasicDNS"
2. Select **"Custom DNS"** (NOT "Personal DNS Server")
3. You'll see 2-4 input fields appear

### Step 4: Enter Route 53 Nameservers
Enter these 4 nameservers (one per field):
```
ns-1517.awsdns-61.org
ns-1990.awsdns-56.co.uk
ns-70.awsdns-08.com
ns-956.awsdns-55.net
```

### Step 5: Save
1. Click the **green checkmark** or **Save** button
2. Wait 5-30 minutes for DNS propagation

## 🔍 Visual Guide:

**What you should see:**
```
Nameservers: [Custom DNS ▼]
┌─────────────────────────────────┐
│ ns-1517.awsdns-61.org           │
│ ns-1990.awsdns-56.co.uk          │
│ ns-70.awsdns-08.com              │
│ ns-956.awsdns-55.net             │
└─────────────────────────────────┘
[✓ Save]
```

**NOT this (Personal DNS Server):**
```
PERSONAL DNS SERVER
[Register Nameserver]
[Find Nameservers]
```

## ❓ Still Can't Find It?

If you can't find the Nameservers section:
1. Make sure you're in the **Domain List** → **Manage** page
2. Look for tabs like: **"Domain"**, **"Advanced DNS"**, or **"Nameservers"**
3. The Nameservers section is usually at the **top** of the Domain management page
4. It's NOT in "Advanced DNS" - that's for DNS records

## ✅ After Updating:

Once you save the nameservers:
- Wait 5-30 minutes
- Check with: `nslookup codingeverest.com`
- Should resolve to CloudFront, not EC2 IP

