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
    
    # Optional: Sync to S3 (uncomment and configure if needed)
    # aws s3 sync $BACKUP_DIR s3://your-backup-bucket/milo-db-backups/ --delete --quiet
    # if [ $? -eq 0 ]; then
    #     log "Backup synced to S3 successfully"
    # else
    #     log "WARNING: S3 sync failed"
    # fi
    
    log "Backup completed successfully"
    exit 0
else
    log "ERROR: Backup failed!"
    exit 1
fi
