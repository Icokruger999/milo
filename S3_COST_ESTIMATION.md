# S3 Backup Cost Estimation

## Current Settings
- **Backup Frequency:** Daily at 2:00 AM
- **Retention:** 30 days in S3
- **Storage Class:** Standard (default)
- **Organization:** By project folders (one backup per project per day)

## Cost Breakdown

### AWS S3 Free Tier (First 12 Months)
- **Storage:** 5 GB
- **PUT Requests:** 2,000 per month
- **GET Requests:** 20,000 per month
- **Data Transfer Out:** 100 GB per month

### Estimated Database Size
- **Small Project:** ~10-50 MB per backup
- **Medium Project:** ~50-200 MB per backup
- **Large Project:** ~200-500 MB per backup

### Monthly Cost Calculation

#### Scenario 1: Small Setup (1-3 Projects)
- **Backups per month:** 30 days × 3 projects = 90 backups
- **Average backup size:** 50 MB
- **Total storage:** 90 × 50 MB = 4.5 GB
- **Monthly cost:** **$0.00** (within free tier)

#### Scenario 2: Medium Setup (5-10 Projects)
- **Backups per month:** 30 days × 10 projects = 300 backups
- **Average backup size:** 100 MB
- **Total storage:** 300 × 100 MB = 30 GB
- **Storage cost:** (30 GB - 5 GB free) × $0.023/GB = **$0.58/month**
- **PUT requests:** 300 (within 2,000 free tier)
- **Monthly cost:** **~$0.58/month**

#### Scenario 3: Large Setup (20+ Projects)
- **Backups per month:** 30 days × 20 projects = 600 backups
- **Average backup size:** 150 MB
- **Total storage:** 600 × 150 MB = 90 GB
- **Storage cost:** (90 GB - 5 GB free) × $0.023/GB = **$1.96/month**
- **PUT requests:** 600 (within 2,000 free tier)
- **Monthly cost:** **~$1.96/month**

### Cost Optimization Options

#### Option 1: S3 Intelligent-Tiering (Recommended)
- **Storage cost:** $0.023/GB (same as Standard)
- **Monitoring cost:** $0.0025 per 1,000 objects
- **Benefit:** Automatically moves infrequently accessed backups to cheaper storage
- **Monthly cost:** Similar to Standard, but can save 40-68% on old backups

#### Option 2: S3 Glacier Instant Retrieval
- **Storage cost:** $0.004/GB (83% cheaper)
- **Retrieval cost:** $0.03/GB
- **Use case:** For backups older than 7 days
- **Monthly cost:** Can reduce costs by 60-80% for older backups

#### Option 3: Lifecycle Policy (Recommended)
- **Days 1-7:** Standard storage
- **Days 8-30:** Intelligent-Tiering or Glacier Instant Retrieval
- **After 30 days:** Delete (or move to Glacier Deep Archive at $0.00099/GB)
- **Monthly cost:** Can reduce costs by 50-70%

## Recommended Configuration

### For Small/Medium Setup (< 10 Projects)
- **Storage Class:** Standard
- **Retention:** 30 days
- **Estimated Cost:** **$0.00 - $0.60/month**

### For Large Setup (20+ Projects)
- **Storage Class:** Standard with Lifecycle Policy
- **Days 1-7:** Standard ($0.023/GB)
- **Days 8-30:** Intelligent-Tiering ($0.023/GB)
- **After 30 days:** Delete
- **Estimated Cost:** **$1.50 - $3.00/month**

## Additional Costs

### Data Transfer
- **Out to Internet:** First 100 GB/month free, then $0.09/GB
- **Between AWS Services:** Free
- **Estimated:** $0.00 (backups stay in S3, no outbound transfer)

### Requests
- **PUT:** 2,000 free/month (sufficient for 66 projects)
- **GET:** 20,000 free/month (sufficient for restores)
- **Estimated:** $0.00

## Total Estimated Monthly Cost

| Projects | Backups/Month | Storage (GB) | Monthly Cost |
|----------|---------------|--------------|--------------|
| 1-3      | 30-90         | 1.5-4.5      | **$0.00**    |
| 5-10     | 150-300       | 7.5-30       | **$0.58**    |
| 20+      | 600+          | 90+          | **$1.96**    |

## Notes
- All costs are for **eu-west-1** (Ireland) region
- Costs may vary slightly by region
- First 12 months include free tier benefits
- After free tier expires, add $0.023/GB for first 5 GB
- Lifecycle policies can reduce costs by 50-70%
