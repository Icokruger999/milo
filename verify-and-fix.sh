#!/bin/bash
echo "=== Checking Connection String ==="
cat /home/ec2-user/milo-backend-publish/appsettings.json | grep -A 1 "DefaultConnection"

echo ""
echo "=== Checking Service Status ==="
sudo systemctl status milo-api --no-pager | head -10

echo ""
echo "=== Checking Database Tables ==="
docker exec milo_postgres psql -U postgres -d milo -c "SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema='public' AND table_name NOT LIKE '__%';"

echo ""
echo "=== Recent Migration Logs ==="
sudo journalctl -u milo-api -n 30 --no-pager | grep -i -E "(migration|database|applying|applied|error)" | tail -10
