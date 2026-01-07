#!/bin/bash
export PGPASSWORD=Stacey1122

echo "Checking if Labels table exists:"
psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -U postgres -d MiloDB -c "SELECT COUNT(*) as table_exists FROM information_schema.tables WHERE table_name = 'Labels';"

echo ""
echo "Checking service logs for Labels errors:"
sudo journalctl -u milo-api -n 50 --no-pager | grep -i "label\|error" | tail -10

echo ""
echo "Testing Labels API locally:"
curl -s http://localhost:5001/api/labels 2>&1 | head -5

