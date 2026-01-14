# Backup Solutions for Milo Backend

## Problem Statement
If the backend crashes or the database is lost, users could lose all their data (tasks, projects, incidents, etc.). We need a backup solution to prevent data loss.

## Backup Solution Options

### Option 1: Automated PostgreSQL Backups (Recommended)
**Description:** Automated daily backups of the PostgreSQL database using `pg_dump` with retention policy.

**Implementation:**
- Daily automated backups using cron job or systemd timer
- Store backups on EC2 instance (local) and optionally sync to S3
- Retention: Keep last 7 daily backups, 4 weekly backups, 12 monthly backups
- Backup format: SQL dump files (compressed)

**Pros:**
- Simple to implement
- Fast recovery (direct SQL restore)
- Can restore to any PostgreSQL version
- Minimal infrastructure changes

**Cons:**
- Requires disk space on EC2
- Manual S3 sync if using cloud storage
- No point-in-time recovery (only full database snapshots)

**Estimated Setup Time:** 2-3 hours
**Cost:** Minimal (S3 storage if used: ~$0.023/GB/month)

---

### Option 2: AWS RDS with Automated Backups
**Description:** Migrate database to AWS RDS PostgreSQL with built-in automated backups.

**Implementation:**
- Migrate from self-hosted PostgreSQL to AWS RDS
- Enable automated backups (7-day retention, configurable)
- Point-in-time recovery available
- Automated backup window configuration

**Pros:**
- Fully managed by AWS
- Automated backups (no manual setup)
- Point-in-time recovery
- Multi-AZ option for high availability
- Automated software patching

**Cons:**
- Requires database migration
- Higher cost (~$15-50/month for db.t3.micro)
- Network latency (if EC2 and RDS in different AZs)
- More complex setup initially

**Estimated Setup Time:** 1-2 days (including migration)
**Cost:** ~$15-50/month (db.t3.micro with 20GB storage)

---

### Option 3: Continuous WAL Archiving (PostgreSQL WAL)
**Description:** Enable Write-Ahead Log (WAL) archiving for continuous backup and point-in-time recovery.

**Implementation:**
- Configure PostgreSQL to archive WAL files
- Store WAL files in S3 or local storage
- Use `pg_basebackup` for base backups
- Enable point-in-time recovery

**Pros:**
- Point-in-time recovery (restore to any second)
- Continuous backup (no data loss)
- Can restore to any point in time
- Industry-standard approach

**Cons:**
- More complex setup and maintenance
- Requires monitoring of WAL archiving
- More storage needed (WAL files)
- Requires PostgreSQL configuration changes

**Estimated Setup Time:** 1 day
**Cost:** S3 storage for WAL files (~$0.023/GB/month)

---

### Option 4: Database Replication (Primary-Replica)
**Description:** Set up a read replica of the database on a separate EC2 instance.

**Implementation:**
- Configure PostgreSQL streaming replication
- Replica instance on separate EC2 (or different region)
- Automatic failover capability
- Can use replica for backups (no impact on primary)

**Pros:**
- High availability (automatic failover)
- Read scaling (use replica for reports)
- Backup from replica (no performance impact)
- Disaster recovery (different region option)

**Cons:**
- Requires second EC2 instance (~$10-20/month)
- More complex setup
- Replication lag (usually <1 second)
- Requires monitoring

**Estimated Setup Time:** 1 day
**Cost:** Additional EC2 instance (~$10-20/month)

---

### Option 5: Hybrid Approach (Recommended for Production)
**Description:** Combine automated daily backups + S3 sync + optional WAL archiving.

**Implementation:**
1. Daily automated `pg_dump` backups (compressed)
2. Sync backups to S3 (automated)
3. Weekly full database exports
4. Optional: WAL archiving for point-in-time recovery
5. Backup verification script (test restore monthly)

**Components:**
- Cron job for daily backups
- AWS CLI for S3 sync
- Backup retention script
- Monitoring/alerting for backup failures

**Pros:**
- Multiple layers of protection
- Off-site backups (S3)
- Can restore from multiple points
- Cost-effective
- Scalable

**Cons:**
- More moving parts to maintain
- Requires monitoring
- Initial setup complexity

**Estimated Setup Time:** 1 day
**Cost:** S3 storage (~$0.50-2/month for typical database)

---

## Recommended Implementation Plan

### Phase 1: Quick Win (Week 1)
**Implement Option 1 (Automated PostgreSQL Backups)**
- Set up daily `pg_dump` script
- Configure cron job
- Test backup and restore process
- Document restore procedure

### Phase 2: Off-Site Backup (Week 2)
**Add S3 Sync to Option 1**
- Configure AWS CLI on EC2
- Set up S3 bucket for backups
- Automate S3 sync after backup
- Set up S3 lifecycle policies (delete old backups)

### Phase 3: Enhanced Protection (Month 2)
**Consider Option 5 (Hybrid Approach)**
- Add weekly full backups
- Implement backup verification
- Set up monitoring/alerting
- Document disaster recovery procedure

---

## Backup Script Example (Option 1)

```bash
#!/bin/bash
# /home/ec2-user/backup-database.sh

BACKUP_DIR="/home/ec2-user/db-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/milo_backup_$DATE.sql.gz"
RETENTION_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
PGPASSWORD="Milo_PgBouncer_2024!Secure#Key" pg_dump -h localhost -p 5432 -U postgres -d milo | gzip > $BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup successful: $BACKUP_FILE"
    
    # Delete backups older than retention period
    find $BACKUP_DIR -name "milo_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    # Optional: Sync to S3
    # aws s3 sync $BACKUP_DIR s3://your-backup-bucket/milo-db-backups/ --delete
else
    echo "Backup failed!"
    exit 1
fi
```

**Cron Job:**
```bash
# Run daily at 2 AM
0 2 * * * /home/ec2-user/backup-database.sh >> /home/ec2-user/backup.log 2>&1
```

---

## Restore Procedure

```bash
# Stop backend service
sudo systemctl stop milo-backend.service

# Restore database
gunzip < /home/ec2-user/db-backups/milo_backup_20260114_020000.sql.gz | \
PGPASSWORD="Milo_PgBouncer_2024!Secure#Key" psql -h localhost -p 5432 -U postgres -d milo

# Restart backend service
sudo systemctl start milo-backend.service
```

---

## Monitoring & Alerts

- **Backup Success Check:** Script should log success/failure
- **Disk Space Check:** Monitor backup directory size
- **S3 Sync Check:** Verify S3 sync completed (if using)
- **Email Alerts:** Send email if backup fails
- **Monthly Test Restore:** Test restore process monthly

---

## Cost Estimates

| Solution | Monthly Cost | Setup Complexity |
|----------|-------------|-------------------|
| Option 1 (Local Backups) | $0 | Low |
| Option 1 + S3 Sync | $0.50-2 | Low-Medium |
| Option 2 (RDS) | $15-50 | Medium |
| Option 3 (WAL Archiving) | $1-5 | Medium-High |
| Option 4 (Replication) | $10-20 | High |
| Option 5 (Hybrid) | $1-3 | Medium |

---

## Next Steps

1. **Choose a solution** based on requirements and budget
2. **Implement Phase 1** (quick win with daily backups)
3. **Test restore procedure** to ensure it works
4. **Document** the backup and restore process
5. **Set up monitoring** for backup failures
6. **Schedule regular test restores** (monthly)

---

## Questions to Consider

1. **Recovery Time Objective (RTO):** How quickly do you need to restore?
   - Option 1: ~30 minutes (restore from SQL dump)
   - Option 2: ~15 minutes (RDS restore)
   - Option 3: ~10 minutes (WAL restore)

2. **Recovery Point Objective (RPO):** How much data loss is acceptable?
   - Option 1: Up to 24 hours (daily backups)
   - Option 2: Up to 5 minutes (automated backups)
   - Option 3: Near-zero (WAL archiving)

3. **Budget:** What's the monthly budget for backups?
   - Free: Option 1 (local only)
   - Low ($1-5): Option 1 + S3 or Option 3
   - Medium ($15-50): Option 2 (RDS)

4. **Technical Expertise:** Who will maintain backups?
   - Low: Option 1 or Option 2 (RDS)
   - Medium: Option 1 + S3
   - High: Option 3 or Option 4
