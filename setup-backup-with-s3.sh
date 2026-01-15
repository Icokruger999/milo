#!/bin/bash
# Setup automated database backups with S3 sync
# This script sets up daily backups and syncs to S3 (FREE tier available)

echo "=== Setting Up Automated Database Backups with S3 ==="
echo ""

# Step 1: Create backup directory
echo "1. Creating backup directory..."
mkdir -p /home/ec2-user/db-backups
chmod 755 /home/ec2-user/db-backups
echo "   ✅ Backup directory created: /home/ec2-user/db-backups"

# Step 2: Copy backup script
echo ""
echo "2. Setting up backup script..."
if [ -f /home/ec2-user/milo/backup-database.sh ]; then
    cp /home/ec2-user/milo/backup-database.sh /home/ec2-user/backup-database.sh
    chmod +x /home/ec2-user/backup-database.sh
    echo "   ✅ Backup script installed"
else
    echo "   ⚠️  Backup script not found in repo, will create it..."
    # Script will be created from repo on next pull
fi

# Step 3: Create S3 bucket (if AWS CLI is installed)
echo ""
echo "3. Setting up S3 bucket for off-site backups..."
if command -v aws &> /dev/null; then
    S3_BUCKET="milo-db-backups"
    REGION="eu-west-1"
    
    # Check if bucket exists
    if aws s3 ls "s3://$S3_BUCKET" 2>&1 | grep -q "NoSuchBucket"; then
        echo "   Creating S3 bucket: $S3_BUCKET"
        aws s3 mb "s3://$S3_BUCKET" --region "$REGION"
        if [ $? -eq 0 ]; then
            echo "   ✅ S3 bucket created: s3://$S3_BUCKET"
            
            # Enable versioning for extra safety
            aws s3api put-bucket-versioning \
                --bucket "$S3_BUCKET" \
                --versioning-configuration Status=Enabled \
                --region "$REGION"
            echo "   ✅ Versioning enabled on S3 bucket"
            
            # Set lifecycle policy to delete old backups (keep 30 days)
            cat > /tmp/lifecycle.json << EOF
{
    "Rules": [
        {
            "Id": "DeleteOldBackups",
            "Status": "Enabled",
            "Prefix": "daily/",
            "Expiration": {
                "Days": 30
            }
        }
    ]
}
EOF
            aws s3api put-bucket-lifecycle-configuration \
                --bucket "$S3_BUCKET" \
                --lifecycle-configuration file:///tmp/lifecycle.json \
                --region "$REGION"
            echo "   ✅ Lifecycle policy set (30 day retention)"
            rm /tmp/lifecycle.json
        else
            echo "   ⚠️  Failed to create S3 bucket. You can create it manually:"
            echo "      aws s3 mb s3://$S3_BUCKET --region $REGION"
        fi
    else
        echo "   ✅ S3 bucket already exists: s3://$S3_BUCKET"
    fi
    
    # Test S3 access
    echo ""
    echo "   Testing S3 access..."
    echo "test" | aws s3 cp - "s3://$S3_BUCKET/test.txt" --quiet
    if [ $? -eq 0 ]; then
        aws s3 rm "s3://$S3_BUCKET/test.txt" --quiet
        echo "   ✅ S3 access working"
    else
        echo "   ⚠️  S3 access test failed. Check IAM permissions."
    fi
else
    echo "   ⚠️  AWS CLI not installed. Install with:"
    echo "      sudo yum install aws-cli -y"
    echo "   Or backups will only be stored locally."
fi

# Step 4: Test backup script
echo ""
echo "4. Testing backup script..."
if [ -f /home/ec2-user/backup-database.sh ]; then
    /home/ec2-user/backup-database.sh
    if [ $? -eq 0 ]; then
        echo "   ✅ Backup test successful"
        echo "   📁 Latest backup:"
        ls -lh /home/ec2-user/db-backups/*.sql.gz 2>/dev/null | tail -1
    else
        echo "   ⚠️  Backup test failed. Check database connection and credentials."
    fi
else
    echo "   ⚠️  Backup script not found. Will be created on next deployment."
fi

# Step 5: Setup cron job for daily backups at 2 AM
echo ""
echo "5. Setting up cron job for daily backups at 2 AM..."
(crontab -l 2>/dev/null | grep -v backup-database.sh; echo "0 2 * * * /home/ec2-user/backup-database.sh >> /home/ec2-user/backup.log 2>&1") | crontab -
echo "   ✅ Cron job installed"

# Step 6: Verify cron job
echo ""
echo "6. Verifying cron job..."
crontab -l | grep backup-database
if [ $? -eq 0 ]; then
    echo "   ✅ Cron job verified"
else
    echo "   ⚠️  Cron job not found"
fi

# Step 7: Show backup status
echo ""
echo "7. Current backup status:"
echo "   📁 Local backups:"
ls -lh /home/ec2-user/db-backups/*.sql.gz 2>/dev/null | tail -5 || echo "      No backups yet"
echo ""
if command -v aws &> /dev/null; then
    echo "   ☁️  S3 backups:"
    aws s3 ls s3://milo-db-backups/daily/ 2>/dev/null | tail -5 || echo "      No S3 backups yet"
fi

echo ""
echo "=== Backup Setup Complete ==="
echo ""
echo "📋 Summary:"
echo "   • Daily backups at 2:00 AM"
echo "   • Local storage: /home/ec2-user/db-backups"
echo "   • S3 storage: s3://milo-db-backups/daily/"
echo "   • Retention: 7 days local, 30 days S3"
echo "   • Log file: /home/ec2-user/backup.log"
echo ""
echo "💰 Cost: FREE (within AWS S3 free tier: 5GB storage, 20K GET, 2K PUT requests/month)"
echo ""
echo "📖 To restore from backup:"
echo "   gunzip < /home/ec2-user/db-backups/milo_backup_YYYYMMDD_HHMMSS.sql.gz | psql -h localhost -p 5432 -U postgres -d milo"
echo ""
