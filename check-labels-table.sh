#!/bin/bash
export PGPASSWORD=Stacey1122

echo "Checking if Labels table exists..."
psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -U postgres -d MiloDB << 'SQL'
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Labels';
SQL

echo ""
echo "Testing Labels API endpoint:"
curl -s http://localhost:5001/api/labels || echo "API not responding"

echo ""
echo "Checking service status:"
sudo systemctl is-active milo-api

