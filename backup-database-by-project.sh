#!/bin/bash
# Automated PostgreSQL Backup Script for Milo - Organized by Project
# This script creates daily backups of each project's data separately

BACKUP_DIR="/home/ec2-user/db-backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7
LOG_FILE="/home/ec2-user/backup.log"
S3_BUCKET="milo-db-backups"
REGION="eu-west-1"

# Database connection
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="milo"
DB_PASSWORD="Milo_PgBouncer_2024!Secure#Key"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Log function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "Starting database backup by project..."

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

# Get list of all projects (dynamically queries database each time - automatically includes new projects)
log "Querying database for all active projects..."
PROJECTS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -A -F'|' -c "SELECT id, name FROM projects WHERE status != 'archived' ORDER BY id;" 2>/dev/null)

if [ $? -ne 0 ]; then
    log "ERROR: Failed to connect to database or query failed"
    exit 1
fi

if [ -z "$PROJECTS" ]; then
    log "WARNING: No active projects found in database"
    # Still create full backup even if no projects
    log "Creating full database backup only..."
else
    PROJECT_COUNT=$(echo "$PROJECTS" | grep -v '^$' | wc -l)
    log "Found $PROJECT_COUNT active project(s) to backup"
fi

BACKUP_COUNT=0
FAILED_COUNT=0

# Backup each project separately (automatically includes any new projects created since last backup)
if [ -n "$PROJECTS" ]; then
    echo "$PROJECTS" | while IFS='|' read -r PROJECT_ID PROJECT_NAME; do
    # Clean up project name for filename (remove spaces, special chars)
    PROJECT_NAME_CLEAN=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
    
    if [ -z "$PROJECT_ID" ] || [ -z "$PROJECT_NAME_CLEAN" ]; then
        continue
    fi
    
    PROJECT_BACKUP_DIR="$BACKUP_DIR/project-$PROJECT_ID-$PROJECT_NAME_CLEAN"
    mkdir -p "$PROJECT_BACKUP_DIR"
    
    BACKUP_FILE="$PROJECT_BACKUP_DIR/backup_$DATE.sql.gz"
    
    log "Backing up project: $PROJECT_NAME (ID: $PROJECT_ID)..."
    
    # Backup project-specific data
    # This includes: tasks, labels, project_members, incidents, flakes, etc. for this project
    pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
        --no-owner \
        --no-acl \
        --data-only \
        --table=tasks \
        --table=labels \
        --table=project_members \
        --table=incidents \
        --table=flakes \
        --table=task_comments \
        --where="project_id=$PROJECT_ID" \
        2>/dev/null | gzip > "$BACKUP_FILE"
    
    # Also backup project record itself
    pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
        --no-owner \
        --no-acl \
        --data-only \
        --table=projects \
        --where="id=$PROJECT_ID" \
        2>/dev/null | gzip -c >> "$BACKUP_FILE"
    
    # Check if backup was successful
    if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log "✅ Project '$PROJECT_NAME' backed up: $BACKUP_FILE (Size: $BACKUP_SIZE)"
        BACKUP_COUNT=$((BACKUP_COUNT + 1))
        
        # Sync to S3 in project folder
        if command -v aws &> /dev/null; then
            S3_PATH="s3://$S3_BUCKET/projects/project-$PROJECT_ID-$PROJECT_NAME_CLEAN/backup_$DATE.sql.gz"
            aws s3 cp "$BACKUP_FILE" "$S3_PATH" --region "$REGION" --quiet
            if [ $? -eq 0 ]; then
                log "   ☁️  Synced to S3: $S3_PATH"
            else
                log "   ⚠️  S3 sync failed for project $PROJECT_NAME"
            fi
        fi
        
        # Delete old backups for this project
        find "$PROJECT_BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | while read deleted; do
            log "   🗑️  Deleted old backup: $deleted"
        done
    else
        log "❌ Failed to backup project '$PROJECT_NAME'"
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi
    done
fi

# Also create a full database backup (for complete restore)
log "Creating full database backup..."
FULL_BACKUP_FILE="$BACKUP_DIR/full/milo_full_backup_$DATE.sql.gz"
mkdir -p "$BACKUP_DIR/full"

pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    | gzip > "$FULL_BACKUP_FILE"

if [ $? -eq 0 ] && [ -f "$FULL_BACKUP_FILE" ] && [ -s "$FULL_BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$FULL_BACKUP_FILE" | cut -f1)
    log "✅ Full database backup: $FULL_BACKUP_FILE (Size: $BACKUP_SIZE)"
    
    # Sync full backup to S3
    if command -v aws &> /dev/null; then
        aws s3 cp "$FULL_BACKUP_FILE" "s3://$S3_BUCKET/full/backup_$DATE.sql.gz" --region "$REGION" --quiet
        if [ $? -eq 0 ]; then
            log "   ☁️  Full backup synced to S3"
        fi
    fi
    
    # Delete old full backups
    find "$BACKUP_DIR/full" -name "milo_full_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
else
    log "❌ Full database backup failed"
fi

# Clean up old S3 backups (keep 30 days)
if command -v aws &> /dev/null; then
    log "Cleaning up old S3 backups (keeping last 30 days)..."
    aws s3 ls "s3://$S3_BUCKET/projects/" --recursive --region "$REGION" 2>/dev/null | while read -r line; do
        BACKUP_DATE=$(echo "$line" | awk '{print $1" "$2}')
        BACKUP_FILE_S3=$(echo "$line" | awk '{print $4}')
        if [ -n "$BACKUP_FILE_S3" ] && [ -n "$BACKUP_DATE" ]; then
            BACKUP_TIMESTAMP=$(date -d "$BACKUP_DATE" +%s 2>/dev/null || echo "0")
            CURRENT_TIMESTAMP=$(date +%s)
            DAYS_OLD=$(( (CURRENT_TIMESTAMP - BACKUP_TIMESTAMP) / 86400 ))
            if [ $DAYS_OLD -gt 30 ]; then
                aws s3 rm "s3://$S3_BUCKET/$BACKUP_FILE_S3" --region "$REGION" --quiet
                log "   🗑️  Deleted old S3 backup: $BACKUP_FILE_S3 (${DAYS_OLD} days old)"
            fi
        fi
    done
fi

log "Backup completed: $BACKUP_COUNT projects backed up, $FAILED_COUNT failed"
exit 0
