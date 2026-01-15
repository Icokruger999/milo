#!/bin/bash
# Automated PostgreSQL Backup Script for Milo
# This script creates daily backups of the Milo database

BACKUP_DIR="/home/ec2-user/db-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/milo_backup_$DATE.sql.gz"
RETENTION_DAYS=7
LOG_FILE="/home/ec2-user/backup.log"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Log function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "Starting database backup..."

# Perform backup using pg_dump through PgBouncer (port 6432)
# Note: We connect directly to PostgreSQL (port 5432) for backups, not through PgBouncer
PGPASSWORD="Milo_PgBouncer_2024!Secure#Key" pg_dump -h localhost -p 5432 -U postgres -d milo \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    | gzip > $BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ] && [ -f $BACKUP_FILE ] && [ -s $BACKUP_FILE ]; then
    BACKUP_SIZE=$(du -h $BACKUP_FILE | cut -f1)
    log "Backup successful: $BACKUP_FILE (Size: $BACKUP_SIZE)"
    
    # Delete backups older than retention period
    DELETED_COUNT=$(find $BACKUP_DIR -name "milo_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
    if [ $DELETED_COUNT -gt 0 ]; then
        log "Deleted $DELETED_COUNT old backup(s)"
    fi
    
    # Sync to S3 for off-site backup (FREE tier: 5GB storage, 20,000 GET requests, 2,000 PUT requests)
    # S3 bucket: milo-db-backups (create if doesn't exist)
    S3_BUCKET="milo-db-backups"
    if command -v aws &> /dev/null; then
        # Check if bucket exists, create if not
        if ! aws s3 ls "s3://$S3_BUCKET" 2>&1 | grep -q "NoSuchBucket"; then
            # Bucket exists, sync backup
            aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/daily/$DATE.sql.gz" --quiet
            if [ $? -eq 0 ]; then
                log "Backup synced to S3 successfully (s3://$S3_BUCKET/daily/$DATE.sql.gz)"
                
                # Keep only last 7 days in S3 (delete older)
                aws s3 ls "s3://$S3_BUCKET/daily/" | while read -r line; do
                    BACKUP_DATE=$(echo "$line" | awk '{print $1" "$2}')
                    BACKUP_FILE_S3=$(echo "$line" | awk '{print $4}')
                    if [ -n "$BACKUP_FILE_S3" ]; then
                        BACKUP_TIMESTAMP=$(date -d "$BACKUP_DATE" +%s 2>/dev/null || echo "0")
                        CURRENT_TIMESTAMP=$(date +%s)
                        DAYS_OLD=$(( (CURRENT_TIMESTAMP - BACKUP_TIMESTAMP) / 86400 ))
                        if [ $DAYS_OLD -gt $RETENTION_DAYS ]; then
                            aws s3 rm "s3://$S3_BUCKET/daily/$BACKUP_FILE_S3" --quiet
                            log "Deleted old S3 backup: $BACKUP_FILE_S3 (${DAYS_OLD} days old)"
                        fi
                    fi
                done
            else
                log "WARNING: S3 sync failed (backup still saved locally)"
            fi
        else
            log "INFO: S3 bucket $S3_BUCKET does not exist. Run: aws s3 mb s3://$S3_BUCKET"
        fi
    else
        log "INFO: AWS CLI not installed. Install with: sudo yum install aws-cli"
    fi
    
    log "Backup completed successfully"
    exit 0
else
    log "ERROR: Backup failed!"
    exit 1
fi
