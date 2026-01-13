#!/bin/bash
set -e

echo "========================================="
echo "Milo API Migration Verification & Restart"
echo "========================================="
echo ""

echo "1. Checking Connection String..."
echo "-----------------------------------"
if [ -f /home/ec2-user/milo-backend-publish/appsettings.json ]; then
    echo "Connection string in appsettings.json:"
    grep -A 1 "DefaultConnection" /home/ec2-user/milo-backend-publish/appsettings.json | head -2
    echo ""
    
    # Check if it contains the new PgBouncer address
    if grep -q "34.246.3.141:6432" /home/ec2-user/milo-backend-publish/appsettings.json; then
        echo "✓ Connection string is correct (points to PgBouncer)"
    else
        echo "✗ Connection string is NOT updated (still pointing to old address)"
    fi
else
    echo "✗ appsettings.json not found!"
fi
echo ""

echo "2. Current Database Tables..."
echo "-----------------------------------"
TABLE_COUNT=$(docker exec milo_postgres psql -U postgres -d milo -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name NOT LIKE '__%';" | tr -d ' ')
echo "Current table count: $TABLE_COUNT"
echo ""

echo "3. Restarting API Service..."
echo "-----------------------------------"
sudo systemctl stop milo-api
sleep 3
sudo systemctl start milo-api
sleep 5
echo "Service restarted"
echo ""

echo "4. Checking Service Status..."
echo "-----------------------------------"
sudo systemctl status milo-api --no-pager | head -15
echo ""

echo "5. Waiting 30 seconds for migrations to run..."
echo "-----------------------------------"
sleep 30
echo ""

echo "6. Checking Migration Logs..."
echo "-----------------------------------"
sudo journalctl -u milo-api -n 50 --no-pager | grep -i -E "(migration|applying|applied|successfully|database|error)" | tail -15
echo ""

echo "7. Verifying Database Tables..."
echo "-----------------------------------"
NEW_TABLE_COUNT=$(docker exec milo_postgres psql -U postgres -d milo -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name NOT LIKE '__%';" | tr -d ' ')
echo "New table count: $NEW_TABLE_COUNT"

if [ "$NEW_TABLE_COUNT" -gt 0 ]; then
    echo ""
    echo "✓ Tables created successfully!"
    echo ""
    echo "Table list:"
    docker exec milo_postgres psql -U postgres -d milo -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name NOT LIKE '__%' ORDER BY table_name;"
else
    echo ""
    echo "✗ No tables found - migrations may not have run"
fi
echo ""

echo "8. Testing API Health..."
echo "-----------------------------------"
curl -s http://localhost:5001/api/health || echo "API not responding"
echo ""

echo "========================================="
echo "Verification Complete"
echo "========================================="
