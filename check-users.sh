#!/bin/bash

echo "=== USER STATISTICS ==="
psql -h localhost -p 6432 -U postgres -d milo -c "SELECT COUNT(*) as total_users FROM users;"

echo ""
echo "=== ALL USERS ==="
psql -h localhost -p 6432 -U postgres -d milo -c "SELECT id, name, email, is_active, created_at FROM users ORDER BY created_at DESC;"

echo ""
echo "=== TASK STATISTICS ==="
psql -h localhost -p 6432 -U postgres -d milo -c "SELECT COUNT(*) as total_tasks FROM tasks;"

echo ""
echo "=== PROJECT STATISTICS ==="
psql -h localhost -p 6432 -U postgres -d milo -c "SELECT COUNT(*) as total_projects FROM projects;"

echo ""
echo "=== INCIDENT STATISTICS ==="
psql -h localhost -p 6432 -U postgres -d milo -c "SELECT COUNT(*) as total_incidents FROM incidents;"
